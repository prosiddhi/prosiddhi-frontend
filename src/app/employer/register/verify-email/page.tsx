'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, RefreshCw } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleResendEmail = async () => {
    setIsResending(true)
    
    // Simulate API call to resend email
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsResending(false)
    setResendSuccess(true)
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setResendSuccess(false)
    }, 3000)
  }

  const handleVerifyEmail = () => {
    // In production, this would be handled by email link click
    // For now, just navigate to the workers page
    console.log('Email verified!')
    
    // Save registration completion
    localStorage.setItem('registrationComplete', 'true')
    
    // Navigate to workers page (will be created later)
    router.push('/employer/workers')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Verification Card */}
      <div className="bg-white border border-[#dedede] rounded-[20px] w-full max-w-[500px] px-6 sm:px-12 py-12 sm:py-16 shadow-xl text-center">
        {/* Email Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
            <Image
              src="/assets/letter.png"
              alt="Email Verification"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-4">
          Almost There
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 mb-2 max-w-md mx-auto">
          Please confirm the email address by clicking the link
        </p>
        <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
          in the email we just send you
        </p>

        {/* Resend Link */}
        <button
          onClick={handleResendEmail}
          disabled={isResending}
          className="inline-flex items-center gap-2 text-sm sm:text-base text-primary-50 hover:text-primary-60 transition-colors mb-8 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
          {isResending ? 'Sending...' : 'Resend the Confirmation Email'}
        </button>

        {/* Success Message */}
        {resendSuccess && (
          <p className="text-sm text-green-600 mb-8 animate-fadeIn">
            Email sent successfully!
          </p>
        )}

        {/* Verify Button - For demo purposes */}
        <button
          onClick={handleVerifyEmail}
          className="w-full px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-base font-medium"
        >
          Verify the email
        </button>

        {/* Helper Text */}
        <p className="mt-6 text-xs sm:text-sm text-gray-500">
          Didn't receive the email? Check your spam folder
        </p>
      </div>
    </div>
  )
}
