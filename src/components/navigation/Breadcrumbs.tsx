'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * Breadcrumbs — the "you are here" trail, e.g.  Home / Employer / My Jobs
 *
 * Derived from the pathname, so a page adds it with one line and cannot ship a
 * trail that disagrees with the URL it is actually on. Labels come from i18next,
 * because a hardcoded English trail would put English back on every screen of a
 * product that ships full Hindi — the exact regression class as the i18n cache
 * bug fixed in July.
 *
 * Deliberately renders NOTHING on:
 *  - auth + registration routes — those have their own step indicator, and a
 *    breadcrumb implies free navigation that a half-created account must not have
 *  - the public landing pages — the trail would be a single "Home" crumb
 *
 * Dynamic segments (an id, a token) are never printed. A raw UUID is noise to a
 * low-literacy user and can leak an identifier into a screenshot; the crumb shows
 * what the page IS ("Job Details"), which is what the trail is for.
 */

type CrumbDef = { labelKey: string; href?: string }

// Ordered: first pattern that matches wins, so put deeper routes before their
// parents. `:seg` matches exactly one path segment.
const ROUTES: Array<{ pattern: string; trail: CrumbDef[] }> = [
  // ---- Seeker ----
  { pattern: '/job-feed', trail: [{ labelKey: 'nav.jobFeed' }] },
  { pattern: '/job-details/:seg', trail: [
    { labelKey: 'nav.jobFeed', href: '/job-feed' },
    { labelKey: 'breadcrumbs.jobDetails' },
  ] },
  { pattern: '/saved-jobs', trail: [{ labelKey: 'nav.savedJobs' }] },
  { pattern: '/my-applications/:seg', trail: [
    { labelKey: 'nav.myApplications', href: '/my-applications' },
    { labelKey: 'breadcrumbs.application' },
  ] },
  { pattern: '/my-applications', trail: [{ labelKey: 'nav.myApplications' }] },
  { pattern: '/my-interviews', trail: [{ labelKey: 'nav.myInterviews' }] },
  { pattern: '/messages/:seg', trail: [
    { labelKey: 'nav.messages', href: '/messages' },
    { labelKey: 'breadcrumbs.conversation' },
  ] },
  { pattern: '/messages', trail: [{ labelKey: 'nav.messages' }] },
  { pattern: '/profile', trail: [{ labelKey: 'nav.profile' }] },
  { pattern: '/settings', trail: [{ labelKey: 'nav.settings' }] },

  // ---- Employer ----
  // Every employer crumb hangs off /employer, so the dashboard is always one
  // click away — it is the screen employers actually navigate from.
  { pattern: '/employer/jobs/new', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'nav.myJobs', href: '/employer/jobs' },
    { labelKey: 'breadcrumbs.postJob' },
  ] },
  { pattern: '/employer/jobs/:seg/edit', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'nav.myJobs', href: '/employer/jobs' },
    { labelKey: 'breadcrumbs.editJob' },
  ] },
  { pattern: '/employer/jobs', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'nav.myJobs' },
  ] },
  { pattern: '/employer/candidates/:seg', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.candidates', href: '/employer/candidates' },
    { labelKey: 'breadcrumbs.candidate' },
  ] },
  { pattern: '/employer/candidates', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.candidates' },
  ] },
  { pattern: '/employer/workers/:seg', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.workers', href: '/employer/workers' },
    { labelKey: 'breadcrumbs.candidate' },
  ] },
  { pattern: '/employer/workers', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.workers' },
  ] },
  { pattern: '/employer/team', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.team' },
  ] },
  { pattern: '/employer/plans', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.plans' },
  ] },
  { pattern: '/employer/invoices', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'breadcrumbs.invoices' },
  ] },
  { pattern: '/employer/profile', trail: [
    { labelKey: 'breadcrumbs.employer', href: '/employer' },
    { labelKey: 'nav.profile' },
  ] },
  { pattern: '/employer', trail: [{ labelKey: 'breadcrumbs.employer' }] },

  // ---- Legal ----
  { pattern: '/privacy', trail: [{ labelKey: 'breadcrumbs.privacy' }] },
  { pattern: '/terms', trail: [{ labelKey: 'breadcrumbs.terms' }] },
  { pattern: '/contact', trail: [{ labelKey: 'breadcrumbs.contact' }] },
]

function matches(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('/').filter(Boolean)
  if (p.length !== s.length) return false
  return p.every((seg, i) => seg === ':seg' || seg === s[i])
}

export function Breadcrumbs({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const pathname = usePathname() ?? ''

  const match = ROUTES.find((r) => matches(r.pattern, pathname))
  if (!match) return null

  const crumbs: CrumbDef[] = [{ labelKey: 'nav.home', href: '/' }, ...match.trail]

  return (
    <nav aria-label={t('breadcrumbs.label')} className={className}>
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={`${crumb.labelKey}-${i}`} className="flex items-center gap-x-1.5">
              {i > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !crumb.href ? (
                // The current page is text, not a link — a link to where you
                // already are is dead chrome.
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="text-gray-700 font-medium"
                >
                  {t(crumb.labelKey)}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-primary-50 hover:underline"
                >
                  {t(crumb.labelKey)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
