// URLs for the employer's My Jobs list, so the tab and page live in the address bar
// (refresh, Back and a shared link all land where the employer was) and View / Edit
// can send them back to exactly that place.

import { EMPLOYER_JOB_TABS, type EmployerJobTab } from '@/lib/api'
import { safeInternalPath } from '@/lib/safeRedirect'

const MY_JOBS_PATH = '/employer/jobs'

// Past any real list, but small enough that the BE is never asked for an absurd offset.
// A page beyond the end just lands on the last real page (see the list's redirect).
const MAX_PAGE = 10_000

/** The tab a `?tab=` value names. Anything else is Active, exactly as the BE treats it. */
export function parseJobTab(value: string | null): EmployerJobTab {
  const wanted = value?.toLowerCase()
  return EMPLOYER_JOB_TABS.find((tab) => tab === wanted) ?? 'active'
}

/** The page a `?page=` value names: a whole number from 1 up, otherwise page 1. */
export function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10)
  return page > 0 ? Math.min(page, MAX_PAGE) : 1
}

/** `/employer/jobs` for a tab and page, leaving out whatever is already the default. */
export function myJobsUrl(tab: EmployerJobTab = 'active', page = 1): string {
  const qs = new URLSearchParams()
  if (tab !== 'active') qs.set('tab', tab)
  if (page > 1) qs.set('page', String(page))
  const query = qs.toString()
  return query ? `${MY_JOBS_PATH}?${query}` : MY_JOBS_PATH
}

/** A View / Edit link that remembers the My Jobs URL it was opened from. */
export function withReturnTo(href: string, from: string): string {
  return `${href}?from=${encodeURIComponent(from)}`
}

/**
 * Where to go back to. `from` comes from the address bar, so it is not trusted: it must
 * be an internal link to the My Jobs list itself, and even then only its tab and page
 * are read — the URL that comes out is rebuilt from those two validated values, never
 * echoed. Anything else (missing, another site, another page) falls back to the list.
 */
export function myJobsReturnUrl(from: string | null): string {
  const safe = safeInternalPath(from)
  if (!safe) return MY_JOBS_PATH
  const url = new URL(safe, 'http://placeholder.invalid')
  if (url.pathname !== MY_JOBS_PATH) return MY_JOBS_PATH
  return myJobsUrl(parseJobTab(url.searchParams.get('tab')), parsePage(url.searchParams.get('page')))
}
