// One error map for report-a-person and block / unblock (R1-10), on both the seeker
// and the employer side.
//
// Two rules, the same as lib/inviteErrors.ts:
//
// 1. BRANCH ON THE ERROR `code`, never on the message text. These routes send a
//    top-level `code` on every refusal, in every environment (unlike `reason`).
//    The fallback below, by status, only covers an answer that carries no code.
//
// 2. RETURN A KEY, NOT A SENTENCE. Callers keep the key and call t() at render
//    time, so a message raised in English re-renders when the user switches language.
//
// Never says "you were blocked": a blocked person is never told (decision D-5), so
// a target that vanished reads as "not available", not as a block.

import { ApiError } from '@/lib/api'

/** The i18n key describing why a report / block / unblock call failed. */
export function safetyErrorKey(err: unknown): string {
  if (!(err instanceof ApiError)) return 'common:safety.errors.generic' // offline / network

  switch (err.code) {
    case 'USER_REPORT_ALREADY_OPEN': // one open report per person; a new one once it is handled
      return 'common:safety.errors.alreadyReported'
    case 'RATE_LIMITED': // 5 reports a day
      return 'common:safety.errors.rateLimited'
    case 'REPORT_TARGET_NOT_FOUND': // the account is gone (deleted)
    case 'BLOCK_TARGET_NOT_FOUND':
      return 'common:safety.errors.notAvailable'
    case 'BLOCK_NOT_FOUND': // already unblocked (another tab, a teammate)
      return 'common:safety.errors.alreadyUnblocked'
    case 'SEAT_SUSPENDED': // an employer team member whose seat is paused
      return 'common:safety.errors.seatSuspended'
    case 'REPORT_TARGET_NOT_ALLOWED': // wrong side; the UI never offers this, so it is a bug
      return 'common:safety.errors.generic'
  }

  if (err.status === 429) return 'common:safety.errors.rateLimited'
  return 'common:safety.errors.generic'
}
