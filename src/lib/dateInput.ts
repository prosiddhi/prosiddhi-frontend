// ISO datetime → yyyy-mm-dd for <input type="date">.
export function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Today as YYYY-MM-DD by the local calendar. Use it as a picker's `max`. */
export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * True when `iso` (a YYYY-MM-DD string) is today or earlier. No age rule: for dates
 * that only need to be in the past, such as a company's founded date. ISO dates
 * sort correctly as text, so no `Date` parsing (and no timezone shift). Callers
 * must pass a well-formed ISO date.
 */
export function isNotInFuture(iso: string): boolean {
  return iso <= todayISO()
}

/**
 * Mirrors the BE `dateOfBirthSchema` refinement (auth.validator.ts): the date
 * must be in the past AND indicate age >= 18. Same calendar arithmetic — the
 * year difference, stepped back one if the birthday has not occurred yet — so
 * the two cannot disagree on a boundary date.
 *
 * `iso` is the YYYY-MM-DD an <input type="date"> produces.
 */
export function isAtLeast18(iso: string): boolean {
  const dob = new Date(iso)
  if (isNaN(dob.getTime())) return false
  const now = new Date()
  if (dob >= now) return false
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age >= 18
}
