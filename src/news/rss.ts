// Minimal RSS 2.0 helpers shared by RSS-based sources.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] !== '#') return ENTITIES[e] ?? m
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
      return code <= 0x10ffff ? String.fromCodePoint(code) : m
    })
    .trim()
}

export const rssItems = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => item)

export const tag = (xml: string, name: string) =>
  decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '')
