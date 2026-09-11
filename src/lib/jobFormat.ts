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
import { wholeCityKey, cityLabelKey } from '@/lib/cities'

/**
 * A stored location string, as the READER should see it.
 *
 * We store ONE canonical spelling — "Bangalore", whoever posted the job and in
 * whatever language — so the backend's cold-start recommendation, which
 * substring-matches on that column, has a single string to compare. But
 * `job.location` is printed straight onto every job card, and this product ships
 * ten languages for people who may not read Latin script at all. Storing
 * canonically AND displaying canonically would make a Tamil seeker read
 * "Bangalore". So: store one spelling, show the reader theirs.
 *
 * Matches the WHOLE string only. "Whitefield, Bangalore" is returned untouched —
 * translating it would silently delete the area name. This swaps a label; it
 * never rewrites an address. Anything unrecognised (a Nagpur job, or the untidy
 * legacy text TD-34 exists to clean) comes back exactly as stored.
 *
 * It lives here rather than in `lib/cities.ts` for two reasons: it is a display
 * formatter, like everything else in this file; and keeping i18n out of
 * `cities.ts` is what lets `scripts/backfill/` import the city-matching rules
 * directly, instead of copying them and drifting.
 */
/**
 * The location string to STORE for what somebody typed.
 *
 * The datalists on the profile and the job form offer English values under
 * translated labels, but a datalist only helps if it is opened. Someone who
 * simply types "ಬೆಂಗಳೂರು" would have had that stored verbatim — and the
 * backend's cold-start recommendation runs
 * `job.location CONTAINS seeker.location`, so their text matches no job at all
 * and they get an EMPTY recommendation list, not a shorter one.
 *
 * We already resolve the city on that same save in order to write a coordinate.
 * This uses the same answer for the text, so both sides of that match are
 * canonical however the field was filled in.
 *
 * Only when the whole string names a city, and only for same-place names, so
 * "Whitefield, Bangalore" keeps its area and a Noida job keeps saying Noida.
 * Everything else is stored exactly as typed — a person in Nagpur is not
 * rewritten into somewhere we happen to know.
 */
export function canonicalLocation(text: string | null | undefined): string {
  const raw = (text ?? '').trim()
  const key = wholeCityKey(raw, (k) => i18n.t(cityLabelKey(k)))
  return key ? i18n.t(cityLabelKey(key), { lng: 'en' }) : raw
}

export function localizeLocation(text: string | null | undefined): string {
  if (!text) return ''
  // wholeCityKey: the whole string, and SAME-PLACE names only. It accepts
  // spelling variants — a job stored "Bengaluru" is a Bangalore job and should
  // read ಬೆಂಗಳೂರು next to one stored "Bangalore", not sit in Latin beside it —
  // while refusing the satellite towns, because printing "Delhi" on a job in
  // Noida renames the place instead of translating it.
  const key = wholeCityKey(text)
  return key ? i18n.t(cityLabelKey(key)) : text
}

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

const PAYMENT_TYPE_KEYS: Record<string, string> = {
  HOURLY: 'employer:jobForm.paymentType.HOURLY',
  DAILY: 'employer:jobForm.paymentType.DAILY',
  WEEKLY: 'employer:jobForm.paymentType.WEEKLY',
  MONTHLY: 'employer:jobForm.paymentType.MONTHLY',
  FIXED: 'employer:jobForm.paymentType.FIXED',
}

// Reuses the employer job-form's own payment-type labels (Hourly/Daily/Weekly/
// Monthly/Fixed) instead of re-translating the same five words for the
// seeker-facing Job Details page.
export function humanizePaymentType(t?: string): string {
  if (!t) return ''
  const key = PAYMENT_TYPE_KEYS[t]
  return key ? i18n.t(key) : t
}

const COMPANY_SIZE_KEYS: Record<string, string> = {
  SIZE_1_10: 'profile:employer.size_1_10',
  SIZE_11_50: 'profile:employer.size_11_50',
  SIZE_51_200: 'profile:employer.size_51_200',
  SIZE_201_500: 'profile:employer.size_201_500',
  SIZE_501_1000: 'profile:employer.size_501_1000',
  SIZE_1000_PLUS: 'profile:employer.size_1000_plus',
}

// Reuses the employer profile page's own company-size labels ("1-10
// employees", ...) rather than re-translating them for Job Details.
export function humanizeCompanySize(size?: string | null): string {
  if (!size) return ''
  const key = COMPANY_SIZE_KEYS[size]
  return key ? i18n.t(key) : ''
}

export function formatSalary(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => n.toLocaleString(intlLocale())
  if (min != null && max != null) {
    return i18n.t('salary.range', { min: fmt(min), max: fmt(max) })
  }
  if (min != null) return i18n.t('salary.from', { amount: fmt(min) })
  if (max != null) return i18n.t('salary.upTo', { amount: fmt(max) })
  // "Not disclosed", NOT "Negotiable". There is no negotiable flag anywhere in
  // the product — salary is simply optional on the job form — so an absent
  // figure means we do not know, and saying it is negotiable invents a promise
  // on the employer's behalf. The mobile app already said "Salary not
  // disclosed"; the two now agree.
  return i18n.t('salary.notDisclosed')
}

/**
 * The whole salary line as a card renders it: an amount with its "/ Month"
 * suffix, or the bare "not disclosed" phrase.
 *
 * Six screens used to build this as `t('jobCard.perMonth', { salary })`, which
 * appends the suffix unconditionally — so an unknown salary read "₹ Negotiable
 * / Month", a per-month rate for a figure that does not exist. The suffix
 * belongs to the amount, so the rule lives here rather than in each caller.
 *
 * `paymentType`, when given, spells out the pay period (e.g. "₹15,000 -
 * 20,000 · Hourly") instead of the generic "/ Month" suffix — used by the My
 * Applications card and detail screens, where a real job can be HOURLY/
 * DAILY/WEEKLY/FIXED, not just monthly.
 */
export function formatSalaryLine(min?: number | null, max?: number | null, paymentType?: string): string {
  if (min == null && max == null) return i18n.t('salary.notDisclosed')
  const paymentTypeLabel = humanizePaymentType(paymentType)
  if (paymentTypeLabel) return `${formatSalary(min, max)} · ${paymentTypeLabel}`
  return i18n.t('seeker:jobCard.perMonth', { salary: formatSalary(min, max) })
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

// Two-letter monogram for a logoless card. Falls back to '?' — the old 'JB'
// literal meant every unnamed job rendered an identical grey "JB" tile, which
// looked like real (and identical) branding rather than "no logo".
export function initials(name?: string | null): string {
  const trimmed = name?.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}
