'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { humanizeJobType, formatSalaryLine, relativeTime, initials, localizeLocation } from '@/lib/jobFormat'
import type { Job } from '@/lib/api'
import { Briefcase, Bookmark, BookmarkCheck, Clock, IndianRupee, Loader2, MapPin } from 'lucide-react'

interface JobFeedCardProps {
  job: Job
  isSaved: boolean
  saving: boolean
  onToggleSave: (jobId: string) => void
}

/**
 * JobFeedCard — the compact, two-per-row card the job-feed page's Recommended,
 * Near By, and All-jobs sections all render.
 *
 * Pulled out of job-feed/page.tsx (where it used to be one wide, single-column
 * card inlined once) because the Figma redesign shows the SAME card in three
 * independent sections at once — inlining it three times would have tripled
 * ~75 lines of JSX and let the three copies drift apart. All three sections
 * pass this component their own `savedIds`/`savingIds`/`toggleSave`, which
 * already live in job-feed/page.tsx keyed by job ID (not by section), so
 * saving a job in one section correctly reflects in the others without any
 * new state here.
 */
export function JobFeedCard({ job, isSaved, saving, onToggleSave }: JobFeedCardProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-[20px] font-semibold text-[#236987]">{initials(job.companyName || job.title)}</span>
        </div>
        <span className="text-xs sm:text-sm text-[#717182] whitespace-nowrap">{relativeTime(job.createdAt)}</span>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold mb-1">{job.title}</h3>
      <p className="text-sm sm:text-base text-black mb-3">{job.companyName || t('seeker:jobCard.company')}</p>

      <div className="flex items-center gap-1 mb-3">
        <IndianRupee className="w-4 h-4" />
        <span className="text-xs sm:text-sm">{formatSalaryLine(job.salaryMin, job.salaryMax)}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.jobType && (
          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#3386a9]" />
            <span className="text-xs text-black">{humanizeJobType(job.jobType)}</span>
          </div>
        )}
        {job.category && (
          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-[#3386a9]" />
            <span className="text-xs text-black">{job.category}</span>
          </div>
        )}
        {job.location && (
          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#3386a9]" />
            <span className="text-xs text-black">{localizeLocation(job.location)}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        {/* Save toggle (PJP-140) — persists via /saved-jobs. Icon-only here: the
            two-per-row card is narrower than the old single-column one, and a
            text label pushed "View the Job" off the row in Tamil/Telugu. The
            accessible name still carries the full action via aria-label. */}
        <button
          onClick={() => onToggleSave(job.id)}
          disabled={saving}
          aria-label={isSaved ? t('seeker:jobCard.saved') : t('seeker:jobCard.saveJob')}
          title={isSaved ? t('seeker:jobCard.saved') : t('seeker:jobCard.saveJob')}
          className="shrink-0 min-w-[44px] min-h-[44px] px-3 bg-[#eeeeee] rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-primary-50" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
        <Link
          href={`/job-details/${job.id}`}
          className="flex-1 min-h-[44px] px-4 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base flex items-center justify-center"
        >
          {t('seeker:jobCard.viewJob')}
        </Link>
      </div>
    </div>
  )
}

export default JobFeedCard
