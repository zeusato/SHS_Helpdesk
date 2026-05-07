-- HELPDESK & SHAPE UP SYSTEM — DATABASE MIGRATION
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS (profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'po')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROJECT_PO
CREATE TABLE IF NOT EXISTS project_po (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. TICKETS
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title VARCHAR(500) NOT NULL,
  issue_detail TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_customer', 'resolved', 'closed')),
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

-- 5. SHAPE_UPS
CREATE TABLE IF NOT EXISTS shape_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title VARCHAR(500) NOT NULL,
  issue_detail TEXT,
  solution TEXT,
  document_link VARCHAR(1000),
  jira_link VARCHAR(1000),
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  images JSONB DEFAULT '[]'::jsonb,
  done_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EMAILS
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  sent_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TICKET_SHAPEUP
CREATE TABLE IF NOT EXISTS ticket_shapeup (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  shapeup_id UUID NOT NULL REFERENCES shape_ups(id) ON DELETE CASCADE,
  linked_by_user UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  linked_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, shapeup_id)
);

-- 8. NOTIFICATIONS
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
