'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { Ticket, Project } from '@/lib/types'
import styles from './page.module.css'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'
import { usePagedQuery } from '@/lib/hooks/usePagedQuery'
import { ticketSearchFilter } from '@/lib/data/pagination'
import Pagination from '@/components/ui/Pagination'
import QueryError from '@/components/ui/QueryError'

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  new: { label: 'Mới', badge: 'badge-new' },
  in_progress: { label: 'Đang xử lý', badge: 'badge-in-progress' },
  pending_customer: { label: 'Chờ KH', badge: 'badge-pending' },
  resolved: { label: 'Đã giải quyết', badge: 'badge-resolved' },
  closed: { label: 'Đóng', badge: 'badge-closed' },
}

const PRIORITY_MAP: Record<string, { label: string; badge: string }> = {
  high: { label: 'Cao', badge: 'badge-high' },
  medium: { label: 'Trung bình', badge: 'badge-medium' },
  low: { label: 'Thấp', badge: 'badge-low' },
}

type ViewMode = 'table' | 'kanban'

export default function TicketsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<Project[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadTickets = useCallback((from: number, to: number, signal: AbortSignal) => {
    let query = supabase.from('tickets')
      .select('id,title,project_id,status,priority,requester_name,requester_email,created_at,project:projects(id,name),assignee:users!assignee_id(id,name)')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(from, to).abortSignal(signal)
    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterPriority) query = query.eq('priority', filterPriority)
    if (filterProject) query = query.eq('project_id', filterProject)
    if (searchQuery.trim()) query = query.or(ticketSearchFilter(searchQuery))
    return query
  }, [filterStatus, filterPriority, filterProject, searchQuery, supabase])
  const { rows: tickets, loading, error, page, hasNext, setPage, reload } = usePagedQuery<Ticket>(
    loadTickets, JSON.stringify([filterStatus, filterPriority, filterProject, searchQuery]), searchQuery ? 300 : 0
  )
  const [projectError, setProjectError] = useState('')
  const [projectRetry, setProjectRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve(supabase.from('projects').select('id, name').eq('status', 'active').order('name').abortSignal(controller.signal))
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        setProjects((data || []) as Project[])
        setProjectError(error ? 'Không tải được danh sách dự án.' : '')
      })
    return () => controller.abort()
  }, [supabase, projectRetry])

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi })
    } catch {
      return '—'
    }
  }

  // Kanban columns
  const kanbanStatuses = ['new', 'in_progress', 'pending_customer', 'resolved', 'closed']

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>TVSI / Yêu cầu hỗ trợ</p><h1>Quản lý ticket</h1>
          <p className="text-secondary mt-sm">Tiếp nhận, phân công và theo dõi từng yêu cầu hỗ trợ.</p>
        </div>
        <div className="flex gap-sm items-center">
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewActive : ''}`} aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}><Icon name="menu" size={16} /> Bảng</button>
            <button className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewActive : ''}`} aria-pressed={viewMode === 'kanban'} onClick={() => setViewMode('kanban')}><Icon name="grid" size={16} /> Kanban</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input className="input" type="search" aria-label="Tìm kiếm ticket" placeholder="Tìm ticket, người gửi, email..." value={searchQuery} onChange={_e => { setSearchQuery(_e.target.value) }} style={{ maxWidth: '280px' }} />
        <select className="select" aria-label="Lọc theo dự án" value={filterProject} onChange={_e => { setFilterProject(_e.target.value) }} style={{ maxWidth: '200px' }}>
          <option value="">Tất cả dự án</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" aria-label="Lọc theo trạng thái" value={filterStatus} onChange={_e => { setFilterStatus(_e.target.value) }} style={{ maxWidth: '180px' }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" aria-label="Lọc theo mức ưu tiên" value={filterPriority} onChange={e => { setFilterPriority(e.target.value) }} style={{ maxWidth: '160px' }}>
          <option value="">Mức ưu tiên</option>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className={styles.resultSummary} aria-live="polite"><span>{loading ? 'Đang tải yêu cầu…' : tickets.length + ' ticket trong danh sách'}</span><span>Quản lý theo trạng thái và mức ưu tiên</span></div>
      <QueryError message={error} onRetry={reload} />
      <QueryError message={projectError} onRetry={() => setProjectRetry(value => value + 1)} />
      {viewMode === 'kanban' && <p className="text-muted text-sm">Các cột hiển thị ticket trong trang hiện tại.</p>}
      {/* Table View */}
      {viewMode === 'table' && (
        <div className={styles.tableWrap} aria-busy={loading}>
          <table className="table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Dự án</th>
                <th>Người gửi</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Người phụ trách</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="flex justify-center" style={{ padding: '40px' }}><div className="spinner" /></div></td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="ticket" size={36} /></div>
                    <div className="empty-state-title">Chưa có ticket nào</div>
                  </div>
                </td></tr>
              ) : tickets.map(t => (
                <tr key={t.id} onClick={() => router.push(`/tickets/${t.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <Link href={'/tickets/' + t.id} className={styles.ticketTitle}>{t.title}</Link>
                    <div className="text-muted text-sm">{t.id.slice(0, 8)}</div>
                  </td>
                  <td><span className={styles.projectTag}>{t.project?.name || '—'}</span></td>
                  <td>
                    <div>{t.requester_name}</div>
                    <div className="text-muted text-sm">{t.requester_email}</div>
                  </td>
                  <td><span className={`badge ${PRIORITY_MAP[t.priority]?.badge}`}>{PRIORITY_MAP[t.priority]?.label}</span></td>
                  <td><span className={`badge ${STATUS_MAP[t.status]?.badge}`}>{STATUS_MAP[t.status]?.label}</span></td>
                   <td className="text-secondary">{t.assignee?.name || '—'}</td>
                  <td className="text-muted text-sm">{timeAgo(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && loading && <div className={styles.loadingState} role="status"><span className="spinner" /> Đang tải ticket...</div>}
      {viewMode === 'kanban' && !loading && (
        <div className={styles.kanbanBoard}>
          {kanbanStatuses.map(status => {
            const statusTickets = tickets.filter(t => t.status === status)
            return (
              <div key={status} className={styles.kanbanColumn}>
                <div className={styles.kanbanHeader}>
                  <span className={`badge ${STATUS_MAP[status]?.badge}`}>{STATUS_MAP[status]?.label}</span>
                  <span className={styles.kanbanCount}>{statusTickets.length}</span>
                </div>
                <div className={styles.kanbanCards}>
                  {statusTickets.map(t => (
                    <div key={t.id} className={styles.kanbanCard} onClick={() => router.push(`/tickets/${t.id}`)}>
                      <div className={styles.kanbanCardHeader}>
                        <span className={`badge ${PRIORITY_MAP[t.priority]?.badge}`} style={{ fontSize: '12px', padding: '1px 6px' }}>{PRIORITY_MAP[t.priority]?.label}</span>
                        <span className="text-muted" style={{ fontSize: '12px' }}>{t.id.slice(0, 8)}</span>
                      </div>
                      <Link href={'/tickets/' + t.id} className={styles.kanbanCardTitle}>{t.title}</Link>
                      <div className={styles.kanbanCardMeta}>
                        <span>{t.requester_name}</span>
                        <span>{timeAgo(t.created_at)}</span>
                      </div>
                       {t.project?.name && (
                        <span className={styles.projectTag} style={{ fontSize: '12px', marginTop: '4px' }}>{t.project.name}</span>
                      )}
                    </div>
                  ))}
                  {statusTickets.length === 0 && (
                    <div className={styles.kanbanEmpty}>Trống</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Pagination page={page} count={tickets.length} hasNext={hasNext} loading={loading} onChange={setPage} />
    </div>
  )
}
