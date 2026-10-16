'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { otpErrorMessage } from '@/lib/otpError'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { EmailPromptDialog } from '@/components/auth/EmailPromptDialog'
import { ChevronRight, ChevronLeft, X, ImageIcon, Pencil } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { emailOtpAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { readOtpSendTiming } from '@/lib/otpSend'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { nameProblem } from '@/lib/nameValidation'
import { isAtLeast18 } from '@/lib/dateInput'
import { checkEmail } from '@/lib/email'
import { DatePicker, yearsAgoISO } from '@/components/form/DatePicker'
import { SELECT_CHEVRON_CLS } from '@/components/form/selectChevron'

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
  // C:PR-06 — the "add an email?" nudge. Two email inputs are rendered (desktop
  // and mobile layouts), so "Add email now" needs a ref to each.
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const emailLgRef = useRef<HTMLInputElement>(null)
  const emailSmRef = useRef<HTMLInputElement>(null)
  // Set the moment "Continue without email" is chosen. State would not do: two
  // clicks in the same tick both read the old value, and the second one would
  // update() and router.push() again.
  const advancingRef = useRef(false)

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
    // Was a length check only, so "1234" registered successfully (DEF-030).
    // Two messages, because one cannot be true for both cases: a blank field is
    // not a digits problem, and "12345" is not a length problem.
    const problem = nameProblem(fullName)
    if (problem) {
      setError(t(problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters'))
      return false
    }
    // Email is OPTIONAL — the seeker is often an unskilled worker with no email
    // address at all (PRODUCT.md §2), and the backend supports registering with
    // a phone alone. Only validate the FORMAT, and only when something was
    // actually typed. Do not reintroduce a required check here.
    if (email.trim() && !checkEmail(email).ok) {
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

  const base = { fullName: fullName.trim(), dateOfBirth, gender }

  // "Continue without email" from the prompt: skip the verify step entirely.
  // Nothing is sent, and the flow never shows a screen that would read as "you
  // must supply an email".
  const continueWithoutEmail = () => {
    if (advancingRef.current) return
    advancingRef.current = true
    setShowEmailPrompt(false)
    update({ ...base, email: '', emailVerified: false })
    router.push('/register/categories')
  }

  // Closes the prompt and puts the cursor in the email field. No API call — the
  // normal Next press sends the code once a valid address is typed.
  const addEmailNow = () => {
    setShowEmailPrompt(false)
    // Both layouts are in the DOM; only the one the breakpoint shows has a box.
    const visible = [emailLgRef.current, emailSmRef.current].find((el) => el?.offsetParent)
    visible?.focus()
  }

  const handleNext = async () => {
    // Wait for the sessionStorage restore. Before it, `email` is still the empty
    // default, so a seeker returning with a saved email would be told they left it
    // blank. (`showEmailPrompt` cannot normally be true here — the overlay covers
    // Next — it just rules out a second prompt.)
    if (!hydrated || showEmailPrompt || advancingRef.current) return
    if (!validateForm()) return

    // validateForm() already rejected a malformed address, so a failed check
    // here can only mean the field is blank.
    const emailCheck = checkEmail(email)
    const trimmedEmail = emailCheck.ok ? emailCheck.value : ''

    // Validation has passed. Email stays optional, but without one a forgotten
    // password cannot be recovered — so ask, every time Next is pressed with the
    // field blank.
    if (!trimmedEmail) {
      setShowEmailPrompt(true)
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
        devEmailOtp: IS_DEV_BUILD ? res?.otp : undefined,
        emailOtpCooldownSeconds: readOtpSendTiming(res).cooldownSeconds,
      })
      router.push('/register/verify-email')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:profile.errorEmailSend'))
    } finally {
      setLoading(false)
    }
  }

  // This screen is only reachable with a verified (or not-required) phone, so
  // the OTP screen has nothing to offer here — it forwards straight back. Go to
  // the phone step, which shows the number and lets the user change it.
  const handleBack = () => router.push('/register/phone')

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:profile.panelHeading')}
              </h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-10 pb-10">
              <div className="relative w-full max-w-[480px] aspect-[3/2]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto">
          <div className="w-full min-h-screen flex flex-col max-w-[560px] mx-auto px-6 py-5">
            <div className="flex items-start justify-between mt-auto mb-6">
              <div className="relative w-[180px] h-[50px]">
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-5 py-3 rounded-lg hover:bg-error-600">
                <span className="text-base">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <RegistrationProgress
              step="profile"
              includeEmailStep={!!email.trim()}
              onBack={handleBack}
              className="mb-6"
            />

            <div className="mb-auto max-w-[720px]">
              <div className="mb-6">
                <h1 className="text-[36px] font-bold text-black leading-tight mb-3">{t('auth:profile.title')}</h1>
                <p className="text-lg text-[#767676]">{t('auth:profile.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-[640px]">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Profile Image */}
              <div className="mb-8 max-w-[640px]">
                <label className="text-base font-medium text-black mb-2 block">{t('auth:profile.profilePicture')}</label>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
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
              <div className="space-y-6 mb-8">
                <div className="max-w-[640px]">
                  <label className="text-base font-medium text-black mb-2 block">{t('auth:profile.fullNameLabel')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:profile.fullNamePlaceholder')}
                    className="w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base"
                  />
                </div>

                <div className="max-w-[640px]">
                  <label className="text-base font-medium text-black mb-2 block">
                    {t('auth:profile.emailLabel')}{' '}
                    <span className="text-[#767676] font-normal">{t('auth:profile.emailOptional')}</span>
                  </label>
                  <input
                    ref={emailLgRef}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:profile.emailPlaceholder')}
                    disabled={loading}
                    className="w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base disabled:opacity-50"
                  />
                  <p className="text-[16px] text-[#767676] mt-3">{t('auth:profile.emailHint')}</p>
                </div>

                <div className="max-w-[640px]">
                  <label className="text-base font-medium text-black mb-2 block" htmlFor="dob-lg">{t('auth:profile.dobLabel')}</label>
                  <DatePicker
                    id="dob-lg"
                    value={dateOfBirth}
                    defaultMonth={yearsAgoISO(18)}
                    onChange={(v) => { setDateOfBirth(v); if (error) setError('') }}
                    className="w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base"
                  />
                </div>

                <div className="max-w-[640px]">
                  <label className="text-base font-medium text-black mb-2 block" htmlFor="gender-lg">{t('auth:profile.genderLabel')}</label>
                  <select
                    id="gender-lg"
                    value={gender}
                    onChange={(e) => { setGender(e.target.value); if (error) setError('') }}
                    className={`w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base ${SELECT_CHEVRON_CLS}`}
                  >
                    <option value="">{t('auth:profile.genderSelect')}</option>
                    <option value="MALE">{t('auth:profile.genderMale')}</option>
                    <option value="FEMALE">{t('auth:profile.genderFemale')}</option>
                    <option value="OTHER">{t('auth:profile.genderOther')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end max-w-[640px]">
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 px-10 py-3 rounded-lg hover:bg-primary-60 disabled:opacity-50"
                >
                  <span className="text-base">
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
            <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <Link href="/" className="flex items-center gap-1 bg-error-500 text-white px-3 py-2 rounded-lg text-sm">
            <span>{t('auth:register.close')}</span><X className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-3">{t('auth:profile.title')}</h1>
          <p className="text-base text-gray-600 mb-6">{t('auth:profile.subtitle')}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-5 mb-6">
            <div>
              <label className="text-base font-medium mb-2 block">{t('auth:profile.fullNameLabel')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                className="w-full h-12 px-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">
                {t('auth:profile.emailLabel')}{' '}
                <span className="text-[#767676] font-normal">{t('auth:profile.emailOptional')}</span>
              </label>
              <input
                ref={emailSmRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                placeholder={t('auth:profile.emailPlaceholder')}
                disabled={loading}
                className="w-full h-12 px-3 border rounded-lg disabled:opacity-50"
              />
              <p className="text-sm text-[#767676] mt-2">{t('auth:profile.emailHint')}</p>
            </div>

            <div>
              <label className="text-base font-medium mb-2 block" htmlFor="dob-sm">{t('auth:profile.dobLabel')}</label>
              <DatePicker
                id="dob-sm"
                value={dateOfBirth}
                defaultMonth={yearsAgoISO(18)}
                onChange={(v) => { setDateOfBirth(v); if (error) setError('') }}
                className="w-full h-12 px-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block" htmlFor="gender-sm">{t('auth:profile.genderLabel')}</label>
              <select
                id="gender-sm"
                value={gender}
                onChange={(e) => { setGender(e.target.value); if (error) setError('') }}
                className={`w-full h-12 px-3 border rounded-lg ${SELECT_CHEVRON_CLS}`}
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
            className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 py-3 rounded-lg disabled:opacity-50"
          >
            <span>{loading ? t('auth:profile.sendingCode') : t('buttons.next')}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showEmailPrompt && (
        <EmailPromptDialog onAddEmail={addEmailNow} onContinue={continueWithoutEmail} />
      )}
    </div>
  )
}
