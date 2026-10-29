/**
 * The seeker's mobile bottom bar: which tabs it has, where they go, and which one is lit.
 * Pure data and functions, so scripts/verify-seeker-nav.mjs can run the real source.
 *
 * The three tabs are the same three links as the desktop nav in EmployeeHeader.tsx — keep
 * the two in step. "Saved Jobs" is `/saved-jobs`; there is no "Saved Applications".
 */
import { SEEKER_HOME_ROUTE } from '@/lib/routes'

export type SeekerNavTab = 'home' | 'jobFeed' | 'savedJobs'

export interface SeekerNavTabDef {
  key: SeekerNavTab
  href: string
  /** i18n key, `seeker` namespace. */
  labelKey: string
}

export const SEEKER_NAV_TABS: readonly SeekerNavTabDef[] = [
  { key: 'home', href: SEEKER_HOME_ROUTE, labelKey: 'seeker:nav.home' },
  { key: 'jobFeed', href: '/job-feed', labelKey: 'seeker:nav.jobFeed' },
  { key: 'savedJobs', href: '/saved-jobs', labelKey: 'seeker:nav.savedJobs' },
]

export interface SeekerMoreItem {
  href: string
  /** i18n key, `common` namespace. */
  labelKey: string
}

/** The "More" sheet's links. Language is not here: it is a control, not a route. */
export const SEEKER_MORE_ITEMS: readonly SeekerMoreItem[] = [
  { href: '/my-applications', labelKey: 'nav.myApplications' },
  { href: '/my-interviews', labelKey: 'nav.myInterviews' },
  { href: '/settings', labelKey: 'nav.settings' },
  { href: '/profile', labelKey: 'nav.profile' },
]

/** The pathname is `href` or a page below it (/my-applications/123 is under /my-applications). */
export function isPathUnder(pathname: string | null | undefined, href: string): boolean {
  return !!pathname && (pathname === href || pathname.startsWith(`${href}/`))
}

/** Whether the pathname is one of the More sheet's pages, so the More tab can light up there. */
export function isMorePath(pathname: string | null | undefined): boolean {
  return SEEKER_MORE_ITEMS.some((i) => isPathUnder(pathname, i.href))
}

/** More is lit only when no primary tab is, so exactly one of the four is ever lit. */
export function isMoreActive(active: SeekerNavTab | undefined, pathname: string | null | undefined): boolean {
  return !active && isMorePath(pathname)
}

/** Height of the bar's content row, in px. The safe-area inset is added on top in CSS. */
export const SEEKER_BOTTOM_NAV_HEIGHT = 64

/**
 * Body class that SeekerBottomNav sets while mounted. globals.css turns it into the
 * bottom padding that keeps page content (and the footer) clear of the fixed bar.
 */
export const BOTTOM_NAV_BODY_CLASS = 'has-seeker-bottom-nav'
