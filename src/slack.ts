import type { Almanac } from './almanac'
import type { NewsItem } from './news'

const mrkdwn = (text: string) => ({ type: 'mrkdwn', text })
// Slack mrkdwn control characters.
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Block Kit card for incoming webhooks; `text` is the notification fallback.
export function buildSlackMessage(a: Almanac, news: NewsItem[]) {
  const newsText = news.length
    ? news.map((n) => `• <${n.link}|${escape(n.title)}>`).join('\n')
    : '今天沒有新消息'
  const yi = a.yi.join('、') || '—'
  const ji = a.ji.join('、') || '—'
  return {
    text: `IT人的今天：${a.month}/${a.day} 宜 ${yi}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🗓️ IT人的今天' } },
      { type: 'section', text: mrkdwn(`*${a.month} 月 ${a.day} 日 ${a.weekday}*\n${a.lunarText}`) },
      { type: 'context', elements: [mrkdwn(`🏮 _${a.fortune}_`)] },
      {
        type: 'section',
        fields: [
          mrkdwn(`*IT神方位*\n${a.itGodDirection}`),
          mrkdwn(`*吉時*\n${a.luckyHours.join('、')}`),
          mrkdwn(`*沖*\n${a.chong}`),
          mrkdwn(`*煞*\n${a.sha}`),
        ],
      },
      { type: 'divider' },
      { type: 'section', text: mrkdwn(`:large_blue_circle: *宜*　${yi}`) },
      { type: 'section', text: mrkdwn(`:red_circle: *忌*　${ji}`) },
      { type: 'divider' },
      { type: 'section', text: mrkdwn(`*📰 IT新消息*\n${newsText}`) },
    ],
  }
}

export async function sendToSlack(webhookUrl: string, a: Almanac, news: NewsItem[]): Promise<void> {
  // Only ever post to Slack, even if the env var is misconfigured.
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) throw new Error('SLACK_WEBHOOK_URL must be a hooks.slack.com URL')
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSlackMessage(a, news)),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Slack webhook responded ${res.status}: ${await res.text()}`)
}
