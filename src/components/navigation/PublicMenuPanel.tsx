'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Building2, ChevronRight, CircleHelp, Search, UserPlus, Users, type LucideIcon } from 'lucide-react'
import type { PublicNavItem } from '@/lib/publicNav'

export const PUBLIC_MENU_ID = 'public-menu'

const ICONS: Record<string, LucideIcon> = {
  findJobs: Search,
  companies: Building2,
  employer: Building2,
  offer: BadgeCheck,
  findWorkers: Users,
  help: CircleHelp,
  register: UserPlus,
}

/**
 * The phone / tablet Menu of the public header: a full-width panel that drops from the
 * header's bottom edge, with a light dimmer over the page. It is rendered INSIDE the sticky
 * `<header>`, so `top-full` is always the header's real bottom (one row or two).
 * `PublicMenuDimmer` is rendered beside the header, under it in z-order.
 *
 * Always mounted so it can animate both ways; closed it is `visibility: hidden` (out of the
 * Tab order and the accessibility tree) and `max-h-0` (no layout, so it adds no page scroll).
 *
 * A disclosure, not a modal dialog: the page is not locked and the header stays usable.
 * Focus goes to the first link on open. The caller owns `open` and closes it on Escape,
 * a click outside the panel (the dimmer included) and tabbing out of the header.
 */
export function PublicMenuPanel({
  open,
  items,
  pathname,
  onClose,
}: {
  open: boolean
  items: readonly PublicNavItem[]
  pathname: string | null
  onClose: (restoreFocus: boolean) => void
}) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
  }, [open])

  return (
    <div
      id={PUBLIC_MENU_ID}
      className={`lg:hidden absolute top-full inset-x-0 overflow-y-auto overscroll-contain bg-white rounded-b-2xl border-t border-gray-100 shadow-xl motion-reduce:[transition:none] ${
        // `visibility` flips at once on open (so focus can move in) and after the fade on close.
        open
          ? 'visible opacity-100 max-h-[calc(100dvh-7rem)] [transition:opacity_200ms_ease-out,max-height_200ms_ease-out]'
          : 'invisible opacity-0 max-h-0 [transition:opacity_200ms_ease-out,max-height_200ms_ease-out,visibility_0s_linear_200ms]'
      }`}
    >
      <nav aria-label={t('nav.menu')} className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-2">
        <ul ref={listRef}>
          {items.map((item) => {
            const Icon = ICONS[item.id]
            // Hash links (`#offer`) stay on the page, so only a real path can be "current".
            const isCurrent = !item.href.startsWith('#') && item.href === pathname
            return (
              <li key={`${item.id}|${item.href}`}>
                <Link
                  href={item.href}
                  onClick={() => onClose(false)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`flex items-center gap-3 min-h-[52px] px-3 rounded-xl text-base hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    isCurrent ? 'text-primary-50 font-medium' : 'text-gray-900'
                  }`}
                >
                  {Icon && (
                    <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-gray-100 text-gray-700">
                      <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 break-words">{t(item.labelKey)}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/** The light dim behind the panel. Beside the header (not in it), under the header's z-index. */
export function PublicMenuDimmer({ open }: { open: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`lg:hidden fixed inset-0 z-[39] bg-black/25 transition-opacity duration-200 motion-reduce:transition-none ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    />
  )
}
