'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Languages, Check, ChevronDown, X } from 'lucide-react'
import { LANGUAGE_OPTIONS } from './LanguageSwitcher'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import { SEEKER_BOTTOM_NAV_HEIGHT, isPathUnder, type SeekerMoreItem } from '@/lib/seekerNav'

/**
 * The parts the seeker and employer bottom bars share: the bar's own classes and the More
 * sheet. Each bar keeps its tabs, its active-tab rule and its body class; only what is
 * identical lives here, so the two bars cannot drift apart.
 */

/**
 * Layers, lowest first: the fixed bar `z-40`; the sticky headers `z-50`; the More sheet and its
 * dimmer `z-[55]` — above the header, so the header cannot be used while the sheet is open;
 * then the payment and other dialogs `z-[100]`, which stay above the bar and the sheet.
 */
export const BOTTOM_NAV_BAR_CLS =
  'lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]'
export const BOTTOM_NAV_TAB_CLS = 'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors'
export const BOTTOM_NAV_LABEL_CLS = 'w-full text-center text-xs leading-tight line-clamp-2'
export const BOTTOM_NAV_STYLE = { height: `calc(${SEEKER_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }

/**
 * The More sheet. Its own component so the language hook and the open-list state only
 * exist while it is open, and closing it resets them. Language goes through
 * `useLanguagePreference` — the same hook the header switcher and Settings use — so
 * there is one language state and one `PATCH /api/me/language`.
 */
export function BottomNavMoreSheet({
  pathname,
  items,
  onClose,
}: {
  pathname: string | null
  items: readonly SeekerMoreItem[]
  onClose: () => void
}) {
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
          const focusable = e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
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
          {items.map((item) => {
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
