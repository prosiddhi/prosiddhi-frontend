'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Briefcase } from 'lucide-react'
import { useCategories, hasJobTitles } from '@/hooks/useCategories'
import { publicJobsHref } from '@/lib/publicJobs'
import { categoryLabel } from '@/lib/categoryLabel'
import { CATEGORY_ICONS, CATEGORY_LUCIDE_ICONS } from '@/lib/categoryIcons'

/**
 * How many category tiles the section shows before "View More".
 *
 * The number lives here rather than inside the slice, so moving the grid to 6 or
 * 10 is a one-line change with nothing else to hunt down.
 */
const MAX_VISIBLE_CATEGORIES = 8

// The picture's box — the same size for a real icon and the briefcase fallback.
const ICON_BOX = 'w-[56px] h-[56px] sm:w-[65px] sm:h-[65px]'

/**
 * "Categories" — the Figma tile row, shared by the home page and the seeker
 * landing page. Each tile opens the public job list on /employee filtered to that
 * category. The first eight show at first; "View More" opens the rest in place and
 * "View Less" folds them away again.
 *
 * Renders NOTHING when the list fails or is empty. This is marketing, not a form:
 * a red "Couldn't load the list" on the front page tells a first-time visitor the
 * site is broken, and there is nothing they could do about it. While it loads it
 * holds the room one row of tiles needs, so the sections below do not jump when
 * it arrives.
 */
export function CategorySection() {
  const { t } = useTranslation()
  const { categories, loading, error } = useCategories()
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  // Filter before slicing, so a dead end never takes a slot; the full list is
  // kept because "View More" needs to know whether anything was left over.
  const validCategories = categories.filter(hasJobTitles)
  const visibleCategories = expanded ? validCategories : validCategories.slice(0, MAX_VISIBLE_CATEGORIES)

  if (loading) return <div aria-hidden="true" className="min-h-[360px]" />
  if (error || validCategories.length === 0) return null

  return (
    <section className="py-12 bg-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
        <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">{t('seeker:landing.categoryTitle')}</h2>
        <p className="text-sm sm:text-base text-[#717182] text-center mb-8 sm:mb-10">
          {t('seeker:landing.categorySubtitle')}
        </p>

        {/* The Figma puts all eight tiles on ONE row: eight 205px tiles and seven
            20px gaps need 1780px, hence the 1800 cap. Below ~1850px of viewport
            the row wraps, which is unavoidable at this tile size; the frame is
            drawn at 1920. Two-up on a phone, so a 390px screen is not one tile
            and 150px of empty gutter. */}
        <ul id={listId} className="flex flex-wrap justify-center gap-3 sm:gap-5 max-w-[1800px] mx-auto">
          {visibleCategories.map((category) => {
            const icon = CATEGORY_ICONS[category.name]
            const LineIcon = CATEGORY_LUCIDE_ICONS[category.name] ?? Briefcase
            return (
              <li key={category.name} className="w-[calc(50%-6px)] sm:w-[205px]">
                <Link
                  href={publicJobsHref({ category: category.name })}
                  className="h-full min-h-[166px] flex flex-col items-center justify-center gap-3 px-2 py-6 bg-white border border-[#ebebeb] rounded-[10px] text-center hover:shadow-lg hover:border-primary-30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2"
                >
                  {icon ? (
                    <Image src={icon} alt="" width={65} height={65} className={`${ICON_BOX} object-contain`} />
                  ) : (
                    <span className={`${ICON_BOX} rounded-full bg-primary-10 flex items-center justify-center`} aria-hidden="true">
                      <LineIcon className="w-7 h-7 text-primary-80" />
                    </span>
                  )}
                  <span className="text-base xl:text-lg text-black leading-snug">
                    {categoryLabel(t, category.name)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* "View More" only when there IS more. At 8 or fewer valid categories
            the row already shows every one of them, so the button would have
            nothing to open. */}
        {validCategories.length > MAX_VISIBLE_CATEGORIES && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls={listId}
              className="inline-flex items-center min-h-[44px] px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors"
            >
              {expanded ? t('seeker:jobFeed.filters.viewLess') : t('seeker:landing.viewMoreCategory')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
