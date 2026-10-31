import './style.css'
import { getAlmanac } from './almanac'

const $ = (id: string) => document.getElementById(id)!
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

let current = new Date()

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
}

function shift(days: number) {
  current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + days)
  render()
}

$('prev').addEventListener('click', () => shift(-1))
$('next').addEventListener('click', () => shift(1))
$('today').addEventListener('click', () => {
  current = new Date()
  render()
  $('prev').focus() // the button just hid itself; keep keyboard focus on the page
})

render()
