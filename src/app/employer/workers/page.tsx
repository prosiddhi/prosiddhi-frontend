'use client'

// Candidate database search (Phase 2, EPIC B). Employers search the seeker pool
// via FTS (GET /api/employers/search/workers) and see snippet results with NO
// contact. Opening a candidate (→ /employer/workers/:id) is where an unlock
// (1 DOWNLOAD credit) can happen. Contact never appears in search results.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  candidateAPI,
  employerAPI,
  type Job,
  type WorkerSnippet,
  type WorkerSearchPage,
  type UnlockedCandidate,
  type UnlockedCandidatesPage,
} from '@/lib/api'
import { initials, relativeTime } from '@/lib/jobFormat'
import { StateCitySelect, type SelectedCity } from '@/components/location/StateCitySelect'
import { PreferredCities } from '@/components/employer/PreferredCities'
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
  X,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MAX_SEARCH_LENGTH, parseSearch } from '@/lib/myJobsNav'

type Tab = 'search' | 'unlocked'

const PAGE_SIZE = 12
const MIN_QUERY = 2
// How long typing must pause before the Unlocked search reaches the BE. Longer than the
// 300 ms used elsewhere: that endpoint shares a 20-requests-a-minute limit with candidate profiles.
const UNLOCKED_SEARCH_DEBOUNCE_MS = 500

// The State/City filter's selects, styled like the search boxes above them.
const PLACE_SELECT_CLS =
  'w-full h-12 px-3 bg-[#f3f3f5] rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed'
const PLACE_LABEL_CLS = 'block text-sm font-medium text-black mb-1'

/**
 * What a search was run with. Every field but `search` is optional and ABSENT when unused:
 * `cityId` and `stateCode` are never both set (a city wins, as it does on the BE), and
 * `nearCityId` is only ever the same city as `cityId`.
 */
interface WorkerFilters {
  search: string
  location: string
  cityId?: string
  stateCode?: number
  nearCityId?: string
}

/** The most recently posted job of the lot (a job with no usable date counts as oldest). */
function newestPosted(jobs: Job[]): Job | undefined {
  let newest: Job | undefined
  let newestAt = -Infinity
  for (const job of jobs) {
    const parsed = Date.parse(job.postedAt ?? '')
    const at = Number.isNaN(parsed) ? -Infinity : parsed
    if (!newest || at > newestAt) {
      newest = job
      newestAt = at
    }
  }
  return newest
}

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
        <PreferredCities cities={w.preferredCities} />
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
        {c.available === false && (
          <p className="text-xs text-[#717182]">{t('employer:candidate.unavailableNote')}</p>
        )}
        {c.phoneNumber && (
          <p className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary-50" /> {c.phoneNumber}
          </p>
        )}
        {/* A phone-only seeker has no email. Rendering the row anyway left a
            bare mail icon with nothing beside it — on the surface the employer
            PAID to unlock, which reads as a failed unlock. Both contacts are null
            once the seeker is unavailable, so each row is drawn only when it has a value. */}
        {c.email && (
          <p className="flex items-center gap-1.5 min-w-0">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary-50" />
            <span className="truncate">{c.email}</span>
          </p>
        )}
        <PreferredCities cities={c.preferredCities} className="text-[#717182]" />
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

// The results under the Unlocked search box. `UnlockedList` keys it on the applied search
// term, so a new term remounts it: page 1, loading, nothing stale. That is also why `term`
// is only read when it loads.
function UnlockedResults({ term, onClear }: { term: string; onClear: () => void }) {
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
      const res = await candidateAPI.getUnlockedCandidates({ page: pageArg, limit: PAGE_SIZE, search: term })
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

  // Once per mount. In development React mounts, cleans up and mounts again; the ref survives
  // that, so a new search term sends one request there, as it does in production.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
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
        {term ? (
          <>
            <Search className="w-10 h-10 mb-4 text-gray-300" aria-hidden="true" />
            <p className="text-lg font-medium text-black mb-1">{t('employer:workers.unlockedNoMatchTitle')}</p>
            <p className="max-w-md mb-4">{t('employer:workers.unlockedNoMatchBody')}</p>
            <button
              type="button"
              onClick={onClear}
              className="text-sm underline text-primary-50 hover:no-underline min-h-[44px]"
            >
              {t('employer:workers.unlockedSearchClear')}
            </button>
          </>
        ) : (
          <>
            <Unlock className="w-10 h-10 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-black mb-1">{t('employer:workers.unlockedEmptyTitle')}</p>
            <p className="max-w-md">{t('employer:workers.unlockedEmptyBody')}</p>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-[#717182] mb-4">
        {/* With a search on, the number is the matches, not everything the employer unlocked. */}
        {t(term ? 'employer:workers.unlockedMatchCount' : 'employer:workers.unlockedCount', {
          count: pagination?.total ?? items.length,
        })}
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

// The "Unlocked" tab — the employer's paid candidate history. Fetches lazily (only when the
// tab is first opened), searches by name / email / phone / job title, and paginates. Its state
// is local, so leaving the tab starts it afresh.
function UnlockedList() {
  const { t } = useTranslation()
  const searchBox = useRef<HTMLInputElement>(null)

  // `draft` is what the box shows. `typed` is the same text minus a half-composed Indic /
  // IME syllable, so the search never runs on text the user has not finished entering.
  const [draft, setDraft] = useState('')
  const [typed, setTyped] = useState('')
  // The applied search, trimmed and capped as the BE expects. It follows typing after a
  // pause, but an emptied box applies at once: there is nothing left to wait for.
  const normalized = parseSearch(typed)
  const term = useDebouncedValue(normalized, normalized === '' ? 0 : UNLOCKED_SEARCH_DEBOUNCE_MS)

  // True while a composition has typed text that `typed` has not caught up with yet. Clear
  // drops it, so a composition-end that arrives after Clear cannot write the old text back; if
  // the same composition carries on, its next input event sets it again.
  const composingRef = useRef(false)

  // Clearing is one deliberate click. Focus goes back to the box, as the button that was
  // clicked is about to disappear.
  const clearSearch = () => {
    composingRef.current = false
    setDraft('')
    setTyped('')
    searchBox.current?.focus()
  }

  // The box sits above the results, not inside them, so it keeps its focus and text while
  // they load.
  return (
    <>
      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
        <input
          ref={searchBox}
          type="search"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if ((e.nativeEvent as InputEvent).isComposing) composingRef.current = true
            else setTyped(e.target.value)
          }}
          onCompositionEnd={(e) => {
            if (!composingRef.current) return
            composingRef.current = false
            setTyped(e.currentTarget.value)
          }}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder={t('employer:workers.unlockedSearchPlaceholder')}
          aria-label={t('employer:workers.unlockedSearchLabel')}
          className="w-full h-11 pl-10 pr-11 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {draft && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t('employer:workers.unlockedSearchClear')}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <UnlockedResults key={term} term={term} onClear={clearSearch} />
    </>
  )
}

function WorkersSearchContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'unlocked' ? 'unlocked' : 'search')
  const [queryDraft, setQueryDraft] = useState('')
  const [locationDraft, setLocationDraft] = useState('')
  // The State/City filter, as DRAFTS: nothing here is sent until Search is pressed (`submit`).
  // `cityDraft` is a chosen city; `stateDraft` is the state browsed in the picker, which
  // counts as a filter on its own only while no city is chosen.
  const [cityDraft, setCityDraft] = useState<SelectedCity | null>(null)
  const [stateDraft, setStateDraft] = useState<number | null>(null)
  const [nearestDraft, setNearestDraft] = useState(false)
  // Bumped by "clear" so the picker, which keeps its own state select, starts over.
  const [placeKey, setPlaceKey] = useState(0)
  // Committed search params (only set once a valid search is submitted).
  const [applied, setApplied] = useState<WorkerFilters | null>(null)
  const [page, setPage] = useState(1)

  const [data, setData] = useState<WorkerSearchPage | null>(null)
  const [loading, setLoading] = useState(false)
  // A request failure (network, 5xx): the only thing that gets a Retry button.
  const [error, setError] = useState('')
  // "Type something first" for an empty or too-short query. Not a failure, so it has no
  // Retry, and it lives apart from `error` so it can never replay the previous search.
  const [queryError, setQueryError] = useState('')
  // Monotonic request id — only the latest search/paginate updates state, so
  // out-of-order responses (fast page clicks, search-then-page) can't render
  // stale results over newer ones.
  const reqIdRef = useRef(0)

  const runSearch = async (params: WorkerFilters, pageArg: number) => {
    const myReq = ++reqIdRef.current
    setLoading(true)
    setError('')
    try {
      const res = await candidateAPI.searchWorkers({
        search: params.search,
        location: params.location || undefined,
        cityId: params.cityId,
        stateCode: params.stateCode,
        nearCityId: params.nearCityId,
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
    userSearchedRef.current = true
    if (search.length < MIN_QUERY) {
      setQueryError(t('employer:workers.minQuery', { count: MIN_QUERY }))
      // One character is a typo, not a request to start over: the message is all that
      // changes, so a search already on screen (or still loading) is left alone.
      if (search.length > 0) return
      // Nothing typed at all drops the previous search entirely. Bumping the request id makes
      // any request still in flight (a search, or the first-load seed) discard its reply, and
      // that also means its `finally` will not clear the spinner: done here. `seedJob` goes
      // too, or its banner would come back when the same words are typed later.
      reqIdRef.current++
      setLoading(false)
      setError('')
      setApplied(null)
      setData(null)
      setPage(1)
      setSeedJob('')
      return
    }
    setQueryError('')
    // A city wins over a bare state, and "nearest first" needs a city: it is dropped otherwise,
    // so a stale toggle can never ride along with a state or with nothing chosen.
    const place = cityDraft
      ? { cityId: cityDraft.id, ...(nearestDraft ? { nearCityId: cityDraft.id } : {}) }
      : stateDraft !== null
        ? { stateCode: stateDraft }
        : {}
    const params: WorkerFilters = { search, location: locationDraft.trim(), ...place }
    setApplied(params)
    setPage(1)
    void runSearch(params, 1)
  }

  // "Nearest first" belongs to a city, so it is switched off the moment the city goes.
  const changeCity = useCallback((next: SelectedCity | null) => {
    setCityDraft(next)
    if (!next) setNearestDraft(false)
  }, [])

  const clearPlace = () => {
    setCityDraft(null)
    setStateDraft(null)
    setNearestDraft(false)
    setPlaceKey((k) => k + 1)
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
        // A live job first. `getMyJobs` serves the Active tab by default, which on the
        // current backend is live posts only — so a post still waiting for review or
        // one the employer paused is NOT in it. (An older backend mixed all three
        // into Active, hence the status check on a handful of rows.)
        const live = await employerAPI.getMyJobs(1, 5, 'active')
        const liveRows = live.jobs ?? []
        let latest: Job | undefined = liveRows.find((j) => (j.status ?? '').toUpperCase() === 'ACTIVE') ?? liveRows[0]

        // No live job — typically a new employer whose first post is still awaiting
        // review, which is exactly who this seed is for. Fall back to the newest post
        // that is paused or pending review. Expired and rejected posts are left out:
        // they are not "your most recent job". Both are asked for together and only
        // when Active came back empty, so most employers pay for one request.
        if (!latest) {
          const [paused, pending] = await Promise.all([
            employerAPI.getMyJobs(1, 5, 'inactive'),
            employerAPI.getMyJobs(1, 5, 'pending'),
          ])
          latest = newestPosted([...(paused.jobs ?? []), ...(pending.jobs ?? [])])
        }

        // Re-checked AFTER every await above, and this is the reason the ref exists:
        // the guard at the top of the effect ran before any request went out, so an
        // employer who typed and pressed Search while they were in flight was
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
                  onChange={(e) => {
                    setQueryDraft(e.target.value)
                    if (queryError) setQueryError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  aria-invalid={queryError ? true : undefined}
                  aria-describedby={queryError ? 'worker-query-error' : undefined}
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

            {queryError && (
              <p id="worker-query-error" role="alert" className="mt-2 text-sm text-red-600">
                {queryError}
              </p>
            )}

            {/* State / city filter. Chosen here, applied with the Search button above. */}
            <fieldset className="mt-3 pt-3 border-t border-gray-100 min-w-0">
              <legend className="sr-only">{t('employer:workers.cityFilterLegend')}</legend>
              <StateCitySelect
                key={placeKey}
                className="max-w-2xl"
                value={cityDraft}
                onChange={changeCity}
                onStateChange={setStateDraft}
                initialStateCode={stateDraft}
                selectClassName={PLACE_SELECT_CLS}
                labelClassName={PLACE_LABEL_CLS}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                <label className="inline-flex items-center gap-2 text-sm text-black min-h-[44px]">
                  <input
                    type="checkbox"
                    className={`w-4 h-4 accent-primary-50 ${cityDraft === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                    checked={nearestDraft && cityDraft !== null}
                    // aria-disabled, not disabled: a disabled control is skipped by keyboard and screen
                    // readers, and then the hint that explains it is never reached.
                    aria-disabled={cityDraft === null}
                    onChange={(e) => {
                      if (cityDraft !== null) setNearestDraft(e.target.checked)
                    }}
                    aria-describedby={cityDraft === null ? 'nearest-first-hint' : undefined}
                  />
                  {t('employer:workers.nearestFirst')}
                </label>
                {cityDraft === null && (
                  <span id="nearest-first-hint" className="text-xs text-[#717182]">
                    {t('employer:workers.nearestFirstNeedsCity')}
                  </span>
                )}
                {(cityDraft !== null || stateDraft !== null) && (
                  <button
                    type="button"
                    onClick={clearPlace}
                    className="text-sm underline text-primary-50 hover:no-underline min-h-[44px]"
                  >
                    {t('employer:workers.clearLocationFilter')}
                  </button>
                )}
              </div>
            </fieldset>
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
