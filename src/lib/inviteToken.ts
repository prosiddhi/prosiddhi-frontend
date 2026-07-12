// Carrying a team-invite token through auth.
//
// The invite link is clicked ONCE (MONETIZATION §6.3). An invitee with no account
// lands on /invite/<token>, is sent through sign-in or registration, and must come
// back to that same invite and have it accepted automatically — without the owner
// having to relay the link a second time.
//
// Two mechanisms carry it, and neither one can be turned into an open redirect:
//
//   1. /login already honours a `returnUrl`, validated against our own origin. We
//      hand it the path we build ourselves from the template below.
//   2. Registration is a multi-step wizard whose state is in-memory, so a query
//      param would not survive it. We stash the raw TOKEN — never a URL — in
//      sessionStorage and rebuild the path from the same template on the way back.
//      Storing a token rather than a destination is the point: the redirect target
//      is a compile-time constant with one interpolated, format-validated slot, so
//      a poisoned stash cannot send anyone off-origin. The worst a tampered value
//      can do is fail validation and be ignored.
//
// sessionStorage, not localStorage: the token dies with the tab, and it is cleared
// the moment it is used or the invite resolves.

const PENDING_INVITE_KEY = 'pending_invite_token'

/**
 * The BE mints 32 random bytes, base64url-encoded (43 chars), and its validator
 * accepts /^[A-Za-z0-9_-]{20,128}$/. We hold to the same shape: anything else is
 * not a token we produced, so we refuse to route on it.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/

export function isValidInviteToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}

/** The canonical, same-origin path for an invite. The ONLY way we build one. */
export function invitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`
}

/** Remember the invite across a trip through sign-in or registration. */
export function stashInviteToken(token: string): void {
  if (typeof window === 'undefined' || !isValidInviteToken(token)) return
  try {
    window.sessionStorage.setItem(PENDING_INVITE_KEY, token)
  } catch {
    // Private mode / storage disabled. The /login returnUrl still carries the
    // invite for the sign-in path; only the registration path loses it, and the
    // invitee can re-open the original link.
  }
}

/** The stashed token, or null. Never returns a value we would not have written. */
export function readInviteToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = window.sessionStorage.getItem(PENDING_INVITE_KEY)
    return isValidInviteToken(token) ? token : null
  } catch {
    return null
  }
}

export function clearInviteToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // Nothing to do — a stale entry is inert: it is only ever used to rebuild
    // /invite/<token>, and a spent token just renders the "already used" state.
  }
}
