const FEED_URL = 'https://www.ithome.com.tw/rss/security'
const LINK_PREFIX = 'https://www.ithome.com.tw/'
const CACHE_MS = 30 * 60_000
const LIMIT = 3

export interface NewsItem {
  title: string
  link: string
}

interface FeedItem extends NewsItem {
  published: string // 'YYYY-MM-DD HH:MM[:SS]', Taiwan local time
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

// Only the fields we need from iThome's RSS 2.0 feed; non-iThome or odd-looking links are dropped
// (whitespace, <, >, | would break Slack's <url|text> syntax).
export function parseFeed(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({
      title: tag(item, 'title'),
      link: tag(item, 'link'),
      published: tag(item, 'pubDate').replace(/\s+/g, ' '),
    }))
    .filter((i) => i.title && i.link.startsWith(LINK_PREFIX) && !/[\s<>|"]/.test(i.link))
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function pickToday(items: FeedItem[], now: Date): NewsItem[] {
  const today = localDate(now)
  return items
    .filter((i) => i.published.startsWith(today))
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, LIMIT)
    .map(({ title, link }) => ({ title, link }))
}

// Whole feed cached in memory, so crossing midnight re-filters without refetching.
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

export async function getTodayNews(now = new Date()): Promise<NewsItem[]> {
  if (now.getTime() - fetchedAt >= CACHE_MS) {
    await (inflight ??= refresh(now).finally(() => (inflight = undefined)))
  }
  return pickToday(cached, now)
}
