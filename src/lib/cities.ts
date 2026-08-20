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

/** A city we offer: its centre, and how far out "in this city" reaches. */
export interface City extends Coords {
  radius: number
}

/**
 * The ten cities, alphabetical — a stable, predictable dropdown order.
 *
 * ⚠️ **`radius` is not decoration.** The backend's `maxDistance` defaults to
 * **5 km** and is capped at 100. Send a centroid without an explicit radius and
 * a seeker who picks Bengaluru sees only jobs within 5 km of the city centre,
 * in a city roughly 50 km across — which reads as "the filter is broken".
 *
 * Radii are the built-up spread, not the district boundary: Delhi carries NCR,
 * the four other big metros ~30 km, and the smaller cities 20–25 km.
 *
 * ⚠️ **A radius does two jobs.** It is the job feed's `maxDistance`, and it is
 * also the threshold at which a typed city may overwrite a stored coordinate
 * (`app/profile/page.tsx`). They fail in opposite directions: too small on the
 * feed shows too few jobs, which a user sees and retries; too small on the
 * overwrite guard silently replaces someone's precise GPS fix with a centroid.
 * Tune one for the feed and you have retuned the other.
 */
export const CITY_COORDS: Record<string, City> = {
  ahmedabad: { lat: 23.0225, lon: 72.5714, radius: 20 },
  bangalore: { lat: 12.9716, lon: 77.5946, radius: 30 },
  chennai: { lat: 13.0827, lon: 80.2707, radius: 30 },
  delhi: { lat: 28.6139, lon: 77.209, radius: 50 },
  hyderabad: { lat: 17.385, lon: 78.4867, radius: 30 },
  jaipur: { lat: 26.9124, lon: 75.7873, radius: 20 },
  kolkata: { lat: 22.5726, lon: 88.3639, radius: 25 },
  mumbai: { lat: 19.076, lon: 72.8777, radius: 30 },
  pune: { lat: 18.5204, lon: 73.8567, radius: 25 },
  surat: { lat: 21.1702, lon: 72.8311, radius: 20 },
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
  // NOT a bare 'ncr'. NCR is a ~55 km REGION, not a city: it reaches Meerut and
  // Rohtak, so mapping it to Connaught Place would put a seeker 60 km from the
  // point we claim they are at. Satellite cities are listed individually below
  // because each really does sit inside Delhi's 50 km radius.
  ['gurgaon', 'delhi'],
  ['gurugram', 'delhi'],
  ['noida', 'delhi'],
  ['bombay', 'mumbai'],
  ['navi mumbai', 'mumbai'],
  ['thane', 'mumbai'],
  ['poona', 'pune'],
  ['madras', 'chennai'],
  ['calcutta', 'kolkata'],
  ['amdavad', 'ahmedabad'],
  ['secunderabad', 'hyderabad'],
])

/**
 * Every English spelling we accept → its city key: the keys themselves plus the
 * variants above. Built once, so matching is one O(1) lookup instead of a
 * re-normalise plus a linear scan of CITY_KEYS per candidate.
 *
 * A Map for the same reason as everything else in this file — see toCityKey.
 */
const CITY_NAMES = new Map<string, string>(CITY_ALIASES)
for (const key of CITY_KEYS) CITY_NAMES.set(key, key)

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
 * §3 describes. Ten cities is still far too short a list to be someone's only
 * option — a person in Nagpur or Patna must be able to say where they are, and
 * gets no coordinate rather than a wrong one.
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
): City | undefined {
  if (!value) return undefined
  // People write "Bengaluru, Karnataka", "Whitefield Bangalore", "Mumbai / Thane"
  // — with punctuation and without. Splitting on commas alone missed every
  // comma-less form, which is most of them. So: split into words, and test each
  // word plus each adjacent PAIR, pairs first so "New Delhi" never resolves as
  // bare "Delhi".
  //
  // Scanned RIGHT TO LEFT, because an Indian address ends with its city:
  // "Whitefield, Bangalore", "Delhi Gate, Ahmedabad". Left to right, that
  // second one resolves to Delhi — 900 km wrong — and a wrong centroid is not
  // a harmless miss: it sits far enough from a stored GPS fix to read as a
  // move, and the next save overwrites the seeker's real coordinate with it.
  const words = normalizeCity(value).split(/[\s,/]+/).filter(Boolean)
  // The labels of the ONE locale that is loaded — a Kannada seeker is shown
  // "ಬೆಂಗಳೂರು" on the job feed, so that is what they will type here.
  const labels = translate
    ? new Map(CITY_KEYS.map((key) => [normalizeCity(translate(key)), key]))
    : null

  const match = (name: string) => CITY_NAMES.get(name) ?? labels?.get(name)

  for (let i = words.length - 1; i >= 0; i--) {
    // The PAIR ending at i before the single word at i, so "New Delhi" and
    // "Navi Mumbai" are never read as bare "Delhi" or "Mumbai".
    const key = (i > 0 && match(`${words[i - 1]} ${words[i]}`)) || match(words[i])
    if (key) return CITY_COORDS[key]
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
