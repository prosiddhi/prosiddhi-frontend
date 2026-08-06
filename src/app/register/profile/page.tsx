'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X, ImageIcon, Pencil } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { emailOtpAPI } from '@/lib/api'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

/**
 * Mirrors the BE `dateOfBirthSchema` refinement (auth.validator.ts): the date
 * must be in the past AND indicate age >= 18. Same calendar arithmetic — the
 * year difference, stepped back one if the birthday has not occurred yet — so
 * the two cannot disagree on a boundary date.
 *
 * `iso` is the YYYY-MM-DD an <input type="date"> produces.
 */
function isAtLeast18(iso: string): boolean {
  const dob = new Date(iso)
  if (isNaN(dob.getTime())) return false
  const now = new Date()
  if (dob >= now) return false
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age >= 18
}

export default function RegisterProfilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()

  const [fullName, setFullName] = useState(data.fullName)
  const [email, setEmail] = useState(data.email)
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth)
  const [gender, setGender] = useState(data.gender)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guard: require a verified phone. Waits for the sessionStorage restore.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneVerified) router.replace('/register/phone')
  }, [hydrated, data.phoneVerified, router])

  // Restored progress arrives after the first render, so seed the inputs from
  // it once — without clobbering anything already typed on this screen.
  useEffect(() => {
    if (!hydrated) return
    setFullName((prev) => prev || data.fullName)
    setEmail((prev) => prev || data.email)
    setDateOfBirth((prev) => prev || data.dateOfBirth)
    setGender((prev) => prev || data.gender)
    // Seeding from the restore is a one-shot effect keyed on `hydrated`; adding
    // the data fields here would re-run it on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

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
    // Email is OPTIONAL — the seeker is often an unskilled worker with no email
    // address at all (PRODUCT.md §2), and the backend supports registering with
    // a phone alone. Only validate the FORMAT, and only when something was
    // actually typed. Do not reintroduce a required check here.
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('auth:profile.errorEmail'))
      return false
    }
    // BR-1: DOB + gender are required, and both are sent with register.
    if (!dateOfBirth) {
      setError(t('auth:profile.errorDob'))
      return false
    }
    // Age >= 18, checked HERE because this is where the field lives. The BE
    // enforces the same rule, but its rejection arrives at the register call —
    // six screens later, on a password screen with no date field on it. The
    // server stays the backstop; this is so the user can actually act on it.
    if (!isAtLeast18(dateOfBirth)) {
      setError(t('auth:profile.errorDobAge'))
      return false
    }
    if (!gender) {
      setError(t('auth:profile.errorGender'))
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (!validateForm()) return

    const trimmedEmail = email.trim()
    const base = { fullName: fullName.trim(), dateOfBirth, gender }

    // No email → skip the verify step entirely. Nothing is sent, and the flow
    // never shows a screen that would read as "you must supply an email".
    if (!trimmedEmail) {
      update({ ...base, email: '', emailVerified: false })
      router.push('/register/categories')
      return
    }

    // Already verified this exact address (they walked back and forward again).
    // The server-side mark does not expire, so re-sending a code would only
    // make them retype one for no reason.
    if (data.emailVerified && data.email === trimmedEmail) {
      update({ ...base, email: trimmedEmail })
      router.push('/register/categories')
      return
    }

    // Verify BEFORE the account exists — register consumes the mark and rejects
    // an unverified email outright.
    try {
      setLoading(true)
      setError('')
      const res = await emailOtpAPI.send(trimmedEmail, 'REGISTRATION')
      update({
        ...base,
        email: trimmedEmail,
        emailVerified: false,
        devEmailOtp: res?.otp,
      })
      router.push('/register/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:profile.errorEmailSend'))
    } finally {
      setLoading(false)
    }
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

            <RegistrationProgress
              step="profile"
              includeEmailStep={!!email.trim()}
              onBack={handleBack}
              className="mb-16"
            />

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
                  <label className="text-[20px] font-medium text-black mb-6 block">
                    {t('auth:profile.emailLabel')}{' '}
                    <span className="text-[#767676] font-normal">{t('auth:profile.emailOptional')}</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:profile.emailPlaceholder')}
                    disabled={loading}
                    className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] disabled:opacity-50"
                  />
                  <p className="text-[16px] text-[#767676] mt-3">{t('auth:profile.emailHint')}</p>
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
                  disabled={loading}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-white px-12 py-3 rounded-lg hover:bg-primary-60 disabled:opacity-50"
                >
                  <span className="text-[20px]">
                    {loading ? t('auth:profile.sendingCode') : t('buttons.next')}
                  </span>
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
              <label className="text-base font-medium mb-2 block">
                {t('auth:profile.emailLabel')}{' '}
                <span className="text-[#767676] font-normal">{t('auth:profile.emailOptional')}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                placeholder={t('auth:profile.emailPlaceholder')}
                disabled={loading}
                className="w-full h-14 px-3 border rounded-lg disabled:opacity-50"
              />
              <p className="text-sm text-[#767676] mt-2">{t('auth:profile.emailHint')}</p>
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-white py-3 rounded-lg disabled:opacity-50"
          >
            <span>{loading ? t('auth:profile.sendingCode') : t('buttons.next')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
