'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/api'
import { SEEKER_HOME_ROUTE } from '@/lib/routes'

type RequiredRole = 'seeker' | 'employer'

/** Home route for a given backend role. */
function homeForRole(role: UserRole | undefined): string {
  if (role === 'JOB_SEEKER') return SEEKER_HOME_ROUTE
  // EMPLOYER_INDIVIDUAL | EMPLOYER_BUSINESS
  return '/employer'
}

/** Does the backend role satisfy the route's required role? */
function roleMatches(role: UserRole | undefined, required: RequiredRole): boolean {
  if (required === 'seeker') return role === 'JOB_SEEKER'
  return role === 'EMPLOYER_INDIVIDUAL' || role === 'EMPLOYER_BUSINESS'
}

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: RequiredRole
}

/**
 * Gate for authenticated pages.
 *
 * - While the session is hydrating (`isLoading`) → render a light loading state
 *   (avoids redirecting before storage is read, which would flash /login on a
 *   hard refresh of a logged-in user).
 * - Not authenticated → redirect to /login.
 * - Authenticated but wrong role for this route → redirect to that user's home.
 *
 * A 401 from any API call is handled globally by AuthContext (auth:unauthorized
 * event) → logout + /login, so this component only guards the initial render.
 */
export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, isLoggingOut } = useAuth()

  const wrongRole =
    isAuthenticated &&
    !!requiredRole &&
    !roleMatches(user?.role, requiredRole)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      if (isLoggingOut()) {
        // A session that was live somewhere in this tab just ended (explicit
        // logout, or a 401). `AuthContext.logout()`/its `auth:unauthorized`
        // handler already push to /login themselves. That push is async, so a
        // still-mounted protected page can re-render with `isAuthenticated:
        // false` before the URL has actually changed — building a returnUrl
        // here would read the OUTGOING user's path off `window.location` and
        // race the owning redirect, occasionally winning and sending the NEXT
        // person who logs in on this browser to the previous user's last page
        // instead of their own dashboard. Redirect to plain /login (matching
        // where the owning redirect is already headed) rather than nothing, so
        // this still recovers if that push is ever lost.
        router.replace('/login')
        return
      }
      // Remember where they were going. A shared job link used to bounce a
      // logged-out user to /login and then dump them on the role home, silently
      // losing the job they clicked — the single most likely way someone arrives
      // at this product. `returnUrl` lets /login put them back.
      //
      // This is same-origin by construction (it's built from the current
      // location's own path), so there is nothing to sanitise here — /login is the
      // trust boundary that validates `returnUrl` before ever navigating to it (it
      // resolves against origin and rejects anything off-origin).
      const returnUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : ''
      router.replace(
        returnUrl && returnUrl !== '/'
          ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
          : '/login'
      )
      return
    }
    if (wrongRole) {
      router.replace(homeForRole(user?.role))
    }
  }, [isLoading, isAuthenticated, wrongRole, user?.role, router, isLoggingOut])

  if (isLoading || !isAuthenticated || wrongRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-50"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  return <>{children}</>
}
