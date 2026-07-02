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
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '@/locales/en/common.json'
import enAuth from '@/locales/en/auth.json'
import enEmployerRegister from '@/locales/en/employerRegister.json'
import enSeeker from '@/locales/en/seeker.json'
import enEmployer from '@/locales/en/employer.json'
import enChat from '@/locales/en/chat.json'
import enProfile from '@/locales/en/profile.json'
import enTaxonomy from '@/locales/en/taxonomy.json'

import hiCommon from '@/locales/hi/common.json'
import hiAuth from '@/locales/hi/auth.json'
import hiEmployerRegister from '@/locales/hi/employerRegister.json'
import hiSeeker from '@/locales/hi/seeker.json'
import hiEmployer from '@/locales/hi/employer.json'
import hiChat from '@/locales/hi/chat.json'
import hiProfile from '@/locales/hi/profile.json'
import hiTaxonomy from '@/locales/hi/taxonomy.json'

// EN + HI are the only v1-complete locales (Q6: hard-gated to 100% by code freeze).
// The other 8 soft-launch in S3 and are NOT selectable yet.
export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const
export const DEFAULT_LANGUAGE = 'en'
export const LANGUAGE_STORAGE_KEY = 'preferredLanguage'
export const NAMESPACES = [
  'common',
  'auth',
  'employerRegister',
  'seeker',
  'employer',
  'chat',
  'profile',
  'taxonomy',
] as const

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    employerRegister: enEmployerRegister,
    seeker: enSeeker,
    employer: enEmployer,
    chat: enChat,
    profile: enProfile,
    taxonomy: enTaxonomy,
  },
  hi: {
    common: hiCommon,
    auth: hiAuth,
    employerRegister: hiEmployerRegister,
    seeker: hiSeeker,
    employer: hiEmployer,
    chat: hiChat,
    profile: hiProfile,
    taxonomy: hiTaxonomy,
  },
} as const

// Guard against re-init under Fast Refresh / repeated imports.
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      // Force the initial render to the default language on BOTH server and client
      // so SSR markup matches first client paint. The stored choice is applied in a
      // mount effect inside I18nProvider (no hydration mismatch).
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...NAMESPACES],
      defaultNS: 'common',
      detection: {
        order: ['localStorage'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage'],
      },
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
