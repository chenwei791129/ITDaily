import { expect, spyOn, test } from 'bun:test'
import { ithomeSources, parseFeed } from '.'

const ithomeSecurity = ithomeSources[0]
const CHANNELS = ['security', 'news', 'ai', 'cloud', 'devops', 'tech', 'cio', 'buying']

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
${item('外部連結', 'javascript:alert(1)', '2026-10-30 20:00')}
${item('別家網站', 'https://example.com/news/9', '2026-10-30 20:00')}
${item('', 'https://www.ithome.com.tw/news/6', '2026-10-30 20:00')}
${item('壞實體 &#99999999;', 'https://www.ithome.com.tw/news/7', '2026-10-29 08:00')}
${item('壞日期', 'https://www.ithome.com.tw/news/8', 'soon')}
</channel></rss>`

test('parses items, decodes entities and drops untitled or non-iThome links', () => {
  const items = parseFeed(FEED)
  expect(items.map((i) => i.link)).toEqual([1, 2, 3, 7, 8].map((n) => `https://www.ithome.com.tw/news/${n}`))
  expect(items.at(-2)?.title).toBe('壞實體 &#99999999;')
  expect(items[1]).toEqual({ title: 'A&B <修補> 修', link: 'https://www.ithome.com.tw/news/2', published: tw('2026-10-30T18:44').getTime() })
  // Two spaces and seconds, as seen in the live feed.
  expect(items[2].published).toBe(tw('2026-10-30T12:00:05').getTime())
  expect(items.at(-1)?.published).toBeNaN()
})

test('fetch throws on HTTP errors and empty feeds', async () => {
  const signal = new AbortController().signal
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(FEED))
  try {
    expect(await ithomeSecurity.fetch(signal)).toHaveLength(5)
    expect(fetchSpy.mock.calls[0][1]?.signal).toBe(signal)

    // Each id fetches its own channel feed.
    for (const s of ithomeSources) {
      fetchSpy.mockResolvedValue(new Response(FEED)) // a body can only be read once
      await s.fetch(signal)
    }
    expect(fetchSpy.mock.calls.slice(1).map(([url]) => [url])).toEqual(
      CHANNELS.map((ch) => [`https://www.ithome.com.tw/rss/${ch}`]),
    )
    expect(ithomeSources.map((s) => s.id)).toEqual(CHANNELS.map((ch) => `ithome-${ch}`))

    fetchSpy.mockResolvedValue(new Response('oops', { status: 503 }))
    await expect(ithomeSecurity.fetch(signal)).rejects.toThrow('rss/security responded 503')

    fetchSpy.mockResolvedValue(new Response('<rss><channel></channel></rss>'))
    await expect(ithomeSecurity.fetch(signal)).rejects.toThrow('no items')
  } finally {
    fetchSpy.mockRestore()
  }
})
