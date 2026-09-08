'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Eye, EyeOff, Globe, Info, Loader2, Lock, LogOut, User } from 'lucide-react'
import { Footer } from '@/components/home/Footer'
import { LANGUAGE_OPTIONS } from '@/components/navigation/LanguageSwitcher'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI, employerAPI, jobSeekerAPI } from '@/lib/api'
import { showToast } from '@/lib/toast'

// Mirrors the BE rule (auth.validator changePasswordSchema): 8+ chars with at
// least one lowercase, one uppercase and one digit. Checked client-side so the
// user gets the rule before a round-trip; the BE remains the authority.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

/**
 * Account / language / password / sign-out — everything below the header.
 * Shared by both role routes (`/settings` for a seeker, `/employer/settings`
 * for an employer): identical settings either side, only the surrounding
 * chrome differs, and each page supplies its own header for that.
 */
export function SettingsView() {
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

  // Same input recipe Profile uses for its bordered fields (`#b5b5b5` border,
  // `#aaaaaa` placeholder) — the settings inputs used to be off-palette
  // (`gray-300`/`gray-200`), which is what made this page look like a
  // different app next to Profile/Job Feed/My Applications.
  // `pr-10` clears room for the in-field visibility-toggle icon (all three
  // password fields share one — see `showPasswords`).
  const inputClass =
    'w-full h-11 px-3 pr-10 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

  const toggleShowPasswords = () => setShowPasswords((v) => !v)
  const showPasswordsLabel = showPasswords ? t('settings.password.hide') : t('settings.password.show')
  const eyeToggleCls =
    'absolute inset-y-0 right-0 flex items-center px-3 text-[#717182] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 rounded-r-lg'

  // The card/heading recipe every other seeker page's sections already use
  // (Profile's Personal Information / Job Preferences / Documents cards).
  const cardCls = 'bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6'
  const sectionHeadingCls = 'flex items-center gap-2 text-lg sm:text-xl font-semibold text-black'
  const sectionHeadingIconCls = 'w-5 h-5 text-[#3386a9] flex-shrink-0'

  return (
    <>
      <main className="flex-1 pt-[clamp(16px,5.33px_+_1.67vw,32px)] pb-[clamp(24px,8px_+_2.5vw,48px)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Same container every other authenticated seeker page uses
              (Home/Job Feed/Saved Jobs/My Applications/Profile) — this is the
              one that must match the Header's own `max-w-[1920px] mx-auto`
              wrapper, not a Settings-specific width. */}
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-[clamp(16px,8px_+_1.25vw,28px)]">
            {t('settings.title')}
          </h1>

          <div className="space-y-6 sm:space-y-8">
            {/* Account — read-only. Editing name/photo/company lives on the
                profile screen; this is the "who am I signed in as" summary. */}
            <section className={cardCls}>
              <h2 className={sectionHeadingCls + ' mb-4'}>
                <User className={sectionHeadingIconCls} /> {t('settings.account.title')}
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-5">
                {/* A phone-only seeker has no email — this rendered as a blank
                    value, which reads as data loss rather than as "none given".
                    Say so instead. Adding one is a later pass; this is only the
                    honest empty state. */}
                <div>
                  <dt className="text-xs text-gray-500 mb-1">{t('settings.account.email')}</dt>
                  <dd className="text-sm sm:text-base font-medium text-black break-all">
                    {user?.email || (
                      <span className="font-normal text-[#717182]">
                        {t('settings.account.emailNone')}
                      </span>
                    )}
                  </dd>
                </div>
                {phone && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">{t('settings.account.phone')}</dt>
                    <dd className="text-sm sm:text-base font-medium text-black">{phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 mb-1">{t('settings.account.type')}</dt>
                  <dd className="text-sm sm:text-base font-medium text-black">{accountTypeLabel}</dd>
                </div>
              </dl>
              <div className="mt-5 pt-4 border-t border-[#eee]">
                <Link
                  href={isEmployer ? '/employer/profile' : '/profile'}
                  className="inline-flex items-center justify-center min-h-[44px] px-5 border border-primary-50 text-primary-50 rounded-lg transition-colors text-sm font-medium hover:bg-primary-50 hover:text-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2"
                >
                  {t('settings.account.editProfile')}
                </Link>
              </div>
            </section>

            {/* Language */}
            <section className={cardCls}>
              <h2 className={sectionHeadingCls + ' mb-1'}>
                <Globe className={sectionHeadingIconCls} /> {t('settings.language.title')}
              </h2>
              <p className="text-sm text-[#717182] mb-4">
                {t('settings.language.description')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const selected = opt.value === language
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLanguage(opt.value)}
                      aria-pressed={selected}
                      className={`flex items-center justify-between gap-2 min-h-[48px] px-4 rounded-lg border text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 ${
                        selected
                          ? 'border-primary-50 bg-primary-50/5 text-primary-50 font-medium'
                          : 'border-[#dddddd] text-gray-900 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Change password */}
            <section className={cardCls}>
              <h2 className={sectionHeadingCls + ' mb-1'}>
                <Lock className={sectionHeadingIconCls} /> {t('settings.password.title')}
              </h2>
              <p className="text-sm text-[#717182] mb-6">
                {t('settings.password.description')}
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm text-gray-700 mb-1">
                    {t('settings.password.current')}
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={toggleShowPasswords}
                      aria-label={showPasswordsLabel}
                      aria-pressed={showPasswords}
                      className={eyeToggleCls}
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New + Confirm sit side by side above `sm` — the same paired
                    layout Account already uses for its fields — so the card
                    fills its width intentionally instead of one narrow column
                    trailing off into empty space. */}
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm text-gray-700 mb-1">
                      {t('settings.password.new')}
                    </label>
                    <div className="relative">
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
                      <button
                        type="button"
                        onClick={toggleShowPasswords}
                        aria-label={showPasswordsLabel}
                        aria-pressed={showPasswords}
                        className={eyeToggleCls}
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">
                      {t('settings.password.confirm')}
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={toggleShowPasswords}
                        aria-label={showPasswordsLabel}
                        aria-pressed={showPasswords}
                        className={eyeToggleCls}
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spans the full row below both fields — previously nested
                    under just New Password, which made it read as scoped to
                    that one field instead of the new-password pair as a
                    whole. */}
                <p id="passwordRule" className="flex items-start gap-1.5 text-xs text-[#717182]">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{t('settings.password.rule')}</span>
                </p>

                {error && (
                  <p role="alert" className="flex items-start gap-1.5 text-sm text-error-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-6 bg-primary-50 text-primary-100 rounded-lg transition-colors hover:bg-primary-60 active:bg-primary-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings.password.submit')}
                </button>
              </form>
            </section>

            {/* Sign out — label/description left, action right, so the card
                reads as one deliberate row instead of stacked content parked
                in the top-left corner of a wide card. */}
            <section className={cardCls}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className={sectionHeadingCls}>
                    <LogOut className={sectionHeadingIconCls} /> {t('settings.signOut.title')}
                  </h2>
                  <p className="text-sm text-[#717182] mt-1">
                    {t('settings.signOut.description')}
                  </p>
                </div>
                <button
                  type="button"
                  // Wrapped, not passed by reference: logout() now takes an optional
                  // redirect path, and React would hand it the click's MouseEvent.
                  onClick={() => logout()}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-6 border border-error-500 text-error-600 rounded-lg transition-colors flex-shrink-0 hover:bg-error-500 hover:text-white active:bg-error-700 active:border-error-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default SettingsView
