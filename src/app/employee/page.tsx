'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { CITY_KEYS } from '@/lib/cities'
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

  const categories = [
    { name: t('seeker:landing.categories.construction'), icon: '/assets/constructions.png' },
    { name: t('seeker:landing.categories.automobile'), icon: '/assets/farmer.png' },
    { name: t('seeker:landing.categories.foodProducts'), icon: '/assets/vacuum.png' },
    { name: t('seeker:landing.categories.manufacturing'), icon: '/assets/chef 1.png' },
    { name: t('seeker:landing.categories.renewableEnergy'), icon: '/assets/pallete.png' },
    { name: t('seeker:landing.categories.medical'), icon: '/assets/courier.png' },
    { name: t('seeker:landing.categories.commonWorks'), icon: '/assets/mpv.png' },
    { name: t('seeker:landing.categories.repairService'), icon: '/assets/restaurant.png' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
        <div className="max-w-[1920px] mx-auto h-full px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative w-[142px] h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-11 absolute left-1/2 -translate-x-1/2">
            <Link href="/job-feed" className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
              <Search className="w-4 h-4" />
              <span>{t('seeker:nav.findJobs')}</span>
            </Link>

            <button className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
              <Building2 className="w-4 h-4" />
              <span>{t('seeker:nav.companies')}</span>
            </button>

            <LanguageSwitcher />
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-5">
            <button className="flex items-center gap-2 px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors">
              <UserPlus className="w-4 h-4" />
              <span>{t('seeker:nav.register')}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-base text-white hover:bg-primary-60 transition-colors">
              <LogIn className="w-5 h-5" />
              <span>{t('seeker:nav.login')}</span>
            </button>

            <Link
              href="/employer/welcome"
              className="flex items-center gap-1 text-base text-black hover:text-primary-50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>{t('seeker:nav.employer')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-[194px] pb-20 text-center">
        <div className="max-w-[1920px] mx-auto px-8">
          {/* Trust badge (TD-12) — same claim and same contrast reasoning as
              the home hero; see components/home/HeroSection.tsx. */}
          <div className="inline-flex items-center justify-center px-5 py-2 bg-white border border-gray-200 rounded-full mb-10">
            <span className="text-sm font-medium text-primary-80">{t('seeker:landing.badge')}</span>
          </div>

          {/* Title */}
          <h1 className="text-[72px] font-bold text-primary-90 leading-[78px] max-w-[940px] mx-auto mb-8">
            {t('seeker:landing.heroTitle')}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-[111px]">
            {t('seeker:landing.heroSubtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-[928px] mx-auto bg-white border-2 border-[#f4f4f4] rounded-lg p-3">
            <div className="flex items-center gap-2">
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
              <div className="w-[215px] relative">
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  aria-label={t('seeker:landing.selectLocation')}
                  className="w-full h-12 pl-10 pr-10 bg-[#f3f3f5] rounded-lg text-base text-gray-500 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-50"
                >
                  <option value="">{t('seeker:landing.selectLocation')}</option>
                  {CITY_KEYS.map(key => (
                    <option key={key} value={key}>
                      {t(`seeker:jobFeed.city.${key}`)}
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
                className="px-[43px] py-3.5 bg-primary-50 text-white rounded-lg flex items-center gap-2 hover:bg-primary-60 transition-colors"
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
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-8">
          <h2 className="text-[40px] font-semibold text-center mb-4">{t('seeker:landing.categoryTitle')}</h2>
          <p className="text-base text-[#717182] text-center mb-12">
            {t('seeker:landing.categorySubtitle')}
          </p>

          <div className="flex flex-wrap justify-center gap-5 max-w-[1730px] mx-auto">
            {categories.map((category, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center w-[205px] px-9 py-8 border border-[#ebebeb] rounded-[10px] hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="w-[65px] h-[65px] mb-2 relative">
                  <Image src={category.icon} alt={category.name} fill className="object-contain" />
                </div>
                <span className="text-[22px] text-black text-center">{category.name}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-[74px]">
            <button className="px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors">
              {t('seeker:landing.viewMoreCategory')}
            </button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">{t('seeker:landing.howItWorksTitle')}</h2>
          <p className="text-sm sm:text-base text-[#717182] text-center mb-12 sm:mb-[105px] px-4">
            {t('seeker:landing.howItWorksSubtitle')}
          </p>

          <div className="flex flex-col lg:flex-row justify-center items-center lg:items-stretch gap-8 lg:gap-[75px] max-w-[1400px] mx-auto">
            {/* Step 1 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] relative shadow-lg lg:transform lg:-rotate-[5deg] flex flex-col">
              {/* Register/Login Buttons - Inside box at top-left with rounded container */}
              <div className="mb-auto pb-8">
                <div className="bg-white border border-[#efefef] rounded-r-[32px] px-6 sm:px-7 py-3.5 sm:py-3.5 flex items-center gap-3 w-fit lg:transform lg:rotate-[5deg] -ml-8 sm:-ml-12">
                  <button className="px-3 py-2 border border-secondary-70 rounded-lg text-sm sm:text-base text-black whitespace-nowrap">
                    {t('seeker:nav.register')}
                  </button>
                  <button className="px-3 py-2 bg-primary-50 text-white rounded-lg text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t('seeker:nav.login')}
                  </button>
                </div>
              </div>

              {/* Content at bottom */}
              <div className="lg:transform lg:rotate-[5deg] text-left">
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
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] shadow-lg flex flex-col items-center justify-center">
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
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] shadow-lg relative lg:transform lg:rotate-[7deg] flex flex-col">
              <div className="absolute top-8 sm:top-12 right-8 sm:right-12 w-24 h-24 sm:w-[136px] sm:h-[136px] flex-shrink-0">
                <Image
                  src="/assets/success_1.png"
                  alt={t('seeker:landing.step3Alt')}
                  width={136}
                  height={136}
                  className="object-contain"
                />
              </div>
              <div className="lg:transform lg:-rotate-[7deg] text-left mt-32 sm:mt-40 flex-1 flex flex-col justify-end">
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

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-8">
          <h2 className="text-[40px] font-semibold text-center mb-4">{t('seeker:landing.whyChooseTitle')}</h2>
          <p className="text-base text-[#717182] text-center mb-[115px]">
            {t('seeker:landing.whyChooseSubtitle')}
          </p>

          {/* Feature 1 - Language Support */}
          <div className="flex items-center gap-16 mb-[260px] max-w-[1600px] mx-auto">
            <div className="flex-1 relative h-[454px]">
              <Image
                src="/assets/474.svg"
                alt={t('seeker:landing.feature1Label')}
                fill
                className="object-contain object-left"
              />
            </div>
            <div className="flex-1 max-w-[594px]">
              <p className="text-2xl text-[#767676] mb-[42px]">{t('seeker:landing.feature1Label')}</p>
              <h3 className="text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature1Title')}
              </h3>
            </div>
          </div>

          {/* Feature 2 - Easy to Use */}
          <div className="flex items-center gap-16 mb-[163px] max-w-[1600px] mx-auto flex-row-reverse">
            <div className="flex-1 relative h-[490px]">
              <Image
                src="/assets/421.svg"
                alt={t('seeker:landing.feature2Label')}
                fill
                className="object-contain object-right"
              />
            </div>
            <div className="flex-1 max-w-[594px] text-right ml-auto">
              <p className="text-2xl text-[#767676] mb-[42px]">{t('seeker:landing.feature2Label')}</p>
              <h3 className="text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature2Title')}
              </h3>
            </div>
          </div>

          {/* Feature 3 - Low Cost */}
          <div className="flex items-center gap-16 max-w-[1600px] mx-auto">
            <div className="flex-1 relative h-[459px]">
              <Image
                src="/assets/171.svg"
                alt={t('seeker:landing.feature3Label')}
                fill
                className="object-contain object-left"
              />
            </div>
            <div className="flex-1 max-w-[594px]">
              <p className="text-2xl text-[#767676] mb-[42px]">{t('seeker:landing.feature3Label')}</p>
              <h3 className="text-[36px] font-medium leading-normal">
                {t('seeker:landing.feature3Title')}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1632px] mx-auto px-8">
          <div className="bg-[#f8f8f8] border-2 border-white rounded-[40px] px-[47px] py-[93px] flex items-center justify-between">
            <div>
              <h2 className="text-[48px] font-medium mb-10">{t('seeker:landing.ctaTitle')}</h2>
              {/* No bottom margin: the button row is the last child now that the
                  app-download block is gone (TD-14). The old mb-[80px] was
                  spacing toward it and left 80px of dead space under the
                  buttons, pushing the column out of line with the illustration
                  beside it. The heading's 77px was the same story. */}
              <div className="flex items-center gap-4">
                <button className="px-3 py-2 bg-primary-50 text-white rounded-lg text-base flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  {t('seeker:landing.signUpToday')}
                </button>
                <button className="px-3 py-2 border border-secondary-70 rounded-lg text-base text-black flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('seeker:landing.contactUs')}
                </button>
              </div>
              {/* "Download our App platform" and two App Store / Google Play
                  tiles used to sit here (TD-14). They were plain divs, not
                  links, for listings that do not exist — the strongest form of
                  the same claim the footer was making, on the page where a
                  seeker decides whether to trust us. The phone illustration
                  stays: the site genuinely works in a mobile browser. */}
            </div>
            <div className="relative w-[900px] h-[600px]">
              <Image src="/assets/171.svg" alt={t('seeker:landing.mobileAppAlt')} fill className="object-contain" />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
