import { publicJobsHref } from '@/lib/publicJobs'
import { loginHref } from '@/lib/routes'

/**
 * What the shared public header (components/navigation/PublicHeader.tsx) links to,
 * per page. One list here, so the bar, the phone Menu and the tests all read the same
 * thing and a label or destination changes in one place.
 *
 * Same idea as `seekerNav.ts` / `employerNav.ts`.
 *
 *   main     `/`                  the front page
 *   seeker   `/employee`          the jobseeker landing page (and a logged-out job page)
 *   employer `/employer/welcome`  the employer landing page
 *
 * ⚠️ Destinations are deliberately the ones each page already had. In particular
 * "Companies" (→ the employer landing page) keeps its label and target until the
 * product owner decides whether a public company directory is planned.
 */
export type PublicNavVariant = 'main' | 'seeker' | 'employer'

export interface PublicNavItem {
  id: string
  /** i18n key. A `ns:key` form where the string lives outside `common`. */
  labelKey: string
  href: string
}

const FIND_JOBS: PublicNavItem = { id: 'findJobs', labelKey: 'nav.findJobs', href: publicJobsHref() }
const COMPANIES: PublicNavItem = { id: 'companies', labelKey: 'nav.companies', href: '/employer/welcome' }

const ITEMS: Record<PublicNavVariant, readonly PublicNavItem[]> = {
  main: [FIND_JOBS, COMPANIES],
  seeker: [
    FIND_JOBS,
    COMPANIES,
    // Same destination as Companies; it was already in this page's header.
    { id: 'employer', labelKey: 'seeker:nav.employer', href: '/employer/welcome' },
  ],
  employer: [
    { id: 'offer', labelKey: 'employer:landing.offers.heading', href: '#offer' },
    { id: 'findWorkers', labelKey: 'employer:landing.nav.findWorkers', href: '#hero' },
    { id: 'help', labelKey: 'employer:landing.help', href: '/contact' },
  ],
}

export function publicNavItems(variant: PublicNavVariant): readonly PublicNavItem[] {
  return ITEMS[variant]
}

export const PUBLIC_LOGIN_HREF = '/login'

/** Employer sign-up. The footer's "Post a Job" / "Find Workers" use it for visitors too. */
export const EMPLOYER_REGISTER_HREF = '/employer/register'

/**
 * Login, and where it should return to. `returnTo` is the page a logged-out visitor was
 * on (a job they opened): /login validates `returnUrl` itself, so this only builds it.
 */
export function publicLoginHref(returnTo?: string): string {
  return returnTo ? loginHref(returnTo) : PUBLIC_LOGIN_HREF
}

/**
 * Register is one word on every page; where it goes depends on whose page it is.
 * A jobseeker page can pass `returnTo` (the job being viewed): /register stores it with
 * `rememberPendingReturn` (validated by `safeInternalPath`) and the success screen
 * returns there. Employer sign-up has no such flow, so it ignores `returnTo`.
 */
export function publicRegisterHref(variant: PublicNavVariant, returnTo?: string): string {
  if (variant === 'employer') return EMPLOYER_REGISTER_HREF
  return returnTo ? `/register?returnUrl=${encodeURIComponent(returnTo)}` : '/register'
}

/** What the phone / tablet Menu lists: the page's links, then Register. */
export function publicMenuItems(variant: PublicNavVariant, returnTo?: string): readonly PublicNavItem[] {
  return [...ITEMS[variant], { id: 'register', labelKey: 'nav.register', href: publicRegisterHref(variant, returnTo) }]
}
