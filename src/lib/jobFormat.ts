// Shared formatters for job cards / details / applications / interviews.
//
// Like applicationStatus.ts, these are plain functions used by ~15 screens, so
// they read the shared i18next instance and translate at CALL time rather than
// taking `t` as a parameter. Every screen that renders them already calls
// useTranslation(), so it re-renders on `languageChanged` and re-invokes these.
//
// They used to emit hardcoded English ("Just now", "From", "Negotiable") and force
// the 'en-IN' locale, which leaked English across the entire seeker consume loop
// in Hindi.

import i18n from '@/i18n/config'

/** Map the app language to a BCP-47 locale for Intl. Both are Indian locales, so
 *  digits and the lakh/crore grouping stay right; only the language differs. */
function intlLocale(): string {
  return i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN'
}

export function humanizeJobType(t?: string): string {
  if (!t) return ''
  const KNOWN = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP']
  if (KNOWN.includes(t)) return i18n.t(`jobType.${t}`)
  // Unknown enum value from a newer BE — degrade to a readable form.
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatSalary(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => n.toLocaleString(intlLocale())
  if (min != null && max != null) {
    return i18n.t('salary.range', { min: fmt(min), max: fmt(max) })
  }
  if (min != null) return i18n.t('salary.from', { amount: fmt(min) })
  if (max != null) return i18n.t('salary.upTo', { amount: fmt(max) })
  return i18n.t('salary.negotiable')
}

export function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return i18n.t('time.justNow')
  if (mins < 60) return i18n.t('time.minutesAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return i18n.t('time.hoursAgo', { count: hrs })
  const days = Math.floor(hrs / 24)
  return i18n.t('time.daysAgo', { count: days })
}

// Human date like "Mon, 16 Jun 2026" — in the active language. Empty on invalid input.
export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(intlLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Short date like "16 Jun 2026" / "16 जून 2026" — used by the money + team
// screens (invoice date, plan expiry, seat joined-on). Four screens each had a
// private copy of this pinned to 'en-GB', which put English month names into the
// Hindi UI.
export function formatShortDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(intlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Month + year only, e.g. "Jun 2026" — work-experience ranges. */
export function formatMonthYear(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })
}

export function initials(name?: string | null): string {
  if (!name) return 'JB'
  return name.trim().slice(0, 2).toUpperCase()
}
