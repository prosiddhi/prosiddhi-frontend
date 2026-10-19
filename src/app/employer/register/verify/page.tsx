'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { isOtpRejection, otpCooldownSeconds, otpErrorMessage } from '@/lib/otpError'
import { X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { emailOtpAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { checkEmail } from '@/lib/email'
import { OtpInput, type OtpInputHandle } from '@/components/auth/OtpInput'
import { readOtpSendTiming } from '@/lib/otpSend'
import { EMPTY_OTP } from '@/lib/validation/authSchemas'
import { useEmployerRegistration } from '../EmployerRegistrationContext'
import { useResendCountdown } from '../useResendCountdown'

const OTP_LENGTH = 6

/**
 * Employer registration, contact step 2 of 2: the EMAIL.
 *
 * The phone is verified on the previous screen (/employer/register/contacts); this
 * screen is reachable only once it is. The employer enters an email, taps Send OTP,
 * enters the code and taps Verify Email, which goes on to the account step. The
 * email code is never sent before the phone is verified. The code stays one whole
 * 6-digit code: a 3+3 split was considered and rejected — it would cut each code
 * from 1,000,000 to 1,000 combinations (a ~2.5% per-window guess rate against 5
 * attempts × 5 resends, versus 0.0025% today), break autofill, and make "which
 * half was wrong?" unanswerable. Do not implement it.
 *
 * ⚠️ Backend rule this page is built around: sending an email code to an address
 * that is already verified silently RESETS its verified mark. So a verified
 * address offers Continue, never Send OTP. A code is sent only from a click, never
 * from an effect, so a remount or Strict Mode cannot send twice.
 */
export default function EmployerVerifyPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useEmployerRegistration()
  const [email, setEmail] = useState(data.email)
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  // Taken synchronously, before React re-renders, so a double click cannot start a second request.
  const busy = useRef(false)
  const otpInputRef = useRef<OtpInputHandle>(null)

  const check = checkEmail(email)
  const address = check.ok ? check.value : null
  // The field's address is the one that is verified, or the one a code was sent to.
  const verifiedHere = address !== null && data.emailVerified && data.email === address
  const sent = address !== null && data.emailOtpSent?.to === address ? data.emailOtpSent : null
  const secondsLeft = useResendCountdown(sent ? sent.at : null, sent?.cooldownSeconds)

  // Guard: the phone must be verified first. Waits for the sessionStorage restore
  // before judging.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneNumber || !data.phoneVerified) router.replace('/employer/register/contacts')
  }, [hydrated, data.phoneNumber, data.phoneVerified, router])

  // Seed the input from restored progress once, without clobbering typing.
  useEffect(() => {
    if (!hydrated) return
    setEmail((prev) => prev || data.email)
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // A different address needs its own code, so what was typed for the old one goes.
  const handleEmailChange = (value: string) => {
    setEmail(value)
    setOtp(EMPTY_OTP)
    if (error) setError('')
  }

  const handleOtpChange = (next: string[]) => {
    setOtp(next)
    if (error) setError('')
  }

  // Send OTP, and Resend once the countdown is over.
  const handleSend = async () => {
    if (busy.current || !data.phoneVerified) return
    if (!address) {
      setError(t('employerRegister:verify.emailAddressInvalid'))
      return
    }
    // Never to a verified address (see the header), nor inside the countdown.
    if (verifiedHere || secondsLeft > 0) return
    busy.current = true
    setSending(true)
    setError('')
    try {
      const res = await emailOtpAPI.send(address, 'REGISTRATION')
      // Only the PENDING address is recorded (the sent marker). The verified address
      // and its flag stay as they were until this code is verified.
      update({
        emailOtpSent: { to: address, at: Date.now(), ...readOtpSendTiming(res) },
        devEmailOtp: IS_DEV_BUILD ? res?.otp : undefined,
      })
      setOtp(EMPTY_OTP)
    } catch (err) {
      // A refused resend ("Please wait Ns") shows the server's words and does not restart the countdown.
      setError(otpErrorMessage(err, t, 'employerRegister:verify.emailSendFailed'))
      // Cooldown refusal: count down what is left. Never creates a marker (see the phone step).
      const wait = otpCooldownSeconds(err)
      if (wait !== null && sent) update({ emailOtpSent: { ...sent, at: Date.now(), cooldownSeconds: wait } })
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
      await emailOtpAPI.verify(sent.to, otp.join(''), 'REGISTRATION')
      // The pending address becomes the verified one only now. Its code is spent, so
      // the marker goes too.
      update({ email: sent.to, emailVerified: true, emailOtpSent: null, devEmailOtp: undefined })
      // Left disabled on success: the page is about to change.
      router.push('/employer/register/account')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'employerRegister:verify.emailInvalid', sent.expiresIn))
      // Only a rejected code is emptied; a network or server failure keeps the digits.
      if (isOtpRejection(err)) {
        setOtp(EMPTY_OTP)
        otpInputRef.current?.focusFirst()
      }
      busy.current = false
      setVerifying(false)
    }
  }

  const handleBack = () => router.push('/employer/register/contacts')
  const handleClose = () => router.push('/')

  if (!hydrated || !data.phoneVerified) return null

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
              {t('employerRegister:verify.emailTitle')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {t('employerRegister:verify.emailSubtitle')}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-base sm:text-lg font-medium text-black mb-3">
                {t('employerRegister:verify.emailFieldLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={t('employerRegister:verify.emailPlaceholder')}
                disabled={sending || verifying}
                className={inputCls}
              />
            </div>

            {verifiedHere && (
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                {t('employerRegister:verify.emailVerified')}
              </p>
            )}

            {sent && !verifiedHere && (
              <div>
                <span
                  id="email-otp-label"
                  className="block text-base sm:text-lg font-medium text-black mb-1"
                >
                  {t('employerRegister:verify.emailLabel')}
                </span>
                <p className="text-xs sm:text-sm text-gray-500 mb-3">
                  {t('employerRegister:verify.sentTo', { target: sent.to })}
                </p>
                <div className="max-w-[368px]">
                  <OtpInput
                    ref={otpInputRef}
                    value={otp}
                    onChange={handleOtpChange}
                    idPrefix="email-otp"
                    labelledBy="email-otp-label"
                    ariaLabel={t('employerRegister:verify.emailLabel')}
                    disabled={verifying}
                  />
                </div>
                {IS_DEV_BUILD && data.devEmailOtp && (
                  <p className="mt-2 text-sm text-amber-700">
                    {t('employerRegister:verify.devMode')}{' '}
                    <span className="font-mono font-bold">{data.devEmailOtp}</span>
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
              <button onClick={() => router.push('/employer/register/account')} className={primaryCls}>
                {t('buttons.continue')}
              </button>
            ) : sent ? (
              <button onClick={handleVerify} disabled={verifying} className={primaryCls}>
                {verifying ? t('employerRegister:verify.verifying') : t('employerRegister:verify.verifyEmail')}
              </button>
            ) : (
              <button onClick={handleSend} disabled={sending || !address} className={primaryCls}>
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
