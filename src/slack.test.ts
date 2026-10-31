import { expect, spyOn, test } from 'bun:test'
import { getAlmanac } from './almanac'
import { buildSlackMessage, sendToSlack } from './slack'

test('slack card carries the day almanac', () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  const msg = buildSlackMessage(a)
  const json = JSON.stringify(msg)
  expect(msg.text).toStartWith('IT人的今天：2/10 宜 ')
  expect(json).toContain('農曆甲午年 臘月廿二')
  expect(json).toContain(a.fortune)
  for (const item of [...a.yi, ...a.ji]) expect(json).toContain(item)
})

test('posts the card and fails on non-2xx responses', async () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('invalid_payload', { status: 400 }))
  try {
    await expect(sendToSlack('https://hooks.slack.com/services/x', a)).rejects.toThrow('responded 400')
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://hooks.slack.com/services/x')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(buildSlackMessage(a))
  } finally {
    fetchSpy.mockRestore()
  }
})

test('refuses non-Slack webhook URLs', async () => {
  await expect(sendToSlack('https://example.com/hook', getAlmanac(new Date()))).rejects.toThrow('hooks.slack.com')
})
