'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface ProjectStat {
  id: string
  name: string
  new: number
  in_progress: number
  resolved: number
  total: number
  shape_ups: number
}

interface Stats {
  ticketsNew: number
  ticketsInProgress: number
  ticketsResolved: number
  ticketsClosed: number
  ticketsTotal: number
  shapeUpsTotal: number
  shapeUpsDraft: number
  shapeUpsPublished: number
  projectStats: ProjectStat[]
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTickets, setRecentTickets] = useState<{ id: string; title: string; status: string; requester_name: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)

      const [
        { count: ticketsNew },
        { count: ticketsInProgress },
        { count: ticketsResolved },
        { count: ticketsClosed },
        { count: ticketsTotal },
        { count: shapeUpsTotal },
        { count: shapeUpsDraft },
        { count: shapeUpsPublished },
        { data: recent },
        { data: projects },
        { data: allTickets },
        { data: allShapeUps }
      ] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('shape_ups').select('*', { count: 'exact', head: true }),
        supabase.from('shape_ups').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('shape_ups').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('tickets').select('id, title, status, requester_name, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('projects').select('id, name'),
        supabase.from('tickets').select('project_id, status'),
        supabase.from('shape_ups').select('project_id')
      ])

      // Calculate project stats
      const pStats: ProjectStat[] = (projects || []).map(p => {
        const pTickets = (allTickets || []).filter(t => t.project_id === p.id)
        const pShapeUps = (allShapeUps || []).filter(s => s.project_id === p.id)
        return {
          id: p.id,
          name: p.name,
          new: pTickets.filter(t => t.status === 'new').length,
          in_progress: pTickets.filter(t => t.status === 'in_progress').length,
          resolved: pTickets.filter(t => t.status === 'resolved').length,
          total: pTickets.length,
          shape_ups: pShapeUps.length
        }
      }).sort((a, b) => (b.total + b.shape_ups) - (a.total + a.shape_ups))

      setStats({
        ticketsNew: ticketsNew || 0,
        ticketsInProgress: ticketsInProgress || 0,
        ticketsResolved: ticketsResolved || 0,
        ticketsClosed: ticketsClosed || 0,
        ticketsTotal: ticketsTotal || 0,
        shapeUpsTotal: shapeUpsTotal || 0,
        shapeUpsDraft: shapeUpsDraft || 0,
        shapeUpsPublished: shapeUpsPublished || 0,
        projectStats: pStats
      })
      setRecentTickets(recent || [])
      setLoading(false)
    }

    fetchStats()
  }, [])

  const STATUS_MAP: Record<string, { label: string; badge: string }> = {
    new: { label: 'Mới', badge: 'badge-new' },
    in_progress: { label: 'Đang xử lý', badge: 'badge-in-progress' },
    pending_customer: { label: 'Chờ KH', badge: 'badge-pending' },
    resolved: { label: 'Đã xử lý', badge: 'badge-resolved' },
    closed: { label: 'Đóng', badge: 'badge-closed' },
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}p trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h trước`
    return `${Math.floor(hours / 24)}d trước`
  }

  if (loading) return <div className="flex justify-center" style={{ padding: '80px' }}><div className="spinner" /></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p className="text-secondary">Tổng quan hệ thống Helpdesk & Shape Up</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>🎫</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.ticketsNew ?? 0}</span>
            <span className={styles.statLabel}>Ticket mới</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>⏳</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.ticketsInProgress ?? 0}</span>
            <span className={styles.statLabel}>Đang xử lý</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>✅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.ticketsResolved ?? 0}</span>
            <span className={styles.statLabel}>Đã giải quyết</span>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>📚</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.shapeUpsTotal ?? 0}</span>
            <span className={styles.statLabel}>Shape Up</span>
          </div>
        </div>
      </div>

      {/* Project Breakdown */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">📊 Thống kê theo Dự án</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Dự án</th>
                <th>Mới</th>
                <th>Đang xử lý</th>
                <th>Đã xử lý</th>
                <th>Thư viện (Shape Up)</th>
                <th>Tổng cộng</th>
              </tr>
            </thead>
            <tbody>
              {stats?.projectStats?.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className="badge badge-new" style={{ minWidth: '32px', justifyContent: 'center' }}>
                      {p.new}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-in-progress" style={{ minWidth: '32px', justifyContent: 'center' }}>
                      {p.in_progress}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-resolved" style={{ minWidth: '32px', justifyContent: 'center' }}>
                      {p.resolved}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-pending" style={{ minWidth: '32px', justifyContent: 'center', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                      {p.shape_ups}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-closed" style={{ minWidth: '32px', justifyContent: 'center' }}>
                      {p.total + p.shape_ups}
                    </span>
                  </td>
                </tr>
              ))}
              {stats?.projectStats.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">Chưa có dữ liệu dự án</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.gridTwo}>
        {/* Summary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📈 Tổng hợp</span>
          </div>
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span className="text-secondary">Tổng ticket</span>
              <strong>{stats?.ticketsTotal ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className="text-secondary">Ticket đã đóng</span>
              <strong>{stats?.ticketsClosed ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className="text-secondary">Shape Up bản nháp</span>
              <strong>{stats?.shapeUpsDraft ?? 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className="text-secondary">Shape Up đã xuất bản</span>
              <strong>{stats?.shapeUpsPublished ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🕐 Ticket gần đây</span>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-muted">Chưa có ticket nào</p>
          ) : (
            <div className={styles.recentList}>
              {recentTickets.map(t => (
                <div key={t.id} className={styles.recentItem}>
                  <div className={styles.recentInfo}>
                    <span className={styles.recentTitle}>{t.title}</span>
                    <span className="text-muted text-sm">{t.requester_name} · {timeAgo(t.created_at)}</span>
                  </div>
                  <span className={`badge ${STATUS_MAP[t.status]?.badge || ''}`}>
                    {STATUS_MAP[t.status]?.label || t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
