'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { LogIn } from 'lucide-react'

/**
 * "How it Works" — the three tilted step cards from the Figma landing page.
 * Shared by the home page and the seeker landing page; moved here unchanged
 * from employee/page.tsx.
 */
export function HowItWorksSection() {
  const { t } = useTranslation()

  return (
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
  )
}
