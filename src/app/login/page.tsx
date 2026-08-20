'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, X } from 'lucide-react'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, authAPI, otpAPI, type LoginRole, type UserRole, type AuthUser } from '@/lib/api'
import { safeInternalPath } from '@/lib/safeRedirect'

// `phoneOtp` and `phonePassword` are BOTH phone-identified; they differ only in
// the credential. Arm 3 (phone + password) exists because a seeker who
// registered without an email has no other password login — the phone IS their
// identity.
type Tab = 'email' | 'phoneOtp' | 'phonePassword' | 'google'

// New Google sign-ups land in PENDING_OTP_VERIFICATION; we hold them on /login
// in a phone-bind view before sending them to their dashboard.
type Mode = 'login' | 'bindPhone'

// The Google endpoint wants the full UserRole enum. The seeker tab maps straight
// to JOB_SEEKER; the employer tab additionally picks an individual/business subtype.
type EmployerSubtype = 'individual' | 'business'

// Seeker → /job-feed, Employer (individual/business) → /employer.
function homeForUser(user: AuthUser): string {
  return user.role === 'JOB_SEEKER' ? '/job-feed' : '/employer'
}

// Employer-only areas. A seeker who lands on a /employer/* returnUrl would just be
// bounced by ProtectedRoute, so send them home instead of through a dead redirect.
//
// /invite/<token> is the exception: it is a PUBLIC page that both roles may land on,
// and it renders its own "you're signed in as the wrong kind of account" guidance.
// Excluding it here would silently swallow a team invite — the invitee signs in and
// gets dumped on the dashboard with no idea the invite existed.
function returnUrlSuitsRole(returnUrl: string, user: AuthUser): boolean {
  if (returnUrl.startsWith('/invite/')) return true
  const isEmployerArea = returnUrl.startsWith('/employer')
  const isEmployer = user.role !== 'JOB_SEEKER'
  return isEmployerArea === isEmployer
}

/**
 * Where to land after a successful login.
 *
 * `returnUrl` is attacker-supplied (it arrives in a link), so it is normalised by
 * `safeInternalPath`, which is the single arbiter of "is this target ours?" — see
 * that module for why an origin check alone is NOT enough (an origin-passing URL can
 * still yield a protocol-relative PATHNAME like `//evil.com`, which the router then
 * hard-navigates cross-origin).
 *
 * It must also match the user's role, or we would send them somewhere ProtectedRoute
 * immediately bounces them out of.
 */
function destinationAfterLogin(user: AuthUser, returnUrl: string | null): string {
  const path = safeInternalPath(returnUrl)
  if (!path || path === '/') return homeForUser(user)
  if (!returnUrlSuitsRole(path, user)) return homeForUser(user)
  return path
}

/**
 * Which role tab to open on — defect 12.
 *
 * A logged-out click on an employer link (the footer's "Post a Job", or any
 * other employer deep link) arrives here as `/login?returnUrl=/employer/…`
 * because those pages render ProtectedRoute themselves. Reading the intent off
 * that is what makes the Employer tab preselect for EVERY employer destination
 * rather than a hard-coded handful.
 *
 * ⚠️ It reads the path that `safeInternalPath` has already validated and
 * normalised — NEVER the raw query string. This function must not become a
 * second way to turn attacker-supplied input into navigation; `safeInternalPath`
 * stays the single arbiter (an open redirect was fixed here once already).
 * Choosing a tab is the only thing this decides — it never routes anywhere.
 */
function initialRoleFor(returnUrl: string | null): LoginRole {
  const path = safeInternalPath(returnUrl)
  if (!path) return 'seeker'
  // A team invite is an invitation into an employer workspace, so the invitee
  // is an employer even though the path is not under /employer.
  if (path.startsWith('/employer') || path.startsWith('/invite/')) return 'employer'
  return 'seeker'
}

// Normalize a raw phone input to E.164 with a +91 default.
function toE164(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  // 10-digit Indian mobile → prefix +91.
  return `+91${digits}`
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Set by ProtectedRoute when it bounces a logged-out user off a deep link.
  const returnUrl = searchParams.get('returnUrl')
  const { t } = useTranslation()
  const { login } = useAuth()

  const [role, setRole] = useState<LoginRole>('seeker')
  // Set once the destination is known, unless the user has already picked. A
  // lazy useState initializer is NOT enough: this component reads
  // `useSearchParams`, which is empty during the server render, so the
  // initializer captures null and the Employer tab never preselects. Verified —
  // the SSR markup came back with Job Seeker active for an /employer returnUrl.
  const [roleTouched, setRoleTouched] = useState(false)
  const [tab, setTab] = useState<Tab>('email')

  useEffect(() => {
    if (roleTouched) return
    setRole(initialRoleFor(returnUrl))
  }, [returnUrl, roleTouched])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Google
  const [employerSubtype, setEmployerSubtype] = useState<EmployerSubtype>('individual')
  // Phone-bind step shown after a new Google sign-up. Reuses the phone/otp state
  // below; `bindUser` is the just-authenticated user, kept for the post-bind redirect.
  const [mode, setMode] = useState<Mode>('login')
  const [bindUser, setBindUser] = useState<AuthUser | null>(null)

  // Email/password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Phone/OTP
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  const handleClose = () => router.push('/')

  const onLoginSuccess = (result: { token: string; user: AuthUser }) => {
    login(result.token, result.user)
    router.push(destinationAfterLogin(result.user, returnUrl))
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
  }

  const switchRole = (next: LoginRole) => {
    setRole(next)
    // An explicit choice outranks the inferred one from here on.
    setRoleTouched(true)
    setError('')
  }

  /**
   * Login failures, with the wrong-role case pulled out (TD-08 / DEF-017).
   *
   * Right credentials on the wrong tab used to print the backend's raw
   * "Please use the correct login URL for your account type" — a sentence
   * about URLs, shown to someone who is looking at a tab, and meaningless in
   * the phone app that prints the same string.
   *
   * Keyed on `code`, NOT on the bare 403. Two reasons, both of which bite:
   *
   *  - An ADMIN fails the seeker gate AND the employer gate, so "403 means the
   *    other role" is false for them. Flipping the tab would 403 again and flip
   *    it back, forever. `actualRole` lets us say what the account actually is
   *    and stop.
   *  - Production runs behind nginx. An nginx or WAF 403 has no JSON body, so a
   *    status-only test would move the user's tab and assert an account type on
   *    no evidence.
   *
   * `code` and `error` both survive production — `sendError` dev-gates only a
   * serialised Error (prosiddhi-backend/src/utils/response.ts).
   *
   * `onWrongRole` lets the caller undo arm-specific state. The phone-OTP arm
   * needs it: authService.login verifies AND consumes the OTP before the role
   * gate runs (auth.service.ts:544-546, a hard delete in otp.service.ts:338),
   * so by the time this 403 arrives the code the user is holding is already
   * dead and "try again" would be a lie.
   */
  const handleLoginError = (err: unknown, onWrongRole?: () => void) => {
    if (err instanceof ApiError && err.code === 'ROLE_MISMATCH') {
      const actual = err.details?.actualRole
      // Admin has no tab here — the console is a separate app. Say so; do not
      // touch the toggle.
      if (actual === 'ADMIN' || actual === 'SUPER_ADMIN') {
        setError(t('auth:login.errorAdminAccount'))
        return
      }
      const other: LoginRole = actual === 'JOB_SEEKER' ? 'seeker' : 'employer'
      switchRole(other)
      onWrongRole?.()
      setError(
        other === 'employer'
          ? t('auth:login.errorWrongRoleEmployer')
          : t('auth:login.errorWrongRoleSeeker'),
      )
      return
    }
    setError(err instanceof Error ? err.message : t('auth:login.errorLogin'))
  }

  // --- Email/password ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    try {
      setLoading(true)
      setError('')
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      }
      const result = await authAPI.login(role, {
        identifier: email.trim().toLowerCase(),
        password,
      })
      onLoginSuccess(result)
    } catch (err) {
      handleLoginError(err)
    } finally {
      setLoading(false)
    }
  }

  // --- Phone + password (arm 3) ---
  // The only password login available to a seeker who registered without an
  // email. Same endpoint as the email arm; only the identifier differs.
  const handlePhonePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !password) return
    try {
      setLoading(true)
      setError('')
      const result = await authAPI.login(role, {
        identifier: toE164(phone),
        password,
      })
      onLoginSuccess(result)
    } catch (err) {
      handleLoginError(err)
    } finally {
      setLoading(false)
    }
  }

  // "Forgot password?" is email-based, so it is a dead end for a phone-only
  // seeker — the exact user arm 3 exists for. Offer the phone-OTP route as the
  // way back in instead.
  const switchToPhoneOtp = () => {
    setTab('phoneOtp')
    setError('')
    setOtpSent(false)
  }

  // --- Phone/OTP step 1: send ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return
    try {
      setLoading(true)
      setError('')
      await authAPI.loginPhoneSend(toE164(phone))
      setOtpSent(true)
      setOtp(['', '', '', '', '', ''])
      // focus first OTP box on next paint
      setTimeout(() => otpRefs.current[0]?.focus(), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:login.errorSendOtp'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // --- Phone/OTP step 2: verify (login with identifier=phone, otp) ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      setError(t('auth:login.errorOtpIncomplete'))
      return
    }
    try {
      setLoading(true)
      setError('')
      const result = await authAPI.login(role, {
        identifier: toE164(phone),
        otp: code,
      })
      onLoginSuccess(result)
    } catch (err) {
      // On a role mismatch the OTP has already been verified AND consumed
      // server-side, so this code is spent whatever happens next. Drop back to
      // the "send OTP" step — otherwise the six boxes clear, `otpSent` stays
      // true, and there is no Send button on screen to get a fresh code with.
      handleLoginError(err, () => setOtpSent(false))
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // --- Google ---
  // Build the BE UserRole from the role toggle (+ employer subtype).
  const googleRole = (): UserRole => {
    if (role === 'seeker') return 'JOB_SEEKER'
    return employerSubtype === 'business'
      ? 'EMPLOYER_BUSINESS'
      : 'EMPLOYER_INDIVIDUAL'
  }

  const handleGoogleSuccess = async (idToken?: string) => {
    if (!idToken) {
      setError(t('auth:google.failed'))
      return
    }
    try {
      setLoading(true)
      setError('')
      const result = await authAPI.googleLogin(googleRole(), idToken)
      // Store the token first — the phone-bind call below is authenticated.
      login(result.token, result.user)
      if (result.needsPhoneVerification) {
        setBindUser(result.user)
        setMode('bindPhone')
        setPhone('')
        setOtp(['', '', '', '', '', ''])
        setOtpSent(false)
      } else {
        router.push(destinationAfterLogin(result.user, returnUrl))
      }
    } catch (err) {
      // Deliberately NOT routed through handleLoginError. This is a different
      // endpoint with a different 403: auth.controller.ts:229-242 returns 403
      // for suspended, rejected AND admin accounts, and answers a cross-role
      // attempt with 409, not 403. Sending it through the wrong-role path would
      // tell a suspended user their account is the other type and move the tab
      // under them.
      setError(
        err instanceof Error ? err.message : t('auth:google.failed')
      )
    } finally {
      setLoading(false)
    }
  }

  // --- Phone-bind step 1: send OTP to the new phone ---
  const handleBindSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return
    try {
      setLoading(true)
      setError('')
      await otpAPI.send(toE164(phone))
      setOtpSent(true)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // --- Phone-bind step 2: verify OTP + bind phone, then go to dashboard ---
  const handleBindVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      setError(t('auth:bindPhone.otpIncomplete'))
      return
    }
    try {
      setLoading(true)
      setError('')
      await authAPI.changePhone(toE164(phone), code)
      router.push(bindUser ? homeForUser(bindUser) : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const tabBtn = (id: Tab) =>
    `py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
      tab === id ? 'bg-primary-50 text-white' : 'bg-[#f3f3f3] text-[#777776] hover:bg-gray-200'
    }`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label={t('auth:register.close')}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          {/* Logo — this was a bare modal asking for credentials with nothing
              identifying the site. Matches the registration screens. */}
          <div className="flex justify-center mb-5">
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
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
              {t('auth:login.title')}
            </h1>
            <p className="text-base sm:text-lg text-[#777776]">
              {t('auth:login.subtitle')}
            </p>
          </div>

          {/* Role toggle (hidden during the post-Google phone-bind step) */}
          {mode === 'login' && (
          <div className="flex gap-2 p-1 bg-[#f3f3f3] rounded-lg mb-5">
            {/* aria-pressed: a wrong-role login now moves this toggle on the
                user's behalf (TD-08). The error box below is role="alert", so
                the message itself is announced either way — this is what makes
                the resulting toggle STATE inspectable rather than leaving it
                encoded in a background colour. */}
            <button
              type="button"
              aria-pressed={role === 'seeker'}
              onClick={() => switchRole('seeker')}
              className={`flex-1 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                role === 'seeker' ? 'bg-white text-primary-50 shadow' : 'text-[#777776]'
              }`}
            >
              {t('auth:login.roleSeeker')}
            </button>
            <button
              type="button"
              aria-pressed={role === 'employer'}
              onClick={() => switchRole('employer')}
              className={`flex-1 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                role === 'employer' ? 'bg-white text-primary-50 shadow' : 'text-[#777776]'
              }`}
            >
              {t('auth:login.roleEmployer')}
            </button>
          </div>
          )}

          {/* Method tabs (hidden during the post-Google phone-bind step) */}
          {mode === 'login' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            <button type="button" onClick={() => switchTab('email')} className={tabBtn('email')}>
              {t('auth:login.tabEmail')}
            </button>
            <button type="button" onClick={() => switchTab('phoneOtp')} className={tabBtn('phoneOtp')}>
              {t('auth:login.tabPhoneOtp')}
            </button>
            <button type="button" onClick={() => switchTab('phonePassword')} className={tabBtn('phonePassword')}>
              {t('auth:login.tabPhonePassword')}
            </button>
            <button type="button" onClick={() => switchTab('google')} className={tabBtn('google')}>
              {t('auth:login.tabGoogle')}
            </button>
          </div>
          )}

          {/* Inline error */}
          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* --- Email + Password tab --- */}
          {mode === 'login' && tab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.emailLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth:login.emailPlaceholder')}
                    className="flex-1 h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    required
                  />
                  <VoiceButton label={t('auth:login.emailVoice')} iconClassName="w-6 h-6 text-gray-600" className="p-2" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.passwordLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth:login.passwordPlaceholder')}
                      className="w-full h-12 sm:h-14 px-4 pr-12 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded transition-colors"
                      aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                    </button>
                  </div>
                  <VoiceButton label={t('auth:login.passwordVoice')} iconClassName="w-6 h-6 text-gray-600" className="p-2" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 border border-[#aaaaaa] rounded cursor-pointer accent-primary-50"
                  />
                  <span className="text-sm text-black">{t('auth:login.rememberMe')}</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors">
                  {t('auth:login.forgotPassword')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
              >
                {loading ? t('auth:login.signingIn') : t('buttons.signIn')}
              </button>
            </form>
          )}

          {/* --- Phone + OTP tab --- */}
          {mode === 'login' && tab === 'phoneOtp' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.phoneLabel')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                  placeholder={t('auth:login.phonePlaceholder')}
                  className="w-full h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:bg-gray-50"
                />
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <button
                    type="submit"
                    disabled={loading || !phone}
                    className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
                  >
                    {loading ? t('auth:login.sending') : t('buttons.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="block text-base font-medium text-black mb-2">{t('auth:login.otpLabel')}</label>
                    <div className="flex justify-between gap-2">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
                  >
                    {loading ? t('auth:login.verifying') : t('auth:login.verifySignIn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setError('')
                    }}
                    className="w-full text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors"
                  >
                    {t('auth:login.changePhone')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- Phone + Password tab (login arm 3) --- */}
          {mode === 'login' && tab === 'phonePassword' && (
            <form onSubmit={handlePhonePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="pp-phone" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.phoneLabel')}
                </label>
                <input
                  id="pp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('auth:login.phonePlaceholder')}
                  className="w-full h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="pp-password" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="pp-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth:login.passwordPlaceholder')}
                    className="w-full h-12 sm:h-14 px-4 pr-12 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded transition-colors"
                    aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
              >
                {loading ? t('auth:login.signingIn') : t('buttons.signIn')}
              </button>

              {/* Phone-first recovery. "Forgot password?" resets via EMAIL, so it
                  is a dead end for exactly the user this tab serves. */}
              <div className="text-center">
                <p className="text-sm text-[#777776] mb-1">{t('auth:login.forgotPasswordPhone')}</p>
                <button
                  type="button"
                  onClick={switchToPhoneOtp}
                  className="text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors"
                >
                  {t('auth:login.useOtpInstead')}
                </button>
              </div>
            </form>
          )}

          {/* --- Google tab (PJP-72) --- */}
          {mode === 'login' && tab === 'google' && (
            <div className="space-y-4">
              {/* Employers must pick a subtype — the BE needs the exact role on sign-up. */}
              {role === 'employer' && (
                <div>
                  <p className="text-base font-medium text-black mb-2">{t('auth:google.employerType')}</p>
                  <div className="flex gap-2 p-1 bg-[#f3f3f3] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEmployerSubtype('individual')}
                      className={`flex-1 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                        employerSubtype === 'individual'
                          ? 'bg-white text-primary-50 shadow'
                          : 'text-[#777776]'
                      }`}
                    >
                      {t('auth:google.individualEmployer')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployerSubtype('business')}
                      className={`flex-1 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                        employerSubtype === 'business'
                          ? 'bg-white text-primary-50 shadow'
                          : 'text-[#777776]'
                      }`}
                    >
                      {t('auth:google.businessEmployer')}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(cred) => handleGoogleSuccess(cred.credential)}
                  onError={() =>
                    setError(t('auth:google.failed'))
                  }
                  width="320"
                />
              </div>
              {loading && (
                <p className="text-center text-sm text-[#777776]">{t('auth:google.signingIn')}</p>
              )}
            </div>
          )}

          {/* --- Phone-bind step (new Google sign-up) --- */}
          {mode === 'bindPhone' && (
            <div className="space-y-5">
              <p className="text-base text-black">
                {t('auth:bindPhone.intro')}
              </p>
              {!otpSent ? (
                <form onSubmit={handleBindSendOtp} className="space-y-5">
                  <div>
                    <label htmlFor="bind-phone" className="block text-base font-medium text-black mb-2">
                      {t('auth:bindPhone.phoneLabel')}
                    </label>
                    <input
                      id="bind-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('auth:bindPhone.phonePlaceholder')}
                      className="w-full h-12 sm:h-14 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
                  >
                    {loading ? t('auth:bindPhone.sending') : t('buttons.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBindVerify} className="space-y-5">
                  <div>
                    <label className="block text-base font-medium text-black mb-2">
                      {t('auth:bindPhone.otpLabel')}
                    </label>
                    <div className="flex justify-between gap-2">
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-50 hover:bg-primary-60 text-white py-3 rounded-lg transition-colors text-base font-medium disabled:opacity-60"
                  >
                    {loading ? t('auth:bindPhone.verifying') : t('auth:bindPhone.verifyContinue')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setError('')
                    }}
                    className="w-full text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors"
                  >
                    {t('auth:bindPhone.changePhone')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Sign Up Link (hidden during the post-Google phone-bind step) */}
          {mode === 'login' && (
          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-black">{t('auth:login.noAccount')}</span>
              <Link
                href={role === 'employer' ? '/employer/register' : '/register'}
                className="font-semibold text-secondary-50 hover:text-secondary-60 transition-colors"
              >
                {t('auth:login.signUpHere')}
              </Link>
            </p>
            {/* Employers only. This link was rendered for every role, so a job seeker
                signing in was shown "View pricing & plans" — contradicting the locked
                rule that seekers are free forever (PRODUCT.md §3). The sign-up link
                above was already role-gated; this one was missed. */}
            {role === 'employer' && (
              <p className="mt-3">
                <Link href="/employer/welcome#pricing" className="text-sm text-primary-50 hover:underline">
                  {t('auth:login.viewPricing')}
                </Link>
              </p>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  // `useSearchParams` (for returnUrl) opts this route into client-side rendering,
  // and Next requires the component that reads it to be inside a Suspense boundary
  // — without one the static prerender of /login fails at build time.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-50"
            role="status"
            aria-label="Loading"
          />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
