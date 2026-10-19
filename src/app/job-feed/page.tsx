'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { StateCitySelect, type SelectedCity } from '@/components/location/StateCitySelect'
import { useCities, useStates } from '@/hooks/useLocations'
import { jobLocationFilters, parseJobLocation } from '@/lib/jobLocationParams'
import { Footer } from '@/components/home/Footer'
import { jobSeekerAPI, type Job, type JobFeedFilters } from '@/lib/api'
import { useCategories } from '@/hooks/useCategories'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import type { TaxonomyCategory } from '@/lib/api'
import { JobFeedSection } from '@/components/job/JobFeedSection'
import { AlertCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

const PAGE_SIZE = 10

// Stored in `error` when the request fails without a message of its own.
const LOAD_ERROR_KEY = 'seeker:jobFeed.loadError'

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

// The State / City selects: the look the single location select had in each place,
// so the swap is not a restyle.
const BAR_SELECT_CLS =
  'w-full h-12 px-3 bg-[#f3f3f5] rounded-lg text-base text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed'
const SIDEBAR_SELECT_CLS =
  'w-full h-11 px-3 bg-[#f3f3f5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed'

interface AppliedFilters {
  search: string
  /** The state being filtered on; with `city` null it is a state-wide search. */
  stateCode: number | null
  city: SelectedCity | null
  jobTypes: string[]
  salaryPreset: string
  category: string
  jobTitle: string
  urgent: boolean
}

const EMPTY_FILTERS: AppliedFilters = {
  search: '',
  stateCode: null,
  city: null,
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
  // Scoped to the selected department once one is picked, so Role Category
  // only ever offers roles that actually exist under it — otherwise a
  // seeker could pick a role from another department and get zero results.
  const roleSourceCategories = useMemo(
    () => (filters.category ? departments.filter((c) => c.name === filters.category) : departments),
    [departments, filters.category]
  )
  const roles = useMemo(() => flatJobTitleNames(roleSourceCategories), [roleSourceCategories])
  const visibleDepartments = departmentExpanded ? departments : departments.slice(0, DEPARTMENT_PREVIEW)
  const visibleRoles = roleExpanded ? roles : roles.slice(0, ROLE_PREVIEW)

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  // "Show Less" only hides loaded jobs past the first PAGE_SIZE — `jobs` and
  // `page` stay as they are, so collapsing never refetches and re-expanding
  // needs no request. Reset by applyFilters below.
  const [collapsed, setCollapsed] = useState(false)

  // Every filter change goes through this: it updates the filter AND resets
  // to page 1 in the SAME state update, so the fetch effect below only ever
  // sees a consistent (new filters, page 1) pair. Splitting "reset page" into
  // its own effect keyed on `filters` used to fire both effects in the same
  // commit — the fetch effect ran once with the OLD page against the NEW
  // filters (a wasted, often-empty request for e.g. page 2 of a brand new
  // query) before the reset effect corrected it a render later. The sidebar
  // applies every control immediately on click, so that double-fetch fired
  // on nearly every filter change a seeker made past page 1.
  //
  // Stable (useCallback) because the memoised location pickers' handlers call it.
  const applyFilters = useCallback((updater: (prev: AppliedFilters) => AppliedFilters) => {
    setFilters(updater)
    setPage(1)
    setJobs([])
    setHasMore(false)
    setError('')
    setCollapsed(false)
  }, [])

  const hasExtraJobs = jobs.length > PAGE_SIZE
  const visibleJobs = useMemo(() => (collapsed ? jobs.slice(0, PAGE_SIZE) : jobs), [collapsed, jobs])

  const handleShowMore = () => {
    // Collapsed: the hidden jobs are already loaded — show them, no request.
    if (collapsed) setCollapsed(false)
    else setPage((p) => p + 1)
  }

  const handleShowLess = () => {
    setCollapsed(true)
    const results = document.getElementById('job-results')
    results?.scrollIntoView({ block: 'start' })
    // The Show Less button unmounts, so move focus to the results (tabIndex -1)
    // instead of letting it fall to <body>. The scroll above already ran.
    results?.focus({ preventScroll: true })
  }

  // The two location pickers (top bar, sidebar) each keep their own State select,
  // so one cannot see a state the other just chose. Bumping the OTHER one's key
  // remounts it on the current state; the one being used is never remounted, so it
  // keeps focus. (The city is a controlled value and needs no help.)
  const [pickerKeys, setPickerKeys] = useState({ bar: 0, side: 0 })

  // The state and city a link asked for, until the seeker chooses a state or city
  // themselves. They are only claims until the backend's lists confirm them
  // (`stateCheck`, `cityCheck`).
  const [linkStateCode, setLinkStateCode] = useState<number | null>(null)
  const [linkCityId, setLinkCityId] = useState<string | null>(null)

  // Handlers for each picker. Memoised so the memoised pickers do not re-render on
  // every keystroke in the keyword box. A change goes through `applyFilters`, so it
  // resets to page 1 like every other filter.
  const pickerProps = useMemo(() => {
    const forPicker = (other: 'bar' | 'side') => ({
      onStateChange: (stateCode: number | null) => {
        applyFilters((prev) => ({ ...prev, stateCode, city: null }))
        setPickerKeys((keys) => ({ ...keys, [other]: keys[other] + 1 }))
        setLinkStateCode(null)
        setLinkCityId(null)
      },
      onChange: (city: SelectedCity | null) => {
        applyFilters((prev) => ({ ...prev, city }))
        // Only a real city is an answer. A null can be the picker itself dropping a
        // city its list does not contain, which is the case being checked.
        if (city) setLinkCityId(null)
      },
    })
    return { bar: forPicker('side'), side: forPicker('bar') }
  }, [applyFilters])

  // The backend's state list is shared with the pickers (one module cache, so no
  // extra request) and is what a link's state is checked against. A state the list
  // does not contain would otherwise be searched anyway — the BE answers an unknown
  // code with an empty 200 — leaving a blank State select over an empty feed.
  //   'ok'       no link state, or it is in the list: search as filtered
  //   'pending'  the list is still loading
  //   'unknown'  the list does not contain it: say so, search nothing
  // A list that failed to load cannot judge, so it counts as 'ok'; once the seeker
  // retries it and the list lacks the state, this turns 'unknown'.
  const { states, loading: statesLoading, error: statesError } = useStates()
  const stateCheck =
    linkStateCode === null || statesError
      ? 'ok'
      : statesLoading
        ? 'pending'
        : states.some((s) => s.code === linkStateCode)
          ? 'ok'
          : 'unknown'

  // The state's city list is shared with the pickers too, and is what a seeded city
  // is checked against. Not asked for while the state itself is unconfirmed.
  const {
    cities: stateCities,
    loading: stateCitiesLoading,
    error: stateCitiesError,
  } = useCities(stateCheck === 'ok' ? filters.stateCode : null)
  // Searching a city the list does not contain fails (the BE answers 400), and once
  // the picker drops that city it would quietly become a whole-state search the
  // seeker never asked for. So until the link's city is confirmed nothing is searched:
  //   'ok'       no link city, or it is in the list: search as filtered
  //   'pending'  the list is still loading
  //   'unknown'  the list does not contain it: say so, search nothing
  // A list that failed to load cannot judge, so it counts as 'ok': the id is sent
  // and the BE refuses an unknown one with an error the feed shows, never a wider search.
  // Derived from the link's own id, not from `filters.city`, because the picker nulls
  // that city when it drops it — and a seeker who clears a VALID city must not land here.
  const cityCheck =
    linkCityId === null || stateCitiesError
      ? 'ok'
      : stateCitiesLoading
        ? 'pending'
        : stateCities.some((c) => c.id === linkCityId)
          ? 'ok'
          : 'unknown'

  // What the page does about the link's location: the state is judged first, because
  // a city means nothing under a state that does not exist.
  const locationCheck = stateCheck !== 'ok' ? stateCheck : cityCheck

  // What the pickers are given. While the link's location is unconfirmed (or wrong)
  // they show nothing chosen, so they never claim a state or city the page is not
  // searching; once it is confirmed they remount on it (see their `key`).
  const pickersReady = stateCheck === 'ok'
  const pickerStateCode = pickersReady ? filters.stateCode : null
  // A link's city is known only by id. Until its list arrives the select is disabled,
  // so label it as loading rather than leaving a blank entry. (A failed list keeps the
  // blank label: the picker's own "Could not load the list" line explains why.)
  const pickerCity = useMemo(() => {
    if (!pickersReady || !filters.city) return null
    return filters.city.name === '' && !stateCitiesError
      ? { ...filters.city, name: t('location.loading') }
      : filters.city
  }, [pickersReady, filters.city, stateCitiesError, t])

  // Seed from the URL, so the seeker Home page's search bar actually lands
  // somewhere: /job-feed?search=welder&stateCode=28&cityId=… arrives already
  // filtered. A malformed location is dropped, not guessed at (jobLocationParams.ts).
  //
  // Read in an EFFECT, not a lazy useState initialiser — useSearchParams is
  // empty during the server render, so an initialiser captures nulls and the
  // values are lost (the DEF-012 bug). By the time effects run, the params
  // are there.
  const searchParams = useSearchParams()
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    const search = searchParams.get('search')?.trim() ?? ''
    const { stateCode, cityId } = parseJobLocation(searchParams)
    if (search || stateCode !== null) {
      setSearchDraft(search)
      // Only the id is known here; the picker shows the name once the state's list
      // loads. Until the lists confirm the state and id nothing is searched.
      setFilters((prev) => ({ ...prev, search, stateCode, city: cityId ? { id: cityId, name: '' } : null }))
      setLinkStateCode(stateCode)
      setLinkCityId(cityId)
      // The pickers mounted before this ran: remount them on the seeded state.
      if (stateCode !== null) setPickerKeys({ bar: 1, side: 1 })
    }
    setSeeded(true)
    // Deliberately mount-only: this seeds the INITIAL filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 'pending' / 'unknown': the link's state or city is not confirmed, so there is
    // nothing trustworthy to search for. The render below says why.
    if (!seeded || locationCheck !== 'ok') return
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const preset = SALARY_PRESETS.find((p) => p.key === filters.salaryPreset) ?? SALARY_PRESETS[0]
        const query: JobFeedFilters = {
          search: filters.search || undefined,
          category: filters.category || undefined,
          jobTitle: filters.jobTitle || undefined,
          jobType: filters.jobTypes.length ? filters.jobTypes.join(',') : undefined,
          minSalary: preset.min,
          maxSalary: preset.max,
          urgencyLevel: filters.urgent ? 'URGENT' : undefined,
          // `cityId` for a city, `stateCode` for a bare state, nothing for
          // "anywhere" — and never coordinates or a radius for these.
          ...jobLocationFilters({ stateCode: filters.stateCode, cityId: filters.city?.id ?? null }),
          sortBy: 'postedAt',
          sortOrder: 'desc',
          page,
          limit: PAGE_SIZE,
        }
        const res = await jobSeekerAPI.getJobFeed(query)
        if (ignore) return
        setJobs((prev) => {
          if (page === 1) return res.jobs
          // Offset paging can repeat a job across pages; keep the loaded copy and order.
          const loaded = new Set(prev.map((j) => j.id))
          return [...prev, ...res.jobs.filter((j) => !loaded.has(j.id))]
        })
        setHasMore(!!res.pagination?.hasNextPage)
        setTotal(res.pagination?.total ?? 0)
      } catch (err) {
        // A key, not translated text, so the effect does not depend on `t`
        // (a language switch would re-fetch the current page). Translated at render.
        if (!ignore) setError(err instanceof Error ? err.message : LOAD_ERROR_KEY)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [seeded, locationCheck, page, filters, reloadKey])

  const commitSearch = () => applyFilters((prev) => ({ ...prev, search: searchDraft.trim() }))

  const toggleJobType = (value: string) =>
    applyFilters((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(value)
        ? prev.jobTypes.filter((v) => v !== value)
        : [...prev.jobTypes, value],
    }))

  const setSalaryPreset = (key: string) => applyFilters((prev) => ({ ...prev, salaryPreset: key }))

  const setDepartment = (name: string) =>
    applyFilters((prev) => ({
      ...prev,
      category: prev.category === name ? '' : name,
      // The previously selected role may not exist under the new department.
      jobTitle: '',
    }))

  const setRole = (name: string) =>
    applyFilters((prev) => ({ ...prev, jobTitle: prev.jobTitle === name ? '' : name }))

  const setUrgent = (urgent: boolean) => applyFilters((prev) => ({ ...prev, urgent }))

  const clearAll = () => {
    setSearchDraft('')
    applyFilters(() => EMPTY_FILTERS)
    // Each picker holds its own State select, so both start over.
    setPickerKeys((keys) => ({ bar: keys.bar + 1, side: keys.side + 1 }))
    setLinkStateCode(null)
    setLinkCityId(null)
  }

  const hasActiveFilters =
    !!filters.search ||
    filters.stateCode !== null ||
    filters.jobTypes.length > 0 ||
    filters.salaryPreset !== 'all' ||
    !!filters.category ||
    !!filters.jobTitle ||
    filters.urgent

  // While the link's city is being checked nothing has been requested, so `loading`
  // is still false; show the spinner rather than a flash of "No jobs found".
  const feedLoading = loading || locationCheck === 'pending'

  // The one error the heading and the section both read. Collapsed: hidden, so
  // Show More can re-expand the loaded jobs without a request; it comes back once
  // expanded.
  const shownError = collapsed ? '' : error === LOAD_ERROR_KEY ? t(LOAD_ERROR_KEY) : error

  const radioRowCls = 'flex items-center gap-2 min-h-[44px] text-sm text-black cursor-pointer'

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
          {/* Compact State + City, kept in step with the sidebar's pair below. */}
          <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[320px] sm:max-w-[440px]">
            <StateCitySelect
              key={`bar-${pickerKeys.bar}-${pickersReady}`}
              value={pickerCity}
              initialStateCode={pickerStateCode}
              selectClassName={BAR_SELECT_CLS}
              labelClassName="sr-only"
              {...pickerProps.bar}
            />
          </div>
          <button
            onClick={commitSearch}
            className="h-12 px-6 lg:px-[43px] bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span className="text-base">{t('seeker:jobFeed.searchJobs')}</span>
          </button>
        </div>

        {/* Keyboard bypass, not a DOM reorder: the filter sidebar (below) still
            sits before the results in source order at every breakpoint — Tab
            order and screen-reader reading order stay filters-then-results,
            same as before P-17 gave mobile its own visual order via `order-*`.
            Reordering the DOM to match mobile's visual order would just move
            today's mismatch onto desktop instead of removing it (two elements,
            two breakpoints, opposite required visual sequences — CSS placement,
            Grid included, never changes DOM/AT reading order, so one breakpoint
            always has to rely on a repositioning override that diverges from
            it). This link only lets a keyboard user jump past the filter panel
            in one step, matching what a sighted mobile user already sees first;
            it does not touch the underlying order for anyone reading linearly. */}
        <a
          href="#job-results"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary-50 focus:text-primary-100 focus:rounded-lg"
        >
          {t('seeker:jobFeed.skipToResults')}
        </a>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter sidebar — bordered card, matching the Figma reference.
              `order-2 lg:order-none`: below `lg:` this column stacks under the
              results instead of above them (TD-15 — a phone's first screen
              should show job cards, not the whole filter panel), while at
              `lg:`+ resetting to `order-none` restores the source order
              (sidebar left, results right), so the desktop layout is
              byte-for-byte unchanged. Filters stay fully intact and reachable
              by scrolling past the results, not hidden behind any toggle. */}
          <aside className="order-2 lg:order-none lg:self-start lg:sticky lg:top-[91px] lg:max-h-[calc(100vh-107px)] lg:overflow-y-auto lg:overscroll-contain w-full lg:w-[280px] shrink-0 bg-white border border-[#dddddd] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-black">{t('seeker:jobFeed.filters.allFilters')}</h2>
              {hasActiveFilters && (
                <button onClick={clearAll} className="inline-flex items-center min-h-[44px] text-sm text-primary-60 hover:underline">
                  {t('seeker:jobFeed.filters.clearAll')}
                </button>
              )}
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-black mb-2">{t('seeker:jobFeed.filters.location')}</h3>
              {/* The full picker, labelled. Its two selects sit side by side from
                  `sm`, but this column is only 280px wide from `lg`, so there they
                  stack. */}
              <StateCitySelect
                key={`side-${pickerKeys.side}-${pickersReady}`}
                className="lg:[&>div:first-child]:grid-cols-1"
                value={pickerCity}
                initialStateCode={pickerStateCode}
                selectClassName={SIDEBAR_SELECT_CLS}
                labelClassName="block text-xs text-[#717182] mb-1"
                {...pickerProps.side}
              />
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
                    className="mt-2 min-h-[44px] text-sm text-primary-60 hover:underline flex items-center gap-1"
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
                    className="mt-2 min-h-[44px] text-sm text-primary-60 hover:underline flex items-center gap-1"
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

          <div id="job-results" tabIndex={-1} className="order-1 lg:order-none flex-1 min-w-0 scroll-mt-24 focus:outline-none">
            {locationCheck === 'unknown' ? (
              // The link names a state or city that does not exist. Nothing is
              // searched, and no Retry: asking again cannot make it exist. The
              // pickers above are the way forward.
              <div role="alert" className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-red-600 max-w-md">
                  {t(stateCheck === 'unknown' ? 'seeker:jobFeed.stateNotFound' : 'seeker:jobFeed.cityNotFound')}
                </p>
              </div>
            ) : (
              <JobFeedSection
                bare
                heading={
                  !feedLoading && !shownError ? (
                    <p className="text-sm font-medium text-black mb-4">{t('seeker:jobFeed.showingCount', { count: total })}</p>
                  ) : null
                }
                count={total}
                loading={feedLoading}
                error={shownError}
                jobs={visibleJobs}
                kind="all"
                noLocation={false}
                hasMore={collapsed || hasMore}
                onShowMore={handleShowMore}
                onShowLess={hasExtraJobs && !collapsed ? handleShowLess : undefined}
                endMessage={hasExtraJobs && !collapsed && !hasMore ? t('seeker:jobFeed.endOfResults') : undefined}
                onRetry={() => {
                  // Re-requests the current `page` — the failed one — and appends it.
                  setCollapsed(false)
                  setReloadKey((k) => k + 1)
                }}
                savedIds={savedIds}
                savingIds={savingIds}
                onToggleSave={toggleSave}
                from="job-feed"
              />
            )}
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
