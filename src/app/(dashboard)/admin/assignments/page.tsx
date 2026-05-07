'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, User, ProjectPO } from '@/lib/types'
import styles from '../projects/page.module.css'

export default function AdminAssignmentsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [poUsers, setPoUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<(ProjectPO & { user?: User; project?: Project })[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ project_id: '', user_id: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [projectsRes, usersRes, assignRes] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'active').order('name'),
      supabase.from('users').select('*').eq('role', 'po').eq('status', 'active').order('name'),
      supabase.from('project_po').select('*, user:users(*), project:projects(*)').order('created_at', { ascending: false }),
    ])
    setProjects(projectsRes.data || [])
    setPoUsers(usersRes.data || [])
    setAssignments(assignRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('project_po').insert({ project_id: form.project_id, user_id: form.user_id })
      setShowModal(false)
      fetchData()
    } finally { setSaving(false) }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Gỡ phân quyền PO này?')) return
    await supabase.from('project_po').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Phân quyền PO</h1>
          <p className="text-secondary mt-sm">Gán Product Owner quản lý dự án</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ project_id: '', user_id: '' }); setShowModal(true) }}>
          ＋ Gán PO
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Dự án</th>
              <th>Product Owner</th>
              <th>Email</th>
              <th>Ngày gán</th>
              <th style={{ width: '80px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="flex justify-center" style={{ padding: '40px' }}><div className="spinner" /></div></td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon">🔗</div>
                  <div className="empty-state-title">Chưa có phân quyền nào</div>
                </div>
              </td></tr>
            ) : assignments.map(a => (
              <tr key={a.id}>
                <td><strong>{a.project?.name || '—'}</strong></td>
                <td>{a.user?.name || '—'}</td>
                <td className="text-secondary">{a.user?.email || '—'}</td>
                <td className="text-muted text-sm">{new Date(a.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(a.id)}>🗑️</button>
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
              <h3>Gán PO vào dự án</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label input-required">Dự án</label>
                  <select className="select" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} required>
                    <option value="">— Chọn dự án —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label input-required">Product Owner</label>
                  <select className="select" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
                    <option value="">— Chọn PO —</option>
                    {poUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : 'Gán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
