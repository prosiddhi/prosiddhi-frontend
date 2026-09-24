// ISO datetime → yyyy-mm-dd for <input type="date">.
export function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
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
