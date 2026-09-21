'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleLogin } from '@react-oauth/google'
import { AlertCircle, AlertTriangle, ArrowLeft, Eye, EyeOff, Loader2, Trash2, X } from 'lucide-react'
import { ApiError, meAPI, type DeleteAccountInput } from '@/lib/api'
import { passwordInputCls, eyeToggleCls } from '@/components/settings/formClasses'

type Step = 'choose' | 'password' | 'google'

interface DeleteAccountModalProps {
  onClose: () => void
  hasPassword: boolean
  hasGoogleLogin: boolean
  /** Called once the backend confirms deletion — caller owns the toast + sign-out. */
  onDeleted: () => void
}

const cancelBtnCls =
  'flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50'
const dangerBtnCls =
  'flex-1 px-6 py-3 bg-error-500 text-white rounded-lg text-base font-medium hover:bg-error-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
const methodBtnCls =
  'w-full min-h-[48px] px-6 border border-[#b5b5b5] rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-colors'

// The Google button renders inside an iframe, so it has to count as focusable.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

/**
 * Both methods → let the user pick; exactly one → skip straight to it. Both
 * false never reaches this modal (SettingsView withholds the button).
 */
function initialStep(hasPassword: boolean, hasGoogleLogin: boolean): Step {
  if (hasPassword && hasGoogleLogin) return 'choose'
  return hasGoogleLogin ? 'google' : 'password'
}

/** Mounted only while open, so every open starts from a fresh state. */
export function DeleteAccountModal({
  onClose,
  hasPassword,
  hasGoogleLogin,
  onDeleted,
}: DeleteAccountModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState<Step>(() => initialStep(hasPassword, hasGoogleLogin))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Set by a 409 ORG_DELETE_CONFIRM_REQUIRED: the proof that reached it, resent
  // unchanged on "Confirm & delete" (the backend re-runs the same re-auth check
  // on the retry), and the teammate count to warn with.
  const [orgConfirm, setOrgConfirm] = useState<{
    proof: DeleteAccountInput
    teammateCount: number
  } | null>(null)
  // Only an account holding both methods has a choice to go back to.
  const canChoose = hasPassword && hasGoogleLogin

  // Read while rendering, not in an effect: the password field's autoFocus runs
  // in the commit, before any effect, and would be recorded as the "opener".
  const [opener] = useState(() => document.activeElement as HTMLElement | null)

  // The Google button is 320px at most but must fit the card's content box, which
  // is narrower on a phone; Google allows 200–400px. Measured once before paint,
  // and the button only renders after (null until then).
  const [googleWidth, setGoogleWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const form = formRef.current
    if (!form) return
    const style = getComputedStyle(form)
    const content = form.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    setGoogleWidth(Math.max(200, Math.min(320, Math.floor(content))))
  }, [])

  // Lock page scroll while open, and hand focus back to whatever opened the modal.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [opener])

  // Escape closes (never mid-request); Tab is trapped inside the dialog, also
  // when focus has slipped outside it (a just-disabled button drops focus to body).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!submitting) onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      // With nothing focusable, first and last are the dialog itself.
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = items[0] ?? dialog
      const last = items[items.length - 1] ?? dialog
      const edge = e.shiftKey ? first : last
      if (document.activeElement === edge || !dialog.contains(document.activeElement)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [submitting, onClose])

  // Each step swaps the content under the user's focus; land on its first control.
  useEffect(() => {
    const form = formRef.current
    if (!form || form.contains(document.activeElement)) return
    ;(form.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current)?.focus()
  }, [step, orgConfirm])

  const submitDelete = async (input: DeleteAccountInput) => {
    setSubmitting(true)
    setError('')
    try {
      await meAPI.deleteAccount(input)
      onDeleted()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ORG_DELETE_CONFIRM_REQUIRED') {
        // The backend only asks when a teammate exists; a missing count would show a
        // wrong warning ("0 teammates") on a destructive confirm, so it falls through
        // to the generic failure below.
        const count = err.details?.teammateCount
        if (typeof count === 'number' && count >= 1) {
          setOrgConfirm({ proof: input, teammateCount: count })
          return
        }
      }
      if (err instanceof ApiError && err.code === 'REAUTH_FAILED') {
        // Also on the 409 retry (a Google token can expire while the warning is
        // read): back to entering the proof. One code covers a wrong Google
        // account and an expired token.
        setOrgConfirm(null)
        setError(
          input.idToken
            ? t('settings.deleteAccount.reauthFailedGoogle')
            : t('settings.deleteAccount.reauthFailed'),
        )
        return
      }
      setError(t('settings.deleteAccount.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'password' && password && !submitting) submitDelete({ password })
  }

  // The credential can arrive missing or blank (a cancelled Google popup, an
  // expired session) — @react-oauth/google types `cred.credential` as optional
  // for exactly this reason. Never forward an empty idToken to the delete
  // endpoint; ask the user to try again instead.
  const handleGoogleCredential = (idToken?: string) => {
    if (!idToken?.trim()) {
      setError(t('settings.deleteAccount.googleFailed'))
      return
    }
    submitDelete({ idToken })
  }

  const backToChoose = () => {
    setError('')
    setPassword('')
    setShowPassword(false)
    setStep('choose')
  }

  const Icon = orgConfirm ? AlertTriangle : Trash2
  const title = orgConfirm
    ? t('settings.deleteAccount.orgConfirmTitle')
    : t('settings.deleteAccount.title')
  const intro = orgConfirm
    ? t('settings.deleteAccount.orgConfirmBody', { count: orgConfirm.teammateCount })
    : step === 'choose'
      ? t('settings.deleteAccount.chooseIntro')
      : t('settings.deleteAccount.verifyIntro')

  const spinner = submitting && <Loader2 className="w-5 h-5 animate-spin" />

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* A stray click must not dismiss the organisation warning or a request in flight. */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={submitting || orgConfirm ? undefined : onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label={t('buttons.cancel')}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-error-600" />
            <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-black">
              {title}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">{intro}</p>

          {canChoose && !orgConfirm && step !== 'choose' && (
            <button
              type="button"
              onClick={backToChoose}
              disabled={submitting}
              className="mb-4 inline-flex items-center gap-1 text-sm text-primary-50 hover:text-primary-60 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('buttons.back')}
            </button>
          )}

          {!orgConfirm && step === 'choose' && (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => setStep('password')} className={methodBtnCls}>
                {t('settings.deleteAccount.continueWithPassword')}
              </button>
              <button type="button" onClick={() => setStep('google')} className={methodBtnCls}>
                {t('settings.deleteAccount.continueWithGoogle')}
              </button>
            </div>
          )}

          {!orgConfirm && step === 'password' && (
            <>
              <label htmlFor="deleteAccountPassword" className="block text-sm text-gray-700 mb-1">
                {t('settings.password.current')}
              </label>
              <div className="relative">
                <input
                  id="deleteAccountPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={passwordInputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('settings.password.hide') : t('settings.password.show')}
                  aria-pressed={showPassword}
                  className={eyeToggleCls}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {!orgConfirm && step === 'google' &&
            (submitting ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#717182]">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('settings.deleteAccount.verifying')}
              </div>
            ) : (
              <div className="flex justify-center">
                {googleWidth && (
                  <GoogleLogin
                    onSuccess={(cred) => handleGoogleCredential(cred.credential)}
                    onError={() => setError(t('settings.deleteAccount.googleFailed'))}
                    click_listener={() => setError('')}
                    width={String(googleWidth)}
                  />
                )}
              </div>
            ))}

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button type="button" onClick={onClose} disabled={submitting} className={cancelBtnCls}>
              {t('buttons.cancel')}
            </button>
            {orgConfirm ? (
              <button
                type="button"
                onClick={() => submitDelete({ ...orgConfirm.proof, confirmDeleteOrganisation: true })}
                disabled={submitting}
                className={dangerBtnCls}
              >
                {spinner}
                {t('settings.deleteAccount.confirmAndDelete')}
              </button>
            ) : (
              step === 'password' && (
                <button type="submit" disabled={!password || submitting} className={dangerBtnCls}>
                  {spinner}
                  {t('settings.deleteAccount.deleteButton')}
                </button>
              )
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
