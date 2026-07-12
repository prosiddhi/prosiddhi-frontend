'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthUser,
} from '@/lib/api'

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
  logout: () => void
}

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

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
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

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  // React to 401s surfaced by the API client.
  useEffect(() => {
    const onUnauthorized = () => {
      // Storage was already cleared by lib/api.ts; sync state + redirect.
      setToken(null)
      setUser(null)
      router.push('/login')
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
