'use client'

// Loader for the employer credit wallet (GET /api/employers/me/credits).
//
// Unlike useCategories (public, cacheable reference data), the wallet balance is
// user-specific and MUTABLE — a purchase or a job-post changes it — so this does
// NOT cache across mounts: every consumer fetches fresh, and `reload()` re-fetches
// after an action that spends/grants credits (checkout success, post-gate).
//
// Consumers: dashboard wallet card (PJP-178), post-gate pre-check (PJP-179),
// checkout success refresh (PJP-177).

import { useCallback, useEffect, useState } from 'react'
import { subscriptionAPI, type Wallet } from '@/lib/api'

export interface UseCreditsResult {
  wallet: Wallet | null
  loading: boolean
  error: boolean
  reload: () => void
}

export function useCredits(): UseCreditsResult {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    subscriptionAPI
      .getCredits()
      .then((w) => {
        if (active) setWallet(w)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { wallet, loading, error, reload }
}
