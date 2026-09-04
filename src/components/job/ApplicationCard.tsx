'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  humanizeJobType,
  formatSalaryLine,
  relativeTime,
  initials,
  localizeLocation,
} from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import type { Application } from '@/lib/api'
import { Briefcase, Clock, IndianRupee, MapPin } from 'lucide-react'

interface ApplicationCardProps {
  application: Application
}

/**
 * ApplicationCard — the My Applications list card.
 *
 * Same visual language as JobFeedCard (avatar treatment, pill styles,
 * formatters) but its own component: unlike a job card it needs a status
 * pill + View Details action row instead of a save/View Job row, so it
 * isn't a fit for JobFeedCard itself.
 */
export function ApplicationCard({ application }: ApplicationCardProps) {
  const { t } = useTranslation()
  const job = application.job
  const meta = statusMeta(application.status)

  const salaryLine = formatSalaryLine(job?.salaryMin, job?.salaryMax, job?.paymentType)

  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-[20px] font-semibold text-[#236987]">
            {initials(job?.companyName || job?.title)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-lg sm:text-xl font-semibold break-words">
              {job?.title || t('seeker:myApplications.job')}
            </h3>
            <span className="shrink-0 mt-0.5 text-xs sm:text-sm text-[#717182] whitespace-nowrap">
              {t('seeker:applicationDetail.appliedRelative', { time: relativeTime(application.appliedAt) })}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600 mt-1">
            {job?.companyName || t('seeker:jobCard.company')}
          </p>

          <div className="flex items-center gap-1 mt-3 text-sm sm:text-base text-black font-medium">
            <IndianRupee className="w-4 h-4 text-[#3386a9] shrink-0" />
            {salaryLine}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {job?.jobType && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <Clock className="w-3 h-3 text-[#3386a9]" />
                {humanizeJobType(job.jobType)}
              </span>
            )}
            {job?.category && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <Briefcase className="w-3 h-3 text-[#3386a9]" />
                {job.category}
              </span>
            )}
            {job?.location && (
              <span className="inline-flex items-center gap-1 bg-[#efefef] px-3 py-1 rounded-full text-xs text-black">
                <MapPin className="w-3 h-3 text-[#3386a9]" />
                {localizeLocation(job.location)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-3 mt-4">
        {/* Success-style chip, independent of statusMeta's per-status pill
            color — the actual PENDING→"Applied" label mapping is still a
            deferred change, this is only the badge's visual treatment. */}
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-50 text-green-700 whitespace-nowrap">
          {t(`seeker:status.${application.status ?? 'UNKNOWN'}`, { defaultValue: meta.label })}
        </span>
        <Link
          href={`/my-applications/${application.id}`}
          className="px-4 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base text-center whitespace-nowrap"
        >
          {t('buttons.viewDetails')}
        </Link>
      </div>
    </div>
  )
}

export default ApplicationCard
