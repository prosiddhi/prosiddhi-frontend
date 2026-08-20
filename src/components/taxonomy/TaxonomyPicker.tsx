'use client'

// Shared 3-level cascading taxonomy picker (Category → Sector → JobTitle).
//
// Emits a `{ category, sector, jobTitle }` TaxonomyTriple of NAMES (empty levels
// are undefined). Options are driven by the live tree via useCategories(), so the
// triple is always a valid parent-child path the BE `validateTriple` will accept.
//
// Consumers: seeker registration (PJP-81), employer JobForm (PJP-106), job-feed
// filter (PJP-138), profile edit (PJP-112). Styling is overridable via
// selectClassName / labelClassName so it can match each host form; `variant`
// switches placeholder wording between a form ("Select a…") and a filter ("All…").

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import type { TaxonomyCategory, TaxonomyTriple } from '@/lib/api'

/** The three levels, by the key each one carries in a TaxonomyTriple. */
export type TaxonomyLevel = 'category' | 'sector' | 'jobTitle'

interface TaxonomyPickerProps {
  value: TaxonomyTriple
  onChange: (next: TaxonomyTriple) => void
  /** 'form' → "Select a…" placeholders; 'filter' → "All …" (no selection = no filter). */
  variant?: 'form' | 'filter'
  /** Hide the third (JobTitle) level — e.g. a coarse category/sector-only filter. */
  showJobTitle?: boolean
  /**
   * Offer the job-title search box above the three selects (TD-22).
   *
   * On by default wherever the third level is shown, because the cascade is the
   * complaint: two dropdowns are dead until a parent is chosen, and someone who
   * knows they are a welder should not have to guess which of seven categories
   * hides "Welder". Turned off automatically when `showJobTitle` is false —
   * searching for a job title makes no sense on a picker that cannot express
   * one.
   */
  searchable?: boolean
  disabled?: boolean
  /**
   * Which levels to mark required.
   *
   * `true` marks all three — the seeker flows, where the backend genuinely
   * requires the whole triple (auth.validator.ts: preferredSector and
   * preferredJobTitle are both required). An array marks only those levels:
   * the job form needs it, because createJobSchema requires `category` but
   * leaves `sector` and `jobTitle` optional, so marking all three there would
   * claim two fields are mandatory when the server accepts the job without
   * them (DEF-024).
   *
   * Drives `aria-required` as well as the visual `*`.
   */
  required?: boolean | TaxonomyLevel[]
  className?: string
  selectClassName?: string
  labelClassName?: string
}

/** One job title, with the path that makes it unambiguous. */
interface FlatJobTitle {
  jobTitle: string
  sector: string
  category: string
}

/**
 * Every job title in the tree, flattened once (TD-22).
 *
 * The path is not decoration. Three of the 86 titles — "Helper", "Cleaning
 * Staff", "Design Engineer" — sit under more than one parent, so a bare list of
 * names would offer the same word twice with no way to tell them apart.
 */
function flattenJobTitles(categories: TaxonomyCategory[]): FlatJobTitle[] {
  const out: FlatJobTitle[] = []
  for (const c of categories) {
    for (const s of c.sectors ?? []) {
      for (const j of s.jobTitles ?? []) {
        out.push({ jobTitle: j.name, sector: s.name, category: c.name })
      }
    }
  }
  return out
}

/**
 * Rank matches so the useful ones are not buried.
 *
 * A word-start match beats one buried mid-word. On the current tree, typing
 * "si" puts "Site Helper" and "Site Supervisor" above "Design Engineer" and
 * "Sales Assistant", which merely contain those letters. Within a tier the
 * tree's own order is kept, which is the order every dropdown on the site shows.
 *
 * ⚠️ **Job titles only, deliberately.** A seeker typing "welding" — a real
 * SECTOR name — gets nothing, even though "Welder" sits inside it. Matching
 * sector or category names looks like an easy improvement and is not: choosing a
 * result sets all three levels, so a sector hit would have to invent the job
 * title the seeker never picked.
 */
function searchJobTitles(all: FlatJobTitle[], query: string, limit = 8): FlatJobTitle[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const starts: FlatJobTitle[] = []
  const contains: FlatJobTitle[] = []
  for (const item of all) {
    const name = item.jobTitle.toLowerCase()
    const at = name.indexOf(q)
    if (at < 0) continue
    // Start of the name, or start of any word inside it.
    if (at === 0 || name[at - 1] === ' ') starts.push(item)
    else contains.push(item)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

const DEFAULT_SELECT_CLS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
const DEFAULT_LABEL_CLS = 'block text-sm font-medium text-black mb-1'

export function TaxonomyPicker({
  value,
  onChange,
  variant = 'form',
  showJobTitle = true,
  searchable = true,
  disabled = false,
  required = false,
  className,
  selectClassName = DEFAULT_SELECT_CLS,
  labelClassName = DEFAULT_LABEL_CLS,
}: TaxonomyPickerProps) {
  const { t } = useTranslation()
  const { categories, loading, error, reload } = useCategories()
  // TD-39. Each label must point at its own control with `htmlFor`, and a
  // <select> has no placeholder to fall back on — without this a screen reader
  // announces "combo box, required" with no field name at all.
  //
  // useId, not a literal: this component is on four screens and nothing stops
  // two of them appearing at once. Duplicate ids would silently attach every
  // label to the FIRST matching control, which is worse than no label because
  // it reads as correct.
  const id = useId()

  const sectors = categories.find((c) => c.name === value.category)?.sectors ?? []
  const jobTitles = sectors.find((s) => s.name === value.sector)?.jobTitles ?? []

  // Selecting a parent clears its descendants so the triple never carries a stale
  // child that would fail the BE parent-child check.
  const handleCategory = (name: string) =>
    onChange({ category: name || undefined, sector: undefined, jobTitle: undefined })
  const handleSector = (name: string) =>
    onChange({ category: value.category, sector: name || undefined, jobTitle: undefined })
  const handleJobTitle = (name: string) =>
    onChange({ ...value, jobTitle: name || undefined })

  const isFilter = variant === 'filter'
  const controlsDisabled = disabled || loading || error

  // TD-22 — search a job title directly, instead of guessing its parents.
  //
  // Category → Sector → Job title left two of the three dropdowns dead until the
  // one above was answered, and a person who knows they are a welder has no way
  // to know that "Welder" lives under Manufacturing › Fabrication. The selects
  // stay for anyone who would rather browse; this is the other door.
  const [query, setQuery] = useState('')
  // Separate from `query`, because the list has to close on Escape and on click
  // away WITHOUT throwing away what was typed. Keying the list off the query
  // alone left it open forever: it overlaid the three selects below and the only
  // way to dismiss it was to empty the box by hand.
  const [open, setOpen] = useState(false)
  const showSearch = searchable && showJobTitle
  // Flatten once per tree, not per keystroke. The tree is module-cached by
  // useCategories, so `categories` is referentially stable between loads.
  const flat = useMemo(() => flattenJobTitles(categories), [categories])
  // Debounced, because the results sit in an `aria-live` region: undebounced, a
  // screen reader re-reads up to eight rows — each a title AND its category path
  // — on every keystroke, so typing "welder" is six full list readings. 250ms is
  // short enough that a sighted user does not perceive lag and long enough that
  // an ordinary typing burst produces one announcement. Same reason TD-41
  // debounced the job form's status line.
  const [settledQuery, setSettledQuery] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const matches = useMemo(
    () => (showSearch ? searchJobTitles(flat, settledQuery) : []),
    [flat, settledQuery, showSearch]
  )
  // A real job title from the tree, for the placeholder — the SHORTEST one.
  //
  // Not `flat[0]`, which is whatever the backend happens to return first and is
  // "Design Engineer" today but "Quality Control Engineer" (24 characters) after
  // any reorder. The placeholder is native script plus a Latin title, and Indic
  // text already runs 20–30% longer than English, so the tail is what clips
  // first inside a 360px input. Shortest is both stable and safest — it is
  // "Mason" on the current tree, which is also the most ordinary trade in it.
  //
  // Seeded from the first entry rather than `''`, so a zero-length title
  // appearing mid-list cannot poison the accumulator: with a `!best` guard, ''
  // wins the comparison and then the NEXT title replaces it, giving neither the
  // shortest nor a stable answer.
  const exampleJob = useMemo(
    () =>
      flat.reduce(
        (best, f) => (f.jobTitle.length < best.length ? f.jobTitle : best),
        flat[0]?.jobTitle ?? ''
      ),
    [flat]
  )
  const searching = showSearch && open && settledQuery.trim().length >= 2

  // Picking a result answers all three levels at once — which is the entire
  // point of the box.
  //
  // Focus is put back on the input, and that is not a nicety. Choosing clears
  // the query, which unmounts the list — including the button just activated —
  // so React drops focus to <body>. A keyboard user's next Tab would restart
  // from the top of the page and walk the whole header again before reaching
  // the Category select two rows below (WCAG 2.4.3). The same applies to the
  // clear button, which also unmounts itself.
  const searchRef = useRef<HTMLInputElement>(null)
  const restoreFocus = () => searchRef.current?.focus()

  const pickJobTitle = (hit: FlatJobTitle) => {
    onChange({ category: hit.category, sector: hit.sector, jobTitle: hit.jobTitle })
    setQuery('')
    setSettledQuery('')
    setOpen(false)
    restoreFocus()
  }
  // aria-hidden on the star: the asterisk is decoration, and `aria-required`
  // below is what actually tells a screen reader the field is mandatory.
  const requiredLevels: TaxonomyLevel[] =
    required === true ? ['category', 'sector', 'jobTitle'] : required || []
  const isRequired = (level: TaxonomyLevel) => requiredLevels.includes(level)
  const star = (level: TaxonomyLevel) =>
    isRequired(level) ? (
      <span className="text-red-500" aria-hidden="true">
        {' '}
        *
      </span>
    ) : null

  return (
    <>
      {showSearch && (
        // Deliberately OUTSIDE the grid `className` the hosts pass in: every
        // caller lays the three selects out as columns, and a search box dropped
        // into that grid becomes a third of a row. It spans the full width above
        // them instead.
        //
        // `col-span-full` because the seeker profile drops this straight into a
        // `grid sm:grid-cols-2` of its own, and without it the box takes one
        // column while the selects below take the rest. Outside a grid — the job
        // form's `space-y-4` section, registration's plain block — the class is
        // inert, which is why it need not be another prop.
        //
        // (The job feed's filter panel IS a four-column grid, but it passes
        // `searchable={false}`, so this never renders there. Do not cite it as
        // the reason.)
        <div
          className="relative mb-4 col-span-full"
          // Closes when focus leaves the box AND the list together. Checking
          // relatedTarget rather than closing on any blur is what lets a result
          // be clicked at all — the click blurs the input first, and an
          // unconditional close would unmount the button mid-click.
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              e.stopPropagation()
            }
          }}
        >
          <label className={labelClassName} htmlFor={`${id}-search`}>
            {t('taxonomy:searchLabel')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id={`${id}-search`}
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              // Focus AND click, not just focus. Escape closes the list but does
              // not blur the input, so after dismissing it the field still holds
              // focus and clicking back in fires no focus event — the list could
              // only be recovered by typing another character.
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              disabled={controlsDisabled}
              // The example comes from the LIVE TREE, not from the translation.
              //
              // Taxonomy names are `@unique` string primary keys on the backend
              // and are rendered raw, so every one of the ten locales shows
              // English category and job-title names — the dropdowns below this
              // box included. A translated example would therefore invite a
              // Gujarati reader to type "કડિયો", which matches nothing, and the
              // box would fail precisely the reader it was built for.
              //
              // Naming a real row instead means the example is always something
              // the search can actually find, in every language, and it cannot
              // drift when the taxonomy changes. Same reasoning as the city
              // datalist in TD-03: the surrounding words are the reader's, the
              // value is the data's.
              // While the tree is still loading there is no example, and
              // interpolating an empty one leaves a dangling half-sentence —
              // "Type a job, e.g. " on a greyed-out input, or "வேலை, எ.கா. ".
              // Gated on `loading`, not on the example being empty. A tree that
              // loads and turns out to be empty is a different thing from one
              // still in flight, and conflating them leaves an enabled box
              // reading "Loading…" forever on an unseeded environment.
              placeholder={
                loading
                  ? t('taxonomy:loading')
                  : exampleJob
                    ? t('taxonomy:searchPlaceholder', { example: exampleJob })
                    : t('taxonomy:searchLabel')
              }
              className={`${selectClassName} pl-9 ${query ? 'pr-9' : ''}`}
              autoComplete="off"
              // Deliberately NOT role="combobox". That role promises the ARIA
              // combobox contract — arrow keys moving a virtual cursor through
              // `role="option"` children tracked by aria-activedescendant — and
              // none of that is implemented here. A screen reader would announce
              // "combo box, expanded" and then Up/Down would do nothing, which
              // is a worse experience than the plain search field this actually
              // is. The results below are ordinary buttons, so Tab reaches them
              // and Enter picks one — TWO tabs, because the Clear button sits
              // inside the field ahead of the list. Both are asserted in
              // scripts/smoke/smoke-td22.js.
              aria-describedby={`${id}-search-hint`}
            />
            {query && (
              <button
                type="button"
                // Same Safari reason as the result buttons above.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery('')
                  setSettledQuery('')
                  setOpen(false)
                  restoreFocus()
                }}
                aria-label={t('taxonomy:searchClear')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        {/* The live region is the WRAPPER, mounted always, and the list appears
            inside it. Results arrive with no navigation, so without a live
            region a screen-reader user types and hears nothing — but mounting
            the region and its first content in the same commit announces
            nothing either, which is the trap TD-41's status line documents. An
            always-present empty wrapper means the content is a CHANGE when it
            arrives. The list's own text is what gets read, so there is no count
            string to translate and "no job matches" is announced like a hit. */}
          <div aria-live="polite" className={searching ? '' : 'sr-only'}>
          {searching && (
            <ul
              id={`${id}-results`}
              className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[#717182]">
                  {t('taxonomy:searchNoMatch', { query: settledQuery.trim() })}
                </li>
              ) : (
                matches.map((hit) => (
                  <li key={`${hit.category}|${hit.sector}|${hit.jobTitle}`}>
                    <button
                      type="button"
                      // Safari and iOS Safari do NOT focus a <button> on click,
                      // so the input's blur fires with relatedTarget null, the
                      // list unmounts, and the click lands on nothing — the box
                      // is simply dead there. Chromium focuses buttons, which is
                      // why smoke-td22.js cannot see this. Suppressing the
                      // default pointer-down keeps focus on the input so the
                      // close never runs before the click.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickJobTitle(hit)}
                      className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-primary-10 focus:bg-primary-10 focus:outline-none"
                    >
                      <span className="block text-sm text-black">{hit.jobTitle}</span>
                      {/* The path, because three titles in the tree sit under
                          more than one parent — "Helper" alone is ambiguous. */}
                      <span className="block text-xs text-[#717182]">
                        {hit.category} › {hit.sector}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          </div>
          <p id={`${id}-search-hint`} className="text-xs text-[#717182] mt-1">
            {t('taxonomy:searchHint')}
          </p>
        </div>
      )}

      <div className={className ?? 'space-y-4'}>
        {/* Category */}
      <div>
        <label className={labelClassName} htmlFor={`${id}-category`}>
          {t('taxonomy:category')}
          {star('category')}
        </label>
        <select
          id={`${id}-category`}
          className={selectClassName}
          value={value.category ?? ''}
          aria-required={isRequired('category')}
          onChange={(e) => handleCategory(e.target.value)}
          disabled={controlsDisabled}
        >
          <option value="">
            {loading
              ? t('taxonomy:loading')
              : isFilter
                ? t('taxonomy:allCategories')
                : t('taxonomy:selectCategory')}
          </option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sector */}
      <div>
        <label className={labelClassName} htmlFor={`${id}-sector`}>
          {t('taxonomy:sector')}
          {star('sector')}
        </label>
        <select
          id={`${id}-sector`}
          className={selectClassName}
          value={value.sector ?? ''}
          aria-required={isRequired('sector')}
          onChange={(e) => handleSector(e.target.value)}
          disabled={controlsDisabled || !value.category}
        >
          <option value="">
            {!value.category
              ? t('taxonomy:selectCategoryFirst')
              : isFilter
                ? t('taxonomy:allSectors')
                : t('taxonomy:selectSector')}
          </option>
          {sectors.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Job title */}
      {showJobTitle && (
        <div>
          <label className={labelClassName} htmlFor={`${id}-jobTitle`}>
            {t('taxonomy:jobTitle')}
            {star('jobTitle')}
          </label>
          <select
            id={`${id}-jobTitle`}
            className={selectClassName}
            value={value.jobTitle ?? ''}
            aria-required={isRequired('jobTitle')}
            onChange={(e) => handleJobTitle(e.target.value)}
            disabled={controlsDisabled || !value.sector}
          >
            <option value="">
              {!value.sector
                ? t('taxonomy:selectSectorFirst')
                : isFilter
                  ? t('taxonomy:allJobTitles')
                  : t('taxonomy:selectJobTitle')}
            </option>
            {jobTitles.map((jt) => (
              <option key={jt.name} value={jt.name}>
                {jt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {t('taxonomy:error')}{' '}
          <button type="button" onClick={reload} className="underline hover:no-underline">
            {t('taxonomy:retry')}
          </button>
        </p>
      )}
      </div>
    </>
  )
}

export default TaxonomyPicker
