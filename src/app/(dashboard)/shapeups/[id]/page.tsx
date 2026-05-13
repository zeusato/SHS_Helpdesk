'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { ShapeUp, Project, Ticket } from '@/lib/types'
import RichTextEditor from '@/components/ui/RichTextEditor'
import imageCompression from 'browser-image-compression'
import styles from './page.module.css'

export default function ShapeUpDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const shapeUpId = params.id as string
  const isNew = shapeUpId === 'new'

  const [shapeUp, setShapeUp] = useState<Partial<ShapeUp>>({
    title: searchParams.get('title') || '',
    issue_detail: searchParams.get('issue_detail') || '',
    solution: '',
    status: 'draft',
    project_id: searchParams.get('project_id') || '',
    images: [],
  })
  
  const [projects, setProjects] = useState<Project[]>([])
  const [linkedTickets, setLinkedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fetchShapeUp = useCallback(async () => {
    if (isNew) return
    
    // Fetch Shape Up details
    const { data: suData } = await supabase
      .from('shape_ups')
      .select('*, project:projects(id, name), author:users!created_by(id, name)')
      .eq('id', shapeUpId)
      .single()
      
    if (suData) setShapeUp(suData)

    // Fetch linked tickets
    const { data: tsData } = await supabase
      .from('ticket_shapeup')
      .select('*, ticket:tickets(*)')
      .eq('shapeup_id', shapeUpId)
      
    if (tsData) {
      setLinkedTickets(tsData.map(ts => ts.ticket) as unknown as Ticket[])
    }
    
    setLoading(false)
  }, [isNew, shapeUpId, supabase])

  const fetchProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    
    if (profile?.role === 'manager') {
      const { data } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
      setProjects((data || []) as Project[])
    } else {
      const { data } = await supabase.from('project_po').select('project:projects(id, name)').eq('user_id', user.id)
      const myProjects = data?.map(d => d.project).filter(Boolean) || []
      setProjects(myProjects as unknown as Project[])
    }
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchProjects()
      fetchShapeUp()
    }, 0)
    return () => clearTimeout(t)
  }, [fetchProjects, fetchShapeUp])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) await uploadFiles(e.dataTransfer.files)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await uploadFiles(e.target.files)
  }

  const uploadFiles = async (files: FileList) => {
    if (!files || files.length === 0) return
    setUploadingImage(true)

    const newImages = [...(shapeUp.images as string[] || [])]
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 })
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${shapeUpId === 'new' ? 'temp' : shapeUpId}/${fileName}`

        const { error } = await supabase.storage.from('attachments').upload(filePath, compressed)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath)
          newImages.push(publicUrl)
        }
      } catch (err) {
        console.error('Lỗi upload ảnh:', err)
      }
    }
    setShapeUp({ ...shapeUp, images: newImages })
    setUploadingImage(false)
  }

  const removeImage = (index: number) => {
    const newImages = [...(shapeUp.images as string[] || [])]
    newImages.splice(index, 1)
    setShapeUp({ ...shapeUp, images: newImages })
  }

  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setSaving(false)
      return
    }

    const payload = {
      title: shapeUp.title,
      issue_detail: shapeUp.issue_detail,
      solution: shapeUp.solution,
      document_link: shapeUp.document_link || null,
      jira_link: shapeUp.jira_link || null,
      note: shapeUp.note || null,
      project_id: shapeUp.project_id,
      status: status,
      images: shapeUp.images || [],
    }

    let resultId = shapeUpId

    if (isNew) {
      const { data, error } = await supabase.from('shape_ups').insert({
        ...payload,
        created_by: user.id,
      }).select('id').single()
      
      if (!error && data) {
        resultId = data.id
        // Handle source ticket if came from URL
        const sourceTicketId = searchParams.get('source_ticket_id')
        if (sourceTicketId) {
          await supabase.from('ticket_shapeup').insert({
            ticket_id: sourceTicketId,
            shapeup_id: resultId,
            linked_by_user: user.id
          })
        }
        router.replace(`/shapeups/${resultId}`)
      } else {
        alert('Lỗi lưu: ' + error?.message)
      }
    } else {
      const { error } = await supabase.from('shape_ups').update(payload).eq('id', shapeUpId)
      if (error) alert('Lỗi lưu: ' + error.message)
      else fetchShapeUp()
    }
    
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center" style={{ padding: '80px' }}><div className="spinner" /></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="flex gap-sm items-center">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/shapeups')}>← Danh sách</button>
          <span className="text-muted">/</span>
          <span className="text-muted">{isNew ? 'Tạo mới' : shapeUp.id?.slice(0,8)}</span>
        </div>
        <div className="flex gap-sm items-center">
          {saving && <span className="text-sm text-muted flex items-center gap-xs"><span className="spinner" /> Đang lưu...</span>}
          <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving || !shapeUp.title}>
            💾 Lưu nháp
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving || !shapeUp.title}>
            🚀 Xuất bản
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <div className="card">
            <div className="input-group">
              <label className="input-label input-required">Tiêu đề Shape Up</label>
              <input 
                className="input" 
                style={{ fontSize: '1.25rem', padding: '12px 16px' }} 
                value={shapeUp.title || ''} 
                onChange={e => setShapeUp({ ...shapeUp, title: e.target.value })} 
                placeholder="Ví dụ: Tích hợp thanh toán VNPay..."
              />
            </div>

            <div className={styles.editorGroup}>
              <label className="input-label">Mô tả vấn đề gốc</label>
              <RichTextEditor 
                content={shapeUp.issue_detail || ''} 
                onChange={(html) => setShapeUp({ ...shapeUp, issue_detail: html })} 
              />
            </div>

            <div className={styles.editorGroup}>
              <label className="input-label">Cách giải quyết (Solution)</label>
              <RichTextEditor 
                content={shapeUp.solution || ''} 
                onChange={(html) => setShapeUp({ ...shapeUp, solution: html })} 
              />
            </div>

          </div>
        </div>

        <div className={styles.sidebar}>
          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-md)' }}>Cấu hình</h4>
            <div className="input-group">
              <label className="input-label input-required">Dự án</label>
              <select className="select" value={shapeUp.project_id || ''} onChange={e => setShapeUp({ ...shapeUp, project_id: e.target.value })}>
                <option value="">— Chọn dự án —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Trạng thái</label>
              <span className={`badge ${shapeUp.status === 'published' ? 'badge-resolved' : 'badge-pending'}`} style={{ display: 'inline-flex', width: 'fit-content' }}>
                {shapeUp.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
              </span>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-md)' }}>Liên kết tham khảo</h4>
            <div className="input-group">
              <label className="input-label">Link tài liệu (Confluence, Wiki)</label>
              <input className="input" value={shapeUp.document_link || ''} onChange={e => setShapeUp({ ...shapeUp, document_link: e.target.value })} placeholder="https://..." />
            </div>
            <div className="input-group">
              <label className="input-label">Link Jira (Epic, Task)</label>
              <input className="input" value={shapeUp.jira_link || ''} onChange={e => setShapeUp({ ...shapeUp, jira_link: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-md)' }}>🖼️ Ảnh đính kèm</h4>
            
            <div 
              className={`${styles.dragDropZone} ${isDragging ? styles.dragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-sm text-secondary py-md">
                  <span className="spinner" style={{ width: '24px', height: '24px' }} />
                  <span className="text-sm">Đang tải ảnh lên...</span>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '16px 0' }}>
                  <span style={{ fontSize: '24px' }}>📥</span>
                  <span className="text-sm text-secondary text-center">
                    Kéo thả ảnh vào đây<br/>hoặc click để chọn file
                  </span>
                  <input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
                </label>
              )}
            </div>
            
            {shapeUp.images && (shapeUp.images as string[]).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginTop: '16px' }}>
                {(shapeUp.images as string[]).map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <Image src={url} alt="Đính kèm" fill style={{ objectFit: 'cover' }} />
                    <button 
                      className="btn btn-icon" 
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', width: '20px', height: '20px', minWidth: '20px', fontSize: '12px' }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(i); }}
                      title="Xoá ảnh"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isNew && (
            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-md)' }}>🎫 Ticket liên kết</h4>
              {linkedTickets.length === 0 ? (
                <p className="text-muted text-sm">Chưa có ticket nào được gắn thẻ Shape Up này.</p>
              ) : (
                <div className="flex flex-col gap-sm">
                  {linkedTickets.map(t => (
                    <div key={t.id} className={styles.linkedTicket} onClick={() => router.push(`/tickets/${t.id}`)}>
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="text-xs text-muted flex justify-between mt-xs">
                        <span>{t.id.slice(0,8)}</span>
                        <span>{new Date(t.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
