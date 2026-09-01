'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Home, Briefcase, Bookmark } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { HeaderActions } from './HeaderActions'

export type EmployeeHeaderActiveTab = 'home' | 'jobFeed' | 'savedJobs'

interface EmployeeHeaderProps {
  /** Which nav item to highlight. Omit on pages that aren't one of the three. */
  active?: EmployeeHeaderActiveTab
}

// `items-start`, not `items-center`: once a label wraps (see the nav comment
// below), centering would straddle the icon between both lines instead of
// sitting beside the first one. `min-w-0` lets the link shrink below its
// text's one-line width — the flex default floors a child at its own
// min-content, which without this stops the text from ever wrapping at all.
const inactiveLinkCls = 'flex items-start gap-1 min-w-0 text-black hover:text-primary-50 transition-colors'
const activeLinkCls = 'flex items-start gap-1 min-w-0 text-primary-50'

// "Home" only — it's a single, unbreakable word in all 10 shipped languages
// (முகப்பு, ഹോം, ಹೋಮ್, ...), so unlike Job Feed/Saved Jobs/Language it can
// never absorb nav's required compression by wrapping to a second line.
// Under nav's shared `min-w-0` + default flex-shrink, that compression
// landed on Home anyway — measured directly: Tamil "முகப்பு" rendered 8px
// narrower than its own text needs at 1280px, Malayalam "ഹോം" 11.6px
// narrower at 1280 and 2.6px at 1366 — silently clipping a letter's worth of
// each word behind `line-clamp`'s `overflow: hidden`, with nothing visually
// signaling that anything was cut off. `shrink-0` (in place of `min-w-0`)
// opts Home out of the shared row's shrink distribution entirely, so it
// always renders at its natural one-line width; the three items that CAN
// gracefully wrap keep absorbing 100% of the compression instead.
const inactiveLinkClsFixed = 'flex items-start gap-1 shrink-0 text-black hover:text-primary-50 transition-colors'
const activeLinkClsFixed = 'flex items-start gap-1 shrink-0 text-primary-50'

// Same fixed font size for every language — see the nav comment below for
// why there's no per-width variant. Line-height DOES vary by language (see
// `NAV_TEXT_CLS`/`NAV_ICON_WRAP_CLS` inside the component below): Tamil and
// Malayalam get a taller one than the rest.
const NAV_ICON_CLS = 'w-[18px] h-[18px]'

/**
 * EmployeeHeader — the one header for every authenticated seeker screen.
 *
 * Six pages (job-feed, saved-jobs, my-interviews, my-applications,
 * my-applications/[id], job-details/[id]) used to carry this same markup
 * copy-pasted, and two of them had drifted onto a different layout technique
 * (a plain `justify-between` row instead of job-feed's `flex-1 basis-0` rails)
 * with a wider nav gap ladder — so the nav visibly jumped sideways when
 * navigating between them. This is the single source now; the rails + the
 * `gap-5 2xl:gap-8 min-[1920px]:gap-11` ladder are job-feed's fix, carried
 * over everywhere else.
 */
export function EmployeeHeader({ active }: EmployeeHeaderProps) {
  const { t, i18n } = useTranslation()

  // Tamil and Malayalam get more line-height than the rest: `leading-normal`
  // (1.5) is enough to stop matras clipping (measured, pixel-level, zero
  // clipping at 1.5 in every script this header ships) — but at the real
  // widths where their nav labels wrap to 2 lines (Home/Job Feed/Saved Jobs
  // AND the Language trigger all compete for the same `<nav>` row), 1.5
  // still reads as visually dense for these two scripts specifically.
  // `leading-relaxed` (1.625) is Tailwind's next standard step up — not a
  // guessed number — and is scoped to just these two languages so English/
  // Hindi/Telugu/Kannada/etc., which don't wrap at these widths, render
  // exactly as before. Both class strings are written out in full (not
  // template-interpolated) because Tailwind's compiler only picks up
  // literal class names from source, not runtime-built ones.
  const isLongScript = i18n.language === 'ta' || i18n.language === 'ml'
  const NAV_TEXT_CLS = isLongScript
    ? 'text-[18px] leading-relaxed line-clamp-2 min-w-0'
    : 'text-[18px] leading-normal line-clamp-2 min-w-0'
  // Icon wrapper height tracks whichever line-height is active above — see
  // its own definition further down for why this box (rather than the
  // link's shared row) is what centres the icon against the text.
  // 27px = 18px × 1.5 (leading-normal); 29.25px = 18px × 1.625
  // (leading-relaxed). Measured render-to-render, not estimated.
  const NAV_ICON_WRAP_CLS = isLongScript
    ? 'flex h-[29.25px] items-center justify-center shrink-0'
    : 'flex h-[27px] items-center justify-center shrink-0'
  // `<nav>`'s own item gap, reduced by one Tailwind step (20px → 16px) only
  // for Tamil/Malayalam: freeing that width doesn't affect the languages
  // that don't wrap, but gives these two a bit more room to work with at
  // exactly the widths (1280–1360px) where they do — the 2xl/1920 tiers are
  // untouched since nothing wraps at those widths regardless of language.
  const NAV_GAP_CLS = isLongScript
    ? 'gap-4 2xl:gap-8 min-[1920px]:gap-11'
    : 'gap-5 2xl:gap-8 min-[1920px]:gap-11'
  // Language trigger's own icon/label/chevron row gap, widened only for
  // Tamil/Malayalam (8px vs. the 4px every other language already had and
  // keeps unchanged) — 8px satisfies both the requested icon→label (8–10px)
  // and label→chevron (6–8px) targets at once, so one shared row gap is
  // enough; see LanguageSwitcher.tsx for why the two pairs aren't split
  // into separate values.
  const LANG_ROW_GAP_CLS = isLongScript ? 'gap-2' : 'gap-1'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* `grid grid-cols-[1fr_auto_1fr]` — the same 3-zone pattern already
          proven on the Employer Landing Page header
          (src/app/employer/welcome/page.tsx): two equal `1fr` columns flank
          an `auto`-sized centre column, so the nav sits at the row's true
          centre regardless of how wide the logo or the right-side group are,
          with no need to know either width up front.

          Two grid-track alternatives were tried and measured before this one
          and both made things worse:
            - `minmax(0,auto)` on the centre column (an explicit 0 floor,
              hoping the sizing algorithm would compress it under pressure):
              no effect — Chrome still gave the centre column nav's full
              un-wrapped width regardless, because a NON-flexible track (no
              `fr` unit) gets its max-content size claimed in an earlier pass
              of the algorithm than the flanking `fr` tracks even get
              considered, floor or no floor. Measured: Tamil/Malayalam
              overlapped the logo exactly as with bare `auto`.
            - `minmax(0,1fr)` (making the centre column genuinely flexible,
              same as the flanks): this DOES compress under pressure, but as
              an equal 1-of-3 share, not a content-aware one — it started
              wrapping ENGLISH's "Job Feed"/"Saved Jobs" even at 1280px
              where there was clearly enough room, and pushed the deficit
              onto the RIGHT side instead (nav overlapped Mail/Bell/Avatar).
          What actually works: keep the centre column plain `auto` (sizes to
          content, stays centred, exactly as this header already relied on
          for logo/right-side independence — see below), and instead bound
          `<nav>`'s OWN rendered width with an explicit `max-w-[…]` (below).
          A grid item's max-width caps what the "auto" track sizing algorithm
          treats as its content size in the first place, sidestepping the
          track-type distinction above entirely.

          `min-w-0` on the two flanking grid items, which that header doesn't
          need: its logo and "Help + Sign Up" are both short, fixed content.
          Ours has a real username of arbitrary length on the right. A grid
          item's default `min-width` is `auto`, which — exactly like a flex
          item's — floors it at its OWN content's min-content, not 0. With a
          long name (e.g. "Bharath Kumar Srimanthula") that floor can exceed
          the equal 50/50 share at tighter widths, so the grid pins that
          column to its min-content and lets the OTHER column absorb the
          leftover space, shifting the nav off-centre. `min-w-0` removes that
          content floor on both sides, so the columns always land on the
          exact equal split — the name just wraps to another line instead.
          Measured: 0px offset at every tested width, with that name.

          A `position: absolute` nav (centred independently of the flanking
          content) was tried and reverted in an earlier pass: taking the nav
          out of flow stops the row from reserving space for it, so the
          right-side content renders at its full un-wrapped width and
          physically overlaps the nav at tighter widths. The nav has to stay
          a real grid item between two properly-constrained columns. */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link href="/" className="flex items-center min-h-[44px] justify-self-start min-w-0">
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

        {/* Font size, icon size and item gap are FIXED at every width and for
            every language — restored to the original design after an earlier
            per-language/per-width shrinking ladder made the whole nav read as
            too cramped. Overlap is now prevented by wrapping instead of
            shrinking: `line-clamp-2` on each label lets a too-long translation
            (Tamil/Malayalam, or any future language) fold onto a second line,
            up to 2, with an ellipsis if it still doesn't fit — see
            `NAV_TEXT_CLS`/`inactiveLinkCls` above.
            `items-start` (in `inactiveLinkCls`/`activeLinkCls`) keeps the icon
            beside the FIRST line specifically, not centred against the full
            1-or-2-line block, so a wrapped second line reads as continuing
            under the text — never under the icon. Because the text span is a
            separate flex item to the RIGHT of the icon, its wrapped second
            line is already confined to that span's own box — there's no
            extra alignment trick needed for "under the text, not the icon".

            `max-w-[calc(100vw-570px)]`: what actually gives wrapping
            something to trigger ON (see the grid comment above for why the
            column itself can't do this alone). 570px is the logo (142) +
            outer padding (2×119) + gap-3 grid gaps (24) + a measured floor
            for the right zone (Mail+Bell+Avatar+username, ~166px minimum) —
            NOT the right zone's own responsive minimum, which is narrower;
            this is deliberately a bit generous so English/Hindi/Kannada/
            Marathi/Gujarati/Odia/Telugu/Bengali (whose one-line nav is always
            well under this cap) never touch it. `100vw`, not a `%` of the
            grid area: a `%` here would resolve against the very column width
            this max-width is meant to constrain, which is circular; `100vw`
            is external and unambiguous, and tracks the `max-w-[1920px]` page
            cap closely enough below 1920px to matter (above it the nav is
            already nowhere near this ceiling, so the small over-estimate
            there is harmless).
            Measured logo→nav margins (Malayalam/Tamil are the only ones that
            ever hit this cap and wrap; every other language's own natural
            width stays under it and never wraps):
              1280: Malayalam/Tamil 24px (both wrap) · English 111px · Kannada 33px (does not wrap)
              1366: Malayalam 24px (wraps) · Tamil 34px (does not) · English 154px
              1440+: nobody wraps — Malayalam's own margin is already 47px
              1920/2560: nobody wraps — Malayalam's margin is 251px
            Re-measure in a real browser (bounding boxes, not scrollWidth —
            content can overlap without the page itself overflowing) before
            moving the 570px figure; Kannada's 33px margin at 1280 is the
            closest any non-wrapping language comes to this cap. */}
        {/* `items-center` on the NAV itself (as opposed to `items-start` on
            each individual link/trigger below) — these are two different
            alignment questions and easy to conflate. LanguageSwitcher's
            trigger carries its own `min-h-[44px]` (TD-20 touch target), which
            makes it taller than the plain Home/Job Feed/Saved Jobs links even
            on a single line — nav's own box height is set by that tallest
            sibling. With `items-start` here, the shorter links pinned to the
            TOP of that box instead of the box's centre — measured: nav's own
            box WAS correctly centred in the 76px header, but content inside
            it sat ~9px above the header's true centre because it was
            top-aligned within a box taller than it needed. `items-center`
            fixes that; each link's OWN `items-start` (in
            inactiveLinkCls/activeLinkCls, and inside LanguageSwitcher's own
            button) is untouched and still keeps an icon beside a wrapped
            label's first line rather than centred against the full 2-line
            block — that is a different box (one item's own icon+text row),
            not this one (nav's shared row of 4 sibling items). */}
        <nav className={`hidden lg:flex items-center justify-self-center min-w-0 max-w-[calc(100vw-570px)] ${NAV_GAP_CLS}`}>
          <Link href="/" className={active === 'home' ? activeLinkClsFixed : inactiveLinkClsFixed}>
            <span className={NAV_ICON_WRAP_CLS}>
              <Home className={NAV_ICON_CLS} />
            </span>
            <span className={`${NAV_TEXT_CLS} ${active === 'home' ? 'font-medium' : ''}`}>
              {t('seeker:nav.home')}
            </span>
          </Link>
          <Link href="/job-feed" className={active === 'jobFeed' ? activeLinkCls : inactiveLinkCls}>
            <span className={NAV_ICON_WRAP_CLS}>
              <Briefcase className={NAV_ICON_CLS} />
            </span>
            <span className={`${NAV_TEXT_CLS} ${active === 'jobFeed' ? 'font-medium' : ''}`}>
              {t('seeker:nav.jobFeed')}
            </span>
          </Link>
          <Link href="/saved-jobs" className={active === 'savedJobs' ? activeLinkCls : inactiveLinkCls}>
            <span className={NAV_ICON_WRAP_CLS}>
              <Bookmark className={NAV_ICON_CLS} />
            </span>
            <span className={`${NAV_TEXT_CLS} ${active === 'savedJobs' ? 'font-medium' : ''}`}>
              {t('seeker:nav.savedJobs')}
            </span>
          </Link>
          <LanguageSwitcher
            labelClassName={NAV_TEXT_CLS}
            iconWrapClassName={NAV_ICON_WRAP_CLS}
            rowGapClassName={LANG_ROW_GAP_CLS}
            wrapLabel
          />
        </nav>

        {/* Right zone. Deliberately NOT `justify-self-end`: a non-stretch
            `justify-self` sizes a grid item to fit-content, which let it
            render at its full un-truncated width and overlap the nav —
            measured directly (screenshot showed the Mail icon and username
            drawn on top of "Language: English" at 1280px with a 50-character
            name). Leaving `justify-self` at its default (`stretch`) forces
            this item to exactly the 1fr track's computed width, no more and
            no less; `min-w-0` is what lets that width go below the content's
            own min-content instead of the track growing to fit it. Inside
            HeaderActions.tsx, only the username gets a `flex-1` box to fill
            THAT fixed width — Mail/Bell/avatar sit at fixed offsets from this
            column's own left edge, so their X position never depends on the
            username's length (see HeaderActions.tsx for the full reasoning). */}
        <div className="min-w-0">
          <HeaderActions />
        </div>
      </div>
    </header>
  )
}

export default EmployeeHeader
