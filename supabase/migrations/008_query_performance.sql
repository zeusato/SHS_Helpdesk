-- Apply with a PostgreSQL connection / Supabase SQL Editor, not the REST service key.
-- No application rows are changed. Locks/timeouts are bounded; failure rolls back.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE INDEX IF NOT EXISTS idx_tickets_created_id ON public.tickets(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_project_created_id ON public.tickets(project_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_shapeups_created_id ON public.shape_ups(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_shapeups_project_created_id ON public.shape_ups(project_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sent_id ON public.emails(sent_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_po_user_project ON public.project_po(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_shapeup_shapeup ON public.ticket_shapeup(shapeup_id);
CREATE INDEX IF NOT EXISTS idx_shapeups_created_by ON public.shape_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_emails_sender ON public.emails(sender_id);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Existing installations can have pg_trgm in public or extensions.
DO $$
DECLARE ext_schema name;
BEGIN
  SELECT n.nspname INTO ext_schema FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm';
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON public.tickets USING gin (title %I.gin_trgm_ops)', ext_schema);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_tickets_requester_name_trgm ON public.tickets USING gin (requester_name %I.gin_trgm_ops)', ext_schema);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_tickets_requester_email_trgm ON public.tickets USING gin (requester_email %I.gin_trgm_ops)', ext_schema);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_shapeups_title_trgm ON public.shape_ups USING gin (title %I.gin_trgm_ops)', ext_schema);
END $$;

-- Inactive profiles must not retain role-based access. Pin definer search paths.
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS VARCHAR
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid()) AND status = 'active';
$$;
CREATE OR REPLACE FUNCTION public.is_po_of_project(p_project_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_po pp JOIN public.users u ON u.id = pp.user_id
    WHERE pp.project_id = p_project_id AND pp.user_id = (SELECT auth.uid())
      AND u.status = 'active' AND u.role = 'po'
  );
$$;

-- Evaluate the manager role once per query, instead of once for every candidate row.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND policyname IN (
      'managers_all_projects', 'managers_all_users', 'managers_all_project_po',
      'managers_all_tickets', 'managers_all_shapeups', 'managers_all_emails', 'managers_all_ts'
    )
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.get_user_role()) = ''manager'')', policy_row.policyname, policy_row.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats() RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
DECLARE current_user_id UUID := auth.uid(); viewer_role VARCHAR; result JSON;
BEGIN
  SELECT role INTO viewer_role FROM public.users WHERE id = current_user_id AND status = 'active';
  IF current_user_id IS NULL OR viewer_role IS NULL THEN
    RAISE EXCEPTION 'Active authenticated profile required' USING ERRCODE = '42501';
  END IF;
  WITH visible_projects AS MATERIALIZED (
    SELECT p.id, p.name FROM public.projects p WHERE viewer_role = 'manager'
      OR (viewer_role = 'po' AND EXISTS (
        SELECT 1 FROM public.project_po pp WHERE pp.project_id = p.id AND pp.user_id = current_user_id
      ))
  ), ticket_totals AS MATERIALIZED (
    SELECT t.project_id,
      count(*) FILTER (WHERE t.status = 'new') AS new_count,
      count(*) FILTER (WHERE t.status = 'in_progress') AS progress_count,
      count(*) FILTER (WHERE t.status = 'resolved') AS resolved_count,
      count(*) FILTER (WHERE t.status = 'closed') AS closed_count,
      count(*) AS total_count
    FROM public.tickets t JOIN visible_projects p ON p.id = t.project_id GROUP BY t.project_id
  ), shape_totals AS MATERIALIZED (
    SELECT s.project_id, count(*) AS total_count,
      count(*) FILTER (WHERE s.status = 'draft') AS draft_count,
      count(*) FILTER (WHERE s.status = 'published') AS published_count
    FROM public.shape_ups s JOIN visible_projects p ON p.id = s.project_id GROUP BY s.project_id
  ), project_stats AS (
    SELECT p.id, p.name, coalesce(t.new_count, 0) AS new,
      coalesce(t.progress_count, 0) AS in_progress, coalesce(t.resolved_count, 0) AS resolved,
      coalesce(t.total_count, 0) AS total, coalesce(s.total_count, 0) AS shape_ups
    FROM visible_projects p LEFT JOIN ticket_totals t ON t.project_id = p.id
    LEFT JOIN shape_totals s ON s.project_id = p.id
  ), recent AS (
    SELECT t.id, t.title, t.status, t.requester_name, t.created_at FROM public.tickets t
    JOIN visible_projects p ON p.id = t.project_id ORDER BY t.created_at DESC, t.id DESC LIMIT 5
  )
  SELECT json_build_object(
    'ticketsNew', coalesce((SELECT sum(new_count) FROM ticket_totals), 0),
    'ticketsInProgress', coalesce((SELECT sum(progress_count) FROM ticket_totals), 0),
    'ticketsResolved', coalesce((SELECT sum(resolved_count) FROM ticket_totals), 0),
    'ticketsClosed', coalesce((SELECT sum(closed_count) FROM ticket_totals), 0),
    'ticketsTotal', coalesce((SELECT sum(total_count) FROM ticket_totals), 0),
    'shapeUpsTotal', coalesce((SELECT sum(total_count) FROM shape_totals), 0),
    'shapeUpsDraft', coalesce((SELECT sum(draft_count) FROM shape_totals), 0),
    'shapeUpsPublished', coalesce((SELECT sum(published_count) FROM shape_totals), 0),
    'recentTickets', coalesce((SELECT json_agg(r ORDER BY r.created_at DESC, r.id DESC) FROM recent r), '[]'::json),
    'projectStats', coalesce((SELECT json_agg(p ORDER BY (p.total + p.shape_ups) DESC, p.name, p.id) FROM project_stats p), '[]'::json)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

ANALYZE public.tickets;
ANALYZE public.shape_ups;
ANALYZE public.emails;
ANALYZE public.project_po;
NOTIFY pgrst, 'reload schema';
COMMIT;
