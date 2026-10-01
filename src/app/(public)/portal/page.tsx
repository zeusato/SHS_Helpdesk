'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/upload'
import type { Project } from '@/lib/types'
import styles from './page.module.css'
import BrandLogo from '@/components/ui/BrandLogo'
import Icon from '@/components/ui/Icon'
import Link from 'next/link'

export default function PortalPage() {
  const supabase = useMemo(() => createClient(), [])
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
  }, [supabase])

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

        if (!res.ok) throw new Error('Không tải được ảnh đính kèm')
        if (res.ok) {
          imageUrls.push(`${supabaseUrl}/storage/v1/object/public/attachments/${filename}`)
        }
      }

      // Insert ticket
      const { error: insertError } = await supabase.from('tickets').insert({
        ...form,
        images: imageUrls,
        attachments: [],
        status: 'new',
        priority: 'medium',
      })

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
          <BrandLogo />
          <div className={styles.successIcon}><Icon name="circleCheck" size={42} /></div>
          <p className={styles.eyebrow}>TVSI Helpdesk</p>
          <h1>Yêu cầu đã được tiếp nhận.</h1>
          <p>Ticket của bạn đã được tiếp nhận. Chúng tôi sẽ phản hồi qua email <strong>{form.requester_email}</strong> trong thời gian sớm nhất.</p>
          <button className="btn btn-primary btn-lg" onClick={() => {
            setSubmitted(false)
            setForm({ project_id: '', requester_name: '', requester_email: '', requester_department: '', title: '', issue_detail: '' })
            setFiles([])
            setPreviews([])
          }}>
            Tạo yêu cầu mới
          </button>
          <Link href="/login" className={styles.successLink}>Trở về đăng nhập <Icon name="arrowRight" size={16} /></Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.portalPage}>
      <div className={styles.portalContainer}>
        <header className={styles.portalHeader}>
          <div className={styles.identity}><BrandLogo /><span>Helpdesk<small>Cổng tiếp nhận yêu cầu</small></span></div>
          <Link href="/login" className={styles.loginLink}>Đăng nhập <Icon name="arrowRight" size={17} /></Link>
        </header>
        <main className={styles.content}>
        <aside className={styles.intro}>
          <p className={styles.eyebrow}>TVSI / Hỗ trợ</p>
          <h1>Gửi yêu cầu.<br />Kết nối hỗ trợ.</h1>
          <p className={styles.introDescription}>Chia sẻ vấn đề bạn đang gặp. Đội ngũ hỗ trợ sẽ tiếp nhận và phối hợp giải quyết.</p>
          <div className={styles.guide}>
            <h2>Để được hỗ trợ tốt hơn</h2>
            <p>Nêu rõ vấn đề, các bước đã thực hiện và kết quả mong muốn.</p>
            <p>Đính kèm ảnh chụp màn hình nếu cần làm rõ tình huống.</p>
          </div>
          <div className={styles.replyNote}><Icon name="mail" size={20} /><p>Phản hồi sẽ được gửi đến email bạn cung cấp.</p></div>
        </aside>

        <form className={styles.portalForm} onSubmit={handleSubmit} aria-busy={submitting}>
          <div className={styles.formHeading}><h2>Yêu cầu hỗ trợ</h2><p>Các trường có dấu <span aria-hidden="true">*</span> là bắt buộc.</p></div>
          {error && (
            <div className={styles.error} role="alert"><Icon name="warning" size={18} /> {error}</div>
          )}

          {/* Thông tin người gửi */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><span className={styles.sectionNumber}>01</span>Thông tin người gửi</h3>
            <div className={styles.formGrid}>
              <div className="input-group">
                <label className="input-label input-required" htmlFor="portal-name">Họ và tên</label>
                <input id="portal-name" name="name" autoComplete="name" className="input" placeholder="Nhập họ và tên" value={form.requester_name}
                  onChange={e => setForm({ ...form, requester_name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label input-required" htmlFor="portal-email">Email</label>
                <input id="portal-email" name="email" autoComplete="email" className="input" type="email" placeholder="Nhập email nhận phản hồi" value={form.requester_email}
                  onChange={e => setForm({ ...form, requester_email: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="portal-dept">Phòng ban</label>
                <input id="portal-dept" name="department" className="input" placeholder="Nhập tên phòng ban" value={form.requester_department}
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
            <h3 className={styles.sectionTitle}><span className={styles.sectionNumber}>02</span>Nội dung yêu cầu</h3>
            <div className="input-group">
              <label className="input-label input-required" htmlFor="portal-title">Tiêu đề</label>
              <input id="portal-title" className="input" placeholder="Tóm tắt ngắn gọn vấn đề" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-group" style={{ marginTop: 'var(--space-md)' }}>
              <label className="input-label input-required" htmlFor="portal-detail">Mô tả chi tiết</label>
              <textarea id="portal-detail" className="textarea" rows={5} placeholder="Mô tả vấn đề, các bước đã thực hiện và kết quả mong muốn…" value={form.issue_detail}
                onChange={e => setForm({ ...form, issue_detail: e.target.value })} required />
            </div>
          </div>

          {/* Upload ảnh */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><span className={styles.sectionNumber}>03</span>Ảnh đính kèm <span className={styles.optional}>Không bắt buộc</span></h3>
            <div className={styles.uploadArea}>
              <label className={styles.uploadLabel} htmlFor="portal-files">
                <Icon name="upload" size={24} />
                <span>Bấm để chọn ảnh đính kèm</span>
                <span className={styles.uploadHint}>Có thể chọn nhiều ảnh · Tự động nén trước khi gửi</span>
              </label>
              <input id="portal-files" type="file" accept="image/*" multiple
                onChange={handleFileChange} className={styles.uploadInput} />
            </div>

            {previews.length > 0 && (
              <div className={styles.previewGrid}>
                {previews.map((url, i) => (
                  <div key={i} className={styles.previewItem}>
                    <img src={url} alt={`Ảnh ${i + 1}`} className={styles.previewImg} />
                    <button type="button" className={styles.removeBtn} aria-label={`Xóa ảnh ${i + 1}`} onClick={() => removeFile(i)}><Icon name="close" size={16} /></button>
                    <span className={styles.fileSize}>{(files[i].size / 1024).toFixed(0)}KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.submitRow}><p>Kiểm tra thông tin trước khi gửi yêu cầu.</p><button type="submit" className={`btn btn-primary btn-lg ${styles.submitBtn}`} disabled={submitting}>
            {submitting ? (
              <><span className="spinner" /> Đang gửi...</>
            ) : (
              <>Gửi yêu cầu <Icon name="arrowRight" size={18} /></>
            )}
          </button></div>
        </form>
        </main>
        <footer className={styles.footer}><span>TVSI Helpdesk</span><span>Công ty Cổ phần Chứng khoán Tân Việt</span></footer>
      </div>
    </div>
  )
}
