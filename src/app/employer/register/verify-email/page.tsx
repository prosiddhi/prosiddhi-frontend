'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Link from 'next/link'
import { authAPI, emailOtpAPI, type LoginResult } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

export default function EmployerVerifyEmailPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { data, update, reset } = useEmployerRegistration()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Guard: only reachable after the account is created (password in memory).
  useEffect(() => {
    if (!data.email || !data.password) router.replace('/employer/register')
  }, [data.email, data.password, router])

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000)
      return () => clearInterval(interval)
    } else {
      setCanResend(true)
    }
  }, [timer])

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (error) setError('')
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleResend = async () => {
    if (!canResend || loading) return
    try {
      setError('')
      const res = (await emailOtpAPI.send(data.email, 'REGISTRATION')) as { otp?: string } | undefined
      update({ devEmailOtp: res?.otp })
      setTimer(30)
      setCanResend(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend the code')
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }
    const isIndividual = data.companyType === 'individual'
    try {
      setLoading(true)
      setError('')
      // 1) Verify email (unlocks login). 2) Log in for the JWT. 3) Hand to AuthContext.
      await authAPI.verifyEmailOtp(data.email, code)
      const result = (await authAPI.login('employer', {
        identifier: data.email,
        password: data.password,
      })) as LoginResult
      login(result.token, result.user)
      reset()
      // Individual auto-approves → dashboard. Corporate lands in PENDING_DOCUMENTS.
      router.push(isIndividual ? '/employer' : '/employer/register/under-review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => router.push('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[20px] w-full max-w-[560px] px-6 sm:px-12 py-10 sm:py-14 shadow-xl text-center">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Close">
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">Verify your email</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-2">
          We sent a 6-digit code to <span className="font-medium text-black">{data.email}</span>
        </p>

        {data.devEmailOtp && (
          <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-block">
            <p className="text-amber-700 text-sm">Dev mode — your code is <span className="font-mono font-bold">{data.devEmailOtp}</span></p>
          </div>
        )}

        {error && (
          <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3 justify-center my-8">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-50 transition-all disabled:opacity-50"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
          className="w-full px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying...' : 'Verify & finish'}
        </button>

        <div className="mt-6">
          {canResend ? (
            <button onClick={handleResend} className="text-sm text-primary-50 hover:text-primary-60 font-medium">Resend the code</button>
          ) : (
            <p className="text-sm text-gray-500">Resend the code in {timer}s</p>
          )}
        </div>

        <p className="mt-6 text-xs sm:text-sm text-gray-500">Didn&apos;t receive the email? Check your spam folder.</p>
        <div className="mt-4">
          <Link href="/login" className="text-sm font-semibold text-primary-50 hover:text-primary-60">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
