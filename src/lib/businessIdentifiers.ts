// Format checks for an employer's GST number and registration number, shared by
// the registration form and the profile editor so the two cannot drift apart.
//
// Mirrors prosiddhi-backend/src/validators/identifiers.ts, which is the source of
// truth (one definition there feeds register, profile update and admin-add-user).
// If that file changes, change this one with it. The backend still enforces both
// rules; this only lets the form say so before the round-trip.
//
// The checkout modal has its own GSTIN pattern (backend utils/gst.ts) that is a
// little stricter at position 13. That mismatch is a backend item and is
// deliberately NOT mirrored here.

import type { BusinessIdentifierField } from '@/lib/api'

// 15 characters: state code, PAN (5 letters, 4 digits, 1 letter), entity number,
// a literal Z, a checksum. Structure only — the state list and checksum are not
// checked, as on the backend.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/

/**
 * `maxLength` for the GST input. A GSTIN is 15 characters, but the browser counts
 * a pasted leading or trailing space toward the limit and cuts the last digit off
 * before `normaliseIdentifier` can trim it, so " 29ABCDE1234F1Z5" would fail.
 * A little room lets the check do the trimming; anything longer still fails it.
 */
export const GST_INPUT_MAX_LENGTH = 20

const REGISTRATION_MIN = 5
const REGISTRATION_MAX = 50

/**
 * Trim and upper-case, exactly as the backend does before it validates or stores
 * either number. `29abcde…` and `29ABCDE…` are the same GSTIN, and a stray space
 * from a paste defeats both the pattern and the uniqueness check.
 */
export const normaliseIdentifier = (value: string): string => value.trim().toUpperCase()

export function isValidGstNumber(value: string): boolean {
  return GSTIN_PATTERN.test(normaliseIdentifier(value))
}

/**
 * A CIN, LLPIN, partnership number or a state body's own format, so there is no
 * pattern — only a length bound, as on the backend.
 */
export function isValidRegistrationNumber(value: string): boolean {
  const length = normaliseIdentifier(value).length
  return length >= REGISTRATION_MIN && length <= REGISTRATION_MAX
}

/** Translation key for "this number already belongs to another employer" (409). */
export const DUPLICATE_IDENTIFIER_MESSAGE: Record<BusinessIdentifierField, string> = {
  gstNumber: 'businessIdentifier.gstDuplicate',
  registrationNumber: 'businessIdentifier.registrationDuplicate',
}
