import { getRecentNews, type NewsEnv } from './news'

interface Env extends NewsEnv {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

// Cloudflare Workers entry. Static files are served by the assets binding;
// wrangler.jsonc only routes /api/* and /healthz here.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/healthz') return new Response('ok')
    if (pathname === '/api/news') return Response.json(await getRecentNews(env))
    return env.ASSETS.fetch(request)
  },
}
