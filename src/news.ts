const FEED_URL = 'https://www.ithome.com.tw/rss/security'
const LINK_PREFIX = 'https://www.ithome.com.tw/'
const CACHE_MS = 30 * 60_000
const WINDOW_MS = 24 * 60 * 60_000
const CLOCK_SKEW_MS = 5 * 60_000 // tolerate items stamped slightly ahead of our clock
const LIMIT = 3

export interface NewsItem {
  title: string
  link: string
}

interface FeedItem extends NewsItem {
  published: number // epoch ms; NaN when pubDate is unparseable
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] !== '#') return ENTITIES[e] ?? m
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
      return code <= 0x10ffff ? String.fromCodePoint(code) : m
    })
    .trim()
}

const tag = (xml: string, name: string) => decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '')

// iThome uses a non-RFC 'YYYY-MM-DD HH:MM[:SS]' (sometimes with two spaces) in Taiwan time.
const parsePubDate = (s: string) => Date.parse(`${s.trim().replace(/\s+/, 'T')}+08:00`)

// Only the fields we need from iThome's RSS 2.0 feed; non-iThome or odd-looking links are dropped
// (whitespace, <, >, | would break Slack's <url|text> syntax).
export function parseFeed(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({
      title: tag(item, 'title'),
      link: tag(item, 'link'),
      published: parsePubDate(tag(item, 'pubDate')),
    }))
    .filter((i) => i.title && i.link.startsWith(LINK_PREFIX) && !/[\s<>|"]/.test(i.link))
}

export function pickRecent(items: FeedItem[], now: Date): NewsItem[] {
  return items
    .filter((i) => {
      const age = now.getTime() - i.published
      return age >= -CLOCK_SKEW_MS && age < WINDOW_MS
    })
    .sort((a, b) => b.published - a.published)
    .slice(0, LIMIT)
    .map(({ title, link }) => ({ title, link }))
}

// Whole feed cached in memory and re-filtered per request, so items age out without refetching.
let cached: FeedItem[] = []
let fetchedAt = -Infinity
let inflight: Promise<void> | undefined

async function refresh(now: Date) {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`iThome RSS responded ${res.status}`)
    const items = parseFeed(await res.text())
    if (!items.length) throw new Error('iThome RSS has no items')
    cached = items
  } catch (err) {
    // Keep serving the last good feed; retry after the next cache period.
    console.error('News fetch failed:', err instanceof Error ? err.message : String(err))
  } finally {
    fetchedAt = now.getTime()
  }
}

export async function getRecentNews(now = new Date()): Promise<NewsItem[]> {
  if (now.getTime() - fetchedAt >= CACHE_MS) {
    await (inflight ??= refresh(now).finally(() => (inflight = undefined)))
  }
  return pickRecent(cached, now)
}
