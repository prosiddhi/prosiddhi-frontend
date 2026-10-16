/**
 * What every OTP send answers with, and a safe way to read it.
 *
 * The backend publishes two numbers on all seven send endpoints (/otp/send,
 * /otp/resend, /email-otp/send, /email-otp/resend, /auth/forgot-password,
 * /auth/resend-verification, /auth/login-phone-send): `expiresIn`, in MINUTES, and
 * `resendCooldownSeconds`, in SECONDS. Two different units, so they are never
 * interchangeable.
 *
 * Production may still run an older backend that sends `expiresIn` as the string
 * "10 minutes" and no `resendCooldownSeconds` at all, so both fields are optional
 * and `expiresIn` is typed to tolerate the string. Read them through
 * `readOtpSendTiming`, never directly.
 *
 * The three forgot-password / resend-verification / login-phone-send endpoints
 * answer the same way when they silently sent nothing (an unknown account, say),
 * so these numbers say how long to wait, not that a code went out.
 *
 * ⚠️ Keep this module free of React and i18n, like identifier.ts: the Flutter app
 * needs the same rule.
 */

export interface OtpSendMeta {
  /** Minutes the code stays valid. A string ("10 minutes") from an older backend. */
  expiresIn?: number | string
  /** Seconds until a resend is allowed. Absent from an older backend. */
  resendCooldownSeconds?: number
}

/** The server's default RESEND_COOLDOWN_SECONDS. UX only; the backend still enforces its own. */
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 30

/** The server's default OTP_EXPIRY_MINUTES. */
export const DEFAULT_OTP_EXPIRES_IN_MINUTES = 10

export interface OtpSendTiming {
  /** Seconds until a resend is allowed. */
  cooldownSeconds: number
  /** Minutes the code stays valid. */
  expiresIn: number
}

/** `value` if it is a finite number above zero, otherwise `fallback`. */
function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * The two timing numbers of a send response, with the defaults (30 s, 10 min)
 * wherever one is missing or unusable.
 *
 * Takes `unknown` on purpose: the argument is a network response. Only a finite
 * number above zero is accepted for either field. A string is never parsed, so the
 * old backend's "10 minutes" gives the default rather than a guess at English.
 * `NaN`, `Infinity`, zero, negatives, and every non-number type also give the default.
 */
export function readOtpSendTiming(response: unknown): OtpSendTiming {
  const meta = (typeof response === 'object' && response !== null ? response : {}) as {
    expiresIn?: unknown
    resendCooldownSeconds?: unknown
  }
  return {
    cooldownSeconds: positiveNumber(meta.resendCooldownSeconds, DEFAULT_RESEND_COOLDOWN_SECONDS),
    expiresIn: positiveNumber(meta.expiresIn, DEFAULT_OTP_EXPIRES_IN_MINUTES),
  }
}
