import { rssItems, tag } from '../../rss'
import type { NewsItem, NewsSource } from '../../source'

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

const ithome = (id: string, path: string): NewsSource => ({
  id,
  async fetch(signal) {
    const res = await fetch(`https://www.ithome.com.tw/${path}`, { signal })
    if (!res.ok) throw new Error(`iThome RSS ${path} responded ${res.status}`)
    const items = parseFeed(await res.text())
    if (!items.length) throw new Error(`iThome RSS ${path} has no items`)
    return items
  },
})

// Feeds from https://www.ithome.com.tw/rss-list plus unlisted channel feeds. Left out: /rss and
// /rss/voice, whose pubDate is broken (12-hour clock, month in the minute field). Unknown
// /rss/<x> paths silently return that broken site-wide feed, so check new paths by hand.
export const ithomeSources = [
  ithome('ithome-security', 'rss/security'),
  ithome('ithome-news', 'rss/news'),
  ithome('ithome-ai', 'rss/ai'),
  ithome('ithome-cloud', 'rss/cloud'),
  ithome('ithome-devops', 'rss/devops'),
  ithome('ithome-tech', 'rss/tech'),
  ithome('ithome-cio', 'rss/cio'),
  ithome('ithome-buying', 'rss/buying'),
]
