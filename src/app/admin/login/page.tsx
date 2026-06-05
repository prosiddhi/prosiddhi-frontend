'use client'

import { useState } from 'react'
import { Eye, EyeOff, ChevronRight, X, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      if (!email.trim() || !password) {
        setError('Please enter email and password')
        return
      }

      if (email === 'admin@jobportal.com' && password === 'admin123') {
        console.log('✅ Admin login successful')
        router.push('/admin/dashboard')
      } else {
        throw new Error('Invalid credentials')
      }
      
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin()
    }
  }

  return (
    <div className="relative min-h-screen bg-white">
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <div className="mb-8">
                <Shield className="w-16 h-16 text-white mb-4" />
              </div>
              <h2 className="text-[40px] font-bold text-white leading-[1.2]">
                Admin Portal Access
              </h2>
              <p className="text-white/80 mt-4 text-lg">
                Secure access to manage the job portal
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            <div className="flex items-start justify-between mb-24">
              <div className="relative w-[236px] h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-5 py-3 rounded-lg transition-colors">
                <span className="text-[18px]">Close</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <div className="max-w-[1200px]">
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-10 h-10 text-primary-50" />
                  <h1 className="text-[56px] font-bold text-black leading-tight">Admin Login</h1>
                </div>
                <p className="text-[24px] text-[#767676]">Access the admin dashboard</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[953px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-[953px]">
                <p className="text-sm text-blue-800 font-medium mb-1">Demo Credentials:</p>
                <p className="text-sm text-blue-600">Email: admin@jobportal.com</p>
                <p className="text-sm text-blue-600">Password: admin123</p>
              </div>

              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <label htmlFor="email" className="text-[20px] font-medium text-black">Admin Email *</label>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter admin email"
                  disabled={loading}
                  className="w-full max-w-[953px] h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <label htmlFor="password" className="text-[20px] font-medium text-black">Password *</label>
                </div>
                <div className="relative max-w-[953px]">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter admin password"
                    disabled={loading}
                    className="w-full h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-[24px] h-[24px] text-gray-600" /> : <Eye className="w-[24px] h-[24px] text-gray-600" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end max-w-[953px] mb-16">
                <button
                  onClick={handleLogin}
                  disabled={!email.trim() || !password || loading}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-[20px]">{loading ? 'Signing In...' : 'Sign In'}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="relative w-[140px] h-[40px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
          </div>
          <Link href="/" className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-3 py-2 rounded-lg transition-colors">
            <span className="text-sm">Close</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary-50" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-black">Admin Login</h1>
              <p className="text-base text-[#767676]">Access the admin dashboard</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">Demo: admin@jobportal.com / admin123</p>
          </div>

          <div className="mb-6">
            <label htmlFor="email-mobile" className="text-base font-medium text-black mb-4 block">Admin Email *</label>
            <input
              id="email-mobile"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter admin email"
              disabled={loading}
              className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password-mobile" className="text-base font-medium text-black mb-4 block">Password *</label>
            <div className="relative">
              <input
                id="password-mobile"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
                disabled={loading}
                className="w-full h-14 px-3 pr-12 border border-[#b5b5b5] rounded-[10px] text-base"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={!email.trim() || !password || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-50 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
