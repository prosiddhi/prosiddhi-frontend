'use client'

import { useState, useEffect, useRef, type ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { otpErrorMessage } from '@/lib/otpError'
import { X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { otpAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { toE164, toMobileDigits, toMobileInputDigits } from '@/lib/identifier'
import { OtpInput } from '@/components/auth/OtpInput'
import { EMPTY_OTP } from '@/lib/validation/authSchemas'
import { useEmployerRegistration } from '../EmployerRegistrationContext'
import { useResendCountdown } from '../useResendCountdown'

const OTP_LENGTH = 6

/**
 * Employer registration, contact step 1 of 2: the PHONE.
 *
 * The employer enters a mobile number, taps Send OTP, enters the code and taps
 * Verify Phone; that goes on to /employer/register/verify, which does the same for
 * the email. The two contacts are on separate screens and the email code is never
 * sent before the phone is verified. Each code stays one whole 6-digit code: a
 * 3+3 split was considered and rejected — it would cut each code from 1,000,000
 * to 1,000 combinations, break SMS autofill, and make "which half was wrong?"
 * unanswerable. Do not implement it.
 *
 * Never send a code to a contact that is already verified: the backend refuses a
 * verified phone ("already verified"), so a verified number here offers Continue
 * instead of Send OTP. A code is sent only from a click, never from an effect.
 */
export default function EmployerContactsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useEmployerRegistration()
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber.replace(/^\+91/, ''))
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  // Taken synchronously, before React re-renders, so a double click cannot start a second request.
  const busy = useRef(false)

  const e164 = toE164(phoneNumber)
  // The field's number is the one that is verified, or the one a code was sent to.
  const verifiedHere = e164 !== null && data.phoneVerified && data.phoneNumber === e164
  const sent = e164 !== null && data.phoneOtpSent?.to === e164 ? data.phoneOtpSent : null
  const secondsLeft = useResendCountdown(sent ? sent.at : null)

  // Guard: the employer type is chosen on the previous screen. Waits for the
  // sessionStorage restore before judging.
  useEffect(() => {
    if (!hydrated) return
    if (!data.companyType) router.replace('/employer/register')
  }, [hydrated, data.companyType, router])

  // Seed the input from restored progress once, without clobbering typing.
  useEffect(() => {
    if (!hydrated) return
    setPhoneNumber((prev) => prev || data.phoneNumber.replace(/^\+91/, ''))
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // A different number needs its own code, so what was typed for the old one goes.
  const changeNumber = (digits: string) => {
    setPhoneNumber(digits)
    setOtp(EMPTY_OTP)
    if (error) setError('')
  }

  // Typed or pasted. Refused text keeps the old value and says why, so a paste
  // like "98765 43210" is not quietly reshaped into a number nobody entered.
  const handlePhoneChange = (raw: string) => {
    const digits = toMobileInputDigits(raw)
    if (digits === null) {
      setError(t('employerRegister:contacts.phoneInvalid'))
      return
    }
    changeNumber(digits)
  }

  // A whole supported number pasted over/behind existing digits replaces the
  // field (see toMobileInputDigits); any other paste falls through to onChange.
  const handlePhonePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = toMobileDigits(e.clipboardData.getData('text'))
    if (!digits) return
    e.preventDefault()
    changeNumber(digits)
  }

  // Send OTP, and Resend once the countdown is over.
  const handleSend = async () => {
    if (busy.current) return
    if (!e164) {
      setError(t('employerRegister:contacts.phoneInvalid'))
      return
    }
    if (verifiedHere || secondsLeft > 0) return
    busy.current = true
    setSending(true)
    setError('')
    try {
      // The most likely real failure is "This phone number is already registered"
      // — /otp/send refuses a phone that already has an account — so show the
      // server's own words: a generic "check the number" would send a returning
      // employer round a loop retyping a number that was correct all along. The
      // sign-in link below is the way out. A refused resend ("Please wait Ns")
      // shows the same way and does not restart the countdown.
      const res = await otpAPI.send(e164)
      // Only the PENDING number is recorded (the sent marker). The verified number
      // and its flag stay as they were until this code is verified, so trying a
      // different number and coming back to the verified one loses nothing — the
      // backend would refuse another code for it.
      update({
        phoneOtpSent: { to: e164, at: Date.now() },
        devPhoneOtp: IS_DEV_BUILD ? res?.otp : undefined,
      })
      setOtp(EMPTY_OTP)
    } catch (err) {
      setError(otpErrorMessage(err, t, 'employerRegister:contacts.phoneSendFailed'))
    } finally {
      busy.current = false
      setSending(false)
    }
  }

  const handleVerify = async () => {
    if (!sent) return
    if (otp.join('').length !== OTP_LENGTH) {
      setError(t('employerRegister:verify.incomplete'))
      return
    }
    if (busy.current) return
    busy.current = true
    setVerifying(true)
    setError('')
    try {
      await otpAPI.verify(sent.to, otp.join(''))
      // The pending number becomes the verified one only now. Its code is spent, so
      // the marker goes too.
      update({ phoneNumber: sent.to, phoneVerified: true, phoneOtpSent: null, devPhoneOtp: undefined })
      // Left disabled on success: the page is about to change.
      router.push('/employer/register/verify')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'employerRegister:verify.phoneInvalid'))
      setOtp(EMPTY_OTP)
      busy.current = false
      setVerifying(false)
    }
  }

  const handleOtpChange = (next: string[]) => {
    setOtp(next)
    if (error) setError('')
  }

  const handleBack = () => router.push('/employer/register')
  const handleClose = () => router.push('/')

  const inputCls =
    'w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'
  const primaryCls =
    'px-8 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]'

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
                autoComplete="tel-national"
                onChange={(e) => handlePhoneChange(e.target.value)}
                onPaste={handlePhonePaste}
                placeholder={t('employerRegister:contacts.phonePlaceholder')}
                disabled={sending || verifying}
                className={inputCls}
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                {t('employerRegister:contacts.hint')}
              </p>
            </div>

            {verifiedHere && (
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                {t('employerRegister:contacts.phoneVerified')}
              </p>
            )}

            {sent && !verifiedHere && (
              <div>
                <span
                  id="phone-otp-label"
                  className="block text-base sm:text-lg font-medium text-black mb-1"
                >
                  {t('employerRegister:verify.phoneLabel')}
                </span>
                <p className="text-xs sm:text-sm text-gray-500 mb-3">
                  {t('employerRegister:verify.sentTo', { target: sent.to })}
                </p>
                <div className="max-w-[368px]">
                  <OtpInput
                    value={otp}
                    onChange={handleOtpChange}
                    idPrefix="phone-otp"
                    labelledBy="phone-otp-label"
                    ariaLabel={t('employerRegister:verify.phoneLabel')}
                    disabled={verifying}
                  />
                </div>
                {IS_DEV_BUILD && data.devPhoneOtp && (
                  <p className="mt-2 text-sm text-amber-700">
                    {t('employerRegister:verify.devMode')}{' '}
                    <span className="font-mono font-bold">{data.devPhoneOtp}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={secondsLeft > 0 || sending || verifying}
                  className="mt-3 text-sm sm:text-base text-primary-50 hover:text-primary-60 font-medium transition-colors disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {secondsLeft > 0
                    ? t('employerRegister:verify.resendIn', { seconds: secondsLeft })
                    : t('employerRegister:verify.resend')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]"
            >
              {t('buttons.back')}
            </button>
            {verifiedHere ? (
              <button onClick={() => router.push('/employer/register/verify')} className={primaryCls}>
                {t('buttons.continue')}
              </button>
            ) : sent ? (
              <button onClick={handleVerify} disabled={verifying} className={primaryCls}>
                {verifying ? t('employerRegister:verify.verifying') : t('employerRegister:contacts.verifyPhone')}
              </button>
            ) : (
              <button onClick={handleSend} disabled={sending || !e164} className={primaryCls}>
                {sending ? t('employerRegister:contacts.sending') : t('buttons.sendOtp')}
              </button>
            )}
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
