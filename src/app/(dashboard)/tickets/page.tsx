'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Ticket, Project } from '@/lib/types'
import styles from './page.module.css'

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
  const supabase = createClient()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('tickets')
      .select('*, project:projects(id, name), assignee:users!assignee_id(id, name)')
      .order('created_at', { ascending: false })

    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterPriority) query = query.eq('priority', filterPriority)
    if (filterProject) query = query.eq('project_id', filterProject)
    if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,requester_name.ilike.%${searchQuery}%,requester_email.ilike.%${searchQuery}%`)

    const { data } = await query
    setTickets((data as Ticket[]) || [])
    setLoading(false)
  }, [filterStatus, filterPriority, filterProject, searchQuery])

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
    setProjects((data || []) as Project[])
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { fetchTickets() }, [fetchTickets])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    const days = Math.floor(hours / 24)
    return `${days} ngày trước`
  }

  // Kanban columns
  const kanbanStatuses = ['new', 'in_progress', 'pending_customer', 'resolved', 'closed']

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Quản lý Ticket</h1>
          <p className="text-secondary mt-sm">{tickets.length} ticket</p>
        </div>
        <div className="flex gap-sm items-center">
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewActive : ''}`} onClick={() => setViewMode('table')}>📋 Bảng</button>
            <button className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewActive : ''}`} onClick={() => setViewMode('kanban')}>📊 Kanban</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input className="input" placeholder="🔍 Tìm kiếm ticket..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: '280px' }} />
        <select className="select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Tất cả dự án</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ maxWidth: '160px' }}>
          <option value="">Mức ưu tiên</option>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-container">
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
                    <div className="empty-state-icon">🎫</div>
                    <div className="empty-state-title">Chưa có ticket nào</div>
                  </div>
                </td></tr>
              ) : tickets.map(t => (
                <tr key={t.id} onClick={() => router.push(`/tickets/${t.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className={styles.ticketTitle}>{t.title}</div>
                    <div className="text-muted text-sm">{t.id.slice(0, 8)}</div>
                  </td>
                  <td><span className={styles.projectTag}>{(t.project as unknown as Project)?.name || '—'}</span></td>
                  <td>
                    <div>{t.requester_name}</div>
                    <div className="text-muted text-sm">{t.requester_email}</div>
                  </td>
                  <td><span className={`badge ${PRIORITY_MAP[t.priority]?.badge}`}>{PRIORITY_MAP[t.priority]?.label}</span></td>
                  <td><span className={`badge ${STATUS_MAP[t.status]?.badge}`}>{STATUS_MAP[t.status]?.label}</span></td>
                  <td className="text-secondary">{(t.assignee as unknown as { name: string })?.name || '—'}</td>
                  <td className="text-muted text-sm">{timeAgo(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
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
                        <span className={`badge ${PRIORITY_MAP[t.priority]?.badge}`} style={{ fontSize: '10px', padding: '1px 6px' }}>{PRIORITY_MAP[t.priority]?.label}</span>
                        <span className="text-muted" style={{ fontSize: '11px' }}>{t.id.slice(0, 8)}</span>
                      </div>
                      <div className={styles.kanbanCardTitle}>{t.title}</div>
                      <div className={styles.kanbanCardMeta}>
                        <span>{t.requester_name}</span>
                        <span>{timeAgo(t.created_at)}</span>
                      </div>
                      {(t.project as unknown as Project)?.name && (
                        <span className={styles.projectTag} style={{ fontSize: '11px', marginTop: '4px' }}>{(t.project as unknown as Project).name}</span>
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
    </div>
  )
}
