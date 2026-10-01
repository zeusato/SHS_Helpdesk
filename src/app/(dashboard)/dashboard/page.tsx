'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

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
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTickets, setRecentTickets] = useState<{ id: string; title: string; status: string; requester_name: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats')
      if (error) {
        console.error('RPC Error:', error)
        return
      }
      
      if (data) {
        setStats({
          ticketsNew: data.ticketsNew,
          ticketsInProgress: data.ticketsInProgress,
          ticketsResolved: data.ticketsResolved,
          ticketsClosed: data.ticketsClosed,
          ticketsTotal: data.ticketsTotal,
          shapeUpsTotal: data.shapeUpsTotal,
          shapeUpsDraft: data.shapeUpsDraft,
          shapeUpsPublished: data.shapeUpsPublished,
          projectStats: data.projectStats
        })
        setRecentTickets(data.recentTickets)
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => fetchDashboardData(), 0)
    return () => clearTimeout(t)
  }, [fetchDashboardData])

  const STATUS_MAP: Record<string, { label: string; badge: string }> = {
    new: { label: 'Mới', badge: 'badge-new' },
    in_progress: { label: 'Đang xử lý', badge: 'badge-in-progress' },
    pending_customer: { label: 'Chờ KH', badge: 'badge-pending' },
    resolved: { label: 'Đã xử lý', badge: 'badge-resolved' },
    closed: { label: 'Đóng', badge: 'badge-closed' },
  }

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi })
    } catch {
      return '—'
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>TVSI / Không gian làm việc</p><h1>Tổng quan hỗ trợ</h1><p className={styles.intro}>Theo dõi yêu cầu, phối hợp xử lý và chia sẻ tri thức.</p></div>
        <Link href="/portal" className="btn btn-primary"><Icon name="plus" size={18} />Tạo ticket</Link>
      </header>
      {!loading && !stats && <div className={styles.notice} role="alert"><Icon name="warning" size={18} /> Chưa tải được dữ liệu tổng quan.<button className="btn btn-ghost btn-sm" onClick={fetchDashboardData}>Thử lại</button></div>}
      <section className={styles.statsGrid} aria-label="Thống kê hỗ trợ" aria-busy={loading}>
        {[
          { label: 'Ticket mới', value: stats?.ticketsNew, color: 'var(--color-brand)' },
          { label: 'Đang xử lý', value: stats?.ticketsInProgress, color: 'var(--color-info)' },
          { label: 'Đã giải quyết', value: stats?.ticketsResolved, color: 'var(--color-success)' },
          { label: 'Bài Shape Up', value: stats?.shapeUpsTotal, color: 'var(--color-text-muted)' },
        ].map(item => <article className={styles.statCard} key={item.label}>
          <span className={styles.statLabel}><i style={{ background: item.color }} />{item.label}</span>
          <strong className={styles.statValue}>{loading ? <span className={styles.skeleton} /> : (item.value ?? '—')}</strong>
        </article>)}
      </section>
      <div className={styles.workspaceGrid}>
        <section className={styles.recentSection}>
          <div className={styles.sectionHeader}><h2>Ticket gần đây</h2><Link href="/tickets" className={styles.sectionLink}>Xem tất cả <Icon name="arrowRight" size={16} /></Link></div>
          <div className={styles.recentList} aria-busy={loading}>
            {loading ? [1, 2, 3, 4].map(i => <div key={i} className={styles.recentItem}><span className={styles.skeleton} style={{ width: '60%', height: 19 }} /><span className={styles.skeleton} style={{ width: 70, height: 23 }} /></div>) : recentTickets.length === 0 ? <div className={styles.emptyState}><Icon name="ticket" size={27} /><p>Chưa có ticket nào</p><span>Yêu cầu mới sẽ xuất hiện tại đây.</span></div> : recentTickets.map(t => <Link href={'/tickets/' + t.id} key={t.id} className={styles.recentItem}>
              <div className={styles.recentInfo}><span className={styles.recentTitle}>{t.title}</span><span className={styles.recentMeta}>{t.requester_name} · {timeAgo(t.created_at)}</span></div>
              <span className={'badge ' + (STATUS_MAP[t.status]?.badge || '')}>{STATUS_MAP[t.status]?.label || t.status}</span>
            </Link>)}
          </div>
        </section>
        <aside className={styles.knowledge}>
          <p className={styles.eyebrow}>Thư viện / Shape Up</p><h2>Chia sẻ để<br />cùng giải quyết.</h2>
          <div className={styles.guide}><h3>Ghi nhận yêu cầu rõ ràng</h3><p>Nêu vấn đề, bước thực hiện và kết quả mong muốn trong ticket.</p></div>
          <div className={styles.guide}><h3>Theo dõi đến khi hoàn tất</h3><p>Theo dõi trạng thái và bổ sung thông tin trong luồng trao đổi.</p></div>
          <Link href="/shapeups" className={styles.sectionLink}>Khám phá Shape Up <Icon name="arrowRight" size={16} /></Link>
        </aside>
      </div>
      <section className={styles.projectSection}>
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>Phân bổ công việc</p><h2>Thống kê theo dự án</h2></div></div>
        <div className={styles.tableWrap}><table className="table"><thead><tr><th scope="col">Dự án</th><th scope="col">Mới</th><th scope="col">Đang xử lý</th><th scope="col">Đã giải quyết</th><th scope="col">Bài Shape Up</th><th scope="col">Tổng cộng</th></tr></thead><tbody>
          {loading ? [1, 2, 3].map(i => <tr key={i}>{[1, 2, 3, 4, 5, 6].map(j => <td key={j}><span className={styles.skeleton} style={{ width: j === 1 ? 130 : 34, height: 18 }} /></td>)}</tr>) : (stats?.projectStats || []).length === 0 ? <tr><td colSpan={6} className={styles.tableEmpty}>Chưa có dữ liệu dự án</td></tr> : stats?.projectStats.map(p => <tr key={p.id}><td className={styles.projectName}>{p.name}</td><td>{p.new}</td><td>{p.in_progress}</td><td>{p.resolved}</td><td>{p.shape_ups}</td><td><strong>{p.total + p.shape_ups}</strong></td></tr>)}
        </tbody></table></div>
      </section>
      <section className={styles.summary} aria-label="Tổng hợp">
        {[
          { label: 'Tổng ticket', value: stats?.ticketsTotal },
          { label: 'Ticket đã đóng', value: stats?.ticketsClosed },
          { label: 'Shape Up bản nháp', value: stats?.shapeUpsDraft },
          { label: 'Shape Up đã xuất bản', value: stats?.shapeUpsPublished },
        ].map(row => <div className={styles.summaryRow} key={row.label}><span>{row.label}</span><strong>{loading ? '…' : (row.value ?? '—')}</strong></div>)}
      </section>
    </div>
  )
}