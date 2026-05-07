'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'
import styles from '../projects/page.module.css'

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', name: '', email: '', role: 'po', status: 'active', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openCreate = () => {
    setEditingUser(null)
    setForm({ username: '', name: '', email: '', role: 'po', status: 'active', password: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({ username: user.username, name: user.name, email: user.email, role: user.role, status: user.status, password: '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingUser) {
        // Update profile only
        const { error: updateError } = await supabase.from('users').update({
          username: form.username, name: form.name, email: form.email, role: form.role, status: form.status,
        }).eq('id', editingUser.id)
        if (updateError) { setError(updateError.message); return }
      } else {
        // Create new auth user via API route, then profile
        if (!form.password || form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return }
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const result = await res.json()
        if (!res.ok) { setError(result.error || 'Lỗi tạo tài khoản'); return }
      }
      setShowModal(false)
      fetchUsers()
    } finally { setSaving(false) }
  }

  const roleLabel = (role: string) => role === 'manager' ? 'Quản trị viên' : 'Product Owner'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Quản lý Tài khoản</h1>
          <p className="text-secondary mt-sm">Danh sách tài khoản nội bộ (Manager, PO)</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Thêm tài khoản</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tên đăng nhập</th>
              <th>Tên hiển thị</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th style={{ width: '100px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="flex justify-center" style={{ padding: '40px' }}><div className="spinner" /></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon">👤</div>
                  <div className="empty-state-title">Chưa có tài khoản nào</div>
                </div>
              </td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td>{u.name}</td>
                <td className="text-secondary">{u.email}</td>
                <td><span className={`badge ${u.role === 'manager' ? 'badge-published' : 'badge-in-progress'}`}>{roleLabel(u.role)}</span></td>
                <td><span className={`badge badge-${u.status}`}>{u.status === 'active' ? 'Hoạt động' : 'Ngừng'}</span></td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {error && <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>⚠️ {error}</div>}
                <div className="input-group">
                  <label className="input-label input-required">Tên đăng nhập</label>
                  <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label input-required">Tên hiển thị</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label input-required">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                {!editingUser && (
                  <div className="input-group">
                    <label className="input-label input-required">Mật khẩu</label>
                    <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Tối thiểu 6 ký tự" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label className="input-label">Vai trò</label>
                    <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="po">Product Owner</option>
                      <option value="manager">Quản trị viên</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Trạng thái</label>
                    <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Ngừng</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
