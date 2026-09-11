import { z } from 'zod'

/**
 * The password-STRENGTH rule — for setting a password (register, reset,
 * change), never for proving one at login. Mirrored from the backend's
 * src/validators/password.ts (`passwordSchema`) so a frontend check and the
 * real check the backend applies never quietly drift apart, the way this
 * frontend's four hand-copied regexes had (8+/upper/lower/digit, no special
 * character, no upper bound — weaker than the backend has required since
 * passwordSchema was consolidated there on 2026-09-10).
 *
 * This file stays free of React and i18n, the same constraint identifier.ts
 * and authSchemas.ts carry, so it can be ported to the mobile app's own
 * validation without dragging a translation runtime with it.
 */

export const PASSWORD_MIN_LENGTH = 8

/**
 * Matches the backend's PASSWORD_MAX_LENGTH — see that file for why 128 (an
 * upper bound for hashing hygiene, not a "real" limit anyone should hit).
 */
export const PASSWORD_MAX_LENGTH = 128

/**
 * Anything that is not a letter and not a digit — NOT a fixed list like
 * `@$!%*?&`. A fixed list rejects `£`, `€`, `—` and every non-Latin symbol,
 * which reads to the person typing as "my password is wrong" when it is in
 * fact fine. Identical to the backend's SPECIAL_CHARACTER.
 */
const SPECIAL_CHARACTER = /[^A-Za-z0-9]/

/**
 * `auth:password.errorRule` carries the full requirements list (not a single
 * generic message) — every regex stage shares it because nothing here reads
 * the messages individually; only `isStrongPassword`'s boolean result is used
 * today. A future RHF-based password form can still read
 * `passwordStrengthSchema.safeParse(...).error` per-field if it wants
 * granular messages later.
 */
const MESSAGE_KEY = 'auth:password.errorRule'

export const passwordStrengthSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: MESSAGE_KEY })
  .max(PASSWORD_MAX_LENGTH, { message: MESSAGE_KEY })
  .regex(/[a-z]/, { message: MESSAGE_KEY })
  .regex(/[A-Z]/, { message: MESSAGE_KEY })
  .regex(/[0-9]/, { message: MESSAGE_KEY })
  .regex(SPECIAL_CHARACTER, { message: MESSAGE_KEY })

/**
 * A fast client-side gate before the round trip. The backend remains the
 * authority and always re-checks — this only saves a request for the common
 * case of an obviously weak password.
 */
export function isStrongPassword(password: string): boolean {
  return passwordStrengthSchema.safeParse(password).success
}

export type PasswordRuleKey = 'length' | 'lowercase' | 'uppercase' | 'number' | 'special'

/**
 * One entry per rule, for a live per-rule checklist — the same five checks
 * `passwordStrengthSchema` runs, just exposed individually instead of
 * collapsed into one pass/fail. Reusing these (rather than a second set of
 * regexes in the component) is what keeps the checklist unable to drift from
 * the schema that actually gates submission.
 */
export const passwordRuleChecks: { key: PasswordRuleKey; test: (password: string) => boolean }[] = [
  { key: 'length', test: (password) => password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH },
  { key: 'lowercase', test: (password) => /[a-z]/.test(password) },
  { key: 'uppercase', test: (password) => /[A-Z]/.test(password) },
  { key: 'number', test: (password) => /[0-9]/.test(password) },
  { key: 'special', test: (password) => SPECIAL_CHARACTER.test(password) },
]
