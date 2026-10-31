import { expect, spyOn, test } from 'bun:test'
import { getTodayNews, parseFeed, pickToday } from './news'

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
</channel></rss>`

test('parses items, decodes entities and drops non-iThome links', () => {
  const items = parseFeed(FEED)
  expect(items.map((i) => i.link)).toEqual([1, 2, 3, 4, 5, 7].map((n) => `https://www.ithome.com.tw/news/${n}`))
  expect(items.at(-1)?.title).toBe('壞實體 &#99999999;')
  expect(items[1]).toEqual({ title: 'A&B <修補> 修', link: 'https://www.ithome.com.tw/news/2', published: '2026-10-30 18:44' })
  expect(items[2].published).toBe('2026-10-30 12:00:05')
})

test('picks only today, newest first, at most 3', () => {
  const today = pickToday(parseFeed(FEED), new Date(2026, 9, 30, 21))
  expect(today.map((n) => n.title)).toEqual(['A&B <修補> 修', '下午的新聞', '中午的新聞'])
  expect(pickToday(parseFeed(FEED), new Date(2026, 9, 31, 8))).toEqual([])
})

test('caches the feed for 30 minutes and keeps the last good copy on failure', async () => {
  const t0 = new Date(2026, 9, 30, 23)
  const later = (min: number) => new Date(t0.getTime() + min * 60_000)
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(FEED))
  try {
    expect(await getTodayNews(t0)).toHaveLength(3)
    expect(await getTodayNews(later(10))).toHaveLength(3)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    fetchSpy.mockResolvedValue(new Response('oops', { status: 503 }))
    expect(await getTodayNews(later(31))).toHaveLength(3)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    // Next day (00:05), feed still failing: the stale copy is re-filtered, so yesterday's news is gone.
    expect(await getTodayNews(later(65))).toEqual([])
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  } finally {
    fetchSpy.mockRestore()
  }
})
