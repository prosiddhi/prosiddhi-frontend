'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { employerAPI, ApiError, type EmployerApplicationItem } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import {
  Search,
  Bookmark,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

// `filter` is spread into the list request: a pipeline `status`, or the bookmark
// flag (a bookmark is not a status). "All" has none.
type Tab = { key: string; label: string; filter?: { status?: string; isBookmarked?: boolean } }

const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'accepted', label: 'Accepted', filter: { status: 'ACCEPTED' } },
  { key: 'shortlisted', label: 'Shortlisted', filter: { status: 'SHORTLISTED' } },
  { key: 'rejected', label: 'Rejected', filter: { status: 'REJECTED' } },
  { key: 'bookmarked', label: 'Bookmarked', filter: { isBookmarked: true } },
]

// After a 429 Retry stays disabled this long, as on the dashboard panels: the server's
// limit window is 15 minutes, so asking again at once would only be refused again.
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000

const PAGE_SIZE = 50

function CandidatesContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId') ?? undefined

  const [tabKey, setTabKey] = useState('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<EmployerApplicationItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  // The page belongs to the filters it was chosen under (tab, search, job). When any of
  // them changes, the page is reset to 1 right here during render (React's supported
  // way to adjust state when an input changes): React re-renders at once with the new
  // state and the effect below sees only the settled value, so a filter change makes
  // one request, and coming back to an earlier filter starts at page 1, not where that
  // filter was left. `page` reads 1 for the pass that triggers the reset.
  const filterKey = `${tabKey}\u0000${search}\u0000${jobId ?? ''}`
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  if (pageState.key !== filterKey) setPageState({ key: filterKey, page: 1 })
  const page = pageState.key === filterKey ? pageState.page : 1
  const [loading, setLoading] = useState(true)
  // Why the last load failed ('' if it did not). A kind, not text, so the message is
  // translated at render and follows a language change.
  const [error, setError] = useState<'' | 'failed' | 'rateLimited' | 'noAccess'>('')
  const [reloadKey, setReloadKey] = useState(0)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  // True once the Retry cooldown after a 429 is over. Reset on every load, so it is
  // false from the first render of a rate-limited error (Retry never shows enabled).
  const [cooledOff, setCooledOff] = useState(false)
  const coolingDown = error === 'rateLimited' && !cooledOff

  useEffect(() => {
    if (error !== 'rateLimited') return
    const timer = setTimeout(() => setCooledOff(true), RATE_LIMIT_COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [error])

  const activeTab = TABS.find((t) => t.key === tabKey)

  // The results area swaps between the spinner, an error, "no candidates",
  // and the list in one React commit (e.g. a tab with results -> an empty
  // tab). CSS can't transition to/from `auto` height, so measure the box
  // before and after that commit and animate between the two pixel heights
  // instead of letting it snap — that snap is what forces the browser to
  // clamp scroll position.
  const resultsRef = useRef<HTMLDivElement>(null)
  const previousResultsHeightRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = resultsRef.current
    if (!el) return
    const newHeight = el.scrollHeight
    const oldHeight = previousResultsHeightRef.current
    previousResultsHeightRef.current = newHeight

    if (oldHeight === null || oldHeight === newHeight) return

    el.style.overflow = 'hidden'
    el.style.height = `${oldHeight}px`
    el.getBoundingClientRect()
    el.style.transition = 'height 200ms ease'
    el.style.height = `${newHeight}px`

    const clear = () => {
      el.style.transition = ''
      el.style.height = ''
      el.style.overflow = ''
    }
    el.addEventListener('transitionend', clear, { once: true })
    return () => el.removeEventListener('transitionend', clear)
  }, [loading, error, items])

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError('')
      setCooledOff(false)
      // A 401, or a 403 PASSWORD_CHANGE_REQUIRED, has already started the central
      // redirect: stay on the spinner rather than flash an error or "no candidates".
      let redirecting = false
      let pageChanged = false
      try {
        const res = await employerAPI.getEmployerAllApplications(
          {
            page,
            limit: PAGE_SIZE,
            jobId,
            ...activeTab?.filter,
            search: search || undefined,
          },
          { signal: controller.signal }
        )
        // A body without the list, the total or the page count is a failure, not an
        // empty result.
        if (
          !Array.isArray(res?.applications) ||
          typeof res.pagination?.total !== 'number' ||
          typeof res.pagination?.totalPages !== 'number'
        ) {
          throw new Error('Unexpected applications response')
        }
        if (!ignore && res.applications.length === 0 && page > res.pagination.totalPages && page > 1) {
          // This page no longer exists (rows were removed since it was opened): go to
          // the last real page. Only when the page really is past the end: the BE counts
          // and lists in two parallel queries, so an empty page with totalPages >= page
          // is possible, and "correcting" to the same page would not reload and would
          // leave the spinner up. Here the target is always a different page, so the
          // load runs again and the spinner stays until it does.
          pageChanged = true
          setPageState({ key: filterKey, page: Math.max(1, res.pagination.totalPages) })
        } else if (!ignore) {
          setItems(res.applications)
          setTotal(res.pagination.total)
          setTotalPages(Math.max(1, res.pagination.totalPages))
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
          setItems([])
        }
      } finally {
        if (!ignore && !redirecting && !pageChanged) {
          setLoading(false)
          setHasLoadedOnce(true)
        }
      }
    }
    run()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [activeTab, search, jobId, filterKey, page, reloadKey])

  const goToPage = (next: number) => {
    setPageState({ key: filterKey, page: next })
    // The pager sits under up to 50 rows; bring the new page's first row into view.
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">{t('employer:candidates.title')}</h1>
          {/* Fixed-height slot: the count text must never unmount during a
              tab/search refetch, or its height collapses and the page jumps. */}
          <div className="h-5 sm:h-6 mb-6">
            {hasLoadedOnce && !error && (
              <p className="text-sm sm:text-base text-[#717182]">{jobId ? t('employer:candidates.countForJob', { count: total }) : t('employer:candidates.count', { count: total })}</p>
            )}
            {!hasLoadedOnce && (
              <div className="h-4 sm:h-[18px] w-40 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
            )}
          </div>

          {/* Search */}
          <div className="flex gap-3 mb-6 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearch(searchDraft.trim())}
                placeholder={t('employer:candidates.searchPlaceholder')}
                className="w-full h-11 pl-10 pr-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
            <button onClick={() => setSearch(searchDraft.trim())} className="h-11 px-5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm">
              {t('employer:candidates.search')}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-3 mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTabKey(tab.key)}
                className={`px-3 sm:px-5 py-3 text-sm sm:text-base font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  tabKey === tab.key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {t(`employer:candidates.tabs.${tab.key}`)}
              </button>
            ))}
          </div>

          <div ref={resultsRef}>
            {loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
                <p>{t('employer:candidates.loading')}</p>
              </div>
            )}

            {!loading && error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <p className="text-red-600 mb-4 max-w-md">
                  {error === 'noAccess'
                    ? t('employer:dashboard.errors.noAccess')
                    : error === 'rateLimited'
                      ? t('employer:dashboard.errors.rateLimited')
                      : t('employer:candidates.loadFailed')}
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

            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
                <Users className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-lg font-medium text-black mb-1">{t('employer:candidates.noneTitle')}</p>
                <p className="max-w-md">{search ? t('employer:candidates.noneSearch') : t('employer:candidates.noneDefault')}</p>
              </div>
            )}

            {items.length > 0 && (
              <div className={`space-y-3 sm:space-y-4 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {items.map((app) => {
                  const meta = statusMeta(app.status)
                  const seeker = app.jobSeeker
                  return (
                    <Link
                      key={app.id}
                      href={`/employer/candidates/${app.id}`}
                      className="block bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-[#236987]">{initials(seeker?.fullName)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-black truncate">{seeker?.fullName || t('employer:candidates.applicantFallback')}</p>
                          <p className="text-sm text-[#717182] truncate">{app.job?.title}</p>
                          {seeker?.location && (
                            <p className="text-xs text-[#717182] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {seeker.location}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            {app.isBookmarked && (
                              <Bookmark
                                className="w-4 h-4 fill-primary-50 text-primary-50"
                                aria-label={t('employer:candidateDetail.bookmarked')}
                              />
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                          </div>
                          <span className="text-xs text-[#717182]">{relativeTime(app.appliedAt)}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Pagination — same look as My Jobs. Buttons are disabled while a page loads,
                so a second click cannot race the first. */}
            {!error && items.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
                <button
                  disabled={loading || page <= 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {totalPages <= 10 ? (
                  Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      disabled={loading}
                      onClick={() => goToPage(i + 1)}
                      className={`w-11 h-11 flex items-center justify-center rounded text-base transition-colors disabled:cursor-not-allowed ${
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
                  disabled={loading || page >= totalPages}
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CandidatesPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <Suspense fallback={<div className="min-h-screen bg-[#f7fbfd]" />}>
        <CandidatesContent />
      </Suspense>
    </ProtectedRoute>
  )
}
