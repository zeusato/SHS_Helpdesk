'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import Link from 'next/link'

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
  const supabase = createClient()
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null)

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('emails')
      .select('*, ticket:tickets(title), sender:users(name)')
      .order('sent_date', { ascending: false })
    
    setEmails((data || []) as any)
    setLoading(false)
  }

  return (
    <div className="container">
      <div className="header-actions">
        <div>
          <h1>📧 Lịch sử Email</h1>
          <p className="text-secondary">Theo dõi các phản hồi đã gửi cho khách hàng</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Chưa có email nào được gửi.</td></tr>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedEmail(email)}>
                        👁️ Xem nội dung
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Email Content Modal */}
      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📧 Chi tiết nội dung Email</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedEmail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px', paddingBottom: '12px' }}>
                  <p><strong>Ngày gửi:</strong> {format(new Date(selectedEmail.sent_date), 'PPPP p', { locale: vi })}</p>
                  <p><strong>Tới:</strong> {selectedEmail.recipient_email}</p>
                  <p><strong>Tiêu đề:</strong> {selectedEmail.subject}</p>
                </div>
                <div 
                  className="email-content-preview"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
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
