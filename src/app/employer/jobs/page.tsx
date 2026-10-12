'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { employerAPI, ApiError, type EmployerJobTab, type Job } from '@/lib/api'
import {
  jobStatusMeta,
  isJobAwaitingReview,
  isJobRejected,
  isJobUnderReview,
  canActivateJob,
} from '@/lib/applicationStatus'
import { formatSalary, humanizeJobType, relativeTime, localizeLocation } from '@/lib/jobFormat'
import { myJobsUrl, parseJobTab, parsePage, withReturnTo } from '@/lib/myJobsNav'
import {
  Plus,
  MapPin,
  IndianRupee,
  Clock,
  Users,
  Eye,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Loader2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { TopUpModal } from '@/components/employer/TopUpModal'
import { showToast } from '@/lib/toast'

const PAGE_SIZE = 10

// What an empty tab says. Literal keys, so they stay greppable. `cancelled` is what an
// admin rejection leaves behind, and is shown to the employer as "Rejected".
const EMPTY_COPY: Record<EmployerJobTab, { title: string; body: string }> = {
  pending: { title: 'employer:jobs.noPendingTitle', body: 'employer:jobs.noPendingBody' },
  active: { title: 'employer:jobs.noActiveTitle', body: 'employer:jobs.noActiveBody' },
  inactive: { title: 'employer:jobs.noInactiveTitle', body: 'employer:jobs.noInactiveBody' },
  expired: { title: 'employer:jobs.noExpiredTitle', body: 'employer:jobs.noExpiredBody' },
  cancelled: { title: 'employer:jobs.noRejectedTitle', body: 'employer:jobs.noRejectedBody' },
}

function MyJobsContent() {
  const { t } = useTranslation()
  const router = useRouter()

  // Tab and page live in the URL so refresh, Back and a shared link land where the
  // employer was, and View / Edit can return here. Anything that is not a known tab /
  // positive integer falls back to Active / page 1, as the BE does for an unknown tab.
  const searchParams = useSearchParams()
  const tab = parseJobTab(searchParams.get('tab'))
  const page = parsePage(searchParams.get('page'))
  const here = myJobsUrl(tab, page)
  // Clicking the tab you are already on (page 1) changes nothing, so it adds no history entry.
  const goToTab = (next: EmployerJobTab) => {
    if (next === tab && page === 1) return
    router.push(myJobsUrl(next, 1), { scroll: false })
  }
  const goToPage = (next: number) => router.push(myJobsUrl(tab, next), { scroll: false })

  const rejectedTab = tab === 'cancelled'
  // Edit and Delete are for posts still inside their paid window. An expired post is
  // Activate-only (the BE refuses to edit it) and a rejected one is finished.
  const editableTab = tab === 'pending' || tab === 'active' || tab === 'inactive'
  const [jobs, setJobs] = useState<Job[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [actioningId, setActioningId] = useState<string | null>(null)
  // Transient success notice (e.g. "1 post credit refunded" after a delete).
  const [notice, setNotice] = useState('')
  // Re-listing an expired job with no post credits left opens the top-up pop-up.
  const [topUp, setTopUp] = useState(false)
  // Five tabs overflow a phone, so the selected one is scrolled into view.
  const tabButtons = useRef<Partial<Record<EmployerJobTab, HTMLButtonElement | null>>>({})

  useEffect(() => {
    tabButtons.current[tab]?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [tab])

  useEffect(() => {
    let ignore = false
    let redirected = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // The BE splits the tabs itself, so nothing is filtered here.
        const res = await employerAPI.getMyJobs(page, PAGE_SIZE, tab)
        if (!ignore && res.jobs.length === 0 && page > res.pagination.totalPages && res.pagination.totalPages > 0) {
          // The last row of this page just went (deleted, paused, moved tab), or a stale
          // ?page= is past the end: jump to the last real page. Only when that is a
          // DIFFERENT page — redirecting to the one already shown would not refetch and
          // would leave the spinner up.
          redirected = true
          router.replace(myJobsUrl(tab, res.pagination.totalPages), { scroll: false })
        } else if (!ignore) {
          setJobs(res.jobs)
          setTotalPages(res.pagination.totalPages || 1)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('employer:jobs.loadFailed'))
          setJobs([])
        }
      } finally {
        if (!ignore && !redirected) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [tab, page, reloadKey, router])

  // Auto-dismiss the transient success notice.
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const runAction = async (fn: () => Promise<unknown>, id: string) => {
    if (actioningId) return
    setActioningId(id)
    try {
      await fn()
      setReloadKey((k) => k + 1)
    } catch (err) {
      // Only re-listing can be refused for credits (402). Offer the top-up
      // instead of a toast that says "no credits" and leaves the employer stuck.
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_POST_CREDITS') {
        setTopUp(true)
      } else {
        showToast(err instanceof Error ? err.message : t('employer:jobs.actionFailed'), 'error')
      }
    } finally {
      setActioningId(null)
    }
  }

  const handleActivate = (job: Job) => {
    // Re-listing a job whose paid window has ended spends 1 Job Post, so ask
    // first. The Expired tab is exactly those jobs — the BE picks it with the same
    // test it bills on, so we do not re-test on the device clock. Resuming a job
    // still inside its window (Inactive tab) is free: no prompt.
    if (tab === 'expired' && !window.confirm(t('employer:jobs.confirmRelist'))) return
    runAction(() => employerAPI.activateJob(job.id), job.id)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('employer:jobs.confirmDelete'))) return
    if (actioningId) return
    setActioningId(id)
    setNotice('')
    try {
      const res = await employerAPI.deleteJob(id)
      // BE refunds 1 POST credit iff <24h old + 0 applications — confirm it.
      if (res?.refunded) setNotice(t('employer:jobs.creditRefunded'))
      setReloadKey((k) => k + 1)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('employer:jobs.actionFailed'), 'error')
    } finally {
      setActioningId(null)
    }
  }

  const tabs: { key: EmployerJobTab; label: string }[] = [
    { key: 'pending', label: t('employer:jobs.tabs.pending') },
    { key: 'active', label: t('employer:jobs.tabs.active') },
    { key: 'inactive', label: t('employer:jobs.tabs.inactive') },
    { key: 'expired', label: t('employer:jobs.tabs.expired') },
    { key: 'cancelled', label: t('employer:jobs.tabs.rejected') },
  ]

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobs.title')}</h1>

          {notice && (
            <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 sm:gap-3 mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.key}
                ref={(el) => {
                  tabButtons.current[tabItem.key] = el
                }}
                aria-current={tab === tabItem.key ? 'page' : undefined}
                onClick={() => goToTab(tabItem.key)}
                className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === tabItem.key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:jobs.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              <Briefcase className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{t(EMPTY_COPY[tab].title)}</p>
              <p className="max-w-md mb-6">{t(EMPTY_COPY[tab].body)}</p>
              {tab === 'active' && (
                <Link href="/employer/jobs/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm">
                  <Plus className="w-4 h-4" /> {t('employer:jobs.postJob')}
                </Link>
              )}
            </div>
          )}

          {!loading && !error && jobs.length > 0 && (
            <div className="space-y-4 sm:space-y-5">
              {jobs.map((job) => {
                const busy = actioningId === job.id
                const isActive = job.status === 'ACTIVE'
                const awaitingReview = isJobAwaitingReview(job)
                const rejected = isJobRejected(job)
                // In the Pending Review tab every row is waiting for an admin — a live one
                // included (a content scan re-queues a live post without taking it down), and
                // `jobStatusMeta` would call that one plain "Active".
                const underReview = tab === 'pending' && isJobUnderReview(job)
                const badge = underReview
                  ? { label: t('employer:jobs.underReview'), pill: 'bg-amber-50 text-amber-700' }
                  : jobStatusMeta(job)
                return (
                  <div key={job.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-semibold text-black">{job.title}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.pill}`}>{badge.label}</span>
                        </div>
                        {awaitingReview && (
                          <p className="text-sm text-amber-700 mb-2">{t('employer:jobs.awaitingReviewHint')}</p>
                        )}
                        {underReview && isActive && (
                          <p className="text-sm text-amber-700 mb-2">{t('employer:jobs.underReviewLiveHint')}</p>
                        )}
                        {rejected && (
                          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <p className="font-medium">{t('employer:jobs.rejectionReason')}</p>
                            <p className="mt-0.5 whitespace-pre-wrap break-words">
                              {job.moderationNotes?.trim() || t('employer:jobs.rejectionReasonMissing')}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#717182]">
                          <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
                          {job.jobType && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{humanizeJobType(job.jobType)}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{localizeLocation(job.location)}</span>}
                          {typeof job.viewCount === 'number' && <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{t('employer:jobs.views', { count: job.viewCount })}</span>}
                        </div>
                        <p className="text-xs text-[#9a9aa5] mt-2">{t('employer:jobs.posted', { time: relativeTime(job.createdAt) })}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* An expired job can still be viewed and its applicants read;
                            only editing and deleting are limited to posts still inside
                            their paid window. A rejected job gets View only. */}
                        {!rejectedTab && (
                          <Link href={`/employer/candidates?jobId=${job.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            <Users className="w-4 h-4" /> {t('employer:jobs.candidates')}
                          </Link>
                        )}
                        <Link href={withReturnTo(`/employer/jobs/${job.id}`, here)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                          <Eye className="w-4 h-4" /> {t('employer:jobs.view')}
                        </Link>
                        {/* Edit is hidden for a rejected post (the BE refuses it); Delete is not —
                            the BE lets an employer delete any of their own posts. */}
                        {editableTab && !rejected && (
                          <Link href={withReturnTo(`/employer/jobs/${job.id}/edit`, here)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            <Pencil className="w-4 h-4" /> {t('employer:jobs.edit')}
                          </Link>
                        )}
                        {isActive ? (
                          <button
                            onClick={() => runAction(() => employerAPI.deactivateJob(job.id), job.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />} {t('employer:jobs.deactivate')}
                          </button>
                        ) : !rejectedTab && canActivateJob(job) && (
                          <button
                            onClick={() => handleActivate(job)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50 transition-colors disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} {t('employer:jobs.activate')}
                          </button>
                        )}
                        {editableTab && (
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
                          >
                            <Trash2 className="w-4 h-4" /> {t('employer:jobs.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && jobs.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
              <button
                disabled={page <= 1}
                onClick={() => goToPage(Math.max(1, page - 1))}
                className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {totalPages <= 10 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i + 1)}
                    className={`w-11 h-11 flex items-center justify-center rounded text-base transition-colors ${
                      page === i + 1 ? 'bg-primary-50 text-primary-100' : 'hover:bg-gray-100'
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
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {topUp && <TopUpModal onClose={() => setTopUp(false)} />}
    </div>
  )
}

export default function MyJobsPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      {/* useSearchParams needs a Suspense boundary for the production build */}
      <Suspense>
        <MyJobsContent />
      </Suspense>
    </ProtectedRoute>
  )
}
