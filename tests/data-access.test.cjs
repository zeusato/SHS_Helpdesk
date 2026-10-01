const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function loadTS(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { exports: module.exports, module, Request, Response,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } },
    require: name => { if (!(name in dependencies)) throw Error(`Unmocked dependency: ${name}`); return dependencies[name] },
  }, { filename: path })
  return module.exports
}
const { readPage, ticketSearchFilter, literalContains } = loadTS('src/lib/data/pagination.ts')

test('pagination reaches every row beyond 50 without a count query', async () => {
  const rows = Array.from({ length: 123 }, (_, id) => ({ id }))
  const calls = []
  const signal = new AbortController().signal
  const load = async (from, to, passedSignal) => {
    assert.equal(passedSignal, signal)
    calls.push([from, to])
    return { data: rows.slice(from, to + 1), error: null }
  }
  const pages = []
  for (let page = 0; page < 3; page++) pages.push(await readPage(load, page, signal))
  assert.deepEqual(pages.flatMap(p => p.rows).map(r => r.id), rows.map(r => r.id))
  assert.deepEqual(pages.map(p => p.hasNext), [true, true, false])
  assert.deepEqual(calls, [[0, 50], [50, 100], [100, 150]])
})
test('exactly 50 rows and empty results have no next page', async () => {
  for (const size of [0, 50]) {
    const result = await readPage(async () => ({ data: Array(size).fill({ id: 1 }), error: null }), 0, new AbortController().signal)
    assert.equal(result.hasNext, false)
    assert.equal(result.rows.length, size)
  }
})
test('query failures are not silently treated as an empty list', async () => {
  await assert.rejects(readPage(async () => ({ data: null, error: { message: 'denied' } }), 0, new AbortController().signal), /denied/)
})
test('search quotes PostgREST values so punctuation cannot add filter clauses', () => {
  const input = 'a,b).or(id.neq.null),"\\_%'
  const filter = ticketSearchFilter(input)
  for (const field of ['title', 'requester_name', 'requester_email']) {
    assert.ok(filter.includes(`${field}.ilike.${JSON.stringify(literalContains(input))}`))
  }
  assert.equal(literalContains('x'.repeat(500)).length, 202)
})

const userId = '10000000-0000-0000-0000-000000000001'
const ticketId = '20000000-0000-0000-0000-000000000002'
function mailRoute(options = {}) {
  const state = { sent: [], logged: [], tables: [], closed: false, transport: null }
  const records = {
    users: { name: 'Tester', role: 'manager', status: options.inactive ? 'inactive' : 'active' },
    tickets: options.deniedTicket ? null : { id: ticketId },
    user_mail_settings: options.noSettings ? null : { smtp_host: 'smtp.test.invalid', smtp_port: 587, smtp_user: 'test@example.invalid', smtp_pass: 'test-only' },
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: options.unauthenticated ? null : { id: userId } }, error: null }) },
    from(table) {
      state.tables.push(table)
      const query = {
        select() { return query },
        eq(column, value) {
          if (table === 'users' || table === 'user_mail_settings') assert.equal(value, userId)
          if (table === 'tickets') assert.equal(value, ticketId)
          return query
        },
        single: async () => ({ data: records[table], error: null }),
        insert: async row => { state.logged.push(row); return { error: options.logFailure ? { message: 'failed' } : null } },
      }
      return query
    },
  }
  const { POST } = loadTS('src/app/api/send-email/route.ts', {
    '@/lib/supabase/server': { createClient: async () => client },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    nodemailer: { createTransport(config) {
      state.transport = config
      return { sendMail: async message => { if (options.smtpFailure) throw Error('network'); state.sent.push(message); return { messageId: 'fake-id' } }, close() { state.closed = true } }
    } },
  })
  const call = patch => POST(new Request('http://localhost/api/send-email', { method: 'POST', body: JSON.stringify({ to: 'recipient@example.invalid', subject: 'Test', html: '<p>Test</p>', ticket_id: ticketId, sender_id: userId, ...patch }) }))
  return { state, call }
}
for (const [name, options, patch, status] of [
  ['unauthenticated', { unauthenticated: true }, {}, 401],
  ['sender spoofing', {}, { sender_id: 'other-user' }, 403],
  ['inactive account', { inactive: true }, {}, 403],
  ['ticket denied by RLS', { deniedTicket: true }, {}, 403],
  ['missing settings', { noSettings: true }, {}, 400],
  ['invalid ticket ID', {}, { ticket_id: 'not-a-uuid' }, 400],
]) test(`email blocks ${name} before SMTP`, async () => {
  const { state, call } = mailRoute(options)
  assert.equal((await call(patch)).status, status)
  assert.equal(state.sent.length, 0)
  assert.equal(state.logged.length, 0)
  assert.equal(state.transport, null)
})
test('email uses the verified session and bounds SMTP wait time', async () => {
  const { state, call } = mailRoute()
  const response = await call({ sender_id: undefined })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).success, true)
  assert.equal(state.logged[0].sender_id, userId)
  assert.equal(state.logged[0].ticket_id, ticketId)
  assert.equal(state.sent.length, 1)
  assert.equal(state.transport.connectionTimeout, 10000)
  assert.equal(state.transport.socketTimeout, 20000)
  assert.equal(state.closed, true)
})
test('logging failure does not invite a duplicate email send', async () => {
  const { state, call } = mailRoute({ logFailure: true })
  const result = await (await call()).json()
  assert.equal(result.success, true)
  assert.ok(result.dbWarning)
  assert.equal(state.sent.length, 1)
})
test('SMTP failure closes transport and does not create sent-email history', async () => {
  const { state, call } = mailRoute({ smtpFailure: true })
  assert.equal((await call()).status, 502)
  assert.equal(state.logged.length, 0)
  assert.equal(state.closed, true)
})

function sessionProxy({ valid = false, refresh = false, rejected = false } = {}) {
  const next = require('next/server')
  let verifications = 0
  const { updateSession } = loadTS('src/lib/supabase/middleware.ts', {
    'next/server': next,
    '@supabase/ssr': { createServerClient: (_url, _key, options) => ({ auth: {
      async getClaims() {
        verifications++
        if (refresh) options.cookies.setAll([{ name: 'test-session', value: 'refreshed', options: { path: '/', httpOnly: true } }], { 'cache-control': 'private, no-store', pragma: 'no-cache' })
        return { data: valid ? { claims: { sub: userId } } : null, error: rejected ? new Error('Invalid signature') : null }
      },
      getUser() { throw Error('Unexpected remote Auth lookup in navigation proxy') },
    } }) },
  })
  return { next, updateSession, verified: () => verifications }
}
test('navigation verifies claims even for RSC prefetch requests', async () => {
  const { next, updateSession, verified } = sessionProxy({ valid: true, refresh: true })
  const request = new next.NextRequest('http://localhost/tickets', { headers: { rsc: '1', 'next-router-prefetch': '1' } })
  const response = await updateSession(request)
  assert.equal(verified(), 1)
  assert.equal(response.status, 200)
  assert.equal(response.cookies.get('test-session').value, 'refreshed')
  assert.equal(request.cookies.get('test-session').value, 'refreshed')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})
test('an invalid signature cannot authorize a page even if claims are present', async () => {
  const { next, updateSession } = sessionProxy({ valid: true, rejected: true })
  const response = await updateSession(new next.NextRequest('http://localhost/tickets'))
  assert.equal(response.status, 307)
  assert.equal(new URL(response.headers.get('location')).pathname, '/login')
})
test('unauthenticated APIs return JSON 401 and retain refreshed cookies', async () => {
  const { next, updateSession } = sessionProxy({ refresh: true })
  const response = await updateSession(new next.NextRequest('http://localhost/api/send-email'))
  assert.equal(response.status, 401)
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.equal(response.cookies.get('test-session').value, 'refreshed')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})
test('public route matching does not authorize a similarly named private path', async () => {
  const { next, updateSession } = sessionProxy()
  assert.equal((await updateSession(new next.NextRequest('http://localhost/portal'))).status, 200)
  assert.equal((await updateSession(new next.NextRequest('http://localhost/portal-private'))).status, 307)
})
