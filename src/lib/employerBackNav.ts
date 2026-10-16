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
 * Sections of the employer area whose pages lead to each other: a list and the pages
 * opened from it (My Jobs → View / Edit / New; Candidates → one candidate). Moving
 * inside a section must not change the saved page, and Back from the list must never
 * land back inside its own section.
 */
const MY_JOBS = `${DASHBOARD}/jobs`
const CANDIDATES = `${DASHBOARD}/candidates`
const SECTIONS = [MY_JOBS, CANDIDATES]

function inSection(path: string, section: string): boolean {
  return path === section || path.startsWith(`${section}/`)
}

/** True when both paths are in the same section (e.g. the Candidates list and one candidate). */
export function inSameSection(a: string, b: string): boolean {
  return SECTIONS.some((section) => inSection(a, section) && inSection(b, section))
}

/**
 * Where a list page's Back goes: the employer page they came from, else the dashboard.
 * The stored value is re-checked here: it must be a same-site path inside the employer
 * area, and not in the list's own section — Back from the list should not step into the
 * job or candidate the employer just left.
 */
function backUrlOutside(section: string): string {
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
  return inEmployerArea && !inSection(path, section) ? safe : DASHBOARD
}

export const myJobsBackUrl = () => backUrlOutside(MY_JOBS)
export const candidatesBackUrl = () => backUrlOutside(CANDIDATES)
