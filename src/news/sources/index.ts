import type { NewsSource } from '../source'
import { ithomeSources } from './ithome'

// Every built-in source, one directory per site; NEWS_SOURCES picks from these by id.
// Ids are prefixed with the site directory by convention; uniqueness and kebab-case are checked in index.test.ts.
export const SOURCES: NewsSource[] = [...ithomeSources]

// Used when NEWS_SOURCES is unset or empty.
export const DEFAULT_SOURCES = ['ithome-security']
