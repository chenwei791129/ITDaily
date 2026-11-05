import './style.css'
import { getAlmanac } from './almanac'
import type { NewsItem } from './news'

const $ = (id: string) => document.getElementById(id)!
const pad = (n: number) => String(n).padStart(2, '0')
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

let current = new Date()

// News is the last 24 hours of the feed, independent of the date being viewed.
async function loadNews() {
  let news: NewsItem[] = []
  let empty = '最近 24 小時沒有新消息'
  try {
    const res = await fetch('/api/news')
    if (!res.ok) throw new Error(String(res.status))
    news = await res.json()
  } catch {
    empty = '暫時無法取得新消息' // offline, server down or bad response
  }
  const items = news.map(({ title, link }) => {
    const li = document.createElement('li')
    li.append(Object.assign(document.createElement('a'), { href: link, textContent: title, target: '_blank', rel: 'noopener' }))
    return li
  })
  if (!items.length) items.push(Object.assign(document.createElement('li'), { className: 'placeholder', textContent: empty }))
  $('news').replaceChildren(...items)
}

function render() {
  const a = getAlmanac(current)
  $('month').textContent = String(a.month)
  $('weekday').textContent = a.weekday
  $('day').textContent = String(a.day)
  $('lunar').textContent = a.lunarText
  $('fortune').textContent = a.fortune
  $('direction').textContent = a.itGodDirection
  $('hours').textContent = a.luckyHours.join('、')
  $('chong').textContent = a.chong
  $('sha').textContent = a.sha
  $('yi').textContent = a.yi.join('、') || '—'
  $('ji').textContent = a.ji.join('、') || '—'
  $('today').hidden = isSameDay(current, new Date())
  pick.value = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`
}

function shift(days: number) {
  current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + days)
  render()
}

$('prev').addEventListener('click', () => shift(-1))
const pick = $('pick') as HTMLInputElement
$('pick-open').addEventListener('click', () => pick.showPicker())
pick.addEventListener('change', () => {
  const [y, m, d] = pick.value.split('-').map(Number)
  if (!pick.validity.valid || !y) return // cleared or out of min/max
  current = new Date(y, m - 1, d)
  render()
})
$('next').addEventListener('click', () => shift(1))
$('today').addEventListener('click', () => {
  current = new Date()
  render()
  $('prev').focus() // the button just hid itself; keep keyboard focus on the page
})

render()
loadNews()
