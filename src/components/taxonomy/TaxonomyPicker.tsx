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

import { useTranslation } from 'react-i18next'
import { useCategories } from '@/hooks/useCategories'
import type { TaxonomyTriple } from '@/lib/api'

interface TaxonomyPickerProps {
  value: TaxonomyTriple
  onChange: (next: TaxonomyTriple) => void
  /** 'form' → "Select a…" placeholders; 'filter' → "All …" (no selection = no filter). */
  variant?: 'form' | 'filter'
  /** Hide the third (JobTitle) level — e.g. a coarse category/sector-only filter. */
  showJobTitle?: boolean
  disabled?: boolean
  /** Marks each label with a `*` (visual only; hosts own their validation). */
  required?: boolean
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
  const star = required ? <span className="text-red-500"> *</span> : null

  return (
    <div className={className ?? 'space-y-4'}>
      {/* Category */}
      <div>
        <label className={labelClassName}>
          {t('taxonomy:category')}
          {star}
        </label>
        <select
          className={selectClassName}
          value={value.category ?? ''}
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
        <label className={labelClassName}>
          {t('taxonomy:sector')}
          {star}
        </label>
        <select
          className={selectClassName}
          value={value.sector ?? ''}
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
          <label className={labelClassName}>
            {t('taxonomy:jobTitle')}
            {star}
          </label>
          <select
            className={selectClassName}
            value={value.jobTitle ?? ''}
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
