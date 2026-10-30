import { safeInternalPath } from '@/lib/safeRedirect'
import { destinationAfterAuth } from '@/lib/routes'

/**
 * Where a visitor was heading when they chose to REGISTER instead of logging in.
 *
 * The case: a logged-out visitor opens a job, taps Apply, lands on /login with
 * `?returnUrl=/job-details/<id>`, and has no account. "Sign up" goes to the
 * 7-step /register flow — which never knew about `returnUrl`, so the person who
 * finished it landed on /home and the job they came for was gone.
 *
 * Kept in sessionStorage (this tab only, gone when it closes), the same place and
 * the same idea as `inviteToken.ts` for a team invite, so it survives the
 * full-page navigations between registration steps.
 *
 * ⚠️ Not a second redirect validator. Both ends go through `safeInternalPath`, and
 * the final destination goes through `destinationAfterAuth` — the one place that
 * already decides "is this a suitable place to land this person". Nothing here
 * accepts an external or protocol-relative target, and nothing here widens what
 * `destinationAfterAuth` allows.
 */

const KEY = 'prosiddhi.pendingReturn'

/** Long enough to finish registration (OTP, email check), short enough that an
 *  abandoned attempt does not send someone to an old job next time they sign up. */
const MAX_AGE_MS = 30 * 60 * 1000

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStore(): Store | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Remember `returnUrl` for after registration. Anything that is not a safe same-site
 * path is dropped. A missing or rejected value CLEARS what was stored, so a stale target
 * is never left behind. Whether the path suits a new seeker (an employer area would not)
 * is decided once, on the way out, by `destinationAfterAuth`.
 */
export function rememberPendingReturn(returnUrl: unknown, store: Store | null = defaultStore()): void {
  if (!store) return
  try {
    const path = safeInternalPath(returnUrl)
    if (!path) {
      store.removeItem(KEY)
      return
    }
    store.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    // Storage blocked (private mode): the visitor simply lands on the home page.
  }
}

/** The stored path if it is still fresh and safe, or null. Always clears the entry. */
export function takePendingReturn(store: Store | null = defaultStore(), now: number = Date.now()): string | null {
  if (!store) return null
  try {
    const raw = store.getItem(KEY)
    store.removeItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof saved.at !== 'number' || now - saved.at > MAX_AGE_MS || now < saved.at) return null
    // Validated again on the way out: what is in storage is never trusted.
    return safeInternalPath(saved.path)
  } catch {
    return null
  }
}

export function clearPendingReturn(store: Store | null = defaultStore()): void {
  if (!store) return
  try {
    store.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Where a newly registered jobseeker goes: the remembered job, else the seeker home. */
export function destinationAfterSeekerRegistration(
  store: Store | null = defaultStore(),
  now: number = Date.now()
): string {
  return destinationAfterAuth('JOB_SEEKER', takePendingReturn(store, now))
}
