'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X, ImageIcon, Pencil } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

export default function RegisterProfilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update } = useSeekerRegistration()

  const [fullName, setFullName] = useState(data.fullName)
  const [email, setEmail] = useState(data.email)
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth)
  const [gender, setGender] = useState(data.gender)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guard: in-memory flow — require a verified phone before this step.
  useEffect(() => {
    if (!data.phoneVerified) router.replace('/register/phone')
  }, [data.phoneVerified, router])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    update({ profilePic: file })
    const reader = new FileReader()
    reader.onloadend = () => setProfileImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const validateForm = () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(t('auth:profile.errorName'))
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      setError(t('auth:profile.errorEmail'))
      return false
    }
    // BR-1: DOB + gender are required in the UI but held client-side only
    // (the BE has no field for them yet — see docs/be-requests.md).
    if (!dateOfBirth) {
      setError(t('auth:profile.errorDob'))
      return false
    }
    if (!gender) {
      setError(t('auth:profile.errorGender'))
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateForm()) return
    update({ fullName: fullName.trim(), email: email.trim(), dateOfBirth, gender })
    router.push('/register/categories')
  }

  const handleBack = () => router.push('/register/otp')

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:profile.panelHeading')}
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
                <span className="text-[18px]">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <RegistrationProgress step="profile" onBack={handleBack} className="mb-16" />

            <div className="max-w-[1200px]">
              <div className="mb-16">
                <h1 className="text-[56px] font-bold text-black leading-tight mb-4">{t('auth:profile.title')}</h1>
                <p className="text-[24px] text-[#767676]">{t('auth:profile.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[953px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Profile Image */}
              <div className="mb-12 max-w-[953px]">
                <label className="text-[20px] font-medium text-black mb-6 block">{t('auth:profile.profilePicture')}</label>
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
                    <span>{t('auth:profile.uploadPhoto')}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-8 mb-12">
                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">{t('auth:profile.fullNameLabel')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:profile.fullNamePlaceholder')}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">{t('auth:profile.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:profile.emailPlaceholder')}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">{t('auth:profile.dobLabel')}</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => { setDateOfBirth(e.target.value); if (error) setError('') }}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  />
                </div>

                <div className="max-w-[953px]">
                  <label className="text-[20px] font-medium text-black mb-6 block">{t('auth:profile.genderLabel')}</label>
                  <select
                    value={gender}
                    onChange={(e) => { setGender(e.target.value); if (error) setError('') }}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px]"
                  >
                    <option value="">{t('auth:profile.genderSelect')}</option>
                    <option value="MALE">{t('auth:profile.genderMale')}</option>
                    <option value="FEMALE">{t('auth:profile.genderFemale')}</option>
                    <option value="OTHER">{t('auth:profile.genderOther')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end max-w-[953px]">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-white px-12 py-3 rounded-lg hover:bg-primary-60"
                >
                  <span className="text-[20px]">{t('buttons.next')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
          <button onClick={handleBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
          <div className="relative w-[140px] h-[40px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm">
            <span>{t('auth:register.close')}</span><X className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">{t('auth:profile.title')}</h1>
          <p className="text-base text-gray-600 mb-8">{t('auth:profile.subtitle')}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div>
              <label className="text-base font-medium mb-2 block">{t('auth:profile.fullNameLabel')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                className="w-full h-14 px-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">{t('auth:profile.emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                className="w-full h-14 px-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">{t('auth:profile.dobLabel')}</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => { setDateOfBirth(e.target.value); if (error) setError('') }}
                className="w-full h-14 px-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">{t('auth:profile.genderLabel')}</label>
              <select
                value={gender}
                onChange={(e) => { setGender(e.target.value); if (error) setError('') }}
                className="w-full h-14 px-3 border rounded-lg"
              >
                <option value="">{t('auth:profile.genderSelect')}</option>
                <option value="MALE">{t('auth:profile.genderMale')}</option>
                <option value="FEMALE">{t('auth:profile.genderFemale')}</option>
                <option value="OTHER">{t('auth:profile.genderOther')}</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-white py-3 rounded-lg"
          >
            <span>{t('buttons.next')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
