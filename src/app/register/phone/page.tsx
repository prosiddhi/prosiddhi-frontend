'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { otpErrorMessage } from '@/lib/otpError'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

// Normalise user input to E.164 (BE jobSeekerRegisterSchema requires it).
// Bare 10-digit numbers are assumed Indian (+91); an explicit +<country> is kept.
function toE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`
  return null
}

export default function RegisterPhonePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Coming back to this step (Back from the OTP or profile screen, or a refresh),
  // show the number already entered instead of an empty field. The stored number
  // arrives after the first render (sessionStorage restore), so seed it once —
  // and only into an empty field, so anything already typed is never overwritten.
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (!hydrated || prefilledRef.current) return
    prefilledRef.current = true
    if (data.phoneNumber) setPhoneNumber((prev) => prev || data.phoneNumber)
  }, [hydrated, data.phoneNumber])

  const handleNext = async () => {
    if (!phoneNumber.trim()) {
      setError(t('auth:phone.errorEmpty'))
      return
    }

    const e164 = toE164(phoneNumber)
    if (!e164) {
      setError(t('auth:phone.errorInvalid'))
      return
    }

    // Same number as the one already verified in this session: there is nothing
    // to send. /otp/send refuses a verified number ("already verified"), so
    // calling it would only strand the user. This is a convenience, not proof —
    // the flag lives in browser storage, and registration still re-checks the
    // verification with the backend. A DIFFERENT number does not take this
    // path: it goes through send + verify below, which resets phoneVerified.
    if (data.phoneVerified && e164 === data.phoneNumber) {
      router.push('/register/profile')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Send the registration phone OTP (POST /api/otp/send).
      const res = await jobSeekerAPI.registerPhone({ phoneNumber: e164 })

      // Hold the normalised number in memory for the OTP + register steps.
      // `devPhoneOtp` is kept only in a dev build — the OTP screen shows it so QA
      // can get past this step without an SMS gateway (same as the email step).
      update({
        phoneNumber: e164,
        phoneVerified: false,
        devPhoneOtp: IS_DEV_BUILD ? res?.otp : undefined,
      })

      router.push('/register/otp')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:phone.errorFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/register')
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Blue Section (Fixed Width) */}
        <div className="w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            {/* Text Content */}
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:phone.panelHeading')}
              </h2>
            </div>

            {/* Illustration at Bottom */}
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

        {/* Right Side - Form (Flexible Width) */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="w-full min-h-screen flex flex-col max-w-[560px] mx-auto px-6 py-5">
            {/* Header with Logo and Close */}
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

            {/* Progress Indicator */}
            <RegistrationProgress step="phone" onBack={handleBack} className="mb-6" />

            {/* Main Content */}
            <div className="mb-auto max-w-[720px]">
              <div className="mb-6 lg:[@media(max-height:800px)]:mb-4">
                <h1 className="text-[36px] font-bold text-black leading-tight mb-3 lg:[@media(max-height:800px)]:mb-2">
                  {t('auth:phone.title')}
                </h1>
                <p className="text-lg text-[#767676]">
                  {t('auth:phone.subtitle')}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[640px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Phone Number Input */}
              <div className="mb-8 lg:[@media(max-height:800px)]:mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <label htmlFor="phone" className="text-base font-medium text-black">
                    {t('auth:phone.phoneLabel')}
                  </label>
                  <VoiceButton label={t('auth:phone.phoneVoice')} iconClassName="w-5 h-5 text-primary-50" className="p-1" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder={t('auth:phone.phonePlaceholder')}
                  disabled={loading}
                  className="w-full max-w-[640px] h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              {/* Next Button */}
              <div className="flex justify-end max-w-[640px]">
                <button
                  onClick={handleNext}
                  disabled={!phoneNumber.trim() || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-primary-100 px-10 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-base">{loading ? t('auth:phone.sending') : t('buttons.next')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/assets/prosiddhi-logo-horizontal.png"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-error-600">
            <span>{t('auth:register.close')}</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        {/* Progress */}
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <RegistrationProgress step="phone" />
        </div>

        {/* Content */}
        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">
            {t('auth:phone.title')}
          </h1>
          <p className="text-base text-gray-600 mb-6">
            {t('auth:phone.subtitle')}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="phone-mobile" className="text-base font-medium text-black mb-3 block flex items-center gap-2">
              {t('auth:phone.phoneLabel')}
              <VoiceButton label={t('auth:phone.phoneVoice')} iconClassName="w-4 h-4 text-primary-50" className="p-1" />
            </label>
            <input
              id="phone-mobile"
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                if (error) setError('')
              }}
              placeholder={t('auth:phone.phonePlaceholder')}
              disabled={loading}
              className="w-full h-12 px-3 border border-gray-300 rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!phoneNumber.trim() || loading}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 px-6 py-3 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50"
          >
            <span className="text-base">{loading ? t('auth:phone.sending') : t('buttons.next')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Blue Section */}
        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white leading-tight mb-3">
            {t('auth:phone.panelHeading')}
          </h2>
          <div className="relative w-full h-48">
            <Image
              src="/assets/421.svg"
              alt="Illustration"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
