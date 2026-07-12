'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { meAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { LANGUAGE_STORAGE_KEY } from '@/i18n/config'

export type SupportedLanguage = 'en' | 'hi'

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

  // i18next can hold a region-tagged tag ('en-IN') or, after a stale storage
  // read, something unsupported — clamp to the two languages we actually ship.
  const base = (i18n.language || 'en').split('-')[0]
  const current: SupportedLanguage = base === 'hi' ? 'hi' : 'en'

  const setLanguage = useCallback(
    (lng: SupportedLanguage) => {
      if (lng === (i18n.language || 'en').split('-')[0]) return

      void i18n.changeLanguage(lng)
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
