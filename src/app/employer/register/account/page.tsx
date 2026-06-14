'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { employerAPI } from '@/lib/api'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

// Mirrors the BE setPasswordSchema (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export default function AccountSetupPage() {
  const router = useRouter()
  const { data, update } = useEmployerRegistration()
  const isIndividual = data.companyType === 'individual'

  const [fullName, setFullName] = useState(data.fullName)
  const [designation, setDesignation] = useState(data.designation)
  const [email, setEmail] = useState(data.email)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Guard: require a verified phone first.
  useEffect(() => {
    if (!data.phoneVerified) router.replace('/employer/register/phone')
  }, [data.phoneVerified, router])

  const handleNext = async () => {
    if (isIndividual && fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }
    if (!PASSWORD_RULE.test(password)) {
      setError('Password needs 8+ characters with an uppercase, a lowercase, and a number')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Persist account fields to in-memory context (password never to storage).
    update({ email: email.trim(), password, fullName: fullName.trim(), designation })

    // Corporate collects company details next, then registers there.
    if (!isIndividual) {
      router.push('/employer/register/company-details')
      return
    }

    // Individual registers now (JSON), then sets the password.
    try {
      setLoading(true)
      setError('')
      const result = await employerAPI.registerIndividual({
        email: email.trim(),
        fullName: fullName.trim(),
        phoneNumber: data.phoneNumber,
        designation: designation.trim() || undefined,
      })
      await employerAPI.setPassword(email.trim(), password)
      update({ devEmailOtp: result?.emailVerification?.otp })
      router.push('/employer/register/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register/otp')
  const handleClose = () => router.push('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label="Close">
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">Employer Registration</h1>
            <p className="text-sm sm:text-base text-gray-600">Create a account for the Hiring People</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8 space-y-6">
            {isIndividual && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-base sm:text-lg font-medium text-black mb-3">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                    placeholder="Enter your full name"
                    disabled={loading}
                    className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="designation" className="block text-base sm:text-lg font-medium text-black mb-3">
                    Designation <span className="text-gray-400 text-sm">(optional)</span>
                  </label>
                  <input
                    id="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Owner, Manager"
                    disabled={loading}
                    className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-base sm:text-lg font-medium text-black mb-3">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                placeholder="Enter your email"
                disabled={loading}
                className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base sm:text-lg font-medium text-black mb-3">
                Enter the Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                  disabled={loading}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">At least 8 characters, with an uppercase, a lowercase, and a number.</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-base sm:text-lg font-medium text-black mb-3">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  disabled={loading}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]">
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? 'Creating...' : isIndividual ? 'Create account' : 'Next'}
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="font-semibold text-primary-50 hover:text-primary-60 transition-colors">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
