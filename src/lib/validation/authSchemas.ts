import { z } from 'zod'
import { toE164, toIdentifier } from '@/lib/identifier'

/**
 * Login-form validation, shared by /login's password, phone-OTP, and Google
 * phone-bind forms (TD-37's one login, kept as one set of rules).
 *
 * Message values are i18n KEYS, not text — this file stays free of React and
 * i18next, the same constraint identifier.ts carries, so it can be ported to
 * the mobile app's own validation without dragging a translation runtime with
 * it. Callers translate `formState.errors.<field>?.message` at render time.
 *
 * Plausibility checks delegate to identifier.ts's toIdentifier/toE164 rather
 * than re-deriving the phone/email shape — that consolidation is the whole
 * point of TD-37, and a second copy here would reopen it.
 */

export const identifierSchema = z
  .string()
  .refine((v) => toIdentifier(v) !== null, { message: 'auth:login.errorIdentifierInvalid' })

// Sign-in only checks "did you type something" — the strength rule on
// /forgot-password is a reset-time rule, not a login-time one.
export const passwordSchema = z.string().min(1, { message: 'auth:login.errorLogin' })

export const phoneNumberSchema = z
  .string()
  .refine((v) => toE164(v) !== null, { message: 'auth:phone.errorInvalid' })

/**
 * Six independent boxes, not one string — a hole in the middle must fail the
 * same "not 6 digits yet" check as a hole at the end, matching what the join
 * in every OTP submit handler has always done. The incomplete-code message
 * differs by flow (bindPhone's copy is worded for a first-time phone add, not
 * a sign-in), so the message is a parameter rather than baked in.
 */
function otpSchema(incompleteMessageKey: string) {
  return z
    .array(z.string())
    .length(6)
    .refine((digits) => digits.join('').length === 6, { message: incompleteMessageKey })
}

export const phonePasswordSchema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
})
export type PhonePasswordValues = z.infer<typeof phonePasswordSchema>

export const sendOtpSchema = z.object({
  phone: phoneNumberSchema,
})
export type SendOtpValues = z.infer<typeof sendOtpSchema>

export const verifyOtpSchema = z.object({
  otp: otpSchema('auth:login.errorOtpIncomplete'),
})
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>

export const bindVerifyOtpSchema = z.object({
  otp: otpSchema('auth:bindPhone.otpIncomplete'),
})

export const EMPTY_OTP: string[] = ['', '', '', '', '', '']
