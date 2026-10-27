'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, X, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI, classifyRegisterError, emailOtpAPI, jobSeekerAPI } from '@/lib/api'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { otpCooldownSeconds, otpErrorMessage } from '@/lib/otpError'
import { readOtpSendTiming } from '@/lib/otpSend'
import { knownUploadErrorMessage } from '@/lib/uploadFile'
import { useAuth } from '@/contexts/AuthContext'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { nameProblem } from '@/lib/nameValidation'
import { isStrongPassword } from '@/lib/validation/passwordPolicy'
import {
  newPasswordSchema,
  passwordFormMessageKey,
  type NewPasswordValues,
} from '@/lib/validation/passwordFormSchemas'
import { PasswordRequirementsChecklist } from '@/components/auth/PasswordRequirementsChecklist'
import { AcceptTermsCheckbox } from '@/components/legal/AcceptTermsCheckbox'

// The weak-password message is not shown: the live checklist already says which rules are unmet.
const WEAK_KEY = 'auth:password.errorRule'

const schema = newPasswordSchema({
  weak: WEAK_KEY,
  mismatch: 'auth:password.errorMismatch',
})

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
  // `update` is used only for `whatsappConsent` — not secret, safe to persist.
  // The password itself still never goes through it: it stays in the form's own
  // state and goes straight into register() (and the login fallback).
  const { data, update, reset, hydrated } = useSeekerRegistration()
  // Submit-only validation.
  const {
    control,
    watch,
    setFocus,
    clearErrors,
    handleSubmit: validateAndSubmit,
    formState: { errors },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const password = watch('newPassword')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  // Terms of Use + Privacy Policy. Deliberately NOT in the registration context:
  // it is never carried over or restored — the person ticks it on this screen.
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [termsMissing, setTermsMissing] = useState(false)
  const [error, setError] = useState('')
  // Field-level messages from the BE, keyed by field. A weak password fails two
  // rules at once, so this is a list per field and all of them are rendered.
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  // Drives the "re-verify your phone" action. Retrying the register call would
  // fail identically every time — the verification mark is already spent.
  const [needsPhoneReverify, setNeedsPhoneReverify] = useState(false)
  // EMAIL_NOT_VERIFIED: the server has no verified mark for this email. Offers a fresh
  // code; the register call is never retried on its own.
  const [needsEmailReverify, setNeedsEmailReverify] = useState(false)
  // EMAIL_ALREADY_REGISTERED: another account owns this address. Offers a way back to the
  // email field; nothing here can fix it.
  const [emailTaken, setEmailTaken] = useState(false)
  // Latched the moment register + login succeed, BEFORE `reset()` runs.
  //
  // `reset()` wipes the shared registration state back to its empty default, and
  // this page is still mounted while the router moves to /register/success (both
  // live under the same /register layout, so the provider and this component stay
  // alive through the transition). Every guard below then reads the empty state
  // and concludes the user never completed the flow: the phone guard fires
  // router.replace('/register/phone') against the push to the success screen, and
  // the name banner flashes red over a registration that actually worked. Neither
  // check has any job left to do once the account exists — so stop running them.
  const [accountCreated, setAccountCreated] = useState(false)
  // `loading` is set only after RHF's async validation, so it cannot stop a second
  // submit that arrives in between. The ref is taken synchronously, first.
  const submitting = useRef(false)
  // Same idea for the "verify my email again" action: taken synchronously, so a
  // double click cannot send two codes.
  const reverifyingEmail = useRef(false)

  // Guard: must have reached here through the full flow. Email is NOT a
  // prerequisite (it is optional) — the taxonomy choice is.
  //
  // The password itself is intentionally NOT part of this check: it is the one
  // thing that is never persisted, so requiring it here would send every
  // refreshing user back to step 2 — which is the bug being fixed.
  useEffect(() => {
    if (!hydrated || accountCreated) return
    if (!data.phoneVerified || !data.preferredJobTitle) router.replace('/register/phone')
  }, [hydrated, accountCreated, data.phoneVerified, data.preferredJobTitle, router])

  // `fullName` is checked here as well as on the profile step, because THIS is the
  // call that creates the account and it reads from sessionStorage. A journey
  // started before the DEF-030 rule shipped still holds whatever name was stored
  // then, so the profile step's guard never ran for it.
  //
  // Deliberately NOT a redirect. Bouncing from the last step back to step 3 with
  // no message reads as the app breaking, and /register/profile routes FORWARD to
  // /register/categories — so the user is silently made to re-walk two steps they
  // already completed. Instead: block the button, say what is wrong, and offer one
  // link straight to the field. Same shape as the phone re-verify path below.
  const nameIssue = hydrated && !accountCreated ? nameProblem(data.fullName ?? '') : null

  // Same shape for the home city: the BE refuses the register call without one, and a
  // journey saved before the profile step asked for it has none. It is also what a
  // CITY_REQUIRED / INVALID_CITY answer leaves behind (see handleRegisterFailure).
  const cityIssue = hydrated && !accountCreated && !data.homeCity

  // The schema reports the first failing rule (strength, then match) as an i18n
  // key; a server error, when there is one, wins over it. A weak password is left
  // to the checklist, so it gets no banner.
  const validationKey = passwordFormMessageKey(errors)
  const bannerMessage = error || (validationKey && validationKey !== WEAK_KEY ? t(validationKey) : '')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // The account already exists. This guard must come FIRST: `nameIssue` is
    // forced to null once accountCreated latches, which disarms both the check
    // below and the button's `disabled` attribute — so a second click during the
    // async route transition would post `register` with a blank fullName and
    // phoneNumber.
    if (accountCreated) {
      e.preventDefault()
      return
    }

    // The disabled button is presentation; THIS is the rule. Leaving the DEF-030
    // check to a `disabled` attribute alone puts it one markup edit away from
    // being gone, and this is the call that creates the account.
    if (nameIssue || cityIssue || loading || submitting.current) {
      e.preventDefault()
      return
    }
    // Terms & Conditions + Privacy Policy: no account without the box ticked. The hint
    // shows under the box itself (AcceptTermsCheckbox), where the person is looking.
    if (!acceptTerms) {
      e.preventDefault()
      setTermsMissing(true)
      return
    }
    submitting.current = true
    setError('')
    void validateAndSubmit(onValid, (invalid) => {
      submitting.current = false
      // No banner for a weak password: the live checklist shows which rules are
      // unmet. Marking the field touched ends its neutral starting state, which
      // matters for an empty password (the input has no `required`). Focus also
      // scrolls the field into view, so the button never seems to do nothing.
      if (invalid.newPassword) {
        setPasswordTouched(true)
        setFocus('newPassword')
      }
    })(e).catch((err) => {
      // The resolver itself threw: neither callback ran, so release here or the
      // form stays locked with an enabled button. Re-thrown, not swallowed.
      submitting.current = false
      throw err
    })
  }

  const onValid: SubmitHandler<NewPasswordValues> = async ({ newPassword }) => {
    try {
      setLoading(true)
      setFieldErrors([])
      setNeedsPhoneReverify(false)
      setNeedsEmailReverify(false)
      setEmailTaken(false)

      // Create the seeker. Both contacts are already verified at this point and
      // the password ships WITH the account — there is no set-password step and
      // nothing left to verify afterwards.
      const created = await jobSeekerAPI.register({
        fullName: data.fullName,
        email: data.email,
        password: newPassword,
        phoneNumber: data.phoneNumber,
        preferredCategory: data.preferredCategory || undefined,
        preferredSector: data.preferredSector,
        preferredJobTitle: data.preferredJobTitle,
        preferredLanguage: data.language,
        // The BE derives the state from the city; there is no state field to send.
        cityId: data.homeCity?.id,
        // Collected as required on the profile step. The BE's age >= 18 check
        // lives on dateOfBirth, so omitting it silently disables the only
        // minimum-age enforcement there is.
        dateOfBirth: data.dateOfBirth || undefined,
        gender: (data.gender || undefined) as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
        workExperiences: data.workExperiences,
        profilePic: data.profilePic,
        document: data.document,
        whatsappConsent: data.whatsappConsent,
        acceptTerms: true,
      })

      // Log straight in. A phone-only seeker has no email to log in with, so the
      // identifier is the phone — the backend accepts phone + password now.
      // Register issues the session itself. There used to be an unconditional
      // login call here, and if it threw — a blip, a 500, the login route's own
      // rate limiter — the account existed while the user was told registration
      // had failed, then got "already registered" about their own new account.
      //
      // The fallback covers only the portal deploying ahead of the backend that
      // serves the session; delete it once that is out everywhere.
      const session =
        created.token && created.user
          ? { token: created.token, user: created.user }
          : await authAPI.login('seeker', {
              identifier: data.email || data.phoneNumber,
              password: newPassword,
            })

      // Hand the session to AuthContext, then clear the registration state,
      // which is what drops the plaintext password out of memory. Latch first —
      // `reset()` empties the very fields the guards on this page read.
      setAccountCreated(true)
      login(session.token, session.user)
      reset()

      router.push('/register/success')
    } catch (err) {
      handleRegisterFailure(err)
      // Only re-enable on failure. This used to be a `finally`, which also ran
      // on success — leaving a live "Create account" button on a flow that had
      // already registered, for the whole of the async route transition.
      setLoading(false)
      submitting.current = false
    }
  }

  // Typing in either field clears whatever message was showing — server error or
  // validation.
  const clearMessage = () => {
    if (error) setError('')
    clearErrors()
  }

  /**
   * Turn a register/login failure into something the user can act on.
   *
   * `classifyRegisterError` branches on the BE's `code`, with a temporary
   * message match for an older BE, and a generic fallback when it recognises
   * neither.
   */
  const handleRegisterFailure = (err: unknown) => {
    // A refused photo or document (too big / wrong type / unreadable): say so in the user's language.
    const uploadMessage = knownUploadErrorMessage(err, t)
    if (uploadMessage) {
      setError(uploadMessage)
      return
    }
    const failure = classifyRegisterError(err)
    switch (failure.kind) {
      case 'fields':
        // A city the schema refuses (not even an id) is the same dead end as an unknown one:
        // forget it, and `cityIssue` blocks the button with a link to the field. Its raw
        // message is English and names an endpoint, so it is not shown.
        if (failure.fields.cityId) {
          update({ homeCity: null, homeStateCode: null })
          break
        }
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
        // PHONE_NOT_VERIFIED: "never verified" and "already used" are
        // indistinguishable, so re-verify the phone. Never auto-retry the
        // register call. An existing account arrives as `phoneTaken`.
        setError(t('auth:password.errorPhoneReverify'))
        setNeedsPhoneReverify(true)
        break
      case 'emailUnverified':
        // The browser still says verified, which is what kept the user stuck: the
        // profile step skips sending a code for an address it believes is verified.
        update({ emailVerified: false })
        setError(t('auth:password.errorEmailUnverified'))
        setNeedsEmailReverify(true)
        break
      case 'emailTaken':
        setError(t('auth:password.errorEmailTaken'))
        setEmailTaken(true)
        break
      case 'cityInvalid':
        // The BE did not accept the city. Forget it: `cityIssue` then blocks the button
        // and shows the message with a link back to the field.
        update({ homeCity: null, homeStateCode: null })
        break
      case 'phoneTaken':
        setError(t('auth:password.errorPhoneTaken'))
        break
      default:
        setError(failure.message || t('auth:password.errorCreate'))
    }
  }

  // The backend says this phone is NOT verified, so the browser's `phoneVerified`
  // flag is stale. Clear it first: otherwise the phone step's "same verified
  // number" shortcut would send the user straight back here without a new code.
  const handleReverifyPhone = () => {
    update({ phoneVerified: false })
    router.push('/register/phone')
  }

  // Send a fresh registration code, then go to the verify screen. That screen does
  // not send one itself. Like onValid, `loading` is released only on failure: on
  // success the page is leaving.
  const handleReverifyEmail = async () => {
    if (reverifyingEmail.current || loading) return
    reverifyingEmail.current = true
    setLoading(true)
    try {
      const res = await emailOtpAPI.send(data.email, 'REGISTRATION')
      update({
        devEmailOtp: IS_DEV_BUILD ? res?.otp : undefined,
        emailOtpCooldownSeconds: readOtpSendTiming(res).cooldownSeconds,
      })
      router.push('/register/verify-email')
    } catch (err) {
      // A code went out moments ago and may already be in the inbox: carry the
      // remaining wait to the verify screen instead of failing.
      const wait = otpCooldownSeconds(err)
      if (wait !== null) {
        update({ devEmailOtp: undefined, emailOtpCooldownSeconds: wait })
        router.push('/register/verify-email')
        return
      }
      setError(otpErrorMessage(err, t, 'auth:profile.errorEmailSend'))
      reverifyingEmail.current = false
      setLoading(false)
    }
  }

  // Back to the email field with the old address still in it to edit. Its verified flag goes:
  // otherwise the profile step would skip sending a code for an address it thinks is verified.
  // Every other answer stays in the registration context.
  const handleChangeEmail = () => {
    update({ emailVerified: false, devEmailOtp: undefined })
    router.push('/register/profile')
  }

  const handleBack = () => router.push('/register/experience')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:password.panelHeading')}
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
          <div className="w-full lg:min-h-screen lg:flex lg:flex-col max-w-[1400px] lg:max-w-[560px] mx-auto px-4 lg:px-6 py-6 lg:py-5">
            <div className="flex items-start justify-between lg:mt-auto mb-6">
              <div className="relative w-[160px] lg:w-[180px] h-[44px] lg:h-[50px]">
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-base">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress
              step="password"
              includeEmailStep={!!data.email}
              onBack={handleBack}
              className="mb-6 lg:mb-8"
            />

            <div className="lg:mb-auto max-w-[640px]">
              <div className="mb-6 lg:mb-8 lg:[@media(max-height:800px)]:mb-4">
                <h1 className="text-2xl lg:text-[36px] font-bold text-black leading-tight mb-3 lg:[@media(max-height:800px)]:mb-2">{t('auth:password.title')}</h1>
                <p className="text-base lg:text-lg text-[#767676]">{t('auth:password.subtitle')}</p>
              </div>

              {/* A name carried over from a journey started before the DEF-030 rule.
                  Shown here with a link to the field, rather than redirecting — see
                  the note by `nameIssue`. */}
              {nameIssue && (
                <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">
                    {t(nameIssue === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters')}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/register/profile')}
                    className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80"
                  >
                    {t('auth:password.fixName')}
                  </button>
                </div>
              )}

              {cityIssue && (
                <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{t('auth:password.errorCity')}</p>
                  <button
                    type="button"
                    onClick={() => router.push('/register/profile')}
                    className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80"
                  >
                    {t('auth:password.fixCity')}
                  </button>
                </div>
              )}

              {bannerMessage && (
                <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 whitespace-pre-line">{bannerMessage}</p>
                  {needsPhoneReverify && (
                    <button
                      type="button"
                      onClick={handleReverifyPhone}
                      className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80"
                    >
                      {t('auth:password.reverifyPhone')}
                    </button>
                  )}
                  {needsEmailReverify && (
                    <button
                      type="button"
                      onClick={handleReverifyEmail}
                      disabled={loading}
                      className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80 disabled:opacity-50"
                    >
                      {t('auth:password.reverifyEmail')}
                    </button>
                  )}
                  {emailTaken && (
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      className="mt-3 font-semibold text-primary-70 underline hover:text-primary-80"
                    >
                      {t('profile:seeker.emailModal.changeEmailLink')}
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-6 lg:[@media(max-height:800px)]:space-y-5 mb-8 lg:[@media(max-height:800px)]:mb-6">
                  <div>
                    <label htmlFor="newPassword" className="text-base font-medium text-black mb-2 block">{t('auth:password.passwordLabel')}</label>
                    <div className="relative">
                      <Controller
                        name="newPassword"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            id="newPassword"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            onChange={(e) => { field.onChange(e); clearMessage() }}
                            onBlur={() => { field.onBlur(); setPasswordTouched(true) }}
                            placeholder={t('auth:password.passwordPlaceholder')}
                            disabled={loading}
                            className={`w-full h-12 px-3 pr-16 border rounded-[10px] text-base ${
                              passwordTouched && !isStrongPassword(password)
                                ? 'border-red-500'
                                : 'border-[#b5b5b5]'
                            }`}
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                      >
                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                    <div className="mt-2">
                      <PasswordRequirementsChecklist password={password} touched={passwordTouched} />
                    </div>
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
                    <label htmlFor="confirmPassword" className="text-base font-medium text-black mb-2 block">{t('auth:password.confirmLabel')}</label>
                    <div className="relative">
                      <Controller
                        name="confirmPassword"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            onChange={(e) => { field.onChange(e); clearMessage() }}
                            placeholder={t('auth:password.confirmPlaceholder')}
                            disabled={loading}
                            className="w-full h-12 px-3 pr-16 border border-[#b5b5b5] rounded-[10px] text-base"
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                        aria-pressed={showConfirm}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                      >
                        {showConfirm ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm lg:text-base text-[#4d4d4d]">
                    <input
                      type="checkbox"
                      checked={data.whatsappConsent}
                      onChange={(e) => update({ whatsappConsent: e.target.checked })}
                      className="w-4 h-4 accent-primary-50"
                    />
                    {t('auth:password.whatsappConsentLabel')}
                  </label>

                  <AcceptTermsCheckbox
                    checked={acceptTerms}
                    onChange={setAcceptTerms}
                    showRequired={termsMissing}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    // Blocked while the carried-over name is invalid — the message
                    // above says why and links to the field.
                    disabled={loading || nameIssue !== null || cityIssue}
                    className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 px-8 lg:px-10 py-3 rounded-lg hover:bg-primary-60 disabled:opacity-50"
                  >
                    <span className="text-base">{loading ? t('auth:password.creating') : t('auth:password.createAccount')}</span>
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
