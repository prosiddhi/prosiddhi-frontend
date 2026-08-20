/**
 * Turning what somebody typed into something the API can look up.
 *
 * One home for this because it existed three times — twice in the registration
 * flows, validating, and once in the login page, not — and TD-37 promoted the
 * NON-validating copy to the single front door of the product. Three copies of a
 * rule this close to the audience is three chances to get it differently wrong.
 *
 * ⚠️ Keep this module free of React and i18n: the Flutter app needs the same
 * rules (TD-37 covers both surfaces) and a spec it can be ported against.
 */

/**
 * Western digits from any script's digits.
 *
 * `/\D/` in JavaScript means `[^0-9]`, so it does not merely ignore Devanagari
 * ९८७६५ or Tamil ௯௮௭ — it DELETES them. A Hindi or Tamil keyboard user typing
 * their own phone number produced `+91` and an "invalid credentials" error with
 * nothing on screen to explain it. We ship ten languages; several of them have
 * their own digits, and this is the field every one of those users starts at.
 *
 * `Number.isInteger(+ch)` is not enough — it accepts '٣' inconsistently across
 * engines. Unicode's decimal-digit property is the reliable test, and `.value`
 * gives the western digit for any of them.
 */
function toWesternDigits(value: string): string {
  let out = ''
  for (const ch of value) {
    const digit = digitValue(ch)
    out += digit === null ? ch : String(digit)
  }
  return out
}

/**
 * The 0-9 value of a decimal digit written in ANY script, or null if not a digit.
 *
 * Unicode lays each script's digits out as a contiguous run of ten starting at
 * that script's zero, so the distance back to the first non-digit IS the value.
 * `Number('٣')` is NaN and NFKD does not fold these to ASCII, so this walk is
 * the reliable way.
 */
function digitValue(ch: string): number | null {
  if (!/\p{Nd}/u.test(ch)) return null
  const cp = ch.codePointAt(0)!
  for (let offset = 0; offset <= 9; offset++) {
    if (!/\p{Nd}/u.test(String.fromCodePoint(cp - offset - 1))) return offset
  }
  return null
}

/**
 * A typed phone number → E.164, or `null` when it is not a plausible number.
 *
 * Returns null rather than guessing: a login attempt built from a mistyped
 * number is indistinguishable from a wrong password, so the user is told their
 * credentials are invalid when the real problem is a missing digit.
 *
 * Handles the three ways people here actually write a number:
 *   9876543210          → +919876543210
 *   0 98765 43210       → +919876543210   (the trunk prefix)
 *   91 98765 43210      → +919876543210   (country code, no plus)
 */
export function toE164(raw: string): string | null {
  const trimmed = toWesternDigits(raw.trim())
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null
  }
  let digits = trimmed.replace(/\D/g, '')
  // "00" is the other way of writing "+" — 0091 98765 43210.
  if (digits.startsWith('00')) digits = digits.slice(2)
  // Trunk prefix: "0 98765 43210" is how a number is written on a poster.
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  if (digits.length === 10) return `+91${digits}`
  // An international number, but ONLY if it looks like one. The old fallback was
  // `digits.length > 10 && <= 15 → +${digits}`, which happily produced
  // `+00919876543210` and turned an 11-digit typo into `+98765432100`. Both come
  // back as "Invalid credentials", which is the exact failure returning null is
  // supposed to prevent — it blames the password for a mistyped number.
  // A country code never starts with 0, and E.164 allows 15 digits total.
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0')) return `+${digits}`
  return null
}

/**
 * One login field, either identifier (TD-37).
 *
 * The backend already auto-detects — `authService.login` calls
 * `detectIdentifierType` and looks the user up by email or phone accordingly. So
 * the only reason the login screen had separate Email and Phone forms was that
 * the FRONTEND was deciding something the server decides better.
 *
 * That mattered more than it looks: seekers may register phone-only, so the
 * phone IS their identity, while employers register with an email and many have
 * no phone at all. A phone-only primary form is not "one login" — it is one
 * login for seekers and a hunt for a link for everybody else.
 *
 * An `@` is the discriminator, because a phone number cannot contain one and an
 * email must. Returns `null` for a phone-shaped input that is not a plausible
 * number, so the caller can say so instead of sending it.
 */
export function toIdentifier(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  return toE164(trimmed)
}
