'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { GoogleLogin } from '@react-oauth/google'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, Download, Eye, EyeOff, Globe, Loader2, Lock, LogOut, RefreshCw, Trash2, User } from 'lucide-react'
import { Footer } from '@/components/home/Footer'
import { LANGUAGE_OPTIONS } from '@/components/navigation/LanguageSwitcher'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, authAPI, employerAPI, jobSeekerAPI, meAPI } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { saveBlob } from '@/lib/saveBlob'
import { isStrongPassword } from '@/lib/validation/passwordPolicy'
import {
  changePasswordSchema,
  passwordFormMessageKey,
  type ChangePasswordValues,
} from '@/lib/validation/passwordFormSchemas'
import { PasswordRequirementsChecklist } from '@/components/auth/PasswordRequirementsChecklist'
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal'
import { NotificationPrefsSection } from '@/components/settings/NotificationPrefsSection'
import {
  passwordInputCls,
  eyeToggleCls,
  outlineBtnBaseCls,
  cardCls,
  sectionHeadingCls,
  sectionHeadingIconCls,
} from '@/components/settings/formClasses'

const WEAK_PASSWORD_KEY = 'settings.password.weak'

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'
// The Google first-password form has no Current field.
type NewPasswordField = Exclude<PasswordField, 'currentPassword'>

/**
 * The checks the Google first-password form runs on its NEW password pair: the
 * i18n key of the first one that fails, or null when the pair is good. Change
 * password gets the same order from `changePasswordSchema`.
 */
function passwordPairProblem(password: string, confirmation: string): string | null {
  if (!isStrongPassword(password)) return WEAK_PASSWORD_KEY
  if (password !== confirmation) return 'settings.password.mismatch'
  return null
}

const changePasswordFormSchema = changePasswordSchema({
  weak: WEAK_PASSWORD_KEY,
  mismatch: 'settings.password.mismatch',
  sameAsCurrent: 'settings.password.sameAsCurrent',
})

// Singular labels (already shipped for /login and /forgot-password) — the
// `settings.password.show/hide` pair says "passwords", which no longer fits.
function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
      aria-pressed={shown}
      className={eyeToggleCls}
    >
      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )
}

/**
 * "Download my data" — the right of access the Privacy Policy promises. Saves the
 * JSON file from GET /me/export; any role.
 */
function DownloadMyDataSection() {
  const { t } = useTranslation()
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await meAPI.downloadMyData()
      // The person's own calendar date (en-CA formats as YYYY-MM-DD).
      saveBlob(blob, `prosiddhi-my-data-${new Date().toLocaleDateString('en-CA')}.json`)
    } catch (err) {
      // A 401 has already ended the session (apiRequest); offline has its banner.
      // 429 gets its own words: "try again in a few minutes" is literally true then.
      if (err instanceof ApiError && err.status === 401) return
      showToast(
        t(err instanceof ApiError && err.status === 429 ? 'settings.downloadData.rateLimited' : 'settings.downloadData.failed'),
        'error',
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className={cardCls}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={sectionHeadingCls}>
            <Download className={sectionHeadingIconCls} /> {t('settings.downloadData.title')}
          </h2>
          <p className="text-sm text-[#717182] mt-1">{t('settings.downloadData.description')}</p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={`${outlineBtnBaseCls} border border-primary-50 text-primary-50 hover:bg-primary-50 hover:text-primary-100 focus-visible:ring-primary-50 disabled:opacity-60`}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? t('settings.downloadData.downloading') : t('settings.downloadData.button')}
        </button>
      </div>
    </section>
  )
}

/**
 * Current + new + confirm, saved with POST /auth/change-password. Shown for an
 * account that already has a password; the Google first-password form stays in
 * SettingsView (its fields are saved by the Google button, not by submitting).
 */
function ChangePasswordSection({ initialError = '' }: { initialError?: string }) {
  const { t } = useTranslation()
  // Submit-only validation: the message stays until the next submit, never live.
  const {
    control,
    watch,
    reset,
    handleSubmit: validateAndSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const newPassword = watch('newPassword')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  // Bumped after a successful change: remounting the checklist forgets that
  // something was typed, so the emptied field reads neutral again.
  const [checklistKey, setChecklistKey] = useState(0)
  // One flag per input: each eye shows or hides only its own field.
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [saving, setSaving] = useState(false)
  // Starts with the parent's message: a first-password save that finds the password
  // already set swaps the card to this form and says why, as one form used to.
  const [error, setError] = useState(initialError)
  // `saving` is set only after RHF's async validation, so it cannot stop a second
  // submit that arrives in between. The ref is taken synchronously, first.
  const submitting = useRef(false)

  // The schema reports the first failing rule (strength, match, same-as-current)
  // as an i18n key; a server error, when there is one, wins over it. A weak
  // password is left to the checklist, so it gets no banner.
  const validationKey = passwordFormMessageKey(errors)
  const bannerMessage = error || (validationKey && validationKey !== WEAK_PASSWORD_KEY ? t(validationKey) : '')

  const onValid: SubmitHandler<ChangePasswordValues> = async (values) => {
    setSaving(true)
    try {
      await authAPI.changePassword(values.currentPassword, values.newPassword)
      reset()
      setNewPasswordTouched(false)
      setChecklistKey((k) => k + 1)
      showToast(t('settings.password.success'), 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.password.failed'))
    } finally {
      setSaving(false)
      submitting.current = false
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (saving || submitting.current) {
      e.preventDefault()
      return
    }
    submitting.current = true
    setError('')
    void validateAndSubmit(onValid, () => {
      submitting.current = false
    })(e).catch((err) => {
      // The resolver itself threw: neither callback ran, so release here or the
      // form stays locked with an enabled button. Re-thrown, not swallowed.
      submitting.current = false
      throw err
    })
  }

  const eyeToggleFor = (field: PasswordField) => (
    <EyeToggle shown={visible[field]} onToggle={() => setVisible((v) => ({ ...v, [field]: !v[field] }))} />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block text-sm text-gray-700 mb-1">
          {t('settings.password.current')}
        </label>
        <div className="relative">
          <Controller
            name="currentPassword"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="currentPassword"
                type={visible.currentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className={passwordInputCls}
              />
            )}
          />
          {eyeToggleFor('currentPassword')}
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
            <Controller
              name="newPassword"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  onBlur={() => {
                    field.onBlur()
                    setNewPasswordTouched(true)
                  }}
                  id="newPassword"
                  type={visible.newPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-describedby="passwordRule"
                  className={`w-full h-11 px-3 pr-10 border rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    newPasswordTouched && !isStrongPassword(newPassword)
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[#b5b5b5] focus:ring-primary-50'
                  }`}
                />
              )}
            />
            {eyeToggleFor('newPassword')}
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">
            {t('settings.password.confirm')}
          </label>
          <div className="relative">
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="confirmPassword"
                  type={visible.confirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={passwordInputCls}
                />
              )}
            />
            {eyeToggleFor('confirmPassword')}
          </div>
        </div>
      </div>

      {/* Spans the full row below both fields, so it reads as scoped to the
          new-password pair as a whole. */}
      <div id="passwordRule">
        <PasswordRequirementsChecklist key={checklistKey} password={newPassword} touched={newPasswordTouched} />
      </div>

      {bannerMessage && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-error-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{bannerMessage}</span>
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
  )
}

/**
 * Account / language / password / sign-out — everything below the header.
 * Shared by both role routes (`/settings` for a seeker, `/employer/settings`
 * for an employer): identical settings either side, only the surrounding
 * chrome differs, and each page supplies its own header for that.
 */
export function SettingsView({ showFooter = true }: { showFooter?: boolean }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguagePreference()

  // The login payload carries the phone only on the phone-OTP path, so read the
  // account contact details from the profile endpoint instead of the session.
  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  const [phone, setPhone] = useState<string | null>(null)
  // null while loading — distinct from "loaded and both false" (see canDeleteAccount).
  const [signInMethods, setSignInMethods] = useState<{
    hasPassword: boolean
    hasGoogleLogin: boolean
  } | null>(null)
  const [profileFailed, setProfileFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    let ignore = false
    // A retry, or a role change, starts from "loading" — never from the last result.
    setPhone(null)
    setSignInMethods(null)
    setProfileFailed(false)
    const run = async () => {
      try {
        const p = isEmployer
          ? await employerAPI.getProfile()
          : await jobSeekerAPI.getProfile()
        if (!ignore) {
          setPhone(p.phoneNumber ?? null)
          setSignInMethods({
            hasPassword: !!p.hasPassword,
            hasGoogleLogin: !!p.hasGoogleLogin,
          })
        }
      } catch {
        // The phone row is simply omitted; Delete Account shows a retry instead.
        if (!ignore) setProfileFailed(true)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [isEmployer, reloadKey])

  // Both false is an anomaly (every ACTIVE account holds at least one), so no
  // fallback that offers both methods — see the "unavailable" copy below.
  const canDeleteAccount = !!signInMethods && (signInMethods.hasPassword || signInMethods.hasGoogleLogin)
  const noSignInMethod = !!signInMethods && !canDeleteAccount
  const deleteAccountCopy = profileFailed
    ? t('settings.deleteAccount.loadFailed')
    : noSignInMethod
      ? t('settings.deleteAccount.unavailable')
      : t('settings.deleteAccount.description')

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  // Bumped after a successful change: remounting the checklist forgets that
  // something was typed, so the emptied field reads neutral again.
  const [checklistKey, setChecklistKey] = useState(0)
  const [confirmPassword, setConfirmPassword] = useState('')
  // One flag per input: each eye shows or hides only its own field.
  const [visible, setVisible] = useState<Record<NewPasswordField, boolean>>({
    newPassword: false,
    confirmPassword: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Profile still loading: the card waits, so a Google-only user never sees the wrong
  // form. A failed load falls back to Change password, as before.
  const passwordLoading = signInMethods === null && !profileFailed
  // A Google-only account has no password to "change": it sets its FIRST one, proved
  // by Google, not the session (POST /me/password).
  const isFirstPassword = !!signInMethods && signInMethods.hasGoogleLogin && !signInMethods.hasPassword
  // The Google button only shows for a valid pair, so no popup is spent on one the
  // backend would refuse.
  const canConfirmWithGoogle = isFirstPassword && passwordPairProblem(newPassword, confirmPassword) === null

  // Google allows 200–400px and the card is narrower than that on a phone, so size the
  // button to its (unpadded) container once before paint; null until then.
  const googleAreaRef = useRef<HTMLDivElement>(null)
  const [googleWidth, setGoogleWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!isFirstPassword || !googleAreaRef.current) return
    setGoogleWidth(Math.max(200, Math.min(320, googleAreaRef.current.clientWidth)))
  }, [isFirstPassword])

  const accountTypeLabel =
    user?.role === 'JOB_SEEKER'
      ? t('settings.roleSeeker')
      : user?.role === 'EMPLOYER_BUSINESS'
        ? t('settings.roleEmployerBusiness')
        : t('settings.roleEmployerIndividual')

  // An open Google popup keeps the callback it was rendered with, even after an edit
  // unmounts the button. Read the fields through a ref so it never sends a stale password.
  const latest = useRef({ newPassword, confirmPassword, saving })
  useLayoutEffect(() => {
    latest.current = { newPassword, confirmPassword, saving }
  })

  // The account now holds both methods: the card becomes Change password and Delete
  // account offers both proofs (AuthContext carries no such flags). The typed passwords
  // are cleared so they do not linger in state once the card has turned into the
  // Change password form.
  const markPasswordSet = () => {
    setNewPassword('')
    setConfirmPassword('')
    setNewPasswordTouched(false)
    setChecklistKey((k) => k + 1)
    setSignInMethods((methods) => methods && { ...methods, hasPassword: true })
  }

  // `idToken` stays a plain argument — never state, storage or logs. `credential` is
  // typed optional, so a blank one is refused here.
  const handleSetPassword = async (idToken?: string) => {
    const current = latest.current
    if (current.saving) return
    setError('')

    // The button only shows for a valid pair, but a popup can outlive it — this
    // guards the request.
    const problem = passwordPairProblem(current.newPassword, current.confirmPassword)
    if (problem) {
      setError(t(problem))
      return
    }
    if (!idToken?.trim()) {
      setError(t('settings.deleteAccount.googleFailed'))
      return
    }

    // Mark busy now: the ref only sees `saving` after the next render, and a second
    // callback can land first.
    current.saving = true
    setSaving(true)
    try {
      await meAPI.setPassword({ idToken, newPassword: current.newPassword })
      markPasswordSet()
      showToast(t('settings.password.setSuccess'), 'success')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REAUTH_FAILED') {
        // Wrong Google account or expired token: the session is kept and the fields
        // stay filled.
        setError(t('settings.deleteAccount.reauthFailedGoogle'))
      } else if (err instanceof ApiError && err.code === 'PASSWORD_ALREADY_SET') {
        // Set elsewhere first, so our flags are stale.
        markPasswordSet()
        setError(t('settings.password.alreadySet'))
      } else {
        setError(t('settings.password.failed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const eyeToggleFor = (field: NewPasswordField) => (
    <EyeToggle shown={visible[field]} onToggle={() => setVisible((v) => ({ ...v, [field]: !v[field] }))} />
  )

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

            <NotificationPrefsSection isEmployer={isEmployer} />

            {/* Change password — or, for a Google-only account, set its first password */}
            <section className={cardCls} aria-busy={passwordLoading}>
              {passwordLoading ? (
                <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-[#717182]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('status.loading')}
                </div>
              ) : (
                <>
                  <h2 className={sectionHeadingCls + ' mb-1'}>
                    <Lock className={sectionHeadingIconCls} />{' '}
                    {t(isFirstPassword ? 'settings.password.setTitle' : 'settings.password.title')}
                  </h2>
                  <p className="text-sm text-[#717182] mb-6">
                    {t(isFirstPassword ? 'settings.password.setDescription' : 'settings.password.description')}
                  </p>

                  {isFirstPassword ? (
                    <form
                      // A first password is saved by the Google button, never by submitting.
                      onSubmit={(e) => e.preventDefault()}
                      className="space-y-4"
                    >
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
                              type={visible.newPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              required
                              value={newPassword}
                              onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                              onBlur={() => setNewPasswordTouched(true)}
                              aria-describedby="passwordRule"
                              className={`w-full h-11 px-3 pr-10 border rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                                newPasswordTouched && !isStrongPassword(newPassword)
                                  ? 'border-red-500 focus:ring-red-500'
                                  : 'border-[#b5b5b5] focus:ring-primary-50'
                              }`}
                            />
                            {eyeToggleFor('newPassword')}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">
                            {t('settings.password.confirm')}
                          </label>
                          <div className="relative">
                            <input
                              id="confirmPassword"
                              type={visible.confirmPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              required
                              value={confirmPassword}
                              onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                              className={passwordInputCls}
                            />
                            {eyeToggleFor('confirmPassword')}
                          </div>
                        </div>
                      </div>

                      {/* Spans the full row below both fields — previously nested
                          under just New Password, which made it read as scoped to
                          that one field instead of the new-password pair as a
                          whole. */}
                      <div id="passwordRule">
                        <PasswordRequirementsChecklist key={checklistKey} password={newPassword} touched={newPasswordTouched} />
                      </div>

                      {error && (
                        <p role="alert" className="flex items-start gap-1.5 text-sm text-error-600">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="whitespace-pre-line">{error}</span>
                        </p>
                      )}

                      <div ref={googleAreaRef}>
                        {saving ? (
                          <div className="flex items-center gap-2 text-sm text-[#717182]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('settings.deleteAccount.verifying')}
                          </div>
                        ) : canConfirmWithGoogle ? (
                          <>
                            <p className="text-sm text-[#717182] mb-3">
                              {t('settings.password.setGooglePrompt')}
                            </p>
                            {googleWidth && (
                              <GoogleLogin
                                onSuccess={(cred) => handleSetPassword(cred.credential)}
                                onError={() => setError(t('settings.deleteAccount.googleFailed'))}
                                click_listener={() => setError('')}
                                width={String(googleWidth)}
                              />
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-[#717182]">{t('settings.password.setConfirmHint')}</p>
                        )}
                      </div>
                    </form>
                  ) : (
                    <ChangePasswordSection initialError={error} />
                  )}
                </>
              )}
            </section>

            <DownloadMyDataSection />

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

            {/* Delete account — the button is withheld (not disabled) when the
                account has no method to re-auth with. */}
            <section className={cardCls}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className={sectionHeadingCls}>
                    <Trash2 className={sectionHeadingIconCls} /> {t('settings.deleteAccount.title')}
                  </h2>
                  <p className="text-sm text-[#717182] mt-1">{deleteAccountCopy}</p>
                </div>
                {profileFailed && (
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className={`${outlineBtnBaseCls} border border-primary-50 text-primary-50 hover:bg-primary-50 hover:text-primary-100 focus-visible:ring-primary-50`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('buttons.retry')}
                  </button>
                )}
                {canDeleteAccount && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className={`${outlineBtnBaseCls} border border-error-500 text-error-600 hover:bg-error-500 hover:text-white active:bg-error-700 active:border-error-700 focus-visible:ring-error-500`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('settings.deleteAccount.deleteButton')}
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {showDeleteModal && signInMethods && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          hasPassword={signInMethods.hasPassword}
          hasGoogleLogin={signInMethods.hasGoogleLogin}
          onDeleted={() => {
            setShowDeleteModal(false)
            showToast(t('settings.deleteAccount.success'), 'success')
            logout()
          }}
        />
      )}

      {showFooter && <Footer width="wide" />}
    </>
  )
}

export default SettingsView
