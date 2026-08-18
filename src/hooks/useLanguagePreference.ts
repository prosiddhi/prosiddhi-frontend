'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { meAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from '@/i18n/config'
import { ensureLocale } from '@/i18n/loadLocale'

/**
 * Derived from SUPPORTED_LANGUAGES rather than hand-written, so adding a locale to
 * i18n/config.ts widens this type automatically. It used to be a literal `'en' | 'hi'`,
 * which silently made every other locale unreachable through this hook.
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/**
 * The one place that changes the app language.
 *
 * localStorage is the source of truth (it survives logout and works for
 * anonymous visitors). For a signed-in user we ALSO best-effort sync to
 * `PATCH /api/me/language`, which is role-agnostic (BR-9) — the switcher used
 * to call the seeker-only profile endpoint, so an employer's choice never
 * reached the server. The sync never blocks the UI or surfaces an error: the
 * language has already changed locally by then.
 */
export function useLanguagePreference() {
  const { i18n } = useTranslation()
  const { isAuthenticated } = useAuth()

  // i18next can hold a region-tagged tag ('ta-IN') or, after a stale storage read,
  // something unsupported — clamp to the languages we actually ship. This was a
  // hardcoded `base === 'hi' ? 'hi' : 'en'`, which silently reported every other
  // locale as English.
  const base = (i18n.language || DEFAULT_LANGUAGE).split('-')[0]
  const current: SupportedLanguage = (
    SUPPORTED_LANGUAGES as readonly string[]
  ).includes(base)
    ? (base as SupportedLanguage)
    : DEFAULT_LANGUAGE

  const setLanguage = useCallback(
    (lng: SupportedLanguage) => {
      if (lng === (i18n.language || 'en').split('-')[0]) return

      // Only English is bundled; fetch the chosen locale before switching, or the UI
      // would briefly render raw translation keys. ensureLocale resolves immediately
      // for English and for an already-loaded language.
      void ensureLocale(lng).then(() => i18n.changeLanguage(lng))
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
      } catch {
        // Private mode — i18next still holds the choice for this session.
      }
      if (typeof document !== 'undefined') document.documentElement.lang = lng

      if (isAuthenticated) {
        void meAPI.updateLanguage(lng).catch(() => {})
      }
    },
    [i18n, isAuthenticated]
  )

  return { language: current, setLanguage }
}
