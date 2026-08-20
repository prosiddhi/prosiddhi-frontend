'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { localizeLocation } from '@/lib/cities'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { jobSeekerAPI, type Application } from '@/lib/api'
import { formatSalary, formatDate, initials } from '@/lib/jobFormat'
import {
  Home,
  Briefcase,
  Bookmark,
  MapPin,
  IndianRupee,
  CalendarClock,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { HeaderActions } from '@/components/navigation/HeaderActions'

// Pull a wide page so interviews on any application surface in one shot — a
// seeker realistically has few. Interviews appear once BR-4 lands on the BE
// (docs/be-requests.md#br-4) so getMyApplications includes the interview.
const FETCH_LIMIT = 100

function MyInterviewsPageContent() {
  const { t } = useTranslation()
  const [interviews, setInterviews] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getMyApplications(1, FETCH_LIMIT)
        if (!ignore) setInterviews(res.applications.filter((a) => a.interview))
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('seeker:myInterviews.loadError'))
          setInterviews([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [reloadKey, t])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center min-h-[44px]">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.home')}</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.jobFeed')}</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.savedJobs')}</span>
            </Link>
            <LanguageSwitcher />
          </nav>

          <HeaderActions />
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
              {t('seeker:myInterviews.title')}
            </h1>
            {!loading && !error && (
              <p className="text-sm sm:text-base text-[#717182]">
                {interviews.length > 0 ? t('seeker:myInterviews.scheduledCount', { count: interviews.length }) : t('seeker:myInterviews.none')}
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('seeker:myInterviews.loading')}</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {/* List */}
          {!loading && !error && interviews.length > 0 && (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {interviews.map((app) => {
                const job = app.job
                const iv = app.interview!
                return (
                  <Link
                    key={app.id}
                    href={`/my-applications/${app.id}`}
                    className="block bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                      <div className="flex items-start lg:items-center gap-4 flex-1">
                        <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[24px] font-semibold text-[#236987]">
                            {initials(job?.companyName || job?.title)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold mb-1 sm:mb-2">
                            {job?.title || t('seeker:myApplications.job')}
                          </h3>
                          <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
                            {job?.companyName || t('seeker:jobCard.company')}
                          </p>
                          <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-5">
                            {job?.salaryMin != null || job?.salaryMax != null ? (
                              <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                                <IndianRupee className="w-3 h-3 text-[#3386a9]" />
                                <span className="text-xs text-black">{formatSalary(job?.salaryMin, job?.salaryMax)}</span>
                              </div>
                            ) : null}
                            {job?.location && (
                              <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#3386a9]" />
                                <span className="text-xs text-black">{localizeLocation(job.location)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interview date/time */}
                      <div className="lg:min-w-[280px] border-t lg:border-t-0 lg:border-l border-[#d0e8f0] lg:pl-6 pt-4 lg:pt-0">
                        <div className="flex items-center gap-2 mb-2 text-[#164e65]">
                          <CalendarClock className="w-5 h-5" />
                          <span className="font-semibold">{t('seeker:myInterviews.interview')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-black mb-1">
                          <CalendarClock className="w-4 h-4 text-[#3386a9]" />
                          <span>{formatDate(iv.date) || t('seeker:myInterviews.dateToBeConfirmed')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-black">
                          <Clock className="w-4 h-4 text-[#3386a9]" />
                          <span>{iv.time || t('seeker:myInterviews.timeToBeConfirmed')}</span>
                        </div>
                        {iv.notes && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{iv.notes}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && interviews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 lg:py-24">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <CalendarClock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">
                {t('seeker:myInterviews.emptyTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                {t('seeker:myInterviews.emptyBody')}
              </p>
              <Link
                href="/my-applications"
                className="px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                {t('seeker:myInterviews.viewApplications')}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function MyInterviewsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <MyInterviewsPageContent />
    </ProtectedRoute>
  )
}
