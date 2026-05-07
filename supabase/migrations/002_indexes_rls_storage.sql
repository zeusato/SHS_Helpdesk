-- INDEXES, TRIGGERS, RLS, STORAGE — Part 2

-- INDEXES
CREATE INDEX idx_tickets_project ON tickets(project_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_shapeups_project ON shape_ups(project_id);
CREATE INDEX idx_shapeups_status ON shape_ups(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_emails_ticket ON emails(ticket_id);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shapeups_updated_at BEFORE UPDATE ON shape_ups FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- NOTIFY PO on new ticket
CREATE OR REPLACE FUNCTION notify_po_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT pp.user_id, 'new_ticket',
    'Ticket mới: ' || NEW.title,
    'Từ ' || NEW.requester_name || ' (' || NEW.requester_email || ')',
    '/tickets/' || NEW.id
  FROM project_po pp WHERE pp.project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_created AFTER INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION notify_po_new_ticket();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_po ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shape_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_shapeup ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS VARCHAR AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_po_of_project(p_project_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM project_po WHERE project_id = p_project_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Projects RLS
CREATE POLICY "managers_all_projects" ON projects FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_read_projects" ON projects FOR SELECT USING (get_user_role() = 'po' AND EXISTS (SELECT 1 FROM project_po WHERE project_id = projects.id AND user_id = auth.uid()));
CREATE POLICY "anon_read_projects" ON projects FOR SELECT USING (status = 'active') TO anon;

-- Users RLS
CREATE POLICY "managers_all_users" ON users FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "authenticated_read_users" ON users FOR SELECT USING (true) TO authenticated;

-- Project_po RLS
CREATE POLICY "managers_all_project_po" ON project_po FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_read_own" ON project_po FOR SELECT USING (user_id = auth.uid());

-- Tickets RLS
CREATE POLICY "managers_all_tickets" ON tickets FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_tickets" ON tickets FOR ALL USING (is_po_of_project(project_id));
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT WITH CHECK (true) TO anon;

-- Shape_ups RLS
CREATE POLICY "managers_all_shapeups" ON shape_ups FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_shapeups" ON shape_ups FOR ALL USING (is_po_of_project(project_id));

-- Emails RLS
CREATE POLICY "managers_all_emails" ON emails FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_emails" ON emails FOR ALL USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = emails.ticket_id AND is_po_of_project(t.project_id)));

-- Ticket_shapeup RLS
CREATE POLICY "managers_all_ts" ON ticket_shapeup FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_ts" ON ticket_shapeup FOR ALL USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_shapeup.ticket_id AND is_po_of_project(t.project_id)));

-- Notifications RLS
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (user_id = auth.uid());

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');
CREATE POLICY "anon_upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'attachments');
