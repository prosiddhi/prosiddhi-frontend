'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { otpCooldownSeconds, otpErrorMessage } from '@/lib/otpError'
import { OtpInput, type OtpInputHandle } from '@/components/auth/OtpInput'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { DEFAULT_RESEND_COOLDOWN_SECONDS, readOtpSendTiming } from '@/lib/otpSend'
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
  // The first code was sent on the previous screen; its cooldown comes through the
  // context (memory only), or is the default after a refresh. A resend's response sets
  // the server's value from then on.
  const [countdown, setCountdown] = useState(data.phoneOtpCooldownSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS)
  // Set the moment this screen's own successful verify moves on, so the
  // "already verified" redirect below does not navigate a second time.
  const advancingRef = useRef(false)
  // Both layouts stay mounted (CSS hides one), so each has its own box group and handle.
  const desktopOtpRef = useRef<OtpInputHandle>(null)
  const mobileOtpRef = useRef<OtpInputHandle>(null)

  // Guard: wait for the restore before judging — the phone survives a refresh
  // now, but not before sessionStorage has been read.
  useEffect(() => {
    if (!hydrated) return
    if (!phoneNumber) {
      router.replace('/register/phone')
      return
    }
    // This number is already verified in this session (Back from a later step,
    // a bookmark, a refresh). There is no code to enter — and /otp/send and
    // /otp/verify both refuse a verified number — so show nothing and move on.
    // The flag is a convenience, not proof: registration re-checks the
    // verification with the backend.
    if (data.phoneVerified && !advancingRef.current) router.replace('/register/profile')
  }, [hydrated, phoneNumber, data.phoneVerified, router])

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

      advancingRef.current = true
      update({ phoneVerified: true })
      router.push('/register/profile')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:otp.errorInvalid'))
      setOtp(Array(OTP_LENGTH).fill(''))
      // Only the visible layout's boxes can take focus; the hidden one is a no-op.
      desktopOtpRef.current?.focusFirst()
      mobileOtpRef.current?.focusFirst()
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
      const { cooldownSeconds } = readOtpSendTiming(res)
      update({ devPhoneOtp: IS_DEV_BUILD ? res?.otp : undefined, phoneOtpCooldownSeconds: cooldownSeconds })

      setCanResend(false)
      setCountdown(cooldownSeconds)
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:otp.errorResend'))
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

  const handleBack = () => {
    router.push('/register/phone')
  }

  // Render nothing for a number that is already verified (the guard above is
  // moving on) and until the stored state has been read — so the code boxes and
  // the Resend button never appear for it.
  if (!hydrated || data.phoneVerified) return null

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:otp.panelHeading')}
              </h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-10 pb-10">
              <div className="relative w-full max-w-[480px] aspect-[3/2]">
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
          <div className="w-full min-h-screen flex flex-col max-w-[560px] mx-auto px-6 py-5">
            <div className="flex items-start justify-between mt-auto mb-6">
              <div className="relative w-[180px] h-[50px]">
                <Image
                  src="/assets/prosiddhi-logo-horizontal.png"
                  alt="Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-5 py-3 rounded-lg hover:bg-error-600 transition-colors">
                <span className="text-base">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <RegistrationProgress step="otp" onBack={handleBack} className="mb-6" />

            <div className="mb-auto max-w-[720px]">
              <div className="mb-6 lg:[@media(max-height:800px)]:mb-4">
                <h1 className="text-[36px] font-bold text-black leading-tight mb-3 lg:[@media(max-height:800px)]:mb-2">
                  {t('auth:otp.title')}
                </h1>
                <p className="text-lg text-[#767676]">
                  {t('auth:otp.sentTo', { phone: phoneNumber })}
                </p>
              </div>
              {/* Dev builds only (IS_DEV_BUILD): server-echoed OTP, no SMS gateway wired. */}
              {IS_DEV_BUILD && data.devPhoneOtp && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-[520px]">
                  <p className="text-amber-700 text-sm">
                    {t('auth:otp.devMode')} <span className="font-mono font-bold">{data.devPhoneOtp}</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[640px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-8 lg:[@media(max-height:800px)]:mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <label id="otp-label" className="text-base font-medium text-black">
                    {t('auth:otp.codeLabel')}
                  </label>
                  <VoiceButton label={t('auth:otp.codeVoice')} iconClassName="w-5 h-5 text-primary-50" className="p-1" />
                </div>
                
                <div className="max-w-[368px] mb-6">
                  <OtpInput
                    ref={desktopOtpRef}
                    value={otp}
                    onChange={handleOtpChange}
                    idPrefix="otp"
                    labelledBy="otp-label"
                    ariaLabel={t('auth:otp.codeVoice')}
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleResend}
                  disabled={!canResend || resendLoading}
                  className="text-primary-50 hover:text-primary-60 text-[16px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? t('auth:otp.sending') : canResend ? t('auth:otp.resendCode') : t('auth:otp.resendIn', { countdown })}
                </button>
              </div>

              <div className="flex justify-end max-w-[640px]">
                <button
                  onClick={handleVerify}
                  disabled={otp.join('').length !== OTP_LENGTH || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-primary-100 px-10 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-base">{loading ? t('auth:otp.verifying') : t('buttons.verify')}</span>
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
            <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain" priority />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">
            {t('auth:otp.title')}
          </h1>
          <p className="text-base text-gray-600 mb-6">
            {t('auth:otp.sentTo', { phone: phoneNumber })}
          </p>
              {/* Dev builds only (IS_DEV_BUILD): server-echoed OTP, no SMS gateway wired. */}
              {IS_DEV_BUILD && data.devPhoneOtp && (
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

          <div className="mb-6">
            <label id="otp-mobile-label" className="text-base font-medium text-black mb-3 block">
              {t('auth:otp.codeLabel')}
            </label>
            <div className="mb-3">
              <OtpInput
                ref={mobileOtpRef}
                value={otp}
                onChange={handleOtpChange}
                idPrefix="otp-mobile"
                labelledBy="otp-mobile-label"
                ariaLabel={t('auth:otp.codeVoice')}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="text-primary-50 text-sm disabled:opacity-50"
            >
              {resendLoading ? t('auth:otp.sending') : canResend ? t('auth:otp.resendCode') : t('auth:otp.resendIn', { countdown })}
            </button>
          </div>

          <button
            onClick={handleVerify}
            disabled={otp.join('').length !== OTP_LENGTH || loading}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 px-6 py-3 rounded-lg disabled:opacity-50"
          >
            <span className="text-base">{loading ? t('auth:otp.verifying') : t('buttons.verify')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white leading-tight mb-3">
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
