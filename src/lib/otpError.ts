import type { TFunction } from 'i18next'
import { readAttemptsLeft, readOtpSendTiming } from '@/lib/otpSend'

// The backend sends a stable `code` on its OTP errors (utils/error-codes.ts), plus
// `attemptsLeft` on a wrong code. This product ships in ten languages, so each
// code a user can act on becomes a locale string; anything else is passed through
// as the backend wrote it, so a useful message ("This phone number is already
// registered") is never hidden behind a generic one.
//
// The code is read first. The English-message matching below it stays for a
// backend that predates the codes and for errors that carry none (a plain
// `Error`, or an `ApiError` whose code is not one of these).
//
// This module stays free of React and of lib/api.ts (the verify script loads it
// on its own), so the code and `attemptsLeft` are read off the error structurally,
// exactly as ApiError exposes them. (ApiError also carries `retryAfterSeconds`;
// nothing here reads it yet.)
//
// `expiresIn` is the code's lifetime in minutes from the send response, for the
// "expired" sentence. Pass it only where that response (or a value kept from it) is
// in hand; without it, or with anything that is not a positive number, the sentence
// says 10 minutes (readOtpSendTiming's default).

interface ErrorFacts {
  code?: string
  attemptsLeft?: number
}

function factsOf(err: Error): ErrorFacts {
  const { code, attemptsLeft } = err as { code?: unknown; attemptsLeft?: unknown }
  return {
    code: typeof code === 'string' ? code : undefined,
    attemptsLeft: readAttemptsLeft(attemptsLeft),
  }
}

// The backend's cooldown message carries the only copy of the remaining seconds.
const WAIT_MESSAGE = /Please wait (\d+)s before requesting another OTP/i

/**
 * Seconds left on the server's resend cooldown, or `null` when `err` is not a
 * cooldown refusal. Every resend countdown calls this on a failed send, so they
 * all react to the same errors and nothing else starts one.
 *
 * A cooldown refusal is the code OTP_COOLDOWN, or, from a backend with no codes,
 * the "Please wait Ns" message. The seconds come from that message either way. A
 * refusal whose seconds cannot be read, or are zero, gives `null`: there is nothing
 * to count down from.
 */
export function otpCooldownSeconds(err: unknown): number | null {
  if (!(err instanceof Error)) return null
  const { code } = factsOf(err)
  if (code !== undefined && code !== 'OTP_COOLDOWN') return null
  const seconds = Number(WAIT_MESSAGE.exec(err.message)?.[1])
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null
}

// The codes the backend answers a CHECKED code with when the code itself is the
// problem (utils/error-codes.ts): wrong, expired, out of tries, none pending, or
// already used. OTP_COOLDOWN is a send refusal and is deliberately not here.
const OTP_REJECTION_CODES = new Set([
  'OTP_INVALID',
  'OTP_EXPIRED',
  'OTP_TOO_MANY_ATTEMPTS',
  'OTP_NOT_FOUND',
  'OTP_ALREADY_VERIFIED',
])

// The same five from a backend that predates the codes (the wording of its OtpError).
const OTP_REJECTION_MESSAGE =
  /OTP has expired|Maximum OTP verification attempts|No OTP request found|Invalid OTP\. You have|This (?:OTP has already been|phone number is already) verified/i

/**
 * True when a failed code CHECK means the code the user typed is dead or wrong, so
 * the boxes should be emptied for a fresh one. False for everything else (network
 * failure, 429, server error, duplicate contact, a password or account error): those
 * say nothing about the digits, which are worth keeping.
 *
 * A known code decides; an error with no code falls back to the legacy wording; an
 * error with any other code is not a rejection.
 */
export function isOtpRejection(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const { code } = factsOf(err)
  if (code !== undefined) return OTP_REJECTION_CODES.has(code)
  return OTP_REJECTION_MESSAGE.test(err.message)
}

// `count` picks the singular or plural sentence; `expiresIn` fills the number.
function expiredMessage(t: TFunction, expiresIn?: number): string {
  const minutes = readOtpSendTiming({ expiresIn }).expiresIn
  return t('auth:otpErrors.expired', { count: minutes, expiresIn: minutes })
}

export function otpErrorMessage(
  err: unknown,
  t: TFunction,
  fallbackKey: string,
  expiresIn?: number,
): string {
  if (!(err instanceof Error)) return t(fallbackKey)
  const { message } = err
  const { code, attemptsLeft } = factsOf(err)

  switch (code) {
    case 'OTP_INVALID':
      if (attemptsLeft !== undefined) return t('auth:otpErrors.invalid', { attempts: attemptsLeft })
      break
    case 'OTP_EXPIRED':
      return expiredMessage(t, expiresIn)
    case 'OTP_TOO_MANY_ATTEMPTS':
      return t('auth:otpErrors.tooManyAttempts')
    case 'OTP_NOT_FOUND':
      return t('auth:otpErrors.notRequested')
    case 'OTP_ALREADY_VERIFIED':
      return t('auth:otpErrors.alreadyVerified')
    case 'PHONE_ALREADY_REGISTERED':
      return t('auth:otpErrors.phoneTaken')
    case 'EMAIL_ALREADY_REGISTERED':
      return t('auth:otpErrors.emailTaken')
    case 'RATE_LIMITED':
      return t('auth:otpErrors.rateLimited')
  }

  // No code, an unknown code, or a known code missing the detail it needs (OTP_COOLDOWN
  // lands here too: its seconds are only in the message): the message, as before.
  if (/OTP has expired/i.test(message)) return expiredMessage(t, expiresIn)
  if (/Maximum OTP verification attempts/i.test(message)) return t('auth:otpErrors.tooManyAttempts')
  if (/No OTP request found/i.test(message)) return t('auth:otpErrors.notRequested')

  const attempts = /Invalid OTP\. You have (\d+) attempt/i.exec(message)
  if (attempts) return t('auth:otpErrors.invalid', { attempts: Number(attempts[1]) })

  const seconds = otpCooldownSeconds(err)
  if (seconds !== null) return t('auth:otpErrors.wait', { seconds })

  return message || t(fallbackKey)
}
