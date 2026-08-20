'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { emailOtpAPI, authAPI } from '@/lib/api'

// Mirrors the BE resetPasswordSchema (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

type Stage = 'email' | 'otp' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState<string | undefined>()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => router.push('/')
  const handleBackToLogin = () => router.push('/login')

  // Stage 1 — request the reset OTP (email-OTP, FORGOT_PASSWORD purpose).
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError(t('auth:forgot.errorEmail'))
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = (await emailOtpAPI.send(email.trim(), 'FORGOT_PASSWORD')) as
        | { otp?: string }
        | undefined
      setDevOtp(res?.otp)
      setStage('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:forgot.errorSendFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Stage 2 — collect the code and advance. We do NOT pre-verify here: the BE
  // reset-password endpoint verifies the OTP itself (and verifyOTP throws
  // "already verified" if called twice), so a separate /email-otp/verify call
  // would make the final reset fail. The code is validated at the reset step.
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError(t('auth:forgot.errorCodeIncomplete'))
      return
    }
    setError('')
    setStage('reset')
  }

  // Stage 3 — set the new password (BE verifies the OTP, then consumes it).
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!PASSWORD_RULE.test(newPassword)) {
      setError(t('auth:forgot.errorRule'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth:forgot.errorMismatch'))
      return
    }
    try {
      setLoading(true)
      setError('')
      await authAPI.resetPassword(email.trim(), otp, newPassword)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:forgot.errorResetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label={t('auth:register.close')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          {/* Header */}
          {stage !== 'done' && (
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
                {stage === 'email'
                  ? t('auth:forgot.titleEmail')
                  : stage === 'otp'
                  ? t('auth:forgot.titleOtp')
                  : t('auth:forgot.titleReset')}
              </h1>
              <p className="text-base sm:text-lg text-[#777776]">
                {stage === 'email'
                  ? t('auth:forgot.subtitleEmail')
                  : stage === 'otp'
                  ? t('auth:forgot.subtitleOtp', { email })
                  : t('auth:forgot.subtitleReset')}
              </p>
            </div>
          )}

          {devOtp && stage === 'otp' && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-amber-700 text-sm">{t('auth:forgot.devMode')} <span className="font-mono font-bold">{devOtp}</span></p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Stage 1 — email */}
          {stage === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-black mb-2">{t('auth:forgot.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder={t('auth:forgot.emailPlaceholder')}
                  disabled={loading}
                  className={inputCls}
                  required
                />
                <p className="mt-2 text-sm text-gray-600">{t('auth:forgot.emailHint')}</p>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-50 hover:bg-primary-60 text-primary-100 py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? t('auth:forgot.sending') : t('auth:forgot.sendResetCode')}
              </button>
              <button type="button" onClick={handleBackToLogin} className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> {t('auth:forgot.backToLogin')}
              </button>
            </form>
          )}

          {/* Stage 2 — otp */}
          {stage === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-base font-medium text-black mb-2">{t('auth:forgot.codeLabel')}</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
                  placeholder={t('auth:forgot.codePlaceholder')}
                  disabled={loading}
                  className={`${inputCls} tracking-[0.5em] text-center font-mono text-xl`}
                  required
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-primary-50 hover:bg-primary-60 text-primary-100 py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? t('auth:forgot.verifying') : t('auth:forgot.verifyCode')}
              </button>
              <button type="button" onClick={() => { setStage('email'); setOtp(''); setError('') }} className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> {t('auth:forgot.useDifferentEmail')}
              </button>
            </form>
          )}

          {/* Stage 3 — new password */}
          {stage === 'reset' && (
            <form onSubmit={handleReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.newPasswordLabel')}</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:forgot.newPasswordPlaceholder')}
                    disabled={loading}
                    className={`${inputCls} pr-12`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">{t('auth:forgot.passwordHint')}</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.confirmLabel')}</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder={t('auth:forgot.confirmPlaceholder')}
                  disabled={loading}
                  className={inputCls}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-50 hover:bg-primary-60 text-primary-100 py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? t('auth:forgot.saving') : t('auth:forgot.resetPassword')}
              </button>
            </form>
          )}

          {/* Stage 4 — done */}
          {stage === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-black mb-3">{t('auth:forgot.doneTitle')}</h2>
              <p className="text-base text-[#777776] mb-8">{t('auth:forgot.doneBody')}</p>
              <button onClick={handleBackToLogin} className="w-full bg-primary-50 hover:bg-primary-60 text-primary-100 py-3 rounded-lg transition-colors text-base font-medium">
                {t('auth:forgot.backToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
