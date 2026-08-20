'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { emailOtpAPI, otpAPI } from '@/lib/api'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

const OTP_LENGTH = 6

/**
 * ONE screen, TWO codes, ONE button.
 *
 * Both employer contacts are verified here before the account exists. The two
 * codes stay whole 6-digit codes on purpose: a 3+3 split was considered and
 * rejected — it would cut each code from 1,000,000 to 1,000 combinations
 * (a ~2.5% per-window guess rate against 5 attempts × 5 resends, versus
 * 0.0025% today), break SMS autofill, and make "which half was wrong?"
 * unanswerable. Do not implement it.
 *
 * Verifying one and not the other is NOT a failure state: each verification
 * leaves an independent server-side mark that does not expire, so a half-done
 * attempt keeps its good half and the user only re-enters the field that
 * actually failed.
 */
export default function EmployerVerifyPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useEmployerRegistration()
  const [phoneOtp, setPhoneOtp] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timer, setTimer] = useState(30)

  // Guard: both contacts must have been collected on the previous screen.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneNumber || !data.email) router.replace('/employer/register/contacts')
  }, [hydrated, data.phoneNumber, data.email, router])

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleVerify = async () => {
    const needPhone = !data.phoneVerified
    const needEmail = !data.emailVerified

    if (needPhone && phoneOtp.length !== OTP_LENGTH) {
      setPhoneError(t('employerRegister:verify.incomplete'))
      return
    }
    if (needEmail && emailOtp.length !== OTP_LENGTH) {
      setEmailError(t('employerRegister:verify.incomplete'))
      return
    }

    setLoading(true)
    setPhoneError('')
    setEmailError('')

    // Run both independently — one failing must not discard the other's
    // success, which is exactly what a Promise.all would do.
    const [phoneResult, emailResult] = await Promise.allSettled([
      needPhone ? otpAPI.verify(data.phoneNumber, phoneOtp) : Promise.resolve(null),
      needEmail
        ? emailOtpAPI.verify(data.email, emailOtp, 'REGISTRATION')
        : Promise.resolve(null),
    ])

    const phoneOk = phoneResult.status === 'fulfilled'
    const emailOk = emailResult.status === 'fulfilled'

    // Record every success, even on a partial pass — the marks persist on the
    // server, so re-verifying an already-good contact would only waste a code.
    update({
      phoneVerified: data.phoneVerified || phoneOk,
      emailVerified: data.emailVerified || emailOk,
    })

    if (!phoneOk) {
      const err = (phoneResult as PromiseRejectedResult).reason
      setPhoneError(err instanceof Error ? err.message : t('employerRegister:verify.phoneInvalid'))
      setPhoneOtp('')
    }
    if (!emailOk) {
      const err = (emailResult as PromiseRejectedResult).reason
      setEmailError(err instanceof Error ? err.message : t('employerRegister:verify.emailInvalid'))
      setEmailOtp('')
    }

    setLoading(false)

    if (phoneOk && emailOk) router.push('/employer/register/account')
  }

  const handleResend = async () => {
    if (timer > 0 || resending) return
    try {
      setResending(true)
      setPhoneError('')
      setEmailError('')
      // Only re-send what is still outstanding.
      const [phoneResult, emailResult] = await Promise.allSettled([
        data.phoneVerified ? Promise.resolve(null) : otpAPI.send(data.phoneNumber),
        data.emailVerified
          ? Promise.resolve(null)
          : emailOtpAPI.send(data.email, 'REGISTRATION'),
      ])
      update({
        devPhoneOtp:
          phoneResult.status === 'fulfilled' && phoneResult.value
            ? phoneResult.value.otp
            : undefined,
        devEmailOtp:
          emailResult.status === 'fulfilled' && emailResult.value
            ? emailResult.value.otp
            : undefined,
      })
      setTimer(30)
    } finally {
      setResending(false)
    }
  }

  const handleBack = () => router.push('/employer/register/contacts')
  const handleClose = () => router.push('/')

  const otpInputCls =
    'w-full h-12 sm:h-14 px-4 border-2 border-gray-300 rounded-lg text-center text-xl font-semibold tracking-[0.4em] focus:border-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-50 transition-all disabled:opacity-50'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label={t('employerRegister:closeAria')}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">
              {t('employerRegister:verify.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {t('employerRegister:verify.subtitle')}
            </p>
          </div>

          <div className="mb-8 space-y-6">
            {/* Phone code */}
            <div>
              <label htmlFor="phone-otp" className="block text-base sm:text-lg font-medium text-black mb-1">
                {t('employerRegister:verify.phoneLabel')}
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                {t('employerRegister:verify.sentTo', { target: data.phoneNumber })}
              </p>
              {data.phoneVerified ? (
                <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  {t('employerRegister:verify.alreadyVerified')}
                </p>
              ) : (
                <>
                  <input
                    id="phone-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    value={phoneOtp}
                    onChange={(e) => {
                      setPhoneOtp(e.target.value.replace(/\D/g, ''))
                      if (phoneError) setPhoneError('')
                    }}
                    placeholder="------"
                    disabled={loading}
                    aria-invalid={!!phoneError}
                    className={otpInputCls}
                  />
                  {data.devPhoneOtp && (
                    <p className="mt-2 text-sm text-amber-700">
                      {t('employerRegister:verify.devMode')}{' '}
                      <span className="font-mono font-bold">{data.devPhoneOtp}</span>
                    </p>
                  )}
                  {phoneError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">{phoneError}</p>
                  )}
                </>
              )}
            </div>

            {/* Email code */}
            <div>
              <label htmlFor="email-otp" className="block text-base sm:text-lg font-medium text-black mb-1">
                {t('employerRegister:verify.emailLabel')}
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                {t('employerRegister:verify.sentTo', { target: data.email })}
              </p>
              {data.emailVerified ? (
                <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  {t('employerRegister:verify.alreadyVerified')}
                </p>
              ) : (
                <>
                  <input
                    id="email-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    value={emailOtp}
                    onChange={(e) => {
                      setEmailOtp(e.target.value.replace(/\D/g, ''))
                      if (emailError) setEmailError('')
                    }}
                    placeholder="------"
                    disabled={loading}
                    aria-invalid={!!emailError}
                    className={otpInputCls}
                  />
                  {data.devEmailOtp && (
                    <p className="mt-2 text-sm text-amber-700">
                      {t('employerRegister:verify.devMode')}{' '}
                      <span className="font-mono font-bold">{data.devEmailOtp}</span>
                    </p>
                  )}
                  {emailError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">{emailError}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={handleResend}
                disabled={timer > 0 || resending}
                className="text-sm sm:text-base text-primary-50 hover:text-primary-60 font-medium transition-colors disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {timer > 0
                  ? t('employerRegister:verify.resendIn', { seconds: timer })
                  : t('employerRegister:verify.resend')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]"
            >
              {t('buttons.back')}
            </button>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-8 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? t('employerRegister:verify.verifying') : t('employerRegister:verify.verifyContinue')}
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">{t('employerRegister:signInPrompt')}</span>
              <Link href="/login?role=employer" className="font-semibold text-primary-50 hover:text-primary-60 transition-colors">
                {t('employerRegister:signInLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
