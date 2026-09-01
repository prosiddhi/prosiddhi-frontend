'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Briefcase, Eye, Loader2, AlertCircle, MapPinOff, MapPinPlus, type LucideIcon } from 'lucide-react'
import type { Job } from '@/lib/api'
import { JobFeedCard } from './JobFeedCard'

export type SectionKind = 'all' | 'recommended' | 'nearby'

/**
 * One All/Recommended/Near By results block: heading + count, loading/error/
 * empty states, a card list, and a "Show More" button.
 *
 * Shared by the seeker Home page (one tab at a time, using the default
 * headingIcon/title/sub heading) and the Job Feed page's results panel
 * (which passes `bare` + its own `heading` — a plain "Showing N jobs" line —
 * since it renders inside job-feed's own two-column filter layout rather
 * than as a full-width page section).
 */

/**
 * The three empty states, decided ONCE — icon, sentence and whether there is
 * anything to press.
 *
 * `noLocation` (Near By only) means the seeker has no saved coordinate, so the
 * backend never ran the distance filter. That is fixable by the seeker and
 * earns an action. An empty Near By WITH a coordinate is not fixable by adding
 * a location they already gave us, and offering the button there is what makes
 * the section read as broken.
 */
function emptyStateFor(kind: SectionKind, noLocation: boolean, t: (key: string) => string) {
  if (kind === 'recommended') {
    return { Icon: Briefcase, body: t('seeker:jobFeed.emptyRecommended'), cta: false }
  }
  if (kind === 'all') {
    return { Icon: Briefcase, body: t('seeker:jobFeed.emptyDefault'), cta: false }
  }
  return noLocation
    ? { Icon: MapPinPlus, body: t('profile:seeker.locationOff'), cta: true }
    : { Icon: MapPinOff, body: t('seeker:jobFeed.emptyNearby'), cta: false }
}

export interface JobFeedSectionProps {
  /** Default heading (icon + title + sub + result count). Ignored when `heading` is passed. */
  headingIcon?: LucideIcon
  title?: string
  sub?: string
  /** Overrides the default heading block entirely — pass `null` to render no heading at all. */
  heading?: React.ReactNode
  /** Skip the outer full-width `<section>` wrapper — for embedding inside a caller's own layout. */
  bare?: boolean
  count: number
  loading: boolean
  error: string
  jobs: Job[]
  kind: SectionKind
  noLocation: boolean
  hasMore: boolean
  onShowMore: () => void
  onRetry: () => void
  savedIds: Set<string>
  savingIds: Set<string>
  onToggleSave: (jobId: string) => void
}

export function JobFeedSection({
  headingIcon: HeadingIcon,
  title,
  sub,
  heading,
  bare = false,
  count,
  loading,
  error,
  jobs,
  kind,
  noLocation,
  hasMore,
  onShowMore,
  onRetry,
  savedIds,
  savingIds,
  onToggleSave,
}: JobFeedSectionProps) {
  const { t } = useTranslation()
  const empty = emptyStateFor(kind, noLocation, t)
  const EmptyIcon = empty.Icon

  const content = (
    <>
      {heading !== undefined ? (
        heading
      ) : (
        HeadingIcon && (
          <div className="mb-3 sm:mb-4 flex items-center gap-2">
            <HeadingIcon className="w-5 h-5 text-[#717182] shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl lg:text-[22px] font-semibold">{title}</h2>
              {!loading && !error && (
                <p className="text-sm text-[#717182]">
                  {sub} · {t('seeker:jobFeed.resultCount', { count })}
                </p>
              )}
            </div>
          </div>
        )
      )}

      {loading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-[#717182]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-50" />
          <p>{t('seeker:jobFeed.loading')}</p>
        </div>
      )}

      {!loading && error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-red-600 mb-4 max-w-md">{error}</p>
          <button onClick={onRetry} className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center text-[#717182]">
          <EmptyIcon className="w-8 h-8 mb-3 text-gray-300" />
          <p className="text-lg font-medium text-black mb-1">{t('seeker:jobFeed.emptyTitle')}</p>
          <p className="max-w-md">{empty.body}</p>
          {empty.cta && (
            <Link
              href="/profile"
              className="inline-flex items-center justify-center mt-5 min-h-[44px] px-6 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm"
            >
              {t('seeker:jobFeed.emptyNearbyCta')}
            </Link>
          )}
        </div>
      )}

      {jobs.length > 0 && (
        // Single column, capped at Tailwind's own 7xl scale token (1280px)
        // rather than an invented number — measured against the real page
        // container: content is 1040-1200px wide at 1280-1440, so the card
        // runs edge-to-edge there and only picks up a deliberate margin
        // beyond it.
        <div className="flex flex-col gap-3 sm:gap-4 max-w-7xl">
          {jobs.map((job) => (
            <JobFeedCard
              key={job.id}
              job={job}
              isSaved={savedIds.has(job.id)}
              saving={savingIds.has(job.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-5 sm:mt-6">
          <button
            onClick={onShowMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#dddddd] rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {t('seeker:jobFeed.showMore')}
          </button>
        </div>
      )}
    </>
  )

  if (bare) return content

  return (
    <section className="py-5 sm:py-6">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">{content}</div>
    </section>
  )
}

export default JobFeedSection
