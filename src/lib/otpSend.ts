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

const MAX_RETRY_AFTER_SECONDS = 24 * 60 * 60

const HTTP_DATE = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/

/**
 * The seconds a `Retry-After` header asks for, or `undefined` when it is absent
 * or unusable.
 *
 * Two forms are legal: whole delay-seconds ("120") and an HTTP-date
 * ("Wed, 21 Oct 2026 07:28:00 GMT"). Anything else, a negative or non-integer
 * number, a date that is not in the future, and a delay over a day all give
 * `undefined`, so a garbled header can never lock a screen.
 *
 * `now` is a parameter so the date form can be checked without a clock.
 *
 * ⚠️ A browser only hands this header to script when the API's CORS reply lists it
 * in `Access-Control-Expose-Headers` (it is not CORS-safelisted). The backend's
 * current CORS config sets no such list, so on a cross-origin deploy the value is
 * usually `null` here. Nothing depends on it being present.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  let seconds: number
  if (/^\d+$/.test(text)) {
    seconds = Number(text)
  } else if (HTTP_DATE.test(text)) {
    const at = Date.parse(text)
    if (!Number.isFinite(at)) return undefined
    seconds = Math.ceil((at - now) / 1000)
  } else {
    return undefined
  }
  return Number.isSafeInteger(seconds) && seconds > 0 && seconds <= MAX_RETRY_AFTER_SECONDS ? seconds : undefined
}

/**
 * `attemptsLeft` from an OTP_INVALID reply: a whole number of zero or more, or
 * `undefined`. One rule for ApiError (when it reads the body) and for
 * otpErrorMessage (which reads it back off any Error), so they cannot drift.
 */
export function readAttemptsLeft(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}
