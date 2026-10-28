'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isOtpRejection, otpCooldownSeconds, otpErrorMessage } from '@/lib/otpError'
import { OtpInput, type OtpInputHandle } from '@/components/auth/OtpInput'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, X, MailCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { emailOtpAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { DEFAULT_RESEND_COOLDOWN_SECONDS, readOtpSendTiming } from '@/lib/otpSend'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { track } from '@/lib/analytics'

const OTP_LENGTH = 6

/**
 * Verify the seeker's email BEFORE the account exists.
 *
 * This screen used to run last, against an already-created account, and called
 * authAPI.verifyEmailOtp. The backend inverted that: register now REQUIRES both
 * contacts to be verified already and consumes the marks, so verification has
 * to happen here — under purpose REGISTRATION, via the generic email-OTP
 * endpoints. Do not call authAPI.verifyEmailOtp from registration; that route
 * is for admin-added accounts now.
 *
 * The whole screen is SKIPPED when the seeker gave no email (it is optional).
 */
export default function RegisterVerifyEmailPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const otpInputRef = useRef<OtpInputHandle>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  // The first code was sent on the previous screen; its cooldown comes through the
  // context (memory only), or is the default after a refresh. A resend's response sets
  // the server's value from then on.
  const [countdown, setCountdown] = useState(data.emailOtpCooldownSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS)

  // Guard: reachable only with a verified phone and an email to verify. No
  // password check — the account does not exist yet at this point.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneVerified) router.replace('/register/phone')
    else if (!data.email) router.replace('/register/profile')
  }, [hydrated, data.phoneVerified, data.email, router])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleOtpChange = (next: string[]) => {
    setOtp(next)
    if (error) setError('')
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setError(t('auth:verifyEmail.errorIncomplete'))
      return
    }

    try {
      setLoading(true)
      setError('')

      // Leaves a server-side "verified" mark that the register call at the end
      // of the flow consumes. The mark does not expire, so the rest of the form
      // can take as long as it needs.
      await emailOtpAPI.verify(data.email, code, 'REGISTRATION')
      track('sign_up_step', { role: 'seeker', step: 'email_verified' })

      update({ emailVerified: true })
      router.push('/register/categories')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:verifyEmail.errorInvalid'))
      // Only a rejected code is emptied; a network or server failure keeps the digits.
      if (isOtpRejection(err)) {
        setOtp(Array(OTP_LENGTH).fill(''))
        otpInputRef.current?.focusFirst()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || resendLoading) return
    try {
      setResendLoading(true)
      setError('')
      const res = await emailOtpAPI.send(data.email, 'REGISTRATION')
      const { cooldownSeconds } = readOtpSendTiming(res)
      update({ devEmailOtp: IS_DEV_BUILD ? res?.otp : undefined, emailOtpCooldownSeconds: cooldownSeconds })
      setCanResend(false)
      setCountdown(cooldownSeconds)
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:verifyEmail.errorResend'))
      // The server refused because a code went out moments ago: count down what is
      // left rather than leaving Resend enabled. Any other failure starts nothing.
      const wait = otpCooldownSeconds(err)
      if (wait !== null) {
        setCanResend(false)
        setCountdown(wait)
      }
    } finally {
      setResendLoading(false)
    }
  }

  // Back to the email field — the way to correct a typo, or to drop the email
  // entirely and continue without one.
  const handleBack = () => router.push('/register/profile')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:verifyEmail.panelHeading')}
              </h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-10 pb-10">
              <div className="relative w-full max-w-[480px] aspect-[3/2]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="w-full lg:min-h-screen lg:flex lg:flex-col max-w-[1400px] lg:max-w-[560px] mx-auto px-4 lg:px-6 py-6 lg:py-5">
            <div className="flex items-start justify-between lg:mt-auto mb-6">
              <div className="relative w-[160px] lg:w-[180px] h-[44px] lg:h-[50px]">
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-base">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress step="verifyEmail" onBack={handleBack} className="mb-6" />

            <div className="lg:mb-auto max-w-[640px]">
              <div className="mb-6 lg:mb-8 lg:[@media(max-height:800px)]:mb-4 flex items-center gap-4">
                <MailCheck className="w-10 h-10 lg:w-14 lg:h-14 text-primary-50 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl lg:text-[32px] font-bold text-black leading-tight mb-2">{t('auth:verifyEmail.title')}</h1>
                  <p className="text-base text-[#767676]">
                    {t('auth:verifyEmail.sentToPrefix')}<span className="font-medium text-black">{data.email}</span>
                  </p>
                </div>
              </div>

              {/* Dev builds only (IS_DEV_BUILD). */}
              {IS_DEV_BUILD && data.devEmailOtp && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-[520px]">
                  <p className="text-amber-700 text-sm">
                    {t('auth:verifyEmail.devMode')} <span className="font-mono font-bold">{data.devEmailOtp}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[520px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-6">
                {/* The boxes had no label. The wording is borrowed from /forgot-password
                    (no asterisk, translated in all ten languages). */}
                <span id="eotp-label" className="sr-only">{t('auth:forgot.codeLabel')}</span>
                {/* Width cap matches the old row: six 48px boxes plus gaps. */}
                <div className="max-w-[328px] lg:max-w-[368px] mb-6">
                  <OtpInput
                    ref={otpInputRef}
                    value={otp}
                    onChange={handleOtpChange}
                    idPrefix="eotp"
                    labelledBy="eotp-label"
                    ariaLabel={t('auth:forgot.codeLabel')}
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleResend}
                  disabled={!canResend || resendLoading}
                  className="text-primary-50 hover:text-primary-60 text-[16px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? t('auth:verifyEmail.sending') : canResend ? t('auth:verifyEmail.resendCode') : t('auth:verifyEmail.resendIn', { countdown })}
                </button>
              </div>

              <div className="flex justify-start max-w-[520px]">
                <button
                  onClick={handleVerify}
                  disabled={otp.join('').length !== OTP_LENGTH || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-primary-100 px-8 lg:px-10 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-base">{loading ? t('auth:verifyEmail.verifying') : t('auth:verifyEmail.verifyContinue')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
