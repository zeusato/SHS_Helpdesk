// Read-only smoke audit. No data, users, sessions or emails are created.
import { createClient } from '@supabase/supabase-js'
process.loadEnvFile('.env')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) } }
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options)
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
const report = { checkedAt: new Date().toISOString(), mode: 'read-only, empty-dataset smoke check', counts: {}, queries: {}, anonymous: {} }
const queries = {
  tickets: () => admin.from('tickets').select('id,title,project_id,status,priority,requester_name,requester_email,created_at,project:projects(id,name),assignee:users!assignee_id(id,name)').order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, 50),
  shape_ups: () => admin.from('shape_ups').select('id,title,status,project_id,created_at,updated_at,project:projects(id,name),author:users!created_by(id,name)').order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, 50),
  emails: () => admin.from('emails').select('id,ticket_id,sender_id,subject,sent_date,recipient_email,ticket:tickets(title),sender:users(name)').order('sent_date', { ascending: false }).order('id', { ascending: false }).range(0, 50),
}
for (const table of ['users', 'projects', 'tickets', 'shape_ups', 'emails', 'ticket_shapeup', 'project_po', 'notifications', 'user_mail_settings']) {
  const result = await admin.from(table).select('*', { head: true, count: 'exact' })
  if (result.error) throw new Error(`${table}: ${result.error.code}`)
  report.counts[table] = result.count
}
for (const [name, query] of Object.entries(queries)) {
  const samples = []
  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    const result = await query()
    if (result.error) throw new Error(`${name}: ${result.error.code}`)
    samples.push(Math.round(performance.now() - start))
  }
  report.queries[name] = { samplesMs: samples, medianMs: [...samples].sort((a, b) => a - b)[2] }
}
for (const table of ['users', 'tickets', 'shape_ups', 'emails', 'user_mail_settings']) {
  const result = await anon.from(table).select(table === 'user_mail_settings' ? 'user_id' : 'id').limit(1)
  report.anonymous[table] = { status: result.status, visibleRows: result.data?.length ?? 0, errorCode: result.error?.code ?? null }
  if (result.data?.length) throw new Error(`Anonymous access unexpectedly exposes ${table}`)
}
const rpc = await anon.rpc('get_dashboard_stats')
report.anonymous.dashboard = { status: rpc.status, callable: !rpc.error }
const protectedProfile = await admin.from('users').select('role,status').eq('email', 'manhquyet88@gmail.com').single()
if (protectedProfile.error) throw new Error('Protected profile unavailable')
report.protectedAccount = protectedProfile.data
console.log(JSON.stringify(report, null, 2))
