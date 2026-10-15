'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isStrongPassword } from '@/lib/validation/passwordPolicy'
import {
  changePasswordSchema,
  passwordFormMessageKey,
  type ChangePasswordValues,
} from '@/lib/validation/passwordFormSchemas'
import { PasswordRequirementsChecklist } from '@/components/auth/PasswordRequirementsChecklist'
import { passwordInputCls, eyeToggleCls } from '@/components/settings/formClasses'

// The weak-password message is not shown: the live checklist already says which rules are unmet.
const WEAK_KEY = 'settings.password.weak'

const schema = changePasswordSchema({
  weak: WEAK_KEY,
  mismatch: 'settings.password.mismatch',
  sameAsCurrent: 'settings.password.sameAsCurrent',
})

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
  // Submit-only validation: the message stays until the next submit, never live.
  const {
    control,
    watch,
    handleSubmit: validateAndSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const newPassword = watch('newPassword')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  // One flag per input: each eye shows or hides only its own field.
  const [visible, setVisible] = useState<Record<keyof ChangePasswordValues, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // `saving` is set only after RHF's async validation, so it cannot stop a second
  // submit that arrives in between. The ref is taken synchronously, first.
  const submitting = useRef(false)

  const inputTypeFor = (field: keyof ChangePasswordValues) => (visible[field] ? 'text' : 'password')

  // The schema reports the first failing rule (strength, match, same-as-current)
  // as an i18n key; a server error, when there is one, wins over it. A weak
  // password is left to the checklist, so it gets no banner.
  const validationKey = passwordFormMessageKey(errors)
  const bannerMessage = error || (validationKey && validationKey !== WEAK_KEY ? t(validationKey) : '')

  const onValid: SubmitHandler<ChangePasswordValues> = async (values) => {
    setSaving(true)
    try {
      await authAPI.changePassword(values.currentPassword, values.newPassword)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.password.failed'))
      setSaving(false)
      submitting.current = false
      return
    }
    // Left `saving` on: the caller is about to navigate away, and a second submit in
    // that gap would just be refused by the BE ("must be different").
    showToast(t('settings.password.success'), 'success')
    onSuccess()
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

  // Singular labels (already shipped for /login and /forgot-password) — the
  // `settings.password.show/hide` pair says "passwords", which no longer fits.
  const eyeToggleFor = (field: keyof ChangePasswordValues) => (
    <button
      type="button"
      onClick={() => setVisible((v) => ({ ...v, [field]: !v[field] }))}
      aria-label={visible[field] ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
      aria-pressed={visible[field]}
      className={eyeToggleCls}
    >
      {visible[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
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
                type={inputTypeFor('currentPassword')}
                autoComplete="current-password"
                required
                aria-describedby="currentPasswordHint"
                className={passwordInputCls}
              />
            )}
          />
          {eyeToggleFor('currentPassword')}
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
                type={inputTypeFor('newPassword')}
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
                type={inputTypeFor('confirmPassword')}
                autoComplete="new-password"
                required
                className={passwordInputCls}
              />
            )}
          />
          {eyeToggleFor('confirmPassword')}
        </div>
      </div>

      <div id="passwordRule">
        <PasswordRequirementsChecklist password={newPassword} touched={newPasswordTouched} />
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
        className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 bg-primary-50 text-primary-100 rounded-lg transition-colors hover:bg-primary-60 active:bg-primary-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('settings.password.submit')}
      </button>
    </form>
  )
}
