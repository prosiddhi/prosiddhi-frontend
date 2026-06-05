'use client'

import { useState } from 'react'
import { Volume2, ChevronRight, ChevronLeft, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'

export default function RegisterPhonePage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Call API to register phone number
      await jobSeekerAPI.registerPhone({ phoneNumber })
      
      // Save phone number for OTP verification
      localStorage.setItem('phoneNumber', phoneNumber)
      console.log('✅ Phone registered:', phoneNumber)
      
      // Navigate to OTP verification
      router.push('/register/otp')
    } catch (err) {
      console.error('❌ Registration error:', err)
      setError(err instanceof Error ? err.message : 'Failed to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Blue Section (Fixed Width) */}
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            {/* Text Content */}
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                Your Next Opportunity Is Just a Click Away
              </h2>
            </div>

            {/* Illustration at Bottom */}
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image
                  src="/assets/421.svg"
                  alt="Job Portal Illustration"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form (Flexible Width) */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            {/* Header with Logo and Close */}
            <div className="flex items-start justify-between mb-24">
              <div className="relative w-[236px] h-[66px]">
                <Image
                  src="/assets/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-5 py-3 rounded-lg hover:bg-error-600 transition-colors">
                <span className="text-[18px]">Close</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-3 mb-16">
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[8px] bg-primary-50 rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
              </div>
              <span className="text-[#767676] text-[16px] ml-2">Step 1 of 5</span>
            </div>

            {/* Main Content */}
            <div className="max-w-[1200px]">
              <div className="mb-16">
                <h1 className="text-[56px] font-bold text-black leading-tight mb-4">
                  Enter your phone number
                </h1>
                <p className="text-[24px] text-[#767676]">
                  We'll send you a verification code
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[953px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Phone Number Input */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <label htmlFor="phone" className="text-[20px] font-medium text-black">
                    Phone number *
                  </label>
                  <button className="flex items-center gap-2 text-primary-50 hover:text-primary-60">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Enter your phone number"
                  disabled={loading}
                  className="w-full max-w-[953px] h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              {/* Next Button */}
              <div className="flex justify-end max-w-[953px]">
                <button
                  onClick={handleNext}
                  disabled={!phoneNumber.trim() || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-[20px]">{loading ? 'Sending...' : 'Next'}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/assets/logo.png"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-error-600">
            <span>Close</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        {/* Progress */}
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-[30px] h-[8px] bg-primary-50 rounded"></div>
            <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
            <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
            <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
            <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
          </div>
          <span className="text-sm text-gray-600">Step 1 of 5</span>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            Enter your phone number
          </h1>
          <p className="text-base text-gray-600 mb-8">
            We'll send you a verification code
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="phone-mobile" className="text-base font-medium text-black mb-4 block flex items-center gap-2">
              Phone number *
              <button className="text-primary-50">
                <Volume2 className="w-4 h-4" />
              </button>
            </label>
            <input
              id="phone-mobile"
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                if (error) setError('')
              }}
              placeholder="Enter your phone number"
              disabled={loading}
              className="w-full h-14 px-3 border border-gray-300 rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!phoneNumber.trim() || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-50 text-white px-6 py-3 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50"
          >
            <span className="text-lg">{loading ? 'Sending...' : 'Next'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Blue Section */}
        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white leading-tight mb-4">
            Your Next Opportunity Is Just a Click Away
          </h2>
          <div className="relative w-full h-48">
            <Image
              src="/assets/421.svg"
              alt="Illustration"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
