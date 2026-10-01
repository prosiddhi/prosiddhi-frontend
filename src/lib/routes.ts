import type { UserRole } from '@/lib/api'
import { safeInternalPath } from '@/lib/safeRedirect'

/**
 * Where a logged-in seeker lives. One constant so "which route is seeker
 * home" is a fact, not a convention six call sites have to agree on by hand
 * — ProtectedRoute's post-auth redirect, /login's post-login redirect, the
 * invite flow's "you're already signed in" link, /register/success's landing
 * push, and EmployeeHeader's logo + Home nav link all point here.
 */
export const SEEKER_HOME_ROUTE = '/home'

/**
 * The forced "set a new password" screen. An account whose password was reset
 * by an admin (`user.mustChangePassword`) can use nothing else until it changes
 * it — AuthProvider is the only thing that sends someone here.
 */
export const CHANGE_PASSWORD_ROUTE = '/change-password'

/** Not a place to send someone who has just signed in. `/` is the landing page. */
const AUTH_SCREENS = new Set(['/', '/login', CHANGE_PASSWORD_ROUTE])

/** Home route for a backend role: seeker → /home, either employer type → /employer. */
export function homeRouteForRole(role: UserRole | undefined): string {
  return role === 'JOB_SEEKER' ? SEEKER_HOME_ROUTE : '/employer'
}

// Employer-only areas. A seeker who lands on a /employer/* returnUrl would just be
// bounced by ProtectedRoute, so send them home instead of through a dead redirect.
//
// /invite/<token> is the exception: it is a PUBLIC page that both roles may land on,
// and it renders its own "you're signed in as the wrong kind of account" guidance.
// Excluding it here would silently swallow a team invite — the invitee signs in and
// gets dumped on the dashboard with no idea the invite existed.
function returnUrlSuitsRole(returnUrl: string, role: UserRole | undefined): boolean {
  if (returnUrl.startsWith('/invite/')) return true
  const isEmployerArea = returnUrl.startsWith('/employer')
  const isEmployer = role !== 'JOB_SEEKER'
  return isEmployerArea === isEmployer
}

/**
 * Where to land once a person is signed in and free to use the app — after login,
 * and after the forced password change.
 *
 * `returnUrl` is attacker-supplied (it arrives in a link), so it is normalised by
 * `safeInternalPath`, which is the single arbiter of "is this target ours?" — see
 * that module for why an origin check alone is NOT enough (an origin-passing URL can
 * still yield a protocol-relative PATHNAME like `//evil.com`, which the router then
 * hard-navigates cross-origin).
 *
 * It must also match the role, or we would send them somewhere ProtectedRoute
 * immediately bounces them out of. The auth screens are never a valid destination:
 * landing back on /login or /change-password after signing in would only bounce.
 */
export function destinationAfterAuth(role: UserRole | undefined, returnUrl: string | null): string {
  const path = safeInternalPath(returnUrl)
  if (!path || AUTH_SCREENS.has(path.split(/[?#]/)[0]) || !returnUrlSuitsRole(path, role)) {
    return homeRouteForRole(role)
  }
  return path
}
