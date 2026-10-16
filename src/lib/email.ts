import { z } from 'zod'

/**
 * One email check for the whole portal.
 *
 * Acceptance is Zod's `.email()`, the same rule the backend applies on its
 * routes (backend zod 4.1.12; the portal's zod 3.25.76 gave identical answers
 * on 36 audited cases, including `..`, a leading hyphen in the domain, non-ASCII
 * and one-letter TLDs). There is deliberately no regex of our own to drift.
 *
 * The 254-character cap is the portal's. Zod has no length limit, and the
 * backend's differ per route: 254 on email-OTP and change-email, 200 on team
 * invites, none on register or `companyEmail`.
 *
 * Per-route rules and casing are tabulated in docs/qa/validation-differences.md.
 * Note the backend runs zod on the untrimmed string; this check trims first.
 *
 * Valid addresses come back trimmed and lowercased, which is what the backend
 * does to account emails. A caller that must keep the typed casing (the
 * company email) should send its own `.trim()` instead of `value`.
 *
 * ⚠️ Keep this module free of React and i18n, like identifier.ts: the Flutter
 * app needs the same rule.
 */

export const EMAIL_MAX_LENGTH = 254

export type EmailCheck =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'tooLong' | 'invalid' }

const zodEmail = z.string().email()

export function checkEmail(raw: string, maxLength: number = EMAIL_MAX_LENGTH): EmailCheck {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  if (trimmed.length > maxLength) return { ok: false, reason: 'tooLong' }
  if (!zodEmail.safeParse(trimmed).success) return { ok: false, reason: 'invalid' }
  return { ok: true, value: trimmed.toLowerCase() }
}
