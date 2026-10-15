'use client'

import { useState, useEffect, type ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { otpErrorMessage } from '@/lib/otpError'
import { X } from 'lucide-react'
import Link from 'next/link'
import { emailOtpAPI, otpAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { checkEmail } from '@/lib/email'
import { toE164, toMobileDigits, toMobileInputDigits } from '@/lib/identifier'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

/**
 * Collect BOTH employer contacts on one screen, then send both codes.
 *
 * An employer's email is mandatory (unlike a seeker's) and the backend requires
 * it verified before register, so it is gathered up front — ahead of a seven-
 * field company form — rather than after. Asking for phone and email together,
 * and verifying them together on the next screen, makes two OTPs feel like one
 * step without weakening either.
 */
export default function EmployerContactsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useEmployerRegistration()
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber.replace(/^\+91/, ''))
  const [email, setEmail] = useState(data.email)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Guard: the employer type is chosen on the previous screen. Waits for the
  // sessionStorage restore before judging.
  useEffect(() => {
    if (!hydrated) return
    if (!data.companyType) router.replace('/employer/register')
  }, [hydrated, data.companyType, router])

  // Seed the inputs from restored progress once, without clobbering typing.
  useEffect(() => {
    if (!hydrated) return
    setPhoneNumber((prev) => prev || data.phoneNumber.replace(/^\+91/, ''))
    setEmail((prev) => prev || data.email)
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Typed or pasted. Refused text keeps the old value and says why, so a paste
  // like "98765 43210" is not quietly reshaped into a number nobody entered.
  const handlePhoneChange = (raw: string) => {
    const digits = toMobileInputDigits(raw)
    if (digits === null) {
      setError(t('employerRegister:contacts.phoneInvalid'))
      return
    }
    setPhoneNumber(digits)
    if (error) setError('')
  }

  // A whole supported number pasted over/behind existing digits replaces the
  // field (see toMobileInputDigits); any other paste falls through to onChange.
  const handlePhonePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = toMobileDigits(e.clipboardData.getData('text'))
    if (!digits) return
    e.preventDefault()
    setPhoneNumber(digits)
    if (error) setError('')
  }

  const handleNext = async () => {
    const e164 = toE164(phoneNumber)
    if (!e164) {
      setError(t('employerRegister:contacts.phoneInvalid'))
      return
    }
    const emailCheck = checkEmail(email)
    if (!emailCheck.ok) {
      setError(t('employerRegister:contacts.emailInvalid'))
      return
    }
    const trimmedEmail = emailCheck.value

    try {
      setLoading(true)
      setError('')

      // Send both codes together. allSettled rather than Promise.all: if one
      // send fails we still want to know which, and a code that DID go out is
      // not wasted — the next screen verifies the two fields independently.
      const [phoneResult, emailResult] = await Promise.allSettled([
        otpAPI.send(e164),
        emailOtpAPI.send(trimmedEmail, 'REGISTRATION'),
      ])

      const phoneFailed = phoneResult.status === 'rejected'
      const emailFailed = emailResult.status === 'rejected'

      // Prefer the server's own words. The most likely real failure here is
      // "This phone number is already registered" — /otp/send refuses a phone
      // that already has an account — and a generic "couldn't send the code,
      // check it and try again" would send a returning employer round a loop
      // retyping a number that was correct all along. The sign-in link at the
      // bottom of this screen is the way out.
      const reasonOf = (result: PromiseSettledResult<unknown>) =>
        result.status === 'rejected' && result.reason instanceof Error
          ? otpErrorMessage(result.reason, t, 'employerRegister:contacts.bothSendFailed')
          : ''

      // Changing either contact invalidates whatever was verified before, so
      // the flags are recomputed from what the user just entered.
      update({
        phoneNumber: e164,
        phoneVerified: data.phoneVerified && data.phoneNumber === e164,
        email: trimmedEmail,
        emailVerified: data.emailVerified && data.email === trimmedEmail,
        devPhoneOtp:
          IS_DEV_BUILD && phoneResult.status === 'fulfilled' ? phoneResult.value.otp : undefined,
        devEmailOtp:
          IS_DEV_BUILD && emailResult.status === 'fulfilled' ? emailResult.value?.otp : undefined,
      })

      if (phoneFailed && emailFailed) {
        setError(
          [reasonOf(phoneResult), reasonOf(emailResult)].filter(Boolean).join(' ') ||
            t('employerRegister:contacts.bothSendFailed')
        )
        return
      }
      if (phoneFailed) {
        setError(reasonOf(phoneResult) || t('employerRegister:contacts.phoneSendFailed'))
        return
      }
      if (emailFailed) {
        setError(reasonOf(emailResult) || t('employerRegister:contacts.emailSendFailed'))
        return
      }

      router.push('/employer/register/verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employerRegister:contacts.bothSendFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register')
  const handleClose = () => router.push('/')

  const inputCls =
    'w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

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
              {t('employerRegister:title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {t('employerRegister:contacts.subtitle')}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8 space-y-6">
            <div>
              <label htmlFor="phone" className="block text-base sm:text-lg font-medium text-black mb-3">
                {t('employerRegister:contacts.phoneLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                inputMode="numeric"
                onChange={(e) => handlePhoneChange(e.target.value)}
                onPaste={handlePhonePaste}
                placeholder={t('employerRegister:contacts.phonePlaceholder')}
                disabled={loading}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-base sm:text-lg font-medium text-black mb-3">
                {t('employerRegister:contacts.emailLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                placeholder={t('employerRegister:contacts.emailPlaceholder')}
                disabled={loading}
                className={inputCls}
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                {t('employerRegister:contacts.hint')}
              </p>
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
              onClick={handleNext}
              disabled={loading || phoneNumber.length < 10 || !email.trim()}
              className="px-8 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? t('employerRegister:contacts.sending') : t('employerRegister:contacts.sendCodes')}
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
