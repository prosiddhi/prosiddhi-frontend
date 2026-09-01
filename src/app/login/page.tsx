'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, authAPI, otpAPI, type LoginRole, type UserRole, type AuthUser } from '@/lib/api'
import { safeInternalPath } from '@/lib/safeRedirect'
import { toIdentifier, toE164 } from '@/lib/identifier'
import { SEEKER_HOME_ROUTE } from '@/lib/routes'

// `phoneOtp` and `phonePassword` differ only in the credential. `phonePassword`
// is misnamed by history: since TD-37 its field takes a phone number OR an
// email, which is why there is no separate email arm. There was one, and it
// called the same endpoint with the same payload — `toIdentifier` lowercases and
// shape-checks an email exactly as that form did, and `authService.login`
// detects the identifier type server-side either way. Two screens for one
// capability, so the second was removed rather than kept in step.
type Tab = 'phoneOtp' | 'phonePassword' | 'google'

const OTP_LENGTH = 6

// Shared by the primary actions on this card so they cannot drift apart.
// Matched to /forgot-password's button, which is the same control in the same
// flow.
//
// The disabled state is a real pair of tokens, NOT `disabled:opacity-60`.
// Opacity fades the label and the fill together toward white, so the dark
// primary-100 label ended up rendering as #6d858e on #9ddaf4 — 2.55:1, which is
// not readable. "Send OTP" is disabled until a number is typed, so that
// unreadable label was the FIRST thing on the phone-OTP screen. primary-20 on
// primary-80 is 5.08:1: obviously inactive next to the sky-blue enabled state,
// but still legible.
const PRIMARY_BTN_CLS =
  'w-full min-h-[44px] bg-primary-50 hover:bg-primary-60 text-primary-100 px-4 py-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 transition-colors text-base font-medium disabled:bg-primary-20 disabled:text-primary-80 disabled:cursor-not-allowed'

// The brand sky blue, and a DELIBERATE choice — confirmed 2026-08-26 after it
// was measured. #5cc2ed on white is 2.02:1, against WCAG AA's 4.5:1 for normal
// text; that is the same figure TD-48 recorded before it darkened the primary
// BUTTON's label, and it applies to every text link on this card. Darkening to
// primary-80 (#236987, 6.10:1) was proposed and declined in favour of the brand
// colour, on both auth pages.
//
// Recorded here so it is not silently "fixed" in a later styling pass — reopen
// it with the brand owner, not in a cleanup. The same decision was taken for the
// sign-up links (secondary-50) further down.
const TEXT_LINK_CLS = 'text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors'

// New Google sign-ups land in PENDING_OTP_VERIFICATION; we hold them on /login
// in a phone-bind view before sending them to their dashboard.
type Mode = 'login' | 'bindPhone'

// The Google endpoint wants the full UserRole enum. The seeker tab maps straight
// to JOB_SEEKER; the employer tab additionally picks an individual/business subtype.
type EmployerSubtype = 'individual' | 'business'

/**
 * The official four-colour Google "G", inline.
 *
 * Inline rather than an import because there is nothing in the project to reuse:
 * no mark in `public/`, no `react-icons`, and `lucide-react` ships only `Chrome`
 * — a BROWSER icon, not Google's identity. Using it would put the wrong mark on
 * a sign-in button, which is worse than shipping no mark at all.
 *
 * `@react-oauth/google` does render a branded button, but that is the OAuth
 * widget on the Google tab; this is the entry control that switches to it.
 *
 * The paths are Google's own artwork and must not be recoloured or redrawn —
 * their branding terms require the mark be used as issued. `aria-hidden` because
 * the button's own text already says "Continue with Google"; announcing the logo
 * too would read the word twice.
 */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

// Seeker → the seeker home page, Employer (individual/business) → /employer.
function homeForUser(user: AuthUser): string {
  return user.role === 'JOB_SEEKER' ? SEEKER_HOME_ROUTE : '/employer'
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
  // TD-37: phone-or-email + password is THE login. Google and phone-OTP are
  // still here, reachable by a text link below the form rather than a choice you
  // must make before you can start typing. `role` survives only for the Google
  // arm — see the note on the role block in the render.
  const [tab, setTab] = useState<Tab>('phonePassword')

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

  // Password, for the one password form. There is no `rememberMe` any more: the
  // checkbox only ever wrote a `rememberedEmail` key that nothing in the app
  // read, so it promised a convenience it never delivered — and it was one of
  // the six localStorage writes the Privacy Policy under-declares
  // (docs/i18n/COPY-DEFECTS.md A1).
  const [password, setPassword] = useState('')
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
  const handleLoginError = (err: unknown, onWrongRole?: () => void): boolean => {
    // TD-43's role-agnostic endpoint has no role to mismatch, so it refuses an
    // admin with its own code. Translate it: the backend's string is English
    // only, and this product ships in ten languages.
    if (err instanceof ApiError && err.code === 'ADMIN_ACCOUNT') {
      setError(t('auth:login.errorAdminAccount'))
      return false
    }
    if (err instanceof ApiError && err.code === 'ROLE_MISMATCH') {
      const actual = err.details?.actualRole
      // Admin has no tab here — the console is a separate app. Say so; do not
      // touch the toggle.
      if (actual === 'ADMIN' || actual === 'SUPER_ADMIN') {
        setError(t('auth:login.errorAdminAccount'))
        return false
      }
      // Only move the toggle for a role we actually recognise. Falling back to
      // "employer" for an unknown or missing actualRole would name an account
      // type on no evidence and reopen the flip-flop this whole branch exists
      // to prevent — a new role added backend-side would land here first.
      const other: LoginRole | null =
        actual === 'JOB_SEEKER' ? 'seeker'
        : actual === 'EMPLOYER_INDIVIDUAL' || actual === 'EMPLOYER_BUSINESS' ? 'employer'
        : null
      if (!other) {
        setError(err.message || t('auth:login.errorLogin'))
        return false
      }
      switchRole(other)
      onWrongRole?.()
      setError(
        other === 'employer'
          ? t('auth:login.errorWrongRoleEmployer')
          : t('auth:login.errorWrongRoleSeeker'),
      )
      return true
    }
    setError(err instanceof Error ? err.message : t('auth:login.errorLogin'))
    return false
  }

  // --- Phone or email + password ---
  // THE password login, for everybody. A seeker who registered phone-only has no
  // other one — their phone IS their identity — and an employer with no phone
  // signs in here with their email. `toIdentifier` decides which was typed.
  const handlePhonePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !password) return
    try {
      setLoading(true)
      setError('')
      // No `role` — the whole point of TD-37. loginAnyRole tries one gate and,
      // if the backend answers ROLE_MISMATCH with the account's real role, uses
      // that. Right credentials can no longer fail because you were looking at
      // the wrong tab, which was the most common way to fail to log in.
      // null = phone-shaped but not a plausible number. Sending it anyway would
      // come back "invalid credentials", blaming the password for a typo in the
      // number — and  used to do exactly that, silently.
      const identifier = toIdentifier(phone)
      if (!identifier) {
        // NOT auth:phone.errorInvalid — this field takes either, so phone-only
        // instructions are wrong half the time.
        setError(t('auth:login.errorIdentifierInvalid'))
        return
      }
      const result = await authAPI.loginAnyRole({ identifier, password }, role)
      onLoginSuccess(result)
    } catch (err) {
      // Still routed through handleLoginError: loginAnyRole deliberately does
      // NOT swallow an ADMIN ROLE_MISMATCH (an admin fails both gates), and this
      // is what says so rather than printing a raw backend string.
      handleLoginError(err)
    } finally {
      setLoading(false)
    }
  }

  // "Forgot password?" is email-based, so it is a dead end for a phone-only
  // seeker — the exact user the password form's phone identifier exists for.
  // Offer the phone-OTP route as the way back in instead.
  const switchToPhoneOtp = () => {
    // The two screens share `phone`, and the primary field now accepts an email.
    // Carrying "boss@acme.com" into a box labelled Phone Number prefills a
    // dead end: Send OTP cannot do anything with it.
    if (phone.includes('@')) setPhone('')
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
      const e164 = toE164(phone)
      if (!e164) {
        setError(t('auth:phone.errorInvalid'))
        return
      }
      await authAPI.loginPhoneSend(e164)
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

  const focusOtpBox = (index: number) => {
    otpRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus()
  }

  // `slice(-1)` so typing into a box that already holds a digit REPLACES it
  // rather than being swallowed by maxLength.
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < OTP_LENGTH - 1) focusOtpBox(index + 1)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Clear the previous digit as well as moving to it. Moving alone meant
      // two presses to delete one digit, and /forgot-password already behaves
      // this way — one OTP field should not have two rules.
      e.preventDefault()
      const next = [...otp]
      next[index - 1] = ''
      setOtp(next)
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
  // character, so a pasted "502109" was landing as a single "9" in whichever
  // box had focus. Pasting is how most people enter a code they were just sent,
  // so this was the primary path failing, not an edge case.
  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH - index)
    if (!digits) return
    e.preventDefault()
    const next = [...otp]
    for (let i = 0; i < digits.length; i++) next[index + i] = digits[i]
    setOtp(next)
    focusOtpBox(index + digits.length)
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
      const e164 = toE164(phone)
      if (!e164) {
        setError(t('auth:phone.errorInvalid'))
        return
      }
      // Role-agnostic, like both password arms. `loginSchema` arm 2 accepts
      // `{identifier, otp}` on /auth/login, so nothing here needs to know or
      // guess which kind of account this is.
      const result = await authAPI.loginAnyRole({ identifier: e164, otp: code }, role)
      onLoginSuccess(result)
    } catch (err) {
      // On a role mismatch the OTP has already been verified AND consumed
      // server-side, so this code is spent whatever happens next. Drop back to
      // the "send OTP" step — otherwise the six boxes clear, `otpSent` stays
      // true, and there is no Send button on screen to get a fresh code with.
      const wrongRole = handleLoginError(err, () => setOtpSent(false))
      setOtp(['', '', '', '', '', ''])
      // Don't chase focus into boxes that are about to unmount: on the
      // wrong-role path `otpSent` just went false, so focus would land on a
      // destroyed input and fall back to <body> — on a phone that opens the
      // keyboard and immediately closes it.
      if (!wrongRole) otpRefs.current[0]?.focus()
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
      const e164 = toE164(phone)
      if (!e164) {
        setError(t('auth:phone.errorInvalid'))
        return
      }
      await otpAPI.send(e164)
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
      const e164 = toE164(phone)
      if (!e164) {
        setError(t('auth:phone.errorInvalid'))
        return
      }
      await authAPI.changePhone(e164, code)
      router.push(bindUser ? homeForUser(bindUser) : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    /* `items-start` + `my-auto` on the card, NOT `items-center`.
       They look identical while the card fits: auto margins absorb the free
       space evenly, so the card is centred. They differ when it does NOT fit —
       with `items-center` a flex item taller than its container overflows
       EQUALLY in both directions, and the top overflow sits before the scroll
       origin, so the logo and heading cannot be scrolled to at all. Auto margins
       collapse to 0 instead, so the card starts at the top and every pixel is
       reachable. That is the "no content clipped" case at 390px and on a short
       laptop window.

       min-h-dvh, not min-h-screen: `100vh` on a phone is the viewport with the
       URL bar RETRACTED, so while the bar is showing the wrapper is taller than
       what you can see and the page scrolls even when the card fits. `dvh`
       tracks the visible viewport. On desktop the two are identical. */
    <div className="min-h-dvh flex items-start justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative my-auto bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-6 sm:py-8 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-gray-100 rounded transition-colors"
          aria-label={t('auth:register.close')}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          {/* Logo — this was a bare modal asking for credentials with nothing
              identifying the site. Matches the registration screens. */}
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
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2 leading-tight">
              {t('auth:login.title')}
            </h1>
            <p className="text-base sm:text-lg text-[#777776]">
              {t('auth:login.subtitle')}
            </p>
          </div>

          {/* Back navigation — ABOVE the role choice, not between it and the
              Google content.
              It used to sit after the role toggle, which put a navigation
              control in the middle of the form's own steps: "which are you?" →
              toggle → "go back" → employer type → Google. Read top to bottom it
              looked like a third step of the same question rather than a way out
              of the screen.
              At the top of the content it reads as what it is: the header says
              where you are, this says how to leave, and everything below it is
              the task. Left-aligned against a centred header, which is what
              separates navigation from content here — and it keeps the same
              `ArrowLeft` + `text-sm font-medium text-primary-50` treatment the
              back links on /forgot-password already use (page.tsx:152), rather
              than inventing a second back-link style.
              The literal "←" it used to print is now that icon: the glyph came
              from whichever Noto face was serving the current locale, so its
              weight and baseline shifted between languages. */}
          {mode === 'login' && tab !== 'phonePassword' && (
            <button
              type="button"
              onClick={() => switchTab('phonePassword')}
              className={`inline-flex items-center gap-2 min-h-[44px] mb-2 ${TEXT_LINK_CLS}`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {t('auth:login.backToMain')}
            </button>
          )}

          {/* Role choice — now ONE arm, and it is the only one that genuinely
              cannot do without it (TD-37). It used to sit above every method, so
              getting it wrong made right credentials fail on the most-used
              screen in the product.

              GOOGLE keeps it because for a new user this is a sign-UP: the role
              decides what account gets CREATED, which no server can infer. A
              cross-role attempt also answers 409, not the ROLE_MISMATCH a retry
              would key on.

              PHONE + OTP lost it. The old reason was sound for the two-gate
              retry — `authService` verifies and CONSUMES the code before the
              role gate, so a second attempt fails on a correct code — but it
              stopped applying when TD-43 landed a single role-agnostic endpoint,
              because there is no second attempt to make. `loginSchema` arm 2 is
              exactly `{identifier, otp}`, so it goes to /auth/login like the
              rest. Caught by the mobile session, which had already moved. */}
          {mode === 'login' && tab === 'google' && (
          <>
          <p className="text-sm text-[#777776] mb-2">{t('auth:login.roleQuestion')}</p>
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
              className={`flex-1 min-h-[44px] py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                role === 'seeker' ? 'bg-white text-primary-50 shadow' : 'text-[#777776]'
              }`}
            >
              {t('auth:login.roleSeeker')}
            </button>
            <button
              type="button"
              aria-pressed={role === 'employer'}
              onClick={() => switchRole('employer')}
              className={`flex-1 min-h-[44px] py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                role === 'employer' ? 'bg-white text-primary-50 shadow' : 'text-[#777776]'
              }`}
            >
              {t('auth:login.roleEmployer')}
            </button>
          </div>
          </>
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

          {/* --- Phone + OTP tab --- */}
          {mode === 'login' && tab === 'phoneOtp' && (
            <div className="space-y-5">
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
                  className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:bg-gray-50"
                />
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <button type="submit" disabled={loading || !phone} className={PRIMARY_BTN_CLS}>
                    {loading ? t('auth:login.sending') : t('buttons.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label id="otp-label" htmlFor="otp-0" className="block text-base font-medium text-black mb-2">
                      {t('auth:login.otpLabel')}
                    </label>
                    {/* One field made of six boxes, not six fields. `role="group"`
                        + `aria-labelledby` is what ties them together for a screen
                        reader — it announces the label once on entry instead of
                        treating each box as an unrelated control. The <label>
                        points at the FIRST box, so clicking it starts you there.

                        grid, not `flex justify-between` with fixed w-12 boxes:
                        six 48px boxes plus five 8px gaps is 328px, and the card's
                        content box at 390px is ~310px — the row overflowed its
                        own card. A 6-column grid divides whatever width there is,
                        so the boxes shrink to fit instead. */}
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
                          /* First box only — that is where the platform offers
                             the SMS autofill chip, and repeating it across all
                             six makes some keyboards offer it six times. */
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={(e) => handleOtpPaste(i, e)}
                          /* Select on focus so tapping a filled box overtypes it
                             rather than parking the caret beside the digit. */
                          onFocus={(e) => e.target.select()}
                          aria-label={`${t('auth:login.otpLabel')} ${i + 1}`}
                          className="w-full h-12 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  {/* Primary action and its way out, grouped — same shape as the
                      password form above and as /forgot-password. As a third
                      child of the form's `space-y` the secondary link sat a full
                      field-gap below the button AND carried its own 44px of tap
                      padding on top of that. */}
                  <div>
                    <button type="submit" disabled={loading} className={PRIMARY_BTN_CLS}>
                      {loading ? t('auth:login.verifying') : t('auth:login.verifySignIn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false)
                        setError('')
                      }}
                      className={`mt-2 w-full inline-flex items-center justify-center min-h-[44px] ${TEXT_LINK_CLS}`}
                    >
                      {t('auth:login.changePhone')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* --- Phone or email + password: the one password form --- */}
          {mode === 'login' && tab === 'phonePassword' && (
            <form onSubmit={handlePhonePasswordSubmit} className="space-y-5">
              <div>
                <label htmlFor="pp-phone" className="block text-base font-medium text-black mb-2">
                  {t('auth:login.identifierLabel')}
                </label>
                {/* type="text", not "tel" — this field now takes an email too,
                    and a tel keypad cannot produce an "@".
                    No inputMode either: "email" opens QWERTY, and most people
                    here type a 10-digit number, so it would put the majority one
                    layer away from their own keys. The default keyboard shows
                    both, and the placeholder says both are accepted.
                    autoCapitalize/spellCheck off because Android otherwise
                    renders an email as "You@example.com" while it is being
                    typed — toLowerCase fixes it on submit, but the user sees a
                    field that looks wrong and retypes it. */}
                <input
                  id="pp-phone"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('auth:login.identifierPlaceholder')}
                  className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth:login.passwordPlaceholder')}
                    className="w-full h-12 px-4 pr-12 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-gray-100 rounded transition-colors"
                    aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
              </div>

              {/* The primary action and the two ways past it, as ONE group.
                  Previously the recovery links were a separate child of the
                  form's `space-y`, so they sat a full field-gap (24px) below the
                  button AND carried their own 44px tap padding on top of it —
                  roughly 37px of visual gap where a field-to-field gap is 20px.
                  Grouping them lets the links sit close to the button they
                  relate to without touching either tap target. */}
              <div>
                {/* focus-visible matches the Google button below. A keyboard ring
                    on one of two adjacent buttons and not the other is worse than
                    having it on neither — the pair has to behave alike. */}
                <button type="submit" disabled={loading} className={PRIMARY_BTN_CLS}>
                  {loading ? t('auth:login.signingIn') : t('buttons.signIn')}
                </button>

                {/* BOTH recovery routes, because this one form now serves both
                    kinds of user. "Forgot password?" resets via EMAIL — a dead
                    end for a phone-only seeker, which is why the OTP route is
                    offered too. But the reverse is just as true and was the gap:
                    after TD-37 this field accepts an email, and an email-only
                    employer with no phone had ONLY the OTP link, which cannot
                    help them.

                    flex-col, NOT `text-center space-y-*`: both children are
                    inline-level (the Link is inline-flex, the button
                    inline-block), so in a block container they would render on
                    ONE line and wrap mid-phrase on a handset.

                    No `gap` while stacked: each child is a 44px tap target
                    (TD-20), and two stacked 44px boxes already put ~30px between
                    the two labels. Adding gap on top of that was spacing the
                    padding, not the text.

                    Side by side from sm up. Stacked, the pair costs 88px of card
                    height; inline it costs 44px, and the two labels together run
                    ~370px inside a 520px content box, so they fit with room to
                    spare. `flex-wrap` is there for the long Indic translations,
                    which drop to a second line rather than overflowing. */}
                <div className="mt-2 flex flex-col items-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
                  {/* Recovery, not a sign-in method — normal weight, so it reads
                      quieter than the OTP link below it. Both were `font-medium`
                      and therefore indistinguishable. */}
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center min-h-[44px] px-2 text-sm text-primary-50 hover:text-primary-60 transition-colors"
                  >
                    {t('auth:login.forgotPassword')}
                  </Link>
                  {/* An alternative way to sign in — keeps the medium weight. */}
                  <button
                    type="button"
                    onClick={switchToPhoneOtp}
                    className={`inline-flex items-center min-h-[44px] px-2 text-center ${TEXT_LINK_CLS}`}
                  >
                    {t('auth:login.useOtpInstead')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* The other ways in (TD-37). Below the form, not in front of it: a
              text link is an offer, a tab row is a question you must answer
              before you can start. Every method still works. */}
          {mode === 'login' && tab === 'phonePassword' && (
            /* The divider belongs to the section BELOW it, so the gaps are
               deliberately uneven: 24px above (mt-3 + the OTP link's own 12px of
               tap padding) and 16px below. That binds "or" to the Google button
               as one alternative-sign-in group, instead of leaving it floating
               equidistant between two groups it does not belong to. The 24px
               above matches the 24px down to the sign-up section, so the card
               reads as three blocks at one rhythm. */
            <div className="mt-3">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px flex-1 bg-[#e5e5e5]" />
                <span className="text-xs text-[#777776]">{t('auth:login.or')}</span>
                <span className="h-px flex-1 bg-[#e5e5e5]" />
              </div>
              {/* Same height, radius, padding and type scale as the Sign In
                  button above — only the fill differs, which is what makes this
                  read as the secondary of a matched pair rather than a different
                  species of button.

                  `justify-center` on the flex row centres the icon and the label
                  AS A GROUP, so the text is not nudged off the button's centre
                  by the icon's width. `shrink-0` keeps the mark circular if a
                  longer translation ever pushes the row (Malayalam and Odia are
                  the long ones). */}
              <button
                type="button"
                onClick={() => switchTab('google')}
                className="w-full min-h-[44px] flex items-center justify-center gap-3 border border-[#b5b5b5] rounded-lg px-4 py-3 text-base font-medium text-black hover:bg-gray-50 hover:border-grey-600 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 transition-all"
              >
                <GoogleG className="h-5 w-5 shrink-0" />
                {t('auth:login.continueWithGoogle')}
              </button>
            </div>
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
                      className={`flex-1 min-h-[44px] py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
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
                      className={`flex-1 min-h-[44px] py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
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
                      className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className={PRIMARY_BTN_CLS}>
                    {loading ? t('auth:bindPhone.sending') : t('buttons.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBindVerify} className="space-y-5">
                  <div>
                    <label id="bind-otp-label" htmlFor="bind-otp-0" className="block text-base font-medium text-black mb-2">
                      {t('auth:bindPhone.otpLabel')}
                    </label>
                    {/* Same six-box treatment as the sign-in OTP row above. These
                        two rows share `handleOtpChange` / `handleOtpKeyDown`, so
                        giving one of them paste and autofill and not the other
                        would be a difference with no reason behind it. */}
                    <div role="group" aria-labelledby="bind-otp-label" className="grid grid-cols-6 gap-2 sm:gap-3">
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          id={`bind-otp-${i}`}
                          ref={(el) => {
                            otpRefs.current[i] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={(e) => handleOtpPaste(i, e)}
                          onFocus={(e) => e.target.select()}
                          aria-label={`${t('auth:bindPhone.otpLabel')} ${i + 1}`}
                          className="w-full h-12 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className={PRIMARY_BTN_CLS}>
                    {loading ? t('auth:bindPhone.verifying') : t('auth:bindPhone.verifyContinue')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setError('')
                    }}
                    className={`w-full min-h-[44px] ${TEXT_LINK_CLS}`}
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
            </p>
            {/* BOTH destinations, not one guessed from `role` (TD-37).
                `role` is inferred from the returnUrl and is now invisible on this
                screen, so an employer who simply types the site address was sent
                to the SEEKER sign-up with no control to correct it — the old
                wrong-tab failure, moved from login to registration.
                Registration already asks "I want a job / I want to hire" as its
                first question, so naming both here costs nothing and guesses
                nothing. */}
            {/* Stacked on a handset, side by side from sm up. Inline at 390px
                the pair plus the separator runs to ~295px inside a ~310px card
                in ENGLISH alone — the longer Tamil and Malayalam labels wrap
                mid-phrase. Stacking keeps each label on one line and each tap
                target a full row wide.
                The separator is decorative, so it is hidden rather than left
                floating between two stacked rows.

                secondary-50 is the brand sky blue and is a DELIBERATE choice,
                confirmed 2026-08-25 after it was measured: #88d9fc on white is
                1.57:1, against WCAG AA's 4.5:1 for normal text. Darkening it to
                secondary-80 (4.77:1) was proposed and declined in favour of the
                brand colour. Recorded here so it is not silently "fixed" later —
                reopen it with the brand owner, not in a styling pass. */}
            <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-3 mt-1">
              <Link
                href="/register"
                className="inline-flex items-center min-h-[44px] font-medium text-secondary-50 hover:text-secondary-60 transition-colors"
              >
                {t('auth:login.signUpSeeker')}
              </Link>
              <span className="hidden sm:inline text-[#b5b5b5]" aria-hidden="true">·</span>
              <Link
                href="/employer/register"
                className="inline-flex items-center min-h-[44px] font-medium text-secondary-50 hover:text-secondary-60 transition-colors"
              >
                {t('auth:login.signUpEmployer')}
              </Link>
            </div>
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
