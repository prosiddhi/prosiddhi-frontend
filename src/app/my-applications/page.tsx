'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { jobSeekerAPI, type Application } from '@/lib/api'
import { humanizeJobType, formatSalary, relativeTime, initials } from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import {
  Home,
  Briefcase,
  Bookmark,
  Clock,
  MapPin,
  IndianRupee,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from 'lucide-react'

const PAGE_SIZE = 10

function MyApplicationsPageContent() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getMyApplications(page, PAGE_SIZE)
        if (!ignore) {
          setItems(res.applications)
          setTotal(res.pagination.total)
          setTotalPages(res.pagination.totalPages || 1)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('seeker:myApplications.loadError'))
          setItems([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [page, reloadKey, t])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image
                src="/assets/logo.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Navigation */}
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

          {/* Right side - User profile */}
          <HeaderActions />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
                {t('seeker:myApplications.title')}
              </h1>
              {!loading && !error && (
                <p className="text-sm sm:text-base text-[#717182]">{t('seeker:myApplications.count', { count: total })}</p>
              )}
            </div>
            <Link
              href="/my-interviews"
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-50 text-primary-50 rounded-lg hover:bg-[#f0f9fc] transition-colors text-sm sm:text-base self-start"
            >
              <CalendarClock className="w-4 h-4" />
              {t('seeker:myApplications.myInterviews')}
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('seeker:myApplications.loading')}</p>
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

          {/* Applied Jobs List */}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {items.map((app) => {
                const job = app.job
                const meta = statusMeta(app.status)
                return (
                  <div
                    key={app.id}
                    className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                      {/* Company Logo */}
                      <div className="flex items-start lg:items-center gap-4 flex-1">
                        <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[24px] font-semibold text-[#236987]">
                            {initials(job?.companyName || job?.title)}
                          </span>
                        </div>

                        {/* Job Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold mb-1 sm:mb-2">
                            {job?.title || t('seeker:myApplications.job')}
                          </h3>
                          <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
                            {job?.companyName || t('seeker:jobCard.company')}
                          </p>

                          {/* Salary */}
                          <div className="flex items-center gap-1 mb-3 sm:mb-4">
                            <IndianRupee className="w-4 h-4" />
                            <span className="text-xs sm:text-sm lg:text-[14px]">
                              {t('seeker:jobCard.perMonth', { salary: formatSalary(job?.salaryMin, job?.salaryMax) })}
                            </span>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-5">
                            {job?.jobType && (
                              <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#3386a9]" />
                                <span className="text-xs text-black">{humanizeJobType(job.jobType)}</span>
                              </div>
                            )}
                            {job?.category && (
                              <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                                <Briefcase className="w-3 h-3 text-[#3386a9]" />
                                <span className="text-xs text-black">{job.category}</span>
                              </div>
                            )}
                            {job?.location && (
                              <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#3386a9]" />
                                <span className="text-xs text-black">{job.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Time and Actions */}
                      <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                        <span className="text-sm sm:text-base text-black">
                          {relativeTime(app.appliedAt)}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto">
                          <span className={`px-4 py-3 rounded-lg flex items-center justify-center min-w-[140px] text-sm sm:text-base font-medium ${meta.pill}`}>
                            {t(`seeker:status.${app.status ?? 'UNKNOWN'}`, { defaultValue: meta.label })}
                          </span>
                          <Link
                            href={`/my-applications/${app.id}`}
                            className="px-4 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base text-center"
                          >
                            {t('buttons.viewDetails')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 lg:py-24">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">
                {t('seeker:myApplications.emptyTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                {t('seeker:myApplications.emptyBody')}
              </p>
              <Link
                href="/job-feed"
                className="px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                {t('seeker:myApplications.browseJobs')}
              </Link>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && items.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {totalPages <= 10 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-base transition-colors ${
                      page === i + 1 ? 'bg-primary-50 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))
              ) : (
                <span className="px-3 text-sm text-[#717182]">{t('seeker:jobFeed.pageOf', { page, total: totalPages })}</span>
              )}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function MyApplicationsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <MyApplicationsPageContent />
    </ProtectedRoute>
  )
}
