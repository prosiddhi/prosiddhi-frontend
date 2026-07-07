'use client'

// Candidate database search (Phase 2, EPIC B). Employers search the seeker pool
// via FTS (GET /api/employers/search/workers) and see snippet results with NO
// contact. Opening a candidate (→ /employer/workers/:id) is where an unlock
// (1 DOWNLOAD credit) can happen. Contact never appears in search results.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import {
  candidateAPI,
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
        <p className="flex items-center gap-1.5 min-w-0">
          <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary-50" />
          <span className="truncate">{c.email}</span>
        </p>
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
          className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
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

  const submit = () => {
    const search = queryDraft.trim()
    if (search.length < MIN_QUERY) {
      setError(t('employer:workers.minQuery', { count: MIN_QUERY }))
      return
    }
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

  const jobs = data?.jobSeekers ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:workers.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

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
                className="h-12 px-8 bg-primary-50 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors whitespace-nowrap"
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
                  className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
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
