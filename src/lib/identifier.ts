import { checkEmail } from '@/lib/email'

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
 * The 10 digits of an Indian mobile number, or `null` when `raw` is not one.
 *
 * India only, strict: `^[6-9]\d{9}$`, optionally behind a `+91`, `91` or `0`
 * prefix. ASCII digits only, and nothing is trimmed or stripped — a space,
 * hyphen, letter, other-script digit or any other punctuation fails, as do
 * `00` prefixes and other countries. `\d` in JavaScript is [0-9].
 *
 * Returns null rather than guessing: a login built from a mistyped number is
 * indistinguishable from a wrong password.
 */
const INDIAN_MOBILE = /^(?:\+91|91|0)?([6-9]\d{9})$/

export function toMobileDigits(raw: string): string | null {
  return INDIAN_MOBILE.exec(raw)?.[1] ?? null
}

/** `raw` as E.164 (`+91XXXXXXXXXX`), or `null` — the API payload format. */
export function toE164(raw: string): string | null {
  const digits = toMobileDigits(raw)
  return digits ? `+91${digits}` : null
}

/**
 * What a capped 10-digit phone input should show after the user types or pastes
 * `raw`, or `null` when the change must be refused (the caller keeps the
 * previous value and shows the invalid-number message):
 *   - a whole supported number → its 10 digits;
 *   - up to 10 digits typed so far → kept as they are;
 *   - anything else → null.
 *
 * onChange only sees the text AFTER the browser merged a paste into the field,
 * so "+919876543210" pasted behind "98765" arrives as "98765+919876543210".
 * Inputs therefore also pass the clipboard text alone through `toMobileDigits`
 * in onPaste, and replace the field when it is a whole number.
 * Do not give the input a `maxLength`: the browser would cut a paste to length
 * before either handler sees it.
 */
export function toMobileInputDigits(raw: string): string | null {
  return toMobileDigits(raw) ?? (/^\d{0,10}$/.test(raw) ? raw : null)
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
  if (!raw.includes('@')) return toE164(raw)
  // Shape-check the email too. The field used to be `type="email"`, so the
  // browser refused "boss@acme" before it could be submitted; making it accept
  // phone numbers as well took that check away, and a half-typed address came
  // back as "Invalid credentials" — blaming the password for a missing ".com".
  // The rule is the shared one in email.ts, which matches the backend's.
  const result = checkEmail(raw)
  return result.ok ? result.value : null
}
