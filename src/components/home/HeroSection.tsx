'use client'

import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LaunchRibbon } from './LaunchRibbon'

/**
 * Landing hero. Every string goes through `common:home.hero*` — this component
 * previously had no useTranslation at all, so the first screen a seeker ever saw
 * stayed English even with Hindi selected (QA defect DEF-001).
 */
export function HeroSection() {
  const { t } = useTranslation('common')

  return (
    // pt-4 / sm:pt-5: the public header is `sticky` and takes its own height in the
    // page, so this is only breathing room. (It used to be pt-[91px] — the 75px of a
    // `fixed` header plus 16 — and had to change whenever the header's height did.)
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
    <section className="pt-4 sm:pt-5 pb-4 sm:pb-5 lg:pb-5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <LaunchRibbon />

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

        {/* Trust promise (TD-12). This said "Work Opportunities for Everyone",
            which promises nothing, in a market where charging a jobseeker a
            fee to "get" them a job is the standard scam. It now carries the
            one thing we can state as fact and that answers that fear.
            Deliberately the same sentence as employer plans.seekersFree, so
            the promise on the front page and the promise on the pricing page
            are word for word the same in all ten languages.

            2026-10-22: moved from a 12px pill ABOVE the heading to here, as
            the last line of the pitch (find jobs → in your language → free),
            and made the strongest line after the heading: bold primary-100
            with a green shield ("safe"). No highlight behind it — the shield
            and the weight carry it. */}
        <p className="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-center">
          <ShieldCheck aria-hidden="true" className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-green-600" strokeWidth={2.25} />
          <span className="text-base sm:text-lg lg:text-xl font-bold leading-snug text-primary-100">
            {t('home.heroBadge')}
          </span>
        </p>
      </div>
    </section>
  )
}
