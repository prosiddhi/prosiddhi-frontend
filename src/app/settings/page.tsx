'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Check, Eye, EyeOff, Loader2, LogOut } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import {
  LanguageSwitcher,
  LANGUAGE_OPTIONS,
} from '@/components/navigation/LanguageSwitcher'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI, employerAPI, jobSeekerAPI } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'

// Mirrors the BE rule (auth.validator changePasswordSchema): 8+ chars with at
// least one lowercase, one uppercase and one digit. Checked client-side so the
// user gets the rule before a round-trip; the BE remains the authority.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function SettingsContent() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguagePreference()

  // The login payload carries the phone only on the phone-OTP path, so read the
  // account contact details from the profile endpoint instead of the session.
  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  const [phone, setPhone] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      try {
        const p = isEmployer
          ? await employerAPI.getProfile()
          : await jobSeekerAPI.getProfile()
        if (!ignore) setPhone(p.phoneNumber ?? null)
      } catch {
        // Non-critical: the phone row is simply omitted if we can't load it.
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [isEmployer])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const accountTypeLabel =
    user?.role === 'JOB_SEEKER'
      ? t('settings.roleSeeker')
      : user?.role === 'EMPLOYER_BUSINESS'
        ? t('settings.roleEmployerBusiness')
        : t('settings.roleEmployerIndividual')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!PASSWORD_RULE.test(newPassword)) {
      setError(t('settings.password.weak'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.password.mismatch'))
      return
    }
    if (newPassword === currentPassword) {
      setError(t('settings.password.sameAsCurrent'))
      return
    }

    setSaving(true)
    try {
      await authAPI.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast(t('settings.password.success'), 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.password.failed'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-50'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center min-h-[44px]">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <LanguageSwitcher className="hidden lg:block" />
            <UserDropdown />
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-8">
            {t('settings.title')}
          </h1>

          {/* Account — read-only. Editing name/photo/company lives on the
              profile screen; this is the "who am I signed in as" summary. */}
          <section className="mb-10 border border-gray-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-black mb-4">
              {t('settings.account.title')}
            </h2>
            <dl className="space-y-3 text-sm">
              {/* A phone-only seeker has no email — this rendered as a blank
                  value, which reads as data loss rather than as "none given".
                  Say so instead. Adding one is a later pass; this is only the
                  honest empty state. */}
              <div className="flex justify-between gap-4">
                <dt className="text-[#717182]">{t('settings.account.email')}</dt>
                <dd className="text-black break-all text-right">
                  {user?.email || (
                    <span className="text-[#717182]">{t('settings.account.emailNone')}</span>
                  )}
                </dd>
              </div>
              {phone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#717182]">{t('settings.account.phone')}</dt>
                  <dd className="text-black">{phone}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-[#717182]">{t('settings.account.type')}</dt>
                <dd className="text-black">{accountTypeLabel}</dd>
              </div>
            </dl>
            <Link
              href={isEmployer ? '/employer/profile' : '/profile'}
              className="inline-flex items-center mt-5 min-h-[44px] px-5 border border-primary-50 text-primary-50 rounded-lg hover:bg-primary-50 hover:text-white transition-colors text-sm"
            >
              {t('settings.account.editProfile')}
            </Link>
          </section>

          {/* Language */}
          <section className="mb-10 border border-gray-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-black mb-1">
              {t('settings.language.title')}
            </h2>
            <p className="text-sm text-[#717182] mb-4">
              {t('settings.language.description')}
            </p>
            <div className="space-y-2">
              {LANGUAGE_OPTIONS.map((opt) => {
                const selected = opt.value === language
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between w-full min-h-[52px] px-4 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'border-primary-50 bg-primary-50/5 text-primary-50 font-medium'
                        : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check className="w-5 h-5" />}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Change password */}
          <section className="mb-10 border border-gray-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-black mb-1">
              {t('settings.password.title')}
            </h2>
            <p className="text-sm text-[#717182] mb-4">
              {t('settings.password.description')}
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm text-gray-700 mb-1">
                  {t('settings.password.current')}
                </label>
                <input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm text-gray-700 mb-1">
                  {t('settings.password.new')}
                </label>
                <input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-describedby="passwordRule"
                  className={inputClass}
                />
                <p id="passwordRule" className="text-xs text-[#717182] mt-1">
                  {t('settings.password.rule')}
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">
                  {t('settings.password.confirm')}
                </label>
                <input
                  id="confirmPassword"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="flex items-center gap-2 text-sm text-[#717182] hover:text-black min-h-[44px]"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPasswords ? t('settings.password.hide') : t('settings.password.show')}
              </button>

              {error && (
                <p role="alert" className="text-sm text-error-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 min-h-[48px] px-6 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('settings.password.submit')}
              </button>
            </form>
          </section>

          {/* Sign out */}
          <section className="mb-4 border border-gray-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-black mb-1">
              {t('settings.signOut.title')}
            </h2>
            <p className="text-sm text-[#717182] mb-4">
              {t('settings.signOut.description')}
            </p>
            <button
              type="button"
              // Wrapped, not passed by reference: logout() now takes an optional
              // redirect path, and React would hand it the click's MouseEvent.
              onClick={() => logout()}
              className="flex items-center gap-2 min-h-[48px] px-6 border border-error-500 text-error-600 rounded-lg hover:bg-error-500 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function SettingsPage() {
  // No `requiredRole` — settings are the same for seekers and employers.
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}
