'use client'

import { useState } from 'react'
import { Volume2, Eye, EyeOff, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (email && password) {
      // Save login credentials
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      }
      
      console.log('Login:', { email, password, rememberMe })
      
      // Navigate to job feed
      router.push('/job-feed')
    }
  }

  const handleClose = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Login Modal */}
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
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
              Login to Azkashine Job Portal
            </h1>
            <p className="text-base sm:text-lg text-[#777776]">
              Welcome back, Please enter the details
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
                  placeholder="Enter Email"
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
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-base font-medium text-black mb-2">
                Password
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the Password"
                    className="w-full h-12 sm:h-14 px-4 pr-12 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  aria-label="Play audio"
                >
                  <Volume2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border border-[#aaaaaa] rounded cursor-pointer accent-primary-50"
                />
                <span className="text-sm text-black">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium"
            >
              Sign In
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-black">Don't have an account? </span>
              <Link
                href="/register"
                className="font-semibold text-secondary-50 hover:text-secondary-60 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
