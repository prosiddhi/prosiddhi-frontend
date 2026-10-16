// Remembers the employer page the user was on before the current one, so a page's Back
// link can return there. The browser does not tell a page where it was opened from, and
// `document.referrer` only describes the first page load, not in-app navigation.
//
// `EmployerLayout` stays mounted while an employer moves between pages, so it can see
// each change. It calls `rememberEmployerPage` on every path change and the value lives
// in sessionStorage. A full page load (refresh, typed URL, a link from another site)
// mounts the layout afresh and clears it, so Back then falls back to the dashboard.

import { safeInternalPath } from '@/lib/safeRedirect'

const KEY = 'prosiddhi.employer.previousPage'
const DASHBOARD = '/employer'

/**
 * Call when the employer lands on a page. `previous` is the page they were on before
 * (path + query as it was on arrival), or null on the first page of a fresh load.
 */
export function rememberEmployerPage(previous: string | null): void {
  try {
    if (previous) sessionStorage.setItem(KEY, previous)
    else sessionStorage.removeItem(KEY)
  } catch {
    // Storage can be blocked; Back then goes to the dashboard.
  }
}

/**
 * Where My Jobs' Back goes: the employer page they came from, else the dashboard.
 * The stored value is re-checked here: it must be a same-site path inside the employer
 * area. My Jobs' own pages (View, Edit, New) are skipped — Back from the list should
 * not step into the job the employer just left.
 */
export function myJobsBackUrl(): string {
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(KEY)
  } catch {
    return DASHBOARD
  }
  const safe = safeInternalPath(stored)
  if (!safe) return DASHBOARD
  const path = new URL(safe, 'http://placeholder.invalid').pathname
  const inEmployerArea = path === DASHBOARD || path.startsWith(`${DASHBOARD}/`)
  return inEmployerArea && !isMyJobsPath(path) ? safe : DASHBOARD
}

/** The My Jobs list or one of its sub-pages (View, Edit, New). */
export function isMyJobsPath(path: string): boolean {
  return path === `${DASHBOARD}/jobs` || path.startsWith(`${DASHBOARD}/jobs/`)
}
