/**
 * Shared person-name validation (DEF-030).
 *
 * Registration accepted a name of "1234" and created the account — every check in
 * the product only measured LENGTH, so any four digits passed.
 *
 * ⚠️ The obvious rule, /^[A-Za-z ]+$/, would be a serious regression here: this
 * product ships in ten languages, and that pattern rejects every Hindi, Tamil,
 * Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu and Bengali name. So the
 * rule is Unicode-aware and, critically, allows COMBINING MARKS (\p{M}) — Indic
 * scripts build vowels out of them, and without that "प्रिया" and "தமிழ்" are
 * rejected as invalid.
 *
 * What we actually require: at least one letter, and no digits. Everything else a
 * real name uses — spaces, apostrophes (D'Souza), hyphens (Anne-Marie), full
 * stops (M. K. Gandhi) — is allowed.
 *
 * This is a usability guard, NOT a security control. It runs in the browser and
 * is trivially bypassed; the backend must mirror it (open BE ticket) or the same
 * "1234" account can still be created by calling the API directly.
 */

/** Letters and combining marks — the characters a name is actually built from. */
const LETTER = /\p{L}/u

/** Anything a name must never contain. Digits are the case QA reported. */
const DIGIT = /\d/u

/**
 * Allowed name characters: letters, combining marks, spaces, and the three
 * punctuation marks real names use. Deliberately NOT a general "no symbols"
 * rule — enumerating what is allowed is safer than guessing what is not.
 */
const ALLOWED = /^[\p{L}\p{M}\s'.\-]+$/u

export const NAME_MIN_LENGTH = 2

/**
 * True when `value` is usable as a person's name in any script we ship.
 *
 * Rejects: "", " ", "1234", "Ram2", "----", "..." — anything with a digit, or
 * with no letter in it at all.
 */
export function isValidPersonName(value: string): boolean {
  const name = value.trim()
  if (name.length < NAME_MIN_LENGTH) return false
  if (DIGIT.test(name)) return false
  if (!LETTER.test(name)) return false
  return ALLOWED.test(name)
}
