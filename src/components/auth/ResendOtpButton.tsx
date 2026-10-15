'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Clicks are ignored for this long after a resend settles. Not a countdown: nothing is shown. */
const RESEND_LOCK_MS = 1000

interface ResendOtpButtonProps {
  /** Must handle its own errors; the button only tracks whether it is still running. */
  onResend: () => Promise<void>
  /** Blocks the click while a parent request (e.g. verify) is already running. */
  disabled?: boolean
  /** Lets the page disable Verify / Back while a resend runs, so a late response
   *  cannot clear the boxes or set a notice on a screen the user has left. */
  onBusyChange?: (busy: boolean) => void
  /** Colour and margin only; the layout classes live here. */
  className?: string
}

/**
 * The "Resend code" text button for the phone-OTP login, Google phone-bind and
 * forgot-password OTP screens. It owns the in-flight guard: the ref is taken
 * synchronously so two fast clicks cannot both pass, and the state only drives
 * the disabled look. Deliberately no countdown this release; a refused resend
 * shows the backend's own error through the caller's `otpErrorMessage`.
 */
export function ResendOtpButton({ onResend, disabled, onBusyChange, className }: ResendOtpButtonProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  // `inFlight` only covers a request that is still running. A fast reply (an
  // instant "Please wait" error, a local backend) can settle before the second
  // click of a double-click arrives, so clicks are also ignored for a moment
  // after a resend settles. Checked synchronously, like `inFlight`.
  const lockedUntil = useRef(0)

  const handleClick = async () => {
    if (inFlight.current || Date.now() < lockedUntil.current) return
    inFlight.current = true
    setBusy(true)
    onBusyChange?.(true)
    try {
      await onResend()
    } finally {
      lockedUntil.current = Date.now() + RESEND_LOCK_MS
      inFlight.current = false
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      className={`w-full inline-flex items-center justify-center min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    >
      {busy ? t('auth:otp.sending') : t('auth:otp.resendCode')}
    </button>
  )
}
