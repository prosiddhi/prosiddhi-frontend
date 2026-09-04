'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { User, Briefcase, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { resolveMediaUrl } from '@/lib/api'
import { displayName, profilePhoto } from '@/lib/userDisplay'
import { Tooltip } from '@/components/ui/Tooltip'

/**
 * UserDropdown — the account menu in the global header on every authed screen.
 *
 * Identity comes from `useAuth()` alone. This component takes NO props: it used
 * to accept `userName`/`userImage` with a hardcoded default that every one of
 * its 22 call sites fell through to, so every logged-in user saw the same fake
 * name. Removing the props removes the only way that can happen again.
 *
 * The menu is role-aware — the middle item points an employer at their jobs and
 * a seeker at their applications, rather than sending everyone to the
 * seeker-only /my-applications screen.
 */
export function UserDropdown() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  const name = displayName(user)
  const photo = resolveMediaUrl(profilePhoto(user))

  // Employers get the company-profile screen; everyone else the seeker profile.
  const profileHref = isEmployer ? '/employer/profile' : '/profile'
  const workHref = isEmployer ? '/employer/jobs' : '/my-applications'
  const workLabel = isEmployer ? t('nav.myJobs') : t('nav.myApplications')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleLogout = () => {
    setIsOpen(false)
    // Clears the token + user from storage/state and redirects to /login.
    logout()
  }

  return (
    // `min-w-0`: this sits inside HeaderActions' flex row alongside Mail and
    // the notification bell. Without it, the browser floors this item at its
    // own content's full width (avatar + the ENTIRE name on one line, since
    // truncation below implies `whitespace-nowrap`) and the name would rather
    // push the header wider — or, inside the grid header, get squeezed by
    // wrapping to extra lines — than actually truncate. `min-w-0` is what
    // lets ONLY the name give up space; the avatar and the icons next to it
    // never do (see `shrink-0` below and their own fixed/margin-box sizing).
    //
    <div className="relative min-w-0" ref={dropdownRef}>
      {/* Full-name tooltip via the shared Tooltip component — right-aligned
          under the button, and hidden while the dropdown menu is open so
          the two floating panels never stack. `focusable={false}`: the
          button is already a tab stop, so Tooltip skips adding its own and
          links `aria-describedby` onto the button directly instead. */}
      <Tooltip
        content={name}
        position="bottom"
        align="end"
        focusable={false}
        disabled={isOpen}
        className="w-full"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={t('nav.accountMenu')}
          // 44px target around a 32-38px avatar (TD-20). `w-full`: a <button>
          // does not reliably block-fill its parent's width the way a <div>
          // does — even with `display: flex` applied, browsers size a form
          // control to its shrink-to-fit content by default. This component's
          // OWN root div is no longer stretched by an ancestor (that's what
          // used to make `w-full` matter for truncation) — it's still kept so
          // the button always matches whatever width its root div naturally
          // resolves to, rather than occasionally drifting from it.
          //
          // `items-center`: with the avatar and the single-line name span as
          // the only two children, this centers the avatar against the name's
          // line height for free. Avatar sits at this box's own left edge
          // (right after Bell); the name span (its own fixed width, see below)
          // follows it — matching the required "[Mail] [Notification] [Avatar]
          // Name" left-to-right order.
          className="flex items-center gap-2 w-full min-w-[44px] min-h-[44px] hover:opacity-80 transition-opacity"
        >
          {/* `shrink-0`: a flex item's default flex-shrink is 1, so without this
              the avatar would give up some of its own 32/38px under the same
              squeeze that truncates the name — the browser has no reason to
              prefer shrinking text over shrinking an image otherwise. */}
          <div className="w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-full bg-primary-50 overflow-hidden flex items-center justify-center shrink-0">
            {photo ? (
              <Image
                src={photo}
                alt=""
                width={38}
                height={38}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          {/* `truncate` (Tailwind core — `overflow: hidden; text-overflow:
              ellipsis; white-space: nowrap`): the name stays on ONE line and
              ellipsizes instead of wrapping. A 2-line version was tried first,
              but at narrow/zoomed layouts (e.g. 80% zoom with a long Malayalam
              name) it wrapped into an awkward "Bhare" / "Ku…" split — a single
              truncated line ("Bhare…") reads far better than a broken 2-line one.
              The width is a fixed `clamp(4.5rem, 5vw, 9rem)`, NOT `max-w-[9rem]`
              and NOT `flex-1`: a max-width is a CEILING, not a fixed size — it
              still lets the box shrink to fit shorter content, so short names
              render narrower than long ones and Mail's X drifts with whichever
              name is loaded (measured up to 44px). `flex-1` has the opposite
              problem: constant size, but that size is "whatever's left in the
              row", which stretches the whole Mail/Bell/avatar/name cluster
              across the entire right rail (measured: Mail landed 2px from the
              nav). A literal fixed width is what keeps this span's contribution
              to the row's layout constant regardless of the TEXT, which is
              what lets HeaderActions.tsx use a single leading spacer to push
              the compact cluster flush against the right edge.
              `clamp(4.5rem, 5vw, 9rem)` instead of one flat number: a single
              guessed width (e.g. "9rem, about what 'Venkata Subramaniam' needs") only
              happens to look right at the viewport it was eyeballed on — the
              `5vw` middle term scales the box with the actual viewport instead,
              growing from 1280px up to the page's own `max-w-[1920px]` cap (vw
              growth beyond that is meaningless, hence the `9rem` ceiling) and
              scaling correctly under browser zoom too, since zoom scales `vw`
              and root font-size together.
              Bounds are `rem`, NOT `ch`: measured directly in Chromium,
              `clamp(9ch, 5vw, 16ch)` — mixing a font-relative `ch` bound with a
              viewport-relative `vw` middle term — resolves to the `ch` MAXIMUM
              at every viewport width, ignoring the `vw` term entirely (a real
              engine bug, not a typo: an isolated `clamp(50px, 5vw, 200px)`
              probe on the same page tracked `vw` correctly). `rem` bounds with
              the same `vw` middle term measured correctly at every tested width
              (1280/1366/1440/1920/2560). `min-w-0` still lets the box shrink
              below the clamp's floor on a truly narrow viewport rather than
              forcing an overflow. No native `title` here — the Tooltip above
              is the only hover/focus tooltip, so the two never stack. */}
          {name && (
            <span className="hidden sm:block truncate min-w-0 w-[clamp(4.5rem,5vw,9rem)] text-left text-sm lg:text-base">
              {name}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div
            role="menu"
            className="absolute right-0 mt-2 w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn"
          >
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.profile')}</span>
            </Link>

            {/* My Jobs (employer) / My Applications (seeker) */}
            <Link
              href={workHref}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{workLabel}</span>
            </Link>

            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.settings')}</span>
            </Link>

            <div className="h-px bg-gray-200 my-2" />

            <button
              onClick={handleLogout}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.logout')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
