'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Briefcase, MapPin, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useJobFeedPreview } from '@/hooks/useJobFeedPreview'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { jobLocationFilters } from '@/lib/jobLocationParams'
import { categoryLabel } from '@/lib/categoryLabel'
import {
  PUBLIC_JOBS_ANCHOR,
  loginForJobHref,
  parsePublicJobQuery,
  publicJobsHref,
} from '@/lib/publicJobs'
import { JobFeedSection } from './JobFeedSection'

const PAGE_SIZE = 10

/**
 * The public job list on /employee — real jobs, no account needed.
 *
 * The URL is the only filter state (see lib/publicJobs.ts): the hero search, a
 * category tile and a shared link all just navigate here, so there is one way in
 * and nothing to keep in sync.
 *
 * A logged-out visitor can read every job. Save sends them to /login and back to
 * that job; Apply lives on the job's page and does the same. A signed-in seeker
 * gets their real saved state.
 *
 * Deliberately small next to the Job Feed: keyword, category and location only.
 * The full filter sidebar stays behind sign-in.
 */
export function PublicJobList() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { savedIds, savingIds, toggleSave, canSave } = useSavedJobs()

  const { search, category, location } = parsePublicJobQuery(searchParams)
  const feed = useJobFeedPreview('all', PAGE_SIZE, {
    query: { search: search || undefined, category: category || undefined, ...jobLocationFilters(location) },
    // The URL's query string is the identity of these filters.
    filtersKey: searchParams.toString(),
  })

  // Saving is a seeker's action. Logged out, the button is the way to sign in, and
  // /login brings them back to this job. While the stored session is still being
  // read nobody is known yet, and a signed-in employer has nothing to save — in
  // both cases it does nothing rather than send a signed-in person to /login.
  const onToggleSave = (jobId: string, category?: string) => {
    if (canSave) toggleSave(jobId, category)
    else if (!authLoading && !user) router.push(loginForJobHref(jobId))
  }

  // What the list is narrowed to. The location has no name in the URL (ids only),
  // so it shows as "Location" — enough to say the results are not everything.
  const chips: { label: string; Icon?: LucideIcon }[] = []
  if (search) chips.push({ label: search })
  if (category) chips.push({ label: categoryLabel(t, category) })
  if (location.stateCode !== null) chips.push({ label: t('seeker:jobFeed.filters.location'), Icon: MapPin })

  return (
    // `scroll-mt` clears the sticky PublicHeader when a link jumps to #jobs: ~104px on a
    // phone (two rows), 75px from 640.
    <section id={PUBLIC_JOBS_ANCHOR} className="scroll-mt-28 sm:scroll-mt-24 py-10 sm:py-12 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Keyed by position: the keyword and the category can be the same text. */}
            {chips.map(({ label, Icon }, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-primary-10 text-primary-80 border border-primary-20 px-3 py-1 rounded-full text-sm">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
              </span>
            ))}
            <Link
              href={publicJobsHref()}
              className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm text-primary-70 hover:underline"
            >
              <X className="w-4 h-4" />
              {t('seeker:jobFeed.filters.clearAll')}
            </Link>
          </div>
        )}

        <JobFeedSection
          bare
          headingIcon={Briefcase}
          title={t('seeker:landing.jobsTitle')}
          sub={t('seeker:jobFeed.heroSubtitle')}
          count={feed.total}
          loading={feed.loading}
          error={feed.error}
          jobs={feed.jobs}
          kind="all"
          noLocation={false}
          hasMore={feed.hasMore}
          onShowMore={feed.showMore}
          onRetry={feed.retry}
          savedIds={savedIds}
          savingIds={savingIds}
          onToggleSave={onToggleSave}
          from="employee"
        />
      </div>
    </section>
  )
}

export default PublicJobList
