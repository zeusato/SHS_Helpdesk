'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'
import styles from './page.module.css'

export default function AdminProjectsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => fetchProjects(), 0)
    return () => clearTimeout(t)
  }, [fetchProjects])

  const openCreate = () => {
    setEditingProject(null)
    setForm({ name: '', description: '', status: 'active' })
    setShowModal(true)
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setForm({ name: project.name, description: project.description || '', status: project.status })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setLoading(true)
    try {
      if (editingProject) {
        await supabase.from('projects').update(form).eq('id', editingProject.id)
      } else {
        await supabase.from('projects').insert(form)
      }
      setShowModal(false)
      fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này?')) return
    setLoading(true)
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Quản lý Dự án</h1>
          <p className="text-secondary mt-sm">Danh sách nền tảng / dự án trong hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          ＋ Thêm dự án
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tên dự án</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th style={{ width: '120px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="flex justify-center" style={{ padding: '40px' }}><div className="spinner" /></div></td></tr>
            ) : projects.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon">📁</div>
                  <div className="empty-state-title">Chưa có dự án nào</div>
                  <p className="text-muted">Bấm &quot;Thêm dự án&quot; để bắt đầu</p>
                </div>
              </td></tr>
            ) : (
              projects.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td className="text-secondary truncate" style={{ maxWidth: '300px' }}>{p.description || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status === 'active' ? 'Hoạt động' : 'Ngừng'}</span></td>
                  <td className="text-muted text-sm">{new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="flex gap-xs">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label input-required">Tên dự án</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Mô tả</label>
                  <textarea className="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="input-group">
                  <label className="input-label">Trạng thái</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
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
