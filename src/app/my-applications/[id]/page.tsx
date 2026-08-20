'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { jobSeekerAPI, type Application } from '@/lib/api'
import { humanizeJobType, formatSalary, formatSalaryLine, relativeTime, initials, formatDate } from '@/lib/jobFormat'
import { statusMeta, canWithdraw } from '@/lib/applicationStatus'
import {
  Home,
  Briefcase,
  Bookmark,
  Clock,
  MapPin,
  IndianRupee,
  ChevronLeft,
  CalendarClock,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { HeaderActions } from '@/components/navigation/HeaderActions'

function ApplicationDetailsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const applicationId = Array.isArray(params.id) ? params.id[0] : (params.id as string)

  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getApplicationById(applicationId)
        if (!ignore) setApplication(res)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('seeker:applicationDetail.loadError'))
          setApplication(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (applicationId) run()
    return () => {
      ignore = true
    }
  }, [applicationId, reloadKey, t])

  const handleWithdraw = async () => {
    if (!application || withdrawing) return
    if (!window.confirm(t('seeker:applicationDetail.withdrawConfirm'))) return
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await jobSeekerAPI.withdrawApplication(application.id)
      setApplication((prev) => (prev ? { ...prev, status: 'WITHDRAWN' } : prev))
    } catch (err) {
      // Surface the BE guard message (e.g. "Cannot withdraw an accepted application").
      setWithdrawError(err instanceof Error ? err.message : t('seeker:applicationDetail.withdrawError'))
    } finally {
      setWithdrawing(false)
    }
  }

  const job = application?.job
  const meta = statusMeta(application?.status)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center min-h-[44px]">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
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

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6 sm:mb-8 lg:mb-10"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base sm:text-lg">{t('seeker:applicationDetail.back')}</span>
          </button>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('seeker:applicationDetail.loading')}</p>
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

          {!loading && !error && application && (
            <>
              {/* Job Header Card */}
              <div className="bg-white rounded-[10px] mb-8 sm:mb-10 lg:mb-12">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
                  {/* Left Side - Job Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[32px] sm:text-[40px] font-semibold text-[#236987]">
                        {initials(job?.companyName || job?.title)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold mb-2 sm:mb-3">
                        {job?.title || t('seeker:myApplications.job')}
                      </h1>
                      <p className="text-base sm:text-lg lg:text-[18px] text-black mb-4 sm:mb-5">
                        {job?.companyName || t('seeker:jobCard.company')}
                      </p>

                      {/* Salary */}
                      <div className="flex items-center gap-1 mb-4 sm:mb-5">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-base sm:text-lg lg:text-[18px] font-medium">
                          {formatSalaryLine(job?.salaryMin, job?.salaryMax)}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {job?.jobType && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{humanizeJobType(job.jobType)}</span>
                          </div>
                        )}
                        {job?.category && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{job.category}</span>
                          </div>
                        )}
                        {job?.location && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{job.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Status */}
                  <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                    <span className="text-sm sm:text-base text-black">
                      {t('seeker:applicationDetail.appliedRelative', { time: relativeTime(application.appliedAt) })}
                    </span>
                    <span className={`px-6 py-3 rounded-lg flex items-center justify-center min-w-[140px] text-sm sm:text-base font-medium ${meta.pill}`}>
                      {t(`seeker:status.${application.status ?? 'UNKNOWN'}`, { defaultValue: meta.label })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interview Details (PJP-153) — shown once an employer schedules.
                  Reads application.interview (populated by BR-4; see docs/be-requests.md#br-4). */}
              {application.interview && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <div className="border border-[#d0e8f0] bg-[#f0f9fc] rounded-[10px] p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarClock className="w-5 h-5 text-[#236987]" />
                      <h2 className="text-lg sm:text-xl font-semibold text-[#164e65]">{t('seeker:applicationDetail.interviewScheduled')}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">{t('seeker:applicationDetail.date')}</p>
                        <p className="text-sm sm:text-base font-medium text-black">
                          {formatDate(application.interview.date) || t('seeker:applicationDetail.toBeConfirmed')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">{t('seeker:applicationDetail.time')}</p>
                        <p className="text-sm sm:text-base font-medium text-black">
                          {application.interview.time || t('seeker:applicationDetail.toBeConfirmed')}
                        </p>
                      </div>
                    </div>
                    {application.interview.notes && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-0.5">{t('seeker:applicationDetail.notesFromEmployer')}</p>
                        <p className="text-sm sm:text-base text-black whitespace-pre-line">
                          {application.interview.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Your Application */}
              <section className="mb-8 sm:mb-10 lg:mb-12">
                <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">
                  {t('seeker:applicationDetail.yourApplication')}
                </h2>
                {application.message ? (
                  <p className="text-sm sm:text-base lg:text-[16px] leading-relaxed text-black whitespace-pre-line mb-4">
                    {application.message}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-[#717182] mb-4">{t('seeker:applicationDetail.noCoverMessage')}</p>
                )}
              </section>

              {/* Job Description (real data) */}
              {job?.description && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">
                    {t('seeker:applicationDetail.jobDescription')}
                  </h2>
                  <p className="text-sm sm:text-base lg:text-[16px] leading-relaxed text-black whitespace-pre-line">
                    {job.description}
                  </p>
                </section>
              )}

              {/* Withdraw guard error */}
              {withdrawError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 lg:mb-20">
                <Link
                  href={`/job-details/${application.jobId}`}
                  className="px-6 sm:px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Briefcase className="w-5 h-5" />
                  {t('seeker:applicationDetail.viewJob')}
                </Link>
                {canWithdraw(application.status) && (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="px-6 sm:px-8 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    {withdrawing ? t('seeker:applicationDetail.withdrawing') : t('seeker:applicationDetail.withdraw')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function ApplicationDetailsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <ApplicationDetailsContent />
    </ProtectedRoute>
  )
}
