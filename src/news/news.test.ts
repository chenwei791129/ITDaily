import { expect, spyOn, test } from 'bun:test'
import { getRecentNews, type NewsEnv, parseConfig, pickRecent } from '.'
import type { NewsItem, NewsSource } from './source'
import { SOURCES } from './sources'

const tw = (s: string) => new Date(`${s}+08:00`)
const news = (title: string, at: string, link = `https://example.com/${encodeURIComponent(title)}`): NewsItem => ({
  title,
  link,
  published: tw(at).getTime(),
})

// A fresh source object each time, so the module-level cache never leaks between tests.
function fakeSource(id: string, items: NewsItem[] | Error) {
  const source = {
    id,
    calls: 0,
    result: items,
    async fetch() {
      source.calls++
      if (source.result instanceof Error) throw source.result
      return source.result
    },
  }
  return source satisfies NewsSource
}

test('parseConfig: defaults, list parsing and validation', () => {
  const a = fakeSource('a', [])
  const b = fakeSource('b', [])
  const registry = [a, b]

  expect(parseConfig({})).toEqual({ sources: [SOURCES[0]], limit: 3 })
  expect(parseConfig({ NEWS_SOURCES: '  ', NEWS_LIMIT: '' })).toEqual({ sources: [SOURCES[0]], limit: 3 })
  expect(parseConfig({ NEWS_SOURCES: ' b, a ,,b', NEWS_LIMIT: ' 10 ' }, registry)).toEqual({ sources: [b, a], limit: 10 })
  // wrangler.jsonc vars may be JSON values rather than strings.
  const jsonVars = { NEWS_SOURCES: ['b', 'a'], NEWS_LIMIT: 5 } as unknown as NewsEnv
  expect(parseConfig(jsonVars, registry)).toEqual({ sources: [b, a], limit: 5 })

  expect(() => parseConfig({ NEWS_SOURCES: 'a,nope' }, registry)).toThrow('Unknown news source "nope" in NEWS_SOURCES; available: a, b')
  for (const bad of ['0', '-1', '1.5', '3x', 'abc', '01']) {
    expect(() => parseConfig({ NEWS_LIMIT: bad })).toThrow('NEWS_LIMIT must be a positive integer')
  }
})

test('pickRecent: 24-hour window with clock skew, newest first, limit and link checks', () => {
  const items = [
    news('早上', '2026-10-30T09:10'),
    news('晚上', '2026-10-30T18:44'),
    news('昨天', '2026-10-29T23:59'),
    { title: '壞日期', link: 'https://example.com/x', published: NaN },
    news('XSS', '2026-10-30T10:00', 'javascript:alert(1)'),
    news('怪連結', '2026-10-30T10:00', 'https://example.com/a|b'),
    news('', '2026-10-30T10:00'),
  ]
  const titles = (now: string, limit = 3) => pickRecent(items, tw(now), limit).map((n) => n.title)

  expect(titles('2026-10-30T21:00')).toEqual(['晚上', '早上', '昨天'])
  expect(titles('2026-10-30T21:00', 1)).toEqual(['晚上'])
  expect(titles('2026-10-30T12:30')).toEqual(['早上', '昨天']) // 晚上 is in the future
  expect(titles('2026-10-30T18:40')).toEqual(['晚上', '早上', '昨天']) // 4 minutes ahead: within skew
  expect(titles('2026-10-31T18:40')).toEqual(['晚上'])
  expect(titles('2026-10-31T18:44')).toEqual([])
  expect(pickRecent(items, tw('2026-10-30T21:00'), 3)[0]).toEqual({ title: '晚上', link: 'https://example.com/%E6%99%9A%E4%B8%8A' })
})

test('getRecentNews merges enabled sources, caches each for 30 minutes and isolates failures', async () => {
  const t0 = tw('2026-10-31T08:00')
  const later = (min: number) => new Date(t0.getTime() + min * 60_000)
  const a = fakeSource('a', [news('a1', '2026-10-31T07:00'), news('a2', '2026-10-31T05:00')])
  const b = fakeSource('b', [news('b1', '2026-10-31T06:00')])
  const off = fakeSource('off', [news('off1', '2026-10-31T07:30')])
  const registry = [a, b, off]
  const env = { NEWS_SOURCES: 'a,b', NEWS_LIMIT: '5' }
  const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
  try {
    const titles = async (at: Date) => (await getRecentNews(env, at, registry)).map((n) => n.title)

    expect(await titles(t0)).toEqual(['a1', 'b1', 'a2'])
    expect(off.calls).toBe(0) // not enabled, never fetched

    // Cached: no refetch, and NEWS_LIMIT applies to the merged result.
    expect(await titles(later(10))).toEqual(['a1', 'b1', 'a2'])
    expect(await getRecentNews({ ...env, NEWS_LIMIT: '1' }, later(10), registry)).toHaveLength(1)
    expect([a.calls, b.calls]).toEqual([1, 1])

    // b fails: a refreshes, b keeps serving its last good items.
    a.result = [news('a3', '2026-10-31T08:20')]
    b.result = new Error('boom')
    expect(await titles(later(31))).toEqual(['a3', 'b1'])
    expect([a.calls, b.calls]).toEqual([2, 2])
    expect(errorSpy).toHaveBeenCalledWith('News source failed:', 'b', 'boom')

    // A failed source also waits a full cache period before retrying.
    await titles(later(60)) // 29 minutes after the failure
    expect([a.calls, b.calls]).toEqual([2, 2])

    // Next day 06:00 + : b1 ages out of the window though b is still failing.
    expect(await titles(later(22 * 60))).toEqual(['a3'])
    expect([a.calls, b.calls]).toEqual([3, 3])

    await expect(getRecentNews({ NEWS_SOURCES: 'nope' }, t0, registry)).rejects.toThrow('Unknown news source')
  } finally {
    errorSpy.mockRestore()
  }
})
