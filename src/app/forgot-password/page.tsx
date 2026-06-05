'use client'

import { useState } from 'react'
import { Volume2, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (email) {
      // Here you would call your API to send reset password email
      console.log('Reset password for:', email)
      
      // Show success message
      setIsSubmitted(true)
    }
  }

  const handleClose = () => {
    router.push('/')
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Forgot Password Modal */}
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
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
                  Forgot Password
                </h1>
                <p className="text-base sm:text-lg text-[#777776]">
                  Enter your email to reset your password
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-base font-medium text-black mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                      aria-label="Play audio"
                    >
                      <Volume2 className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    We'll send you a password reset link to this email
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium"
                >
                  Send Reset Link
                </button>

                {/* Back to Login */}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                {/* Success Icon */}
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-semibold text-black mb-3">
                  Check Your Email
                </h2>
                <p className="text-base text-[#777776] mb-6">
                  We've sent a password reset link to
                </p>
                <p className="text-base font-medium text-black mb-8">
                  {email}
                </p>
                <p className="text-sm text-gray-600 mb-8">
                  Didn't receive the email? Check your spam folder or
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setIsSubmitted(false)
                      setEmail('')
                    }}
                    className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium"
                  >
                    Try Another Email
                  </button>

                  <button
                    onClick={handleBackToLogin}
                    className="w-full flex items-center justify-center gap-2 text-primary-50 hover:text-primary-60 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
