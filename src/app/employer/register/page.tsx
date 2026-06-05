'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, User, Building2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function EmployerRegistrationPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'individual' | 'corporate' | null>(null)

  const handleNext = () => {
    if (selectedType) {
      // Save company type
      localStorage.setItem('companyType', selectedType)
      console.log('Company type:', selectedType)
      
      // Navigate to phone number step
      router.push('/employer/register/phone')
    }
  }

  const handleClose = () => {
    router.push('/')
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

          {/* Company Type Section */}
          <div className="mb-8">
            <label className="block text-base sm:text-lg font-medium text-black mb-4">
              Choose the Company Type
            </label>

            {/* Company Type Options */}
            <div className="space-y-3">
              {/* Individual Option */}
              <button
                onClick={() => setSelectedType('individual')}
                className={`w-full border-2 rounded-lg p-4 flex items-center justify-between transition-all ${
                  selectedType === 'individual'
                    ? 'border-primary-50 bg-[#e3f5ff]'
                    : 'border-gray-300 bg-white hover:border-primary-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon Container */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedType === 'individual'
                      ? 'bg-white'
                      : 'bg-gray-100'
                  }`}>
                    <User className={`w-6 h-6 ${
                      selectedType === 'individual'
                        ? 'text-primary-50'
                        : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Text */}
                  <div className="text-left">
                    <h3 className={`text-base sm:text-lg font-semibold ${
                      selectedType === 'individual'
                        ? 'text-black'
                        : 'text-gray-900'
                    }`}>
                      Individual
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Owned by personally
                    </p>
                  </div>
                </div>

                {/* Arrow Icon */}
                <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                  selectedType === 'individual'
                    ? 'text-black'
                    : 'text-gray-400'
                }`} />
              </button>

              {/* Corporate Option */}
              <button
                onClick={() => setSelectedType('corporate')}
                className={`w-full border-2 rounded-lg p-4 flex items-center justify-between transition-all ${
                  selectedType === 'corporate'
                    ? 'border-primary-50 bg-[#e3f5ff]'
                    : 'border-gray-300 bg-white hover:border-primary-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon Container */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedType === 'corporate'
                      ? 'bg-white'
                      : 'bg-gray-100'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      selectedType === 'corporate'
                        ? 'text-primary-50'
                        : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Text */}
                  <div className="text-left">
                    <h3 className={`text-base sm:text-lg font-semibold ${
                      selectedType === 'corporate'
                        ? 'text-black'
                        : 'text-gray-900'
                    }`}>
                      Corporate
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Owned by Shareholder
                    </p>
                  </div>
                </div>

                {/* Arrow Icon */}
                <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                  selectedType === 'corporate'
                    ? 'text-black'
                    : 'text-gray-400'
                }`} />
              </button>
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={!selectedType}
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
