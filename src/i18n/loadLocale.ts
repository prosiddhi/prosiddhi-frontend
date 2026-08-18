'use client'

/**
 * On-demand locale loading.
 *
 * Only English is bundled eagerly (it is the fallback and the first-paint language).
 * The other nine are fetched the moment they are actually needed — when the stored
 * preference is applied on mount, or when the user picks a language.
 *
 * **Why this exists.** `i18n/config.ts` originally imported every locale statically.
 * At two languages that cost ~216 KB and was clearly the right trade for synchronous
 * `t()`. At ten it became **~1.26 MB of JSON in a single eager chunk** — so a Hindi
 * speaker on a ₹6,000 Android phone downloaded Tamil, Odia, Malayalam and six other
 * languages they will never read, before the job feed could render. For a product whose
 * stated design constraint is a low-literacy worker on a basic handset (PRODUCT.md §2),
 * that is a regression, not a detail.
 *
 * **Why the async is nearly free.** The app already paints in the default language and
 * switches inside a mount effect (see I18nProvider), so a non-English user was always
 * going to see one English frame. Awaiting a ~150 KB chunk before that switch extends an
 * existing behaviour rather than introducing a new one.
 *
 * The import map is written out literally on purpose — bundlers cannot code-split
 * `import(\`@/locales/${lng}\`)` with a variable path.
 */
import i18n from 'i18next'

import { NAMESPACES, type SupportedLanguage } from './languages'

type LocaleResources = Record<string, Record<string, unknown>>

const LOADERS: Record<
  Exclude<SupportedLanguage, 'en'>,
  () => Promise<{ default: LocaleResources }>
> = {
  hi: () => import('@/locales/hi'),
  ta: () => import('@/locales/ta'),
  kn: () => import('@/locales/kn'),
  ml: () => import('@/locales/ml'),
  mr: () => import('@/locales/mr'),
  gu: () => import('@/locales/gu'),
  or: () => import('@/locales/or'),
  te: () => import('@/locales/te'),
  bn: () => import('@/locales/bn'),
}

/** In-flight and completed loads, so a language is never fetched twice. */
const inFlight = new Map<string, Promise<void>>()

/**
 * Ensures every namespace for `lng` is registered on the i18next instance.
 * Resolves immediately for English (bundled) and for an already-loaded language.
 * Never rejects: a failed chunk leaves the user on the fallback language rather than
 * breaking the page.
 */
export function ensureLocale(lng: string): Promise<void> {
  if (lng === 'en') return Promise.resolve()
  if (!(lng in LOADERS)) return Promise.resolve()
  if (i18n.hasResourceBundle(lng, NAMESPACES[0])) return Promise.resolve()

  const existing = inFlight.get(lng)
  if (existing) return existing

  const load = LOADERS[lng as Exclude<SupportedLanguage, 'en'>]()
    .then(({ default: resources }) => {
      for (const ns of NAMESPACES) {
        // `deep`/`overwrite` false: never clobber a bundle already present.
        i18n.addResourceBundle(lng, ns, resources[ns], false, false)
      }
    })
    .catch(() => {
      // Chunk failed (offline, cache miss). Drop the memo so a later attempt retries.
      inFlight.delete(lng)
    })

  inFlight.set(lng, load)
  return load
}
