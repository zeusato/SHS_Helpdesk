'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Ticket, Project, User, ShapeUp, TicketShapeUp } from '@/lib/types'
import styles from './page.module.css'
import { decryptKey } from '@/lib/utils/crypto'
import { marked } from 'marked'
import RichTextEditor from '@/components/ui/RichTextEditor'
import editorStyles from '@/components/ui/RichTextEditor.module.css'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'pending_customer', label: 'Chờ khách hàng' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đóng' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Cao' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'low', label: 'Thấp' },
]

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [poUsers, setPoUsers] = useState<User[]>([])
  const [linkedShapeUps, setLinkedShapeUps] = useState<(TicketShapeUp & { shapeup: ShapeUp })[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Reply email
  const [showReply, setShowReply] = useState(false)
  const [replySubject, setReplySubject] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [draftingAI, setDraftingAI] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Shape Up search
  const [showShapeUpSearch, setShowShapeUpSearch] = useState(false)
  const [shapeUpQuery, setShapeUpQuery] = useState('')
  const [shapeUpResults, setShapeUpResults] = useState<ShapeUp[]>([])
  const [searchingShapeUp, setSearchingShapeUp] = useState(false)
  const [recommendingShapeUp, setRecommendingShapeUp] = useState(false)

  // Convert to Shape Up modal
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertForm, setConvertForm] = useState({ title: '', issue_detail: '', solution: '', document_link: '', jira_link: '', note: '' })
  const [savingConvert, setSavingConvert] = useState(false)

  const [userMailSettings, setUserMailSettings] = useState<{ smtp_user: string, name: string } | null>(null)

  useEffect(() => {
    const fetchUserAndSettings = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const [settingsRes, userRes] = await Promise.all([
          supabase.from('user_mail_settings').select('smtp_user').eq('user_id', authUser.id).single(),
          supabase.from('users').select('name').eq('id', authUser.id).single()
        ])
        setUserMailSettings({ 
          smtp_user: settingsRes.data?.smtp_user || '', 
          name: userRes.data?.name || authUser.email || 'PO' 
        })
      }
    }
    const t = setTimeout(() => fetchUserAndSettings(), 0)
    return () => clearTimeout(t)
  }, [supabase])

  const fetchTicket = useCallback(async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*, project:projects(*), assignee:users!assignee_id(*), linked_shapeups:ticket_shapeup(shape_up:shape_ups(*))')
      .eq('id', ticketId)
      .single()
    
    if (data) {
      setTicket(data as unknown as Ticket)

      // Fetch linked shape ups
      const { data: links } = await supabase
        .from('ticket_shapeup')
        .select('*, shapeup:shape_ups(*)')
        .eq('ticket_id', ticketId)
      setLinkedShapeUps((links || []) as (TicketShapeUp & { shapeup: ShapeUp })[])

      // Fetch POs assigned to this project
      const { data: projectPo } = await supabase
        .from('project_po')
        .select('user:users(id, name, email)')
        .eq('project_id', data.project_id)
      
      const assignedPos = projectPo?.map(p => p.user).filter(Boolean) || []
      setPoUsers(assignedPos as unknown as User[])
    }

    setLoading(false)
  }, [ticketId, supabase])

  useEffect(() => {
    const t = setTimeout(() => fetchTicket(), 0)
    return () => clearTimeout(t)
  }, [fetchTicket])

  useEffect(() => {
    if (ticket) {
      const t = setTimeout(() => setReplySubject(`RE: ${ticket.title}`), 0)
      return () => clearTimeout(t)
    }
  }, [ticket])

  const updateField = async (field: string, value: string | null) => {
    setSaving(true)
    await supabase.from('tickets').update({ [field]: value }).eq('id', ticketId)
    setTicket(prev => prev ? { ...prev, [field]: value } : null)
    setSaving(false)
  }

  const handleAIRecommendShapeUp = async () => {
    const savedKey = localStorage.getItem('gemini_api_key')
    if (!savedKey) {
      alert('Vui lòng cài đặt Gemini API Key trong phần Cài đặt > AI')
      return
    }
    const apiKey = decryptKey(savedKey)
    setRecommendingShapeUp(true)

    try {
      // Fetch some shape ups to compare
      const { data: allShapes } = await supabase.from('shape_ups').select('*').limit(50)
      if (!allShapes) return

      const prompt = `Dựa trên yêu cầu hỗ trợ của khách hàng dưới đây, hãy tìm trong danh sách Knowledge Base (Shape Up) các mục liên quan nhất.

YÊU CẦU CỦA KHÁCH:
"${ticket?.title}: ${ticket?.issue_detail}"

DANH SÁCH SHAPE UP (ID | TIÊU ĐỀ):
${allShapes.map(s => `${s.id} | ${s.title}`).join('\n')}

YÊU CẦU:
1. Trả về tối đa 5 ID của các Shape Up liên quan nhất, phân cách bằng dấu phẩy.
2. Chỉ trả về danh sách ID, không thêm bất kỳ văn bản nào khác.
3. Nếu không thấy mục nào liên quan, hãy trả về "none".`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      const data = await response.json()
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      if (result.trim() !== 'none') {
        const ids = result.split(',').map((id: string) => id.trim())
        const recommended = allShapes.filter(s => ids.includes(s.id))
        setShapeUpResults(recommended)
      } else {
        alert('AI không tìm thấy Shape Up nào thực sự liên quan.')
      }
    } catch (err) {
      console.error('AI Recommend Error:', err)
    } finally {
      setRecommendingShapeUp(false)
    }
  }

  const handleSaveNote = async () => {
    if (!ticket) return
    setSaving(true)
    await supabase.from('tickets').update({ note: ticket.note }).eq('id', ticketId)
    setSaving(false)
  }

  const handleAIDraft = async () => {
    const savedKey = localStorage.getItem('gemini_api_key')
    if (!savedKey) {
      alert('Vui lòng cài đặt Gemini API Key trong phần Cài đặt > AI')
      return
    }
    const apiKey = decryptKey(savedKey)

    setDraftingAI(true)
    try {
      const linkedData = (ticket as unknown as { linked_shapeups: { shape_up: ShapeUp }[] })?.linked_shapeups
      const shapeUp = linkedData?.[0]?.shape_up
      const solutionText = shapeUp?.solution || ''
      const shapeUpProblem = shapeUp?.issue_detail || ''
      const ticketCode = ticket?.id?.slice(0, 8).toUpperCase()

      const prompt = `Bạn là một nhân viên hỗ trợ kỹ thuật chuyên nghiệp. 
Hãy viết một email phản hồi khách hàng với các thông tin sau:

THÔNG TIN TICKET:
- Mã ticket: ${ticketCode}
- Tiêu đề: ${ticket?.title}
- Khách hàng: ${ticket?.requester_name}
- Nội dung vấn đề: ${ticket?.issue_detail}

GIẢI PHÁP TỪ KNOWLEDGE BASE (SHAPE UP):
- Vấn đề liên quan: ${shapeUpProblem}
- Giải pháp đề xuất: ${solutionText}

YÊU CẦU:
- Ngôn ngữ: Tiếng Việt.
- Giọng văn: Lịch sự, chuyên nghiệp, đồng cảm và rõ ràng.
- Nội dung: 
  1. Chào khách hàng bằng tên của họ (${ticket?.requester_name}).
  2. Đề cập đến mã ticket (#${ticketCode}) để khách dễ theo dõi.
  3. Xác nhận đã hiểu vấn đề của khách.
  4. Trình bày giải pháp từ Knowledge Base một cách dễ hiểu, không quá kỹ thuật nếu không cần thiết.
  5. Mong khách phản hồi nếu cần thêm hỗ trợ.
- Chỉ trả về nội dung email hoàn chỉnh, không bao gồm lời dẫn của AI.`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      const data = await response.json()
      const draftedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (draftedContent) {
        // Convert Markdown to HTML
        const htmlContent = marked.parse(draftedContent)
        setReplyContent(htmlContent as string)
      }
    } catch (err) {
      console.error('AI Error:', err)
      alert('Có lỗi xảy ra khi gọi AI')
    } finally {
      setDraftingAI(false)
    }
  }

  const handleFillFromShapeUp = () => {
    const linkedData = (ticket as unknown as { linked_shapeups: { shape_up: ShapeUp }[] })?.linked_shapeups
    const solution = linkedData?.[0]?.shape_up?.solution || ''
    if (solution) {
      setReplyContent(prev => prev + (prev ? '<br/><br/>' : '') + solution)
    }
  }

  const handleRealSend = async () => {
    if (!ticket || !replyContent.trim()) return
    setSendingReply(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ticket.requester_email,
          subject: replySubject,
          html: replyContent,
          ticket_id: ticketId,
          sender_id: authUser.id
        })
      })

      const resData = await response.json()
      if (resData.success) {
        await supabase.from('tickets').update({ 
          reply_date: new Date().toISOString(),
          status: 'resolved' 
        }).eq('id', ticketId)
        
        setShowPreview(false)
        setShowReply(false)
        setReplyContent('')
        fetchTicket()
      } else {
        alert('Lỗi gửi email: ' + (resData.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Send Error:', err)
      alert('Có lỗi xảy ra khi gửi email')
    } finally {
      setSendingReply(false)
    }
  }

  const searchShapeUps = async () => {
    if (!shapeUpQuery.trim() || !ticket) return
    setSearchingShapeUp(true)
    const { data } = await supabase
      .from('shape_ups')
      .select('*')
      .eq('project_id', ticket.project_id)
      .eq('status', 'published')
      .ilike('title', `%${shapeUpQuery}%`)
      .limit(10)
    setShapeUpResults((data || []) as ShapeUp[])
    setSearchingShapeUp(false)
  }

  const linkShapeUp = async (shapeupId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('ticket_shapeup').insert({
      ticket_id: ticketId,
      shapeup_id: shapeupId,
      linked_by_user: authUser.id,
    })
    setShowShapeUpSearch(false)
    setShapeUpQuery('')
    fetchTicket()
  }

  const unlinkShapeUp = async (shapeupId: string) => {
    await supabase.from('ticket_shapeup').delete()
      .eq('ticket_id', ticketId)
      .eq('shapeup_id', shapeupId)
    fetchTicket()
  }

  const handleOpenConvertModal = () => {
    if (!ticket) return
    setConvertForm({
      title: ticket.title,
      issue_detail: ticket.issue_detail || '',
      solution: '',
      document_link: '',
      jira_link: '',
      note: '',
    })
    setShowConvertModal(true)
  }

  const handleSaveConvert = async () => {
    if (!ticket) return
    setSavingConvert(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: newShapeUp, error } = await supabase.from('shape_ups').insert({
        project_id: ticket.project_id,
        title: convertForm.title,
        issue_detail: convertForm.issue_detail,
        solution: convertForm.solution,
        document_link: convertForm.document_link || null,
        jira_link: convertForm.jira_link || null,
        note: convertForm.note || null,
        status: 'draft',
        created_by: authUser.id,
        source_ticket_id: ticket.id,
        images: ticket.images || [],
      }).select('id').single()

      if (!error && newShapeUp) {
        await supabase.from('ticket_shapeup').insert({
          ticket_id: ticket.id,
          shapeup_id: newShapeUp.id,
          linked_by_user: authUser.id,
        })
      }

      setShowConvertModal(false)
      fetchTicket()
    } finally {
      setSavingConvert(false)
    }
  }

  if (loading) return <div className="flex justify-center" style={{ padding: '80px' }}><div className="spinner" /></div>
  if (!ticket) return <div className="empty-state"><div className="empty-state-title">Ticket không tồn tại</div></div>

  const project = ticket.project as unknown as Project

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/tickets')}>← Danh sách Ticket</button>
        <span className="text-muted">/ {ticket.id.slice(0, 8)}</span>
        {saving && <span className={styles.savingIndicator}><span className="spinner" /> Đang lưu...</span>}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className="card">
            <h2 className={styles.title}>{ticket.title}</h2>
            <div className={styles.meta}>
              <span>Từ: <strong>{ticket.requester_name}</strong></span>
              <span>{ticket.requester_email}</span>
              {ticket.requester_department && <span>Phòng ban: {ticket.requester_department}</span>}
              <span>{new Date(ticket.created_at).toLocaleString('vi-VN')}</span>
            </div>

            <div className={styles.detailSection}>
              <h4>Mô tả vấn đề</h4>
              <div className={styles.detailContent}>{ticket.issue_detail || 'Không có mô tả'}</div>
            </div>

            {ticket.images && (ticket.images as string[]).length > 0 && (
              <div className={styles.detailSection}>
                <h4>Ảnh đính kèm ({(ticket.images as string[]).length})</h4>
                <div className={styles.imageGrid}>
                  {(ticket.images as string[]).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ position: 'relative', display: 'block', aspectRatio: '16/9' }}>
                      <Image src={url} alt={`Ảnh ${i + 1}`} fill style={{ objectFit: 'cover' }} className={styles.imageThumb} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">📚 Shape Up liên quan</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowShapeUpSearch(!showShapeUpSearch)}>
                ＋ Liên kết
              </button>
            </div>

            {showShapeUpSearch && (
              <div className={styles.searchBox}>
                <div className="flex gap-sm">
                  <input className="input" placeholder="Tìm Shape Up theo tiêu đề..." value={shapeUpQuery}
                    onChange={e => setShapeUpQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchShapeUps()} />
                  <button className="btn btn-primary btn-sm" onClick={searchShapeUps} disabled={searchingShapeUp}>
                    {searchingShapeUp ? <span className="spinner" /> : '🔍'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleAIRecommendShapeUp} 
                    disabled={recommendingShapeUp}
                    title="Dùng AI tìm Shape Up liên quan"
                  >
                    {recommendingShapeUp ? <span className="spinner" /> : '🪄 AI Gợi ý'}
                  </button>
                </div>
                {shapeUpResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {shapeUpResults.map(s => (
                      <div key={s.id} className={styles.searchResultItem} onClick={() => linkShapeUp(s.id)}>
                        <strong>{s.title}</strong>
                        <span className="text-muted text-sm">{s.issue_detail?.slice(0, 80)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {linkedShapeUps.length === 0 ? (
              <p className="text-muted" style={{ padding: '8px 0' }}>Chưa liên kết Shape Up nào</p>
            ) : (
              <div className={styles.linkedList}>
                {linkedShapeUps.map(link => (
                  <div key={link.shapeup?.id} className={styles.linkedItem}>
                    <div>
                      <strong>{link.shapeup?.title}</strong>
                      <div className="text-muted text-sm">{link.shapeup?.solution?.slice(0, 100)}...</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => unlinkShapeUp(link.shapeup?.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply Email */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📧 Phản hồi Email</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowReply(!showReply)}>
                {showReply ? 'Đóng' : '✉️ Soạn phản hồi'}
              </button>
            </div>

            {showReply && (
              <div className={styles.replyForm}>
                <div className="input-group">
                  <label className="input-label">Gửi tới</label>
                  <input className="input" value={ticket.requester_email} disabled />
                </div>
                <div className="input-group">
                  <label className="input-label">Tiêu đề</label>
                  <input className="input" value={replySubject} onChange={e => setReplySubject(e.target.value)} />
                </div>
                <div className="input-group">
                  <div className="flex justify-between items-center mb-xs">
                    <label className="input-label" style={{ marginBottom: 0 }}>Nội dung</label>
                    <div className="flex gap-sm">
                      <button className="btn btn-ghost btn-sm" onClick={handleFillFromShapeUp}>
                        📚 Chèn giải pháp
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleAIDraft} disabled={draftingAI}>
                        {draftingAI ? <><span className="spinner" /> Đang soạn...</> : '🪄 AI soạn thảo'}
                      </button>
                    </div>
                  </div>
                  <RichTextEditor 
                    content={replyContent} 
                    onChange={setReplyContent} 
                  />
                </div>
                <div className="flex justify-end items-center">
                  <button className="btn btn-primary" onClick={() => setShowPreview(true)} disabled={!replyContent.trim()}>
                    👁️ Xem trước & Gửi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-md)' }}>Thông tin ticket</h4>

            <div className={styles.fieldGroup}>
              <label className="input-label">Trạng thái</label>
              <select className="select" value={ticket.status} onChange={e => updateField('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className="input-label">Mức ưu tiên</label>
              <select className="select" value={ticket.priority} onChange={e => updateField('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className="input-label">Người phụ trách</label>
              <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', padding: '8px 12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                {poUsers.length > 0 ? poUsers.map(u => u.name).join(', ') : '— Chưa phân công —'}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className="input-label">Dự án</label>
              <div className={styles.projectTag}>{project?.name || '—'}</div>
            </div>

            <div className={styles.fieldGroup}>
              <label className="input-label">Ghi chú nội bộ</label>
              <textarea className="textarea" rows={3} value={ticket.note || ''}
                onChange={e => setTicket(prev => prev ? { ...prev, note: e.target.value } : null)}
                onBlur={handleSaveNote} placeholder="Ghi chú cho team..." />
            </div>
          </div>

          <button 
            className="btn btn-secondary w-full" 
            onClick={handleOpenConvertModal}
            disabled={linkedShapeUps.length > 0}
          >
            {linkedShapeUps.length > 0 ? '✅ Đã có Shape Up' : '📚 Chuyển thành Shape Up'}
          </button>
        </div>
      </div>

      {/* Convert to Shape Up Modal */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📚 Chuyển Ticket thành Shape Up</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowConvertModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label input-required">Tiêu đề</label>
                <input className="input" value={convertForm.title} onChange={e => setConvertForm({ ...convertForm, title: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Mô tả vấn đề gốc</label>
                <textarea className="textarea" rows={4} value={convertForm.issue_detail} onChange={e => setConvertForm({ ...convertForm, issue_detail: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Cách giải quyết</label>
                <textarea className="textarea" rows={4} value={convertForm.solution} onChange={e => setConvertForm({ ...convertForm, solution: e.target.value })} placeholder="Mô tả cách giải quyết vấn đề..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Link tài liệu</label>
                  <input className="input" value={convertForm.document_link} onChange={e => setConvertForm({ ...convertForm, document_link: e.target.value })} placeholder="https://..." />
                </div>
                <div className="input-group">
                  <label className="input-label">Link Jira</label>
                  <input className="input" value={convertForm.jira_link} onChange={e => setConvertForm({ ...convertForm, jira_link: e.target.value })} placeholder="https://jira..." />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Ghi chú nội bộ</label>
                <textarea className="textarea" rows={2} value={convertForm.note} onChange={e => setConvertForm({ ...convertForm, note: e.target.value })} />
              </div>
              <p className="text-muted text-sm">💡 Shape Up sẽ được tạo ở trạng thái <strong>Bản nháp</strong>, tự động liên kết với ticket này, và ảnh đính kèm sẽ được copy sang.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveConvert} disabled={savingConvert || !convertForm.title.trim()}>
                {savingConvert ? <><span className="spinner" /> Đang tạo...</> : '📚 Tạo Shape Up'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📧 Xem trước Email</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px', paddingBottom: '12px' }}>
                  <p><strong>Từ:</strong> {userMailSettings?.name || 'Helpdesk'} &lt;{userMailSettings?.smtp_user || 'chưa cấu hình'}&gt;</p>
                  <p><strong>Tới:</strong> {ticket.requester_email}</p>
                  <p><strong>Tiêu đề:</strong> {replySubject}</p>
                </div>
                <div 
                  className={editorStyles.editorContent} 
                  style={{ lineHeight: '1.6', minHeight: 'auto', padding: 0, background: 'transparent' }} 
                  dangerouslySetInnerHTML={{ __html: replyContent }} 
                />
                <div style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '12px', color: '#64748b' }}>
                  <p>Trân trọng,<br/>Đội ngũ Hỗ trợ khách hàng</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Quay lại sửa</button>
              <button className="btn btn-primary" onClick={handleRealSend} disabled={sendingReply}>
                {sendingReply ? <><span className="spinner" /> Đang gửi...</> : '🚀 Xác nhận Gửi Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
