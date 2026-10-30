'use client'

import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { PublicHeader } from '@/components/navigation/PublicHeader'
import { BackToLandingLink } from '@/components/navigation/BackToLandingLink'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowRight,
  PhoneCall,
  MessageCircle
} from 'lucide-react'

function EmployerLandingPageContent() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()

  // This is a PUBLIC marketing page, so the hero CTA has to work for both a
  // signed-in employer (take them to the form) and an anonymous visitor (take them
  // to sign-up, which is the conversion path — not /login, which would be a
  // dead-end for someone who has no account yet).
  const isEmployer = isAuthenticated && !!user?.role?.startsWith('EMPLOYER')
  const postJobHref = isEmployer ? '/employer/jobs/new' : '/employer/register'

  const offers = [
    {
      title: t('employer:landing.offers.card1Title'),
      description: t('employer:landing.offers.card1Desc'),
      gradient: 'from-[#fef1ed] to-white'
    },
    {
      title: t('employer:landing.offers.card2Title'),
      description: t('employer:landing.offers.card2Desc'),
      gradient: 'from-[#edfefa] to-white'
    },
    {
      title: t('employer:landing.offers.card3Title'),
      description: t('employer:landing.offers.card3Desc'),
      gradient: 'from-[#f0edfe] to-white'
    }
  ]

  return (
    <div className="min-h-screen bg-white relative">
      {/* Background Pattern - Dimmed and Responsive */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Background Images - Responsive.
            `opacity-[0.25]` / `[0.35]`: the original `opacity-8` / `opacity-12` are not in
            Tailwind's default scale, so they generated nothing and the images rendered at
            full opacity. The white overlay at the end of this layer is 50%, so what shows
            is about 12% / 17% of the image. Change the two together: hero text contrast
            over it is measured by `backgroundReadability` in
            scripts/smoke/smoke-responsive-landing.js. */}
        <div className="absolute top-[200px] sm:top-[300px] lg:top-[380px] left-0 w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-[0.25] lg:opacity-[0.35]">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden lg:block absolute top-[380px] left-[58.333%] w-[740px] h-[555px] opacity-[0.35]">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden md:block absolute top-[250px] sm:top-[320px] lg:top-[380px] left-[20%] sm:left-[25%] w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-[0.25] lg:opacity-[0.35]">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>

        {/* Overlay to dim the background. LAST, so it paints over the images — it
            used to be first and sat underneath them, so it dimmed nothing. */}
        <div className="absolute inset-0 bg-white/50"></div>
      </div>

      {/* Header: the shared public header. Its page links, language control, Login and
          Register come from lib/publicNav.ts; the in-page anchors below (#offer, #hero)
          are what its "What We Offer" / "Find Workers" links point at. */}
      <PublicHeader variant="employer" />

      <main>
      {/* Hero Section. `id="hero"` + `scroll-mt-28 sm:scroll-mt-24`, matching the
          `#offer` section below, so "Find Workers" in the header
          nav can anchor here — `scroll-margin-top` only affects where an
          anchor jump lands (it clears the sticky header: ~104px on a phone, 75px from
          640), it doesn't add visible padding or move anything.
          The top padding is only breathing room: the header is `sticky`, in the page's
          flow, so it no longer has to clear a `fixed` bar (it was 77 / 87 / 91 / 107px). */}
      <section id="hero" className="relative z-10 pt-3 lg:pt-4 xl:pt-8 pb-12 sm:pb-16 lg:pb-20 xl:pb-[72px] scroll-mt-28 sm:scroll-mt-24">
        {/* `xl:` (1280), matching the Header's own container exactly — the
            Header is the fixed alignment reference and must not move, so
            this boundary has to switch at the identical width or the Hero's
            left/right edge drifts away from the logo/Sign Up between 1280
            and 1536px. The `<h1>` below intentionally does NOT follow this
            breakpoint (see its own comment) — decoupling "when the boundary
            widens" from "when the font grows" is what avoids the six-line
            wrap while still keeping the boundary itself pinned to the
            Header's. */}
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          {/* Back to the landing page. The top padding above was trimmed by about
              this row's height (old 80 / 96 / 128 / 147) — the header is fixed at
              65 / 75px, so the row starts just under it. */}
          <div className="mb-2 sm:mb-4">
            <BackToLandingLink />
          </div>
          <div className="flex flex-col items-center justify-center">
            {/* Left Content */}
            <div className="w-full min-w-0">
              {/* Badge */}
              <div className="inline-flex items-center justify-center px-4 sm:px-5 py-1.5 sm:py-2 bg-white border border-[#f2f2f2] rounded-full mb-4 sm:mb-6 lg:mb-8">
                <span className="text-xs text-primary-50">{t('employer:landing.badge')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[72px] font-bold text-black leading-tight mb-4 sm:mb-6 [overflow-wrap:anywhere]">
                {t('employer:landing.heroTitle')}
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-[#717182] leading-relaxed lg:leading-8 max-w-[745px] mb-4 sm:mb-5">
                {t('employer:landing.heroSubtitle')}
              </p>

              {/* Every new employer already gets 1 post + 3 unlocks free for 14 days.
                  It was stated only on the pricing page and in the terms, so most
                  never learn about it — and the wallet then reads as a bill.

                  Anonymous visitors only. This page is public and also serves
                  signed-in employers; promising "your first job free" to one who
                  has already spent their trial sends them straight into the
                  paywall having just been told the opposite. */}
              {!isEmployer && (
                <p className="inline-block px-3 py-2 rounded-lg bg-[#e3f5ff] text-[#236987] text-sm sm:text-base font-medium mb-6 sm:mb-8">
                  {t('employer:landing.trialPitch')}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5">
                {/* The biggest button on the page was a dead <button>. A signed-in
                    employer goes straight to the post form; a visitor goes to
                    sign-up, which is the actual conversion path. */}
                <Link
                  href={postJobHref}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-primary-50 text-primary-100 rounded-lg text-sm sm:text-base hover:bg-primary-60 transition-colors"
                >
                  {t('employer:landing.postAJob')}
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 border border-[#3a7a96] rounded-lg text-sm sm:text-base text-black hover:bg-gray-50 transition-colors"
                >
                  {t('employer:landing.contactUs')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section id="offer" className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white scroll-mt-28 sm:scroll-mt-24">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-medium mb-2 sm:mb-3">{t('employer:landing.offers.heading')}</h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#717182] max-w-[672px] mx-auto px-4">
              {t('employer:landing.offers.subheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 xl:gap-24 mb-8 sm:mb-10 lg:mb-12">
            {offers.map((offer, index) => (
              <div
                key={index}
                className="bg-neutral-50 border-2 border-white rounded-[20px] p-3 sm:p-4 w-full max-w-[494px] mx-auto"
              >
                <div className={`bg-gradient-to-b ${offer.gradient} h-[250px] sm:h-[280px] lg:h-[316px] rounded-xl mb-4 relative overflow-hidden`}>
                  {/* Visual elements for each card */}
                  {index === 0 && (
                    <div className="absolute inset-0 p-12" aria-hidden="true">
                      {/* Candidate list visual */}
                      <div className="space-y-3">
                        <div className="bg-white border border-[#b5b5b5] rounded-lg p-3 flex items-center gap-3">
                          <div className="w-11 h-11 bg-[#42b2b1] rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <span className="px-3 py-1 bg-gray-300 rounded text-xs text-white">
                            {t('employer:landing.offers.select')}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-lg">
                          <div className="w-11 h-11 bg-primary-50 rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <span className="px-3 py-1 bg-primary-50 rounded text-xs text-primary-100">
                            {t('employer:landing.offers.selected')}
                          </span>
                        </div>
                        <div className="bg-white border border-[#b5b5b5] rounded-lg p-3 flex items-center gap-3">
                          <div className="w-11 h-11 bg-[#1a5252] rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <span className="px-3 py-1 bg-gray-300 rounded text-xs text-white">
                            {t('employer:landing.offers.select')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="absolute inset-0 p-12" aria-hidden="true">
                      {/* Job post form visual */}
                      <div className="bg-white rounded-lg p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <span className="px-4 py-1 bg-primary-50 rounded text-xs text-primary-100 ml-auto block">
                          {t('employer:landing.offers.postAJob')}
                        </span>
                      </div>
                    </div>
                  )}
                  {index === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      {/* Contact visual */}
                      <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-lg">
                        <div className="w-11 h-11 bg-primary-50 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-1 bg-gray-300 rounded w-3/4" />
                          <div className="h-1 bg-gray-300 rounded w-1/2" />
                        </div>
                        <span className="p-2 bg-primary-50 rounded">
                          <PhoneCall className="w-3 h-3 text-white" />
                        </span>
                        <span className="p-2 bg-gray-600 rounded">
                          <MessageCircle className="w-3 h-3 text-white" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-[32px] font-semibold text-center mb-3 sm:mb-4">{offer.title}</h3>
                <p className="text-sm sm:text-base lg:text-[18px] text-[#717182] text-center px-4 sm:px-6">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/contact"
              className="inline-flex items-center min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 border border-[#1e5166] rounded-lg text-base sm:text-lg lg:text-xl text-black hover:bg-gray-50 transition-colors"
            >
              {t('employer:landing.offers.callForHelp')}
            </Link>
          </div>
        </div>
      </section>

      {/* No pricing on this page, by decision (Nazir, 20 Oct 2026): plans are
          shown only once an employer has an account — in sign-up and in their
          dashboard (/employer/plans). */}

      {/* CTA Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-[1632px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="bg-[#f8f8f8] border-2 border-white rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] px-6 sm:px-8 lg:px-16 xl:px-[144px] py-8 sm:py-12 lg:py-16 xl:py-[69px]">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 xl:gap-[29px]">
              {/* Illustration */}
              <div className="relative w-full max-w-[400px] sm:max-w-[500px] lg:max-w-[600px] xl:max-w-[871px] h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[580px] order-2 lg:order-1">
                <Image
                  src="/assets/group_7.svg"
                  alt={t('employer:landing.cta.title')}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Content */}
              <div className="w-full lg:max-w-[702px] order-1 lg:order-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[48px] font-medium mb-4 sm:mb-6 lg:mb-[15px] leading-tight">
                  {t('employer:landing.cta.title')}
                </h2>

                {/* Last child since the app-download block was removed
                    (TD-14), so no bottom margin — the parent centres this
                    column, and a phantom margin shifted the whole thing up. */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 flex-shrink-0 mt-1" />
                    <p className="text-base sm:text-lg lg:text-xl text-black">{t('employer:landing.cta.point1')}</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 flex-shrink-0 mt-1" />
                    <p className="text-base sm:text-lg lg:text-xl text-black">
                      {t('employer:landing.cta.point2')}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* `relative z-10`, matching every section above — the page-wide
          decorative background (`fixed inset-0 z-0` near the top of this
          component) doesn't scroll away, so anything painted without its own
          stacking context sits BELOW it and reads as washed out/gray. This
          was the one spot on the page missing that wrapper; `Footer` itself
          is the same shared component the seeker landing page uses (which
          has no such overlay to rise above), so it needs no change. */}
      <div className="relative z-10">
        <Footer audience="employer" width="welcome" />
      </div>
    </div>
  )
}

// Public employer marketing + sign-in landing. Relocated from /employer when the
// dashboard moved there (PJP-143 routing fix, 2026-06-15). No auth gate — logged-out
// visitors reach it from the homepage "For Employers" / "Post a Job" links.
export default function EmployerLandingPage() {
  return <EmployerLandingPageContent />
}
