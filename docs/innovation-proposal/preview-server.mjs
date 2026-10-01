import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = fileURLToPath(new URL('.', import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' }
http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const target = path.resolve(root, '.' + (name === '/' ? '/design-demos/index.html' : name))
    if (!target.startsWith(root) || !types[path.extname(target)]) { res.writeHead(404); res.end(); return }
    const body = await readFile(target)
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store' })
    res.end(body)
  } catch { res.writeHead(404); res.end('Not found') }
}).listen(8765, '127.0.0.1', () => console.log('Proposal preview: http://127.0.0.1:8765'))
