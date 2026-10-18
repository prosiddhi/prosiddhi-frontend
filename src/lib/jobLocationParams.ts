/**
 * The job-search location filter: which URL parameters carry it, and which
 * `GET /api/jobs` parameters it becomes.
 *
 * Three screens share it — the public landing page (`/employee`), the seeker Home
 * and the Job Feed — and the first two hand their choice to the third through the
 * URL. One module means they cannot read or write it differently.
 *
 * URL:  `?stateCode=28`                  everything in that state
 *       `?stateCode=28&cityId=<uuid>`    one city
 *
 * `stateCode` stays in the URL even for a city, because the city list gives only
 * `{ id, name }`. Without the state the picker could not show which city was
 * chosen, or fetch the list that contains it.
 *
 * API:  a city sends `cityId` only; a bare state sends `stateCode` only. Never a
 * latitude, longitude or maxDistance — the BE matches the job's cities by id.
 *
 * Old `?city=<key>` links (pune, delhi, …) are NOT read. There is no reliable key
 * → city id mapping: ids are generated per database, and the names are not
 * unique ("Delhi" is four municipal corporations, "Bengaluru" five). Mapping them
 * would mean guessing a city, so they fall through to an unfiltered feed.
 */

import type { JobFeedFilters } from '@/lib/api'

export interface JobLocation {
  /** LGD state code, or null for "anywhere". */
  stateCode: number | null
  /** A city id from GET /locations/cities. Only ever set together with `stateCode`. */
  cityId: string | null
}

const NO_LOCATION: JobLocation = { stateCode: null, cityId: null }

// Same shapes the BE validator accepts (stateCodeSchema: 1–3 digits; cityIdSchema: uuid).
const STATE_CODE = /^\d{1,3}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The location a URL asks for, or NO_LOCATION when it is missing or malformed.
 *
 * Only the SHAPE is checked here. Whether the state and city actually exist is
 * judged by the Job Feed against the backend's own lists (`stateCheck` /
 * `cityCheck` in job-feed/page.tsx) — this module has no list and must not grow
 * a second copy of one.
 *
 * A `cityId` that is present but wrong, or that has no `stateCode`, drops the whole
 * location instead of widening it to the state: someone who asked for one city must
 * not be shown a different place's jobs.
 */
export function parseJobLocation(params: Pick<URLSearchParams, 'get'>): JobLocation {
  const state = params.get('stateCode')
  if (!state || !STATE_CODE.test(state)) return NO_LOCATION
  const city = params.get('cityId')
  if (city === null) return { stateCode: Number(state), cityId: null }
  return UUID.test(city) ? { stateCode: Number(state), cityId: city } : NO_LOCATION
}

/** The Job Feed URL for a keyword and a location — the hand-off from Home and the landing page. */
export function jobFeedHref(search: string, location: JobLocation): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (location.stateCode !== null) {
    params.set('stateCode', String(location.stateCode))
    if (location.cityId) params.set('cityId', location.cityId)
  }
  const qs = params.toString()
  return qs ? `/job-feed?${qs}` : '/job-feed'
}

/** The `GET /api/jobs` parameters for a location: `cityId` wins, as it does on the BE. */
export function jobLocationFilters(location: JobLocation): Pick<JobFeedFilters, 'cityId' | 'stateCode'> {
  if (location.cityId) return { cityId: location.cityId }
  if (location.stateCode !== null) return { stateCode: location.stateCode }
  return {}
}
