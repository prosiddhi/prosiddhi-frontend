'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthUser,
} from '@/lib/api'
import { safeInternalPath } from '@/lib/safeRedirect'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  /**
   * Merge fresh fields into the stored session user. Used after a profile save
   * so the name/photo in the global header updates immediately instead of
   * staying stale until the next login.
   */
  updateUser: (patch: Partial<AuthUser>) => void
  /**
   * Clear the session and navigate away. Defaults to /login.
   *
   * `redirectTo` must be an INTERNAL path (a single leading slash). It is used by
   * the invite landing page to send someone who is signed in as the wrong account
   * back to /login and then straight back to the invite they were holding.
   */
  logout: (redirectTo?: string) => void
  /**
   * True while a logout- or 401-driven redirect to /login is in flight.
   *
   * `logout()` and the `auth:unauthorized` handler both clear the session and
   * `router.push` away, but that push is async — a page still mounted at that
   * instant (whatever the outgoing user was looking at) re-renders with
   * `isAuthenticated: false` before the URL has actually changed. `ProtectedRoute`
   * reads this to tell "the session that was live on me just ended" (its own
   * redirect must not fire — AuthContext already owns one) apart from "I mounted
   * on a URL nobody was ever signed in on" (its own redirect to /login should
   * still happen). See ProtectedRoute.tsx.
   *
   * A plain function reading a ref, not a boolean field: it must reflect the
   * flag's value at the instant each caller's effect actually runs, not the
   * value captured when this context object was built.
   */
  isLoggingOut: () => boolean
}

// `safeInternalPath` is the single arbiter of whether a redirect target is ours, so
// logout() cannot become an open redirect even if a caller later forwards a
// user-supplied value into it. Its `typeof` guard doubles as protection against the
// bare `onClick={logout}` foot-gun — React would otherwise hand the click's
// MouseEvent straight to router.push() as the destination.

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * AuthProvider — single source of truth for the session.
 *
 * - Persists `{ token, user }` to localStorage (`auth_token` / `auth_user`).
 * - Hydrates from storage on mount (window-guarded) so a refresh keeps the
 *   session.
 * - Subscribes to the `auth:unauthorized` window event dispatched by
 *   `lib/api.ts` on a 401 → logs out + redirects to /login. This keeps the API
 *   client framework-free (no router import in lib/api.ts).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Hydrate from storage once on mount.
  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY)
      const storedUser = window.localStorage.getItem(AUTH_USER_KEY)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as AuthUser)
      }
    } catch {
      // Corrupt storage — clear it and start fresh.
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.localStorage.removeItem(AUTH_USER_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set synchronously (not state) at the top of logout()/onUnauthorized, before
  // either clears the session — so it is already true for any component whose
  // effect happens to run before the router.push they trigger has taken effect.
  // Cleared once the transition it announces has been observed (see the identity
  // effect below) so a later, genuinely-cold unauthenticated visit is unaffected.
  const isLoggingOutRef = useRef(false)
  const isLoggingOut = useCallback(() => isLoggingOutRef.current, [])

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    isLoggingOutRef.current = false
    window.localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    // The route-cache purge is NOT done here — see the effect below.
  }, [])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      try {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next))
      } catch {
        // Storage full / unavailable — state still holds the update for this session.
      }
      return next
    })
  }, [])

  const logout = useCallback(
    (redirectTo?: string) => {
      isLoggingOutRef.current = true
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.localStorage.removeItem(AUTH_USER_KEY)
      setToken(null)
      setUser(null)
      router.push(safeInternalPath(redirectTo) ?? '/login')
      // No router.refresh() here — setUser(null) changes the identity, and the
      // identity effect purges the cache for every transition including this
      // one. Refreshing here too just costs a second RSC round-trip per logout.
    },
    [router]
  )

  /**
   * Purge the App Router client cache whenever the signed-in identity changes
   * (DEF-025 — "after logging in as a different user, the previous user's page
   * is shown").
   *
   * Next 14 caches the RSC payload of every route the browser has visited, and
   * `router.push()` does not invalidate it. So after signing out of one account
   * and into another in the same tab, navigating back to a route the PREVIOUS
   * user visited can serve their cached render. Storage and React state were
   * always cleared correctly; this cache is the one place a finished session
   * could still surface.
   *
   * Why an effect and not a line inside `login()`: a pending refresh is
   * **discarded** by a navigation dispatched in the same tick
   * (`action-queue.js` marks it `discarded` on ACTION_NAVIGATE), and every
   * caller of `login()` pushes immediately afterwards — so a refresh there is
   * silently thrown away. An effect runs after that handler completes, which
   * puts the refresh *after* the navigation, where it survives.
   *
   * It covers every transition — sign-in, sign-out and an expired token — so
   * those paths deliberately do NOT call refresh themselves.
   */
  const lastIdentityRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (isLoading) return
    const current = user?.id ?? null
    const previous = lastIdentityRef.current
    lastIdentityRef.current = current
    // `undefined` means this is the first settle after hydration — the cache
    // belongs to this same session, so there is nothing to purge.
    if (previous === undefined || previous === current) return
    router.refresh()
    // The transition this render announces has now been observed — by every
    // consumer, since effects fire child-before-parent and ProtectedRoute sits
    // below this provider. Safe to clear so the NEXT unauthenticated visit (e.g.
    // a back-navigation into a stale protected tab, well after this logout) is
    // treated as genuinely cold again rather than still "mid-redirect".
    isLoggingOutRef.current = false
  }, [isLoading, user?.id, router])

  // React to 401s surfaced by the API client.
  useEffect(() => {
    const onUnauthorized = () => {
      isLoggingOutRef.current = true
      // Storage was already cleared by lib/api.ts; sync state + redirect.
      setToken(null)
      setUser(null)
      router.push('/login')
      // Cache purge is handled by the identity effect, same as logout().
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [router])

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    updateUser,
    logout,
    isLoggingOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
