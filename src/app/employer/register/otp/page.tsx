'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Link from 'next/link'

export default function EmployerOTPPage() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCanResend(true)
    }
  }, [timer])

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6)
    const digits = pastedData.match(/\d/g) || []
    
    const newOtp = [...otp]
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit
      }
    })
    setOtp(newOtp)

    // Focus last filled input or next empty
    const lastFilledIndex = Math.min(digits.length, 5)
    inputRefs.current[lastFilledIndex]?.focus()
  }

  const handleResend = () => {
    if (canResend) {
      // Call API to resend OTP
      console.log('Resending OTP...')
      
      // Reset timer
      setTimer(30)
      setCanResend(false)
      
      // Clear OTP
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const handleNext = () => {
    const otpValue = otp.join('')
    
    if (otpValue.length === 6) {
      // Verify OTP (call API here)
      console.log('Verifying OTP:', otpValue)
      
      // Get company type from localStorage
      const companyType = localStorage.getItem('companyType')
      
      // Save OTP verification status
      localStorage.setItem('otpVerified', 'true')
      
      // Navigate based on company type
      if (companyType === 'corporate') {
        router.push('/employer/register/company-details')
      } else {
        // For individual, skip company details and go to account setup
        router.push('/employer/register/account')
      }
    }
  }

  const handleBack = () => {
    router.push('/employer/register/phone')
  }

  const handleClose = () => {
    router.push('/')
  }

  const isOtpComplete = otp.every(digit => digit !== '')

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

          {/* OTP Input Section */}
          <div className="mb-8">
            <label className="block text-base sm:text-lg font-medium text-black mb-4">
              Enter the OTP Number
            </label>

            {/* OTP Input Boxes */}
            <div className="flex gap-2 sm:gap-3 justify-center mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-50 transition-all"
                />
              ))}
            </div>

            {/* Resend OTP */}
            <div className="text-left">
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="text-sm sm:text-base text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Resend the OTP?
                </button>
              ) : (
                <p className="text-sm sm:text-base text-red-500">
                  Resend the OTP? {timer}s
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
              disabled={!isOtpComplete}
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
