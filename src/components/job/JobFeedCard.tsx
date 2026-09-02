'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { humanizeJobType, formatSalaryLine, relativeTime, initials, localizeLocation } from '@/lib/jobFormat'
import type { Job } from '@/lib/api'
import { Bookmark, BookmarkCheck, Briefcase, Clock, IndianRupee, Loader2, MapPin } from 'lucide-react'

interface JobFeedCardProps {
  job: Job
  isSaved: boolean
  saving: boolean
  onToggleSave: (jobId: string) => void
  /** Where this card is rendered — carried into the Job Details URL as `?from=`
      so its Back link can return here instead of a generic browser-back. */
  from?: 'home' | 'job-feed' | 'saved-jobs'
}

// Skills render as chips (no label) so a long list never needs a 10-language
// "Skills:" string; capped so one oversupplied job can't stretch the card.
const MAX_SKILL_CHIPS = 6

/**
 * JobFeedCard — the wide, single-column card the job-feed page's Recommended,
 * Near By, and All-jobs sections all render.
 *
 * Pulled out of job-feed/page.tsx because the Figma redesign shows the SAME
 * card in three independent sections at once — inlining it three times would
 * have let the three copies drift apart. All three sections pass this
 * component their own `savedIds`/`savingIds`/`toggleSave`, which already live
 * in job-feed/page.tsx keyed by job ID (not by section), so saving a job in
 * one section correctly reflects in the others without any new state here.
 *
 * Two distinct "title" concepts from the API, kept visually distinct:
 * `job.title` (what the employer typed) is the one h3 on the card; `job.jobTitle`
 * (the admin taxonomy leaf the employer picked) is secondary, grouped with
 * `job.sector` in a small muted line — never a second heading. `job.category`,
 * the level above sector in the same taxonomy, sits instead in the quick
 * metadata pills alongside job type and location.
 */
export function JobFeedCard({ job, isSaved, saving, onToggleSave, from }: JobFeedCardProps) {
  const { t } = useTranslation()
  const classification = [job.jobTitle, job.sector].filter(Boolean).join(' · ')
  const skills = job.skillsRequired ?? []
  const posted = relativeTime(job.createdAt)

  // Pulled out only so the JSX below reads as one action row rather than
  // three buttons' worth of markup inline.
  const actions = (
    <>
      {/* Save toggle (PJP-140) — persists via /saved-jobs. Secondary/subtle
          styling (light gray) next to View Job's primary blue, same height
          and text scale as that button so the pair reads as one row. */}
      <button
        onClick={() => onToggleSave(job.id)}
        disabled={saving}
        className="shrink-0 min-h-[44px] px-4 bg-[#eeeeee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSaved ? (
          <BookmarkCheck className="w-5 h-5 text-primary-50" />
        ) : (
          <Bookmark className="w-5 h-5" />
        )}
        {isSaved ? t('seeker:jobCard.saved') : t('seeker:jobCard.saveJob')}
      </button>
      <Link
        href={from ? `/job-details/${job.id}?from=${from}` : `/job-details/${job.id}`}
        className="min-h-[44px] px-6 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base flex items-center justify-center whitespace-nowrap"
      >
        {t('seeker:jobCard.viewJob')}
      </Link>
    </>
  )

  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-[20px] font-semibold text-[#236987]">{initials(job.companyName || job.title)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-lg sm:text-xl font-semibold break-words">{job.title}</h3>
            <span className="shrink-0 mt-0.5 text-xs sm:text-sm text-[#717182] whitespace-nowrap">{posted}</span>
          </div>
          {/* Secondary to the title on purpose — medium weight, muted gray,
              not the near-black the title uses, so it reads as "who's
              hiring" rather than competing with "what the job is". */}
          <p className="text-sm sm:text-base font-medium text-gray-600 mt-1">{job.companyName || t('seeker:jobCard.company')}</p>

          {/* Salary — its own line, the figure a seeker scans for first. */}
          <div className="flex items-center gap-1 mt-3 text-sm sm:text-base text-black font-medium">
            <IndianRupee className="w-4 h-4 text-[#3386a9] shrink-0" />
            {formatSalaryLine(job.salaryMin, job.salaryMax)}
          </div>

          {/* Quick metadata — job type, category, location as compact
              pills, not a dense text line: three short, scannable facts. */}
          <div className="flex flex-wrap gap-2 mt-2">
            {job.jobType && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <Clock className="w-3 h-3 text-[#3386a9]" />
                {humanizeJobType(job.jobType)}
              </span>
            )}
            {job.category && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <Briefcase className="w-3 h-3 text-[#3386a9]" />
                {job.category}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <MapPin className="w-3 h-3 text-[#3386a9]" />
                {localizeLocation(job.location)}
              </span>
            )}
          </div>

          {/* Secondary classification (admin Job Title + sector) — plain
              text, deliberately not a heading. */}
          {classification && (
            <p className="mt-2 text-xs sm:text-sm text-[#717182]">{classification}</p>
          )}

          {!!skills.length && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.slice(0, MAX_SKILL_CHIPS).map((skill) => (
                <span key={skill} className="bg-[#efefef] px-2.5 py-0.5 rounded-full text-xs text-black">
                  {skill}
                </span>
              ))}
              {skills.length > MAX_SKILL_CHIPS && (
                <span className="self-center text-xs text-[#717182]">+{skills.length - MAX_SKILL_CHIPS}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions — a dedicated row below all job information, not inline
          with skills or tucked beside the content, and not full-width; more
          room above it than the compact metadata/classification/skills
          cluster gets between themselves, so it reads as visually separate. */}
      <div className="flex items-center justify-end gap-2 mt-4">{actions}</div>
    </div>
  )
}

export default JobFeedCard
