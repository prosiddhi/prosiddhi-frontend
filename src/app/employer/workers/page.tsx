'use client'

// Candidate database search (Phase 2, EPIC B). Employers search the seeker pool
// via FTS (GET /api/employers/search/workers) and see snippet results with NO
// contact. Opening a candidate (→ /employer/workers/:id) is where an unlock
// (1 DOWNLOAD credit) can happen. Contact never appears in search results.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  candidateAPI,
  employerAPI,
  type WorkerSnippet,
  type WorkerSearchPage,
  type UnlockedCandidate,
  type UnlockedCandidatesPage,
} from '@/lib/api'
import { initials, relativeTime } from '@/lib/jobFormat'
import {
  Search,
  MapPin,
  Users,
  Briefcase,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Unlock,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

type Tab = 'search' | 'unlocked'

const PAGE_SIZE = 12
const MIN_QUERY = 2

function WorkerCard({ w }: { w: WorkerSnippet }) {
  const { t } = useTranslation()
  const skills = w.skills?.map((s) => s.skill?.name).filter(Boolean).slice(0, 4) ?? []
  return (
    <Link
      href={`/employer/workers/${w.id}`}
      className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-base font-semibold text-[#236987]">{initials(w.fullName)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-black truncate">{w.fullName}</h3>
          {w.preferredJobTitle && (
            <p className="text-sm text-[#717182] truncate">{w.preferredJobTitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-3 text-sm text-[#717182]">
        {w.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {w.location}
          </p>
        )}
        {w.preferredSector && (
          <p className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 flex-shrink-0" /> {w.preferredSector}
          </p>
        )}
      </div>

      {w.bio && <p className="text-sm text-[#444] line-clamp-2 mb-3">{w.bio}</p>}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {skills.map((s) => (
            <span key={s} className="bg-[#e3f5ff] text-[#236987] px-2.5 py-0.5 rounded-full text-xs">
              {s}
            </span>
          ))}
        </div>
      )}

      <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary-50 font-medium">
        {t('employer:workers.viewProfile')} <ChevronRight className="w-4 h-4" />
      </span>
    </Link>
  )
}

// Card for an already-unlocked candidate — contact is shown (already paid for).
function UnlockedCard({ c }: { c: UnlockedCandidate }) {
  const { t } = useTranslation()
  const skills = c.skills?.map((s) => s.skill?.name).filter(Boolean).slice(0, 4) ?? []
  return (
    <Link
      href={`/employer/workers/${c.id}`}
      className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-base font-semibold text-[#236987]">{initials(c.fullName)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-black truncate">{c.fullName}</h3>
          {c.preferredJobTitle && (
            <p className="text-sm text-[#717182] truncate">{c.preferredJobTitle}</p>
          )}
        </div>
      </div>

      {/* Contact — the value the employer paid to see */}
      <div className="space-y-1 mb-3 text-sm text-black">
        <p className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary-50" /> {c.phoneNumber}
        </p>
        {/* A phone-only seeker has no email. Rendering the row anyway left a
            bare mail icon with nothing beside it — on the surface the employer
            PAID to unlock, which reads as a failed unlock. The phone above is
            the guaranteed contact. */}
        {c.email && (
          <p className="flex items-center gap-1.5 min-w-0">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary-50" />
            <span className="truncate">{c.email}</span>
          </p>
        )}
        {c.location && (
          <p className="flex items-center gap-1.5 text-[#717182]">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {c.location}
          </p>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skills.map((s) => (
            <span key={s} className="bg-[#e3f5ff] text-[#236987] px-2.5 py-0.5 rounded-full text-xs">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-green-700">
          <Unlock className="w-3.5 h-3.5" />
          {t('employer:workers.unlockedAgo', { time: relativeTime(c.unlockedAt) })}
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-primary-50 font-medium">
          {t('employer:workers.viewProfile')} <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

// The "Unlocked" tab — the employer's paid candidate history. Fetches lazily
// (only when the tab is first opened) and paginates.
function UnlockedList() {
  const { t } = useTranslation()
  const [data, setData] = useState<UnlockedCandidatesPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const reqIdRef = useRef(0)

  const load = async (pageArg: number) => {
    const myReq = ++reqIdRef.current
    setLoading(true)
    setError('')
    try {
      const res = await candidateAPI.getUnlockedCandidates({ page: pageArg, limit: PAGE_SIZE })
      if (myReq !== reqIdRef.current) return
      setData(res)
    } catch (err) {
      if (myReq !== reqIdRef.current) return
      setError(err instanceof Error ? err.message : t('employer:workers.unlockedLoadFailed'))
      setData(null)
    } finally {
      if (myReq === reqIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToPage = (p: number) => {
    setPage(p)
    void load(p)
  }

  const items = data?.unlockedCandidates ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
        <p>{t('employer:workers.unlockedLoading')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-600 mb-4 max-w-md">{error}</p>
        <button
          onClick={() => goToPage(page)}
          className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
        >
          {t('buttons.retry')}
        </button>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
        <Unlock className="w-10 h-10 mb-4 text-gray-300" />
        <p className="text-lg font-medium text-black mb-1">{t('employer:workers.unlockedEmptyTitle')}</p>
        <p className="max-w-md">{t('employer:workers.unlockedEmptyBody')}</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-[#717182] mb-4">
        {t('employer:workers.unlockedCount', { count: pagination?.total ?? items.length })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {items.map((c) => (
          <UnlockedCard key={c.id} c={c} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            disabled={!pagination?.hasPrevPage}
            onClick={() => goToPage(page - 1)}
            className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm text-[#717182]">
            {t('employer:workers.pageOf', { page, total: totalPages })}
          </span>
          <button
            disabled={!pagination?.hasNextPage}
            onClick={() => goToPage(page + 1)}
            className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}

function WorkersSearchContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'unlocked' ? 'unlocked' : 'search')
  const [queryDraft, setQueryDraft] = useState('')
  const [locationDraft, setLocationDraft] = useState('')
  // Committed search params (only set once a valid search is submitted).
  const [applied, setApplied] = useState<{ search: string; location: string } | null>(null)
  const [page, setPage] = useState(1)

  const [data, setData] = useState<WorkerSearchPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Monotonic request id — only the latest search/paginate updates state, so
  // out-of-order responses (fast page clicks, search-then-page) can't render
  // stale results over newer ones.
  const reqIdRef = useRef(0)

  const runSearch = async (params: { search: string; location: string }, pageArg: number) => {
    const myReq = ++reqIdRef.current
    setLoading(true)
    setError('')
    try {
      const res = await candidateAPI.searchWorkers({
        search: params.search,
        location: params.location || undefined,
        page: pageArg,
        limit: PAGE_SIZE,
      })
      if (myReq !== reqIdRef.current) return
      setData(res)
    } catch (err) {
      if (myReq !== reqIdRef.current) return
      setError(err instanceof Error ? err.message : t('employer:workers.searchFailed'))
      setData(null)
    } finally {
      if (myReq === reqIdRef.current) setLoading(false)
    }
  }

  // Set the instant the employer asks for something themselves. A ref, not
  // state: the seed's async chain captured `applied` before its own await, so a
  // search submitted while the seed was in flight was invisible to it.
  const userSearchedRef = useRef(false)

  const submit = () => {
    const search = queryDraft.trim()
    if (search.length < MIN_QUERY) {
      setError(t('employer:workers.minQuery', { count: MIN_QUERY }))
      return
    }
    userSearchedRef.current = true
    const params = { search, location: locationDraft.trim() }
    setApplied(params)
    setPage(1)
    void runSearch(params, 1)
  }

  const goToPage = (p: number) => {
    if (!applied) return
    setPage(p)
    void runSearch(applied, p)
  }

  // TD-23 — show somebody before the employer types.
  //
  // "Find workers" opened as an empty box with an instruction in it. The free
  // tier already permits snippet search, so there was nothing to protect: the
  // screen simply asked a question and showed nothing until it was answered.
  //
  // ⚠️ It cannot be fixed by fetching a default list. `search` is REQUIRED,
  // min 2 characters, on GET /employers/search/workers
  // (jobseeker-search.validator.ts) — there is no browse mode to call. So the
  // first search is seeded from the employer's own most recent job title, which
  // is a better guess than "recent candidates" anyway: someone who just posted
  // for a Delivery Boy wants delivery people, not whoever signed up last.
  //
  // The seed goes into the visible box, so it reads as a search that has been
  // run and can be edited, not as a mystery list. An employer with no jobs falls
  // through to the original empty state, which is the honest answer for them.
  const seededRef = useRef(false)
  const [seedJob, setSeedJob] = useState('')
  useEffect(() => {
    // Only ever the FIRST paint of the search tab, and never over a real search.
    if (tab !== 'search' || seededRef.current || applied) return
    seededRef.current = true
    ;(async () => {
      try {
        // Five, not one: `getMyJobs` has no status filter, so the newest row can
        // be CANCELLED or FILLED while the copy says "your most recent job".
        // Prefer a live one, fall back to the newest of any status rather than
        // showing nothing.
        const mine = await employerAPI.getMyJobs(1, 5)
        const rows = mine.jobs ?? []
        const latest = rows.find((j) => (j.status ?? '').toUpperCase() === 'ACTIVE') ?? rows[0]

        // Re-checked AFTER the await, and this is the reason the ref exists: the
        // guard at the top of the effect ran before this request went out, so an
        // employer who typed and pressed Search while it was in flight was
        // invisible to it.
        //
        // ⚠️ This line is NOT redundant with the identical check after the
        // search below, and the difference is a hang. Getting past here reaches
        // `++reqIdRef.current` — which INVALIDATES the employer's own in-flight
        // request. `runSearch`'s `finally` only clears the spinner when its id
        // is still current, so their results are dropped and the page spins for
        // ever. Verified by deleting this line: smoke-td23.js's
        // "not left on a spinner" check fails, and only that one.
        if (userSearchedRef.current) return

        // `jobTitle` is the taxonomy value and the better needle; `title` is the
        // employer's own headline ("Cook needed for family kitchen, Bandra") and
        // matches far less well, but it beats an empty screen.
        const seed = (latest?.jobTitle || latest?.title || '').trim()
        if (seed.length < MIN_QUERY) return

        // Searched DIRECTLY rather than through `runSearch`, for two reasons
        // that both bite the same person — someone who typed nothing:
        //   · runSearch writes its own failures into `setError`, so a 500 here
        //     would put "Search failed. Please try again." on screen for a
        //     search they never ran.
        //   · the result has to be inspected before it is shown at all.
        const myReq = ++reqIdRef.current
        const res = await candidateAPI.searchWorkers({ search: seed, page: 1, limit: PAGE_SIZE })
        if (myReq !== reqIdRef.current || userSearchedRef.current) return

        // ⚠️ A seed that finds NOBODY is discarded, not displayed. `jobTitle` is
        // nullable, so a pre-taxonomy job seeds from its free-text headline —
        // "Urgent requirement for house help in Whitefield" — which matches
        // nothing, and the screen would then read "No candidates found. Try a
        // different keyword" about a search the employer never made. That says
        // "the database is empty", which is the exact impression TD-23 exists to
        // remove. Falling through leaves the original invitation to search.
        if (!res.jobSeekers?.length) return

        setSeedJob(seed)
        setQueryDraft(seed)
        setApplied({ search: seed, location: '' })
        setData(res)
      } catch {
        // Non-fatal by design: a failed seed leaves the original empty state,
        // which is exactly where this screen was before. It must never surface
        // as a search error — the employer did not search for anything.
      }
    })()
    // ⚠️ NO `ignore` cleanup flag here, deliberately — and it is not an
    // oversight, it is the second version of this effect.
    //
    // `reactStrictMode` is on (next.config.js), so in development React mounts,
    // cleans up, and mounts again. The first pass sets `seededRef`, its cleanup
    // set `ignore = true`, and the second pass returned early on the ref — so
    // the ONE in-flight request resolved into a closure that had been told to
    // discard its result. The network tab showed the fetch and the screen stayed
    // empty, which reads exactly like a backend problem.
    //
    // The ref is already the dedupe: at most one chain ever runs, so there is no
    // stale response to guard against. Setting state after a real unmount is a
    // no-op in React 18.
    //
    // Mount-and-tab only. `applied` is deliberately not a dependency: it changes
    // the moment the seed lands, and re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const jobs = data?.jobSeekers ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
            {t('employer:workers.title')}
          </h1>
          <p className="text-[#717182] mb-4">{t('employer:workers.subtitle')}</p>

          {/* Tabs — Search | Unlocked */}
          <div className="flex gap-1 border-b border-gray-200 mb-6 sm:mb-8">
            {(['search', 'unlocked'] as Tab[]).map((tb) => (
              <button
                key={tb}
                type="button"
                onClick={() => setTab(tb)}
                className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                  tab === tb
                    ? 'border-primary-50 text-primary-50'
                    : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {tb === 'search' ? t('employer:workers.tabSearch') : t('employer:workers.tabUnlocked')}
              </button>
            ))}
          </div>

          {tab === 'search' && (
          <>
          {/* Search bar */}
          <div className="bg-white rounded-lg shadow-[0px_5px_15px_0px_rgba(184,184,184,0.1)] p-3 sm:p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={t('employer:workers.searchPlaceholder')}
                  className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
              </div>
              <div className="flex-1 lg:max-w-[340px] relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={t('employer:workers.locationPlaceholder')}
                  className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
              </div>
              <button
                onClick={submit}
                className="h-12 px-8 bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors whitespace-nowrap"
              >
                <Search className="w-5 h-5" />
                {t('employer:workers.searchButton')}
              </button>
            </div>
          </div>

          {/* Results */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:workers.searching')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              {applied && (
                <button
                  onClick={() => goToPage(page)}
                  className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
                >
                  {t('buttons.retry')}
                </button>
              )}
            </div>
          )}

          {/* Initial state — no search yet */}
          {!loading && !error && !applied && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
              <Search className="w-10 h-10 mb-4 text-gray-300" />
              <p className="max-w-md">{t('employer:workers.emptyInitial')}</p>
            </div>
          )}

          {/* No results */}
          {!loading && !error && applied && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
              <Users className="w-10 h-10 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{t('employer:workers.noResultsTitle')}</p>
              <p className="max-w-md">{t('employer:workers.noResultsBody')}</p>
            </div>
          )}

          {/* Result grid */}
          {!loading && !error && jobs.length > 0 && (
            <>
              {/* Say WHY these people are on screen when nobody asked for them
                  (TD-23). A list that appears unbidden and unexplained reads as
                  "everyone we have", and the employer then reasonably concludes
                  the database is tiny. Shown only until they change the search:
                  once the box is theirs, the box is the explanation. */}
              {seedJob && applied?.search === seedJob && (
                <p className="text-sm text-[#717182] mb-2">
                  {t('employer:workers.seededFrom', { job: seedJob })}
                </p>
              )}
              <p className="text-sm text-[#717182] mb-4">
                {t('employer:workers.resultCount', { count: pagination?.total ?? jobs.length })}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {jobs.map((w) => (
                  <WorkerCard key={w.id} w={w} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <button
                    disabled={!pagination?.hasPrevPage}
                    onClick={() => goToPage(page - 1)}
                    className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm text-[#717182]">
                    {t('employer:workers.pageOf', { page, total: totalPages })}
                  </span>
                  <button
                    disabled={!pagination?.hasNextPage}
                    onClick={() => goToPage(page + 1)}
                    className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
          </>
          )}

          {tab === 'unlocked' && <UnlockedList />}
        </div>
      </main>
    </div>
  )
}

export default function WorkersSearchPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <Suspense fallback={null}>
        <WorkersSearchContent />
      </Suspense>
    </ProtectedRoute>
  )
}
