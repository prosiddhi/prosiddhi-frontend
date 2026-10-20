'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { authAPI, classifyRegisterError, employerAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { invitePath, readInviteToken } from '@/lib/inviteToken'
import { useEmployerRegistration } from '../EmployerRegistrationContext'
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
const WEAK_KEY = 'employerRegister:account.passwordWeak'

const schema = newPasswordSchema({
  weak: WEAK_KEY,
  mismatch: 'employerRegister:account.passwordMismatch',
})

/**
 * Account details.
 *
 * The email moved OUT of this screen — it is collected and verified up front on
 * /contacts, because the backend requires both contacts verified before the
 * register call. What is left is the name/designation (individual only) and the
 * password. For an individual this is also the last step, so it registers and
 * logs in here; a business collects company details first.
 */
export default function AccountSetupPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()
  const { data, update, reset, hydrated } = useEmployerRegistration()
  const isIndividual = data.companyType === 'individual'

  const [fullName, setFullName] = useState(data.fullName)
  const [designation, setDesignation] = useState(data.designation)
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
  // R1-BE-03 — WhatsApp opt-in. Unchecked by default; never blocks submission.
  const [whatsappConsent, setWhatsappConsent] = useState(data.whatsappConsent)
  // Terms of Use + Privacy Policy — only on this screen for an individual, whose
  // account is created here. A business agrees on company-details, where its account
  // is created. Never carried in the registration context: ticked where it is used.
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [termsMissing, setTermsMissing] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  // Which contact the backend said is not verified, so Re-verify clears only that one.
  const [needsReverify, setNeedsReverify] = useState<'phone' | 'email' | null>(null)
  // EMAIL_ALREADY_REGISTERED: another account owns this address; offers a way back to change it.
  const [emailTaken, setEmailTaken] = useState(false)
  // Set when we send the user away on purpose, so the guard below does not redirect to
  // /contacts over that navigation once the email flag is cleared.
  const leaving = useRef(false)
  // Stops the guard below judging a flow that has already succeeded — see the
  // seeker password step (4d65c71) for the full story. Kept per-page, not on the
  // context: the provider outlives this page, and a flow-wide flag would also
  // disable the guards on the steps a user can navigate BACK into, stranding
  // them on a blank form.
  const [accountCreated, setAccountCreated] = useState(false)
  // `loading` is set only after RHF's async validation, so it cannot stop a second
  // submit that arrives in between. The ref is taken synchronously, first.
  const submitting = useRef(false)

  // Guard: both contacts must already be verified — register consumes both marks.
  useEffect(() => {
    if (!hydrated || accountCreated || leaving.current) return
    if (!data.phoneVerified || !data.emailVerified) {
      router.replace('/employer/register/contacts')
    }
  }, [hydrated, accountCreated, data.phoneVerified, data.emailVerified, router])

  // Seed from restored progress once, without clobbering typing.
  useEffect(() => {
    if (!hydrated) return
    setFullName((prev) => prev || data.fullName)
    setDesignation((prev) => prev || data.designation)
    // Plain overwrite, not the `prev || …` idiom above: that trick relies on
    // '' meaning "not typed yet", which has no boolean equivalent — `false`
    // is a real, deliberate answer, not an empty one, so OR-ing it could
    // never restore an explicit uncheck, only ever force it back to true.
    setWhatsappConsent(data.whatsappConsent)
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // The schema reports the first failing rule (strength, then match) as an i18n
  // key; a server error, when there is one, wins over it. A weak password is left
  // to the checklist, so it gets no banner.
  const validationKey = passwordFormMessageKey(errors)
  const bannerMessage = error || (validationKey && validationKey !== WEAK_KEY ? t(validationKey) : '')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // The account already exists — reset() has blanked `data`, so a second click
    // would read `companyType` as '' , take the corporate branch and push a
    // freshly created INDIVIDUAL employer into the company-details step. The
    // window is real: the route transition is async and this page stays mounted
    // and interactive throughout it.
    if (accountCreated) {
      e.preventDefault()
      return
    }

    // Length-only until DEF-030: "1234" was an acceptable individual-employer name.
    const nameIssue = isIndividual ? nameProblem(fullName) : null
    if (nameIssue) {
      e.preventDefault()
      setError(
        t(nameIssue === 'tooShort'
          ? 'employerRegister:account.nameTooShort'
          : 'employerRegister:account.nameLetters')
      )
      return
    }
    if (loading || submitting.current) {
      e.preventDefault()
      return
    }
    // Terms & Conditions + Privacy Policy: an individual's account is created on this
    // screen, so the box must be ticked here. A business ticks it on company-details.
    if (isIndividual && !acceptTerms) {
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
    // Held in memory only — never written to storage.
    update({ password: newPassword, fullName: fullName.trim(), designation, whatsappConsent })

    // Corporate collects company details next, and registers there. The submit
    // lock is held on purpose: the page unmounts on navigation, and `loading` is
    // not set on this path, so the lock is what stops a double click.
    if (!isIndividual) {
      router.push('/employer/register/company-details')
      return
    }

    try {
      setLoading(true)
      setFieldErrors([])
      setNeedsReverify(null)

      // Creates the account ACTIVE, with trial credits granted (1 post,
      // 3 downloads, 14 days). No verification step follows.
      const created = await employerAPI.registerIndividual({
        email: data.email,
        password: newPassword,
        fullName: fullName.trim(),
        phoneNumber: data.phoneNumber,
        designation: designation.trim() || undefined,
        whatsappConsent,
        acceptTerms: true,
      })

      // Register issues the session itself. There used to be an unconditional
      // login call here, and if it threw — a blip, a 500, the login route's own
      // rate limiter — the account existed while the user was told registration
      // had failed, then got "an account already uses that email" about the
      // account they had just made.
      //
      // The fallback covers only the portal deploying ahead of the backend that
      // serves the session; delete it once that is out everywhere.
      if (created.token && created.user) {
        login(created.token, created.user)
      } else {
        const result = await authAPI.login('employer', { identifier: data.email, password: newPassword })
        login(result.token, result.user)
      }
      // Set alongside reset() — reset() is what empties the state the guard
      // reads. React 18 batches both into one commit, so the order is not
      // load-bearing today; keep them adjacent so it stays that way if an await
      // is ever introduced between them.
      setAccountCreated(true)
      reset()

      // They may have started at a team invite (/invite/<token>) with no
      // account: registration is the detour, not the destination. Send them back
      // to finish it — the landing page auto-accepts and then hands them the
      // dashboard. The path is rebuilt from the stashed TOKEN, never a stored URL.
      const pendingInvite = readInviteToken()
      router.push(pendingInvite ? invitePath(pendingInvite) : '/employer')
    } catch (err) {
      const failure = classifyRegisterError(err)
      switch (failure.kind) {
        case 'fields':
          setFieldErrors(failure.fields.password ?? [])
          setError(
            failure.fields.password ? '' : Object.values(failure.fields).flat().join(' ')
          )
          break
        case 'phoneUnverified':
          // One message, three possible causes — never verified, mark already
          // consumed, or the phone belongs to an existing account. Re-verifying
          // is the only response that is right for all three; retrying the
          // register call would fail identically every time.
          setError(t('employerRegister:account.errorPhoneReverify'))
          setNeedsReverify('phone')
          break
        case 'emailUnverified':
          setError(t('employerRegister:account.errorEmailUnverified'))
          setNeedsReverify('email')
          break
        case 'emailTaken':
          setError(t('employerRegister:account.errorEmailTaken'))
          setEmailTaken(true)
          break
        case 'phoneTaken':
          setError(t('employerRegister:account.errorPhoneTaken'))
          break
        default:
          setError(failure.message || t('employerRegister:account.createFailed'))
      }
      // Only re-enable on failure. This used to be a `finally`, which also ran
      // on success — handing the user a live "Create account" button on a flow
      // that had already finished, for the whole of the async route transition.
      setLoading(false)
      submitting.current = false
    }
  }

  // Typing in either password field clears whatever message was showing — server
  // error, name banner or validation.
  const clearMessage = () => {
    if (error) setError('')
    clearErrors()
  }

  const handleBack = () => router.push('/employer/register/contacts')

  // The backend said this contact is not verified (never verified, or its mark was
  // already consumed), so a fresh send is allowed and the stale flag is wrong.
  // Clear only that contact's flag and sent marker, then go back to contacts; it
  // sends nothing for a contact that is still verified. Pushing to /verify instead
  // would bounce straight back here while both flags are true.
  const handleReverify = () => {
    if (needsReverify === 'phone') {
      update({ phoneVerified: false, phoneOtpSent: null, devPhoneOtp: undefined })
    } else if (needsReverify === 'email') {
      update({ emailVerified: false, emailOtpSent: null, devEmailOtp: undefined })
    }
    router.push('/employer/register/contacts')
  }
  // To the email step with the old address still in the box. Its verified flag and any sent
  // marker go, so the step does not offer "Continue" for the taken address. The phone and
  // everything else stay.
  const handleChangeEmail = () => {
    leaving.current = true
    update({ emailVerified: false, emailOtpSent: null, devEmailOtp: undefined })
    router.push('/employer/register/verify')
  }
  const handleClose = () => router.push('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label={t('employerRegister:closeAria')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">{t('employerRegister:title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('employerRegister:subtitle')}</p>
          </div>

          {bannerMessage && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm whitespace-pre-line">{bannerMessage}</p>
              {needsReverify !== null && (
                <button
                  type="button"
                  onClick={handleReverify}
                  className="mt-3 text-sm font-semibold text-primary-50 underline hover:text-primary-60"
                >
                  {t('employerRegister:account.reverifyContacts')}
                </button>
              )}
              {emailTaken && (
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="mt-3 text-sm font-semibold text-primary-50 underline hover:text-primary-60"
                >
                  {t('profile:seeker.emailModal.changeEmailLink')}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8 space-y-6">
              {isIndividual && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-base sm:text-lg font-medium text-black mb-3">
                      {t('employerRegister:account.fullName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                      placeholder={t('employerRegister:account.fullNamePlaceholder')}
                      disabled={loading}
                      className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="designation" className="block text-base sm:text-lg font-medium text-black mb-3">
                      {t('employerRegister:account.designation')} <span className="text-gray-400 text-sm">{t('employerRegister:account.designationOptional')}</span>
                    </label>
                    <input
                      id="designation"
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder={t('employerRegister:account.designationPlaceholder')}
                      disabled={loading}
                      className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {/* Email is NOT edited here — it was verified on /contacts and the
                  register call consumes that verification, so changing it at this
                  point would silently invalidate it. Shown read-only for
                  confidence, with a link back to the step that can change it. */}
              <div>
                <p className="block text-base sm:text-lg font-medium text-black mb-1">
                  {t('employerRegister:account.email')}
                </p>
                <p className="text-base text-black break-all">{data.email}</p>
                <button
                  type="button"
                  onClick={() => router.push('/employer/register/contacts')}
                  className="mt-1 text-sm font-medium text-primary-50 hover:text-primary-60"
                >
                  {t('employerRegister:account.changeEmail')}
                </button>
              </div>

              <div>
                <label htmlFor="password" className="block text-base sm:text-lg font-medium text-black mb-3">
                  {t('employerRegister:account.password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Controller
                    name="newPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        onChange={(e) => { field.onChange(e); clearMessage() }}
                        onBlur={() => { field.onBlur(); setPasswordTouched(true) }}
                        disabled={loading}
                        className={`w-full h-12 sm:h-14 px-4 pr-12 border rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50 ${
                          passwordTouched && !isStrongPassword(password)
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-primary-50'
                        }`}
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <PasswordRequirementsChecklist password={password} touched={passwordTouched} />
                </div>
                {/* Every rule the BE rejected — a weak password usually fails both
                    the length and the composition rule at once. */}
                {fieldErrors.length > 0 && (
                  <ul role="alert" className="mt-2 list-disc pl-5 space-y-1">
                    {fieldErrors.map((message) => (
                      <li key={message} className="text-sm text-red-600">{message}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-base sm:text-lg font-medium text-black mb-3">
                  {t('employerRegister:account.confirmPassword')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        onChange={(e) => { field.onChange(e); clearMessage() }}
                        disabled={loading}
                        className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                    aria-pressed={showConfirmPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  className="w-4 h-4 accent-primary-50"
                />
                {t('employerRegister:account.whatsappConsentLabel')}
              </label>

              {isIndividual && (
                <AcceptTermsCheckbox
                  checked={acceptTerms}
                  onChange={setAcceptTerms}
                  showRequired={termsMissing}
                  className="text-sm text-gray-600"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]">
                {t('buttons.back')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
              >
                {loading ? t('employerRegister:account.creating') : isIndividual ? t('employerRegister:account.createAccount') : t('buttons.next')}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">{t('employerRegister:signInPrompt')}</span>
              <Link href="/login" className="font-semibold text-primary-50 hover:text-primary-60 transition-colors">{t('employerRegister:signInLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
