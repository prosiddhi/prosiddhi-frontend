'use client'

// Shared loader for the 3-level taxonomy tree (GET /api/categories).
//
// Used by every taxonomy consumer (registration, JobForm, feed filter, profile
// edit). The tree is small, public, and cached 5 min on the BE — so we hold a
// single module-level copy and dedupe concurrent fetches, meaning N mounted
// TaxonomyPickers trigger at most ONE network request per session (until reload).

import { useCallback, useEffect, useState } from 'react'
import { taxonomyAPI, type TaxonomyCategory } from '@/lib/api'

let cache: TaxonomyCategory[] | null = null
let inflight: Promise<TaxonomyCategory[]> | null = null

// Fetch the tree, reusing the cached copy and any in-flight request. `force`
// bypasses the cache (used by reload) but still coalesces with an active fetch.
function fetchTree(force: boolean): Promise<TaxonomyCategory[]> {
  if (cache && !force) return Promise.resolve(cache)
  if (!inflight) {
    inflight = taxonomyAPI
      .getCategories()
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

/**
 * A category is worth offering only when a job can actually be tagged under it —
 * at least one sector holding at least one job title. One with no sectors, or
 * whose every sector is empty, is a dead end: its tile or filter row would look
 * identical to a live one while leading nowhere. Shared by the landing page's
 * category tiles and the Job Feed's department filter, so they cannot disagree.
 */
export function hasJobTitles(category: TaxonomyCategory): boolean {
  return category.sectors.some((sector) => sector.jobTitles.length > 0)
}

export interface UseCategoriesResult {
  categories: TaxonomyCategory[]
  loading: boolean
  error: boolean
  reload: () => void
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<TaxonomyCategory[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState(false)
  // Bumping this re-runs the effect with force=true (a manual retry).
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    const force = nonce > 0

    if (cache && !force) {
      setCategories(cache)
      setLoading(false)
      setError(false)
      return
    }

    setLoading(true)
    setError(false)
    fetchTree(force)
      .then((data) => {
        if (active) setCategories(data)
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

  return { categories, loading, error, reload }
}
