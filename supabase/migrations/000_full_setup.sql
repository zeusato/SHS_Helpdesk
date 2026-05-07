-- ================================================================
-- HELPDESK & SHAPE UP — FULL DATABASE SETUP
-- Copy toàn bộ nội dung này vào Supabase SQL Editor rồi bấm RUN
-- ================================================================


-- ======================== PHẦN 1: TẠO BẢNG ========================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng PROJECTS (Danh sách nền tảng/dự án)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng USERS (Tài khoản nội bộ — link với auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL
    CHECK (role IN ('manager', 'po')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng PROJECT_PO (Phân quyền PO ↔ Project)
CREATE TABLE IF NOT EXISTS project_po (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. Bảng TICKETS (Yêu cầu tiếp nhận)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title VARCHAR(500) NOT NULL,
  issue_detail TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(30) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'pending_customer', 'resolved', 'closed')),
  requester_name VARCHAR(255) NOT NULL,
  requester_department VARCHAR(255),
  requester_email VARCHAR(255) NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  reply_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bảng SHAPE_UPS (Thư viện tri thức)
CREATE TABLE IF NOT EXISTS shape_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title VARCHAR(500) NOT NULL,
  issue_detail TEXT,
  solution TEXT,
  document_link VARCHAR(1000),
  jira_link VARCHAR(1000),
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  images JSONB DEFAULT '[]'::jsonb,
  done_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Bảng EMAILS (Lịch sử gửi email phản hồi)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  sent_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Bảng TICKET_SHAPEUP (Linking ticket ↔ shape_up)
CREATE TABLE IF NOT EXISTS ticket_shapeup (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  shapeup_id UUID NOT NULL REFERENCES shape_ups(id) ON DELETE CASCADE,
  linked_by_user UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  linked_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, shapeup_id)
);

-- 8. Bảng NOTIFICATIONS (Thông báo in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  title VARCHAR(500) NOT NULL,
  message TEXT,
  link VARCHAR(1000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ======================== PHẦN 2: INDEXES ========================

CREATE INDEX idx_tickets_project ON tickets(project_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX idx_shapeups_project ON shape_ups(project_id);
CREATE INDEX idx_shapeups_status ON shape_ups(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_emails_ticket ON emails(ticket_id);


-- ======================== PHẦN 3: TRIGGERS ========================

-- Auto-update updated_at khi UPDATE row
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shapeups_updated_at
  BEFORE UPDATE ON shape_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tự động tạo notification cho PO khi có ticket mới
CREATE OR REPLACE FUNCTION notify_po_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT
    pp.user_id,
    'new_ticket',
    'Ticket mới: ' || NEW.title,
    'Từ ' || NEW.requester_name || ' (' || NEW.requester_email || ')',
    '/tickets/' || NEW.id
  FROM project_po pp
  WHERE pp.project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION notify_po_new_ticket();


-- ======================== PHẦN 4: ROW LEVEL SECURITY ========================

-- Bật RLS trên tất cả bảng
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_po ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shape_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_shapeup ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: Lấy role của user hiện tại
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Kiểm tra user có phải PO của project không
CREATE OR REPLACE FUNCTION is_po_of_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_po
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === PROJECTS ===
CREATE POLICY "managers_all_projects" ON projects
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_read_projects" ON projects
  FOR SELECT USING (
    get_user_role() = 'po'
    AND EXISTS (
      SELECT 1 FROM project_po
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );
CREATE POLICY "anon_read_projects" ON projects
  FOR SELECT TO anon USING (status = 'active');

-- === USERS ===
CREATE POLICY "managers_all_users" ON users
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "authenticated_read_users" ON users
  FOR SELECT TO authenticated USING (true);

-- === PROJECT_PO ===
CREATE POLICY "managers_all_project_po" ON project_po
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_read_own" ON project_po
  FOR SELECT USING (user_id = auth.uid());

-- === TICKETS ===
CREATE POLICY "managers_all_tickets" ON tickets
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_tickets" ON tickets
  FOR ALL USING (is_po_of_project(project_id));
CREATE POLICY "anon_insert_tickets" ON tickets
  FOR INSERT TO anon WITH CHECK (true);

-- === SHAPE_UPS ===
CREATE POLICY "managers_all_shapeups" ON shape_ups
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_shapeups" ON shape_ups
  FOR ALL USING (is_po_of_project(project_id));

-- === EMAILS ===
CREATE POLICY "managers_all_emails" ON emails
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_emails" ON emails
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = emails.ticket_id
      AND is_po_of_project(t.project_id)
    )
  );

-- === TICKET_SHAPEUP ===
CREATE POLICY "managers_all_ts" ON ticket_shapeup
  FOR ALL USING (get_user_role() = 'manager');
CREATE POLICY "po_ts" ON ticket_shapeup
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_shapeup.ticket_id
      AND is_po_of_project(t.project_id)
    )
  );

-- === NOTIFICATIONS ===
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());


-- ======================== PHẦN 5: STORAGE BUCKET ========================

-- Tạo bucket "attachments" cho upload ảnh/file
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Cho phép authenticated user upload/update/delete
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');

-- Cho phép public đọc file
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'attachments');

-- Cho phép anonymous upload (portal tạo ticket)
CREATE POLICY "anon_upload" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'attachments');


-- ======================== HOÀN TẤT ========================
-- Chạy xong sẽ có:
--   ✅ 8 bảng: projects, users, project_po, tickets, shape_ups, emails, ticket_shapeup, notifications
--   ✅ 9 indexes tối ưu query
--   ✅ 2 triggers: auto updated_at + auto notify PO khi có ticket mới
--   ✅ RLS policies cho tất cả bảng (manager/po/anon)
--   ✅ Storage bucket "attachments" (5MB, ảnh + PDF)
