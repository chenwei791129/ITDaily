import { resolve, sep } from 'node:path'
import { getAlmanac } from './almanac'
import { getRecentNews } from './news'
import { sendToSlack } from './slack'

const root = resolve('dist')
const port = Number(process.env.PORT ?? 8080)

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === '/healthz') return new Response('ok')
    if (pathname === '/api/news') return Response.json(await getRecentNews())

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

// Dev-stage behaviour: post today's card once per process start; never take the site down.
const webhook = process.env.SLACK_WEBHOOK_URL
if (webhook) {
  const now = new Date()
  getRecentNews(now)
    .then((news) => sendToSlack(webhook, getAlmanac(now), news))
    .then(() => console.log('Slack card sent'))
    // Log the message only: fetch errors may carry the request URL, which is the webhook secret.
    .catch((err) => console.error('Slack card failed:', err instanceof Error ? err.message : String(err)))
} else {
  console.log('SLACK_WEBHOOK_URL not set; skip Slack card')
}
