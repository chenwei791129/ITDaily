import type { NewsSource } from '../source'
import { ithomeSecurity } from './ithome'

// Every built-in source; NEWS_SOURCES picks from these by id.
export const SOURCES: NewsSource[] = [ithomeSecurity]

// Used when NEWS_SOURCES is unset or empty.
export const DEFAULT_SOURCES = ['ithome-security']
