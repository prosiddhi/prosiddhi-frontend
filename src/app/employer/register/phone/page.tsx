'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Link from 'next/link'
import { otpAPI } from '@/lib/api'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

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

export default function EmployerPhoneNumberPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { update } = useEmployerRegistration()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value.replace(/\D/g, ''))
    if (error) setError('')
  }

  const handleNext = async () => {
    const e164 = toE164(phoneNumber)
    if (!e164) {
      setError(t('employerRegister:phone.invalid'))
      return
    }
    try {
      setLoading(true)
      setError('')
      await otpAPI.send(e164)
      update({ phoneNumber: e164, phoneVerified: false })
      router.push('/employer/register/otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employerRegister:phone.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register')
  const handleClose = () => router.push('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label={t('employerRegister:closeAria')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">{t('employerRegister:title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('employerRegister:subtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="phone" className="block text-base sm:text-lg font-medium text-black mb-3">
              {t('employerRegister:phone.label')} <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder={t('employerRegister:phone.placeholder')}
              maxLength={10}
              disabled={loading}
              className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
            />
            {phoneNumber && phoneNumber.length < 10 && (
              <p className="mt-2 text-sm text-red-500">{t('employerRegister:phone.mustBe10Digits')}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]">
              {t('buttons.back')}
            </button>
            <button
              onClick={handleNext}
              disabled={phoneNumber.length < 10 || loading}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? t('employerRegister:phone.sending') : t('buttons.next')}
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
