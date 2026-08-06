'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronLeft, ChevronRight, X, MailCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { emailOtpAPI } from '@/lib/api'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(30)

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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < OTP_LENGTH - 1) {
      document.getElementById(`eotp-${index + 1}`)?.focus()
    }
    if (error) setError('')
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`eotp-${index - 1}`)?.focus()
    }
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

      update({ emailVerified: true })
      router.push('/register/categories')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:verifyEmail.errorInvalid'))
      setOtp(Array(OTP_LENGTH).fill(''))
      document.getElementById('eotp-0')?.focus()
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
      update({ devEmailOtp: res?.otp })
      setCanResend(false)
      setCountdown(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:verifyEmail.errorResend'))
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
        <div className="hidden lg:block w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:verifyEmail.panelHeading')}
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-16 py-8 lg:py-16">
            <div className="flex items-start justify-between mb-10 lg:mb-24">
              <div className="relative w-[160px] lg:w-[236px] h-[44px] lg:h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-[18px]">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress step="verifyEmail" onBack={handleBack} className="mb-10 lg:mb-16" />

            <div className="max-w-[953px]">
              <div className="mb-8 lg:mb-12 flex items-center gap-4">
                <MailCheck className="w-10 h-10 lg:w-14 lg:h-14 text-primary-50 flex-shrink-0" />
                <div>
                  <h1 className="text-3xl lg:text-[48px] font-bold text-black leading-tight mb-2">{t('auth:verifyEmail.title')}</h1>
                  <p className="text-base lg:text-[20px] text-[#767676]">
                    {t('auth:verifyEmail.sentToPrefix')}<span className="font-medium text-black">{data.email}</span>
                  </p>
                </div>
              </div>

              {/* Dev convenience: BE echoes the OTP in non-production. */}
              {data.devEmailOtp && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-[520px]">
                  <p className="text-amber-700 text-sm">
                    {t('auth:verifyEmail.devMode')} <span className="font-mono font-bold">{data.devEmailOtp}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[520px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center gap-3 lg:gap-4 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`eotp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={loading}
                      className="w-12 h-12 lg:w-[69px] lg:h-[69px] text-center border border-[#b5b5b5] rounded-[10px] text-xl lg:text-[24px] font-bold text-black focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50"
                    />
                  ))}
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
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-8 lg:px-12 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-base lg:text-[20px]">{loading ? t('auth:verifyEmail.verifying') : t('auth:verifyEmail.verifyContinue')}</span>
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
