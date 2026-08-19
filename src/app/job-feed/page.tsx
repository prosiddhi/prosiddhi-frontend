'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CITY_COORDS, CITY_KEYS, toCityKey } from '@/lib/cities'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { jobSeekerAPI, type Job, type JobsPage, type JobFeedFilters, type TaxonomyTriple } from '@/lib/api'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { humanizeJobType, formatSalary, relativeTime, initials } from '@/lib/jobFormat'
import {
  Search,
  MapPin,
  ChevronDown,
  Home,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Clock,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  IndianRupee,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { HeaderActions } from '@/components/navigation/HeaderActions'

type Tab = 'all' | 'recommended' | 'nearby'
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

function JobFeedPageContent() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)

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
  //
  // `seeded` gates the first fetch. Without it the feed fires an UNFILTERED
  // request on mount, then a second filtered one once this effect has run — two
  // round-trips to show one list, on a product built for low-end devices and
  // metered data.
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

  const [data, setData] = useState<JobsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Persisted saved-job state (PJP-140). Fetched once on mount so each card's
  // Save toggle reflects what's already saved; mutated optimistically on toggle.
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

  // Fetch on tab/page/filter change. The `ignore` flag drops stale responses
  // when the user switches tab/page before an in-flight request resolves.
  useEffect(() => {
    // Wait for the URL seeding above, so an arrival from the landing page makes
    // ONE filtered request rather than an unfiltered one it immediately discards.
    if (!seeded) return
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        let res: JobsPage
        if (tab === 'recommended') {
          res = await jobSeekerAPI.getRecommendedJobs(page, PAGE_SIZE)
        } else if (tab === 'nearby') {
          res = await jobSeekerAPI.getNearbyJobs({ page, limit: PAGE_SIZE })
        } else {
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
            maxDistance: coords ? 50 : undefined,
            sortBy: applied.sortBy,
            sortOrder: sortOrderFor(applied.sortBy),
            page,
            limit: PAGE_SIZE,
          }
          res = await jobSeekerAPI.getJobFeed(filters)
        }
        if (!ignore) setData(res)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('seeker:jobFeed.loadError'))
          setData(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [seeded, tab, page, applied, reloadKey, t])

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
    setPage(1)
  }

  const handleSearch = () => commitFilters()

  const handleApplyFilters = () => {
    commitFilters()
    setShowFilters(false)
  }

  const switchTab = (t: Tab) => {
    if (t === tab) return
    setTab(t)
    setPage(1)
  }

  const jobs: Job[] = data?.jobs ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  const sectionTitle =
    tab === 'recommended'
      ? t('seeker:jobFeed.section.recommendedTitle')
      : tab === 'nearby'
      ? t('seeker:jobFeed.section.nearbyTitle')
      : t('seeker:jobFeed.section.allTitle')
  const sectionSub =
    tab === 'recommended'
      ? t('seeker:jobFeed.section.recommendedSub')
      : tab === 'nearby'
      ? t('seeker:jobFeed.section.nearbySub')
      : t('seeker:jobFeed.section.allSub')

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.home')}</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-primary-50">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px] font-medium">{t('seeker:nav.jobFeed')}</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.savedJobs')}</span>
            </Link>
            <LanguageSwitcher />
          </nav>

          <HeaderActions />
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      {/* Search Section (TD-15)
          The 72px "Find Jobs Near You" hero that used to open this page is gone.
          It cost ~400px above the fold on a phone, it repeated the landing page
          word for word, and it announced "this is where you find jobs" to
          someone who had signed in and tapped into the job feed. The section
          header below already names the tab and the result count.

          Measured on a 390x844 phone: the first job card began at 999px — 1.2
          screens of scrolling, ZERO complete jobs visible. apna shows three; our
          own Flutter app shows two and a half. */}
      {/* Search — only on the All tab (Recommended/Near By are profile-driven).
          The whole section is gated, not just its contents: with the hero gone
          the search card is its only child, so leaving the section mounted
          painted a bare blue band across the other two tabs. */}
      {tab === 'all' && (
      <section className="relative bg-[#f5fcff] py-4 sm:py-6 lg:py-8 overflow-hidden">
        <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <div className="bg-white rounded-lg shadow-[0px_5px_15px_0px_rgba(184,184,184,0.1)] p-3 sm:p-4 lg:p-[12px] max-w-[1408px] mx-auto">
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
                    placeholder={t('seeker:jobFeed.searchPlaceholder')}
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                  />
                </div>

                <div className="flex-1 min-w-[150px] lg:max-w-[416px] relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={cityDraft}
                    onChange={(e) => setCityDraft(e.target.value)}
                    className="w-full h-12 pl-10 pr-10 bg-[#f3f3f5] rounded-lg text-base text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50 appearance-none cursor-pointer"
                  >
                    <option value="">{t('seeker:jobFeed.anyLocation')}</option>
                    {CITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t(`seeker:jobFeed.city.${key}`)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <button
                  onClick={handleSearch}
                  className="h-12 flex-1 min-w-[150px] px-4 sm:px-6 lg:px-[43px] lg:flex-none bg-primary-50 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors"
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
                    variant="filter"
                    className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
                    selectClassName="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm"
                    labelClassName="block text-sm font-medium text-black mb-1"
                  />
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{t('seeker:jobFeed.filters.jobType')}</label>
                    <select value={jobTypeDraft} onChange={(e) => setJobTypeDraft(e.target.value)} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm">
                      <option value="">{t('seeker:jobFeed.filters.any')}</option>
                      {JOB_TYPES.map((value) => (
                        <option key={value} value={value}>{t(`seeker:jobFeed.jobType.${value}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{t('seeker:jobFeed.filters.minSalary')}</label>
                    <input type="number" min={0} value={minSalaryDraft} onChange={(e) => setMinSalaryDraft(e.target.value)} placeholder={t('seeker:jobFeed.filters.minSalaryPlaceholder')} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{t('seeker:jobFeed.filters.maxSalary')}</label>
                    <input type="number" min={0} value={maxSalaryDraft} onChange={(e) => setMaxSalaryDraft(e.target.value)} placeholder={t('seeker:jobFeed.filters.maxSalaryPlaceholder')} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{t('seeker:jobFeed.filters.sortBy')}</label>
                    <select value={sortByDraft} onChange={(e) => setSortByDraft(e.target.value as JobFeedFilters['sortBy'])} className="w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm">
                      <option value="postedAt">{t('seeker:jobFeed.filters.sortNewest')}</option>
                      <option value="salaryMax">{t('seeker:jobFeed.filters.sortSalaryHigh')}</option>
                      <option value="salaryMin">{t('seeker:jobFeed.filters.sortSalaryLow')}</option>
                      <option value="title">{t('seeker:jobFeed.filters.sortTitle')}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                    <button onClick={handleApplyFilters} className="h-11 px-8 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium">
                      {t('seeker:jobFeed.filters.applyFilters')}
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>
      )}

      {/* Job Listings Section — top padding kept tight (TD-15). The gap between
          the search card and the first job is dead space on a phone; the bottom
          keeps its room so the last card does not sit on the footer. */}
      <section className="pt-4 pb-8 sm:pt-6 sm:pb-12 lg:pt-8 lg:pb-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Tabs */}
          <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-gray-200">
            {([
              { key: 'all', label: t('seeker:jobFeed.tabs.all') },
              { key: 'recommended', label: t('seeker:jobFeed.tabs.recommended') },
              { key: 'nearby', label: t('seeker:jobFeed.tabs.nearby') },
            ] as { key: Tab; label: string }[]).map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => switchTab(tabItem.key)}
                className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-2 -mb-px transition-colors ${
                  tab === tabItem.key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* Section Header (TD-15)
              Three lines became one on a phone: the descriptive half of the
              title and the result count both move inline, and the subtitle is
              held back for screens with room for it. The tab above already
              says which list this is. */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-lg sm:text-2xl lg:text-[24px] font-semibold">
              {sectionTitle}
              <span className="hidden sm:inline font-normal"> - {sectionSub}</span>
              {!loading && !error && (
                <span className="ml-2 text-sm sm:text-base font-normal text-[#717182]">
                  {t('seeker:jobFeed.resultCount', { count: pagination?.total ?? 0 })}
                </span>
              )}
            </h1>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('seeker:jobFeed.loading')}</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
              <Briefcase className="w-10 h-10 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{t('seeker:jobFeed.emptyTitle')}</p>
              <p className="max-w-md">
                {tab === 'nearby'
                  ? t('seeker:jobFeed.emptyNearby')
                  : tab === 'recommended'
                  ? t('seeker:jobFeed.emptyRecommended')
                  : t('seeker:jobFeed.emptyDefault')}
              </p>
              {/* Near By is GPS-keyed. A seeker who only typed a city name has no
                  lat/lon, so this tab is empty for them FOREVER — with nothing to
                  click. Give them the one action that fixes it. */}
              {tab === 'nearby' && (
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center mt-5 min-h-[44px] px-6 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm"
                >
                  {t('seeker:jobFeed.emptyNearbyCta')}
                </Link>
              )}
            </div>
          )}

          {/* Job Cards */}
          {!loading && !error && jobs.length > 0 && (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                    <div className="flex items-start lg:items-center gap-4 flex-1">
                      <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-[24px] font-semibold text-[#236987]">{initials(job.companyName || job.title)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold mb-0.5 sm:mb-2">{job.title}</h3>
                        <p className="text-sm sm:text-base text-black mb-2 sm:mb-4">{job.companyName || t('seeker:jobCard.company')}</p>

                        <div className="flex items-center gap-1 mb-2 sm:mb-4">
                          <IndianRupee className="w-4 h-4" />
                          <span className="text-xs sm:text-sm lg:text-[14px]">{t('seeker:jobCard.perMonth', { salary: formatSalary(job.salaryMin, job.salaryMax) })}</span>
                        </div>

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

                    {/* TD-15: on a phone this block used to add a date line and TWO
                        full-width stacked buttons — about 130px per card, which is
                        why only one job fitted on a screen.
                        `flex-wrap` with a min-width, NOT a forced single row: at
                        ~107px each the Tamil, Telugu, Malayalam and Odia labels
                        wrapped to two or three lines and made the card TALLER than
                        the stacked version. They now sit side by side where the
                        language allows and fall back to stacking where it does
                        not, so no locale is worse off than before. */}
                    <div className="flex flex-col items-end gap-2 sm:gap-4 lg:min-w-[300px]">
                      <span className="text-sm sm:text-base text-black">{relativeTime(job.createdAt)}</span>
                      <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto lg:flex-nowrap">
                        {/* Save toggle (PJP-140) — persists via /saved-jobs. */}
                        <button
                          onClick={() => toggleSave(job.id)}
                          disabled={savingIds.has(job.id)}
                          className="flex-1 min-w-[140px] lg:flex-none px-3 sm:px-4 py-3 bg-[#eeeeee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {savingIds.has(job.id) ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : savedIds.has(job.id) ? (
                            <BookmarkCheck className="w-5 h-5 text-primary-50" />
                          ) : (
                            <Bookmark className="w-5 h-5" />
                          )}
                          <span className="text-sm sm:text-base">
                            {savedIds.has(job.id) ? t('seeker:jobCard.saved') : t('seeker:jobCard.saveJob')}
                          </span>
                        </button>
                        <Link href={`/job-details/${job.id}`} className="flex-1 min-w-[140px] lg:flex-none px-3 sm:px-4 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base text-center">
                          {t('seeker:jobCard.viewJob')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && jobs.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
              <button
                disabled={!pagination?.hasPrevPage}
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
                <span className="px-3 text-sm text-[#717182]">{t('seeker:jobFeed.pageOf', { page, total: totalPages })}</span>
              )}

              <button
                disabled={!pagination?.hasNextPage}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

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
