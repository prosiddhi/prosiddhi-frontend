'use client'

import { useTranslation } from 'react-i18next'

/**
 * Landing hero. Every string goes through `common:home.hero*` — this component
 * previously had no useTranslation at all, so the first screen a seeker ever saw
 * stayed English even with Hindi selected (QA defect DEF-001).
 */
export function HeroSection() {
  const { t } = useTranslation('common')

  return (
    // pt-[91px], not pt-16: Header.tsx is `fixed` and `h-[75px]` at every
    // breakpoint, so 64px of padding put the badge underneath it — the trust
    // claim was half-hidden behind the logo bar on a phone. 75 + 16 of
    // breathing room.
    <section className="pt-[91px] sm:pt-24 pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Trust badge (TD-12). This said "Work Opportunities for Everyone",
            which promises nothing, in a market where charging a jobseeker a
            fee to "get" them a job is the standard scam. It now carries the
            one thing we can state as fact and that answers that fear.
            Deliberately the same sentence as employer plans.seekersFree, so
            the promise on the front page and the promise on the pricing page
            are word for word the same in all ten languages.

            primary-80, not primary-50: the brand sky is 2.0:1 on white and
            this is the line that has to be read. primary-80 is 6.1:1. */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="bg-white border border-[#f2f2f2] rounded-[20px] px-3 sm:px-4 py-1 sm:py-1.5 inline-flex items-center">
            <span className="text-xs font-medium text-primary-80 text-center">
              {t('home.heroBadge')}
            </span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-primary-100 text-center max-w-[940px] mx-auto mb-2 sm:mb-3 px-4">
          {t('home.heroTitle')}
        </h1>

        {/* Subheading */}
        <p className="text-xs sm:text-sm lg:text-base text-[#818181] text-center px-4">
          {t('home.heroSubtitle')}
        </p>
      </div>
    </section>
  )
}
