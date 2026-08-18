'use client'

import { useEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from './config'
import { ensureLocale } from './loadLocale'

/**
 * I18nProvider — mounts the shared i18next instance for the whole app.
 *
 * The instance initialises with the default language (`en`) so server-rendered
 * markup matches the first client paint. After mount we read the persisted choice
 * from localStorage and switch — this runs only on the client, so it can never
 * cause a hydration mismatch. The language switcher writes the same key, so a
 * refresh keeps the user's choice.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      const lng =
        stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)
          ? stored
          : DEFAULT_LANGUAGE
      if (lng !== i18n.language) {
        // Only English ships in the main bundle; anything else is fetched first.
        // If the chunk fails the user stays on the fallback rather than seeing
        // a page of raw translation keys.
        void ensureLocale(lng).then(() => i18n.changeLanguage(lng))
      }
      document.documentElement.lang = lng
    } catch {
      // localStorage unavailable (private mode / SSR) — keep the default language.
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export default I18nProvider
