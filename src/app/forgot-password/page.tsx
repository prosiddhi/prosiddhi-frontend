'use client'

import { useState } from 'react'
import { X, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { emailOtpAPI, authAPI } from '@/lib/api'

// Mirrors the BE resetPasswordSchema (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

type Stage = 'email' | 'otp' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
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
      setError('Please enter a valid email')
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
      setError(err instanceof Error ? err.message : 'Failed to send the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Stage 2 — confirm the OTP is valid before asking for a new password.
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    try {
      setLoading(true)
      setError('')
      await emailOtpAPI.verify(email.trim(), otp, 'FORGOT_PASSWORD')
      setStage('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  // Stage 3 — set the new password (BE re-checks the OTP, then consumes it).
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!PASSWORD_RULE.test(newPassword)) {
      setError('Password needs 8+ characters with an uppercase, a lowercase, and a number')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    try {
      setLoading(true)
      setError('')
      await authAPI.resetPassword(email.trim(), otp, newPassword)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Close">
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          {/* Header */}
          {stage !== 'done' && (
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
                {stage === 'email' ? 'Forgot Password' : stage === 'otp' ? 'Enter the code' : 'Set a new password'}
              </h1>
              <p className="text-base sm:text-lg text-[#777776]">
                {stage === 'email'
                  ? 'Enter your email to reset your password'
                  : stage === 'otp'
                  ? `We sent a 6-digit code to ${email}`
                  : 'Choose a strong password you’ll remember'}
              </p>
            </div>
          )}

          {devOtp && stage === 'otp' && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-amber-700 text-sm">Dev mode — your code is <span className="font-mono font-bold">{devOtp}</span></p>
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
                <label htmlFor="email" className="block text-base font-medium text-black mb-2">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder="Enter your email"
                  disabled={loading}
                  className={inputCls}
                  required
                />
                <p className="mt-2 text-sm text-gray-600">We&apos;ll send a 6-digit reset code to this email.</p>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset code'}
              </button>
              <button type="button" onClick={handleBackToLogin} className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </form>
          )}

          {/* Stage 2 — otp */}
          {stage === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-base font-medium text-black mb-2">6-digit code</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
                  placeholder="------"
                  disabled={loading}
                  className={`${inputCls} tracking-[0.5em] text-center font-mono text-xl`}
                  required
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
              <button type="button" onClick={() => { setStage('email'); setOtp(''); setError('') }} className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Use a different email
              </button>
            </form>
          )}

          {/* Stage 3 — new password */}
          {stage === 'reset' && (
            <form onSubmit={handleReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-base font-medium text-black mb-2">New Password</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }}
                    placeholder="Create a new password"
                    disabled={loading}
                    className={`${inputCls} pr-12`}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">At least 8 characters, with an uppercase, a lowercase, and a number.</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-base font-medium text-black mb-2">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder="Re-enter your new password"
                  disabled={loading}
                  className={inputCls}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Reset password'}
              </button>
            </form>
          )}

          {/* Stage 4 — done */}
          {stage === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-black mb-3">Password reset</h2>
              <p className="text-base text-[#777776] mb-8">Your password has been updated. You can now sign in with your new password.</p>
              <button onClick={handleBackToLogin} className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
