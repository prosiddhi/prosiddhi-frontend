'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, ChevronDown, Check } from 'lucide-react'
import {
  useLanguagePreference,
  type SupportedLanguage,
} from '@/hooks/useLanguagePreference'
import { SUPPORTED_LANGUAGES } from '@/i18n/config'
import { LANGUAGE_OPTIONS } from '@/lib/jobCategories'

/**
 * Re-exported for the call sites that already import it from here (settings).
 *
 * **Endonyms are data, not translations.** These labels used to be i18n keys
 * (`language.english`, `language.hindi`) resolved with `t()`, which is wrong on
 * its face: "தமிழ்" is "தமிழ்" in every locale. Keeping them in the locale files
 * meant 10 files each carrying all 10 names — 100 strings that had to stay
 * byte-identical, every one of them foreign script inside its own file.
 *
 * The single definition lives in lib/jobCategories.ts, so the header switcher,
 * the home language section and the registration picker cannot drift apart —
 * which is exactly what happened when each kept its own copy.
 */
export { LANGUAGE_OPTIONS }

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
    LANGUAGE_OPTIONS.find((o) => o.value === current)?.label ?? current

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
                  <span>{opt.label}</span>
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
