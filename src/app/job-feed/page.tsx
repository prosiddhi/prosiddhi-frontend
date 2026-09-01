'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { CITY_COORDS, CITY_KEYS, toCityKey, cityLabelKey } from '@/lib/cities'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { jobSeekerAPI, type Job, type JobFeedFilters, type TaxonomyTriple } from '@/lib/api'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { JobFeedCard } from '@/components/job/JobFeedCard'
import {
  Search,
  MapPin,
  MapPinOff,
  MapPinPlus,
  ChevronDown,
  Briefcase,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  Info,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

type SectionKind = 'all' | 'recommended' | 'nearby'
// Recommended/Near By are preview sections (Figma: 4 cards, 2x2, before "Show
// More") — All/search results is the deep, comprehensive list and keeps the
// larger page size the filter/search UI already assumed.
const PREVIEW_SIZE = 4
const PAGE_SIZE = 10

// City centroids live in @/lib/cities — the seeker landing page offers the same
// dropdown and hands its choice here through the URL, so the two must not drift.

// Job-type option values; labels are looked up via t('seeker:jobFeed.jobType.<value>').
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'] as const

interface AppliedFilters {
  search: string
  city: string
  jobType: string
  minSalary: string
  maxSalary: string
  sortBy: JobFeedFilters['sortBy']
  // BR-3 — 3-level taxonomy filter (names; '' = no filter at that level).
  category: string
  sector: string
  jobTitle: string
}

const EMPTY_FILTERS: AppliedFilters = {
  search: '',
  city: '',
  jobType: '',
  minSalary: '',
  maxSalary: '',
  sortBy: 'postedAt',
  category: '',
  sector: '',
  jobTitle: '',
}

// Pair each sort field with the order its label promises, so "Salary (low)"
// actually sorts ascending regardless of the BE's default sortOrder.
function sortOrderFor(sortBy: JobFeedFilters['sortBy']): 'asc' | 'desc' {
  return sortBy === 'salaryMin' || sortBy === 'title' ? 'asc' : 'desc'
}

/**
 * The three empty states, decided ONCE — icon, sentence and whether there is
 * anything to press.
 *
 * `noLocation` (Near By only) means the seeker has no saved coordinate, so the
 * backend never ran the distance filter. That is fixable by the seeker and
 * earns an action. An empty Near By WITH a coordinate is not fixable by adding
 * a location they already gave us, and offering the button there is what makes
 * the section read as broken.
 */
function emptyStateFor(kind: SectionKind, noLocation: boolean, t: (key: string) => string) {
  if (kind === 'recommended') {
    return { Icon: Briefcase, body: t('seeker:jobFeed.emptyRecommended'), cta: false }
  }
  if (kind === 'all') {
    return { Icon: Briefcase, body: t('seeker:jobFeed.emptyDefault'), cta: false }
  }
  return noLocation
    ? { Icon: MapPinPlus, body: t('profile:seeker.locationOff'), cta: true }
    : { Icon: MapPinOff, body: t('seeker:jobFeed.emptyNearby'), cta: false }
}

interface JobSectionProps {
  headingIcon: LucideIcon
  title: string
  sub: string
  count: number
  loading: boolean
  error: string
  jobs: Job[]
  kind: SectionKind
  noLocation: boolean
  hasMore: boolean
  onShowMore: () => void
  onRetry: () => void
  savedIds: Set<string>
  savingIds: Set<string>
  onToggleSave: (jobId: string) => void
  t: TFunction
}

/**
 * One Recommended/Near By/All-results block: heading + count, loading/error/
 * empty states, a 2-column card grid, and a "Show More" button. Pulled out as
 * a local (non-exported) component because job-feed now renders three of
 * these side by side instead of one tab-switched list — inlining this ~70
 * lines of JSX three times would have tripled it for no reason, this file
 * being the only place it's used.
 */
function JobSection({
  headingIcon: HeadingIcon,
  title,
  sub,
  count,
  loading,
  error,
  jobs,
  kind,
  noLocation,
  hasMore,
  onShowMore,
  onRetry,
  savedIds,
  savingIds,
  onToggleSave,
  t,
}: JobSectionProps) {
  const empty = emptyStateFor(kind, noLocation, t)

  return (
    <section className="py-6 sm:py-8">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
        <div className="mb-4 sm:mb-6 flex items-center gap-2">
          <HeadingIcon className="w-5 h-5 text-[#717182] shrink-0" />
          <div>
            <h2 className="text-lg sm:text-xl lg:text-[22px] font-semibold">{title}</h2>
            {!loading && !error && (
              <p className="text-sm text-[#717182]">
                {sub} · {t('seeker:jobFeed.resultCount', { count })}
              </p>
            )}
          </div>
        </div>

        {loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#717182]">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-50" />
            <p>{t('seeker:jobFeed.loading')}</p>
          </div>
        )}

        {!loading && error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-red-600 mb-4 max-w-md">{error}</p>
            <button onClick={onRetry} className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">
              {t('buttons.retry')}
            </button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#717182]">
            <empty.Icon className="w-8 h-8 mb-3 text-gray-300" />
            <p className="text-lg font-medium text-black mb-1">{t('seeker:jobFeed.emptyTitle')}</p>
            <p className="max-w-md">{empty.body}</p>
            {empty.cta && (
              <Link
                href="/profile"
                className="inline-flex items-center justify-center mt-5 min-h-[44px] px-6 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm"
              >
                {t('seeker:jobFeed.emptyNearbyCta')}
              </Link>
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {jobs.map((job) => (
              <JobFeedCard
                key={job.id}
                job={job}
                isSaved={savedIds.has(job.id)}
                saving={savingIds.has(job.id)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={onShowMore}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#dddddd] rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {t('seeker:jobFeed.showMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function JobFeedPageContent() {
  const { t } = useTranslation()

  // Draft (input) vs applied (committed) filter state.
  const [searchDraft, setSearchDraft] = useState('')
  const [cityDraft, setCityDraft] = useState('')
  const [jobTypeDraft, setJobTypeDraft] = useState('')
  const [minSalaryDraft, setMinSalaryDraft] = useState('')
  const [maxSalaryDraft, setMaxSalaryDraft] = useState('')
  const [sortByDraft, setSortByDraft] = useState<JobFeedFilters['sortBy']>('postedAt')
  const [taxonomyDraft, setTaxonomyDraft] = useState<TaxonomyTriple>({})
  const [showFilters, setShowFilters] = useState(false)
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS)

  // Seed from the URL, so the seeker landing page's search bar actually lands
  // somewhere: /job-feed?search=welder&city=pune arrives already filtered.
  //
  // Read in an EFFECT, not a lazy useState initialiser. useSearchParams is empty
  // during the server render, so an initialiser captures nulls and the values are
  // lost — the exact bug that made the login page's role hint silently fail
  // (DEF-012). By the time effects run, the params are there.
  const searchParams = useSearchParams()
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    const search = searchParams.get('search')?.trim() ?? ''
    const city = toCityKey(searchParams.get('city'))
    if (search || city) {
      setSearchDraft(search)
      setCityDraft(city)
      setApplied((prev) => ({ ...prev, search, city }))
    }
    setSeeded(true)
    // Deliberately mount-only: this seeds the INITIAL filters. Re-running it
    // whenever the user edits filters would keep dragging them back to whatever
    // the URL said.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persisted saved-job state (PJP-140). Fetched once on mount so each card's
  // Save toggle reflects what's already saved; mutated optimistically on toggle.
  // Shared by all three sections below — keyed by job ID, not by section, so
  // saving a job that happens to appear in both Recommended and All stays in
  // sync between them.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let ignore = false
    jobSeekerAPI
      // High limit so the feed knows about effectively all saved jobs in one call.
      .getSavedJobs(1, 100)
      .then((res) => {
        if (!ignore) setSavedIds(new Set(res.savedJobs.map((it) => it.jobId)))
      })
      .catch(() => {
        // Non-fatal: the feed still works, toggles just start from "not saved".
      })
    return () => {
      ignore = true
    }
  }, [])

  const toggleSave = async (jobId: string) => {
    if (savingIds.has(jobId)) return
    const wasSaved = savedIds.has(jobId)
    setSavingIds((prev) => new Set(prev).add(jobId))
    // Optimistic flip.
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(jobId)
      else next.add(jobId)
      return next
    })
    try {
      if (wasSaved) await jobSeekerAPI.unsaveJob(jobId)
      else await jobSeekerAPI.saveJob(jobId)
    } catch {
      // Revert on failure.
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(jobId)
        else next.delete(jobId)
        return next
      })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  // --- Recommended section ---------------------------------------------
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([])
  const [recommendedLoading, setRecommendedLoading] = useState(true)
  const [recommendedError, setRecommendedError] = useState('')
  const [recommendedPage, setRecommendedPage] = useState(1)
  const [recommendedHasMore, setRecommendedHasMore] = useState(false)
  const [recommendedTotal, setRecommendedTotal] = useState(0)
  const [recommendedReloadKey, setRecommendedReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setRecommendedLoading(true)
      setRecommendedError('')
      try {
        const res = await jobSeekerAPI.getRecommendedJobs(recommendedPage, PREVIEW_SIZE)
        if (ignore) return
        setRecommendedJobs((prev) => (recommendedPage === 1 ? res.jobs : [...prev, ...res.jobs]))
        setRecommendedHasMore(!!res.pagination?.hasNextPage)
        setRecommendedTotal(res.pagination?.total ?? 0)
      } catch (err) {
        if (!ignore) setRecommendedError(err instanceof Error ? err.message : t('seeker:jobFeed.loadError'))
      } finally {
        if (!ignore) setRecommendedLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [recommendedPage, recommendedReloadKey, t])

  // --- Near By section ----------------------------------------------------
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const [nearbyError, setNearbyError] = useState('')
  const [nearbyPage, setNearbyPage] = useState(1)
  const [nearbyHasMore, setNearbyHasMore] = useState(false)
  const [nearbyTotal, setNearbyTotal] = useState(0)
  // Set by GET /jobs/nearby alone, and only when the seeker has no saved
  // coordinate — the backend never ran the distance filter in that case.
  const [nearbyNoLocation, setNearbyNoLocation] = useState(false)
  const [nearbyReloadKey, setNearbyReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setNearbyLoading(true)
      setNearbyError('')
      try {
        const res = await jobSeekerAPI.getNearbyJobs({ page: nearbyPage, limit: PREVIEW_SIZE })
        if (ignore) return
        setNearbyJobs((prev) => (nearbyPage === 1 ? res.jobs : [...prev, ...res.jobs]))
        setNearbyHasMore(!!res.pagination?.hasNextPage)
        setNearbyTotal(res.pagination?.total ?? 0)
        setNearbyNoLocation(res.noLocation === true)
      } catch (err) {
        if (!ignore) setNearbyError(err instanceof Error ? err.message : t('seeker:jobFeed.loadError'))
      } finally {
        if (!ignore) setNearbyLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [nearbyPage, nearbyReloadKey, t])

  // --- All / search-results section ---------------------------------------
  // Only appears once the seeker has actually searched or filtered — with no
  // active filter there is nothing this section would show that Recommended
  // and Near By don't already cover, and it would just repeat "browse all
  // jobs" underneath two sections already doing that.
  const hasActiveFilters = !!(
    applied.search ||
    applied.city ||
    applied.jobType ||
    applied.minSalary ||
    applied.maxSalary ||
    applied.category ||
    applied.sector ||
    applied.jobTitle
  )

  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [allError, setAllError] = useState('')
  const [allPage, setAllPage] = useState(1)
  const [allHasMore, setAllHasMore] = useState(false)
  const [allTotal, setAllTotal] = useState(0)
  const [allReloadKey, setAllReloadKey] = useState(0)

  // A genuinely new query (search/filter change) starts over at page 1 —
  // Show More only ever advances the CURRENT query.
  useEffect(() => {
    setAllPage(1)
    setAllJobs([])
  }, [applied])

  useEffect(() => {
    if (!seeded || !hasActiveFilters) return
    let ignore = false
    const run = async () => {
      setAllLoading(true)
      setAllError('')
      try {
        const coords = applied.city ? CITY_COORDS[applied.city] : undefined
        const filters: JobFeedFilters = {
          search: applied.search || undefined,
          category: applied.category || undefined,
          sector: applied.sector || undefined,
          jobTitle: applied.jobTitle || undefined,
          jobType: applied.jobType || undefined,
          minSalary: applied.minSalary ? Number(applied.minSalary) : undefined,
          maxSalary: applied.maxSalary ? Number(applied.maxSalary) : undefined,
          latitude: coords?.lat,
          longitude: coords?.lon,
          // The CITY'S radius, not a flat 50 (TD-06). Delhi carries NCR at
          // 50 km; Surat needs 20. A single number either strands people on
          // the edge of a big city or drags a small city's results in from
          // two towns over. Without any radius the backend applies 5 km.
          maxDistance: coords?.radius,
          sortBy: applied.sortBy,
          sortOrder: sortOrderFor(applied.sortBy),
          page: allPage,
          limit: PAGE_SIZE,
        }
        const res = await jobSeekerAPI.getJobFeed(filters)
        if (ignore) return
        setAllJobs((prev) => (allPage === 1 ? res.jobs : [...prev, ...res.jobs]))
        setAllHasMore(!!res.pagination?.hasNextPage)
        setAllTotal(res.pagination?.total ?? 0)
      } catch (err) {
        if (!ignore) {
          setAllError(err instanceof Error ? err.message : t('seeker:jobFeed.loadError'))
        }
      } finally {
        if (!ignore) setAllLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [seeded, hasActiveFilters, allPage, applied, allReloadKey, t])

  // Both the search bar and the filter panel commit the full draft state, so the
  // two controls never disagree about what's currently applied.
  const commitFilters = () => {
    setApplied({
      search: searchDraft.trim(),
      city: cityDraft,
      jobType: jobTypeDraft,
      minSalary: minSalaryDraft,
      maxSalary: maxSalaryDraft,
      sortBy: sortByDraft,
      category: taxonomyDraft.category ?? '',
      sector: taxonomyDraft.sector ?? '',
      jobTitle: taxonomyDraft.jobTitle ?? '',
    })
  }

  const handleSearch = () => commitFilters()

  const handleApplyFilters = () => {
    commitFilters()
    setShowFilters(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <EmployeeHeader active="jobFeed" />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>

      {/* Hero + search — always visible now (it used to be gated to a
          removed "All Jobs" tab). Same functional search bar as before, just
          moved up into a proper hero band to match the Figma; no voice icon
          (TD-21, deferred to v2, locked scope Q2). */}
      <section className="relative bg-[#f5fcff] py-8 sm:py-10 lg:py-12 text-center">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-primary-90 mb-3">
            {t('seeker:jobFeed.heroTitle')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            {t('seeker:jobFeed.heroSubtitle')}
          </p>

          <div className="bg-white rounded-lg shadow-[0px_5px_15px_0px_rgba(184,184,184,0.1)] p-3 sm:p-4 lg:p-[12px] max-w-[928px] mx-auto text-left">
            {/* `flex-wrap` with a min-width per control, NOT a 2-column grid.
                A hard grid caps each column at ~161px on a 390px phone, and
                "Search Jobs" needs ~164px in English and ~205px in Telugu —
                the label rendered outside its own button. Wrapping lets the
                row hold two controls where they fit and fall to the next line
                where they do not, which is what the ten shipped languages
                actually require. */}
            <div className="flex flex-wrap gap-3 sm:gap-4 lg:flex-nowrap lg:gap-5">
              <div className="w-full lg:w-auto lg:flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  // No aria-label, deliberately. Chrome names a textbox from
                  // its placeholder, so this control was never the TD-39
                  // defect — unlike the <select> beside it, which has no such
                  // fallback and announced nothing.
                  placeholder={t('seeker:jobFeed.searchPlaceholder')}
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
              </div>

              <div className="flex-1 min-w-[150px] lg:max-w-[416px] relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                {/* TD-39. No visible label — the MapPin icon carries the
                    meaning for sighted users — so the name has to come from
                    aria-label, and a <select> has no placeholder to fall back
                    on. */}
                <select
                  aria-label={t('seeker:landing.selectLocation')}
                  value={cityDraft}
                  onChange={(e) => setCityDraft(e.target.value)}
                  className="w-full h-12 pl-10 pr-10 bg-[#f3f3f5] rounded-lg text-base text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50 appearance-none cursor-pointer"
                >
                  <option value="">{t('seeker:jobFeed.anyLocation')}</option>
                  {CITY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(cityLabelKey(key))}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={handleSearch}
                className="h-12 flex-1 min-w-[150px] px-4 sm:px-6 lg:px-[43px] lg:flex-none bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="text-base">{t('seeker:jobFeed.searchJobs')}</span>
              </button>

              <button
                onClick={() => setShowFilters((s) => !s)}
                className="h-12 flex-1 min-w-[110px] px-4 lg:flex-none bg-[#dddddd] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors lg:w-auto"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-base">{t('seeker:jobFeed.filter')}</span>
              </button>

              {/* TD-21: a muted-speaker button sat here with NO onClick — not a
                  "coming soon" affordance, a control that did nothing at all when
                  tapped. Voice search is deferred to v2 (locked scope Q2); the
                  `jobFeed.voiceSearch*` strings are kept for when it ships. */}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category → Sector → JobTitle filter (PJP-138). Full-width row. */}
                <TaxonomyPicker
                  value={taxonomyDraft}
                  onChange={setTaxonomyDraft}
                  searchable={false}
                  variant="filter"
                  className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
                  selectClassName="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm"
                  labelClassName="block text-sm font-medium text-black mb-1"
                />
                <div>
                  <label className="block text-sm font-medium text-black mb-1" htmlFor="filter-job-type">{t('seeker:jobFeed.filters.jobType')}</label>
                  <select id="filter-job-type" value={jobTypeDraft} onChange={(e) => setJobTypeDraft(e.target.value)} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm">
                    <option value="">{t('seeker:jobFeed.filters.any')}</option>
                    {JOB_TYPES.map((value) => (
                      <option key={value} value={value}>{t(`seeker:jobFeed.jobType.${value}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" htmlFor="filter-min-salary">{t('seeker:jobFeed.filters.minSalary')}</label>
                  <input id="filter-min-salary" type="number" min={0} value={minSalaryDraft} onChange={(e) => setMinSalaryDraft(e.target.value)} placeholder={t('seeker:jobFeed.filters.minSalaryPlaceholder')} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" htmlFor="filter-max-salary">{t('seeker:jobFeed.filters.maxSalary')}</label>
                  <input id="filter-max-salary" type="number" min={0} value={maxSalaryDraft} onChange={(e) => setMaxSalaryDraft(e.target.value)} placeholder={t('seeker:jobFeed.filters.maxSalaryPlaceholder')} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" htmlFor="filter-sort-by">{t('seeker:jobFeed.filters.sortBy')}</label>
                  <select id="filter-sort-by" value={sortByDraft} onChange={(e) => setSortByDraft(e.target.value as JobFeedFilters['sortBy'])} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm">
                    <option value="postedAt">{t('seeker:jobFeed.filters.sortNewest')}</option>
                    <option value="salaryMax">{t('seeker:jobFeed.filters.sortSalaryHigh')}</option>
                    <option value="salaryMin">{t('seeker:jobFeed.filters.sortSalaryLow')}</option>
                    <option value="title">{t('seeker:jobFeed.filters.sortTitle')}</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button onClick={handleApplyFilters} className="h-11 px-8 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium">
                    {t('seeker:jobFeed.filters.applyFilters')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <JobSection
        headingIcon={Info}
        title={t('seeker:jobFeed.section.recommendedTitle')}
        sub={t('seeker:jobFeed.section.recommendedSub')}
        count={recommendedTotal}
        loading={recommendedLoading}
        error={recommendedError}
        jobs={recommendedJobs}
        kind="recommended"
        noLocation={false}
        hasMore={recommendedHasMore}
        onShowMore={() => setRecommendedPage((p) => p + 1)}
        onRetry={() => setRecommendedReloadKey((k) => k + 1)}
        savedIds={savedIds}
        savingIds={savingIds}
        onToggleSave={toggleSave}
        t={t}
      />

      <JobSection
        headingIcon={Info}
        title={t('seeker:jobFeed.section.nearbyTitle')}
        sub={t('seeker:jobFeed.section.nearbySub')}
        count={nearbyTotal}
        loading={nearbyLoading}
        error={nearbyError}
        jobs={nearbyJobs}
        kind="nearby"
        noLocation={nearbyNoLocation}
        hasMore={nearbyHasMore}
        onShowMore={() => setNearbyPage((p) => p + 1)}
        onRetry={() => setNearbyReloadKey((k) => k + 1)}
        savedIds={savedIds}
        savingIds={savingIds}
        onToggleSave={toggleSave}
        t={t}
      />

      {hasActiveFilters && (
        <JobSection
          headingIcon={Info}
          title={t('seeker:jobFeed.section.allTitle')}
          sub={t('seeker:jobFeed.section.allSub')}
          count={allTotal}
          loading={allLoading}
          error={allError}
          jobs={allJobs}
          kind="all"
          noLocation={false}
          hasMore={allHasMore}
          onShowMore={() => setAllPage((p) => p + 1)}
          onRetry={() => setAllReloadKey((k) => k + 1)}
          savedIds={savedIds}
          savingIds={savingIds}
          onToggleSave={toggleSave}
          t={t}
        />
      )}

      <Footer />
    </div>
  )
}

export default function JobFeedPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <JobFeedPageContent />
    </ProtectedRoute>
  )
}
