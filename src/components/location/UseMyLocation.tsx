'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, Loader2, AlertCircle } from 'lucide-react'
import type { Coords } from '@/lib/cities'
import { track } from '@/lib/analytics'

/**
 * "Use my current location" — the PRECISE tier of the two-tier location design
 * (docs/location-plan.md §3).
 *
 * It is deliberately never the only way to set a location. This audience often
 * refuses the browser permission prompt or does not understand it, so every
 * failure message here points at the same fallback: type your city. The coarse
 * tier (city text → centroid) is what actually carries most users.
 *
 * Shared rather than inlined because the post-a-job form (TD-03) and the
 * registration step need exactly this button next.
 */
export function UseMyLocation({
  onLocated,
  onRequest,
  disabled = false,
  className = '',
}: {
  /**
   * Called the moment the button is pressed, before the browser has answered. A host that
   * lets the user pick by hand while the browser is still thinking uses it to arm a lookup
   * that a later hand-made pick can cancel (see useNearestCity.begin).
   */
  onRequest?: () => void
  /** Locks the button from outside, e.g. while the host form is saving. */
  disabled?: boolean
  /** `accuracy` is the browser's `coords.accuracy` in metres, for callers that look up a city. */
  onLocated: (coords: Coords, accuracy?: number) => void
  className?: string
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ask = () => {
    setError('')
    onRequest?.()
    if (!navigator.geolocation) {
      setError(t('location.failed'))
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        // Rounded to 3 decimals — about 110 m. Job distance is measured in
        // kilometres against a radius of 5 to 50, so nothing here needs to know
        // which building a worker sleeps in.
        onLocated(
          {
            lat: Math.round(pos.coords.latitude * 1000) / 1000,
            lon: Math.round(pos.coords.longitude * 1000) / 1000,
          },
          pos.coords.accuracy
        )
      },
      (err) => {
        setBusy(false)
        if (err.code === err.PERMISSION_DENIED) track('use_my_location', { result: 'denied' })
        setError(err.code === err.PERMISSION_DENIED ? t('location.denied') : t('location.failed'))
      },
      // enableHighAccuracy deliberately OFF. It powers up the GPS radio, and
      // indoors — where someone actually fills in a profile — a GPS-only fix
      // often never arrives before the timeout, so the seeker waits ten seconds
      // to be told it failed. Wifi/cell positioning answers in well under a
      // second. We throw away everything below ~110 m anyway (see above), and
      // this feeds distance filtering at radii of 5 to 50 km.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 }
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={ask}
        disabled={busy || disabled}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        {busy ? t('location.locating') : t('location.useMyLocation')}
      </button>
      {error && (
        <p className="flex items-start gap-2 mt-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export default UseMyLocation
