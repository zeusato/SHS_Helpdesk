'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../shared.module.css'

export default function SecuritySettingsPage() {
  const supabase = createClient()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' })
  const [updating, setUpdating] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' })
      return
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
      return
    }

    setUpdating(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    setUpdating(false)

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStatus({ type: 'success', message: 'Cập nhật mật khẩu thành công.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🔒 Đổi mật khẩu đăng nhập</span>
      </div>
      
      <form className={styles.form} onSubmit={handleUpdatePassword}>
        {status.message && (
          <div className={status.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {status.message}
          </div>
        )}
        
        <div className="input-group">
          <label className="input-label input-required">Mật khẩu mới</label>
          <input 
            type="password" 
            className="input" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            required 
            minLength={6}
            placeholder="Nhập mật khẩu mới..."
          />
        </div>
        <div className="input-group">
          <label className="input-label input-required">Xác nhận mật khẩu</label>
          <input 
            type="password" 
            className="input" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            minLength={6}
            placeholder="Nhập lại mật khẩu..."
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={updating}>
            {updating ? <><span className="spinner" /> Đang cập nhật...</> : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  )
}
