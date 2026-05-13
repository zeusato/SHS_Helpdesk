-- Migration: Fix notification trigger for anonymous ticket creation
-- 1. Cập nhật hàm notify_po_new_ticket thành SECURITY DEFINER
-- 2. Đảm bảo hàm có thể chạy bởi bất kỳ ai (kể cả anon) nhưng với quyền cao hơn

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Đảm bảo trigger vẫn hoạt động đúng
DROP TRIGGER IF EXISTS on_ticket_created ON tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION notify_po_new_ticket();
