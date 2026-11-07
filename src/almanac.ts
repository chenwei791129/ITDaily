import { LunarUtil, Solar } from 'lunar-typescript'
import { NONE, YI_JI_IT } from './yiji'

// lunar-typescript outputs Simplified; these are the only differing chars in the fields we display.
const S2T: Record<string, string> = {
  腊: '臘', 闰: '閏', 龙: '龍', 马: '馬', 鸡: '雞', 猪: '豬', 东: '東',
  满: '滿', 执: '執', 开: '開', 闭: '閉',
}
const t = (s: string) => s.replace(/./g, (c) => S2T[c] ?? c)

// IT fortunes per 建除十二神; one is picked per date.
export const ZHI_XING_FORTUNE: Record<string, string[]> = {
  建: [
    '萬丈高樓平地起，先把 README 寫好。',
    '新專案第一天，先把 .gitignore 建好。',
    '建立分支前，先想好要怎麼合回去。',
    '架構圖畫得再漂亮，也比不上一個能跑的 MVP。',
    '今日宜建新 repo，忌直接 push 到 main。',
  ],
  除: [
    '刪掉的 code 不會有 bug。',
    '清掉一個 TODO，勝過新增十個 feature。',
    '移除沒人用的 dependency，node_modules 會感謝你。',
    '除舊佈新，先把過期的 feature flag 拔掉。',
    '刪 code 的 PR 最容易過 review。',
  ],
  满: [
    '硬碟將滿，記得清 log。',
    '記憶體滿了，不是加 RAM，是找 leak。',
    '滿版的 warning 也是 warning，別當作裝飾。',
    'Queue 滿了再加 consumer，就像塞車了才蓋路。',
    '行程表排滿的日子，最容易上線出事。',
  ],
  平: [
    '平安無事的 on-call 是最好的 on-call。',
    '沒有 alert 的夜晚，記得確認 alert 還活著。',
    '水平擴展之前，先確認程式是 stateless。',
    '平常心看 flaky test，但還是要修。',
    '今日宜平靜地 merge，忌週五下午部署。',
  ],
  定: [
    '需求今天定案，明天照樣會改。',
    '定好的 API 規格，請用版本號守住。',
    '定時任務跑不跑，要看 cron 的時區。',
    '鎖定依賴版本，才能安心睡覺。',
    '穩定比新潮重要，LTS 是有原因的。',
  ],
  执: [
    '固執己見前，先看看 benchmark。',
    '堅持寫測試的人，週末比較少加班。',
    '執行前先 dry-run，刪錯了就來不及。',
    '堅持 code style，交給 formatter 執行就好。',
    '執著於完美的 PR，不如先交出能跑的版本。',
  ],
  破: [
    '破壞性更新請先發公告。',
    '打破慣例之前，先讀懂為什麼有這個慣例。',
    'Breaking change 要放在 major 版本，別藏在 patch 裡。',
    '破案的關鍵通常在 log 的最後一行。',
    '想重構就放膽重構，但測試要先綠。',
  ],
  危: [
    '危險操作前，再確認一次環境變數。',
    '在 production 下 rm -rf 之前，先看一眼 hostname。',
    '沒有備份的資料，等於正在消失的資料。',
    '危機通常從一句「應該沒差」開始。',
    '今日忌直接改 prod 資料庫，宜先開 transaction。',
  ],
  成: [
    'CI 全綠，萬事可成。',
    '成功的部署，是沒有人注意到的部署。',
    '功成不必在我，但 commit 記得署名。',
    '今天適合把拖很久的 PR merge 掉。',
    '大功告成之後，別忘了更新文件。',
  ],
  收: [
    '收斂需求，比收斂 bug 容易。',
    '收到 alert 先別慌，先看是不是又是那台。',
    '收工前記得 commit，電腦不會等你。',
    '回收沒人看的 dashboard，監控才會有人看。',
    '收到 PR comment 不是被攻擊，是被幫忙。',
  ],
  开: [
    '開源是遮風避雨的補給站。',
    '開新分支很便宜，開 hotfix 很貴。',
    '開會前先寫 agenda，開完才有 action item。',
    '開放的 port 要有理由，沒有理由就關掉。',
    '開工第一件事：pull 最新的 main。',
  ],
  闭: [
    '閉關寫 code，記得關 Slack。',
    '關掉的 issue 要寫原因，不然會再開一次。',
    '收尾時記得關閉連線，連線池不是無限的。',
    '關閉通知一小時，產能提升一整天。',
    '閉上眼睛 merge 的 PR，睜開眼睛就要 revert。',
  ],
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
    fortune: pick(ZHI_XING_FORTUNE[lunar.getZhiXing()], `${dateKey}:fortune`),
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
