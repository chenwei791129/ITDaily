import { expect, test } from 'bun:test'
import { LunarUtil } from 'lunar-typescript'
import { getAlmanac } from './almanac'
import { NONE, YI_JI_IT } from './yiji'

test('every traditional yi/ji term has an IT mapping', () => {
  const missing = LunarUtil.YI_JI.filter((term) => term !== NONE && !YI_JI_IT[term])
  expect(missing).toEqual([])
})

test('same date gives identical almanac', () => {
  expect(getAlmanac(new Date(2026, 4, 10))).toEqual(getAlmanac(new Date(2026, 4, 10, 23, 59)))
})

test('reference screenshot date 2015-02-10', () => {
  const a = getAlmanac(new Date(2015, 1, 10))
  expect(a.lunarText).toBe('農曆甲午年 臘月廿二')
  expect(a.weekday).toBe('星期二')
})

test('leap month is shown in Traditional Chinese', () => {
  expect(getAlmanac(new Date(2025, 7, 1)).lunarText).toContain('閏六月')
})

test('lucky hours exclude the next-day late 子 hour', () => {
  // 2026-05-10: 00:00 子 is 吉; 2026-05-15 (丑日): 00:00 子 is 凶 though the late 子 is 吉.
  expect(getAlmanac(new Date(2026, 4, 10)).luckyHours[0]).toBe('子')
  expect(getAlmanac(new Date(2026, 4, 15)).luckyHours).not.toContain('子')
})

test('displayed text over 2020-2035 contains no Simplified-only chars', () => {
  const simplified = /[\u814a\u95f0\u9f99\u9a6c\u9e21\u732a\u4e1c\u6ee1\u6267\u5f00\u95ed]/
  for (let d = new Date(2020, 0, 1); d.getFullYear() <= 2035; d.setDate(d.getDate() + 1)) {
    const text = JSON.stringify(getAlmanac(d))
    if (simplified.test(text)) throw new Error(`${d.toDateString()}: ${text}`)
  }
}, 30_000)

test('IT gods map to 喜神 and 福神 directions', () => {
  // 2026-05-10: 喜神 东北, 福神 正北.
  expect(getAlmanac(new Date(2026, 4, 10)).itGodDirection).toBe('部署神\u00a0東北・乖乖神\u00a0正北')
})

test('chong lists both ages of the clashing ganzhi', () => {
  // 2026-05-10 clashes 戊寅; born 1998 and 1938 in lunar year 2026.
  expect(getAlmanac(new Date(2026, 4, 10)).chong).toBe('屬虎(戊寅，28歲)、屬虎(戊寅，88歲)')
})
