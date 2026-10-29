/**
 * The employer's mobile bottom bar: which tabs it has, where they go, which one is lit, and
 * where it is not shown. Pure data and functions, so scripts/verify-employer-nav.mjs can run
 * the real source. The seeker bar's equivalent is lib/seekerNav.ts.
 *
 * The first three tabs and Post a Job are the same links the desktop header carries; the
 * More sheet holds the rest of what the account menu lists.
 */
import { isPathUnder, type SeekerMoreItem } from '@/lib/seekerNav'

export type EmployerNavTab = 'dashboard' | 'jobs' | 'workers' | 'postJob'

interface EmployerNavTabDef {
  key: EmployerNavTab
  href: string
  /** i18n key; may carry a namespace prefix. */
  labelKey: string
}

export const EMPLOYER_NAV_TABS: readonly EmployerNavTabDef[] = [
  { key: 'dashboard', href: '/employer', labelKey: 'nav.dashboard' },
  { key: 'jobs', href: '/employer/jobs', labelKey: 'nav.myJobs' },
  { key: 'workers', href: '/employer/workers', labelKey: 'employer:dashboard.findWorkers' },
  { key: 'postJob', href: '/employer/jobs/new', labelKey: 'employer:dashboard.postJob' },
]

interface EmployerMoreItem extends SeekerMoreItem {
  /** Shown to the account's owner only. Anyone else never sees it (fail closed). */
  ownerOnly?: boolean
}

/** The More sheet's links, in order. Language is not here: it is a control, not a route. */
export const EMPLOYER_MORE_ITEMS: readonly EmployerMoreItem[] = [
  { href: '/employer/candidates', labelKey: 'employer:candidates.navLabel' },
  { href: '/employer/team', labelKey: 'employer:dashboard.team' },
  { href: '/employer/plans', labelKey: 'employer:plans.navLabel' },
  { href: '/employer/my-plans', labelKey: 'employer:myPlans.navLabel' },
  { href: '/employer/invoices', labelKey: 'employer:invoices.navLabel' },
  // The ledger is owner-only on the backend (a member seat gets 403 NOT_OWNER).
  { href: '/employer/ledger', labelKey: 'employer:ledger.navLabel', ownerOnly: true },
  { href: '/employer/settings', labelKey: 'nav.settings' },
]

/**
 * The tab lit for a pathname. The dashboard is lit on `/employer` only (every other page is
 * below it). Elsewhere the longest matching tab wins, so `/employer/jobs/new` lights Post a
 * Job and not My Jobs, while `/employer/jobs/42` and `/employer/jobs/42/edit` light My Jobs.
 */
export function employerActiveTab(pathname: string | null | undefined): EmployerNavTab | undefined {
  if (!pathname) return undefined
  let best: EmployerNavTabDef | undefined
  for (const tab of EMPLOYER_NAV_TABS) {
    const matches = tab.key === 'dashboard' ? pathname === tab.href : isPathUnder(pathname, tab.href)
    if (matches && (!best || tab.href.length > best.href.length)) best = tab
  }
  return best?.key
}

/** More is lit on the sheet's pages, and only when no primary tab is, so at most one of the five is lit. */
export function isEmployerMoreActive(pathname: string | null | undefined): boolean {
  return !employerActiveTab(pathname) && EMPLOYER_MORE_ITEMS.some((i) => isPathUnder(pathname, i.href))
}

/**
 * Focused single-task screens: the public landing page, the sign-up steps and the
 * invite-accept screen. They carry neither the site footer nor the bottom bar.
 */
const FOCUSED_ROUTES = ['/employer/welcome', '/employer/register', '/employer/team/accept']

export function isFocusedEmployerRoute(pathname: string | null | undefined): boolean {
  return !!pathname && FOCUSED_ROUTES.some((p) => isPathUnder(pathname, p))
}
