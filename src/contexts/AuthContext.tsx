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
import { usePathname, useRouter } from 'next/navigation'
import {
  AUTH_TOKEN_KEY,
  AUTH_TOKEN_REFRESHED_EVENT,
  AUTH_UNAUTHORIZED_EVENT,
  AUTH_USER_KEY,
  accountEndedReason,
  endServerSession,
  jobSeekerAPI,
  PROFILE_READ_TIMEOUT_MS,
  type AuthUser,
  type SeekerProfile,
} from '@/lib/api'
import {
  profileReadOutcome,
  profileSyncStatus,
  seekerSessionPatch,
  syncAfterLogin,
  type ProfileSync,
  type ProfileSyncRecord,
} from '@/lib/jobPreferences'
import { CHANGE_PASSWORD_ROUTE, shouldPushLogin } from '@/lib/routes'
import { safeInternalPath } from '@/lib/safeRedirect'
import { ConsentGate } from '@/components/legal/ConsentGate'
import { JobPreferencesGate } from '@/components/auth/JobPreferencesGate'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  /**
   * Merge fresh fields into the stored session user. Used after a profile save
   * so the name/photo in the global header updates immediately instead of
   * staying stale until the next login. A function receives the CURRENT user and
   * returns the patch, for a merge that must not be built from a stale render.
   */
  updateUser: (patch: Partial<AuthUser> | ((current: AuthUser) => Partial<AuthUser>)) => void
  /**
   * Whether the stored seeker's profile has been re-read from the server since this page
   * loaded, which is what makes `user.needsJobPreferences` trustworthy after a refresh.
   * - 'loading': a seeker whose flag has not been confirmed yet.
   * - 'ready': confirmed (by this load's login, or by GET /jobseekers/profile).
   * - 'failed': the request failed. The stored flag is UNCHANGED: it is not "no".
   * - 'idle': nothing to confirm (signed out, an employer, or a password change pending).
   */
  profileSync: ProfileSync
  /**
   * Try the profile read again after 'failed'. Only ever on the user's request: nothing calls
   * it on a timer. A no-op unless the current read is 'failed'.
   */
  retryProfileSync: () => void
  /**
   * Take a profile the caller has just read (after saving job preferences) as the answer:
   * merges it into the user and marks the read 'ready'. Returns false and changes NOTHING when
   * the reply does not carry `needsJobPreferences` as a boolean.
   */
  confirmSeekerProfile: (profile: SeekerProfile) => boolean
  /**
   * Clear the session and navigate away. Defaults to /login.
   *
   * `redirectTo` must be an INTERNAL path (a single leading slash). It is used by
   * the invite landing page to send someone who is signed in as the wrong account
   * back to /login and then straight back to the invite they were holding.
   */
  logout: (redirectTo?: string) => void
  /**
   * Where a logout- or 401-driven redirect is headed while it is in flight, or
   * null when none is.
   *
   * `logout()` and the `auth:unauthorized` handler both clear the session and
   * `router.push` away, but that push is async — a page still mounted at that
   * instant (whatever the outgoing user was looking at) re-renders with
   * `isAuthenticated: false` before the URL has actually changed. `ProtectedRoute`
   * reads this to tell "the session that was live on me just ended" (its own
   * redirect must not build a returnUrl — AuthContext already owns one) apart from
   * "I mounted on a URL nobody was ever signed in on" (its own redirect to /login
   * should still happen). It replaces to this same target, so it cannot overwrite
   * the `?reason=` of an ended account with a bare /login. (`logout()` always
   * reports the bare /login, whatever `redirectTo` it pushes.) See ProtectedRoute.tsx.
   *
   * A plain function reading a ref, not a field: it must reflect the value at the
   * instant each caller's effect actually runs, not the value captured when this
   * context object was built.
   */
  loggingOutTo: () => string | null
}

// Prefix of the login URL an ended (suspended / rejected) account is sent to.
const ACCOUNT_ENDED_LOGIN = '/login?reason='

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
 * - Owns the forced password change. While `user.mustChangePassword` is true
 *   PasswordChangeGate (below) is the ONLY thing that redirects to /change-password
 *   — /login, ProtectedRoute and the page itself defer to it, so two redirects
 *   never race.
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
  const loggingOutToRef = useRef<string | null>(null)
  const loggingOutTo = useCallback(() => loggingOutToRef.current, [])

  // Whose seeker profile has been settled this page load, and how. Set only when a request
  // settles (or a login brings a fresh flag), never to "loading": that is derived below.
  const [sync, setSync] = useState<ProfileSyncRecord>(null)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    loggingOutToRef.current = null
    window.localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    // A login reply carries the flag, so it is already as fresh as a profile read would be.
    // One without it (the register reply, an older BE) is confirmed by the read below.
    setSync(syncAfterLogin(newUser))
    // The route-cache purge is NOT done here — see the effect below.
  }, [])

  const updateUser = useCallback((patchOrFn: Partial<AuthUser> | ((current: AuthUser) => Partial<AuthUser>)) => {
    setUser((prev) => {
      if (!prev) return prev
      const patch = typeof patchOrFn === 'function' ? patchOrFn(prev) : patchOrFn
      // Nothing to change → keep the same object, so a burst of identical patches
      // (several in-flight calls all answering 403 PASSWORD_CHANGE_REQUIRED) is one
      // render, not one per call.
      if ((Object.keys(patch) as (keyof AuthUser)[]).every((k) => prev[k] === patch[k])) return prev
      const next = { ...prev, ...patch }
      try {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next))
      } catch {
        // Storage full / unavailable — state still holds the update for this session.
      }
      return next
    })
  }, [])

  const syncUserId = user?.id
  const retryProfileSync = useCallback(() => {
    setSync((prev) => (prev?.status === 'failed' ? null : prev))
  }, [])
  const confirmSeekerProfile = useCallback(
    (profile: SeekerProfile) => {
      if (syncUserId === undefined || profileReadOutcome(profile) !== 'ready') return false
      updateUser((current) => (current.id === syncUserId ? seekerSessionPatch(current, profile) : {}))
      setSync({ id: syncUserId, status: 'ready' })
      return true
    },
    [syncUserId, updateUser]
  )

  const logout = useCallback(
    (redirectTo?: string) => {
      // ProtectedRoute's fallback target (always the bare /login).
      loggingOutToRef.current = '/login'
      // End the server session (and its refresh cookie). Started first so the cookie
      // goes with it, but never awaited: the UI signs out at once, and the call is
      // best effort with its own timeout. Local state is cleared whatever it does.
      void endServerSession()
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
   * The App Router caches the RSC payload of routes the browser has visited (every
   * route in Next 14, where this was found), and
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
    loggingOutToRef.current = null
  }, [isLoading, user?.id, router])

  // React to 401s surfaced by the API client.
  //
  // `token` is a dependency so a suspended / rejected code is dropped once no
  // session is live: a late response must not leave a stale `?reason=` target in
  // the ref, nor push a bare /login over the banner's URL.
  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      // Several requests are usually in flight when an account is ended. The first
      // one owns the redirect; the rest must not send it somewhere else.
      if (loggingOutToRef.current?.startsWith(ACCOUNT_ENDED_LOGIN)) return
      const reason = accountEndedReason((e as CustomEvent<{ code?: string }>).detail?.code)
      if (reason && !token) return
      const to = reason ? `${ACCOUNT_ENDED_LOGIN}${reason}` : '/login'
      loggingOutToRef.current = to
      // Storage was already cleared by lib/api.ts; sync state + redirect.
      setToken(null)
      setUser(null)
      // Already on /login with no ended-account reason: the form is showing, and a bare
      // push would drop the page's `?returnUrl=`.
      if (shouldPushLogin(reason, window.location.pathname)) router.push(to)
      // Cache purge is handled by the identity effect, same as logout().
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [router, token])

  // A token refresh in THIS tab stored a new access token (lib/api.ts). The storage
  // event below never fires in the tab that made the write, so state is told here.
  useEffect(() => {
    const onTokenRefreshed = (e: Event) => {
      const next = (e as CustomEvent<{ token?: string }>).detail?.token
      if (next) setToken(next)
    }
    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, onTokenRefreshed)
    return () => window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, onTokenRefreshed)
  }, [])

  // Another tab changed the session in localStorage: a refresh, a sign-in as someone
  // else, or a sign-out. Storage is the source of truth, so follow it. Only ever
  // reads what the other tab wrote; this tab writes nothing here, so a stale tab
  // cannot overwrite a newer token.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return
      // `key === null` is localStorage.clear().
      if (e.key !== null && e.key !== AUTH_TOKEN_KEY && e.key !== AUTH_USER_KEY) return

      if (e.key === null || (e.key === AUTH_TOKEN_KEY && e.newValue === null)) {
        // Signed out elsewhere. No server call (the other tab made it) and nothing
        // to clear. Skip if this tab is already signed out.
        if (!token) return
        loggingOutToRef.current = '/login'
        setToken(null)
        setUser(null)
        router.push('/login')
        return
      }
      if (e.key === AUTH_TOKEN_KEY && e.newValue) {
        setToken(e.newValue)
        return
      }
      if (e.key === AUTH_USER_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue) as AuthUser)
        } catch {
          // Unreadable value from the other tab — keep the user we have.
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [router, token])

  // React to 403 PASSWORD_CHANGE_REQUIRED from the API client: the session is
  // fine, but an admin reset the password after we stored the user. Flag it and
  // let PasswordChangeGate do the redirect.
  useEffect(() => {
    const onPasswordChangeRequired = () => updateUser({ mustChangePassword: true })
    window.addEventListener('auth:password-change-required', onPasswordChangeRequired)
    return () => window.removeEventListener('auth:password-change-required', onPasswordChangeRequired)
  }, [updateUser])

  // A seeker's stored `needsJobPreferences` was written by an earlier visit and can be stale
  // (a Google sign-up, an admin-added account, a save made on another device), so re-read the
  // profile once per page load. Employers have no such flag; a forced password change comes
  // first (the BE would answer 403), and this runs again once it is done.
  //
  // Once per person, not per token: a silent token refresh must not fetch again. A failure is
  // remembered the same way and leaves the stored flag exactly as it was: it is never read as
  // "no", and it is not retried in a loop (a reload tries again). A 401 is the API client's
  // ordinary session-expired handling, not something this adds.
  const profileSync = profileSyncStatus({ isLoading, hasToken: !!token, user, sync })

  useEffect(() => {
    if (profileSync !== 'loading' || syncUserId === undefined) return
    let active = true
    jobSeekerAPI
      .getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })
      .then((profile) => {
        if (!active) return
        // A reply without the flag as a boolean confirmed nothing: 'failed', and the stored user
        // is left alone. Otherwise built from the user as it is NOW, and only for the person
        // the request was made for.
        const status = profileReadOutcome(profile)
        if (status === 'ready') {
          updateUser((current) => (current.id === syncUserId ? seekerSessionPatch(current, profile) : {}))
        }
        setSync({ id: syncUserId, status })
      })
      .catch(() => {
        if (active) setSync({ id: syncUserId, status: 'failed' })
      })
    return () => {
      active = false
    }
  }, [profileSync, syncUserId, updateUser])

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    updateUser,
    profileSync,
    retryProfileSync,
    confirmSeekerProfile,
    logout,
    loggingOutTo,
  }

  return (
    <AuthContext.Provider value={value}>
      <PasswordChangeGate />
      {children}
      {/* The consent dialog paints above this by z-index (z-[60] vs z-40), not by order. */}
      <JobPreferencesGate />
      {/* After the children so its overlay paints above every page. It waits for the
          password gate (mustChangePassword) before asking for anything. */}
      <ConsentGate />
    </AuthContext.Provider>
  )
}

/**
 * The forced-password-change gate. Covers every route — protected or public — and
 * every way in (login, a refresh of a stored session, the 403 event).
 *
 * Its own component, not an effect in AuthProvider: `usePathname()` re-renders
 * whoever calls it on every navigation, and in the provider that would re-render
 * every `useAuth()` consumer on every page change for everyone, to serve a state
 * almost nobody is ever in.
 */
function PasswordChangeGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const mustChangePassword = !!user?.mustChangePassword

  useEffect(() => {
    if (isLoading || !mustChangePassword || pathname === CHANGE_PASSWORD_ROUTE) return
    // Remember where they were going so the screen can send them back (it validates
    // the target before using it). /login carries its own `returnUrl`; anywhere else
    // the page itself is the target.
    const { search } = window.location
    const returnUrl = new URLSearchParams(search).get('returnUrl') ?? pathname + search
    router.replace(`${CHANGE_PASSWORD_ROUTE}?returnUrl=${encodeURIComponent(returnUrl)}`)
  }, [isLoading, mustChangePassword, pathname, router])

  return null
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
