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

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories } from '@/hooks/useCategories'
import type { TaxonomyTriple } from '@/lib/api'

/** The three levels, by the key each one carries in a TaxonomyTriple. */
export type TaxonomyLevel = 'category' | 'sector' | 'jobTitle'

interface TaxonomyPickerProps {
  value: TaxonomyTriple
  onChange: (next: TaxonomyTriple) => void
  /** 'form' → "Select a…" placeholders; 'filter' → "All …" (no selection = no filter). */
  variant?: 'form' | 'filter'
  /** Hide the third (JobTitle) level — e.g. a coarse category/sector-only filter. */
  showJobTitle?: boolean
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

const DEFAULT_SELECT_CLS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
const DEFAULT_LABEL_CLS = 'block text-sm font-medium text-black mb-1'

export function TaxonomyPicker({
  value,
  onChange,
  variant = 'form',
  showJobTitle = true,
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
  )
}

export default TaxonomyPicker
