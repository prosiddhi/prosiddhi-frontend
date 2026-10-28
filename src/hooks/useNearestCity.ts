'use client'

// "Use my current location" → nearest city. The lookup half of that feature: the
// button (UseMyLocation) hands over a browser point, this asks the BE which city it
// is in. Shared by the seeker profile and seeker registration so the two cannot drift.
//
// The point is only used to find the city. Callers keep the CITY, never the
// coordinate: sent with a `cityId` the BE would overwrite it anyway.

import { useCallback, useEffect, useRef, useState } from 'react'
import { locationAPI } from '@/lib/api'
import type { Coords } from '@/lib/cities'
import { track } from '@/lib/analytics'
import type { TFunction } from 'i18next'
import { cityDisplayName, toSelectedCity, type SelectedCity } from '@/components/location/StateCitySelect'

/** What the last lookup came to. `none` = the BE answered but names no city; `failed` = it did not answer. */
export type NearestCityOutcome =
  | { status: 'found'; city: SelectedCity }
  | { status: 'none' }
  | { status: 'failed' }

/**
 * The line to show under the picker for a lookup's outcome, or null before one. `foundKey`
 * is the host's own wording for a found city (it takes `{{city}}`): the profile says "Save
 * to keep it", registration has nothing to save.
 */
export function nearestCityNote(
  outcome: NearestCityOutcome | null,
  t: TFunction,
  foundKey: string
): { ok: boolean; text: string } | null {
  if (!outcome) return null
  if (outcome.status === 'found') return { ok: true, text: t(foundKey, { city: cityDisplayName(outcome.city) }) }
  return {
    ok: false,
    text: t(outcome.status === 'none' ? 'profile:seeker.locationNoCity' : 'profile:seeker.locationLookupFailed'),
  }
}

export interface UseNearestCityResult {
  /**
   * Ask for the city at this point. Starting one ends any lookup still running. Ignored
   * unless `begin` was called since the last `cancel`: the browser takes a while to
   * answer, and a pick made by hand in the meantime must win over its late answer.
   */
  locate: (coords: Coords, accuracy?: number) => Promise<void>
  /**
   * The button was pressed: a browser answer is now expected and may be acted on. Wire it
   * to UseMyLocation's `onRequest`.
   */
  begin: () => void
  /**
   * End the lookup in flight, and any answer still expected from the browser, and forget
   * the outcome. Call it whenever the host changes the city or state by hand: a late
   * answer must never overwrite a newer choice. Stable between renders, so it is safe in
   * a memoised picker's `onChange`.
   */
  cancel: () => void
  locating: boolean
  /** The last lookup's outcome; null before the first one, and after `cancel`. */
  outcome: NearestCityOutcome | null
}

/**
 * `onFound` runs only for a lookup that was not cancelled or superseded. It may change
 * between renders; the latest one is used.
 */
export function useNearestCity(onFound: (city: SelectedCity) => void): UseNearestCityResult {
  const [locating, setLocating] = useState(false)
  const [outcome, setOutcome] = useState<NearestCityOutcome | null>(null)
  const inflight = useRef<AbortController | null>(null)
  const onFoundRef = useRef(onFound)
  useEffect(() => {
    onFoundRef.current = onFound
  })

  // True from the button press until the browser's answer is used or cancelled.
  const expecting = useRef(false)

  const begin = useCallback(() => {
    expecting.current = true
  }, [])

  const cancel = useCallback(() => {
    expecting.current = false
    inflight.current?.abort()
    setLocating(false)
    setOutcome(null)
  }, [])

  // The page going away ends the lookup too.
  useEffect(
    () => () => {
      expecting.current = false
      inflight.current?.abort()
    },
    []
  )

  const locate = useCallback(async ({ lat, lon }: Coords, accuracy?: number) => {
    if (!expecting.current) return
    expecting.current = false
    inflight.current?.abort()
    const controller = new AbortController()
    inflight.current = controller
    setLocating(true)
    setOutcome(null)
    try {
      // `accuracy` lets the BE refuse a reading too coarse to name a city (worse than 2 km).
      const { city } = await locationAPI.getNearestCity({ lat, lng: lon, accuracy }, { signal: controller.signal })
      if (controller.signal.aborted) return
      track('use_my_location', { result: city ? 'ok' : 'no_city' })
      if (city) {
        const picked = toSelectedCity(city)
        onFoundRef.current(picked)
        setOutcome({ status: 'found', city: picked })
      } else {
        setOutcome({ status: 'none' })
      }
    } catch {
      // An abort rejects too; it is not a failure anyone should be told about.
      if (controller.signal.aborted) return
      setOutcome({ status: 'failed' })
    } finally {
      if (!controller.signal.aborted) setLocating(false)
    }
  }, [])

  return { locate, begin, cancel, locating, outcome }
}
