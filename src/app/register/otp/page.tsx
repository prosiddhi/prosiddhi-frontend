'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

const OTP_LENGTH = 6

export default function RegisterOTPPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()
  const phoneNumber = data.phoneNumber
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(30)

  // Guard: wait for the restore before judging — the phone survives a refresh
  // now, but not before sessionStorage has been read.
  useEffect(() => {
    if (!hydrated) return
    if (!phoneNumber) router.replace('/register/phone')
  }, [hydrated, phoneNumber, router])

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
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }

    if (error) setError('')
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleVerify = async () => {
    const otpCode = otp.join('')

    if (otpCode.length !== OTP_LENGTH) {
      setError(t('auth:otp.errorIncomplete'))
      return
    }

    try {
      setLoading(true)
      setError('')

      // Verify the phone OTP (POST /api/otp/verify).
      await jobSeekerAPI.verifyOTP({ phoneNumber, otp: otpCode })

      update({ phoneVerified: true })
      router.push('/register/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:otp.errorInvalid'))
      setOtp(Array(OTP_LENGTH).fill(''))
      document.getElementById('otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || resendLoading) return

    try {
      setResendLoading(true)
      setError('')

      const res = await jobSeekerAPI.registerPhone({ phoneNumber })
      // A resend issues a NEW code — refresh the dev banner or it would show the
      // stale one, which no longer verifies.
      update({ devPhoneOtp: res?.otp })

      setCanResend(false)
      setCountdown(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:otp.errorResend'))
    } finally {
      setResendLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/register/phone')
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:otp.panelHeading')}
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image
                  src="/assets/421.svg"
                  alt=""
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            <div className="flex items-start justify-between mb-24">
              <div className="relative w-[236px] h-[66px]">
                <Image
                  src="/assets/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-5 py-3 rounded-lg hover:bg-error-600 transition-colors">
                <span className="text-[18px]">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <RegistrationProgress step="otp" onBack={handleBack} className="mb-16" />

            <div className="max-w-[1200px]">
              <div className="mb-16">
                <h1 className="text-[56px] font-bold text-black leading-tight mb-4">
                  {t('auth:otp.title')}
                </h1>
                <p className="text-[24px] text-[#767676]">
                  {t('auth:otp.sentTo', { phone: phoneNumber })}
                </p>
              </div>
              {/* Dev convenience: BE echoes the OTP in non-production. Without it QA
                  cannot get past this step — there is no SMS gateway wired. */}
              {data.devPhoneOtp && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-[520px]">
                  <p className="text-amber-700 text-sm">
                    {t('auth:otp.devMode')} <span className="font-mono font-bold">{data.devPhoneOtp}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[953px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-[20px] font-medium text-black">
                    {t('auth:otp.codeLabel')}
                  </label>
                  <VoiceButton label={t('auth:otp.codeVoice')} iconClassName="w-5 h-5 text-primary-50" className="p-1" />
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={loading}
                      className="w-[69px] h-[69px] text-center border border-[#b5b5b5] rounded-[10px] text-[24px] font-bold text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent disabled:opacity-50"
                    />
                  ))}
                </div>

                <button
                  onClick={handleResend}
                  disabled={!canResend || resendLoading}
                  className="text-primary-50 hover:text-primary-60 text-[16px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? t('auth:otp.sending') : canResend ? t('auth:otp.resendCode') : t('auth:otp.resendIn', { countdown })}
                </button>
              </div>

              <div className="flex justify-end max-w-[953px]">
                <button
                  onClick={handleVerify}
                  disabled={otp.join('').length !== OTP_LENGTH || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-[20px]">{loading ? t('auth:otp.verifying') : t('buttons.verify')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="relative w-[140px] h-[40px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm">
            <span>{t('auth:register.close')}</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <RegistrationProgress step="otp" />
        </div>

        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            {t('auth:otp.title')}
          </h1>
          <p className="text-base text-gray-600 mb-8">
            {t('auth:otp.sentTo', { phone: phoneNumber })}
          </p>
              {/* Dev convenience: BE echoes the OTP in non-production. Without it QA
                  cannot get past this step — there is no SMS gateway wired. */}
              {data.devPhoneOtp && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-[520px]">
                  <p className="text-amber-700 text-sm">
                    {t('auth:otp.devMode')} <span className="font-mono font-bold">{data.devPhoneOtp}</span>
                  </p>
                </div>
              )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <label className="text-base font-medium text-black mb-4 block">
              {t('auth:otp.codeLabel')}
            </label>
            <div className="flex items-center gap-3 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-mobile-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="flex-1 h-14 text-center border border-gray-300 rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50"
                />
              ))}
            </div>
            <button
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="text-primary-50 text-sm disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : canResend ? 'Resend Code' : `Resend in ${countdown}s`}
            </button>
          </div>

          <button
            onClick={handleVerify}
            disabled={otp.join('').length !== OTP_LENGTH || loading}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            <span className="text-lg">{loading ? t('auth:otp.verifying') : t('buttons.verify')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white leading-tight mb-4">
            {t('auth:otp.panelHeading')}
          </h2>
          <div className="relative w-full h-48">
            <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  )
}
