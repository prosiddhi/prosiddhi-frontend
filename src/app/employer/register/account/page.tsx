'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function AccountSetupPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleNext = () => {
    // Validate passwords
    if (!password || password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    // Save password (in production, hash this!)
    localStorage.setItem('employerPassword', password)
    console.log('Password set')
    
    // Navigate to email verification
    router.push('/employer/register/verify-email')
  }

  const handleBack = () => {
    const companyType = localStorage.getItem('companyType')
    
    // If corporate, go back to company details
    // If individual, go back to OTP
    if (companyType === 'corporate') {
      router.push('/employer/register/company-details')
    } else {
      router.push('/employer/register/otp')
    }
  }

  const handleClose = () => {
    router.push('/')
  }

  const isPasswordValid = password.length >= 8
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Registration Modal */}
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">
              Employer Registration
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Create a account for the Hiring People
            </p>
          </div>

          {/* Password Fields */}
          <div className="mb-8 space-y-6">
            {/* Enter Password */}
            <div>
              <label htmlFor="password" className="block text-base sm:text-lg font-medium text-black mb-3">
                Enter the Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                At least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-base sm:text-lg font-medium text-black mb-3">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword && !doPasswordsMatch && (
                <p className="mt-2 text-xs sm:text-sm text-red-500">
                  Passwords do not match
                </p>
              )}
              {confirmPassword && doPasswordsMatch && (
                <p className="mt-2 text-xs sm:text-sm text-green-500">
                  Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]"
            >
              Back
            </button>

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={!isPasswordValid || !doPasswordsMatch}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              Next
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">Already have an account? </span>
              <Link
                href="/login"
                className="font-semibold text-primary-50 hover:text-primary-60 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
