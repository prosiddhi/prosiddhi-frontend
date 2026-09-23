'use client'

// Loader for the sign-in-time server switches the portal needs before showing a
// phone-verification step (R1-BE-01, GET /auth/config). Public, no auth, and
// rarely changes — so, like useCategories, held as a single module-level cache
// shared by every mount within the session (register + login + Google-bind all
// read this within one visit, and should trigger at most one network request).

import { useEffect, useState } from 'react'
import { authAPI, type AuthConfig } from '@/lib/api'

let cache: AuthConfig | null = null
let inflight: Promise<AuthConfig> | null = null

function fetchConfig(): Promise<AuthConfig> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = authAPI
      .getConfig()
      .then((data) => {
        cache = data
        return data
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export interface UseAuthConfigResult {
  /**
   * Whether the phone-verification step should be shown. Defaults to false
   * while loading or if the fetch fails — NOT the backend code's own
   * hardcoded fallback (true). Release 1 production is documented to run
   * with REQUIRE_PHONE_VERIFICATION=false (docs/go-live-config.md), and this
   * whole ticket exists to stop showing a phone-code step that SMS delivery
   * cannot complete. A failed config request must not recreate that dead
   * end: defaulting to false means the worst case on a flaky fetch is
   * "skipped a step that's off anyway" today, not "asked for a code nobody
   * can supply." The backend stays authoritative regardless — when
   * verification really is required (the flag flips back on in January),
   * requireVerifiedPhone() still enforces it server-side, so a stale
   * client-side false here fails as a rejected submission, not a security
   * gap.
   */
  requirePhoneVerification: boolean
  loading: boolean
}

export function useAuthConfig(): UseAuthConfigResult {
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(
    cache?.requirePhoneVerification ?? false,
  )
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return // already resolved by an earlier mount this session
    let active = true
    fetchConfig()
      .then((data) => {
        if (active) setRequirePhoneVerification(data.requirePhoneVerification)
      })
      .catch(() => {
        // Stay on the safe default (false) — see the field's own doc comment.
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { requirePhoneVerification, loading }
}
