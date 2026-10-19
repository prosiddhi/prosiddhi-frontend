'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { otpCooldownSeconds, otpErrorMessage } from '@/lib/otpError'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { toIdentifier } from '@/lib/identifier'
import { isStrongPassword } from '@/lib/validation/passwordPolicy'
import { EMPTY_OTP, forgotIdentifierSchema, type ForgotIdentifierValues } from '@/lib/validation/authSchemas'
import {
  newPasswordSchema,
  passwordFormMessageKey,
  type NewPasswordValues,
} from '@/lib/validation/passwordFormSchemas'
import { PasswordRequirementsChecklist } from '@/components/auth/PasswordRequirementsChecklist'
import { IdentifierField } from '@/components/auth/IdentifierField'
import { OtpInput, type OtpInputHandle } from '@/components/auth/OtpInput'
import { ResendOtpButton } from '@/components/auth/ResendOtpButton'
import { IS_DEV_BUILD } from '@/lib/devBuild'
import { readOtpSendTiming } from '@/lib/otpSend'

const OTP_LENGTH = 6

// The code boxes and the new-password fields share the 'otp' stage: the password
// fields appear under the boxes once `codeEntered` is set.
type Stage = 'identifier' | 'otp' | 'done'

// The weak-password message is not shown: the live checklist already says which rules are unmet.
const WEAK_KEY = 'auth:forgot.errorRule'

const resetPasswordSchema = newPasswordSchema({
  weak: WEAK_KEY,
  mismatch: 'auth:forgot.errorMismatch',
})

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('identifier')
  // True once the user has entered six digits and pressed Continue. This is NOT
  // server verification: the BE checks the code only in the reset-password call.
  const [codeEntered, setCodeEntered] = useState(false)
  // The raw field value (email OR phone) lives in RHF below; this is the
  // NORMALIZED value — lowercased email or E.164 phone — that toIdentifier(raw)
  // produced, kept for the OTP subtitle and the final reset-password call. Same
  // split /login uses between its form field and its own `identifier` const.
  const [identifier, setIdentifier] = useState('')
  const identifierForm = useForm<ForgotIdentifierValues>({
    resolver: zodResolver(forgotIdentifierSchema),
    defaultValues: { identifier: '' },
  })
  // Six slots rather than one string, so a cleared middle box stays a hole
  // instead of shifting every digit after it left. Joined back to a plain string
  // at the two places that consume it, so the code sent to the API and the
  // "exactly 6" rule are unchanged. Same shape the three other OTP screens in
  // this app already use.
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const otpInputRef = useRef<OtpInputHandle>(null)
  const [devOtp, setDevOtp] = useState<string | undefined>()
  // Stage 3's fields. Submit-only validation; typing clears the message.
  const resetForm = useForm<NewPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const newPassword = resetForm.watch('newPassword')
  const resetErrors = resetForm.formState.errors
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  // One flag per input: each eye shows or hides only its own field.
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // `loading` is set only after RHF's async validation, so it cannot stop a second
  // reset submit that arrives in between. The ref is taken synchronously, first.
  const resetting = useRef(false)
  // The neutral resend confirmation. Double-click protection lives in ResendOtpButton;
  // `resending` mirrors its busy state so Verify, Back and the boxes stay locked
  // until the response lands.
  const [resendNotice, setResendNotice] = useState(false)
  const [resending, setResending] = useState(false)
  // From the send response: the cooldown, so the Resend countdown matches the server's
  // (it has to be known before the button mounts, because the button starts counting
  // then), and the code lifetime for the "expired" message. The same numbers come back
  // whether or not an account exists, so this reveals nothing.
  const [sendTiming, setSendTiming] = useState(() => readOtpSendTiming(undefined))

  // When Continue reveals the password fields, move focus to the first one. RHF's
  // setFocus uses the ref the Controller already registers, so no extra ref.
  useEffect(() => {
    if (codeEntered) resetForm.setFocus('newPassword')
  }, [codeEntered, resetForm])

  const handleClose = () => router.push('/')
  const handleBackToLogin = () => router.push('/login')

  // Stage 1 — request the reset OTP. POST /auth/forgot-password { identifier }
  // dispatches to email-OTP or SMS-OTP server-side by identifier shape, so this
  // page never has to know or choose which channel the account actually uses.
  const onSendCode: SubmitHandler<ForgotIdentifierValues> = async ({ identifier: raw }) => {
    // The resolver already confirmed `raw` parses via toIdentifier; this only
    // narrows the type.
    const id = toIdentifier(raw)
    if (!id) return
    try {
      setLoading(true)
      setError('')
      const res = await authAPI.forgotPassword(id)
      setDevOtp(IS_DEV_BUILD ? res?.otp : undefined)
      setSendTiming(readOtpSendTiming(res))
      setIdentifier(id)
      setStage('otp')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:forgot.errorSendFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Resend from the code screen: the same call and error path as the first send,
  // using the stored normalized identifier. Boxes clear and refocus only on a
  // successful response; a refused resend keeps what the user typed. The notice
  // is deliberately neutral — a 200 does not prove a fresh code was generated.
  // Returns true on a 200 (ResendOtpButton restarts its countdown) or the seconds left on a cooldown refusal.
  const handleResend = async (): Promise<boolean | number> => {
    if (!identifier) return false
    setError('')
    setResendNotice(false)
    try {
      const res = await authAPI.forgotPassword(identifier)
      setDevOtp(IS_DEV_BUILD ? res?.otp : undefined)
      setSendTiming(readOtpSendTiming(res))
      setOtp(EMPTY_OTP)
      setCodeEntered(false)
      // The password fields are hidden for the new code: start them clean so no
      // old value, error, red border or revealed text comes back with them.
      resetForm.reset()
      setNewPasswordTouched(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      otpInputRef.current?.focusFirst()
      setResendNotice(true)
      return true
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:forgot.errorSendFailed'))
      return otpCooldownSeconds(err) ?? false
    }
  }

  // Stage 2 — collect the code and advance. We do NOT pre-verify here: the BE
  // reset-password endpoint verifies the OTP itself (and verifyOTP throws
  // "already verified" if called twice), so a separate /email-otp/verify call
  // would make the final reset fail. The code is validated at the reset step.
  // `code` is the same six-character string the single input used to hold, so
  // the rule below and the payload in handleReset are byte-for-byte what they
  // were. A hole anywhere makes it shorter than 6 and is rejected, as before.
  const code = otp.join('')

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== OTP_LENGTH) {
      setError(t('auth:forgot.errorCodeIncomplete'))
      return
    }
    setError('')
    setResendNotice(false)
    setCodeEntered(true)
  }

  // Clears the error as soon as the code is edited, as the old per-box handlers did.
  const handleOtpChange = (next: string[]) => {
    setOtp(next)
    if (error) setError('')
  }

  // Stage 3 — set the new password (BE verifies the OTP, then consumes it).
  const onReset: SubmitHandler<NewPasswordValues> = async (values) => {
    try {
      setLoading(true)
      await authAPI.resetPassword(identifier, code, values.newPassword)
      setStage('done')
    } catch (err) {
      setError(otpErrorMessage(err, t, 'auth:forgot.errorResetFailed', sendTiming.expiresIn))
    } finally {
      setLoading(false)
      resetting.current = false
    }
  }

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    if (loading || resetting.current) {
      e.preventDefault()
      return
    }
    // The boxes stay editable under the password fields, so the code can have
    // been cut short since Continue.
    if (code.length !== OTP_LENGTH) {
      e.preventDefault()
      setError(t('auth:forgot.errorCodeIncomplete'))
      return
    }
    resetting.current = true
    setError('')
    void resetForm.handleSubmit(onReset, () => {
      resetting.current = false
    })(e).catch((err) => {
      // The resolver itself threw: neither callback ran, so release here or the
      // form stays locked with an enabled button. Re-thrown, not swallowed.
      resetting.current = false
      throw err
    })
  }

  // Typing in either password field clears whatever message was showing —
  // server error or validation.
  const clearResetMessage = () => {
    if (error) setError('')
    resetForm.clearErrors()
  }

  // The one banner shown across every stage — a server-side failure (`error`)
  // always wins; otherwise the current stage's form validation message is
  // shown, translated from the i18n key zodResolver attached to it. Same
  // pattern /login uses for its single error banner.
  const validationKey =
    stage === 'identifier'
      ? identifierForm.formState.errors.identifier?.message
      : stage === 'otp' && codeEntered
      ? passwordFormMessageKey(resetErrors)
      : undefined
  // A weak password is left to the checklist, so it gets no banner.
  const bannerMessage = error || (validationKey && validationKey !== WEAK_KEY ? t(validationKey) : '')

  // The eye for one password field. Labels are borrowed from /login rather than
  // adding keys that would need translating into ten languages.
  const passwordToggle = (visible: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      aria-label={visible ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
      aria-pressed={visible}
    >
      {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  )

  const inputCls =
    'w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

  // Both declared once rather than repeated across the four stages: the point of
  // this pass is that every stage looks like the same screen, and three
  // hand-copied class strings drift the moment one of them is edited. Matched to
  // the Sign In button on /login — same 44px target, radius, type scale, brand
  // fill and focus ring — because these two cards are one flow to the user.
  // Disabled is a token pair, not `disabled:opacity-60` — opacity fades the
  // label and the fill together, which rendered the label at 2.55:1. "Verify
  // code" sits disabled until six digits are in, so that is the state the user
  // looks at longest. primary-20 on primary-80 is 5.08:1.
  const primaryBtnCls =
    'w-full min-h-[44px] bg-primary-50 hover:bg-primary-60 text-primary-100 px-4 py-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 transition-colors text-base font-medium disabled:bg-primary-20 disabled:text-primary-80 disabled:cursor-not-allowed'

  // The brand sky blue, and a DELIBERATE choice — confirmed 2026-08-26 after it
  // was measured. #5cc2ed on white is 2.02:1, against WCAG AA's 4.5:1 for normal
  // text. Darkening to primary-80 (#236987, 6.10:1) was proposed and declined in
  // favour of the brand colour, here and on /login.
  //
  // Recorded so it is not silently "fixed" in a later styling pass — reopen it
  // with the brand owner, not in a cleanup.
  const backBtnCls =
    'mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors'

  return (
    /* Same wrapper fix as /login. `items-center` centres the card while it fits,
       but once it is taller than the viewport a centred flex item overflows
       EQUALLY in both directions and the top half sits before the scroll origin
       — the heading becomes unreachable. `items-start` + `my-auto` centres
       identically when there is room and collapses to 0 when there is not, so
       nothing is ever clipped.
       min-h-dvh because `100vh` on a phone is the viewport with the URL bar
       retracted, which makes the page scroll even when the card fits. Identical
       to `vh` on desktop. */
    <div className="min-h-dvh flex items-start justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative my-auto bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-6 sm:py-8 shadow-xl">
        {/* 44px target (TD-20). This was `p-2` — a 24px icon in 8px of padding is
            40px, under the minimum, while /login's identical control already had
            it. */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-gray-100 rounded transition-colors"
          aria-label={t('auth:register.close')}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          {/* Logo. Its absence here was an oversight, not a decision: 23 pages
              render this mark, including /login and every register/* screen, and
              this is the ONLY auth page that was missing it — the DEF-003
              branding sweep covered /register and /login and stopped there.
              Same asset and same markup as /login, not a second implementation. */}
          <div className="flex justify-center mb-4">
            <div className="relative w-[180px] sm:w-[210px] h-[50px] sm:h-[58px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Header */}
          {stage !== 'done' && (
            <div className="text-center mb-5">
              <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
                {stage === 'identifier'
                  ? t('auth:forgot.titleEmail')
                  : codeEntered
                  ? t('auth:forgot.titleReset')
                  : t('auth:forgot.titleOtp')}
              </h1>
              <p className="text-base sm:text-lg text-[#777776]">
                {stage === 'identifier'
                  ? t('auth:forgot.subtitleIdentifier')
                  : codeEntered
                  ? t('auth:forgot.subtitleReset')
                  : t('auth:forgot.subtitleOtp', { identifier })}
              </p>
            </div>
          )}

          {IS_DEV_BUILD && devOtp && stage === 'otp' && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-amber-700 text-sm">{t('auth:forgot.devMode')} <span className="font-mono font-bold">{devOtp}</span></p>
            </div>
          )}

          {/* role="alert" so a validation failure is announced instead of only
              appearing — it was a silent <div> before. A server-side `error`
              always wins; otherwise the identifier form's own zod message is
              shown, translated from the i18n key the resolver attached to it —
              same single-banner pattern /login uses. */}
          {bannerMessage && (
            <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm whitespace-pre-line">{bannerMessage}</p>
            </div>
          )}

          {resendNotice && stage === 'otp' && (
            <div role="status" className="mb-5 p-4 bg-gray-50 border border-[#dedede] rounded-lg">
              <p className="text-[#555] text-sm">{t('auth:forgot.resendNotice')}</p>
            </div>
          )}

          {/* Stage 1 — identifier (email or mobile number) */}
          {stage === 'identifier' && (
            <form onSubmit={identifierForm.handleSubmit(onSendCode)} className="space-y-5">
              <div>
                <IdentifierField
                  id="identifier"
                  label={t('auth:forgot.identifierLabel')}
                  placeholder={t('auth:forgot.identifierPlaceholder')}
                  register={identifierForm.register('identifier')}
                />
                <p className="mt-2 text-sm text-gray-600">{t('auth:forgot.identifierHint')}</p>
              </div>
              {/* Primary action and its way out, grouped. As a third child of the
                  form's `space-y` the back link sat a full field-gap below the
                  button AND carried its own tap padding on top — far more air
                  than the step between them deserves. */}
              <div>
                <button type="submit" disabled={loading} className={primaryBtnCls}>
                  {loading ? t('auth:forgot.sending') : t('auth:forgot.sendResetCode')}
                </button>
                <button type="button" onClick={handleBackToLogin} className={backBtnCls}>
                  <ArrowLeft className="w-4 h-4 shrink-0" /> {t('auth:forgot.backToLogin')}
                </button>
              </div>
            </form>
          )}

          {/* Stage 2 — code, then (after Continue) the new password, on one screen.
              One form so the code boxes stay mounted and editable when the
              password fields appear; Enter submits whichever step is showing. */}
          {stage === 'otp' && (
            <form onSubmit={codeEntered ? handleReset : handleVerifyOtp} className="space-y-5">
              <div>
                <label id="otp-label" htmlFor="otp-0" className="block text-base font-medium text-black mb-2">
                  {t('auth:forgot.codeLabel')}
                </label>
                {/* One field made of six boxes, not six fields.
                    `role="group"` + `aria-labelledby` is what ties them together
                    for a screen reader: it announces "6-digit code, group" once
                    on entry rather than treating each box as an unrelated
                    control. The <label> points at the FIRST box, so clicking it
                    starts you in the right place.

                    grid-cols-6, not a flex row of fixed-width boxes: six 48px
                    boxes plus gaps overflow the ~310px content box at 390px. The
                    grid divides whatever width exists, so they shrink to fit and
                    stay equal at every width. */}
                <OtpInput
                  ref={otpInputRef}
                  value={otp}
                  onChange={handleOtpChange}
                  idPrefix="otp"
                  labelledBy="otp-label"
                  ariaLabel={t('auth:forgot.codeLabel')}
                  disabled={loading || resending}
                />
              </div>

              {codeEntered && (
                <>
                  <div>
                    <label htmlFor="newPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.newPasswordLabel')}</label>
                    <div className="relative">
                      {/* Controller, not register: the input is disabled while the
                          request is in flight, and a disabled DOM input must not be
                          what supplies the value. */}
                      <Controller
                        name="newPassword"
                        control={resetForm.control}
                        render={({ field }) => (
                          <input
                            {...field}
                            onChange={(e) => { field.onChange(e); clearResetMessage() }}
                            onBlur={() => { field.onBlur(); setNewPasswordTouched(true) }}
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={t('auth:forgot.newPasswordPlaceholder')}
                            disabled={loading}
                            className={`w-full h-12 px-4 pr-12 border rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50 ${
                              newPasswordTouched && !isStrongPassword(newPassword)
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-[#b5b5b5] focus:ring-primary-50'
                            }`}
                            required
                          />
                        )}
                      />
                      {passwordToggle(showNewPassword, () => setShowNewPassword((v) => !v))}
                    </div>
                    <div className="mt-2">
                      <PasswordRequirementsChecklist password={newPassword} touched={newPasswordTouched} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.confirmLabel')}</label>
                    <div className="relative">
                      <Controller
                        name="confirmPassword"
                        control={resetForm.control}
                        render={({ field }) => (
                          <input
                            {...field}
                            onChange={(e) => { field.onChange(e); clearResetMessage() }}
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('auth:forgot.confirmPlaceholder')}
                            disabled={loading}
                            className={`${inputCls} pr-12`}
                            required
                          />
                        )}
                      />
                      {passwordToggle(showConfirmPassword, () => setShowConfirmPassword((v) => !v))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <button type="submit" disabled={loading || resending || code.length !== OTP_LENGTH} className={primaryBtnCls}>
                  {!codeEntered
                    ? t('buttons.continue')
                    : loading
                    ? t('auth:forgot.saving')
                    : t('auth:forgot.resetPassword')}
                </button>
                <ResendOtpButton
                  onResend={handleResend}
                  onBusyChange={setResending}
                  cooldownSeconds={sendTiming.cooldownSeconds}
                  startOnMount
                  disabled={loading}
                  className="mt-2 text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors"
                />
                <button type="button" disabled={resending || loading} onClick={() => { setStage('identifier'); setCodeEntered(false); setOtp(EMPTY_OTP); resetForm.reset(); setNewPasswordTouched(false); setError(''); setResendNotice(false) }} className={`${backBtnCls} disabled:opacity-50`}>
                  <ArrowLeft className="w-4 h-4 shrink-0" /> {t('auth:forgot.useDifferentIdentifier')}
                </button>
              </div>
            </form>
          )}

          {/* Stage 3 — done */}
          {stage === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-black mb-2">{t('auth:forgot.doneTitle')}</h2>
              <p className="text-base text-[#777776] mb-6">{t('auth:forgot.doneBody')}</p>
              <button onClick={handleBackToLogin} className={primaryBtnCls}>
                {t('auth:forgot.backToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
