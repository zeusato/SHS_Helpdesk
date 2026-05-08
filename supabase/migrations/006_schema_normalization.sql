-- Migration: Schema Normalization & Cleanup
-- 1. Thêm cột recipient_email vào bảng emails
-- 2. Thêm ràng buộc UNIQUE cho email trong bảng users
-- 3. Đảm bảo tính nhất quán của dữ liệu

-- Thêm cột recipient_email nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'emails' AND COLUMN_NAME = 'recipient_email') THEN
        ALTER TABLE emails ADD COLUMN recipient_email VARCHAR(255);
    END IF;
END $$;

-- Thêm UNIQUE constraint cho users.email nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- Cập nhật RLS functions để tối ưu hơn
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_po_of_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_po
        WHERE project_id = p_project_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
