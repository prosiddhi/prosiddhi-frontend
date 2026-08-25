'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { emailOtpAPI, authAPI } from '@/lib/api'

// Mirrors the BE resetPasswordSchema (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const OTP_LENGTH = 6
const EMPTY_OTP = Array.from({ length: OTP_LENGTH }, () => '')

/**
 * Is this a development build?
 *
 * `process.env.NODE_ENV` is INLINED by Next at build time, so in a production
 * build every use of this collapses to `false` and the branches behind it are
 * dropped from the bundle entirely. That is the point: the dev OTP banner must
 * be impossible to render in production, not merely unlikely.
 *
 * It was previously gated on nothing but "did the server send an `otp` field",
 * which is a promise the server is NOT currently keeping — docs/STATUS.md §1
 * records that the backend still runs with `NODE_ENV=development` on the public
 * internet and therefore echoes OTPs in API responses. Under that server, the
 * old condition rendered the code to real users on the real site.
 *
 * ⚠️ The same weak gate is still in place at five other render sites — see the
 * note in the session report. This constant fixes THIS page only.
 */
const IS_DEV_BUILD = process.env.NODE_ENV !== 'production'

type Stage = 'email' | 'otp' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  // Six slots rather than one string, so a cleared middle box stays a hole
  // instead of shifting every digit after it left. Joined back to a plain string
  // at the two places that consume it, so the code sent to the API and the
  // "exactly 6" rule are unchanged. Same shape the three other OTP screens in
  // this app already use.
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [devOtp, setDevOtp] = useState<string | undefined>()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => router.push('/')
  const handleBackToLogin = () => router.push('/login')

  // Stage 1 — request the reset OTP (email-OTP, FORGOT_PASSWORD purpose).
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError(t('auth:forgot.errorEmail'))
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = (await emailOtpAPI.send(email.trim(), 'FORGOT_PASSWORD')) as
        | { otp?: string }
        | undefined
      // Never even hold the value in state in a production build — the render
      // guard alone would be enough, but this way the code cannot reach the
      // client component's state to be read out of a React devtools dump either.
      if (IS_DEV_BUILD) setDevOtp(res?.otp)
      setStage('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:forgot.errorSendFailed'))
    } finally {
      setLoading(false)
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
    setStage('reset')
  }

  const focusOtpBox = (index: number) => {
    otpRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus()
  }

  const writeOtp = (next: string[]) => {
    setOtp(next)
    if (error) setError('')
  }

  // `slice(-1)` so typing into a box that already holds a digit REPLACES it
  // rather than being swallowed by maxLength — what every OTP field does.
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    writeOtp(next)
    if (digit && index < OTP_LENGTH - 1) focusOtpBox(index + 1)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // From an empty box, one press should clear the previous digit AND move
      // there — otherwise it takes two presses to delete one digit.
      e.preventDefault()
      const next = [...otp]
      next[index - 1] = ''
      writeOtp(next)
      focusOtpBox(index - 1)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusOtpBox(index - 1)
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault()
      focusOtpBox(index + 1)
    }
  }

  // Paste needs its own handler: the change handler only ever sees ONE
  // character, so without this a pasted "502109" lands as a single "9" in
  // whichever box had focus. Pasting is how most people enter a code they were
  // just emailed, so this is the primary path, not an edge case.
  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH - index)
    if (!digits) return
    e.preventDefault()
    const next = [...otp]
    for (let i = 0; i < digits.length; i++) next[index + i] = digits[i]
    writeOtp(next)
    focusOtpBox(index + digits.length)
  }

  // Stage 3 — set the new password (BE verifies the OTP, then consumes it).
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!PASSWORD_RULE.test(newPassword)) {
      setError(t('auth:forgot.errorRule'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth:forgot.errorMismatch'))
      return
    }
    try {
      setLoading(true)
      setError('')
      await authAPI.resetPassword(email.trim(), code, newPassword)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:forgot.errorResetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

  // Both declared once rather than repeated across the four stages: the point of
  // this pass is that every stage looks like the same screen, and three
  // hand-copied class strings drift the moment one of them is edited. Matched to
  // the Sign In button on /login — same 44px target, radius, type scale, brand
  // fill and focus ring — because these two cards are one flow to the user.
  const primaryBtnCls =
    'w-full min-h-[44px] bg-primary-50 hover:bg-primary-60 text-primary-100 px-4 py-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 transition-colors text-base font-medium disabled:opacity-60'

  // primary-80, not primary-50. #5cc2ed on white measures 2.02:1 against WCAG
  // AA's 4.5:1 for normal text — the same figure TD-48 recorded before it
  // darkened the primary button's label. #236987 is 6.10:1 and is the existing
  // token two steps down the same brand ramp; primary-70 was checked first and
  // is only 4.10:1, so it would not have been enough.
  const backBtnCls =
    'mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] text-sm font-medium text-primary-80 hover:text-primary-90 transition-colors'

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
                {stage === 'email'
                  ? t('auth:forgot.titleEmail')
                  : stage === 'otp'
                  ? t('auth:forgot.titleOtp')
                  : t('auth:forgot.titleReset')}
              </h1>
              <p className="text-base sm:text-lg text-[#777776]">
                {stage === 'email'
                  ? t('auth:forgot.subtitleEmail')
                  : stage === 'otp'
                  ? t('auth:forgot.subtitleOtp', { email })
                  : t('auth:forgot.subtitleReset')}
              </p>
            </div>
          )}

          {IS_DEV_BUILD && devOtp && stage === 'otp' && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-amber-700 text-sm">{t('auth:forgot.devMode')} <span className="font-mono font-bold">{devOtp}</span></p>
            </div>
          )}

          {/* role="alert" so a validation failure is announced instead of only
              appearing — it was a silent <div> before. */}
          {error && (
            <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Stage 1 — email */}
          {stage === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-black mb-2">{t('auth:forgot.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder={t('auth:forgot.emailPlaceholder')}
                  disabled={loading}
                  className={inputCls}
                  required
                />
                <p className="mt-2 text-sm text-gray-600">{t('auth:forgot.emailHint')}</p>
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

          {/* Stage 2 — otp */}
          {stage === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
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
                <div role="group" aria-labelledby="otp-label" className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={(el) => {
                        otpRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      /* one-time-code on the FIRST box only — that is where the
                         platform offers the autofill chip, and repeating it
                         across all six makes some keyboards offer it six times. */
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={(e) => handleOtpPaste(i, e)}
                      /* Select on focus so tapping a filled box overtypes it
                         rather than leaving the caret beside the digit. */
                      onFocus={(e) => e.target.select()}
                      disabled={loading}
                      aria-label={`${t('auth:forgot.codeLabel')} ${i + 1}`}
                      className="w-full h-12 sm:h-14 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>
              <div>
                <button type="submit" disabled={loading || code.length !== OTP_LENGTH} className={primaryBtnCls}>
                  {loading ? t('auth:forgot.verifying') : t('auth:forgot.verifyCode')}
                </button>
                <button type="button" onClick={() => { setStage('email'); setOtp(EMPTY_OTP); setError('') }} className={backBtnCls}>
                  <ArrowLeft className="w-4 h-4 shrink-0" /> {t('auth:forgot.useDifferentEmail')}
                </button>
              </div>
            </form>
          )}

          {/* Stage 3 — new password */}
          {stage === 'reset' && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="newPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.newPasswordLabel')}</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }}
                    placeholder={t('auth:forgot.newPasswordPlaceholder')}
                    disabled={loading}
                    className={`${inputCls} pr-12`}
                    required
                  />
                  {/* Was a bare icon with no accessible name and no tap target —
                      a screen reader announced only "button". Borrows the two
                      labels /login already ships rather than adding keys that
                      would need translating into ten languages for a control
                      whose wording is identical. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* text-sm/gray-600, matching the email hint. The two hints play
                    the same role and were styled differently (text-xs/gray-500
                    here), which read as two levels of importance where there is
                    only one. */}
                <p className="mt-2 text-sm text-gray-600">{t('auth:forgot.passwordHint')}</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-base font-medium text-black mb-2">{t('auth:forgot.confirmLabel')}</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder={t('auth:forgot.confirmPlaceholder')}
                  disabled={loading}
                  className={inputCls}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className={primaryBtnCls}>
                {loading ? t('auth:forgot.saving') : t('auth:forgot.resetPassword')}
              </button>
            </form>
          )}

          {/* Stage 4 — done */}
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
