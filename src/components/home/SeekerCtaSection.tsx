'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LogIn, Phone } from 'lucide-react'

/**
 * "Ready to Find Your Next Job?" — the closing banner from the Figma landing
 * page. Shared by the home page and the seeker landing page; moved here
 * unchanged from employee/page.tsx. Its SVG is `unoptimized` for the reason
 * given in WhyChooseSection.
 */
export function SeekerCtaSection() {
  const { t } = useTranslation()

  return (
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
              {/* "Register", the word the header and Menu use — it said "Sign Up Today",
                  a third name for the same action. min-h-[44px]: both were ~36px tall. */}
              <Link href="/register" className="min-h-[44px] px-3 py-2 bg-primary-50 text-primary-100 rounded-lg text-base flex items-center gap-2 hover:bg-primary-60 transition-colors">
                <LogIn className="w-5 h-5" />
                {t('seeker:nav.register')}
              </Link>
              <Link href="/contact" className="min-h-[44px] px-3 py-2 border border-secondary-70 rounded-lg text-base text-black flex items-center gap-2 hover:bg-secondary-10 transition-colors">
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
  )
}
