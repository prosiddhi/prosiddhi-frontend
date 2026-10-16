'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_RESEND_COOLDOWN_SECONDS } from '@/lib/otpSend'

/** Clicks are ignored for this long after a resend settles, even with no countdown running. */
const RESEND_LOCK_MS = 1000

interface ResendOtpButtonProps {
  /** Must handle its own errors and resolve true only if a new code was requested. */
  onResend: () => Promise<boolean>
  /** Blocks the click while a parent request (e.g. verify) is already running. */
  disabled?: boolean
  /** Lets the page disable Verify / Back while a resend runs, so a late response
   *  cannot clear the boxes or set a notice on a screen the user has left. */
  onBusyChange?: (busy: boolean) => void
  /** Length of the countdown after a successful send, in seconds. */
  cooldownSeconds?: number
  /** Start the countdown when the button mounts. Only for screens that render this
   *  button right after the first code was sent successfully. */
  startOnMount?: boolean
  /** Colour and margin only; the layout classes live here. */
  className?: string
}

/**
 * The "Resend code" text button for the phone-OTP login, Google phone-bind and
 * forgot-password OTP screens.
 *
 * It owns the in-flight guard: the ref is taken synchronously so two fast clicks
 * cannot both pass, and the state only drives the disabled look.
 *
 * It also owns the countdown, so the page does not re-render every second. The
 * countdown is tracked as an end time, not a decrementing counter, so it stays
 * right when a background tab throttles the timer. It starts on mount when
 * `startOnMount` is set, and restarts only after `onResend` resolves true. A
 * refused or failed resend shows the backend's error through the caller's
 * `otpErrorMessage` and starts nothing. The backend's own cooldown still applies.
 */
export function ResendOtpButton({
  onResend,
  disabled,
  onBusyChange,
  cooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
  startOnMount = false,
  className,
}: ResendOtpButtonProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  // `inFlight` only covers a request that is still running. A fast reply (an
  // instant "Please wait" error, a local backend) can settle before the second
  // click of a double-click arrives, so clicks are also ignored for a moment
  // after a resend settles. Checked synchronously, like `inFlight`.
  const lockedUntil = useRef(0)
  // When the countdown ends (ms since epoch), or null if none is running. Lazy
  // initial state, not an effect, so Strict Mode's second mount cannot start another.
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    startOnMount ? Date.now() + cooldownSeconds * 1000 : null,
  )
  const [secondsLeft, setSecondsLeft] = useState(startOnMount ? cooldownSeconds : 0)

  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) setEndsAt(null)
    }, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const startCountdown = () => {
    setEndsAt(Date.now() + cooldownSeconds * 1000)
    setSecondsLeft(cooldownSeconds)
  }

  const handleClick = async () => {
    if (inFlight.current || Date.now() < lockedUntil.current) return
    if (endsAt !== null && Date.now() < endsAt) return
    inFlight.current = true
    setBusy(true)
    onBusyChange?.(true)
    let sent = false
    try {
      sent = await onResend()
    } finally {
      lockedUntil.current = Date.now() + RESEND_LOCK_MS
      inFlight.current = false
      setBusy(false)
      onBusyChange?.(false)
    }
    if (sent) startCountdown()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled || secondsLeft > 0}
      className={`w-full inline-flex items-center justify-center min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    >
      {busy
        ? t('auth:otp.sending')
        : secondsLeft > 0
        ? t('auth:otp.resendIn', { countdown: secondsLeft })
        : t('auth:otp.resendCode')}
    </button>
  )
}
