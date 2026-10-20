'use client'

import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Footer } from '@/components/home/Footer'
import { PublicSeekerHeader } from '@/components/navigation/PublicSeekerHeader'
import { BackToLandingLink } from '@/components/navigation/BackToLandingLink'
import { PublicJobList } from '@/components/job/PublicJobList'
import { PublicJobSearch } from '@/components/job/PublicJobSearch'
import { CategorySection } from '@/components/home/CategorySection'
import { HowItWorksSection } from '@/components/home/HowItWorksSection'
import { WhyChooseSection } from '@/components/home/WhyChooseSection'
import { SeekerCtaSection } from '@/components/home/SeekerCtaSection'

/**
 * The seeker landing page: search, then real jobs straight away, then the Figma
 * marketing sections. Nothing here needs an account — Apply and Save are where
 * sign-in starts (see lib/publicJobs.ts).
 */
export default function EmployeeLandingPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-white">
      <PublicSeekerHeader />

      {/* Hero Section */}
      {/* Little bottom padding: the job list it filters follows straight on. The
          top padding is the old 115 / 150 / 170 less the Back row, so the
          headline sits where it did. */}
      <section className="pt-[87px] sm:pt-[91px] lg:pt-[107px] pb-4 lg:pb-6 text-center">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <div className="text-left mb-2 sm:mb-4">
            <BackToLandingLink />
          </div>
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

          {/* useSearchParams needs a Suspense boundary, or Next renders the whole
              page on the client only. */}
          <Suspense fallback={null}>
            <PublicJobSearch />
          </Suspense>
        </div>
      </section>

      {/* useSearchParams needs a Suspense boundary, or Next renders the whole
          page on the client only. */}
      <Suspense fallback={null}>
        <PublicJobList />
      </Suspense>

      <CategorySection />
      <HowItWorksSection />
      <WhyChooseSection />
      <SeekerCtaSection />
      <Footer audience="seeker" />
    </div>
  )
}
