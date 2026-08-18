// Strings for app/global-error.tsx, resolved WITHOUT react-i18next.
//
// global-error.tsx replaces the root layout when the layout itself crashes, so
// I18nProvider is never mounted there and useTranslation() cannot work. This
// module reads the same locale JSON at build time and picks a bundle from the
// stored preference, so the last-resort error screen still speaks the user's
// language.
//
// ⚠️ This module MUST stay side-effect free. i18n/config.ts calls i18n.init() at
// module scope; importing it here would boot react-i18next inside the error
// boundary — i.e. exactly when the app has already failed. The constants therefore
// come from i18n/languages.ts, which is plain data and imports nothing.
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from './languages'
import enCommon from '@/locales/en/common.json'
import hiCommon from '@/locales/hi/common.json'
import taCommon from '@/locales/ta/common.json'
import knCommon from '@/locales/kn/common.json'
import mlCommon from '@/locales/ml/common.json'
import mrCommon from '@/locales/mr/common.json'
import guCommon from '@/locales/gu/common.json'
import orCommon from '@/locales/or/common.json'
import teCommon from '@/locales/te/common.json'
import bnCommon from '@/locales/bn/common.json'

const FALLBACK_LANGUAGE = DEFAULT_LANGUAGE

/** Only the fields the error screen needs — keeps every locale bundle assignable. */
interface ErrorBundle {
  feedback: { errorTitle: string; errorBodyShort: string }
  buttons: { tryAgain: string }
}

// One entry per shipped locale. Add new languages here at the same time as
// i18n/config.ts, or the error screen silently falls back to English for them.
const BUNDLES: Record<string, ErrorBundle> = {
  en: enCommon,
  hi: hiCommon,
  ta: taCommon,
  kn: knCommon,
  ml: mlCommon,
  mr: mrCommon,
  gu: guCommon,
  or: orCommon,
  te: teCommon,
  bn: bnCommon,
}

export interface GlobalErrorStrings {
  lang: string
  title: string
  body: string
  retry: string
}

export const DEFAULT_GLOBAL_ERROR_STRINGS: GlobalErrorStrings = {
  lang: FALLBACK_LANGUAGE,
  title: BUNDLES[FALLBACK_LANGUAGE].feedback.errorTitle,
  body: BUNDLES[FALLBACK_LANGUAGE].feedback.errorBodyShort,
  retry: BUNDLES[FALLBACK_LANGUAGE].buttons.tryAgain,
}

/**
 * Reads the stored language preference and returns the matching strings.
 * Never throws: localStorage can be unavailable (private mode, blocked cookies),
 * and an error screen must not be the thing that errors.
 */
export function getGlobalErrorStrings(): GlobalErrorStrings {
  let lang = FALLBACK_LANGUAGE
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && stored in BUNDLES) lang = stored
  } catch {
    // Ignore and keep the fallback.
  }

  const bundle = BUNDLES[lang] ?? BUNDLES[FALLBACK_LANGUAGE]
  return {
    lang,
    title: bundle.feedback.errorTitle,
    body: bundle.feedback.errorBodyShort,
    retry: bundle.buttons.tryAgain,
  }
}
