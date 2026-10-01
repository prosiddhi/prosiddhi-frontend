'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isStrongPassword } from '@/lib/validation/passwordPolicy'
import { PasswordRequirementsChecklist } from '@/components/auth/PasswordRequirementsChecklist'
import { passwordInputCls, eyeToggleCls } from '@/components/settings/formClasses'

interface ChangePasswordFormProps {
  /** Called once the BE has accepted the new password. */
  onSuccess: () => void
}

/**
 * Current + new + confirm password, saved with POST /auth/change-password.
 *
 * For the forced change after an admin reset — the "current" password is the
 * temporary one the person was given. SettingsView keeps its own copy (its
 * New/Confirm fields are shared with the Google first-password branch).
 */
export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleShowPasswords = () => setShowPasswords((v) => !v)
  const showPasswordsLabel = showPasswords ? t('settings.password.hide') : t('settings.password.show')
  const inputType = showPasswords ? 'text' : 'password'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError('')

    if (!isStrongPassword(newPassword)) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.password.failed'))
      setSaving(false)
      return
    }
    // Left `saving` on: the caller is about to navigate away, and a second submit in
    // that gap would just be refused by the BE ("must be different").
    showToast(t('settings.password.success'), 'success')
    onSuccess()
  }

  const eyeToggle = (
    <button
      type="button"
      onClick={toggleShowPasswords}
      aria-label={showPasswordsLabel}
      aria-pressed={showPasswords}
      className={eyeToggleCls}
    >
      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block text-sm text-gray-700 mb-1">
          {t('settings.password.current')}
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            type={inputType}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            aria-describedby="currentPasswordHint"
            className={passwordInputCls}
          />
          {eyeToggle}
        </div>
        <p id="currentPasswordHint" className="mt-1 text-xs text-[#717182]">
          {t('passwordChangeRequired.currentHint')}
        </p>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm text-gray-700 mb-1">
          {t('settings.password.new')}
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={inputType}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={() => setNewPasswordTouched(true)}
            aria-describedby="passwordRule"
            className={`w-full h-11 px-3 pr-10 border rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
              newPasswordTouched && !isStrongPassword(newPassword)
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[#b5b5b5] focus:ring-primary-50'
            }`}
          />
          {eyeToggle}
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">
          {t('settings.password.confirm')}
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={inputType}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={passwordInputCls}
          />
          {eyeToggle}
        </div>
      </div>

      <div id="passwordRule">
        <PasswordRequirementsChecklist password={newPassword} />
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-error-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 bg-primary-50 text-primary-100 rounded-lg transition-colors hover:bg-primary-60 active:bg-primary-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('settings.password.submit')}
      </button>
    </form>
  )
}
