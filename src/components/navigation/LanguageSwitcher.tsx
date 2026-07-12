'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, ChevronDown, Check } from 'lucide-react'
import {
  useLanguagePreference,
  type SupportedLanguage,
} from '@/hooks/useLanguagePreference'
import { SUPPORTED_LANGUAGES } from '@/i18n/config'

// EN + HI only this release (Q6). Labels are intentionally shown in the target
// script so a low-literacy user recognises their own language.
export const LANGUAGE_OPTIONS: { value: SupportedLanguage; labelKey: string }[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'hi', labelKey: 'language.hindi' },
]

/**
 * LanguageSwitcher — the in-header EN/HI control. The change itself lives in
 * `useLanguagePreference` (localStorage + a role-agnostic server sync), shared
 * with the language section of the Settings page.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { language: current, setLanguage } = useLanguagePreference()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLabel =
    current === 'hi' ? t('language.hindi') : t('language.english')

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const change = (lng: SupportedLanguage) => {
    setOpen(false)
    setLanguage(lng)
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.select')}
        className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors min-h-[44px]"
      >
        <Languages className="w-4 h-4" strokeWidth={1.5} />
        <span>
          {t('language.label')}: {currentLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = opt.value === current
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => change(opt.value)}
                  className={`flex items-center justify-between w-full px-4 py-3 text-left text-sm min-h-[44px] hover:bg-gray-50 transition-colors ${
                    selected ? 'text-primary-50 font-medium' : 'text-gray-900'
                  }`}
                >
                  <span>{t(opt.labelKey)}</span>
                  {selected && <Check className="w-4 h-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LanguageSwitcher

// Re-export so call sites can render the supported set if needed.
export { SUPPORTED_LANGUAGES }
