'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { AppPhonePreview } from './AppPhonePreview'

/**
 * "Get the app" band on the landing page, between the role cards and the footer.
 * Full width, so it reads as a section of the page and not a card.
 *
 * Left: heading, one line of copy, the QR code and the Play button. Right: the
 * phone image. The QR is hidden below `md`: a phone user cannot scan their own
 * screen, so they get the button alone, full width. Below `md` the image stacks
 * under the button.
 */

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.prosiddhi.app'

// The QR code's size in px. The scan caption sits in the same column, centred
// under the tile, so it follows if this changes.
const QR_SIZE = 112


export function AppDownloadBanner() {
  const { t } = useTranslation('common')

  return (
    <section
      aria-labelledby="app-banner-title"
      className="relative overflow-hidden bg-gradient-to-br from-white via-primary-10 to-primary-20"
    >
      {/* Decoration only, behind the content: two soft circles and the brand's
          slanted bars (the same motif as the job-feed banner), in primary tints. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-30/40 blur-3xl" />
        <span className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-primary-40/30 blur-3xl" />
        <span className="absolute -right-10 top-0 h-full w-10 -skew-x-12 bg-primary-30/50 sm:w-14" />
        <span className="absolute right-12 top-0 h-full w-5 -skew-x-12 bg-primary-50/40 sm:right-20 sm:w-8" />
        {/* Soft wave lines along the bottom. `preserveAspectRatio="none"` stretches
            them to the band's width; `non-scaling-stroke` keeps the lines thin. */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-20 w-full fill-none sm:h-28"
        >
          <path d="M0 70 C240 20 480 110 720 65 S1200 20 1440 70" className="stroke-primary-30" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d="M0 88 C240 38 480 128 720 83 S1200 38 1440 88" className="stroke-primary-40/70" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d="M0 106 C240 56 480 146 720 101 S1200 56 1440 106" className="stroke-primary-50/50" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-20">
        {/* Side by side only from `lg`: below that the two phones and the text do not
            both fit, so the phones go under the text, centred. */}
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:max-w-[560px] xl:max-w-[620px] text-center lg:text-left">
            <h2
              id="app-banner-title"
              className="text-3xl sm:text-[40px] xl:text-5xl font-bold text-primary-100 leading-tight tracking-tight"
            >
              {t('home.appBanner.title')}
            </h2>
            <p className="mt-4 lg:mt-5 text-base lg:text-xl text-gray-600 leading-relaxed max-w-[540px] mx-auto lg:mx-0">
              {t('home.appBanner.subtitle')}
            </p>

            <div className="mt-7 lg:mt-9">
              {/* One block: the QR tile (with its caption under it) on the left, the
                  store button on the right, centred on the QR. Centred as a whole below
                  `lg`, left-aligned beside the phones from `lg`. The QR is decorative
                  for a screen reader — the Play button beside it is the same link,
                  with real text. */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-center lg:justify-start gap-5">
                <div aria-hidden="true" className="hidden md:flex shrink-0 flex-col items-center gap-2">
                  <div className="rounded-xl bg-white p-3 shadow-md ring-1 ring-primary-30">
                    <QRCodeSVG value={PLAY_STORE_URL} size={QR_SIZE} level="M" />
                  </div>
                  <p className="text-center text-xs font-medium text-primary-90">
                    {t('home.appBanner.scan')}
                  </p>
                </div>

                {/* Store buttons. A plain button, not a lookalike of Google's badge:
                    the official badge is an image Google supplies and would replace
                    this link's contents. */}
                <div className="flex flex-col gap-3">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full md:w-auto min-h-12 items-center justify-center rounded-lg bg-primary-80 px-8 py-2.5 text-white shadow-md transition-colors hover:bg-primary-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-80 focus-visible:ring-offset-2"
                  >
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-[10px] uppercase tracking-wide text-primary-20">
                        {t('home.appBanner.getItOn')}
                      </span>
                      <span className="text-base font-semibold">Google Play</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Two phones drawn in code with real live jobs (AppPhonePreview.tsx — the
              one place to change what they show). Decorative. */}
          <div className="shrink-0 mx-auto lg:mx-0">
            <AppPhonePreview />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AppDownloadBanner
