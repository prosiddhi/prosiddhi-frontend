/**
 * The cities the location filter offers, and their centroids.
 *
 * The backend has **no city-name filter** on `GET /api/jobs` — it filters
 * geographically, on `latitude` + `longitude` + `maxDistance`. So a city choice
 * is translated into a centroid and a radius here, client-side, with no BE
 * change required.
 *
 * This lives in one place because two screens offer the same dropdown — the
 * seeker landing page and the job feed — and the landing page hands its choice
 * to the feed through the URL. If the two lists drifted, a city could be
 * offered on one screen and silently ignored on the other.
 *
 * Labels are NOT here: they are translated, under `seeker:jobFeed.city.<key>`,
 * so all ten languages render the city name in their own script.
 */

export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  bangalore: { lat: 12.9716, lon: 77.5946 },
  delhi: { lat: 28.6139, lon: 77.209 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
}

/** Stable display order for the dropdown. */
export const CITY_KEYS = Object.keys(CITY_COORDS)

/**
 * Narrow an untrusted string (a URL parameter, typically) to a known city key.
 *
 * Returns `''` for anything unrecognised rather than throwing, so a hand-edited
 * or stale `?city=` shows the unfiltered feed instead of erroring — and can
 * never be used to inject an arbitrary value into a request.
 */
export function toCityKey(value: string | null | undefined): string {
  if (!value) return ''
  const key = value.trim().toLowerCase()
  return key in CITY_COORDS ? key : ''
}
