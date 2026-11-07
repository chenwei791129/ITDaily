import { rssItems, tag } from '../rss'
import type { NewsItem, NewsSource } from '../source'

const LINK_PREFIX = 'https://www.ithome.com.tw/'

// iThome uses a non-RFC 'YYYY-MM-DD HH:MM[:SS]' (sometimes with two spaces) in Taiwan time.
const parsePubDate = (s: string) => Date.parse(`${s.trim().replace(/\s+/, 'T')}+08:00`)

// Only the fields we need from iThome's RSS 2.0 feed; non-iThome links are dropped.
export function parseFeed(xml: string): NewsItem[] {
  return rssItems(xml)
    .map((item) => ({
      title: tag(item, 'title'),
      link: tag(item, 'link'),
      published: parsePubDate(tag(item, 'pubDate')),
    }))
    .filter((i) => i.title && i.link.startsWith(LINK_PREFIX))
}

export const ithomeSecurity: NewsSource = {
  id: 'ithome-security',
  async fetch(signal) {
    const res = await fetch('https://www.ithome.com.tw/rss/security', { signal })
    if (!res.ok) throw new Error(`iThome RSS responded ${res.status}`)
    const items = parseFeed(await res.text())
    if (!items.length) throw new Error('iThome RSS has no items')
    return items
  },
}
