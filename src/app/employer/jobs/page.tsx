'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { employerAPI, ApiError, type EmployerJobTab, type Job } from '@/lib/api'
import {
  isJobAwaitingReview,
  isJobRejected,
  isJobUnderReview,
  canActivateJob,
} from '@/lib/applicationStatus'
import { formatSalary, humanizeJobType, relativeTime, localizeLocation } from '@/lib/jobFormat'
import { myJobsBackUrl } from '@/lib/employerBackNav'
import { MAX_SEARCH_LENGTH, myJobsUrl, parseJobTab, parsePage, parseSearch, withReturnTo } from '@/lib/myJobsNav'
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
  Search,
  X,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { TopUpModal } from '@/components/employer/TopUpModal'
import { showToast } from '@/lib/toast'

const PAGE_SIZE = 10

// How long typing must pause before the search reaches the BE (as on the ledger filters).
const SEARCH_DEBOUNCE_MS = 300

// After a 429 Retry stays disabled this long, as on the dashboard panels: the server's
// limit window is 15 minutes, so asking again at once would only be refused again.
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000

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
  // The title search that is applied (`?q=`). The box below holds what is being typed;
  // it only becomes `search` once it settles.
  const search = parseSearch(searchParams.get('q'))
  const here = myJobsUrl(tab, page, search)
  // Clicking the tab you are already on (page 1) changes nothing, so it adds no history entry.
  const goToTab = (next: EmployerJobTab) => {
    if (next === tab && page === 1) return
    router.push(myJobsUrl(next, 1, search), { scroll: false })
  }
  const goToPage = (next: number) => router.push(myJobsUrl(tab, next, search), { scroll: false })

  // Read when clicked, not in render: sessionStorage does not exist on the server. The
  // link's own href is the dashboard, which is what "open in a new tab" gets.
  const goBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    router.push(myJobsBackUrl())
  }

  const [searchInput, setSearchInput] = useState(search)
  const [composing, setComposing] = useState(false)
  const searchBox = useRef<HTMLInputElement>(null)
  // The last search this page wrote to the URL, so a URL that changed by itself (Back,
  // a pasted link) can be told apart from our own write coming back.
  const pushedSearch = useRef(search)
  useEffect(() => {
    if (search === pushedSearch.current) return
    pushedSearch.current = search
    setSearchInput(search)
  }, [search])
  // Typing settles for 300 ms before it reaches the URL (and so the BE). `replace`, not
  // `push`: a history entry per search would make Back step through every term. A new
  // term goes back to page 1, since a page number from a wider list can be past the end
  // of a narrower one.
  useEffect(() => {
    const next = parseSearch(searchInput)
    // Half-composed text (Indic IME) is not a search yet; this re-runs when it ends.
    if (composing || next === search) return
    const timer = window.setTimeout(() => {
      pushedSearch.current = next
      router.replace(myJobsUrl(tab, 1, next), { scroll: false })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, search, tab, composing, router])
  // Clearing is one deliberate click, so it skips the debounce. Focus goes back to the
  // box, as the clear button (or the empty state's button) is about to disappear.
  const clearSearch = () => {
    setSearchInput('')
    searchBox.current?.focus()
    pushedSearch.current = ''
    router.replace(myJobsUrl(tab, 1), { scroll: false })
  }

  const rejectedTab = tab === 'cancelled'
  // Edit and Delete are for posts still inside their paid window. An expired post is
  // Activate-only (the BE refuses to edit it) and a rejected one is finished.
  const editableTab = tab === 'pending' || tab === 'active' || tab === 'inactive'
  const [jobs, setJobs] = useState<Job[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  // Why the last load failed ('' if it did not). A kind, not text, so the message is
  // translated at render and follows a language change.
  const [error, setError] = useState<'' | 'failed' | 'rateLimited' | 'noAccess'>('')
  const [reloadKey, setReloadKey] = useState(0)
  // True once the Retry cooldown after a 429 is over. Reset on every load, so it is
  // false from the first render of a rate-limited error (Retry never shows enabled).
  const [cooledOff, setCooledOff] = useState(false)
  const coolingDown = error === 'rateLimited' && !cooledOff

  useEffect(() => {
    if (error !== 'rateLimited') return
    const timer = setTimeout(() => setCooledOff(true), RATE_LIMIT_COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [error])
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
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError('')
      setCooledOff(false)
      // A 401, or a 403 PASSWORD_CHANGE_REQUIRED, has already started the central
      // redirect: stay on the spinner rather than flash an error or an empty tab.
      let redirecting = false
      try {
        // The BE splits the tabs itself, so nothing is filtered here.
        const res = await employerAPI.getMyJobs(page, PAGE_SIZE, tab, { signal: controller.signal, search })
        // A body without the list or the page count is a failure, not an empty tab.
        if (!Array.isArray(res?.jobs) || typeof res.pagination?.totalPages !== 'number') {
          throw new Error('Unexpected jobs response')
        }
        if (!ignore && res.jobs.length === 0 && page > res.pagination.totalPages && res.pagination.totalPages > 0) {
          // The last row of this page just went (deleted, paused, moved tab), or a stale
          // ?page= is past the end: jump to the last real page. Only when that is a
          // DIFFERENT page — redirecting to the one already shown would not refetch and
          // would leave the spinner up.
          redirected = true
          router.replace(myJobsUrl(tab, res.pagination.totalPages, search), { scroll: false })
        } else if (!ignore) {
          setJobs(res.jobs)
          setTotalPages(res.pagination.totalPages || 1)
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiError && (err.status === 401 || err.code === 'PASSWORD_CHANGE_REQUIRED')) {
            redirecting = true
          } else if (err instanceof ApiError && err.status === 403) {
            setError('noAccess')
          } else if (err instanceof ApiError && err.status === 429) {
            setError('rateLimited')
          } else {
            setError('failed')
          }
          setJobs([])
        }
      } finally {
        if (!ignore && !redirected && !redirecting) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [tab, page, search, reloadKey, router])

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
          {/* The page the employer came from, else the dashboard (see employerBackNav). */}
          <Link href="/employer" onClick={goBack} className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            <span>{t('buttons.back')}</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobs.title')}</h1>

          <div className="relative mb-6 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              ref={searchBox}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder={t('employer:jobs.searchPlaceholder')}
              aria-label={t('employer:jobs.searchLabel')}
              className="w-full h-11 pl-10 pr-11 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t('employer:jobs.searchClear')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

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
              <p className="text-red-600 mb-4 max-w-md">
                {error === 'noAccess'
                  ? t('employer:dashboard.errors.noAccess')
                  : error === 'rateLimited'
                    ? t('employer:dashboard.errors.rateLimited')
                    : t('employer:jobs.loadFailed')}
              </p>
              {/* A refusal (403) cannot change by asking again, so it gets no Retry. */}
              {error !== 'noAccess' && (
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  disabled={coolingDown}
                  className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary-50"
                >
                  {t('buttons.retry')}
                </button>
              )}
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            // role="status" so a screen reader hears the result of a search.
            <div role="status" className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              {search ? <Search className="w-12 h-12 mb-4 text-gray-300" /> : <Briefcase className="w-12 h-12 mb-4 text-gray-300" />}
              <p className="text-lg font-medium text-black mb-1">
                {t(search ? 'employer:jobs.noSearchTitle' : EMPTY_COPY[tab].title)}
              </p>
              {/* The query is the employer's own text, rendered as a React text node (never as HTML). */}
              <p className="max-w-md mb-6 break-words">
                {search ? t('employer:jobs.noSearchBody', { query: search }) : t(EMPTY_COPY[tab].body)}
              </p>
              {search && (
                <button onClick={clearSearch} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-black">
                  {t('employer:jobs.searchClear')}
                </button>
              )}
              {!search && tab === 'active' && (
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
                // included (a content scan re-queues a live post without taking it down).
                const underReview = tab === 'pending' && isJobUnderReview(job)
                return (
                  <div key={job.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-semibold text-black">{job.title}</h3>
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
                        {/* An expired job is never deactivated. One still marked Active is
                            waiting for the nightly sweep, and the BE ignores Activate on it,
                            so it gets neither button until it turns Inactive. */}
                        {isActive ? (
                          tab !== 'expired' && (
                            <button
                              onClick={() => runAction(() => employerAPI.deactivateJob(job.id), job.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors disabled:opacity-60"
                            >
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />} {t('employer:jobs.deactivate')}
                            </button>
                          )
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
