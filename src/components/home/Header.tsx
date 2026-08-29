'use client'

import { Search, Building2, UserPlus, LogIn } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'

/**
 * The logged-out landing header. Only `src/app/page.tsx` renders it.
 *
 * **Order is the hierarchy and does not change:** logo → Find Jobs → Companies
 * → Language → Register → Login. From 692px up every one of those is spelled
 * out, on ONE row, in all ten languages. What steps with width is spacing, then
 * button padding, then type size — and the logo very nearly last.
 *
 * ## Spend order: gaps → button padding → type → logo
 *
 * The logo is the cheapest thing in the bar and the most conspicuous when it
 * shrinks, so it is the last lever, not the first. Measured in a real Edge with
 * Tamil (the widest of the ten languages) on one line:
 *
 *   - growing the logo 56 → 142 costs **86px, once**
 *   - growing the nav type by 1px costs **~44px**, because five labels scale
 *
 * An earlier ladder had this backwards and paid for type with logo width: 112px
 * at 100% zoom but 72px at 125%, 56px at 175%, 40px at 200%. The mark was
 * unreadable well before the words were. Holding the logo and spending type
 * instead keeps it at its full 142px all the way to 150% zoom.
 *
 * ## The ladder (Tamil requirement → breakpoint)
 *
 * Re-measured 2026-08-29, when the language trigger's English gloss was restored
 * ("மொழி: தமிழ் (Tamil)", not "மொழி: தமிழ்"). The gloss costs 30-47px depending
 * on the tier, so every threshold below moved up:
 *
 * | logo | nav | Tamil needs | breakpoint |
 * |-----:|----:|------------:|-----------:|
 * |  142 |  18 |        1247 |       1530 |
 * |  142 |  18 |        1227 |       1410 |
 * |  142 |  16 |        1097 |       1124 |
 * |  142 |  14 |        1011 |       1028 |
 * |  142 |  12 |         898 |        916 |
 * |  142 |  11 |         850 |        868 |
 * |  128 |  10 |         755 |        772 |
 * |   96 |   9 |         675 |        692 |
 *
 * Which lands these zoom levels on a maximised 1920-CSS-px window:
 *
 * | zoom | innerWidth | logo | nav |
 * |-----:|-----------:|-----:|----:|
 * | 100% |       1920 |  142 |  18 |
 * | 110% |       1745 |  142 |  18 |
 * | 125% |       1536 |  142 |  18 |
 * | 150% |       1280 |  142 |  16 |
 * | 175% |       1097 |  142 |  14 |
 * | 200% |        960 |  142 |  12 |
 *
 * Small CSS type at high zoom is not small on screen: 11px at 150% zoom occupies
 * the same physical space as 16.5px at 100%. The logo is the opposite — holding
 * it at 142 CSS px means it *grows* with zoom, like everything else on the page.
 *
 * ⚠️ Every breakpoint clears its figure by **at least 17px, and that margin is
 * the scrollbar, not padding**. A media query matches `innerWidth`, which
 * INCLUDES the scrollbar; the row is laid out in `clientWidth`, which does not.
 * Edge's classic scrollbar is 15–17px, so a tier firing at exactly its own
 * requirement is short by that much on any machine without overlay scrollbars.
 *
 * ⚠️ No `sm:` / `lg:` / `xl:` utilities here. Tailwind orders breakpoints by
 * value, so `sm:` (640) beats `min-[692px]` — the mobile 24px padding, 128px
 * logo and 16px gaps silently won in that band and the bar overlapped.
 * Arbitrary `min-[…]` only, so the ladder reads in one order.
 *
 * ⚠️ `scrollWidth === clientWidth` does NOT prove this fits. The nav's children
 * can overflow their own box and paint on top of the auth group with no page
 * overflow at all. Test by comparing adjacent items' bounding boxes for overlap.
 */
export function Header() {
  const { t } = useTranslation()

  // Icon-only below 692 (TD-20 keeps the 44px target), labelled above it.
  // `whitespace-nowrap`: the bar is a fixed 75px and these labels are the widest
  // thing in it. Without it a long translation wraps to two lines INSIDE the bar
  // — measured at 1280 in Tamil, the language label rendered 54px tall.
  const navLinkCls =
    'shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] whitespace-nowrap text-black hover:text-primary-50 transition-colors ' +
    'gap-1 min-[384px]:gap-1.5 min-[692px]:gap-[2px] min-[868px]:gap-1 min-[1028px]:gap-1.5 ' +
    'text-base min-[692px]:text-[9px] min-[772px]:text-[10px] min-[868px]:text-[11px] min-[916px]:text-[12px] min-[1028px]:text-[14px] min-[1124px]:text-[16px] min-[1410px]:text-[18px]'

  // The auth buttons ride the same ladder; they hold one step back on type only
  // at the top, where the Figma sets 16 against the nav's 18.
  //
  // **40px tall, not 44** — a deliberate exception to TD-20, taken by the product
  // owner on 2026-08-29 after seeing it rendered. These are the only two boxed
  // controls in the bar, so at 44 they read as bulky next to unboxed 18px nav
  // links, and the mismatch grows with zoom: the type ladder takes the label to
  // 12px at 200% while the box stayed 44.
  //
  // ⚠️ Height only. `min-w-[44px]` stays, so the target is still 44 wide, and
  // 40×44 is comfortably clear of WCAG 2.5.8 (AA) at 24×24. It is below the
  // 44×44 of WCAG 2.5.5 (AAA), which is what TD-20 had adopted — do not
  // "restore" this to 44 as a drive-by a11y fix without asking the owner.
  const authBtnCls =
    'inline-flex shrink-0 items-center justify-center min-w-[44px] min-h-[40px] rounded-lg whitespace-nowrap transition-colors py-2 ' +
    'gap-1 min-[384px]:gap-2 min-[692px]:gap-[2px] min-[868px]:gap-1 min-[1028px]:gap-1.5 ' +
    'px-2 min-[384px]:px-3 min-[692px]:px-[2px] min-[868px]:px-1 min-[1028px]:px-1.5 min-[1124px]:px-2 min-[1410px]:px-3 ' +
    'text-base min-[692px]:text-[9px] min-[772px]:text-[10px] min-[868px]:text-[11px] min-[916px]:text-[12px] min-[1028px]:text-[13px] min-[1124px]:text-[14px] min-[1410px]:text-[16px]'

  // 14px icons in the two tightest tiers — six of them at 16px is 100px of row,
  // which is a whole point of nav type.
  const iconCls =
    'shrink-0 w-4 h-4 min-[692px]:w-3.5 min-[692px]:h-3.5 min-[868px]:w-4 min-[868px]:h-4'

  // The four gaps between the five header items, as ELEMENTS rather than `gap`.
  //
  // `gap` cannot shrink, which is the whole problem it caused: the old stepped
  // ladder had to pick one spacing per breakpoint sized for Tamil's worst case,
  // and then applied it to every language. In English at 945px that produced 4px
  // between "Find Jobs" and "Companies" — while 175px of slack sat unused in the
  // outer rails, and Login ended up 4px from the viewport edge.
  //
  // A shrinkable spacer makes each gap `min(40px, whatever is going spare)`:
  //   - `basis-10` (40px) is the Figma spacing and the most it ever takes;
  //   - `shrink` lets it give the space back when the row is genuinely full;
  //   - `min-w-[6px]` stops it reaching zero, so items never touch;
  //   - grow is 0, so on a wide screen the slack still goes to the outer rails
  //     and the nav stays on the centre line, exactly as the design wants.
  //
  // The rails are `flex-1 basis-0`: they grow, but with a zero basis they have
  // no shrink capacity, so all the pressure lands on these spacers first. That
  // is the "reduce gaps first" rule, expressed in flex rather than breakpoints,
  // and it re-solves itself on a language switch with no JS.
  const spacerCls = 'shrink basis-10 min-w-[6px]'


  return (
    <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
      {/* The row IS the <nav>, so the five items and the four spacers are all
          siblings in ONE flex formatting context.

          They used to be nested — logo-rail | <nav>(3 links)</nav> | auth-rail —
          and that nesting is what broke the spacers: Chrome sized the inner
          <nav> from its children's *shrunken* contributions, so the two spacers
          inside it sat at their 6px minimum even at 2851px wide, while the two
          outside sat at their full 40px. Same markup, same CSS, four gaps, two
          different answers. Flat, every spacer is measured against the same free
          space and they all agree. */}
      <nav
        className={
          // No `gap` here — the spacers do that job and, unlike `gap`, they can
          // give the space back. The padding floor rises to 16px from 976 up so
          // Login is never on the viewport edge; it stays small only in the two
          // tiers where every pixel is genuinely spoken for.
          'container mx-auto h-full flex items-center ' +
          'px-2 min-[384px]:px-4 min-[692px]:px-1 min-[868px]:px-2 min-[1028px]:px-4 min-[1410px]:px-6 min-[1530px]:px-8'
        }
      >
        {/* Left rail. `flex-1 basis-0` on BOTH outer rails: they grow, so on a
            wide screen the surplus lands here and the nav items stay on the
            container's centre line — but with a zero basis they have no shrink
            capacity, so when the row is full the pressure goes to the spacers
            instead. That is "reduce gaps first", expressed in flex.

            Under plain `justify-between` the nav's position was a function of how
            wide its own words were: at 1366 it began at x=401 in English but
            x=204 in Tamil, and Language→Register collapsed from 227px to 30px on
            a language switch alone. */}
        <div className="flex-1 basis-0 flex justify-start">
          <Link href="/" className="flex items-center min-h-[44px] shrink-0">
            {/* Two steps, not five. 96 → 128 → 142, and 142 from 812 up, so the
                mark is full size at every zoom to 150% and only a step down at
                175%. Aspect held at 142:39 throughout.

                The 88px step below 384 is the ICON-ONLY bar, not a labelled one.
                Four 44px targets (TD-20, not negotiable) plus a 112px logo plus
                padding needs ~364px, so at 320 — a 1920 panel at 150% OS scale
                and 400% zoom, and also a real iPhone SE — the bar overlapped
                itself and the page grew a horizontal scrollbar. */}
            <div className="relative w-[88px] h-[24px] min-[384px]:w-[112px] min-[384px]:h-[31px] min-[692px]:w-[96px] min-[692px]:h-[26px] min-[772px]:w-[128px] min-[772px]:h-[35px] min-[868px]:w-[142px] min-[868px]:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        <span aria-hidden="true" className={spacerCls} />

        <Link
          href="/employee"
          aria-label={t('nav.findJobs')}
          title={t('nav.findJobs')}
          className={navLinkCls}
        >
          <Search className={iconCls} />
          <span className="hidden min-[692px]:inline">{t('nav.findJobs')}</span>
        </Link>

        <span aria-hidden="true" className={spacerCls} />

        <Link
          href="/employer/welcome"
          aria-label={t('nav.companies')}
          title={t('nav.companies')}
          className={navLinkCls}
        >
          <Building2 className={iconCls} />
          <span className="hidden min-[692px]:inline">{t('nav.companies')}</span>
        </Link>

        {/* Hidden with the control it spaces, or it would leave a 40px hole in
            the icon-only bar. */}
        <span aria-hidden="true" className={`${spacerCls} hidden min-[692px]:block`} />

        <LanguageSwitcher
          className="hidden min-[692px]:block"
          labelClassName="text-[9px] min-[772px]:text-[10px] min-[868px]:text-[11px] min-[916px]:text-[12px] min-[1028px]:text-[14px] min-[1124px]:text-[16px] min-[1410px]:text-[18px]"
        />

        <span aria-hidden="true" className={spacerCls} />

        {/* Right rail. Register and Login stay a tight pair with their own gap —
            they read as one control group, so this gap is deliberately NOT one of
            the four that share the surplus. */}
        <div className="flex-1 basis-0 flex items-center justify-end gap-1 min-[384px]:gap-2 min-[692px]:gap-1.5 min-[868px]:gap-2 min-[1028px]:gap-2.5 min-[1124px]:gap-3 min-[1410px]:gap-4 min-[1530px]:gap-5">
          <Link
            href="/register"
            aria-label={t('nav.register')}
            title={t('nav.register')}
            className={`${authBtnCls} border border-secondary-70 text-black hover:bg-secondary-10`}
          >
            <UserPlus className={iconCls} />
            <span className="hidden min-[692px]:inline">{t('nav.register')}</span>
          </Link>

          <Link
            href="/login"
            aria-label={t('nav.login')}
            title={t('nav.login')}
            className={`${authBtnCls} bg-primary-50 text-primary-100 hover:bg-primary-60`}
          >
            {/* 20px from 976 up, matching the Figma; below that it joins the rest
                at 16 (14 in the two tightest tiers). */}
            <LogIn className={`${iconCls} min-[1028px]:w-5 min-[1028px]:h-5`} />
            <span className="hidden min-[692px]:inline">{t('nav.login')}</span>
          </Link>
        </div>
      </nav>
    </header>
  )
}
