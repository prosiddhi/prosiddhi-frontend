'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, X, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI, classifyRegisterError, jobSeekerAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { isValidPersonName } from '@/lib/nameValidation'

// Mirrors the BE passwordRule (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

/**
 * The account-creation step.
 *
 * Everything before this point only left server-side verification marks; the
 * account itself is created HERE, password included, and the user is logged in
 * immediately afterwards. There is no post-register verification step any more.
 */
export default function RegisterPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()
  // No `update` — the password is deliberately never written to the shared
  // context here; it goes straight from local state into register() + login().
  const { data, reset, hydrated } = useSeekerRegistration()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Field-level messages from the BE, keyed by field. A weak password fails two
  // rules at once, so this is a list per field and all of them are rendered.
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  // Drives the "re-verify your phone" action. Retrying the register call would
  // fail identically every time — the verification mark is already spent.
  const [needsPhoneReverify, setNeedsPhoneReverify] = useState(false)

  // Guard: must have reached here through the full flow. Email is NOT a
  // prerequisite (it is optional) — the taxonomy choice is.
  //
  // The password itself is intentionally NOT part of this check: it is the one
  // thing that is never persisted, so requiring it here would send every
  // refreshing user back to step 2 — which is the bug being fixed.
  // `fullName` is checked here as well as on the profile step, because THIS is the
  // call that creates the account and it reads from sessionStorage. A journey
  // started before the DEF-030 rule shipped still holds whatever name was stored
  // then, so the profile step's guard never ran for it. Send those back to the
  // step that owns the field rather than registering an invalid name.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneVerified || !data.preferredJobTitle) {
      router.replace('/register/phone')
      return
    }
    if (!isValidPersonName(data.fullName ?? '')) router.replace('/register/profile')
  }, [hydrated, data.phoneVerified, data.preferredJobTitle, data.fullName, router])

  const handleCreate = async () => {
    if (!PASSWORD_RULE.test(password)) {
      setError(t('auth:password.errorRule'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth:password.errorMismatch'))
      return
    }

    try {
      setLoading(true)
      setError('')
      setFieldErrors([])
      setNeedsPhoneReverify(false)

      // Create the seeker. Both contacts are already verified at this point and
      // the password ships WITH the account — there is no set-password step and
      // nothing left to verify afterwards.
      await jobSeekerAPI.register({
        fullName: data.fullName,
        email: data.email,
        password,
        phoneNumber: data.phoneNumber,
        preferredCategory: data.preferredCategory || undefined,
        preferredSector: data.preferredSector,
        preferredJobTitle: data.preferredJobTitle,
        preferredLanguage: data.language,
        // Collected as required on the profile step. The BE's age >= 18 check
        // lives on dateOfBirth, so omitting it silently disables the only
        // minimum-age enforcement there is.
        dateOfBirth: data.dateOfBirth || undefined,
        gender: (data.gender || undefined) as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
        workExperiences: data.workExperiences,
        profilePic: data.profilePic,
        document: data.document,
      })

      // Log straight in. A phone-only seeker has no email to log in with, so the
      // identifier is the phone — the backend accepts phone + password now.
      const result = await authAPI.login('seeker', {
        identifier: data.email || data.phoneNumber,
        password,
      })

      // Hand the session to AuthContext, then clear the registration state,
      // which is what drops the plaintext password out of memory.
      login(result.token, result.user)
      reset()

      router.push('/register/success')
    } catch (err) {
      handleRegisterFailure(err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Turn a register/login failure into something the user can act on.
   *
   * In production these errors carry no machine-readable code — only an HTTP
   * status and a message — so `classifyRegisterError` matches the known message
   * set, with a generic fallback when it does not recognise one.
   */
  const handleRegisterFailure = (err: unknown) => {
    const failure = classifyRegisterError(err)
    switch (failure.kind) {
      case 'fields':
        // `password` is the only field the user can fix from this screen; the
        // rest were collected earlier, so surface those as a general message.
        setFieldErrors(failure.fields.password ?? [])
        setError(
          failure.fields.password
            ? ''
            : Object.values(failure.fields).flat().join(' ')
        )
        break
      case 'phoneUnverified':
        // "Never verified", "already used" and "already registered" are ONE
        // message on the backend — indistinguishable. Re-verifying the phone is
        // the only response that is correct for all three. Never auto-retry the
        // register call, and never say "phone already in use".
        setError(t('auth:password.errorPhoneReverify'))
        setNeedsPhoneReverify(true)
        break
      case 'emailUnverified':
        setError(t('auth:password.errorEmailUnverified'))
        break
      case 'emailTaken':
        setError(t('auth:password.errorEmailTaken'))
        break
      case 'phoneTaken':
        setError(t('auth:password.errorPhoneTaken'))
        break
      default:
        setError(failure.message || t('auth:password.errorCreate'))
    }
  }

  const handleReverifyPhone = () => router.push('/register/phone')

  const handleBack = () => router.push('/register/experience')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:password.panelHeading')}
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
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-[18px]">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress
              step="password"
              includeEmailStep={!!data.email}
              onBack={handleBack}
              className="mb-10 lg:mb-16"
            />

            <div className="max-w-[953px]">
              <div className="mb-10 lg:mb-16">
                <h1 className="text-3xl lg:text-[56px] font-bold text-black leading-tight mb-4">{t('auth:password.title')}</h1>
                <p className="text-base lg:text-[24px] text-[#767676]">{t('auth:password.subtitle')}</p>
              </div>

              {error && (
                <div role="alert" className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                  {needsPhoneReverify && (
                    <button
                      type="button"
                      onClick={handleReverifyPhone}
                      className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80"
                    >
                      {t('auth:password.reverifyPhone')}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-8 mb-12">
                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">{t('auth:password.passwordLabel')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                      placeholder={t('auth:password.passwordPlaceholder')}
                      disabled={loading}
                      className="w-full h-14 lg:h-[69px] px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px]"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{t('auth:password.passwordHint')}</p>
                  {/* Every rule the BE rejected, not just the first — a weak
                      password commonly fails both the length and the
                      composition rule, and fixing one at a time is miserable. */}
                  {fieldErrors.length > 0 && (
                    <ul role="alert" className="mt-2 list-disc pl-5 space-y-1">
                      {fieldErrors.map((message) => (
                        <li key={message} className="text-sm text-red-600">{message}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">{t('auth:password.confirmLabel')}</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                      placeholder={t('auth:password.confirmPlaceholder')}
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
                  <span className="text-base lg:text-[20px]">{loading ? t('auth:password.creating') : t('auth:password.createAccount')}</span>
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
