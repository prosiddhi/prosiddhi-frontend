import type { TFunction } from 'i18next'

// The backend's OTP errors (otp.service.ts, email-otp.service.ts) are plain
// English strings with no `code`, and this product ships in ten languages. Turn
// the five a user can act on into locale strings; anything else is passed
// through as the backend wrote it, so a useful message ("This phone number is
// already registered") is never hidden behind a generic one.
//
// Matching on the message is a stopgap — if the backend adds a `code` to these,
// switch to it.
export function otpErrorMessage(err: unknown, t: TFunction, fallbackKey: string): string {
  if (!(err instanceof Error)) return t(fallbackKey)
  const { message } = err

  if (/OTP has expired/i.test(message)) return t('auth:otpErrors.expired')
  if (/Maximum OTP verification attempts/i.test(message)) return t('auth:otpErrors.tooManyAttempts')
  if (/No OTP request found/i.test(message)) return t('auth:otpErrors.notRequested')

  const attempts = /Invalid OTP\. You have (\d+) attempt/i.exec(message)
  if (attempts) return t('auth:otpErrors.invalid', { attempts: Number(attempts[1]) })

  const wait = /Please wait (\d+)s before requesting another OTP/i.exec(message)
  if (wait) return t('auth:otpErrors.wait', { seconds: Number(wait[1]) })

  return message || t(fallbackKey)
}
