'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { jobSeekerAPI, resolveMediaUrl, type Application } from '@/lib/api'
import { humanizeJobType, formatSalary, relativeTime, initials, formatDate } from '@/lib/jobFormat'
import { statusMeta, canWithdraw } from '@/lib/applicationStatus'
import {
  Mail,
  Bell,
  Home,
  Briefcase,
  Bookmark,
  Languages,
  Clock,
  MapPin,
  IndianRupee,
  ChevronLeft,
  CalendarClock,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react'

function ApplicationDetailsContent() {
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
          setError(err instanceof Error ? err.message : 'Failed to load this application.')
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
  }, [applicationId, reloadKey])

  const handleWithdraw = async () => {
    if (!application || withdrawing) return
    if (!window.confirm('Withdraw this application? This cannot be undone.')) return
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await jobSeekerAPI.withdrawApplication(application.id)
      setApplication((prev) => (prev ? { ...prev, status: 'WITHDRAWN' } : prev))
    } catch (err) {
      // Surface the BE guard message (e.g. "Cannot withdraw an accepted application").
      setWithdrawError(err instanceof Error ? err.message : 'Could not withdraw. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const job = application?.job
  const meta = statusMeta(application?.status)
  const audioSrc = resolveMediaUrl(application?.audioUrl)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt="Job Portal Logo" fill className="object-contain" priority />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Home</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Job Feed</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Saved Jobs</span>
            </Link>
            <button className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Languages className="w-[16px] h-[16px]" />
              <span className="text-[18px]">Languages: English</span>
            </button>
          </nav>

          {/* Right side - User profile */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <button className="hidden sm:block hover:text-primary-50 transition-colors">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button className="hidden sm:block hover:text-primary-50 transition-colors">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6 sm:mb-8 lg:mb-10"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base sm:text-lg">Back</span>
          </button>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading application...</p>
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
                Retry
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
                        {job?.title || 'Job'}
                      </h1>
                      <p className="text-base sm:text-lg lg:text-[18px] text-black mb-4 sm:mb-5">
                        {job?.companyName || 'Company'}
                      </p>

                      {/* Salary */}
                      <div className="flex items-center gap-1 mb-4 sm:mb-5">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-base sm:text-lg lg:text-[18px] font-medium">
                          {formatSalary(job?.salaryMin, job?.salaryMax)} / Month
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
                      Applied {relativeTime(application.appliedAt)}
                    </span>
                    <span className={`px-6 py-3 rounded-lg flex items-center justify-center min-w-[140px] text-sm sm:text-base font-medium ${meta.pill}`}>
                      {meta.label}
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
                      <h2 className="text-lg sm:text-xl font-semibold text-[#164e65]">Interview Scheduled</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Date</p>
                        <p className="text-sm sm:text-base font-medium text-black">
                          {formatDate(application.interview.date) || 'To be confirmed'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Time</p>
                        <p className="text-sm sm:text-base font-medium text-black">
                          {application.interview.time || 'To be confirmed'}
                        </p>
                      </div>
                    </div>
                    {application.interview.notes && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-0.5">Notes from the employer</p>
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
                  Your Application
                </h2>
                {application.message ? (
                  <p className="text-sm sm:text-base lg:text-[16px] leading-relaxed text-black whitespace-pre-line mb-4">
                    {application.message}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-[#717182] mb-4">No cover message was submitted.</p>
                )}
                {audioSrc && (
                  <div>
                    <p className="text-sm font-medium text-black mb-2">Voice message</p>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={audioSrc} className="w-full max-w-md" />
                  </div>
                )}
              </section>

              {/* Job Description (real data) */}
              {job?.description && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">
                    Job Description
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
                  View Job
                </Link>
                {canWithdraw(application.status) && (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="px-6 sm:px-8 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
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
