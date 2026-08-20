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

/** A point on the map. Lives here, with the coordinates, not in a UI component. */
export interface Coords {
  lat: number
  lon: number
}

export const CITY_COORDS: Record<string, Coords> = {
  bangalore: { lat: 12.9716, lon: 77.5946 },
  delhi: { lat: 28.6139, lon: 77.209 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
}

/** Stable display order for the dropdown. */
export const CITY_KEYS = Object.keys(CITY_COORDS)

/** One spelling convention for every lookup in this file. */
const normalizeCity = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * English spellings people type that are NOT the city key itself. Every key is
 * matched by toCityKey already, and every TRANSLATED name is matched from the
 * locale files (see cityCoordsFromText), so this only needs the variants
 * neither of those covers.
 *
 * A Map, not an object literal, for the reason spelled out under toCityKey:
 * on a plain object `aliases['constructor']` returns a function, which is
 * truthy, so "constructor" would read as a known city.
 */
const CITY_ALIASES = new Map<string, string>([
  ['bengaluru', 'bangalore'],
  ['banglore', 'bangalore'],
  ['new delhi', 'delhi'],
  ['delhi ncr', 'delhi'],
  ['bombay', 'mumbai'],
  ['poona', 'pune'],
])

/**
 * Narrow an untrusted string (a URL parameter, typically) to a known city key.
 *
 * Returns `''` for anything unrecognised rather than throwing, so a hand-edited
 * or stale `?city=` shows the unfiltered feed instead of erroring — and can
 * never be used to inject an arbitrary value into a request.
 */
export function toCityKey(value: string | null | undefined): string {
  if (!value) return ''
  const key = normalizeCity(value)
  // CITY_KEYS.includes, NOT `key in CITY_COORDS`: `in` walks the prototype
  // chain, so `?city=constructor` (or `toString`, `__proto__`, …) would pass as
  // a "known city" and then index to undefined coordinates.
  return CITY_KEYS.includes(key) ? key : ''
}

/**
 * Centroid for a TYPED location, or undefined when it names no city we know.
 *
 * This is the coarse tier of TD-02. It costs no permission prompt and no
 * geocoding service, and it is the path that carries the many seekers who will
 * refuse the browser's location request.
 *
 * The profile takes free text rather than the dropdown that docs/location-plan.md
 * §3 describes, because four cities is far too short a list to be someone's only
 * option — a person in Nagpur must still be able to say where they are. Revisit
 * once TD-06 widens the list.
 *
 * `translate` should resolve a city key to its label in the language the seeker
 * is actually using — pass `(key) => t(`seeker:jobFeed.city.${key}`)`. Without
 * it this matches English spellings only, and a Kannada seeker who types
 * "ಬೆಂಗಳೂರು" — exactly what the job feed just showed them — gets no centroid and
 * an empty Near By. That is 8 of our 10 languages.
 *
 * Returns undefined rather than guessing. A wrong coordinate is worse than
 * none: it would show a Nagpur worker jobs in Pune and call them nearby.
 */
export function cityCoordsFromText(
  value: string | null | undefined,
  translate?: (key: string) => string
): Coords | undefined {
  if (!value) return undefined
  // People write "Bengaluru, Karnataka", "Whitefield Bangalore", "Mumbai / Thane"
  // — with punctuation and without. Splitting on commas alone missed every
  // comma-less form, which is most of them. So: split into words, and test each
  // word plus each adjacent PAIR, pairs first so "New Delhi" never resolves as
  // bare "Delhi".
  //
  // The cost of matching loosely is a false positive on a street name that
  // happens to carry a city word ("Delhi Road, Agra" → Delhi). We take that
  // trade: a missed city means an empty Near By for a real seeker, while the
  // street case is rare and self-correcting via the location button.
  const words = normalizeCity(value).split(/[\s,/]+/).filter(Boolean)
  // The labels of the ONE locale that is loaded — a Kannada seeker is shown
  // "ಬೆಂಗಳೂರು" on the job feed, so that is what they will type here.
  const labels = translate
    ? new Map(CITY_KEYS.map((key) => [normalizeCity(translate(key)), key]))
    : null

  for (let i = 0; i < words.length; i++) {
    for (const name of i + 1 < words.length ? [`${words[i]} ${words[i + 1]}`, words[i]] : [words[i]]) {
      const key = toCityKey(name) || CITY_ALIASES.get(name) || labels?.get(name)
      if (key) return CITY_COORDS[key]
    }
  }
  return undefined
}

/**
 * Great-circle distance in km — the same Haversine the backend filters with.
 *
 * Used to tell "the seeker moved city" from "the seeker typed their city in for
 * the first time". Comparing the location TEXT cannot do that: it is often
 * blank, or an area name, or written in another script.
 */
export function distanceKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
