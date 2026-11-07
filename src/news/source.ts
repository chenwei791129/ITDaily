export interface NewsItem {
  title: string
  link: string
  published: number // epoch ms; NaN when the source's date is unparseable
}

// A source only fetches and parses; the core applies the time window, ordering, limit and caching.
// fetch() must throw on failure or an empty feed, so the core keeps serving the last good items.
export interface NewsSource {
  id: string // kebab-case, used in NEWS_SOURCES
  fetch(signal: AbortSignal): Promise<NewsItem[]>
}
