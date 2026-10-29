'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Home, Briefcase, Bookmark, Menu } from 'lucide-react'
import {
  BOTTOM_NAV_BAR_CLS,
  BOTTOM_NAV_LABEL_CLS as LABEL_CLS,
  BOTTOM_NAV_STYLE as NAV_STYLE,
  BOTTOM_NAV_TAB_CLS as TAB_CLS,
  BottomNavMoreSheet,
} from './BottomNavShared'
import {
  BOTTOM_NAV_BODY_CLASS,
  SEEKER_MORE_ITEMS,
  SEEKER_NAV_TABS,
  isMoreActive,
  type SeekerNavTab,
} from '@/lib/seekerNav'

const TAB_ICONS: Record<SeekerNavTab, typeof Home> = {
  home: Home,
  jobFeed: Briefcase,
  savedJobs: Bookmark,
}

/**
 * Home / Job Feed / Saved Jobs / More, fixed to the bottom below `lg` (1024px). From `lg`
 * up the header's own nav shows instead. Rendered by EmployeeHeader with the same `active`
 * prop, outside the sticky header so its z-index is not trapped (layers: see BottomNavShared).
 * Page content is kept clear of it by a body class — see globals.css. The employer area
 * has its own bar (EmployerBottomNav) built from the same shared parts.
 */
export function SeekerBottomNav({ active }: { active?: SeekerNavTab }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  // Focus goes back to the More tab, so a keyboard / TalkBack user is not dropped on <body>.
  const closeMore = useCallback(() => {
    setMoreOpen(false)
    moreBtnRef.current?.focus()
  }, [])
  const moreLit = isMoreActive(active, pathname)

  useEffect(() => {
    document.body.classList.add(BOTTOM_NAV_BODY_CLASS)
    return () => document.body.classList.remove(BOTTOM_NAV_BODY_CLASS)
  }, [])

  return (
    <>
      <nav aria-label={t('nav.mainNavigation')} style={NAV_STYLE} className={BOTTOM_NAV_BAR_CLS}>
        {SEEKER_NAV_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.key]
          const isActive = active === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${TAB_CLS} ${isActive ? 'text-primary-50 font-medium' : 'text-gray-700 hover:text-primary-50'}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={LABEL_CLS}>{t(tab.labelKey)}</span>
            </Link>
          )
        })}
        <button
          ref={moreBtnRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`${TAB_CLS} ${moreLit ? 'text-primary-50 font-medium' : 'text-gray-700 hover:text-primary-50'}`}
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className={LABEL_CLS}>{t('nav.more')}</span>
        </button>
      </nav>

      {moreOpen && <BottomNavMoreSheet pathname={pathname} items={SEEKER_MORE_ITEMS} onClose={closeMore} />}
    </>
  )
}
