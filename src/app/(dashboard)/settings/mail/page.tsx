'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../shared.module.css'

export default function MailSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' })
  
  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: ''
  })

  const fetchSettings = useMemo(() => async () => {
    // Note: No setLoading(true) here as it's already true on mount
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('user_mail_settings').select('*').eq('user_id', user.id).single()
      if (data) {
        setSmtp({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port?.toString() || '587',
          smtp_user: data.smtp_user || '',
          smtp_pass: data.smtp_pass || ''
        })
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => fetchSettings(), 0)
    return () => clearTimeout(t)
  }, [fetchSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus({ type: '', message: '' })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('user_mail_settings').upsert({
      user_id: user.id,
      smtp_host: smtp.smtp_host,
      smtp_port: parseInt(smtp.smtp_port),
      smtp_user: smtp.smtp_user,
      smtp_pass: smtp.smtp_pass,
      updated_at: new Date().toISOString()
    })

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStatus({ type: 'success', message: 'Cấu hình SMTP đã được lưu thành công.' })
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-xl"><div className="spinner" /></div>

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📧 Cấu hình Email cá nhân (SMTP)</span>
      </div>
      
      <form className={styles.form} onSubmit={handleSave}>
        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-md)' }}>
          Thiết lập hòm thư của bạn để gửi phản hồi trực tiếp cho khách hàng. 
          Các thông tin này sẽ được sử dụng khi bạn thực hiện thao tác gửi email từ Ticket.
        </p>

        {status.message && (
          <div className={status.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {status.message}
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label input-required">SMTP Host</label>
            <input 
              className="input" 
              value={smtp.smtp_host} 
              onChange={e => setSmtp({ ...smtp, smtp_host: e.target.value })}
              placeholder="e.g. smtp.gmail.com"
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label input-required">Port</label>
            <input 
              type="number"
              className="input" 
              value={smtp.smtp_port} 
              onChange={e => setSmtp({ ...smtp, smtp_port: e.target.value })}
              placeholder="465 / 587"
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label input-required">Email đăng nhập (Username)</label>
          <input 
            className="input" 
            value={smtp.smtp_user} 
            onChange={e => setSmtp({ ...smtp, smtp_user: e.target.value })}
            placeholder="example@gmail.com"
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label input-required">Mật khẩu ứng dụng (Password)</label>
          <input 
            type="password"
            className="input" 
            value={smtp.smtp_pass} 
            onChange={e => setSmtp({ ...smtp, smtp_pass: e.target.value })}
            placeholder="••••••••••••••••"
            required
          />
          <p className="text-muted text-xs mt-xs">
            💡 Lưu ý: Với Gmail, bạn nên sử dụng <strong>App Password</strong> thay vì mật khẩu chính.
          </p>
        </div>
        
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Đang lưu...</> : 'Lưu cấu hình Mail'}
          </button>
        </div>
      </form>
    </div>
  )
}
