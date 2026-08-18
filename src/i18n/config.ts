'use client'

// i18n instance (react-i18next). See Q-FE-05 (docs/decisions-log.md): client-side
// react-i18next, NOT next-i18next/next-intl — this app uses an in-header language
// switcher with no per-locale URL routing and every screen is a 'use client'
// component, so a client provider fits with zero route restructuring and keeps
// i18next key-parity with the mobile RN side.
//
// Resources are static JSON imported at build time (no async backend), so t() is
// synchronous and there is no loading flash. Namespaces are split per screen-group
// so translation files stay small and reviewable; `common` is the default ns.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Only English is bundled. The other nine locales are code-split and fetched on demand
// by i18n/loadLocale.ts — see the rationale there. Importing all ten here put ~1.26 MB of
// JSON into a single eager chunk.
import enResources from '@/locales/en'

// The locale constants live in a side-effect-free module so the API client and the global
// error boundary can import them WITHOUT booting i18next (this file calls i18n.init() below).
// Re-exported here because most call sites already import them from '@/i18n/config'.
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  NAMESPACES,
  toSupportedLanguage,
} from './languages'
export type { SupportedLanguage } from './languages'

import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  NAMESPACES,
} from './languages'

export const resources = {
  en: enResources,
} as const

// Guard against re-init under Fast Refresh / repeated imports.
if (!i18n.isInitialized) {
  i18n
    // NOTE: i18next-browser-languagedetector is deliberately NOT used.
    //
    // It used to be wired up with `caches: ['localStorage']`. Because `lng` below
    // pins the initial language to 'en', the detector's cache step wrote 'en' back
    // over the user's stored choice on EVERY page load — before I18nProvider's
    // mount effect could read it. Net effect: picking Hindi worked until you
    // navigated, then the app silently reverted to English and the stored
    // preference was destroyed. For a product whose core users are Hindi-speaking,
    // that made the whole Hindi translation unreachable.
    //
    // Detection is I18nProvider's job (it reads storage after mount, which is what
    // keeps SSR and the first client paint identical); writing is
    // useLanguagePreference's job. One reader, one writer, no third party racing
    // them.
    .use(initReactI18next)
    .init({
      resources,
      // Bundles for the other nine locales are added at runtime by ensureLocale().
      partialBundledLanguages: true,
      // Force the initial render to the default language on BOTH server and client
      // so SSR markup matches first client paint. The stored choice is applied in a
      // mount effect inside I18nProvider (no hydration mismatch).
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...NAMESPACES],
      defaultNS: 'common',
      interpolation: {
        // React already escapes values, so i18next must not double-escape.
        escapeValue: false,
      },
      react: {
        // Resources are synchronous (no Suspense needed); avoids a fallback flash.
        useSuspense: false,
      },
      returnNull: false,
    })
}

export default i18n
