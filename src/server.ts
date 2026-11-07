import { resolve, sep } from 'node:path'
import { getRecentNews, parseConfig } from './news'

parseConfig(process.env) // fail at startup on a bad NEWS_SOURCES / NEWS_LIMIT
const root = resolve('dist')
const port = Number(process.env.PORT ?? 8080)

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === '/healthz') return new Response('ok')
    if (pathname === '/api/news') return Response.json(await getRecentNews(process.env))

    let decoded: string
    try {
      decoded = decodeURIComponent(pathname)
    } catch {
      decoded = '\0' // malformed %-encoding
    }
    if (decoded.includes('\0')) return new Response('Bad Request', { status: 400 })
    const path = resolve(root, '.' + decoded)
    if (path !== root && !path.startsWith(root + sep)) return new Response('Not Found', { status: 404 })

    const file = Bun.file(path)
    // Directories and unknown paths fall back to the single-page app.
    if (!pathname.endsWith('/') && (await file.exists())) return new Response(file)
    return new Response(Bun.file(resolve(root, 'index.html')))
  },
})
console.log(`IT Daily listening on :${server.port}`)

// PID 1 in a container ignores SIGTERM without a handler; exit promptly on rollout.
process.on('SIGTERM', () => server.stop().then(() => process.exit(0)))
