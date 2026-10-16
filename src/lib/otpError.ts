import type { TFunction } from 'i18next'
import { readOtpSendTiming } from '@/lib/otpSend'

// The backend's OTP errors (otp.service.ts, email-otp.service.ts) are plain
// English strings with no `code`, and this product ships in ten languages. Turn
// the five a user can act on into locale strings; anything else is passed
// through as the backend wrote it, so a useful message ("This phone number is
// already registered") is never hidden behind a generic one.
//
// Matching on the message is a stopgap — if the backend adds a `code` to these,
// switch to it.
//
// `expiresIn` is the code's lifetime in minutes from the send response, for the
// "expired" sentence. Pass it only where that response (or a value kept from it) is
// in hand; without it, or with anything that is not a positive number, the sentence
// says 10 minutes (readOtpSendTiming's default).
export function otpErrorMessage(
  err: unknown,
  t: TFunction,
  fallbackKey: string,
  expiresIn?: number,
): string {
  if (!(err instanceof Error)) return t(fallbackKey)
  const { message } = err

  if (/OTP has expired/i.test(message)) {
    // `count` picks the singular or plural sentence; `expiresIn` fills the number.
    const minutes = readOtpSendTiming({ expiresIn }).expiresIn
    return t('auth:otpErrors.expired', { count: minutes, expiresIn: minutes })
  }
  if (/Maximum OTP verification attempts/i.test(message)) return t('auth:otpErrors.tooManyAttempts')
  if (/No OTP request found/i.test(message)) return t('auth:otpErrors.notRequested')

  const attempts = /Invalid OTP\. You have (\d+) attempt/i.exec(message)
  if (attempts) return t('auth:otpErrors.invalid', { attempts: Number(attempts[1]) })

  const wait = /Please wait (\d+)s before requesting another OTP/i.exec(message)
  if (wait) return t('auth:otpErrors.wait', { seconds: Number(wait[1]) })

  return message || t(fallbackKey)
}
