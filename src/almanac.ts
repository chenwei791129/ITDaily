import { LunarUtil, Solar } from 'lunar-typescript'
import { NONE, YI_JI_IT } from './yiji'

// lunar-typescript outputs Simplified; these are the only differing chars in the fields we display.
const S2T: Record<string, string> = {
  腊: '臘', 闰: '閏', 龙: '龍', 马: '馬', 鸡: '雞', 猪: '豬', 东: '東',
  满: '滿', 执: '執', 开: '開', 闭: '閉',
}
const t = (s: string) => s.replace(/./g, (c) => S2T[c] ?? c)

// One fixed IT fortune per 建除十二神.
const ZHI_XING_FORTUNE: Record<string, string> = {
  建: '萬丈高樓平地起，先把 README 寫好。',
  除: '刪掉的 code 不會有 bug。',
  满: '硬碟將滿，記得清 log。',
  平: '平安無事的 on-call 是最好的 on-call。',
  定: '需求今天定案，明天照樣會改。',
  执: '固執己見前，先看看 benchmark。',
  破: '破壞性更新請先發公告。',
  危: '危險操作前，再確認一次環境變數。',
  成: 'CI 全綠，萬事可成。',
  收: '收斂需求，比收斂 bug 容易。',
  开: '開源是遮風避雨的補給站。',
  闭: '閉關寫 code，記得關 Slack。',
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// Deterministic per (date, term): same day -> same pick for everyone.
function pick<T>(items: T[], seed: string): T {
  let h = 5381
  for (const c of seed) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0
  return items[h % items.length]
}

function toIT(terms: string[], dateKey: string): string[] {
  const out = terms
    .filter((term) => term !== NONE)
    .map((term) => {
      const options = YI_JI_IT[term]
      return options ? pick(options, `${dateKey}:${term}`) : t(term)
    })
  return [...new Set(out)]
}

// Ages (lunar year minus birth year, 1..100) of people born in a year with the given 干支.
function agesForGanZhi(ganZhi: string, lunarYear: number): number[] {
  const idx = LunarUtil.JIA_ZI.indexOf(ganZhi)
  const age = (((lunarYear - 4 - idx) % 60) + 60) % 60 // year 4 AD is 甲子
  return [age, age + 60].filter((a) => a >= 1 && a <= 100)
}

export interface Almanac {
  month: number
  day: number
  weekday: string
  lunarText: string
  fortune: string
  itGodDirection: string
  luckyHours: string[]
  chong: string
  sha: string
  yi: string[]
  ji: string[]
}

export function getAlmanac(date: Date): Almanac {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()
  const dateKey = solar.toYmd()

  const chongGanZhi = lunar.getDayChongGan() + lunar.getDayChong()
  const chongShengXiao = t(lunar.getDayChongShengXiao())
  const chong = agesForGanZhi(chongGanZhi, lunar.getYear())
    .map((age) => `屬${chongShengXiao}(${chongGanZhi}，${age}歲)`)
    .join('、')

  // getTimes()[12] is the late 子 hour, which belongs to the next day.
  const luckyHours = lunar
    .getTimes()
    .slice(0, 12)
    .filter((time) => time.getTianShenLuck() === '吉')
    .map((time) => time.getZhi())
  const yi = toIT(lunar.getDayYi(), dateKey)

  return {
    month: solar.getMonth(),
    day: solar.getDay(),
    weekday: `星期${WEEKDAYS[solar.getWeek()]}`,
    lunarText: `農曆${lunar.getYearInGanZhi()}年 ${t(lunar.getMonthInChinese())}月${lunar.getDayInChinese()}`,
    fortune: ZHI_XING_FORTUNE[lunar.getZhiXing()],
    // 部署神 = 喜神, 乖乖神 = 福神; NBSP keeps each god and direction on one line.
    itGodDirection: t(
      `部署神\u00a0${lunar.getDayPositionXiDesc()}・乖乖神\u00a0${lunar.getDayPositionFuDesc()}`,
    ),
    luckyHours,
    chong,
    sha: t(lunar.getDaySha()),
    yi,
    // Different terms may map to the same IT phrase; never show it as both "宜" and "忌".
    ji: toIT(lunar.getDayJi(), dateKey).filter((item) => !yi.includes(item)),
  }
}
