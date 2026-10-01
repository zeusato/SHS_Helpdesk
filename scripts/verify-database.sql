-- Read-only verification after migration 008. Does not create sessions or data.
SELECT 'rls_tables' AS check_name, count(*)::text AS result
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
UNION ALL
SELECT 'new_valid_indexes', count(*)::text FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND i.indisvalid AND c.relname IN (
  'idx_tickets_created_id','idx_tickets_project_created_id','idx_shapeups_created_id',
  'idx_shapeups_project_created_id','idx_emails_sent_id','idx_notifications_user_created',
  'idx_project_po_user_project','idx_ticket_shapeup_shapeup','idx_shapeups_created_by',
  'idx_emails_sender','idx_tickets_title_trgm','idx_tickets_requester_name_trgm',
  'idx_tickets_requester_email_trgm','idx_shapeups_title_trgm'
)
UNION ALL SELECT 'anonymous_dashboard_access', has_function_privilege('anon', 'public.get_dashboard_stats()', 'execute')::text
UNION ALL SELECT 'authenticated_dashboard_access', has_function_privilege('authenticated', 'public.get_dashboard_stats()', 'execute')::text
UNION ALL SELECT 'protected_account_active', count(*)::text FROM public.users WHERE email = 'manhquyet88@gmail.com' AND role = 'manager' AND status = 'active'
UNION ALL SELECT 'users', count(*)::text FROM public.users
UNION ALL SELECT 'projects', count(*)::text FROM public.projects
UNION ALL SELECT 'tickets', count(*)::text FROM public.tickets
UNION ALL SELECT 'shape_ups', count(*)::text FROM public.shape_ups
UNION ALL SELECT 'user_mail_settings', count(*)::text FROM public.user_mail_settings;
