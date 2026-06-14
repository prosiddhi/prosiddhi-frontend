'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, X, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

// Mirrors the BE setPasswordSchema (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export default function RegisterPasswordPage() {
  const router = useRouter()
  const { data, update } = useSeekerRegistration()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Guard: must have reached here through the full flow.
  useEffect(() => {
    if (!data.preferredJobTitle || !data.email) router.replace('/register/phone')
  }, [data.preferredJobTitle, data.email, router])

  const handleCreate = async () => {
    if (!PASSWORD_RULE.test(password)) {
      setError('Password needs 8+ characters with an uppercase, a lowercase, and a number')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      setError('')

      // 1) Create the seeker (BE auto-sends the email-verification OTP).
      const result = await jobSeekerAPI.register({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        preferredSector: data.preferredSector,
        preferredJobTitle: data.preferredJobTitle,
        preferredLanguage: data.language,
        workExperiences: data.workExperiences,
        profilePic: data.profilePic,
        document: data.document,
      })

      // 2) Set the account password.
      await jobSeekerAPI.setPassword(data.email, password)

      // Hold the password in memory ONLY (never localStorage) — the verify step
      // needs it to log in after email verification. devEmailOtp is echoed by
      // the BE in non-production to make dev/QA verification easy.
      update({ password, devEmailOtp: result?.emailVerification?.otp })

      router.push('/register/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/register/experience')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                Secure Your Account
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-16 py-8 lg:py-16">
            <div className="flex items-start justify-between mb-10 lg:mb-24">
              <div className="relative w-[160px] lg:w-[236px] h-[44px] lg:h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-[18px]">Close</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <div className="flex items-center gap-3 mb-10 lg:mb-16">
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <span className="text-[#767676] text-[16px] ml-2">Step 7 of 7</span>
            </div>

            <div className="max-w-[953px]">
              <div className="mb-10 lg:mb-16">
                <h1 className="text-3xl lg:text-[56px] font-bold text-black leading-tight mb-4">Create a password</h1>
                <p className="text-base lg:text-[24px] text-[#767676]">You&apos;ll use this to sign in</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-8 mb-12">
                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                      placeholder="Create a password"
                      disabled={loading}
                      className="w-full h-14 lg:h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px]"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">At least 8 characters, with an uppercase, a lowercase, and a number.</p>
                </div>

                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                      placeholder="Confirm your password"
                      disabled={loading}
                      className="w-full h-14 lg:h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px]"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      {showConfirm ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-white px-8 lg:px-12 py-3 rounded-lg hover:bg-primary-60 disabled:opacity-50"
                >
                  <span className="text-base lg:text-[20px]">{loading ? 'Creating account...' : 'Create account'}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
