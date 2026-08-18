/**
 * The shipped locales, as plain data.
 *
 * This module is deliberately **side-effect free** — no imports, no i18next. `i18n/config.ts`
 * calls `i18n.init()` at module scope, so anything that imports it boots react-i18next as a
 * side effect. That is wrong for the API client (which has no business starting i18n) and
 * actively dangerous for `app/global-error.tsx`, which runs after the app has already crashed.
 *
 * Both of those import from here instead. `config.ts` re-exports these so existing call sites
 * keep working.
 *
 * The canonical list *with native-script display names* is `lib/jobCategories.ts` — that is what
 * the language pickers render. Keep the two in step: this file decides what the UI is translated
 * into, that one decides how each language is labelled.
 */

/** All 10 shipped locales (locked 2026-08-17). Odia is in; Punjabi is not. */
export const SUPPORTED_LANGUAGES = [
  'en',
  'hi',
  'ta',
  'kn',
  'ml',
  'mr',
  'gu',
  'or',
  'te',
  'bn',
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGE_STORAGE_KEY = 'preferredLanguage'

/** Namespaces are split per screen-group so translation files stay small and reviewable. */
export const NAMESPACES = [
  'common',
  'auth',
  'employerRegister',
  'seeker',
  'employer',
  'chat',
  'profile',
  'taxonomy',
  'legal',
] as const

/** Narrow an arbitrary (possibly region-tagged or stale) tag to a shipped locale. */
export function toSupportedLanguage(tag: string | undefined | null): SupportedLanguage {
  const base = (tag || DEFAULT_LANGUAGE).split('-')[0]
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as SupportedLanguage)
    : DEFAULT_LANGUAGE
}
