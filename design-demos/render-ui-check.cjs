// Isolated visual QA only. Renders the actual components without authentication,
// effects, network requests or database writes. Never used by the application.
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
const css = new Map()
let route = '/dashboard'
const originalLoad = Module._load
const noop = () => {}
const navigation = { usePathname: () => route, useRouter: () => ({ push: noop, refresh: noop, back: noop }), useParams: () => ({ id: 'new' }), useSearchParams: () => new URLSearchParams() }
const Image = ({ src, fill, unoptimized, priority, ...props }) => React.createElement('img', { ...props, src: typeof src === 'object' ? src.src : src })
Module._load = function (request, parent, main) {
  if (request === 'next/navigation') return navigation
  if (request === 'next/image') return { __esModule: true, default: Image }
  if (request === 'next/link') return { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) }
  if (request === '@/lib/supabase/client') return { createClient: () => ({}) }
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2))
  return originalLoad.call(this, request, parent, main)
}
for (const extension of ['.tsx', '.ts']) Module._extensions[extension] = (module, filename) => {
  let source = fs.readFileSync(filename, 'utf8')
  // Exercise the no-data state instead of an indefinite initial loading spinner.
  source = source.replace(/const \[loading, setLoading\] = useState\(true\)/g, 'const [loading, setLoading] = useState(false)')
  module._compile(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename)
}
Module._extensions['.css'] = (module, filename) => {
  const prefix = `qa${css.size}_`
  const globals = []
  const content = fs.readFileSync(filename, 'utf8')
    .replace(/:global\(([^)]+)\)/g, (_, selector) => { globals.push(selector); return `GLOBAL${globals.length - 1}TOKEN` })
    .replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => `.${prefix}${name}`)
    .replace(/GLOBAL(\d+)TOKEN/g, (_, index) => globals[index])
  css.set(filename, content)
  module.exports = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : prefix + name })
}
Module._extensions['.png'] = (module, filename) => { module.exports = { src: 'data:image/png;base64,' + fs.readFileSync(filename).toString('base64'), width: 184, height: 49 } }
const Header = require('../src/components/layout/Header.tsx').default
const Navigation = require('../src/components/layout/Sidebar.tsx').default
const layoutStyles = require('../src/app/(dashboard)/layout.module.css')
const adminLayout = require('../src/app/(dashboard)/admin/layout.tsx').default
const settingsLayout = require('../src/app/(dashboard)/settings/layout.tsx').default
const checks = [
  ['/dashboard', 'dashboard/page.tsx'], ['/tickets', 'tickets/page.tsx'], ['/shapeups', 'shapeups/page.tsx'],
  ['/emails', 'emails/page.tsx'], ['/admin/projects', 'admin/projects/page.tsx'], ['/admin/users', 'admin/users/page.tsx'],
  ['/admin/assignments', 'admin/assignments/page.tsx'], ['/settings/security', 'settings/security/page.tsx'],
  ['/settings/ai', 'settings/ai/page.tsx'], ['/settings/mail', 'settings/mail/page.tsx'],
]
const font = weight => fs.readFileSync(path.join(root, `src/app/fonts/Nunito-${weight}.ttf`)).toString('base64')
const base = `@font-face{font-family:Nunito;src:url(data:font/ttf;base64,${font('Regular')})} @font-face{font-family:Nunito;src:url(data:font/ttf;base64,${font('Bold')});font-weight:700}` + fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8') + ':root{--font-nunito:Nunito}'
const out = path.join(__dirname, 'ui-check')
fs.mkdirSync(out, { recursive: true })
for (const [pathname, file] of checks) {
  route = pathname
  const Page = require(path.join(root, 'src/app/(dashboard)', file)).default
  let page = React.createElement(Page)
  if (pathname.startsWith('/admin/')) page = React.createElement(adminLayout, null, page)
  if (pathname.startsWith('/settings/')) page = React.createElement(settingsLayout, null, page)
  const user = { id: 'visual-check-only', name: 'Kiểm tra giao diện', role: 'manager' }
  const markup = renderToStaticMarkup(React.createElement('div', { className: layoutStyles.dashboardLayout }, React.createElement(Header, { user }), React.createElement(Navigation, { user }), React.createElement('main', { className: layoutStyles.content }, page)))
  const name = pathname.slice(1).replaceAll('/', '-')
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TVSI — Kiểm tra bố cục ${pathname}</title><style>${base}\n${[...css.values()].join('\n')}\n/* Freeze motion for reproducible visual checks. */ *,*::before,*::after{animation:none!important;transition:none!important}</style><body><div style="font-size:12px;padding:6px 20px;background:#fff4d9;color:#664b11">Kiểm tra bố cục tĩnh · Dữ liệu rỗng · Không kết nối hệ thống</div>${markup}</body></html>`
  fs.writeFileSync(path.join(out, `${name}.html`), html)
  if (pathname === '/dashboard') fs.writeFileSync(path.join(out, `${name}-dark.html`), html.replace('<body>', '<body class="dark-theme">'))
  console.log(`Rendered ${pathname}`)
}
