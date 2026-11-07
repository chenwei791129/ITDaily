import { expect, test } from 'bun:test'
import { DEFAULT_SOURCES, SOURCES } from '.'

// Guards contributions: NEWS_SOURCES would silently pick the first of two sources sharing an id.
test('built-in source ids are unique kebab-case, and defaults exist', () => {
  const ids = SOURCES.map((s) => s.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  for (const id of DEFAULT_SOURCES) expect(ids).toContain(id)
})
