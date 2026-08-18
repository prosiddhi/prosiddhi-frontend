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
 * Allowed name characters: letters, combining marks, spaces, and the punctuation
 * real names use. Deliberately NOT a general "no symbols" rule — enumerating what
 * is allowed is safer than guessing what is not.
 *
 * Two classes here are easy to miss and both caused real rejections:
 *
 * 1. **U+2019, the typographic apostrophe.** Phone keyboards on iOS and Android
 *    substitute it for the ASCII ' automatically, so "O’Brien" typed on a phone
 *    carries U+2019 and looks identical to "O'Brien" on screen. Allowing only
 *    U+0027 rejected it with no visible reason — on a mobile-first product whose
 *    users are almost all on phones.
 *
 * 2. **U+200C ZWNJ and U+200D ZWJ.** These are invisible characters that control
 *    how Indic conjuncts render. They are Unicode category Cf, so neither \p{L}
 *    nor \p{M} covers them, and a correctly-typed Hindi name like "क्‍ष" or a
 *    Malayalam name using ZWNJ was rejected by characters the user cannot see.
 *
 * 3. **Every dash, not just the ASCII one.** `\p{Pd}` is used in place of a
 *    literal "-", for exactly the reason U+2019 is allowed above. A name pasted
 *    from Word, a PDF or a messaging app carries U+2010 HYPHEN, U+2011
 *    NON-BREAKING HYPHEN or U+2013 EN DASH — each indistinguishable from "-" on
 *    screen. Allowing only U+002D rejected "Anne‑Marie" with the *digits*
 *    message, about a name containing no digit. `\p{Pd}` includes U+002D, so
 *    nothing that was accepted before stops being accepted.
 *
 * Devanagari and other non-ASCII digits (०१२) are still rejected: they are
 * \p{Nd}, not \p{L} or \p{M}, so this allowlist excludes them even though the
 * DIGIT check above only matches ASCII 0-9. U+2212 MINUS SIGN stays rejected
 * too — it is \p{Sm}, a maths operator, not name punctuation.
 */
// ZWNJ and ZWJ are written as escapes on purpose: as literal characters they are
// invisible in the source, and a later edit would silently delete them.
const ALLOWED = /^[\p{L}\p{M}\s'’,.\u200C\u200D\p{Pd}]+$/u

export const NAME_MIN_LENGTH = 2

/**
 * True when `value` is usable as a person's name in any script we ship.
 *
 * Rejects: "", " ", "1234", "Ram2", "----", "..." — anything with a digit, or
 * with no letter in it at all.
 */
export function isValidPersonName(value: string): boolean {
  return nameProblem(value) === null
}

/**
 * WHY a name was rejected — so the screen can say something true.
 *
 *  - `tooShort`  — empty, or a single character that is otherwise a fine name
 *                  ("A"). Nothing to do with digits.
 *  - `notAName`  — has digits, or no letter at all ("----"), or a character we
 *                  do not accept. Length is irrelevant here: "5" is a digits
 *                  problem, not a short one.
 *
 * One message for both cases is a dead end in either direction: telling a blank
 * field that its problem is digits is exactly as unhelpful as telling "1234"
 * that it is too short.
 */
export type NameProblem = 'tooShort' | 'notAName' | null

export function nameProblem(value: string): NameProblem {
  const name = value.trim()
  // An EMPTY field is a length problem and nothing else — there is no content in
  // it to be wrong about.
  if (name.length === 0) return 'tooShort'
  // The content rules run BEFORE the minimum length, or a one-character entry is
  // always blamed on length. Typing "7" would be answered with "at least 2
  // characters", so the user types "77" and is only then told digits are not
  // allowed — two rounds for one mistake, which is the exact confusion this
  // function exists to remove.
  if (DIGIT.test(name)) return 'notAName'
  if (!LETTER.test(name)) return 'notAName'
  if (!ALLOWED.test(name)) return 'notAName'
  return name.length < NAME_MIN_LENGTH ? 'tooShort' : null
}
