'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/api'

type RequiredRole = 'seeker' | 'employer'

/** Home route for a given backend role. */
function homeForRole(role: UserRole | undefined): string {
  if (role === 'JOB_SEEKER') return '/job-feed'
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
  const { isAuthenticated, isLoading, user } = useAuth()

  const wrongRole =
    isAuthenticated &&
    !!requiredRole &&
    !roleMatches(user?.role, requiredRole)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
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
  }, [isLoading, isAuthenticated, wrongRole, user?.role, router])

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
