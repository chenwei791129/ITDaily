import { expect, spyOn, test } from 'bun:test'
import { getAlmanac } from './almanac'
import { buildSlackMessage, sendToSlack } from './slack'

const news = [{ title: 'A&B <修補> 漏洞', link: 'https://www.ithome.com.tw/news/1' }]

test('slack card carries the day almanac', () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  const msg = buildSlackMessage(a, news)
  const json = JSON.stringify(msg)
  expect(msg.text).toStartWith('IT人的今天：2/10 宜 ')
  expect(json).toContain('農曆甲午年 臘月廿二')
  expect(json).toContain(a.fortune)
  for (const item of [...a.yi, ...a.ji]) expect(json).toContain(item)
})

test('news section links escaped titles, or says there is none', () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  const newsText = (n: typeof news) => JSON.stringify(buildSlackMessage(a, n).blocks.at(-1))
  expect(newsText(news)).toContain('<https://www.ithome.com.tw/news/1|A&amp;B &lt;修補&gt; 漏洞>')
  expect(newsText([])).toContain('最近 24 小時沒有新消息')
})

test('posts the card and fails on non-2xx responses', async () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid_payload', { status: 400 }))
  try {
    await expect(sendToSlack('https://hooks.slack.com/services/x', a, news)).rejects.toThrow('responded 400')
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://hooks.slack.com/services/x')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(buildSlackMessage(a, news))
  } finally {
    fetchSpy.mockRestore()
  }
})

test('refuses non-Slack webhook URLs', async () => {
  await expect(sendToSlack('https://example.com/hook', getAlmanac(new Date()), [])).rejects.toThrow('hooks.slack.com')
})
