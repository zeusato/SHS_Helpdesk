'use client'

import Icon from '@/components/ui/Icon'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import Link from 'next/link'
import styles from './page.module.css'
import { usePagedQuery } from '@/lib/hooks/usePagedQuery'
import Pagination from '@/components/ui/Pagination'
import QueryError from '@/components/ui/QueryError'

interface EmailRecord {
  id: string
  ticket_id: string
  sender_id: string
  subject: string
  content: string
  sent_date: string
  recipient_email: string
  ticket: {
    title: string
  }
  sender: {
    name: string
  }
}

export default function EmailsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null)

  const loadEmails = useCallback((from: number, to: number, signal: AbortSignal) =>
    supabase.from('emails')
      .select('id,ticket_id,sender_id,subject,sent_date,recipient_email,ticket:tickets(title),sender:users(name)')
      .order('sent_date', { ascending: false }).order('id', { ascending: false })
      .range(from, to).abortSignal(signal), [supabase])
  const { rows: emails, loading, error, page, hasNext, setPage, reload } = usePagedQuery<EmailRecord>(loadEmails)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const [contentRetry, setContentRetry] = useState(0)
  const emailId = selectedEmail?.id
  useEffect(() => {
    if (!emailId) return
    const controller = new AbortController()
    void Promise.resolve(supabase.from('emails').select('content').eq('id', emailId).abortSignal(controller.signal).single())
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        setContentError(error ? 'Không tải được nội dung email.' : '')
        if (data) setSelectedEmail(previous => previous?.id === emailId ? { ...previous, content: data.content } : previous)
        setContentLoading(false)
      })
    return () => controller.abort()
  }, [supabase, emailId, contentRetry])
  const openEmail = (email: EmailRecord) => {
    setContentLoading(true)
    setContentError('')
    setSelectedEmail(email)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Trao đổi & phản hồi</span>
          <h1>Lịch sử email</h1>
          <p className="text-secondary">Theo dõi các phản hồi đã gửi cho khách hàng</p>
        </div>
      </div>

      <QueryError message={error} onRetry={reload} />
      <div className={styles.tableSection}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày gửi</th>
                <th>Người nhận</th>
                <th>Tiêu đề Email</th>
                <th>Ticket liên quan</th>
                <th>Người gửi (PO)</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Đang tải...</td></tr>
              ) : emails.length === 0 ? (
                <tr><td colSpan={6}><div className={styles.empty}><Icon name="mail" size={32} /><strong>Chưa có email đã gửi</strong><p>Các phản hồi gửi từ ticket sẽ xuất hiện tại đây.</p></div></td></tr>
              ) : (
                emails.map(email => (
                  <tr key={email.id}>
                    <td>{format(new Date(email.sent_date), 'dd/MM/yyyy HH:mm', { locale: vi })}</td>
                    <td><code className="text-sm">{email.recipient_email || '—'}</code></td>
                    <td style={{ fontWeight: 500 }}>{email.subject}</td>
                    <td>
                      <Link href={`/tickets/${email.ticket_id}`} className="text-brand text-sm hover:underline">
                        {email.ticket?.title || 'Xem Ticket'}
                      </Link>
                    </td>
                    <td>{email.sender?.name}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEmail(email)}>
                        <Icon name="eye" size={18} /> Xem nội dung
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} count={emails.length} hasNext={hasNext} loading={loading} onChange={setPage} />
      {/* View Email Content Modal */}
      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Icon name="mail" size={18} /> Chi tiết nội dung Email</h3>
              <button aria-label="Đóng" className="btn btn-ghost btn-icon" onClick={() => setSelectedEmail(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal-body">
              {contentLoading && <p role="status">Đang tải nội dung…</p>}
              <QueryError message={contentError} onRetry={() => { setContentLoading(true); setContentRetry(value => value + 1) }} />
              <div className={styles.emailPreview}>
                <div className={styles.emailMeta}>
                  <p><strong>Ngày gửi:</strong> {format(new Date(selectedEmail.sent_date), 'PPPP p', { locale: vi })}</p>
                  <p><strong>Tới:</strong> {selectedEmail.recipient_email}</p>
                  <p><strong>Tiêu đề:</strong> {selectedEmail.subject}</p>
                </div>
                <div 
                  className="email-content-preview"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.content || '' }}
                  style={{ lineHeight: '1.6' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedEmail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
