'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CITY_KEYS, cityLabelKey } from '@/lib/cities'
import { Footer } from '@/components/home/Footer'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { useJobFeedPreview } from '@/hooks/useJobFeedPreview'
import { JobFeedSection } from '@/components/job/JobFeedSection'
import { Search, MapPin, ChevronDown, Info } from 'lucide-react'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

// How many jobs each tab (All/Recommended/Nearby) loads before "Show More".
const PREVIEW_SIZE = 4

/**
 * The authenticated seeker's Home / dashboard.
 *
 * Job Feed (the search + advanced-filter experience) used to double as Home —
 * this page is what actually earns that name: a short hero search that hands
 * off to Job Feed, plus a tabbed preview of All/Recommended/Near By jobs. The
 * deep, filterable search UI lives at /job-feed instead.
 */
function SeekerHomeContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')

  // Hands off to the job feed, which is where filtering actually happens —
  // same pattern as the public landing page's search bar.
  const runSearch = () => {
    const params = new URLSearchParams()
    const q = searchQuery.trim()
    if (q) params.set('search', q)
    if (location) params.set('city', location)
    const qs = params.toString()
    router.push(qs ? `/job-feed?${qs}` : '/job-feed')
  }

  const { savedIds, savingIds, toggleSave } = useSavedJobs()
  const all = useJobFeedPreview('all', PREVIEW_SIZE, t('seeker:jobFeed.loadError'))
  const recommended = useJobFeedPreview('recommended', PREVIEW_SIZE, t('seeker:jobFeed.loadError'))
  const nearby = useJobFeedPreview('nearby', PREVIEW_SIZE, t('seeker:jobFeed.loadError'))

  // Switches which section is on screen — All/Recommended/Nearby used to
  // render stacked, one full section each; tabs keep the page shorter and
  // let a seeker jump straight to the one they care about.
  const [activeTab, setActiveTab] = useState<'all' | 'recommended' | 'nearby'>('all')

  return (
    <div className="min-h-screen bg-white">
      <EmployeeHeader active="home" />

      <section className="relative bg-[#f5fcff] py-6 sm:py-8 lg:py-10 text-center">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-primary-90 mb-3">
            {t('seeker:jobFeed.heroTitle')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            {t('seeker:jobFeed.heroSubtitle')}
          </p>

          <div className="bg-white rounded-lg shadow-[0px_5px_15px_0px_rgba(184,184,184,0.1)] p-3 sm:p-4 lg:p-[12px] max-w-[928px] mx-auto text-left">
            <div className="flex flex-wrap gap-3 sm:gap-4 lg:flex-nowrap lg:gap-5">
              <div className="w-full lg:w-auto lg:flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('seeker:jobFeed.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
              </div>

              <div className="flex-1 min-w-[150px] lg:max-w-[416px] relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  aria-label={t('seeker:landing.selectLocation')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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
                onClick={runSearch}
                className="h-12 flex-1 min-w-[150px] px-4 sm:px-6 lg:px-[43px] lg:flex-none bg-primary-50 text-primary-100 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="text-base">{t('seeker:jobFeed.searchJobs')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-3">
        <div className="flex gap-2 sm:gap-3 border-b border-gray-200">
          {(['all', 'recommended', 'nearby'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-2 -mb-px transition-colors ${
                activeTab === key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
              }`}
            >
              {t(`seeker:jobFeed.tabs.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'all' && (
        <JobFeedSection
          headingIcon={Info}
          title={t('seeker:jobFeed.section.allTitle')}
          sub={t('seeker:jobFeed.section.allSub')}
          count={all.total}
          loading={all.loading}
          error={all.error}
          jobs={all.jobs}
          kind="all"
          noLocation={false}
          hasMore={all.hasMore}
          onShowMore={all.showMore}
          onRetry={all.retry}
          savedIds={savedIds}
          savingIds={savingIds}
          onToggleSave={toggleSave}
          from="home"
        />
      )}

      {activeTab === 'recommended' && (
        <JobFeedSection
          headingIcon={Info}
          title={t('seeker:jobFeed.section.recommendedTitle')}
          sub={t('seeker:jobFeed.section.recommendedSub')}
          count={recommended.total}
          loading={recommended.loading}
          error={recommended.error}
          jobs={recommended.jobs}
          kind="recommended"
          noLocation={false}
          hasMore={recommended.hasMore}
          onShowMore={recommended.showMore}
          onRetry={recommended.retry}
          savedIds={savedIds}
          savingIds={savingIds}
          onToggleSave={toggleSave}
          from="home"
        />
      )}

      {activeTab === 'nearby' && (
        <JobFeedSection
          headingIcon={Info}
          title={t('seeker:jobFeed.section.nearbyTitle')}
          sub={t('seeker:jobFeed.section.nearbySub')}
          count={nearby.total}
          loading={nearby.loading}
          error={nearby.error}
          jobs={nearby.jobs}
          kind="nearby"
          noLocation={nearby.noLocation}
          hasMore={nearby.hasMore}
          onShowMore={nearby.showMore}
          onRetry={nearby.retry}
          savedIds={savedIds}
          savingIds={savingIds}
          onToggleSave={toggleSave}
          from="home"
        />
      )}

      <Footer />
    </div>
  )
}

export default function SeekerHomePage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <SeekerHomeContent />
    </ProtectedRoute>
  )
}
