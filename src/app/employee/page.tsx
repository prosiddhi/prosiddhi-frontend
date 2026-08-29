'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { CITY_KEYS, cityLabelKey } from '@/lib/cities'
import { useCategories } from '@/hooks/useCategories'
import type { TaxonomyCategory } from '@/lib/api'
import { Footer } from '@/components/home/Footer'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import {
  Search,
  MapPin,
  ChevronDown,
  UserPlus,
  LogIn,
  User,
  Building2,
  Phone,
} from 'lucide-react'

/**
 * How many category tiles the landing page shows.
 *
 * The number lives here rather than inside the slice, so moving the grid to 6 or
 * 10 is a one-line change with nothing else to hunt down.
 */
const MAX_VISIBLE_CATEGORIES = 8

/**
 * A category earns a tile only when a seeker can actually reach a job through it
 * — at least one sector holding at least one job title. A category with no
 * sectors, or whose every sector is empty, is a dead end, and its tile would
 * look identical to a live one while leading nowhere.
 */
function hasJobTitles(category: TaxonomyCategory): boolean {
  return category.sectors.some((sector) => sector.jobTitles.length > 0)
}

/**
 * The i18n key for a backend category name: "Food Products" → "foodProducts".
 *
 * The tiles read their labels from `seeker:landing.categories.*`, which is
 * translated into all ten languages; the backend sends English only. Without
 * this a Tamil seeker would get English tiles on an otherwise Tamil page.
 * Derived rather than mapped, so a new category is localised by adding a
 * translation key — no code change.
 */
function categoryLabelKey(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

export default function EmployeeLandingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')

  /**
   * Hand the search to the job feed, which is where filtering actually happens.
   *
   * Both controls used to be decorative: the location was a `<button>` with no
   * handler, and Search was a bare `<Link href="/job-feed">` that dropped the
   * typed keyword entirely — so a seeker could type "welder", press Search, and
   * get an unfiltered feed with no indication anything had been ignored.
   * (DEF-004 + DEF-014.)
   *
   * The feed reads both parameters on mount. City keys come from the shared
   * list so the two screens cannot offer different cities.
   */
  const runSearch = () => {
    const params = new URLSearchParams()
    const q = searchQuery.trim()
    if (q) params.set('search', q)
    if (location) params.set('city', location)
    const qs = params.toString()
    router.push(qs ? `/job-feed?${qs}` : '/job-feed')
  }

  // The tiles are the live taxonomy now, not a frozen eight. `useCategories` keeps
  // one module-level copy of the tree, so this shares the single request the
  // TaxonomyPicker on the other seeker screens already makes.
  const { categories, loading, error, reload } = useCategories()

  // Filter THEN limit. The cap counts tiles a seeker can USE, so a dead-end
  // category must not eat one of the slots on its way to being hidden.
  //
  // The full valid list is kept, not just the slice, because "View More" has to
  // know whether anything was actually left over — a slice of 8 looks the same
  // whether the tree held 8 categories or 40.
  const validCategories = useMemo(() => categories.filter(hasJobTitles), [categories])
  const visibleCategories = validCategories.slice(0, MAX_VISIBLE_CATEGORIES)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
        {/* px-4 below `lg`: at px-12 the right-hand cluster ran to x=520 inside a
            390px bar. The header is `fixed`, so that never showed as a page
            scrollbar — it just clipped, and Login and Employer were off-screen
            and unreachable on a phone. Same three-step climb-down as the home
            header: labels at `md`, full spacing at `lg`.

            px-12 and the wide gaps are the Figma values and `2xl` keeps them, but
            they are also ~80px of the header's budget. At 1366 — an ordinary laptop
            at 100% zoom — that is space the nav needs more than the margins do, so
            `xl` runs one notch tighter. */}
        <div className="max-w-[1920px] mx-auto h-full px-4 sm:px-6 xl:px-4 2xl:px-6 min-[1920px]:px-12 flex items-center justify-between gap-3 xl:gap-2 2xl:gap-3 min-[1920px]:gap-6">
          {/* Left rail. `flex-1 basis-0` on BOTH outer rails is what keeps the nav
              on the viewport centre line the way the Figma draws it — two rails
              that grow from zero at the same rate meet in the middle. It is also
              why the nav no longer needs absolute positioning to look centred. */}
          <div className="flex-1 basis-0 flex justify-start">
            {/* Logo */}
            <Link href="/" className="flex items-center min-h-[44px] shrink-0">
              <div className="relative w-[112px] h-[31px] sm:w-[128px] sm:h-[35px] lg:w-[142px] lg:h-[39px]">
                <Image
                  src="/assets/prosiddhi-logo-horizontal.png"
                  alt={t('app.name')}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation

              IN FLOW, not `absolute left-1/2 -translate-x-1/2`. Absolute took the
              nav out of the flex layout, so the browser could not know it had
              collided with anything — it simply drew on top of the auth cluster.

              `shrink-0`, and deliberately NOT `min-w-0`. A shrinkable nav is no
              better than an absolute one: the box narrows, the nowrap labels inside
              do not, and the text spills out of the box straight over Register.
              Measured at 1366 in Tamil: the switcher ran to x=815 while Register
              began at x=695. A nav that cannot shrink cannot spill.

              `xl`, NOT `2xl`. Gating the nav at 1536 meant a 1366 laptop at 100%
              zoom had no nav at all — and the nav reappearing at 80% zoom, because
              zooming out is what pushed the CSS viewport past 1536. A breakpoint
              that only clears on a zoomed-out browser is set wrong.

              What actually did not fit at 1366 was the language selector's text,
              not the nav: "Language: English" is 187px but "ഭാഷ: മലയാളം (Malayalam)"
              is 292px. That text now stands down on its own below `2xl` (the icon
              and chevron stay), which buys back more than the whole nav costs. */}
          <nav className="hidden xl:flex items-center gap-5 2xl:gap-8 min-[1920px]:gap-11 min-w-0">
            <Link href="/job-feed" className="shrink-0 flex items-center gap-1 text-black text-[18px] whitespace-nowrap hover:text-primary-50 transition-colors">
              <Search className="w-4 h-4 shrink-0" />
              <span>{t('seeker:nav.findJobs')}</span>
            </Link>

            <Link href="/employer/welcome" className="shrink-0 flex items-center gap-1 text-black text-[18px] whitespace-nowrap hover:text-primary-50 transition-colors">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>{t('seeker:nav.companies')}</span>
            </Link>

            <LanguageSwitcher />
          </nav>

          {/* Auth Buttons. The rail matches the left one so the centre line holds;
              `justify-end` keeps the cluster pinned right. The buttons themselves
              stay `shrink-0` — squeezing a 44px tap target is worse than running
              out of room. */}
          <div className="flex-1 basis-0 flex items-center justify-end gap-2 sm:gap-3 xl:gap-2 2xl:gap-4 min-[1920px]:gap-5">
            <Link
              href="/register"
              aria-label={t('seeker:nav.register')}
              title={t('seeker:nav.register')}
              className="inline-flex shrink-0 items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2 2xl:px-3 py-2 border border-secondary-70 rounded-lg text-sm 2xl:text-base text-black whitespace-nowrap hover:bg-secondary-10 transition-colors"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">{t('seeker:nav.register')}</span>
            </Link>

            <Link
              href="/login"
              aria-label={t('seeker:nav.login')}
              title={t('seeker:nav.login')}
              className="inline-flex shrink-0 items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2 2xl:px-3 py-2 bg-primary-50 rounded-lg text-sm 2xl:text-base text-primary-100 whitespace-nowrap hover:bg-primary-60 transition-colors"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">{t('seeker:nav.login')}</span>
            </Link>

            <Link
              href="/employer/welcome"
              aria-label={t('seeker:nav.employer')}
              title={t('seeker:nav.employer')}
              className="inline-flex shrink-0 items-center justify-center gap-1 min-w-[44px] min-h-[44px] text-sm 2xl:text-base text-black whitespace-nowrap hover:text-primary-50 transition-colors"
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">{t('seeker:nav.employer')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-[115px] sm:pt-[150px] lg:pt-[170px] pb-12 lg:pb-[111px] text-center">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          {/* Trust badge (TD-12) — same claim and same contrast reasoning as
              the home hero; see components/home/HeroSection.tsx. */}
          <div className="inline-flex items-center justify-center px-5 py-2 bg-white border border-gray-200 rounded-full mb-6 lg:mb-10">
            <span className="text-sm font-medium text-primary-80">{t('seeker:landing.badge')}</span>
          </div>

          {/* Title. 72px is the Figma size and is kept at `xl`; below that it
              had no steps at all, so a 390px phone rendered a 72px headline in a
              358px column. */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[72px] font-bold text-primary-90 leading-[1.08] max-w-[940px] mx-auto mb-6 lg:mb-8">
            {t('seeker:landing.heroTitle')}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-12 sm:mb-16">
            {t('seeker:landing.heroSubtitle')}
          </p>

          {/* Search Bar */}
          {/* Stacks below `md`. The three controls have a combined minimum of
              ~620px (input + a 215px city select + the Search button), so on a
              phone they were squeezing the keyword field down to a few
              characters. */}
          <div className="max-w-[928px] mx-auto bg-white border-2 border-[#f4f4f4] rounded-lg p-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              {/* Job Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t('seeker:landing.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                  className="w-full h-12 pl-10 pr-3 bg-[#f3f3f5] rounded-lg text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              {/* Location Selector — the same city list the job feed offers, so
                  a choice made here survives the hand-off. */}
              <div className="w-full md:w-[215px] relative">
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  aria-label={t('seeker:landing.selectLocation')}
                  className="w-full h-12 pl-10 pr-10 bg-[#f3f3f5] rounded-lg text-base text-gray-500 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-50"
                >
                  <option value="">{t('seeker:landing.selectLocation')}</option>
                  {CITY_KEYS.map(key => (
                    <option key={key} value={key}>
                      {t(cityLabelKey(key))}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
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
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">{t('seeker:landing.categoryTitle')}</h2>
          <p className="text-sm sm:text-base text-[#717182] text-center mb-8 sm:mb-10">
            {t('seeker:landing.categorySubtitle')}
          </p>

          {loading && (
            <p className="text-center text-base text-[#717182]">{t('taxonomy:loading')}</p>
          )}

          {error && (
            <p className="text-center text-sm text-red-600">
              {t('taxonomy:error')}{' '}
              <button type="button" onClick={reload} className="underline hover:no-underline">
                {t('taxonomy:retry')}
              </button>
            </p>
          )}

          {/* The Figma puts all eight tiles on ONE row. Two things stopped that:
              the 1730px cap was 50px short of the 1780 eight 205px tiles and
              seven 20px gaps actually need, so the eighth wrapped to a row of
              its own; and `px-9` left the label only 133px, so "Renewable
              Energy" and "Repair Service" broke onto a second line inside their
              tiles. 1800 and `px-2` fit both — "Renewable Energy" needs 187px at
              22px and px-2 leaves it 189. Below ~1850px of viewport the row
              still wraps, which is unavoidable at this tile size; the frame is
              drawn at 1920. */}
          {!loading && !error && (
            <div className="flex flex-wrap justify-center gap-5 max-w-[1800px] mx-auto">
              {/* Text only. GET /api/categories carries no icon and no stable id to
                  hang one off, so any picture here would come from a client-side
                  name→file map — which silently goes wrong the moment the backend
                  renames or adds a category. The name is the whole tile. */}
              {visibleCategories.map((category) => (
                <div
                  key={category.name}
                  // Two-up on a phone. At a flat w-[205px] a 390px screen showed
                  // one tile with 153px of empty gutter beside it and ran the
                  // eight of them over 1400px of scroll.
                  className="flex flex-col items-center justify-center w-[calc(50%-10px)] sm:w-[205px] px-2 py-8 border border-[#ebebeb] rounded-[10px] hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <span className="text-lg xl:text-[22px] text-black text-center">
                    {t(`seeker:landing.categories.${categoryLabelKey(category.name)}`, {
                      defaultValue: category.name,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* "View More" only when there IS more. At 8 or fewer valid categories
              the grid already shows every one of them, so the button would send a
              seeker to the feed to look for a ninth that does not exist. */}
          {validCategories.length > MAX_VISIBLE_CATEGORIES && (
            <div className="text-center mt-8">
              <Link href="/job-feed" className="inline-flex items-center px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors">
                {t('seeker:landing.viewMoreCategory')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">{t('seeker:landing.howItWorksTitle')}</h2>
          <p className="text-sm sm:text-base text-[#717182] text-center mb-12 sm:mb-[105px] px-4">
            {t('seeker:landing.howItWorksSubtitle')}
          </p>

          <div className="flex flex-col lg:flex-row justify-center items-center lg:items-stretch gap-8 lg:gap-6 2xl:gap-[75px] max-w-[1400px] mx-auto 2xl:px-8">
            {/* Step 1 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[340px] xl:max-w-[380px] 2xl:max-w-[425px] min-w-0 break-words min-h-[400px] sm:min-h-[425px] relative shadow-lg 2xl:transform 2xl:-rotate-[5deg] flex flex-col">
              {/* Register/Login Buttons - Inside box at top-left with rounded container */}
              <div className="mb-auto pb-8">
                {/* Illustration of the Register / Login controls, not the
                    controls themselves - this card is explaining step 1. Spans,
                    not buttons: as <button> they were focusable, clickable and
                    announced as buttons, and did nothing when pressed. */}
                <div aria-hidden="true" className="bg-white border border-[#efefef] rounded-r-[32px] px-6 sm:px-7 py-3.5 sm:py-3.5 flex flex-wrap items-center gap-3 w-fit max-w-full 2xl:transform 2xl:rotate-[5deg] -ml-8 sm:-ml-12">
                  <span className="px-3 py-2 border border-secondary-70 rounded-lg text-sm sm:text-base text-black whitespace-nowrap">
                    {t('seeker:nav.register')}
                  </span>
                  <span className="px-3 py-2 bg-primary-50 text-primary-100 rounded-lg text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t('seeker:nav.login')}
                  </span>
                </div>
              </div>

              {/* Content at bottom */}
              <div className="2xl:transform 2xl:rotate-[5deg] text-left">
                <p className="text-[#717182] text-lg sm:text-xl font-semibold mb-2">{t('seeker:landing.step', { number: 1 })}</p>
                <h3 className="text-[28px] sm:text-[32px] font-semibold mb-2 leading-tight">
                  {t('seeker:landing.step1Title')}
                </h3>
                <p className="text-xl sm:text-2xl text-black leading-snug">
                  {t('seeker:landing.step1Body')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[340px] xl:max-w-[380px] 2xl:max-w-[425px] min-w-0 break-words min-h-[400px] sm:min-h-[425px] shadow-lg flex flex-col items-center justify-center">
              <div className="w-24 h-24 sm:w-[136px] sm:h-[136px] mb-6 sm:mb-8 relative flex-shrink-0">
                <Image
                  src="/assets/recruitment.png"
                  alt={t('seeker:landing.step2Alt')}
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-[#717182] text-base sm:text-xl font-semibold mb-2">{t('seeker:landing.step', { number: 2 })}</p>
              <h3 className="text-2xl sm:text-[32px] font-semibold mb-2 text-center leading-tight">
                {t('seeker:landing.step2Title')}
              </h3>
              <p className="text-lg sm:text-2xl text-black text-center">
                {t('seeker:landing.step2Body')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[340px] xl:max-w-[380px] 2xl:max-w-[425px] min-w-0 break-words min-h-[400px] sm:min-h-[425px] shadow-lg relative 2xl:transform 2xl:rotate-[7deg] flex flex-col">
              <div className="absolute top-8 sm:top-12 right-8 sm:right-12 w-24 h-24 sm:w-[136px] sm:h-[136px] flex-shrink-0">
                <Image
                  src="/assets/success_1.png"
                  alt={t('seeker:landing.step3Alt')}
                  width={136}
                  height={136}
                  className="object-contain"
                />
              </div>
              <div className="2xl:transform 2xl:-rotate-[7deg] text-left mt-32 sm:mt-40 flex-1 flex flex-col justify-end">
                <p className="text-[#717182] text-base sm:text-xl font-semibold mb-2">{t('seeker:landing.step', { number: 3 })}</p>
                <h3 className="text-2xl sm:text-[32px] font-semibold mb-2 leading-tight">
                  {t('seeker:landing.step3Title')}
                </h3>
                <p className="text-lg sm:text-2xl text-black">
                  {t('seeker:landing.step3Body')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section
          ⚠️ The four SVG illustrations on this page — the three below and the
          CTA's — are `unoptimized`, and must stay that way.
          next/image refuses to process SVG unless `images.dangerouslyAllowSVG`
          is set in next.config.js, and it is NOT — so the optimizer answered
          **400** for all four illustrations on this page and the three feature
          rows plus the CTA rendered as blank space in production. `unoptimized`
          serves the file straight from /public, which is the right answer for a
          vector anyway (there is nothing to resample) and avoids loosening a
          global security setting for four first-party files. */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">{t('seeker:landing.whyChooseTitle')}</h2>
          <p className="text-sm sm:text-base text-[#717182] text-center mb-12 lg:mb-20">
            {t('seeker:landing.whyChooseSubtitle')}
          </p>

          {/* Feature 1 - Language Support.
              `feature-languages.svg` is the window-of-profile-rows figure the
              Figma shows here. It had never been exported as its own file, which
              is why this slot previously borrowed Feature 2's picture; it was
              recovered out of `public/assets/job_portal.svg` — the 15MB design
              board export, which carries the whole "Employee Landing Page
              Images" plate — by cropping the board's viewBox to the artwork and
              keeping only the elements and `<defs>` it actually references.
              18KB of vector rather than 15MB or a screenshot of one. */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 mb-20 lg:mb-[165px] max-w-[1600px] mx-auto">
            <div className="w-full lg:flex-1 relative h-[260px] sm:h-[360px] lg:h-[454px]">
              <Image
                src="/assets/feature-languages.svg"
                alt={t('seeker:landing.feature1Label')}
                fill
                unoptimized
                className="object-contain lg:object-left"
              />
            </div>
            <div className="w-full lg:flex-1 lg:max-w-[594px]">
              <p className="text-lg sm:text-2xl text-[#767676] mb-4 lg:mb-[42px]">{t('seeker:landing.feature1Label')}</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature1Title')}
              </h3>
            </div>
          </div>

          {/* Feature 2 - Easy to Use. `474.svg` is 736×490 and this slot is
              `h-[490px]` — the heights were always right, it was the `src`s that
              were crossed. */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-16 mb-20 lg:mb-[165px] max-w-[1600px] mx-auto">
            <div className="w-full lg:flex-1 relative h-[260px] sm:h-[360px] lg:h-[490px]">
              <Image
                src="/assets/474.svg"
                alt={t('seeker:landing.feature2Label')}
                fill
                unoptimized
                className="object-contain lg:object-right"
              />
            </div>
            <div className="w-full lg:flex-1 lg:max-w-[594px] lg:text-right lg:ml-auto">
              <p className="text-lg sm:text-2xl text-[#767676] mb-4 lg:mb-[42px]">{t('seeker:landing.feature2Label')}</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature2Title')}
              </h3>
            </div>
          </div>

          {/* Feature 3 - Low Cost. `group_7.svg` is the money-plant-and-coins
              figure the Figma shows here, and it is 688×459 against this slot's
              `h-[459px]`. It was previously showing `171.svg`, the CTA's
              magnifying glass, so the same picture appeared twice on the page. */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-[1600px] mx-auto">
            <div className="w-full lg:flex-1 relative h-[260px] sm:h-[360px] lg:h-[459px]">
              <Image
                src="/assets/group_7.svg"
                alt={t('seeker:landing.feature3Label')}
                fill
                unoptimized
                className="object-contain lg:object-left"
              />
            </div>
            <div className="w-full lg:flex-1 lg:max-w-[594px]">
              <p className="text-lg sm:text-2xl text-[#767676] mb-4 lg:mb-[42px]">{t('seeker:landing.feature3Label')}</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature3Title')}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1632px] mx-auto px-4 sm:px-8">
          {/* py-8 at `lg`, not py-[93px]. The Figma panel is ~525px tall and its
              illustration ~775×475, so the artwork very nearly fills it. Ours
              was a 600px-tall illustration inside 93px of padding top and
              bottom — a 1018px panel, roughly double the frame, and the single
              largest reason this page ran 640px longer than the design. */}
          <div className="bg-[#f8f8f8] border-2 border-white rounded-[24px] sm:rounded-[40px] px-6 sm:px-[47px] py-12 lg:py-8 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="w-full lg:w-auto">
              <h2 className="text-3xl sm:text-[40px] lg:text-[48px] font-medium mb-8 lg:mb-10">{t('seeker:landing.ctaTitle')}</h2>
              {/* No bottom margin: the button row is the last child now that the
                  app-download block is gone (TD-14). The old mb-[80px] was
                  spacing toward it and left 80px of dead space under the
                  buttons, pushing the column out of line with the illustration
                  beside it. The heading's 77px was the same story. */}
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/register" className="px-3 py-2 bg-primary-50 text-primary-100 rounded-lg text-base flex items-center gap-2 hover:bg-primary-60 transition-colors">
                  <LogIn className="w-5 h-5" />
                  {t('seeker:landing.signUpToday')}
                </Link>
                <Link href="/contact" className="px-3 py-2 border border-secondary-70 rounded-lg text-base text-black flex items-center gap-2 hover:bg-secondary-10 transition-colors">
                  <Phone className="w-4 h-4" />
                  {t('seeker:landing.contactUs')}
                </Link>
              </div>
              {/* "Download our App platform" and two App Store / Google Play
                  tiles used to sit here (TD-14). They were plain divs, not
                  links, for listings that do not exist — the strongest form of
                  the same claim the footer was making, on the page where a
                  seeker decides whether to trust us. The phone illustration
                  stays: the site genuinely works in a mobile browser. */}
            </div>
            {/* 900×600 is 171.svg's own viewBox, but the Figma places it at
                ~775 wide, and as a FIXED width it also forced the CTA panel past
                the viewport on anything under ~1100px. Capped by width now, with
                the aspect ratio held. */}
            <div className="relative w-full max-w-[700px] aspect-[3/2]">
              <Image src="/assets/171.svg" alt={t('seeker:landing.mobileAppAlt')} fill unoptimized className="object-contain" />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
