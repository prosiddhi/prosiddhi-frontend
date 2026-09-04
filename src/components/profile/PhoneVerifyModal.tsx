'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Phone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { authAPI, otpAPI } from '@/lib/api'

interface PhoneVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  /** Current phone on the account, for the "Code sent to..." confirmation. */
  currentPhoneNumber: string
  /** Called after a successful change — the caller re-fetches the profile. */
  onSuccess: () => void | Promise<void>
}

const RESEND_COOLDOWN_SECONDS = 30

const inputCls =
  'w-full h-11 px-3 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500'

// The input only ever holds digits, capped at 10 (see the onChange below), so a
// bare 10-digit number is the only shape reaching here — Indian mobile, +91 default.
function toE164(digitsOnly: string): string | null {
  return digitsOnly.length === 10 ? `+91${digitsOnly}` : null
}

export function PhoneVerifyModal({ isOpen, onClose, currentPhoneNumber, onSuccess }: PhoneVerifyModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  // Dev convenience: the BE echoes the OTP in non-production (see otpAPI.send /
  // OtpSendResult). Same pattern as EmailVerifyModal and register/otp/page.tsx.
  const [devOtp, setDevOtp] = useState<string | undefined>()

  useEffect(() => {
    if (isOpen) {
      setStep('phone')
      setPhoneNumber('')
      setOtp('')
      setError('')
      setCooldown(0)
      setDevOtp(undefined)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  if (!isOpen) return null

  const e164 = toE164(phoneNumber)
  const canSendOtp = !!e164

  const sendOtp = async () => {
    if (!e164 || sending) return
    setSending(true)
    setError('')
    try {
      const res = await otpAPI.send(e164)
      setDevOtp(res?.otp)
      setStep('otp')
      setOtp('')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.phoneModal.sendError'))
    } finally {
      setSending(false)
    }
  }

  const resendOtp = async () => {
    if (cooldown > 0 || sending) return
    await sendOtp()
  }

  const verifyOtp = async () => {
    if (!e164 || otp.trim().length !== 6 || verifying) return
    setVerifying(true)
    setError('')
    try {
      await authAPI.changePhone(e164, otp.trim())
      await onSuccess()
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.phoneModal.verifyError'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px]">
        <button
          onClick={onClose}
          aria-label={t('profile:seeker.phoneModal.cancel')}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {step === 'success' ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">{t('profile:seeker.phoneModal.successTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 max-w-sm">{t('profile:seeker.phoneModal.successBody')}</p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary-50 text-primary-100 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
              >
                {t('profile:seeker.phoneModal.done')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-5 h-5 text-primary-50" />
                <h2 className="text-xl sm:text-2xl font-bold text-black">{t('profile:seeker.phoneModal.title')}</h2>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                {step === 'phone'
                  ? t('profile:seeker.phoneModal.intro', { phone: currentPhoneNumber })
                  : t('profile:seeker.phoneModal.otpSentTo', { phone: e164 ?? phoneNumber })}
              </p>

              {/* Dev convenience: BE echoes the OTP in non-production. */}
              {step === 'otp' && devOtp && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-700 text-sm">
                    {t('profile:seeker.phoneModal.devMode')} <span className="font-mono font-bold">{devOtp}</span>
                  </p>
                </div>
              )}

              {step === 'phone' ? (
                <div className="mb-4">
                  <label className="text-sm font-medium text-black mb-1.5 block">
                    {t('profile:seeker.phoneModal.phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder={t('profile:seeker.phoneModal.phonePlaceholder')}
                    className={inputCls}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="text-sm font-medium text-black mb-1.5 block">
                    {t('profile:seeker.phoneModal.otpLabel')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('profile:seeker.phoneModal.otpPlaceholder')}
                    className={`${inputCls} tracking-widest`}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-sm text-primary-50 hover:text-primary-60"
                    >
                      {t('profile:seeker.phoneModal.changePhoneLink')}
                    </button>
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={cooldown > 0 || sending}
                      className="text-sm text-primary-50 hover:text-primary-60 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {cooldown > 0
                        ? t('profile:seeker.phoneModal.resendIn', { seconds: cooldown })
                        : t('profile:seeker.phoneModal.resend')}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  disabled={sending || verifying}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('profile:seeker.phoneModal.cancel')}
                </button>
                {step === 'phone' ? (
                  <button
                    onClick={sendOtp}
                    disabled={!canSendOtp || sending}
                    className="flex-1 px-6 py-3 bg-primary-50 text-primary-100 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                    {sending ? t('profile:seeker.phoneModal.sending') : t('profile:seeker.phoneModal.sendOtp')}
                  </button>
                ) : (
                  <button
                    onClick={verifyOtp}
                    disabled={otp.trim().length !== 6 || verifying}
                    className="flex-1 px-6 py-3 bg-primary-50 text-primary-100 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifying && <Loader2 className="w-5 h-5 animate-spin" />}
                    {verifying ? t('profile:seeker.phoneModal.verifying') : t('profile:seeker.phoneModal.verifyAndUpdate')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
