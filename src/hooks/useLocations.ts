'use client'

// Shared loaders for the state and city lists (GET /api/locations/states and
// /api/locations/cities?state=).
//
// Same approach as useCategories: one module-level copy, so every mounted
// StateCitySelect shares it and a state is fetched at most once per session, and
// concurrent requests for the same list are coalesced into one. The lists are
// public and the BE caches them for 5 minutes, so there is no expiry here.
//
// What is cached, and what is not:
//   - A failed request is never cached. `reload` (or the next mount) asks again.
//   - An EMPTY cities list is cached: it is a real answer (Lakshadweep has no
//     cities), and re-asking would only repeat it on every visit.
//   - An EMPTY states list is treated as a failure and not cached. The BE always
//     has 36, so [] means something is wrong, not "nothing to show".
//
// Every mounted hook is told when a list arrives, whichever instance asked for
// it (useSyncExternalStore over a version counter), so a picker that failed first
// recovers on its own once another picker has loaded the same list.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { locationAPI, type LocationCity, type LocationState } from '@/lib/api'

let statesCache: LocationState[] | null = null
let statesInflight: Promise<LocationState[]> | null = null
const citiesCache = new Map<number, LocationCity[]>()
const citiesInflight = new Map<number, Promise<LocationCity[]>>()

// Bumped whenever a cache fills. It is the only thing the hooks subscribe to.
let version = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getVersion = () => version
const filled = () => {
  version += 1
  listeners.forEach((listener) => listener())
}

// One shared empty list, so "nothing loaded" is referentially stable between renders.
const NONE: never[] = []

function fetchStates(): Promise<LocationState[]> {
  if (statesCache) return Promise.resolve(statesCache)
  statesInflight ??= locationAPI
    .getStates()
    .then((data) => {
      if (data.length === 0) throw new Error('The states list came back empty')
      statesCache = data
      filled()
      return data
    })
    .finally(() => {
      statesInflight = null
    })
  return statesInflight
}

function fetchCities(stateCode: number): Promise<LocationCity[]> {
  const cached = citiesCache.get(stateCode)
  if (cached) return Promise.resolve(cached)
  let inflight = citiesInflight.get(stateCode)
  if (!inflight) {
    inflight = locationAPI
      .getCities(stateCode)
      .then((data) => {
        citiesCache.set(stateCode, data)
        filled()
        return data
      })
      .finally(() => {
        citiesInflight.delete(stateCode)
      })
    citiesInflight.set(stateCode, inflight)
  }
  return inflight
}

export interface UseStatesResult {
  states: LocationState[]
  loading: boolean
  error: boolean
  reload: () => void
}

export function useStates(): UseStatesResult {
  // Re-render when any instance fills the cache; the cache itself is read below.
  useSyncExternalStore(subscribe, getVersion, getVersion)
  const [failed, setFailed] = useState(false)
  // Bumping this re-runs the effect: a manual retry after a failure.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (statesCache) return
    let active = true
    fetchStates().catch(() => {
      if (active) setFailed(true)
    })
    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])
  return {
    states: statesCache ?? NONE,
    loading: !statesCache && !failed,
    error: !statesCache && failed,
    reload,
  }
}

export interface UseCitiesResult {
  cities: LocationCity[]
  loading: boolean
  error: boolean
  reload: () => void
}

/**
 * The cities of one state. `null` means no state chosen yet: nothing is loaded.
 *
 * What is returned is always looked up for the CURRENT `stateCode`, so changing
 * state never shows the previous state's cities, not even for one render while
 * the new list loads.
 */
export function useCities(stateCode: number | null): UseCitiesResult {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  // The state whose request failed, if any. Cleared during render, not in an
  // effect, the moment `stateCode` changes: going back to a state that failed
  // earlier must not paint the old error for a frame before its retry starts.
  const [failedFor, setFailedFor] = useState<number | null>(null)
  const [seenCode, setSeenCode] = useState(stateCode)
  if (seenCode !== stateCode) {
    setSeenCode(stateCode)
    setFailedFor(null)
  }
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (stateCode === null || citiesCache.has(stateCode)) return
    let active = true
    fetchCities(stateCode).catch(() => {
      if (active) setFailedFor(stateCode)
    })
    return () => {
      active = false
    }
  }, [stateCode, attempt])

  const cities = stateCode === null ? undefined : citiesCache.get(stateCode)
  const error = stateCode !== null && !cities && failedFor === stateCode
  const loading = stateCode !== null && !cities && !error
  const reload = useCallback(() => {
    setFailedFor(null)
    setAttempt((n) => n + 1)
  }, [])
  return { cities: cities ?? NONE, loading, error, reload }
}
