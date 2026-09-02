'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CITY_COORDS, CITY_KEYS, toCityKey, cityLabelKey } from '@/lib/cities'
import { Footer } from '@/components/home/Footer'
import { jobSeekerAPI, type Job, type JobFeedFilters } from '@/lib/api'
import { useCategories } from '@/hooks/useCategories'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import type { TaxonomyCategory } from '@/lib/api'
import { JobFeedSection } from '@/components/job/JobFeedSection'
import { Search, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

const PAGE_SIZE = 10

// How many Job Department / Job Role Category options show before "View more".
const DEPARTMENT_PREVIEW = 5
const ROLE_PREVIEW = 5

// Job-type option values; labels are looked up via t('seeker:jobFeed.jobType.<value>').
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'] as const

interface SalaryPreset {
  key: string
  min?: number
  max?: number
}

// Backed by the real minSalary/maxSalary filters on GET /jobs — there is no
// "Experience" field anywhere on the Job model or the backend query schema
// (checked against prosiddhi-backend/src/validators/job.validator.ts), so
// unlike the Figma reference there is no Experience section here: it would
// have nothing real to filter on.
const SALARY_PRESETS: SalaryPreset[] = [
  { key: 'all' },
  { key: 'under10k', max: 10000 },
  { key: '10to20k', min: 10000, max: 20000 },
  { key: '20to30k', min: 20000, max: 30000 },
  { key: '30to40k', min: 30000, max: 40000 },
  { key: '40to50k', min: 40000, max: 50000 },
  { key: 'above50k', min: 50000 },
]

function salaryPresetLabel(preset: SalaryPreset, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (preset.key === 'all') return t('seeker:jobFeed.filters.allSalary')
  if (preset.min === undefined) return t('seeker:jobFeed.filters.salaryUnder', { amount: preset.max?.toLocaleString('en-IN') })
  if (preset.max === undefined) return t('seeker:jobFeed.filters.salaryAbove', { amount: preset.min?.toLocaleString('en-IN') })
  return t('seeker:jobFeed.filters.salaryBetween', {
    min: preset.min.toLocaleString('en-IN'),
    max: preset.max.toLocaleString('en-IN'),
  })
}

// Custom checkbox/radio visuals for the filter sidebar.
//
// The native `accent-primary-50` rendering (the previous approach) hands the
// checkmark/dot entirely to the browser/OS — on Windows Chrome that's a
// heavy, oversized fill with no control over stroke weight or corner
// radius, which read as inconsistent with the rest of the page. Both keep
// the real `<input>` (native focus, keyboard, screen reader semantics; only
// `appearance-none` strips its paint) and layer a checkmark on top via
// `peer-checked`.
//
// Square, not a circular radio dot, even for Department/Role Category/Salary
// (single-select, real `type="radio"` underneath) — this filter sidebar's
// selection controls read as one family of square checkbox tiles, matching
// the Figma reference; the round-dot radio look was tried and reverted.
const FILTER_CONTROL_BORDER = 'border-[#dddddd]'

interface FilterControlVisualProps {
  inputType: 'checkbox' | 'radio'
  name?: string
  checked: boolean
  onChange: () => void
  onClick?: () => void
}

function FilterControlVisual({ inputType, name, checked, onChange, onClick }: FilterControlVisualProps) {
  return (
    <span className="relative inline-flex w-4 h-4 shrink-0">
      <input
        type={inputType}
        name={name}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        // `rounded-sm` (4px), not the bare `rounded` utility — this project's
        // Tailwind theme redefines the DEFAULT radius token to 8px, which on
        // a 16px box is exactly half the width: mathematically a circle, not
        // a "slightly rounded square". `rounded-sm` resolves to 4px here
        // (`calc(var(--radius) - 4px)` with `--radius: 0.5rem`), giving a
        // 25%-corner square that actually reads as a checkbox.
        className={`peer appearance-none w-4 h-4 rounded-sm ${FILTER_CONTROL_BORDER} border bg-white checked:bg-primary-50 checked:border-primary-50 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-50`}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute inset-0 m-auto w-2.5 h-2.5 text-white opacity-0 scale-75 peer-checked:opacity-100 peer-checked:scale-100 transition-all"
      >
        <path d="M3 8.5L6.5 12L13 4" />
      </svg>
    </span>
  )
}

interface FilterCheckboxProps {
  checked: boolean
  onChange: () => void
}

function FilterCheckbox({ checked, onChange }: FilterCheckboxProps) {
  return <FilterControlVisual inputType="checkbox" checked={checked} onChange={onChange} />
}

interface FilterRadioProps {
  name: string
  checked: boolean
  onChange: () => void
  onClick?: () => void
}

function FilterRadio({ name, checked, onChange, onClick }: FilterRadioProps) {
  return <FilterControlVisual inputType="radio" name={name} checked={checked} onChange={onChange} onClick={onClick} />
}

// A category earns a filter row only when a job can actually be tagged under
// it — same rule the landing page's category tiles use.
function hasJobTitles(category: TaxonomyCategory): boolean {
  return category.sectors.some((sector) => sector.jobTitles.length > 0)
}

// Every job title in the tree, name-deduped (a handful — "Helper", "Cleaning
// Staff" — sit under more than one category, and the `jobTitle` filter
// matches by name alone, so two checkboxes for the same name would just
// apply the identical filter).
function flatJobTitleNames(categories: TaxonomyCategory[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of categories) {
    for (const s of c.sectors ?? []) {
      for (const j of s.jobTitles ?? []) {
        if (!seen.has(j.name)) {
          seen.add(j.name)
          out.push(j.name)
        }
      }
    }
  }
  return out
}

interface AppliedFilters {
  search: string
  city: string
  jobTypes: string[]
  salaryPreset: string
  category: string
  jobTitle: string
  urgent: boolean
}

const EMPTY_FILTERS: AppliedFilters = {
  search: '',
  city: '',
  jobTypes: [],
  salaryPreset: 'all',
  category: '',
  jobTitle: '',
  urgent: false,
}

function JobFeedPageContent() {
  const { t } = useTranslation()
  const { categories } = useCategories()
  const { savedIds, savingIds, toggleSave } = useSavedJobs()

  // The keyword box is the one control that does NOT apply on every
  // keystroke — everything else in the sidebar applies immediately.
  const [searchDraft, setSearchDraft] = useState('')
  const [filters, setFilters] = useState<AppliedFilters>(EMPTY_FILTERS)
  const [departmentExpanded, setDepartmentExpanded] = useState(false)
  const [roleExpanded, setRoleExpanded] = useState(false)

  const departments = useMemo(() => categories.filter(hasJobTitles), [categories])
  const roles = useMemo(() => flatJobTitleNames(categories), [categories])
  const visibleDepartments = departmentExpanded ? departments : departments.slice(0, DEPARTMENT_PREVIEW)
  const visibleRoles = roleExpanded ? roles : roles.slice(0, ROLE_PREVIEW)

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  // Every filter change goes through this: it updates the filter AND resets
  // to page 1 in the SAME state update, so the fetch effect below only ever
  // sees a consistent (new filters, page 1) pair. Splitting "reset page" into
  // its own effect keyed on `filters` used to fire both effects in the same
  // commit — the fetch effect ran once with the OLD page against the NEW
  // filters (a wasted, often-empty request for e.g. page 2 of a brand new
  // query) before the reset effect corrected it a render later. The sidebar
  // applies every control immediately on click, so that double-fetch fired
  // on nearly every filter change a seeker made past page 1.
  const applyFilters = (updater: (prev: AppliedFilters) => AppliedFilters) => {
    setFilters(updater)
    setPage(1)
    setJobs([])
  }

  // Seed from the URL, so the seeker Home page's search bar actually lands
  // somewhere: /job-feed?search=welder&city=pune arrives already filtered.
  //
  // Read in an EFFECT, not a lazy useState initialiser — useSearchParams is
  // empty during the server render, so an initialiser captures nulls and the
  // values are lost (the DEF-012 bug). By the time effects run, the params
  // are there.
  const searchParams = useSearchParams()
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    const search = searchParams.get('search')?.trim() ?? ''
    const city = toCityKey(searchParams.get('city'))
    if (search || city) {
      setSearchDraft(search)
      setFilters((prev) => ({ ...prev, search, city }))
    }
    setSeeded(true)
    // Deliberately mount-only: this seeds the INITIAL filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!seeded) return
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const coords = filters.city ? CITY_COORDS[filters.city] : undefined
        const preset = SALARY_PRESETS.find((p) => p.key === filters.salaryPreset) ?? SALARY_PRESETS[0]
        const query: JobFeedFilters = {
          search: filters.search || undefined,
          category: filters.category || undefined,
          jobTitle: filters.jobTitle || undefined,
          jobType: filters.jobTypes.length ? filters.jobTypes.join(',') : undefined,
          minSalary: preset.min,
          maxSalary: preset.max,
          urgencyLevel: filters.urgent ? 'URGENT' : undefined,
          latitude: coords?.lat,
          longitude: coords?.lon,
          // The CITY'S radius, not a flat number (TD-06) — see lib/cities.ts
          // for why each city needs its own.
          maxDistance: coords?.radius,
          sortBy: 'postedAt',
          sortOrder: 'desc',
          page,
          limit: PAGE_SIZE,
        }
        const res = await jobSeekerAPI.getJobFeed(query)
        if (ignore) return
        setJobs((prev) => (page === 1 ? res.jobs : [...prev, ...res.jobs]))
        setHasMore(!!res.pagination?.hasNextPage)
        setTotal(res.pagination?.total ?? 0)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : t('seeker:jobFeed.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [seeded, page, filters, reloadKey, t])

  const commitSearch = () => applyFilters((prev) => ({ ...prev, search: searchDraft.trim() }))

  const setCity = (city: string) => applyFilters((prev) => ({ ...prev, city }))

  const toggleJobType = (value: string) =>
    applyFilters((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(value)
        ? prev.jobTypes.filter((v) => v !== value)
        : [...prev.jobTypes, value],
    }))

  const setSalaryPreset = (key: string) => applyFilters((prev) => ({ ...prev, salaryPreset: key }))

  const setDepartment = (name: string) =>
    applyFilters((prev) => ({ ...prev, category: prev.category === name ? '' : name }))

  const setRole = (name: string) =>
    applyFilters((prev) => ({ ...prev, jobTitle: prev.jobTitle === name ? '' : name }))

  const setUrgent = (urgent: boolean) => applyFilters((prev) => ({ ...prev, urgent }))

  const clearAll = () => {
    setSearchDraft('')
    applyFilters(() => EMPTY_FILTERS)
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.city ||
    filters.jobTypes.length > 0 ||
    filters.salaryPreset !== 'all' ||
    !!filters.category ||
    !!filters.jobTitle ||
    filters.urgent

  const radioRowCls = 'flex items-center gap-2 text-sm text-black cursor-pointer'

  // Department/Role Category are single-select — the backend's `category`
  // and `jobTitle` filters each take exactly one value — so they're native
  // radio groups, not checkboxes. A plain radio input doesn't fire `onChange`
  // when you click the one that's already selected (no value change), which
  // is what `onClick` is for below: it's what makes "click the selected
  // option again to clear the filter" work, matching the click-to-toggle
  // behavior a checkbox would give for free.
  const singleSelectRadioProps = (groupValue: string, name: string, onPick: (name: string) => void) => ({
    checked: groupValue === name,
    onChange: () => onPick(name),
    onClick: () => {
      if (groupValue === name) onPick(name)
    },
  })

  return (
    <div className="min-h-screen bg-white">
      <EmployeeHeader active="jobFeed" />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] py-6 sm:py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-1">{t('seeker:jobFeed.pageTitle')}</h1>
        <p className="text-sm sm:text-base text-[#717182] mb-6">{t('seeker:jobFeed.pageSubtitle')}</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('seeker:jobFeed.searchPlaceholder')}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
              className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
            />
          </div>
          <div className="flex-1 min-w-[180px] max-w-[300px] relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              aria-label={t('seeker:landing.selectLocation')}
              value={filters.city}
              onChange={(e) => setCity(e.target.value)}
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
            onClick={commitSearch}
            className="h-12 px-6 lg:px-[43px] bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="text-base">{t('seeker:jobFeed.searchJobs')}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter sidebar — bordered card, matching the Figma reference. */}
          <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-[#dddddd] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-black">{t('seeker:jobFeed.filters.allFilters')}</h2>
              {hasActiveFilters && (
                <button onClick={clearAll} className="text-sm text-primary-60 hover:underline">
                  {t('seeker:jobFeed.filters.clearAll')}
                </button>
              )}
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.location')}</h3>
              <div className="relative">
                {/* `appearance-none` + this chevron replace the browser's own
                    dropdown arrow, which rendered heavy and hugged the
                    right edge on Windows Chrome/Edge — `pr-8` reserves the
                    room this icon actually needs instead of the native
                    arrow's tighter, non-adjustable inset. */}
                <select
                  aria-label={t('seeker:jobFeed.filters.location')}
                  value={filters.city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 bg-[#f3f3f5] rounded-lg text-sm appearance-none cursor-pointer"
                >
                  <option value="">{t('seeker:jobFeed.anyLocation')}</option>
                  {CITY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(cityLabelKey(key))}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Job Type — 2-column grid, matching the Figma reference. */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.jobType')}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {JOB_TYPES.map((value) => (
                  <label key={value} className={radioRowCls}>
                    <FilterCheckbox checked={filters.jobTypes.includes(value)} onChange={() => toggleJobType(value)} />
                    {t(`seeker:jobFeed.jobType.${value}`)}
                  </label>
                ))}
              </div>
            </div>

            {/* Salary Range — single column, one option per line. */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.salaryRange')}</h3>
              <div className="flex flex-col gap-2">
                {SALARY_PRESETS.map((preset) => (
                  <label key={preset.key} className={radioRowCls}>
                    <FilterRadio
                      name="salary-preset"
                      checked={filters.salaryPreset === preset.key}
                      onChange={() => setSalaryPreset(preset.key)}
                    />
                    {salaryPresetLabel(preset, t)}
                  </label>
                ))}
              </div>
            </div>

            {/* Job Department — single-select (backend `category` takes one
                value), so a radio group; see singleSelectRadioProps above. */}
            {departments.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.department')}</h3>
                <div className="flex flex-col gap-2">
                  {visibleDepartments.map((c) => (
                    <label key={c.name} className={radioRowCls}>
                      <FilterRadio name="department-filter" {...singleSelectRadioProps(filters.category, c.name, setDepartment)} />
                      {c.name}
                    </label>
                  ))}
                </div>
                {departments.length > DEPARTMENT_PREVIEW && (
                  <button
                    onClick={() => setDepartmentExpanded((v) => !v)}
                    className="mt-2 text-sm text-primary-60 hover:underline flex items-center gap-1"
                  >
                    {departmentExpanded ? t('seeker:jobFeed.filters.viewLess') : t('seeker:jobFeed.filters.viewMore')}
                    {departmentExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}

            {/* Job Role Category — same single-select reasoning as Department. */}
            {roles.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.roleCategory')}</h3>
                <div className={`flex flex-col gap-2 ${roleExpanded ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
                  {visibleRoles.map((name) => (
                    <label key={name} className={radioRowCls}>
                      <FilterRadio name="role-category-filter" {...singleSelectRadioProps(filters.jobTitle, name, setRole)} />
                      {name}
                    </label>
                  ))}
                </div>
                {roles.length > ROLE_PREVIEW && (
                  <button
                    onClick={() => setRoleExpanded((v) => !v)}
                    className="mt-2 text-sm text-primary-60 hover:underline flex items-center gap-1"
                  >
                    {roleExpanded ? t('seeker:jobFeed.filters.viewLess') : t('seeker:jobFeed.filters.viewMore')}
                    {roleExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.urgentOpening')}</h3>
              <label className={radioRowCls}>
                <FilterCheckbox checked={filters.urgent} onChange={() => setUrgent(!filters.urgent)} />
                {t('seeker:jobFeed.filters.urgentOpeningLabel')}
              </label>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <JobFeedSection
              bare
              heading={
                !loading && !error ? (
                  <p className="text-sm font-medium text-black mb-4">{t('seeker:jobFeed.showingCount', { count: total })}</p>
                ) : null
              }
              count={total}
              loading={loading}
              error={error}
              jobs={jobs}
              kind="all"
              noLocation={false}
              hasMore={hasMore}
              onShowMore={() => setPage((p) => p + 1)}
              onRetry={() => setReloadKey((k) => k + 1)}
              savedIds={savedIds}
              savingIds={savingIds}
              onToggleSave={toggleSave}
              from="job-feed"
            />
          </div>
        </div>
      </div>

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
