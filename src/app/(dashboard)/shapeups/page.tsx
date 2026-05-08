'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ShapeUp, Project } from '@/lib/types'
import * as XLSX from 'xlsx'
import styles from './page.module.css'
import editorStyles from '@/components/ui/RichTextEditor.module.css'

export default function ShapeUpsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [shapeUps, setShapeUps] = useState<ShapeUp[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Import Modal
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState<Partial<ShapeUp>[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View Modal
  const [viewShapeUp, setViewShapeUp] = useState<ShapeUp | null>(null)

  const fetchShapeUps = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('shape_ups')
      .select('*, project:projects(id, name), author:users!created_by(id, name)')
      .order('created_at', { ascending: false })
      .range(0, 49)

    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterProject) query = query.eq('project_id', filterProject)
    if (searchQuery) query = query.ilike('title', `%${searchQuery}%`)

    const { data } = await query
    setShapeUps((data as ShapeUp[]) || [])
    setLoading(false)
  }, [filterStatus, filterProject, searchQuery])

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
    setProjects((data || []) as Project[])
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { fetchShapeUps() }, [fetchShapeUps])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    return `${Math.floor(hours / 24)} ngày trước`
  }

  // --- EXCEL IMPORT LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws) as any[]

      // Map excel rows to ShapeUp object
      const parsedData: Partial<ShapeUp>[] = data.map(row => {
        const projectName = row.project_name || row['Tên dự án'] || ''
        const projectMatch = projects.find(p => p.name.toLowerCase() === projectName.trim().toLowerCase())
        
        return {
          title: row.title || row['Tiêu đề'] || '',
          issue_detail: row.issue_detail || row['Mô tả vấn đề'] || '',
          solution: row.solution || row['Giải pháp'] || '',
          document_link: row.document_link || row['Link tài liệu'] || null,
          jira_link: row.jira_link || row['Link Jira'] || null,
          note: row.note || row['Ghi chú'] || null,
          project_id: projectMatch ? projectMatch.id : (row.project_id || row['ID Dự án'] || null),
          status: row.status || row['Trạng thái'] || 'draft',
        }
      }).filter(row => row.title) // Only keep rows with title

      setImportData(parsedData)
    }
    reader.readAsBinaryString(file)
  }

  const confirmImport = async () => {
    if (importData.length === 0) return
    setImporting(true)
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const rowsToInsert = importData.map(item => ({
      ...item,
      created_by: authUser.id,
    }))

    const { error } = await supabase.from('shape_ups').insert(rowsToInsert)
    setImporting(false)

    if (!error) {
      setShowImport(false)
      setImportData([])
      fetchShapeUps()
    } else {
      alert('Có lỗi xảy ra khi import: ' + error.message)
    }
  }

  const cancelImport = () => {
    setShowImport(false)
    setImportData([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        'Tiêu đề': 'Hướng dẫn xử lý lỗi 404',
        'Mô tả vấn đề': 'Khách hàng gặp lỗi 404 khi truy cập...',
        'Giải pháp': 'Kiểm tra lại cấu hình server...',
        'Link tài liệu': 'https://wiki...',
        'Link Jira': 'https://jira...',
        'Ghi chú': 'Cần kiểm tra kỹ trước khi pub',
        'Tên dự án': projects.length > 0 ? projects[0].name : 'Tên dự án mẫu',
        'Trạng thái': 'draft',
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    
    // Auto size columns
    const wscols = [
      { wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 25 }, 
      { wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 15 }
    ]
    ws['!cols'] = wscols
    
    XLSX.utils.book_append_sheet(wb, ws, 'ShapeUp_Template')
    XLSX.writeFile(wb, 'ShapeUp_Import_Template.xlsx')
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Thư viện Shape Up</h1>
          <p className="text-secondary mt-sm">Quản lý tài liệu tri thức, giải pháp và quy trình</p>
        </div>
        <div className="flex gap-sm items-center">
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            📥 Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => router.push('/shapeups/new')}>
            ＋ Tạo Shape Up
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input className="input" placeholder="🔍 Tìm Shape Up..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: '280px' }} />
        <select className="select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Tất cả dự án</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Dự án</th>
              <th>Trạng thái</th>
              <th>Người tạo</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="flex justify-center" style={{ padding: '40px' }}><div className="spinner" /></div></td></tr>
            ) : shapeUps.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <div className="empty-state-title">Chưa có Shape Up nào</div>
                </div>
              </td></tr>
            ) : shapeUps.map(s => (
              <tr key={s.id} onClick={() => setViewShapeUp(s)} style={{ cursor: 'pointer' }}>
                <td>
                  <div className={styles.title}>{s.title}</div>
                  <div className="text-muted text-sm">{s.id.slice(0, 8)}</div>
                </td>
                <td><span className={styles.projectTag}>{(s.project as unknown as Project)?.name || '—'}</span></td>
                <td>
                  <span className={`badge ${s.status === 'published' ? 'badge-resolved' : 'badge-pending'}`}>
                    {s.status === 'published' ? 'Xuất bản' : 'Bản nháp'}
                  </span>
                </td>
                <td className="text-secondary">{((s as any).author as { name: string })?.name || '—'}</td>
                <td className="text-muted text-sm">{timeAgo(s.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IMPORT EXCEL MODAL */}
      {showImport && (
        <div className="modal-overlay" onClick={cancelImport}>
          <div className="modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📥 Import Shape Up từ Excel</h3>
              <button className="btn btn-ghost btn-icon" onClick={cancelImport}>✕</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {!importData.length ? (
                <div className={styles.uploadArea}>
                  <p className="text-secondary" style={{ marginBottom: '16px' }}>
                    Chọn file Excel (.xlsx, .xls) có chứa các cột: <strong>Tiêu đề, Mô tả vấn đề, Giải pháp, Link tài liệu, Link Jira, Ghi chú, Tên dự án, Trạng thái</strong> (draft/published).
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                      📄 Tải file mẫu (Template)
                    </button>
                  </div>
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} className="input" />
                </div>
              ) : (
                <div className={styles.previewArea}>
                  <p className="text-success" style={{ fontWeight: 500, marginBottom: '12px' }}>
                    ✅ Tìm thấy {importData.length} bản ghi hợp lệ. Vui lòng kiểm tra lại trước khi xác nhận.
                  </p>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tiêu đề</th>
                          <th>Mô tả vấn đề</th>
                          <th>Dự án</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.title}</td>
                            <td><div className="text-muted text-sm" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.issue_detail}</div></td>
                            <td className="text-sm">
                              {row.project_id 
                                ? projects.find(p => p.id === row.project_id)?.name || 'Trống'
                                : 'Trống'
                              }
                            </td>
                            <td><span className="badge">{row.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelImport}>Hủy</button>
              <button className="btn btn-primary" onClick={confirmImport} disabled={!importData.length || importing}>
                {importing ? <><span className="spinner" /> Đang ghi...</> : '📥 Xác nhận Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewShapeUp && (
        <div className="modal-overlay" onClick={() => setViewShapeUp(null)}>
          <div className="modal" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-sm">
                <span className={`badge ${viewShapeUp.status === 'published' ? 'badge-resolved' : 'badge-pending'}`}>
                  {viewShapeUp.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                </span>
                <h3 style={{ margin: 0 }}>{viewShapeUp.title}</h3>
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-primary btn-sm" onClick={() => router.push(`/shapeups/${viewShapeUp.id}`)}>✏️ Chỉnh sửa</button>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewShapeUp(null)}>✕</button>
              </div>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              <div className="flex flex-col gap-lg">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', background: 'var(--color-bg-tertiary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div className="text-muted text-sm">Dự án</div>
                    <div className="font-medium">{(viewShapeUp.project as unknown as Project)?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted text-sm">Người tạo</div>
                    <div className="font-medium">{((viewShapeUp as any).author as { name: string })?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted text-sm">Link tài liệu</div>
                    <div>{viewShapeUp.document_link ? <a href={viewShapeUp.document_link} target="_blank" rel="noopener noreferrer" className="text-brand">Truy cập</a> : '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted text-sm">Link Jira</div>
                    <div>{viewShapeUp.jira_link ? <a href={viewShapeUp.jira_link} target="_blank" rel="noopener noreferrer" className="text-brand">Truy cập</a> : '—'}</div>
                  </div>
                </div>

                {viewShapeUp.note && (
                  <div>
                    <h4 style={{ marginBottom: '8px' }}>📌 Ghi chú</h4>
                    <div style={{ padding: '12px', background: 'rgba(var(--color-brand-rgb), 0.1)', borderLeft: '3px solid var(--color-brand)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                      {viewShapeUp.note}
                    </div>
                  </div>
                )}

                <div>
                  <h4 style={{ marginBottom: '8px' }}>Mô tả vấn đề</h4>
                  {viewShapeUp.issue_detail ? (
                    <div className={editorStyles.editorContent} style={{ minHeight: 'auto', padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }} dangerouslySetInnerHTML={{ __html: viewShapeUp.issue_detail }} />
                  ) : (
                    <div className="text-muted text-sm">Không có mô tả</div>
                  )}
                </div>

                <div>
                  <h4 style={{ marginBottom: '8px' }}>Cách giải quyết (Solution)</h4>
                  {viewShapeUp.solution ? (
                    <div className={editorStyles.editorContent} style={{ minHeight: 'auto', padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }} dangerouslySetInnerHTML={{ __html: viewShapeUp.solution }} />
                  ) : (
                    <div className="text-muted text-sm">Chưa có giải pháp</div>
                  )}
                </div>

                {viewShapeUp.images && (viewShapeUp.images as string[]).length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '8px' }}>🖼️ Ảnh đính kèm</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                      {(viewShapeUp.images as string[]).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          <img src={url} alt={`Đính kèm ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
