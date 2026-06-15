'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Link from 'next/link'
import { otpAPI } from '@/lib/api'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

export default function EmployerOTPPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update } = useEmployerRegistration()
  const phoneNumber = data.phoneNumber
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Guard: in-memory flow — a refresh loses the phone; restart.
  useEffect(() => {
    if (!phoneNumber) router.replace('/employer/register/phone')
  }, [phoneNumber, router])

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
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const digits = (e.clipboardData.getData('text/plain').match(/\d/g) || []).slice(0, 6)
    const newOtp = ['', '', '', '', '', '']
    digits.forEach((d, i) => { newOtp[i] = d })
    setOtp(newOtp)
    inputRefs.current[Math.min(digits.length, 5)]?.focus()
  }

  const handleResend = async () => {
    if (!canResend || loading) return
    try {
      setError('')
      await otpAPI.send(phoneNumber)
      setTimer(30)
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employerRegister:otp.resendFailed'))
    }
  }

  const handleNext = async () => {
    const otpValue = otp.join('')
    if (otpValue.length !== 6) return
    try {
      setLoading(true)
      setError('')
      await otpAPI.verify(phoneNumber, otpValue)
      update({ phoneVerified: true })
      // Both types collect account email + password next.
      router.push('/employer/register/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employerRegister:otp.invalid'))
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register/phone')
  const handleClose = () => router.push('/')

  const isOtpComplete = otp.every((digit) => digit !== '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label={t('employerRegister:closeAria')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">{t('employerRegister:title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('employerRegister:otp.sentTo', { phone: phoneNumber })}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <label className="block text-base sm:text-lg font-medium text-black mb-4">{t('employerRegister:otp.label')}</label>
            <div className="flex gap-2 sm:gap-3 justify-center mb-4">
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
                  onPaste={handlePaste}
                  disabled={loading}
                  className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-50 transition-all disabled:opacity-50"
                />
              ))}
            </div>
            <div className="text-left">
              {canResend ? (
                <button onClick={handleResend} className="text-sm sm:text-base text-primary-50 hover:text-primary-60 font-medium transition-colors">
                  {t('employerRegister:otp.resendQuestion')}
                </button>
              ) : (
                <p className="text-sm sm:text-base text-gray-500">{t('employerRegister:otp.resendIn', { seconds: timer })}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]">
              {t('buttons.back')}
            </button>
            <button
              onClick={handleNext}
              disabled={!isOtpComplete || loading}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? t('employerRegister:otp.verifying') : t('buttons.next')}
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">{t('employerRegister:signInPrompt')}</span>
              <Link href="/login" className="font-semibold text-primary-50 hover:text-primary-60 transition-colors">{t('employerRegister:signInLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
