import type { TFunction } from 'i18next'

/**
 * The i18n key for a backend category name:
 * "Agri & Food-Based Industries" → "agriFoodBasedIndustries".
 *
 * Only letters and digits count, so "&", "-" and spaces never end up in a key.
 *
 * ⚠️ Known limitation: the key comes from the category NAME, and GET /categories
 * sends no stable id or code. An admin who renames a category in the console moves
 * its key, and that tile silently shows the English name in every language. The
 * lasting fix is a backend one: send an immutable `code` with each category and
 * key the locale files and icons off it. Until then
 * scripts/verify-categories.mjs is the only guard, and it checks the list we
 * expect, not the live one.
 */
export function categoryLabelKey(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

/**
 * A level-1 job category's name in the reader's language.
 *
 * The backend sends English only; the labels live in `seeker:landing.categories.*`
 * in all ten languages. Derived rather than mapped, so a new category is
 * localised by adding a translation key — no code change. A name with no key
 * yet falls back to the backend's English rather than showing a raw key.
 */
export function categoryLabel(t: TFunction, name: string): string {
  return t(`seeker:landing.categories.${categoryLabelKey(name)}`, { defaultValue: name })
}
