// One error map for the whole team-invite surface — the landing page AND the
// owner's roster both fail in the same ways, so they translate them the same way.
//
// Two rules encoded here:
//
// 1. BRANCH ON HTTP STATUS, NOT ON `reason`. The BE's sendError() puts `reason` in
//    the payload but gates it on NODE_ENV === 'development', so in production it is
//    simply absent. A reason-keyed map would quietly degrade to "something went
//    wrong" in prod — on exactly the surface where the user most needs to be told
//    what to do. `reason` only refines 400, the one status carrying two meanings.
//
// 2. RETURN A KEY, NOT A SENTENCE. Callers store the key and call t() at render
//    time, so an error raised in English does not stay English after the user
//    switches to Hindi — and the caller's effects no longer need `t` as a dep.

import { ApiError } from '@/lib/api'

/** Is this failure final, or is it worth letting the user try again? */
export function isTerminalInviteError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false // network blip → not terminal
  // 400 dead/rejected token, 403 wrong account, 404 unknown, 409 real workspace.
  // A 402 (no seat) can be resolved by the owner upgrading, so the invite is still
  // live and the attempt is worth keeping. 401/429/5xx are transient by definition.
  return [400, 403, 404, 409].includes(err.status)
}

/** The i18n key describing why an invite call failed. Never a raw server string. */
export function inviteErrorKey(err: unknown): string {
  if (!(err instanceof ApiError)) return 'employer:invite.errors.generic'

  switch (err.status) {
    case 402: // NO_SEAT_AVAILABLE — the plan shrank, or it was full to begin with.
      return 'employer:invite.errors.noSeat'
    case 403: // INVITE_EMAIL_MISMATCH on accept; NOT_OWNER on a roster mutation.
      return err.reason === 'NOT_OWNER'
        ? 'employer:invite.errors.notOwner'
        : 'employer:invite.errors.emailMismatch'
    case 409: // WORKSPACE_CONFLICT — they already run a real workspace of their own.
      return 'employer:invite.errors.workspaceConflict'
    case 404: // Unknown / spent / expired token, or a teammate who is already gone.
      return 'employer:invite.errors.invalid'
    case 400:
      // INVITE_INVALID = a dead token. INVITE_REJECTED = a real token this account
      // may not use (seeker email, self-invite, already a teammate). With no reason
      // (production) we must cover both without lying about either.
      if (err.reason === 'INVITE_INVALID') return 'employer:invite.errors.invalid'
      if (err.reason === 'INVITE_REJECTED') return 'employer:invite.errors.rejected'
      return 'employer:invite.errors.badRequest'
    case 429:
      return 'employer:invite.errors.rateLimited'
    default:
      return 'employer:invite.errors.generic'
  }
}
