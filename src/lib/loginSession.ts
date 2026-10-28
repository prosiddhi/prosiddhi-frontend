import { ApiError, type AuthUser } from '@/lib/api'
import type { ProfileSync } from '@/lib/jobPreferences'

/**
 * How long /login waits to learn whether a stored session is still good before it
 * gives up and shows the form. Past this the form stays for good (see settleOutcome).
 */
export const LOGIN_SESSION_CHECK_CAP_MS = 6_000

/** Where the employer's one GET /employers/profile check stands. */
export type EmployerProbe = 'pending' | 'ok' | 'invalid' | 'unknown'

export type LoginEntryDecision = 'wait' | 'show-form' | 'redirect'

/**
 * What a failed employer session check means.
 * - 401: the API client has already tried a refresh and the server refused it, so the
 *   session is over. ('invalid')
 * - 403 CONSENT_REQUIRED: the session is fine, ConsentGate asks for the terms. ('ok')
 * - anything else (offline, timeout, 5xx, an aborted request): nothing was learned,
 *   and the stored session is left alone. ('unknown')
 */
export function classifyEmployerProbeError(err: unknown): EmployerProbe {
  if (!(err instanceof ApiError)) return 'unknown'
  if (err.status === 401) return 'invalid'
  if (err.status === 403 && err.code === 'CONSENT_REQUIRED') return 'ok'
  return 'unknown'
}

/**
 * What /login does when someone arrives. Rules are checked top to bottom.
 *
 * A stored token proves nothing by itself (it may be expired or revoked), so a
 * session found on arrival is redirected away only once the server has confirmed it:
 * a seeker through AuthContext's profile read (`profileSync`), an employer through
 * the single check the page runs.
 *
 * `hadSessionOnEntry` is read once when storage is first read. A login or Google
 * sign-in done on this page is never "on entry", so this never competes with the
 * navigation those flows already do.
 */
export function loginEntryDecision(args: {
  isLoading: boolean
  /** null until storage has been read */
  hadSessionOnEntry: boolean | null
  /** the cap has passed: show the form and never redirect after it */
  gaveUp: boolean
  hasToken: boolean
  user: Pick<AuthUser, 'role' | 'mustChangePassword'> | null
  profileSync: ProfileSync
  /** shouldResumePhoneBind(): a seeker who must finish binding a phone */
  resumeBindUser: boolean
  employerProbe: EmployerProbe
}): LoginEntryDecision {
  const { isLoading, hadSessionOnEntry, gaveUp, hasToken, user, profileSync, resumeBindUser, employerProbe } = args
  if (isLoading || hadSessionOnEntry === null) return 'wait'
  if (!hadSessionOnEntry) return 'show-form'
  if (gaveUp) return 'show-form'
  if (!hasToken || !user) return 'show-form'
  // AuthProvider's PasswordChangeGate owns this redirect.
  if (user.mustChangePassword) return 'show-form'

  if (user.role === 'JOB_SEEKER') {
    // Before the bind check: a stored "pending" status can be stale until the read is done.
    if (profileSync === 'loading') return 'wait'
    if (profileSync !== 'ready') return 'show-form'
    return resumeBindUser ? 'show-form' : 'redirect'
  }

  if (employerProbe === 'pending') return 'wait'
  return employerProbe === 'ok' ? 'redirect' : 'show-form'
}

/** The first answer /login reaches; `null` while it is still waiting. */
export type LoginOutcome = Exclude<LoginEntryDecision, 'wait'> | null

/**
 * Keep the first answer. Once the form has been shown (including because the cap
 * passed), a late profile read or employer check must not turn it into a redirect.
 */
export function settleOutcome(current: LoginOutcome, live: LoginEntryDecision): LoginOutcome {
  return current ?? (live === 'wait' ? null : live)
}
