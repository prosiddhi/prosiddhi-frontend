'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { StateCitySelect, type SelectedCity } from '@/components/location/StateCitySelect'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import { parsePublicJobQuery, publicJobsHref } from '@/lib/publicJobs'

/**
 * The search bar on /employee. It filters the public job list just below
 * (PublicJobList), which reads the keyword, category and location from the URL
 * (lib/publicJobs.ts) — so Search is a navigation to this same page, and the
 * `#jobs` on the link scrolls the results into view.
 *
 * It follows the URL too: a shared `?search=welder` link opens with "welder" in
 * the box, a search keeps the category a tile chose, and "Clear All" empties the
 * box and the location picker along with the list.
 *
 * This used to hand the search to /job-feed, which is behind sign-in: a
 * logged-out visitor typed "welder", pressed Search and landed on /login.
 */
export function PublicJobSearch() {
  const { t } = useTranslation()
  const router = useRouter()
  const { search, category, location } = parsePublicJobQuery(useSearchParams())

  const [draft, setDraft] = useState(search)
  // The location, as a draft until Search. A state with no city is a filter on its
  // own, so the picker reports the state through `onStateChange`.
  const [city, setCity] = useState<SelectedCity | null>(null)
  const [stateCode, setStateCode] = useState<number | null>(null)
  // Bumped to remount the picker — its State select keeps its own value.
  const [pickerKey, setPickerKey] = useState(0)

  // Follow the URL when it changes under us (a link, Back, Clear All). Done while
  // rendering — React's pattern for resetting state when an input changes.
  const [seenSearch, setSeenSearch] = useState(search)
  if (seenSearch !== search) {
    setSeenSearch(search)
    setDraft(search)
  }
  const locationCleared = location.stateCode === null
  const [seenCleared, setSeenCleared] = useState(locationCleared)
  if (seenCleared !== locationCleared) {
    setSeenCleared(locationCleared)
    if (locationCleared) {
      setCity(null)
      setStateCode(null)
      setPickerKey((k) => k + 1)
    }
  }

  const runSearch = () => {
    router.push(
      publicJobsHref({
        search: draft.trim(),
        category,
        location: { stateCode, cityId: city?.id ?? null },
      })
    )
  }

  // Stacks below `md`. State + City side by side need ~400px, so from `md` the
  // keyword field takes a row of its own and the rest follow on the next one;
  // only from `lg` is there room for everything on one line. (On a phone the
  // controls squeezed the keyword field down to a few characters.)
  return (
    <div className="max-w-[928px] mx-auto bg-white border-2 border-[#f4f4f4] rounded-lg p-3">
      {/* `items-start`, not `items-center`: when the State list fails to load,
          the picker grows a red "Could not load the list" line under its selects,
          and centring then pushed the selects up out of line with the keyword box
          and the button. Aligned at the top, every control shares one top edge and
          the message just hangs below. */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-start gap-2">
        {/* Job Search Input */}
        <div className="flex-1 relative md:basis-full lg:basis-0">
          <input
            type="text"
            placeholder={t('seeker:landing.searchPlaceholder')}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            className="w-full h-12 pl-10 pr-3 bg-[#f3f3f5] rounded-lg text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        </div>

        {/* Location Selector — the same State / City lists the job feed
            offers, so a choice made here survives the hand-off. */}
        <div className="w-full md:w-auto md:flex-1 lg:flex-none lg:w-[400px]">
          <StateCitySelect
            key={pickerKey}
            value={city}
            onChange={setCity}
            onStateChange={setStateCode}
            selectClassName="w-full h-12 px-3 bg-[#f3f3f5] rounded-lg text-base text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            labelClassName="sr-only"
          />
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={runSearch}
          className="px-[43px] py-3.5 min-h-[48px] bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors shrink-0"
        >
          <Search className="w-5 h-5" />
          <span className="text-base">{t('seeker:landing.searchJobs')}</span>
        </button>

        {/* Voice Search */}
        <VoiceButton label={t('seeker:landing.voiceSearchLabel')} iconClassName="w-6 h-6 text-gray-600" className="p-3" />
      </div>
    </div>
  )
}
