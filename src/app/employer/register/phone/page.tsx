'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EmployerPhoneNumberPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('')

  const handleNext = () => {
    if (phoneNumber && phoneNumber.length >= 10) {
      // Save phone number
      localStorage.setItem('employerPhone', phoneNumber)
      console.log('Phone number:', phoneNumber)
      
      // Navigate to OTP verification
      router.push('/employer/register/otp')
    }
  }

  const handleBack = () => {
    router.push('/employer/register')
  }

  const handleClose = () => {
    router.push('/')
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '')
    setPhoneNumber(value)
  }

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

          {/* Phone Number Input */}
          <div className="mb-8">
            <label htmlFor="phone" className="block text-base sm:text-lg font-medium text-black mb-3">
              Enter Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="Enter the Phone Number"
              maxLength={10}
              className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
            />
            {phoneNumber && phoneNumber.length < 10 && (
              <p className="mt-2 text-sm text-red-500">
                Phone number must be 10 digits
              </p>
            )}
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
              disabled={!phoneNumber || phoneNumber.length < 10}
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
