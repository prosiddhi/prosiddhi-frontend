import { useEffect, useState } from 'react'
import { DEFAULT_RESEND_COOLDOWN_SECONDS } from '@/lib/otpSend'

/**
 * Seconds left before a code may be re-sent, counted from when it was sent
 * (`sentAt`, ms since epoch; null when no code has gone out for the current
 * contact), over `cooldownSeconds` (the server's value from that send's response;
 * the default when unknown). Derived from the timestamp rather than a counter that
 * restarts on every mount, so leaving the screen and coming back does not reset it.
 * Ticks only while a countdown is running.
 */
export function useResendCountdown(
  sentAt: number | null,
  cooldownSeconds: number = DEFAULT_RESEND_COOLDOWN_SECONDS,
): number {
  const [now, setNow] = useState(() => Date.now())
  const secondsLeft =
    sentAt === null
      ? 0
      : Math.min(cooldownSeconds, Math.max(0, cooldownSeconds - Math.floor((now - sentAt) / 1000)))
  const counting = secondsLeft > 0

  useEffect(() => {
    if (!counting) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [counting])

  return secondsLeft
}
