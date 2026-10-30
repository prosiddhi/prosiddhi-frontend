'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Building2, LogIn, Menu, Phone, Search, User, UserPlus, X, type LucideIcon } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PUBLIC_MENU_ID, PublicMenuDimmer, PublicMenuPanel } from './PublicMenuPanel'
import { clearPendingReturn } from '@/lib/pendingReturn'
import {
  publicLoginHref,
  publicMenuItems,
  publicNavItems,
  publicRegisterHref,
  type PublicNavVariant,
} from '@/lib/publicNav'

/**
 * The icons the three headers this one replaced had on the full bar, by nav item id. The
 * employer page only ever had one (Help); its other links had none. Shown from 1280px
 * (`xl`) only: at 1024–1279 the Tamil and Malayalam bars have no room for them.
 * Register and Login had icons on the home and seeker pages, never on the employer one.
 */
const BAR_ICONS: Record<string, LucideIcon> = {
  findJobs: Search,
  companies: Building2,
  employer: User,
  help: Phone,
}
const ICON_CLS = 'hidden xl:block shrink-0 w-4 h-4'

/**
 * The header for the logged-out pages (`/`, `/employee`, `/employer/welcome` and a
 * logged-out job page). What each page links to is in `lib/publicNav.ts`. Every
 * important action is spelled out in words at every width.
 *
 * Under 640px it is TWO rows (logo + hamburger / language + Login); 640–1023px one row
 * (logo on the left; language, Login and the hamburger grouped on the right); from
 * 1024px the full bar with Register and no hamburger. The hamburger is an icon with no
 * box or label (its accessible name is "Menu"), at least 44×44.
 *
 * The language control always keeps its English gloss ("தமிழ் (Tamil)"). The "Language:"
 * word in front of it is shown at 430–1023px and from 1536px, and hidden under 430px (the
 * phone control: `display="value"`, may wrap to two lines) and at 1024–1535px
 * (`prefixClassName`). Tamil and Malayalam are the widest scripts; with the gloss, the
 * 1024px bar only fits with that word hidden and the tighter spacing set in the classes
 * below (header padding, gaps, nav gaps and a 128px logo, all relaxing as the width grows
 * and back to the original values from 1536px). The smoke test measures at least 12px
 * between neighbouring controls at every desktop width, in all four languages it covers.
 * Below 1024px the page links live in the Menu instead.
 *
 * Source order IS the visual order at every width (no `order-*`). That needs the hamburger
 * to come second on a phone (top-right, row-major) but LAST from 640px (far right), so it
 * is rendered twice and exactly one is ever displayed: the other is `display: none`, which
 * removes it from Tab order and the accessibility tree. The language control is likewise
 * rendered twice (phone / 430px and up), one displayed at a time.
 *
 * `returnTo` is for a logged-out job page: Register and Login carry the job, so the
 * visitor comes back to it after signing up or in. See `publicLoginHref` / `publicRegisterHref`.
 *
 * `sticky`, not `fixed`: the header takes its own height, so no page needs a top padding
 * to clear it. The Menu is `PublicMenuPanel`: a dropdown under the header (not the signed-in
 * bars' bottom sheet). The hamburger toggles it and shows an X while it is open; Escape
 * (focus back to the button), a click outside, a link, or tabbing out of the header closes it.
 */
export function PublicHeader({ variant, returnTo }: { variant: PublicNavVariant; returnTo?: string }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const phoneMenuRef = useRef<HTMLButtonElement>(null)
  const wideMenuRef = useRef<HTMLButtonElement>(null)

  const items = publicNavItems(variant)
  const registerHref = publicRegisterHref(variant, returnTo)
  const authIcons = variant !== 'employer'

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false)
    if (!restoreFocus) return
    // Two triggers exist (see above); only the displayed one can take focus back.
    const shown = [phoneMenuRef.current, wideMenuRef.current].find((b) => b && b.offsetParent !== null)
    shown?.focus()
  }, [])

  // A public page that is not a job page starts a fresh intent: drop a job remembered by a
  // sign-up the visitor abandoned, so a later plain Register does not land them on it.
  // Best-effort: it only runs where this header renders, so the 30-minute expiry in
  // lib/pendingReturn.ts is the backstop. (It cannot live on /register, whose Back buttons
  // return to a bare /register in the middle of a sign-up.)
  useEffect(() => {
    if (!returnTo) clearPendingReturn()
  }, [returnTo])

  // The Menu button is gone from 1024; a panel left open across a resize would hide itself
  // but come back open if the window shrank again.
  useEffect(() => {
    if (!menuOpen) return
    const wide = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (wide.matches) setMenuOpen(false)
    }
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [menuOpen])

  // Escape closes (focus back to the button). A click anywhere outside the panel and the
  // two hamburgers closes too, so the dimmed page and the header's own controls both count
  // as "outside". A link in the panel closes it itself (PublicMenuPanel).
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true)
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (document.getElementById(PUBLIC_MENU_ID)?.contains(target)) return
      if (phoneMenuRef.current?.contains(target) || wideMenuRef.current?.contains(target)) return
      closeMenu()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
    }
  }, [menuOpen, closeMenu])

  // Page links in the bar (1024+). The label may wrap onto a second line inside a
  // capped width: Tamil and Malayalam labels are 100–300px on one line.
  const navLinkCls =
    'inline-flex items-center justify-center gap-1 min-h-[44px] max-w-[150px] xl:max-w-[200px] 2xl:max-w-none text-center leading-tight text-black hover:text-primary-50 transition-colors text-sm xl:text-base 2xl:text-[18px]'

  // The hamburger: icon only, no border or box, 44×44. `-mr-2.5` lets the 24px glyph, not
  // the 44px target, line up with the page's right padding. `shrink-0`: it stays 44 wide
  // even when a long language label leaves the row a pixel or two short (Malayalam at
  // 640px); the overflow lands in the page padding. Focus ring: the global
  // `:focus-visible` rule in globals.css.
  const menuButtonCls = 'items-center justify-center shrink-0 w-11 h-11 -mr-2.5 rounded-lg text-black hover:bg-gray-100 transition-colors'
  const menuButtonProps = {
    type: 'button' as const,
    onClick: () => setMenuOpen((v) => !v),
    'aria-controls': PUBLIC_MENU_ID,
    'aria-expanded': menuOpen,
    'aria-label': t('nav.menu'),
  }

  const menuIcon = menuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />

  return (
    <>
      <PublicMenuDimmer open={menuOpen} />
      <header
        className="sticky top-0 z-40 bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)]"
        onBlur={(e) => {
          // Tabbing out of the header (to the page) closes the panel.
          if (menuOpen && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) closeMenu()
        }}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-3 xl:px-4 min-[1440px]:px-6 2xl:px-8 min-[1920px]:px-12 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 sm:py-0 sm:flex sm:h-[75px] sm:gap-3 xl:gap-4">
          <Link href="/" className="col-start-1 row-start-1 justify-self-start flex items-center min-h-[44px] shrink-0">
            <div className="relative w-[112px] h-[31px] sm:w-[128px] sm:h-[35px] min-[1440px]:w-[142px] min-[1440px]:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Phone only (hidden from 640): top-right, second in source order. */}
          <button
            ref={phoneMenuRef}
            {...menuButtonProps}
            className={`col-start-2 row-start-1 justify-self-end inline-flex sm:hidden ${menuButtonCls}`}
          >
            {menuIcon}
          </button>

          <nav
            aria-label={t('nav.mainNavigation')}
            className="hidden lg:flex lg:flex-1 items-center justify-center gap-3 xl:gap-5 min-[1440px]:gap-8 2xl:gap-11 min-w-0"
          >
            {items.map((item) => {
              const Icon = BAR_ICONS[item.id]
              return (
                <Link key={item.id} href={item.href} className={navLinkCls}>
                  {Icon && <Icon className={ICON_CLS} aria-hidden="true" />}
                  {/* `break-words`, not `[overflow-wrap:anywhere]`: `anywhere` lets a squeezed
                      nav shrink below a word's width, which cut the 4-letter Tamil "Help"
                      in two at 1024px. This only breaks a word wider than `max-w`. */}
                  <span className="line-clamp-2 break-words">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          {/* The list opens to the right of the chip on a phone (it sits at the left of
              row 2) and to its left from 640, where the chip is on the right. */}
          {/* Two instances, one displayed, like the two hamburgers. From 430px: the full
              "Language: தமிழ் (Tamil)" on one line. Below 430px it does not fit beside Login
              in Tamil or Malayalam, so there the gloss stays but the "Language:" word goes
              and the label may wrap to two lines (`wrapLabel`; `h-5` is the 14px label's
              line height). `max-sm:min-w-0` lets the grid column shrink for it (phone only: at 640 it would squeeze the hamburger). */}
          <div className="col-start-1 row-start-2 justify-self-start max-sm:min-w-0 sm:ml-auto lg:ml-0">
            <LanguageSwitcher
              className="min-[430px]:hidden"
              display="value"
              wrapLabel
              iconWrapClassName="flex h-5 items-center justify-center shrink-0"
              labelClassName="text-sm"
              triggerClassName="border border-gray-300 rounded-lg px-3 min-w-[44px] justify-center"
              menuClassName="left-0"
            />
            <LanguageSwitcher
              className="hidden min-[430px]:block"
              prefixClassName="lg:max-[1535px]:hidden"
              labelClassName="text-sm xl:text-base"
              triggerClassName="border border-gray-300 rounded-lg px-3 lg:px-2 xl:px-3 min-w-[44px] justify-center"
              menuClassName="left-0 sm:left-auto sm:right-0"
            />
          </div>

          <Link
            href={registerHref}
            className="hidden lg:inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2 xl:px-3 border border-secondary-70 rounded-lg text-black whitespace-nowrap hover:bg-secondary-10 transition-colors text-sm xl:text-base"
          >
            {authIcons && <UserPlus className={ICON_CLS} aria-hidden="true" />}
            {t('nav.register')}
          </Link>

          <Link
            href={publicLoginHref(returnTo)}
            className="col-start-2 row-start-2 justify-self-end inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-4 lg:px-3 xl:px-4 bg-primary-50 text-primary-100 rounded-lg whitespace-nowrap hover:bg-primary-60 transition-colors text-sm xl:text-base"
          >
            {authIcons && <LogIn className="hidden xl:block shrink-0 w-5 h-5" aria-hidden="true" />}
            {t('nav.login')}
          </Link>

          {/* 640–1023px only: far right, after language and Login, last in source order. */}
          <button
            ref={wideMenuRef}
            {...menuButtonProps}
            className={`hidden sm:inline-flex lg:hidden ${menuButtonCls}`}
          >
            {menuIcon}
          </button>
        </div>

        <PublicMenuPanel
          open={menuOpen}
          items={publicMenuItems(variant, returnTo)}
          pathname={pathname}
          onClose={closeMenu}
        />
      </header>
    </>
  )
}
