import { useEffect, useState } from 'react'

/** UX hint matching the backend's default RESEND_COOLDOWN_SECONDS; the backend still enforces its own. */
const RESEND_COOLDOWN_SECONDS = 30

/**
 * Seconds left before a code may be re-sent, counted from when it was sent
 * (`sentAt`, ms since epoch; null when no code has gone out for the current
 * contact). Derived from the timestamp rather than a counter that restarts at
 * 30 on every mount, so leaving the screen and coming back does not reset it.
 * Ticks only while a countdown is running.
 */
export function useResendCountdown(sentAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  const secondsLeft =
    sentAt === null
      ? 0
      : Math.min(RESEND_COOLDOWN_SECONDS, Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000)))
  const counting = secondsLeft > 0

  useEffect(() => {
    if (!counting) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [counting])

  return secondsLeft
}
