-- RPC: get_dashboard_stats
-- Trả về toàn bộ thống kê dashboard trong 1 lần gọi duy nhất
-- Tối ưu hóa hiệu năng, tránh waterfall request và in-memory processing

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    curr_user_id UUID := auth.uid();
    curr_user_role VARCHAR;
    result JSON;
BEGIN
    -- Lấy role của user hiện tại
    SELECT role INTO curr_user_role FROM users WHERE id = curr_user_id;

    WITH 
    visible_projects AS (
        SELECT id, name FROM projects 
        WHERE curr_user_role = 'manager' 
           OR (curr_user_role = 'po' AND id IN (SELECT project_id FROM project_po WHERE user_id = curr_user_id))
    ),
    ticket_counts AS (
        SELECT 
            count(*) FILTER (WHERE status = 'new') as tickets_new,
            count(*) FILTER (WHERE status = 'in_progress') as tickets_in_progress,
            count(*) FILTER (WHERE status = 'resolved') as tickets_resolved,
            count(*) FILTER (WHERE status = 'closed') as tickets_closed,
            count(*) as tickets_total
        FROM tickets
        WHERE project_id IN (SELECT id FROM visible_projects)
    ),
    shapeup_counts AS (
        SELECT 
            count(*) as shapeups_total,
            count(*) FILTER (WHERE status = 'draft') as shapeups_draft,
            count(*) FILTER (WHERE status = 'published') as shapeups_published
        FROM shape_ups
        WHERE project_id IN (SELECT id FROM visible_projects)
    ),
    recent_tickets AS (
        SELECT COALESCE(json_agg(t), '[]'::json) FROM (
            SELECT id, title, status, requester_name, created_at 
            FROM tickets 
            WHERE project_id IN (SELECT id FROM visible_projects)
            ORDER BY created_at DESC 
            LIMIT 5
        ) t
    ),
    project_stats_grouped AS (
        SELECT 
            p.id,
            p.name,
            count(t.id) FILTER (WHERE t.status = 'new') as new_count,
            count(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
            count(t.id) FILTER (WHERE t.status = 'resolved') as resolved_count,
            count(t.id) as total_count
        FROM visible_projects p
        LEFT JOIN tickets t ON t.project_id = p.id
        GROUP BY p.id, p.name
    ),
    project_shapeups AS (
        SELECT 
            project_id,
            count(*) as shape_ups_count
        FROM shape_ups
        WHERE project_id IN (SELECT id FROM visible_projects)
        GROUP BY project_id
    ),
    final_project_stats AS (
        SELECT COALESCE(json_agg(p_stats), '[]'::json) FROM (
            SELECT 
                ps.id,
                ps.name,
                ps.new_count as new,
                ps.in_progress_count as in_progress,
                ps.resolved_count as resolved,
                ps.total_count as total,
                COALESCE(su.shape_ups_count, 0) as shape_ups
            FROM project_stats_grouped ps
            LEFT JOIN project_shapeups su ON su.project_id = ps.id
            ORDER BY (ps.total_count + COALESCE(su.shape_ups_count, 0)) DESC
        ) p_stats
    )
    SELECT json_build_object(
        'ticketsNew', (SELECT tickets_new FROM ticket_counts),
        'ticketsInProgress', (SELECT tickets_in_progress FROM ticket_counts),
        'ticketsResolved', (SELECT tickets_resolved FROM ticket_counts),
        'ticketsClosed', (SELECT tickets_closed FROM ticket_counts),
        'ticketsTotal', (SELECT tickets_total FROM ticket_counts),
        'shapeUpsTotal', (SELECT shapeups_total FROM shapeup_counts),
        'shapeUpsDraft', (SELECT shapeups_draft FROM shapeup_counts),
        'shapeUpsPublished', (SELECT shapeups_published FROM shapeup_counts),
        'recentTickets', (SELECT * FROM recent_tickets),
        'projectStats', (SELECT * FROM final_project_stats)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
