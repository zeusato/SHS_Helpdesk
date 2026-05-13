'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/upload'
import type { Project } from '@/lib/types'
import styles from './page.module.css'

export default function PortalPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({
    project_id: '',
    requester_name: '',
    requester_email: '',
    requester_department: '',
    title: '',
    issue_detail: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      setProjects((data || []) as Project[])
    }
    fetchProjects()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const imageFiles = selected.filter(f => f.type.startsWith('image/'))

    // Compress each file
    const compressed: File[] = []
    for (const file of imageFiles) {
      try {
        const c = await compressImage(file)
        compressed.push(c)
      } catch {
        compressed.push(file)
      }
    }

    setFiles(prev => [...prev, ...compressed])

    // Generate previews
    const newPreviews = compressed.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // Upload images
      const imageUrls: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg'
        const filename = `tickets/portal/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        const res = await fetch(
          `${supabaseUrl}/storage/v1/object/attachments/${filename}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
              'Content-Type': file.type,
            },
            body: file,
          }
        )

        if (res.ok) {
          imageUrls.push(`${supabaseUrl}/storage/v1/object/public/attachments/${filename}`)
        }
      }

      // Insert ticket
      const { data: newTicket, error: insertError } = await supabase.from('tickets').insert({
        ...form,
        images: imageUrls,
        attachments: [],
        status: 'new',
        priority: 'medium',
      }).select().single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={styles.portalPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✅</div>
          <h2>Gửi yêu cầu thành công!</h2>
          <p>Ticket của bạn đã được tiếp nhận. Chúng tôi sẽ phản hồi qua email <strong>{form.requester_email}</strong> trong thời gian sớm nhất.</p>
          <button className="btn btn-primary btn-lg" onClick={() => {
            setSubmitted(false)
            setForm({ project_id: '', requester_name: '', requester_email: '', requester_department: '', title: '', issue_detail: '' })
            setFiles([])
            setPreviews([])
          }}>
            Tạo yêu cầu mới
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.portalPage}>
      <div className={styles.portalContainer}>
        <div className={styles.portalHeader}>
          <div className={styles.portalLogo}>
            <img src="/LOGO.png" alt="Logo" className={styles.logoImg} />
          </div>
          <h1>SHS Helpdesk</h1>
          <p>Hệ thống tiếp nhận và xử lý yêu cầu hỗ trợ</p>
        </div>

        <form className={styles.portalForm} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>⚠️ {error}</div>
          )}

          {/* Thông tin người gửi */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin người gửi</h3>
            <div className={styles.formGrid}>
              <div className="input-group">
                <label className="input-label input-required" htmlFor="portal-name">Họ và tên</label>
                <input id="portal-name" className="input" placeholder="Nguyễn Văn A" value={form.requester_name}
                  onChange={e => setForm({ ...form, requester_name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label input-required" htmlFor="portal-email">Email</label>
                <input id="portal-email" className="input" type="email" placeholder="email@company.com" value={form.requester_email}
                  onChange={e => setForm({ ...form, requester_email: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="portal-dept">Phòng ban</label>
                <input id="portal-dept" className="input" placeholder="VD: Kinh doanh, Kỹ thuật..." value={form.requester_department}
                  onChange={e => setForm({ ...form, requester_department: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label input-required" htmlFor="portal-project">Nền tảng / Dự án</label>
                <select id="portal-project" className="select" value={form.project_id}
                  onChange={e => setForm({ ...form, project_id: e.target.value })} required>
                  <option value="">— Chọn dự án —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Nội dung yêu cầu */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Nội dung yêu cầu</h3>
            <div className="input-group">
              <label className="input-label input-required" htmlFor="portal-title">Tiêu đề</label>
              <input id="portal-title" className="input" placeholder="Tóm tắt ngắn gọn vấn đề" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-group" style={{ marginTop: 'var(--space-md)' }}>
              <label className="input-label input-required" htmlFor="portal-detail">Mô tả chi tiết</label>
              <textarea id="portal-detail" className="textarea" rows={6} placeholder="Mô tả chi tiết vấn đề, các bước tái hiện lỗi..." value={form.issue_detail}
                onChange={e => setForm({ ...form, issue_detail: e.target.value })} required />
            </div>
          </div>

          {/* Upload ảnh */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ảnh đính kèm <span className={styles.optional}>(không bắt buộc)</span></h3>
            <div className={styles.uploadArea}>
              <label className={styles.uploadLabel} htmlFor="portal-files">
                <span className={styles.uploadIcon}>📎</span>
                <span>Kéo thả hoặc bấm để chọn ảnh</span>
                <span className={styles.uploadHint}>Tối đa 500KB/ảnh (tự động nén)</span>
              </label>
              <input id="portal-files" type="file" accept="image/*" multiple
                onChange={handleFileChange} className={styles.uploadInput} />
            </div>

            {previews.length > 0 && (
              <div className={styles.previewGrid}>
                {previews.map((url, i) => (
                  <div key={i} className={styles.previewItem}>
                    <img src={url} alt={`Ảnh ${i + 1}`} className={styles.previewImg} />
                    <button type="button" className={styles.removeBtn} onClick={() => removeFile(i)}>✕</button>
                    <span className={styles.fileSize}>{(files[i].size / 1024).toFixed(0)}KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className={`btn btn-primary btn-lg ${styles.submitBtn}`} disabled={submitting}>
            {submitting ? (
              <><span className="spinner" /> Đang gửi...</>
            ) : (
              '📨 Gửi yêu cầu'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
