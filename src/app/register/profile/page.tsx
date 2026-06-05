'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { Volume2, ChevronRight, ChevronLeft, X, ImageIcon, Pencil, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobSeekerAPI } from '@/lib/api'

export default function RegisterProfilePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    languagePreference: ''
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if user came from OTP verification
    const phoneNumber = localStorage.getItem('phoneNumber')
    if (!phoneNumber) {
      router.push('/register/phone')
    }
  }, [router])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter your name')
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email')
      return false
    }
    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth')
      return false
    }
    if (!formData.gender) {
      setError('Please select your gender')
      return false
    }
    if (!formData.languagePreference) {
      setError('Please select your language preference')
      return false
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError('')
      
      // Call API to complete profile
      await jobSeekerAPI.completeProfile(formData)
      
      console.log('✅ Profile completed successfully')
      
      // Save to localStorage for next steps
      localStorage.setItem('profileData', JSON.stringify(formData))
      
      // Navigate to categories selection
      router.push('/register/categories')
    } catch (err) {
      console.error('❌ Profile completion error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/register/otp')
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                Tell Us About Yourself
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
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            <div className="flex items-start justify-between mb-24">
              <div className="relative w-[236px] h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-5 py-3 rounded-lg hover:bg-error-600">
                <span className="text-[18px]">Close</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center gap-3 mb-16">
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[8px] bg-primary-50 rounded"></div>
                <div className="w-[30px] h-[8px] bg-primary-50 rounded"></div>
                <div className="w-[30px] h-[8px] bg-primary-50 rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
                <div className="w-[30px] h-[8px] bg-[#E0E0E0] rounded"></div>
              </div>
              <span className="text-[#767676] text-[16px] ml-2">Step 3 of 5</span>
            </div>

            <div className="max-w-[1200px]">
              <div className="mb-16">
                <h1 className="text-[56px] font-bold text-black leading-tight mb-4">Complete your profile</h1>
                <p className="text-[24px] text-[#767676]">Help us know you better</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[953px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Profile Image */}
              <div className="mb-12 max-w-[953px]">
                <label className="text-[20px] font-medium text-black mb-6 block">Profile Picture</label>
                <div className="flex items-center gap-6">
                  <div className="relative w-[120px] h-[120px] rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <Image src={profileImage} alt="Profile" fill className="object-cover" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Pencil className="w-5 h-5" />
                    <span>Upload Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-8 mb-12">
                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Language Preference *</label>
                  <select
                    value={formData.languagePreference}
                    onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  >
                    <option value="">Select language</option>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="tamil">Tamil</option>
                    <option value="telugu">Telugu</option>
                    <option value="kannada">Kannada</option>
                    <option value="malayalam">Malayalam</option>
                  </select>
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="Create a password"
                      disabled={loading}
                      className="w-full h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Minimum 8 characters</p>
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="Confirm your password"
                      disabled={loading}
                      className="w-full h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                    />
                    <button
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                    >
                      {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end max-w-[953px]">
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2 bg-primary-50 text-white px-12 py-3 rounded-lg hover:bg-primary-60 disabled:opacity-50"
                >
                  <span className="text-[20px]">{loading ? 'Saving...' : 'Next'}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Similar structure */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Mobile implementation similar to desktop but responsive */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
          <button onClick={handleBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
          <div className="relative w-[140px] h-[40px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm">
            <span>Close</span><X className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Complete your profile</h1>
          <p className="text-base text-gray-600 mb-8">Help us know you better</p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {/* Mobile form fields - same structure, adjusted sizes */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="text-base font-medium mb-2 block">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full h-14 px-3 border rounded-lg"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="text-base font-medium mb-2 block">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full h-14 px-3 border rounded-lg"
                disabled={loading}
              />
            </div>
            
            {/* Add other fields similarly */}
          </div>
          
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-50 text-white py-3 rounded-lg disabled:opacity-50"
          >
            <span>{loading ? 'Saving...' : 'Next'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
