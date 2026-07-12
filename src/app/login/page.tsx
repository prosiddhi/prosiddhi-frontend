'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, X } from 'lucide-react'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI, otpAPI, type LoginRole, type UserRole, type AuthUser } from '@/lib/api'

type Tab = 'email' | 'phone' | 'google'

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

// Normalize a raw phone input to E.164 with a +91 default.
function toE164(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  // 10-digit Indian mobile → prefix +91.
  return `+91${digits}`
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()

  const [role, setRole] = useState<LoginRole>('seeker')
  const [tab, setTab] = useState<Tab>('email')
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
    router.push(homeForUser(result.user))
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
  }

  const switchRole = (next: LoginRole) => {
    setRole(next)
    setError('')
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
      setError(err instanceof Error ? err.message : t('auth:login.errorLogin'))
    } finally {
      setLoading(false)
    }
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
      setError(err instanceof Error ? err.message : t('auth:login.errorOtpInvalid'))
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
        router.push(homeForUser(result.user))
      }
    } catch (err) {
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

  const tabBtn = (id: Tab, label: string) =>
    `flex-1 py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors ${
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
            <button
              type="button"
              onClick={() => switchRole('seeker')}
              className={`flex-1 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                role === 'seeker' ? 'bg-white text-primary-50 shadow' : 'text-[#777776]'
              }`}
            >
              {t('auth:login.roleSeeker')}
            </button>
            <button
              type="button"
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
          <div className="flex gap-2 mb-6">
            <button type="button" onClick={() => switchTab('email')} className={tabBtn('email', 'Email')}>
              {t('auth:login.tabEmail')}
            </button>
            <button type="button" onClick={() => switchTab('phone')} className={tabBtn('phone', 'Phone')}>
              {t('auth:login.tabPhone')}
            </button>
            <button type="button" onClick={() => switchTab('google')} className={tabBtn('google', 'Google')}>
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
          {mode === 'login' && tab === 'phone' && (
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
            <p className="mt-3">
              <Link href="/employer/welcome#pricing" className="text-sm text-primary-50 hover:underline">
                {t('auth:login.viewPricing')}
              </Link>
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
