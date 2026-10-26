/**
 * Test-mode OTP pop-up: carries a code the backend put in its reply to the
 * <TestOtpPopup /> mounted in the root layout.
 *
 * The backend only puts `otp` in a reply when its EXPOSE_OTP_IN_RESPONSE is
 * `true` — on staging, so testers can sign in without SMS. With it off (every
 * production server) its JSON replacer strips `otp` from every reply at any
 * depth (backend utils/otp-replacer.ts), so this never fires there.
 *
 * Two locks, both needed: that backend switch, AND this website being built
 * with NEXT_PUBLIC_SHOW_TEST_OTP=true (staging only — lib/features.ts). A
 * production build has the flag off, so this returns at once and the pop-up
 * never renders, even if a production API echoed a code by mistake.
 */

import { SHOW_TEST_OTP } from '@/lib/features'

export const SERVER_OTP_EVENT = 'prosiddhi:server-otp'

// A real code is digits only. Anything else under an `otp` key is ignored.
const CODE = /^\d{4,8}$/

function codeIn(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const otp = (value as { otp?: unknown }).otp
  return typeof otp === 'string' && CODE.test(otp) ? otp : null
}

/** Called by the API client with every parsed reply: the envelope and its `data`. */
export function reportServerOtp(json: unknown): void {
  if (!SHOW_TEST_OTP || typeof window === 'undefined') return
  const code = codeIn(json) ?? codeIn((json as { data?: unknown } | null)?.data)
  if (code) window.dispatchEvent(new CustomEvent<string>(SERVER_OTP_EVENT, { detail: code }))
}
