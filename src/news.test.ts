import { expect, spyOn, test } from 'bun:test'
import { getRecentNews, parseFeed, pickRecent } from './news'

const tw = (s: string) => new Date(`${s}+08:00`)

// Trimmed from https://www.ithome.com.tw/rss/security (pubDate is Taiwan local time).
const item = (title: string, link: string, pubDate: string) => `
  <item>
    <title>${title}</title>
    <link>${link}</link>
    <description><![CDATA[<p>summary</p>]]></description>
    <pubDate>${pubDate}</pubDate>
  </item>`
const FEED = `<?xml version="1.0" encoding="utf-8" ?><rss version="2.0"><channel><title>iThome資安頻道</title>
${item('早上的新聞', 'https://www.ithome.com.tw/news/1', '2026-10-30 09:10')}
${item('A&amp;B &lt;修補&gt; &#20462;', 'https://www.ithome.com.tw/news/2', '2026-10-30 18:44')}
${item('中午的新聞', 'https://www.ithome.com.tw/news/3', '2026-10-30  12:00:05')}
${item('下午的新聞', 'https://www.ithome.com.tw/news/4', '2026-10-30 15:21')}
${item('昨天的新聞', 'https://www.ithome.com.tw/news/5', '2026-10-29 23:59')}
${item('外部連結', 'javascript:alert(1)', '2026-10-30 20:00')}
${item('怪連結', 'https://www.ithome.com.tw/news/6|x', '2026-10-30 20:00')}
${item('壞實體 &#99999999;', 'https://www.ithome.com.tw/news/7', '2026-10-29 08:00')}
${item('壞日期', 'https://www.ithome.com.tw/news/8', 'soon')}
</channel></rss>`

test('parses items, decodes entities and drops non-iThome links', () => {
  const items = parseFeed(FEED)
  expect(items.map((i) => i.link)).toEqual([1, 2, 3, 4, 5, 7, 8].map((n) => `https://www.ithome.com.tw/news/${n}`))
  expect(items.at(-2)?.title).toBe('壞實體 &#99999999;')
  expect(items[1]).toEqual({ title: 'A&B <修補> 修', link: 'https://www.ithome.com.tw/news/2', published: tw('2026-10-30T18:44').getTime() })
  // Two spaces and seconds, as seen in the live feed.
  expect(items[2].published).toBe(tw('2026-10-30T12:00:05').getTime())
  expect(items.at(-1)?.published).toBeNaN()
})

test('picks the last 24 hours, newest first, at most 3', () => {
  const titles = (now: string) => pickRecent(parseFeed(FEED), tw(now)).map((n) => n.title)
  expect(titles('2026-10-30T21:00')).toEqual(['A&B <修補> 修', '下午的新聞', '中午的新聞'])
  // Yesterday 23:59 is inside the window; items stamped after "now" are not.
  expect(titles('2026-10-30T12:30')).toEqual(['中午的新聞', '早上的新聞', '昨天的新聞'])
  // 18:44 is 4 minutes ahead: within the clock-skew tolerance.
  expect(titles('2026-10-30T18:40')).toEqual(['A&B <修補> 修', '下午的新聞', '中午的新聞'])
  expect(titles('2026-10-31T08:00')).toEqual(['A&B <修補> 修', '下午的新聞', '中午的新聞'])
  expect(titles('2026-10-31T18:40')).toEqual(['A&B <修補> 修'])
  expect(titles('2026-10-31T18:44')).toEqual([])
})

test('caches the feed for 30 minutes and keeps the last good copy on failure', async () => {
  const t0 = tw('2026-10-31T08:00')
  const later = (min: number) => new Date(t0.getTime() + min * 60_000)
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(FEED))
  try {
    expect(await getRecentNews(t0)).toHaveLength(3)
    expect(await getRecentNews(later(10))).toHaveLength(3)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    fetchSpy.mockResolvedValue(new Response('oops', { status: 503 }))
    expect(await getRecentNews(later(31))).toHaveLength(3)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    // 18:40, feed still failing: the stale copy is re-filtered, so older items have aged out.
    expect(await getRecentNews(later(640))).toHaveLength(1)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  } finally {
    fetchSpy.mockRestore()
  }
})
