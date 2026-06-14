'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { jobSeekerAPI, type SavedJobItem } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { InlineError } from '@/components/feedback/InlineError'
import { humanizeJobType, formatSalary, relativeTime, initials } from '@/lib/jobFormat'
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
  BookmarkCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const PAGE_SIZE = 10

function SavedJobsPageContent() {
  const [items, setItems] = useState<SavedJobItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // Jobs whose unsave is mid-flight — disables the button to prevent double-fire.
  const [removing, setRemoving] = useState<Set<string>>(new Set())

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getSavedJobs(page, PAGE_SIZE)
        if (!ignore) {
          setItems(res.savedJobs)
          setTotal(res.pagination.total)
          setTotalPages(res.pagination.totalPages || 1)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load saved jobs. Please try again.')
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
  }, [page, reloadKey])

  const handleUnsave = useCallback(
    async (jobId: string) => {
      if (removing.has(jobId)) return
      setRemoving((prev) => new Set(prev).add(jobId))
      // Optimistic removal — keep a copy so we can restore on failure.
      const prevItems = items
      const prevTotal = total
      setItems((list) => list.filter((it) => it.jobId !== jobId))
      setTotal((t) => Math.max(0, t - 1))
      try {
        await jobSeekerAPI.unsaveJob(jobId)
        // If that was the last row on a non-first page, step back so the user
        // lands on a populated page rather than a blank one (re-fetches via effect).
        if (prevItems.length === 1 && page > 1) setPage((p) => p - 1)
      } catch (err) {
        // Revert on failure and surface a non-destructive toast (keeps the list
        // visible rather than replacing the page with the load-error block).
        setItems(prevItems)
        setTotal(prevTotal)
        showToast(
          err instanceof Error ? err.message : 'Could not remove this job. Please try again.',
          'error'
        )
      } finally {
        setRemoving((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    },
    [items, total, page, removing]
  )

  const countLabel = total > 0 ? String(total).padStart(2, '0') : '00'

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
                alt="Job Portal Logo"
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
              <span className="text-[18px]">Home</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Job Feed</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-primary-50">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px] font-medium">Saved Jobs</span>
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
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
              Saved Jobs by you
            </h1>
            {!loading && !error && (
              <p className="text-sm sm:text-base text-[#717182]">{countLabel} Job saved</p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading saved jobs...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <InlineError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          )}

          {/* Saved Jobs List */}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {items.map(({ id, jobId, job }) => (
                <div
                  key={id}
                  className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                    {/* Company Logo */}
                    <div className="flex items-start lg:items-center gap-4 flex-1">
                      <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-[24px] font-semibold text-[#236987]">
                          {initials(job.companyName || job.title)}
                        </span>
                      </div>

                      {/* Job Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold mb-1 sm:mb-2">
                          {job.title}
                        </h3>
                        <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
                          {job.companyName || 'Company'}
                        </p>

                        {/* Salary */}
                        <div className="flex items-center gap-1 mb-3 sm:mb-4">
                          <IndianRupee className="w-4 h-4" />
                          <span className="text-xs sm:text-sm lg:text-[14px]">
                            {formatSalary(job.salaryMin, job.salaryMax)} / Month
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-5">
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
                              <span className="text-xs text-black">{job.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Time and Actions */}
                    <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                      <span className="text-sm sm:text-base text-black">
                        {relativeTime(job.createdAt)}
                      </span>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                        <button
                          onClick={() => handleUnsave(jobId)}
                          disabled={removing.has(jobId)}
                          className="px-4 py-3 bg-[#eeeeee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors min-w-[140px] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {removing.has(jobId) ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <BookmarkCheck className="w-5 h-5" />
                          )}
                          <span className="text-sm sm:text-base">{removing.has(jobId) ? 'Removing...' : 'Saved'}</span>
                        </button>
                        <Link
                          href={`/job-details/${jobId}`}
                          className="px-4 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base text-center"
                        >
                          View the Job
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 lg:py-24">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Bookmark className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">
                No Saved Jobs Yet
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                Start browsing jobs and save the ones you&apos;re interested in to view them here.
              </p>
              <Link
                href="/job-feed"
                className="px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                Browse Jobs
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
                <span className="px-3 text-sm text-[#717182]">Page {page} of {totalPages}</span>
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

export default function SavedJobsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <SavedJobsPageContent />
    </ProtectedRoute>
  )
}
