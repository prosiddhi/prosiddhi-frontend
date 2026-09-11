'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { PricingPlans } from '@/components/employer/PricingPlans'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone,
  Facebook,
  Instagram,
  Github,
  Linkedin,
  Eye,
  EyeOff,
  ArrowRight,
  PhoneCall,
  MessageCircle
} from 'lucide-react'

function EmployerLandingPageContent() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
        {/* Overlay to dim the background */}
        <div className="absolute inset-0 bg-white/70"></div>
        
        {/* Background Images - Responsive */}
        <div className="absolute top-[200px] sm:top-[300px] lg:top-[380px] left-0 w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-8 lg:opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden lg:block absolute top-[380px] left-[58.333%] w-[740px] h-[555px] opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden md:block absolute top-[250px] sm:top-[320px] lg:top-[380px] left-[20%] sm:left-[25%] w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-8 lg:opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[65px] sm:h-[75px] fixed top-0 left-0 right-0 z-40">
        {/* `grid grid-cols-[1fr_auto_1fr]`, not the old `flex justify-between`
            with logo+nav sharing one flex group. That grouping made the nav
            trail right behind the logo, since the two of them competed
            against Help+Sign Up as a SINGLE unit — every px of slack the row
            had collected in the one gap between "logo+nav" and "Help+Sign
            Up", never between the logo and the nav itself. Flanking the nav
            with two equal `1fr` columns puts it at the row's true visual
            centre regardless of how wide the logo or the Help+Sign Up group
            are, without needing to know either width up front. */}
        <div className="max-w-[1920px] mx-auto h-full px-4 sm:px-6 lg:px-12 xl:px-[120px] grid grid-cols-[1fr_auto_1fr] items-center">
          <Link href="/" className="flex items-center min-h-[44px] justify-self-start">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Navigation. All three are in-page anchors — `html { scroll-behavior:
                smooth }` (globals.css) already makes a plain `<a href="#id">`
                scroll smoothly, no JS handler needed. "What We Offer" reuses
                `offers.heading` (the section's own heading string) rather than
                a new nav.* key, so it can't drift from the heading it points
                at and needs no new translation. "Find Workers" now points at
                `#hero` (the "Find Workers for Your Business..." section) —
                it used to point at `#offer`, which is what "Post Job" (now
                removed) sat next to.

                ⚠️ `hidden min-[460px]:flex`, not `hidden md:flex` (768px).
                Measured this header's real min-content width (logo + 3 labels
                + gaps + Sign Up, at their smallest existing sizes): ~460px is
                the genuine floor before the nav would start overlapping Sign
                Up — 768px was hiding the labels ~300px earlier than the
                layout actually required. `text-[11px]` + `gap-2` is a new,
                extra-compressed floor tier (nothing this small existed
                before) so the newly-visible 460–639px band doesn't render at
                the same 14px/16px size a 1024px+ screen gets — `min-[640px]:`
                and up reuse the sizes that were already here. */}
          <nav className="hidden min-[460px]:flex items-center justify-self-center gap-2 min-[640px]:gap-4 lg:gap-8 xl:gap-11">
            <a href="#offer" className="text-black text-[11px] min-[640px]:text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
              {t('employer:landing.offers.heading')}
            </a>

            <a href="#hero" className="text-black text-[11px] min-[640px]:text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
              {t('employer:landing.nav.findWorkers')}
            </a>

            <a href="#pricing" className="text-black text-[11px] min-[640px]:text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
              {t('employer:landing.nav.pricing')}
            </a>
          </nav>

          {/* Right Side */}
          <div className="flex items-center justify-self-end gap-3 sm:gap-4 lg:gap-8">
            <Link href="/contact" className="hidden sm:flex items-center gap-1 text-sm lg:text-base text-black hover:text-primary-50 transition-colors">
              <Phone className="w-3 h-3 lg:w-4 lg:h-4" />
              {/* One label at both breakpoints. The long/short pair existed only
                  because the desktop string was "Help/Support"; that slash was
                  ambiguous to translate, and now that both read "Help" a responsive
                  split buys nothing. `landing.helpShort` is retired. */}
              <span>{t('employer:landing.help')}</span>
            </Link>

            <Link href="/employer/register" className="px-2 sm:px-3 py-1.5 sm:py-2 bg-primary-50 text-primary-100 rounded-lg text-xs sm:text-sm lg:text-base hover:bg-primary-60 transition-colors whitespace-nowrap">
              {t('employer:landing.signUp')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Sign-In. `id="hero"` + `scroll-mt-20`, matching the
          `#offer`/`#pricing` sections below, so "Find Workers" in the header
          nav can anchor here — `scroll-margin-top` only affects where an
          anchor jump lands, it doesn't add visible padding or move anything. */}
      <section id="hero" className="relative z-10 pt-20 sm:pt-24 lg:pt-32 xl:pt-[147px] pb-12 sm:pb-16 lg:pb-20 xl:pb-[72px] scroll-mt-20">
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
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 xl:gap-[114px]">
            {/* Left Content */}
            <div className="flex-1 w-full min-w-0 lg:max-w-[1028px]">
              {/* Badge */}
              <div className="inline-flex items-center justify-center px-4 sm:px-5 py-1.5 sm:py-2 bg-white border border-[#f2f2f2] rounded-full mb-4 sm:mb-6 lg:mb-8">
                <span className="text-xs text-primary-50">{t('employer:landing.badge')}</span>
              </div>

              {/* ⚠️ The 60px/72px bumps are NOT at `lg`/`xl` (1024/1280) on
                  purpose. `lg:flex-row` (a few lines down) turns this into a
                  two-column row at exactly 1024, and `xl:` below hands the
                  sign-in panel more width at exactly 1280 — either one alone
                  shrinks this column right as the font would otherwise grow.
                  Stacking both at once was worse: at 1280 (a common laptop's
                  100%-zoom width) the column measured 391px against a 72px
                  font and wrapped the heading across SIX lines. Landing the
                  size jumps at 1120/1536 instead — past where the two-column
                  layout has actually widened this column back out — keeps it
                  to 2-3 lines at every width in between. `leading-tight`
                  (not the old fixed `lg:leading-[86px]`) so line-height scales
                  with whichever size is active instead of taxing a wrapped
                  48px/60px line for space sized for a 2-line 72px heading.

                  ⚠️ `min-[1120px]:max-[1279px]:text-6xl` + `min-[1370px]:text-6xl`,
                  not one plain `min-[1120px]:text-6xl` — a SECOND, narrower
                  collision the container fix above couldn't reach. The Hero's
                  outer container/gap/sign-in-form width has to switch at `xl`
                  (1280) to stay aligned with the Header (a fixed reference,
                  never moves), and that alone re-squeezes this column at
                  1280–~1355 even with the font already deferred — 60px in
                  that narrower band wrapped to 5 fragmented lines. 1164px and
                  1422px (the widths immediately either side of that band) were
                  already fine at 60px, so the fix could only be this band,
                  not a threshold shift — a single `min-width` cannot carve out
                  a dip between two widths that already look right. Dropping to
                  48px (the `md` size, one step down) ONLY inside the gap
                  restores a clean 3-line wrap there without touching anything
                  outside it. */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl min-[1120px]:max-[1279px]:text-6xl min-[1370px]:text-6xl min-[1536px]:text-[72px] font-bold text-black leading-tight mb-4 sm:mb-6 [overflow-wrap:anywhere]">
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
                  className="inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-primary-50 text-primary-100 rounded-lg text-sm sm:text-base hover:bg-primary-60 transition-colors"
                >
                  {t('employer:landing.postAJob')}
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 border border-[#3a7a96] rounded-lg text-sm sm:text-base text-black hover:bg-gray-50 transition-colors"
                >
                  {t('employer:landing.contactUs')}
                </Link>
              </div>
            </div>

            {/* Sign-In Form */}
            <div className="bg-white border border-[#dfdfdf] rounded-[10px] p-6 sm:p-8 lg:p-10 xl:p-12 w-full lg:w-auto lg:min-w-[450px] xl:min-w-[535px]">
              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-lg sm:text-xl font-medium text-black mb-2 sm:mb-3 lg:mb-4">
                    {t('employer:landing.emailLabel')}
                  </label>
                  <input
                    type="email"
                    placeholder={t('employer:landing.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 sm:h-14 px-3 sm:px-4 border border-[#b5b5b5] rounded-lg text-sm sm:text-base placeholder-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-lg sm:text-xl font-medium text-black mb-2 sm:mb-3 lg:mb-4">
                    {t('employer:landing.passwordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('employer:landing.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 px-3 pr-12 border border-[#b5b5b5] rounded-lg text-base placeholder-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <Link href="/forgot-password" className="text-base font-medium text-[#aaaaaa] hover:text-primary-50">
                    {t('employer:landing.forgotPassword')}
                  </Link>
                </div>

                {/* Sign In — routes to the real login (this landing's inline form is
                    presentational; /login owns the actual auth + role toggle). */}
                <Link href="/login" className="block w-full py-3 bg-primary-50 text-primary-100 rounded-lg text-xl text-center hover:bg-primary-60 transition-colors">
                  {t('employer:landing.signIn')}
                </Link>

                {/* Sign Up Link */}
                <div className="text-center text-xl">
                  <span className="text-black">{t('employer:landing.noAccount')}</span>
                  <Link href="/employer/register" className="font-semibold text-[#1e5166] hover:underline">
                    {t('employer:landing.signUpHere')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section id="offer" className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white scroll-mt-20">
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
              className="inline-block px-4 sm:px-6 py-2 sm:py-2.5 border border-[#1e5166] rounded-lg text-base sm:text-lg lg:text-xl text-black hover:bg-gray-50 transition-colors"
            >
              {t('employer:landing.offers.callForHelp')}
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section — live 8-tier catalog from GET /api/plans (PJP-176). */}
      <section id="pricing" className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white scroll-mt-20">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <PricingPlans />
        </div>
      </section>

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

      {/* `relative z-10`, matching every section above — the page-wide
          decorative background (`fixed inset-0 z-0` near the top of this
          component) doesn't scroll away, so anything painted without its own
          stacking context sits BELOW it and reads as washed out/gray. This
          was the one spot on the page missing that wrapper; `Footer` itself
          is the same shared component the seeker landing page uses (which
          has no such overlay to rise above), so it needs no change. */}
      <div className="relative z-10">
        <Footer />
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
