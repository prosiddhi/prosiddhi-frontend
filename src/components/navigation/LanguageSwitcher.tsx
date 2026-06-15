'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { jobSeekerAPI } from '@/lib/api'
import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from '@/i18n/config'

// EN + HI only this release (Q6). Labels are intentionally shown in the target
// script so a low-literacy user recognises their own language.
const OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'hi', labelKey: 'language.hindi' },
]

/**
 * LanguageSwitcher — the single in-header EN/HI control. Replaces the old
 * hardcoded "Languages: English" buttons. Persists the choice to localStorage
 * (source of truth) and, for a signed-in seeker, best-effort syncs it to the BE
 * via PUT /jobseekers/profile. Employers have no server-side language endpoint
 * yet (BR-9) — localStorage still keeps their choice across sessions.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = (i18n.language || 'en').split('-')[0]
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

  const change = (lng: string) => {
    setOpen(false)
    if (lng === current) return
    void i18n.changeLanguage(lng)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
    } catch {
      // Ignore — i18next still holds the choice in memory for this session.
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lng
    // Best-effort server sync for seekers; never block or surface errors.
    if (user?.role === 'JOB_SEEKER') {
      void jobSeekerAPI.updateProfile({ preferredLanguage: lng }).catch(() => {})
    }
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
          {OPTIONS.map((opt) => {
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
