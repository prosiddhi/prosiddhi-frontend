'use client'

import { useTranslation } from 'react-i18next'

/**
 * Festive launch announcement on the landing page: a red ribbon with
 * swallow-tail ends, gold edges, a gold seal and white stars that twinkle
 * slowly. One shape, two orientations:
 *
 * - Below `md` (phones): horizontal, above the hero heading.
 * - From `md` up: standing upright on the left of the page, tails top and
 *   bottom, text upright. The page keeps the content centred: <main> reserves
 *   the SAME width on both sides (app/page.tsx), so the content narrows when
 *   the screen is tight but never shifts off-centre, and the banner sits in
 *   the left reserve, centred in it.
 *
 * The stars sit on the red, not around it — white on the pale hero background
 * would be invisible. They only animate under `motion-safe`, so a visitor who
 * asked their device for reduced motion sees them still.
 *
 * White on red-700 is 6.3:1, so the text passes AA; the darker gradient ends
 * only raise it.
 */

type Star = { left: string; top: string; size: string; delay: string }

const RIBBON_STARS: Star[] = [
  { left: '6%', top: '18%', size: 'text-[9px]', delay: '0s' },
  { left: '22%', top: '68%', size: 'text-[7px]', delay: '0.9s' },
  { left: '41%', top: '12%', size: 'text-[8px]', delay: '1.7s' },
  { left: '63%', top: '72%', size: 'text-[9px]', delay: '0.4s' },
  { left: '80%', top: '16%', size: 'text-[7px]', delay: '1.3s' },
  { left: '94%', top: '64%', size: 'text-[8px]', delay: '2.1s' },
]

// Down the banner's two side edges, clear of the text in the middle.
const BANNER_STARS: Star[] = [
  { left: '12%', top: '4%', size: 'text-[12px]', delay: '0s' },
  { left: '80%', top: '9%', size: 'text-[9px]', delay: '1.1s' },
  { left: '10%', top: '24%', size: 'text-[9px]', delay: '2s' },
  { left: '84%', top: '31%', size: 'text-[12px]', delay: '0.6s' },
  { left: '8%', top: '47%', size: 'text-[10px]', delay: '1.6s' },
  { left: '86%', top: '55%', size: 'text-[9px]', delay: '0.3s' },
  { left: '12%', top: '70%', size: 'text-[11px]', delay: '2.3s' },
  { left: '82%', top: '78%', size: 'text-[10px]', delay: '1.4s' },
  { left: '46%', top: '93%', size: 'text-[9px]', delay: '0.8s' },
]

function Stars({ stars }: { stars: Star[] }) {
  return stars.map((star) => (
    <span
      key={`${star.left}-${star.top}`}
      aria-hidden="true"
      style={{ left: star.left, top: star.top, animationDelay: star.delay }}
      className={`pointer-events-none absolute ${star.size} leading-none text-white opacity-70 motion-safe:animate-twinkle`}
    >
      ✦
    </span>
  ))
}

function Seal({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 ring-2 ring-amber-100 shadow text-red-800 leading-none ${className}`}
    >
      ★
    </span>
  )
}

/** Horizontal ribbon, in the hero flow, on phones (below `md`). */
export function LaunchRibbon() {
  const { t } = useTranslation('common')

  return (
    // px-5 leaves room for the tails, which hang 14px outside the band.
    <div className="flex justify-center mb-4 sm:mb-5 px-5 md:hidden">
      <div className="relative inline-flex max-w-full">
        {/* Swallow-tail ends: darker red, dropped 6px behind the band so the
            ribbon reads as folded. Stretch with the band when the text wraps. */}
        <span
          aria-hidden="true"
          className="absolute -left-3.5 top-1.5 -bottom-1.5 w-7 bg-red-900 [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,40%_50%)]"
        />
        <span
          aria-hidden="true"
          className="absolute -right-3.5 top-1.5 -bottom-1.5 w-7 bg-red-900 [clip-path:polygon(0_0,100%_0,60%_50%,100%_100%,0_100%)]"
        />

        <div className="relative inline-flex items-center gap-2.5 sm:gap-3 bg-gradient-to-r from-red-800 via-red-700 to-red-800 border-y-2 border-amber-300 pl-1.5 pr-4 sm:pr-5 py-1.5 shadow-md">
          <Seal className="w-8 h-8 sm:w-9 sm:h-9 text-base sm:text-lg" />
          <span className="relative text-xs sm:text-sm font-semibold text-white text-center leading-snug">
            {t('home.launchBadge')}
          </span>
          <Stars stars={RIBBON_STARS} />
        </div>
      </div>
    </div>
  )
}

/**
 * The ribbon standing upright on the left, `md` and up. Positioned against
 * <main>, which must be `relative` and pad both sides by --lb-pad.
 *
 * --lb-m (the left space) and --lb-w (the banner width) come from <main>
 * (app/page.tsx), so the reserve and the banner can never disagree. The banner
 * is centred in that space: left = (space - width) / 2.
 *
 * The one sentence is split at its " · " into two blocks with a gold rule
 * between, so the ten translations need no second key; a translation without
 * the separator just shows as one block.
 */
export function LaunchBanner() {
  const { t } = useTranslation('common')
  const [launched, app] = t('home.launchBadge').split(' · ')

  return (
    // Held between the fixed 75px header (Header.tsx) and the footer — top
    // and bottom leave room for the 20px tails — and centred in that space, so
    // it can never run into the footer on a short page or a tall screen.
    <div className="hidden md:flex flex-col justify-center absolute top-[103px] bottom-[36px] w-[var(--lb-w)] left-[calc((var(--lb-m)-var(--lb-w))/2)]">
      {/* Length in proportion to width (~3.4×), 400–580px: a narrow banner at full
          height was mostly empty red. */}
      <div className="relative h-full max-h-[clamp(400px,calc(var(--lb-w)*3.4),580px)]">
        {/* Swallow-tail ends: darker red, shifted 8px sideways behind the band
            so the ribbon reads as folded — the horizontal tails, turned. */}
        <span
          aria-hidden="true"
          className="absolute -top-5 left-2 -right-2 h-10 bg-red-900 [clip-path:polygon(0_0,50%_45%,100%_0,100%_100%,0_100%)]"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-5 left-2 -right-2 h-10 bg-red-900 [clip-path:polygon(0_0,100%_0,100%_100%,50%_55%,0_100%)]"
        />

        {/* overflow-wrap: some Tamil and Malayalam words are wider than the
            column and were clipped at the edge; wrapping beats cutting. */}
        <div className="relative h-full flex flex-col items-center justify-center gap-[clamp(14px,calc(var(--lb-w)*0.11),28px)] overflow-hidden bg-gradient-to-b from-red-800 via-red-700 to-red-800 border-x-[3px] border-amber-300 px-[clamp(8px,calc(var(--lb-w)*0.08),20px)] text-center shadow-xl [overflow-wrap:anywhere]">
          {/* Soft vertical sheen, so the band reads as satin rather than flat red. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/4 w-1/4 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
          />

          {/* Seal, text and rule all scale with the banner's width (--lb-w). */}
          <Seal className="relative w-[clamp(44px,calc(var(--lb-w)*0.36),80px)] h-[clamp(44px,calc(var(--lb-w)*0.36),80px)] text-[clamp(20px,calc(var(--lb-w)*0.15),34px)]" />

          <p className="relative text-[clamp(13px,calc(var(--lb-w)*0.11),22px)] font-bold leading-snug text-white">
            {launched}
          </p>

          {app && (
            <>
              <div aria-hidden="true" className="relative flex items-center gap-2 text-amber-300">
                <span className="h-px w-[clamp(18px,calc(var(--lb-w)*0.16),40px)] bg-amber-300/80" />
                <span className="text-[clamp(10px,calc(var(--lb-w)*0.06),14px)] leading-none">✦</span>
                <span className="h-px w-[clamp(18px,calc(var(--lb-w)*0.16),40px)] bg-amber-300/80" />
              </div>
              <p className="relative text-[clamp(12px,calc(var(--lb-w)*0.1),20px)] font-semibold leading-snug text-amber-100">
                {app}
              </p>
            </>
          )}

          <Stars stars={BANNER_STARS} />
        </div>
      </div>
    </div>
  )
}
