'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'

/**
 * "Why Choose Us" — the illustrated feature rows from the Figma landing page.
 * Shared by the home page and the seeker landing page; moved here unchanged
 * from employee/page.tsx.
 *
 * ⚠️ The SVG illustrations here and in SeekerCtaSection are `unoptimized`, and
 * must stay that way. next/image refuses to process SVG unless
 * `images.dangerouslyAllowSVG` is set in next.config.js, and it is NOT — so the
 * optimizer answered **400** for them and the feature rows plus the CTA rendered
 * as blank space in production. `unoptimized` serves the file straight from
 * /public, which is the right answer for a vector anyway (there is nothing to
 * resample) and avoids loosening a global security setting for first-party files.
 */
export function WhyChooseSection() {
  const { t } = useTranslation()

  return (
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
        {/* Commented out, not deleted: this card's copy tells job seekers
            they pay a subscription, which contradicts PRODUCT.md's locked
            rule that seekers are free forever (see docs/i18n/GLOSSARY.md,
            seeker.landing.feature3Title).
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
        */}
      </div>
    </section>
  )
}
