import type { NewsItem, NewsSource } from './source'
import { DEFAULT_SOURCES, SOURCES } from './sources'

const CACHE_MS = 30 * 60_000
const FETCH_TIMEOUT_MS = 10_000
const WINDOW_MS = 24 * 60 * 60_000
const CLOCK_SKEW_MS = 5 * 60_000 // tolerate items stamped slightly ahead of our clock
const DEFAULT_LIMIT = 3

export type NewsLink = Pick<NewsItem, 'title' | 'link'>

// process.env on the Bun server, the Worker's env bindings on Cloudflare.
export interface NewsEnv {
  NEWS_SOURCES?: string
  NEWS_LIMIT?: string
  [key: string]: unknown // other env vars and bindings
}

export interface NewsConfig {
  sources: NewsSource[]
  limit: number
}

// Throws on a misconfiguration so it surfaces at startup (server) or as a 500 (Worker).
export function parseConfig(env: NewsEnv, registry = SOURCES): NewsConfig {
  // String(): wrangler.jsonc vars may hold JSON numbers/arrays, e.g. "NEWS_LIMIT": 5.
  const listed = String(env.NEWS_SOURCES ?? '').split(',').map((id) => id.trim()).filter(Boolean)
  const ids = listed.length ? listed : DEFAULT_SOURCES
  const sources = [...new Set(ids)].map((id) => {
    const source = registry.find((s) => s.id === id)
    if (!source) throw new Error(`Unknown news source "${id}" in NEWS_SOURCES; available: ${registry.map((s) => s.id).join(', ')}`)
    return source
  })

  const limit = String(env.NEWS_LIMIT ?? '').trim() || String(DEFAULT_LIMIT)
  if (!/^[1-9]\d*$/.test(limit)) throw new Error(`NEWS_LIMIT must be a positive integer, got "${env.NEWS_LIMIT}"`)
  return { sources, limit: Number(limit) }
}

// Links end up in <a href>: only plain http(s) URLs, nothing that looks malformed.
const isSafeLink = (link: string) => /^https?:\/\//i.test(link) && !/[\s<>|"]/.test(link)

export function pickRecent(items: NewsItem[], now: Date, limit: number): NewsLink[] {
  const seen = new Set<string>()
  return items
    .filter((i) => {
      const age = now.getTime() - i.published
      return i.title && isSafeLink(i.link) && age >= -CLOCK_SKEW_MS && age < WINDOW_MS
    })
    .sort((a, b) => b.published - a.published)
    // The same article can appear in several enabled sources (e.g. two channels of one site).
    .filter((i) => !seen.has(i.link) && seen.add(i.link))
    .slice(0, limit)
    .map(({ title, link }) => ({ title, link }))
}

// Each source's whole feed is cached and re-filtered per request, so items age out without refetching.
interface CacheEntry {
  items: NewsItem[]
  fetchedAt: number
}
const cache = new Map<NewsSource, CacheEntry>()

async function refresh(source: NewsSource, entry: CacheEntry, now: Date) {
  try {
    entry.items = await source.fetch(AbortSignal.timeout(FETCH_TIMEOUT_MS))
  } catch (err) {
    // Keep serving this source's last good items; retry after the next cache period.
    console.error('News source failed:', source.id, err instanceof Error ? err.message : String(err))
  } finally {
    entry.fetchedAt = now.getTime()
  }
}

export async function getRecentNews(env: NewsEnv, now = new Date(), registry = SOURCES): Promise<NewsLink[]> {
  const { sources, limit } = parseConfig(env, registry)
  const entries = sources.map((source) => {
    let entry = cache.get(source)
    if (!entry) cache.set(source, (entry = { items: [], fetchedAt: -Infinity }))
    return { source, entry }
  })
  // No shared in-flight promise: on Workers a fetch tied to another request can be
  // cancelled with it. Concurrent misses just fetch a feed more than once.
  await Promise.all(
    entries.filter(({ entry }) => now.getTime() - entry.fetchedAt >= CACHE_MS).map(({ source, entry }) => refresh(source, entry, now)),
  )
  return pickRecent(entries.flatMap(({ entry }) => entry.items), now, limit)
}
