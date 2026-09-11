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
    //
    // The bottom padding is deliberately much smaller than the top: the hero and
    // "What are you looking for?" are one thought, not two sections, and the gap
    // between them used to be 72px at `lg` (this `pb-8` plus the next section's
    // `py-10`) — enough to read as a page break in front of the only choice this
    // page asks anyone to make. 20 + 28 = 48px now.
    //
    // ⚠️ The horizontal padding belongs on the inner `container`, NOT here.
    // Tailwind's `container` carries its own 2rem, and on the section it STACKED
    // with it (different elements, so no utility override) for 48px a side on a
    // phone, plus another 16 from the `px-4` the heading used to carry — 64 a
    // side, leaving a 390px screen a 262px text column.
    <section className="pt-[91px] sm:pt-24 pb-4 sm:pb-5 lg:pb-5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust badge (TD-12). This said "Work Opportunities for Everyone",
            which promises nothing, in a market where charging a jobseeker a
            fee to "get" them a job is the standard scam. It now carries the
            one thing we can state as fact and that answers that fear.
            Deliberately the same sentence as employer plans.seekersFree, so
            the promise on the front page and the promise on the pricing page
            are word for word the same in all ten languages.

            primary-80, not primary-50: the brand sky is 2.0:1 on white and
            this is the line that has to be read. primary-80 is 6.1:1 on white
            and 5.9:1 on the primary-10 fill it now sits on — the white pill on
            a white page was a border and nothing else, so the one reassurance
            above the fold read as a stray outline. This is the `.badge-primary`
            pairing from globals.css, not a new colour. */}
        <div className="flex justify-center mb-4 sm:mb-5">
          <div className="bg-primary-10 border border-primary-20 rounded-full px-3.5 sm:px-4 py-1.5 inline-flex items-center">
            <span className="text-xs font-medium text-primary-80 text-center">
              {t('home.heroBadge')}
            </span>
          </div>
        </div>

        {/* Heading.
            52px at `xl`, not 60: at 60 the English title measures ~1140px and
            broke as "…Easy and / Fast" — a one-word last line under the biggest
            type on the site. 52 inside a 1040px measure puts it on ONE line from
            `lg` up, which is worth more than the extra 8px of headline.
            `text-balance` is still here for the nine languages that will wrap
            anyway — it stops those from ending on a single orphaned word. */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[52px] font-bold leading-[1.15] tracking-tight text-primary-100 text-center text-balance max-w-[1040px] mx-auto mb-3 sm:mb-4">
          {t('home.heroTitle')}
        </h1>

        {/* Subheading. Was `#818181`, which is 3.0:1 on white and fails AA for
            body text; gray-500 (#6B7280) is the design-system neutral at the
            same weight and measures 4.83:1. Also one step larger with a real
            leading — at 16px/19.2px under a 60px headline it read as a caption
            rather than the sentence that explains the product. 760px is the
            measure at which the English line stops orphaning "effort." onto a
            second row; it is still under the 75-character comfortable maximum. */}
        <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-gray-500 text-center max-w-[760px] mx-auto">
          {t('home.heroSubtitle')}
        </p>
      </div>
    </section>
  )
}
