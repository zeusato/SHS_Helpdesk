// One-time replacement of the four verified SHS demo projects.
// Official sources, checked 2026-10-01:
// https://tvsi.com.vn/News/news-detail-886.html
// https://tvsi.com.vn/News/news-detail-1399.html
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'

process.loadEnvFile('.env')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
})
const replacements = [
  { id: '577bd6d5-50ae-4de8-b425-263373658bc4', old: 'SH SMart - Mobile APP', name: 'TVSI Mobile', description: 'Ứng dụng giao dịch chứng khoán và quản lý tài sản của TVSI trên điện thoại Android và iOS.' },
  { id: 'bed6421b-2cfc-45f5-9987-da44acc3ed09', old: 'SH SMart - WEB', name: 'TVSI iTrade', description: 'Nền tảng giao dịch chứng khoán trực tuyến của TVSI trên trình duyệt web: https://itrade.tvsi.com.vn/' },
]
const obsolete = [
  { id: '0417f9d5-c70b-4448-b7dd-09c9171ff88a', name: 'SHA Mobile' },
  { id: '82f53b3f-3f15-4190-8577-04755df7d4c4', name: 'SHA WEB' },
]
function checked(result) {
  if (result.error) throw new Error(`Database operation failed: ${result.error.code}`)
  return result.data
}
const before = checked(await db.from('projects').select('*'))
const ids = [...replacements, ...obsolete].map(p => p.id)
for (const p of replacements) {
  const current = before.find(row => row.id === p.id)
  if (!current || ![p.old, p.name].includes(current.name)) throw new Error(`Unexpected project: ${p.id}`)
  if (before.some(row => row.id !== p.id && row.name === p.name)) throw new Error(`Duplicate target name: ${p.name}`)
}
for (const p of obsolete) {
  const current = before.find(row => row.id === p.id)
  if (current && current.name !== p.name) throw new Error(`Project changed: ${p.id}`)
}
// Refuse to repurpose any demo project once business data or assignments exist.
for (const table of ['tickets', 'shape_ups', 'project_po']) {
  const related = checked(await db.from(table).select('id').in('project_id', ids).limit(1))
  if (related.length) throw new Error(`Related ${table} exists; no changes applied`)
}
await mkdir('design-demos/data-backups', { recursive: true })
const backupPath = `design-demos/data-backups/projects-before-tvsi-${Date.now()}.json`
await writeFile(backupPath, JSON.stringify(before.filter(p => ids.includes(p.id)), null, 2), { flag: 'wx' })
for (const { id, old, ...values } of replacements) {
  const rows = checked(await db.from('projects').update(values).eq('id', id).in('name', [old, values.name]).select('id'))
  if (rows.length !== 1) throw new Error(`Update did not affect exactly one project: ${id}`)
}
for (const { id, name } of obsolete) {
  checked(await db.from('projects').delete().eq('id', id).eq('name', name))
}
const after = checked(await db.from('projects').select('id,name,description,status').order('name'))
if (after.some(p => obsolete.some(old => old.id === p.id))) throw new Error('An obsolete project remains')
for (const p of replacements) {
  if (!after.some(row => row.id === p.id && row.name === p.name && row.description === p.description)) throw new Error('Verification failed')
}
console.log(JSON.stringify({ backupPath, projects: after }, null, 2))
