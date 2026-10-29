'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Briefcase, Search, Plus, Menu } from 'lucide-react'
import {
  BOTTOM_NAV_BAR_CLS,
  BOTTOM_NAV_LABEL_CLS,
  BOTTOM_NAV_STYLE,
  BOTTOM_NAV_TAB_CLS,
  BottomNavMoreSheet,
} from './BottomNavShared'
import { useAuth } from '@/contexts/AuthContext'
import { useEmployerOwner } from '@/hooks/useEmployerOwner'
import {
  EMPLOYER_MORE_ITEMS,
  EMPLOYER_NAV_TABS,
  employerActiveTab,
  isEmployerMoreActive,
  isFocusedEmployerRoute,
  type EmployerNavTab,
} from '@/lib/employerNav'

/** Body class that globals.css turns into the padding that keeps content clear of the bar. */
const EMPLOYER_BODY_CLASS = 'has-employer-bottom-nav'

const TAB_ICONS: Record<EmployerNavTab, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  jobs: Briefcase,
  workers: Search,
  postJob: Plus,
}

// `break-words`: a long translated label (Tamil, Malayalam) wraps inside its 1/5 of a 320px bar.
const LABEL_CLS = `${BOTTOM_NAV_LABEL_CLS} break-words`
const IDLE_CLS = 'text-gray-700 hover:text-primary-90'
const LIT_CLS = 'text-primary-90 font-medium'

/**
 * Dashboard / My Jobs / Find Workers / Post a Job / More, fixed to the bottom below `lg`
 * (1024px); from `lg` up the header's own links show instead. Mounted once by
 * employer/layout.tsx. This wrapper decides WHETHER the bar exists, so the body class and the
 * owner lookup in `EmployerBottomNavBar` only run while it is on screen.
 *
 * Chrome, not access control: every page keeps its own ProtectedRoute. The bar waits for the
 * session and a signed-in employer, skips focused screens and a forced password change.
 */
export function EmployerBottomNav() {
  const pathname = usePathname()
  const { user, isLoading, isAuthenticated } = useAuth()
  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  if (isLoading || !isAuthenticated || !isEmployer || user?.mustChangePassword) return null
  if (isFocusedEmployerRoute(pathname)) return null
  return <EmployerBottomNavBar pathname={pathname} />
}

function EmployerBottomNavBar({ pathname }: { pathname: string | null }) {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  // Focus goes back to the More tab, so a keyboard / TalkBack user is not dropped on <body>.
  const closeMore = useCallback(() => {
    setMoreOpen(false)
    moreBtnRef.current?.focus()
  }, [])
  const active = employerActiveTab(pathname)
  const moreLit = isEmployerMoreActive(pathname)
  const isOwner = useEmployerOwner()
  const moreItems = EMPLOYER_MORE_ITEMS.filter((item) => !item.ownerOnly || isOwner)

  useEffect(() => {
    document.body.classList.add(EMPLOYER_BODY_CLASS)
    return () => document.body.classList.remove(EMPLOYER_BODY_CLASS)
  }, [])

  return (
    <>
      <nav aria-label={t('nav.mainNavigation')} style={BOTTOM_NAV_STYLE} className={BOTTOM_NAV_BAR_CLS}>
        {EMPLOYER_NAV_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.key]
          const isActive = active === tab.key
          const icon = <Icon className="w-5 h-5 shrink-0" />
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${BOTTOM_NAV_TAB_CLS} ${isActive ? LIT_CLS : IDLE_CLS}`}
            >
              {tab.key === 'postJob' ? (
                // The one primary action: the header button's sky fill and `primary-100` (6.62:1).
                <span className="inline-flex items-center justify-center w-8 h-8 -my-1 rounded-full bg-primary-50 text-primary-100">
                  {icon}
                </span>
              ) : (
                icon
              )}
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
          className={`${BOTTOM_NAV_TAB_CLS} ${moreLit ? LIT_CLS : IDLE_CLS}`}
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className={LABEL_CLS}>{t('nav.more')}</span>
        </button>
      </nav>

      {moreOpen && <BottomNavMoreSheet pathname={pathname} items={moreItems} onClose={closeMore} />}
    </>
  )
}
