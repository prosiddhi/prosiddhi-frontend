'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Home, Briefcase, Bookmark, Menu, Languages, Check, ChevronDown, X } from 'lucide-react'
import { LANGUAGE_OPTIONS } from './LanguageSwitcher'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import {
  BOTTOM_NAV_BODY_CLASS,
  SEEKER_BOTTOM_NAV_HEIGHT,
  SEEKER_MORE_ITEMS,
  SEEKER_NAV_TABS,
  isMoreActive,
  isPathUnder,
  type SeekerNavTab,
} from '@/lib/seekerNav'

const TAB_ICONS: Record<SeekerNavTab, typeof Home> = {
  home: Home,
  jobFeed: Briefcase,
  savedJobs: Bookmark,
}

const TAB_CLS = 'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors'
const LABEL_CLS = 'w-full text-center text-xs leading-tight line-clamp-2'
const NAV_STYLE = { height: `calc(${SEEKER_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }

/**
 * Home / Job Feed / Saved Jobs / More, fixed to the bottom below `lg` (1024px). From `lg`
 * up the header's own nav shows instead. Rendered by EmployeeHeader with the same `active`
 * prop, outside the sticky header so its z-index (40, under modals at 50) is not trapped.
 * Page content is kept clear of it by a body class — see globals.css.
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
      <nav
        aria-label={t('nav.mainNavigation')}
        style={NAV_STYLE}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      >
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

      {moreOpen && <MoreSheet pathname={pathname} onClose={closeMore} />}
    </>
  )
}

/**
 * The More sheet. Its own component so the language hook and the open-list state only
 * exist while it is open, and closing it resets them. Language goes through
 * `useLanguagePreference` — the same hook the header switcher and Settings use — so
 * there is one language state and one `PATCH /api/me/language`.
 */
function MoreSheet({ pathname, onClose }: { pathname: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguagePreference()
  const [langOpen, setLangOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const currentLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language

  useEffect(() => {
    closeRef.current?.focus()
    // The page must not scroll under the sheet.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [onClose])

  return (
    <div className="lg:hidden">
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.more')}
        // aria-modal says the page behind is inert, so keep Tab inside the sheet.
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return
          const items = e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
          const first = items[0]
          const last = items[items.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }}
        className="fixed bottom-0 inset-x-0 z-[55] max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="text-base font-semibold text-black">{t('nav.more')}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('buttons.close')}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="pb-2">
          <li>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              className="flex items-center gap-3 w-full min-h-[48px] px-4 text-left text-gray-900 hover:bg-gray-50"
            >
              <Languages className="w-5 h-5 shrink-0 text-gray-700" strokeWidth={1.5} />
              <span className="flex-1 min-w-0 text-base">
                {t('language.label')}: {currentLabel}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <ul aria-label={t('language.select')} className="bg-gray-50 py-1">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const selected = opt.value === language
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => {
                          setLanguage(opt.value)
                          onClose()
                        }}
                        className={`flex items-center justify-between w-full min-h-[44px] pl-12 pr-4 text-left text-sm ${
                          selected ? 'text-primary-50 font-medium' : 'text-gray-900'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selected && <Check className="w-4 h-4" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
          {SEEKER_MORE_ITEMS.map((item) => {
            const isCurrent = isPathUnder(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`flex items-center min-h-[48px] px-4 pl-12 text-base hover:bg-gray-50 ${
                    isCurrent ? 'text-primary-50 font-medium' : 'text-gray-900'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
