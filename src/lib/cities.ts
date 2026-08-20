/**
 * The cities we offer, their centroids — and the rule for which coordinate a
 * save is allowed to write (`coordsToWrite`).
 *
 * That second job arrived with TD-03: the seeker profile and the employer job
 * form need the identical precedence rule, and a rule living in one of the two
 * pages is a rule the other page copies and then quietly diverges from.
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
 *
 * ⚠️ **This module must stay free of i18n and of React.**
 * `scripts/backfill/job-coordinates.mjs` imports it directly under `tsx`, so a
 * data backfill matches city text by exactly the same rules the app does —
 * duplicating those rules is how a backfill writes coordinates the app would
 * never have chosen, and the first draft of that script did precisely that. The
 * display-side counterpart, `localizeLocation`, lives in `lib/jobFormat.ts` with
 * the other formatters that read the shared i18next instance.
 */

/** A point on the map. Lives here, with the coordinates, not in a UI component. */
export interface Coords {
  lat: number
  lon: number
}

/** A city we offer: its centre, and how far out "in this city" reaches. */
export interface City extends Coords {
  /**
   * How far the city spreads, in km.
   *
   * ⚠️ **This is geography, not anybody's preference.** In particular it is NOT
   * an employer's hiring reach. The two are the same shape and a plausible
   * `radius: city.radius` on a job payload reads as obviously correct in review
   * — and would silently claim every Delhi job draws commuters from 50 km.
   * `PostJobData` deliberately has no radius field so that cannot be typed.
   */
  radius: number
}

/**
 * The i18n key for a city's label, in one place because four screens need it —
 * the job feed, the seeker landing page, the seeker profile and (TD-03) the
 * employer job form.
 *
 * The labels live under `seeker:` for historical reasons and the job form is an
 * employer screen, so this is the seam where that decision sits. Moving the
 * block to `common.json` (the default namespace) would let every caller say
 * `t('city.bangalore')` and reach nowhere — worth doing, but it edits 20 locale
 * files for no user-visible gain, so not during a defect pass.
 */
export const cityLabelKey = (key: string) => `seeker:jobFeed.city.${key}`


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
 * (`coordsToWrite`, below). They fail in opposite directions: too small on the
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
 * locale files (see cityKeyFromText), so this only needs the variants neither of
 * those covers.
 *
 * A Map, not an object literal, for the reason spelled out under toCityKey:
 * on a plain object `aliases['constructor']` returns a function, which is
 * truthy, so "constructor" would read as a known city.
 */
/**
 * Other ways of writing the SAME place. "Bengaluru" and "Bangalore" are one
 * city; so are Bombay and Mumbai, Madras and Chennai.
 *
 * Because these name the same place, they are safe to swap for the canonical
 * label when displaying, and safe to normalise to on save.
 */
const CITY_SPELLINGS = new Map<string, string>([
  ['bengaluru', 'bangalore'],
  ['banglore', 'bangalore'],
  ['new delhi', 'delhi'],
  ['delhi ncr', 'delhi'],
  ['bombay', 'mumbai'],
  ['poona', 'pune'],
  ['madras', 'chennai'],
  ['calcutta', 'kolkata'],
  ['amdavad', 'ahmedabad'],
])

/**
 * DIFFERENT towns that sit inside a listed city's radius, near enough that its
 * centroid is a reasonable coordinate for them.
 *
 * Kept apart from the spellings above because they must never be used for
 * display or normalisation: Noida is not Delhi, and printing "Delhi" on a job in
 * Noida renames the place rather than translating it. A coordinate can be
 * approximate; a name cannot.
 *
 * NOT a bare 'ncr'. NCR is a ~55 km REGION reaching Meerut and Rohtak, so
 * mapping it to Connaught Place would put someone 60 km from the point we claim.
 */
const CITY_NEARBY = new Map<string, string>([
  ['gurgaon', 'delhi'],
  ['gurugram', 'delhi'],
  ['noida', 'delhi'],
  ['navi mumbai', 'mumbai'],
  ['thane', 'mumbai'],
  ['secunderabad', 'hyderabad'],
])

/**
 * Every English spelling we accept → its city key: the keys themselves plus the
 * variants above. Built once, so matching is one O(1) lookup instead of a
 * re-normalise plus a linear scan of CITY_KEYS per candidate.
 *
 * A Map for the same reason as everything else in this file — see toCityKey.
 */
const CITY_NAMES = new Map<string, string>([...CITY_SPELLINGS, ...CITY_NEARBY])
for (const key of CITY_KEYS) CITY_NAMES.set(key, key)

/**
 * Names that mean the SAME place — keys plus spelling variants, no satellites.
 * This is the set that may be swapped for a label or normalised to on save.
 */
const CITY_SAME_PLACE = new Map<string, string>(CITY_SPELLINGS)
for (const key of CITY_KEYS) CITY_SAME_PLACE.set(key, key)

/**
 * The city key for text that names a city AND NOTHING ELSE — or `''`.
 *
 * Whole-string, and satellites excluded, so this answers "is this string just a
 * name for one of our cities?" It is what display and save-normalisation use:
 * "Whitefield, Bangalore" must keep its area name, and a job in Noida must keep
 * saying Noida.
 *
 * Contrast `cityKeyFromText`, which scans inside the string and accepts
 * satellites, because there the answer wanted is a coordinate.
 */
export function wholeCityKey(
  value: string | null | undefined,
  translate?: (key: string) => string
): string {
  if (!value) return ''
  const name = normalizeCity(value)
  const key = CITY_SAME_PLACE.get(name)
  if (key) return key
  if (!translate) return ''
  // Written in the reader's own script — "ಬೆಂಗಳೂರು" is as much a name for
  // Bangalore as "Bengaluru" is.
  for (const candidate of CITY_KEYS) {
    if (normalizeCity(translate(candidate)) === name) return candidate
  }
  return ''
}

/**
 * Which of our cities a coordinate sits in, or `''` if none of them.
 *
 * "Sits in" means inside that city's own radius. Used to tell "the text names a
 * DIFFERENT city from where this device is" apart from "this device is on the
 * outskirts of the city the text names" — a warehouse at Devanahalli is 35 km
 * from the Bangalore centroid, outside its 30 km radius, but it is emphatically
 * not another city, and a precise fix there must not be thrown away.
 */
export function cityContaining(point: Coords): string {
  for (const key of CITY_KEYS) {
    const city = CITY_COORDS[key]
    if (distanceKm(point, city) <= city.radius) return key
  }
  return ''
}

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
 * The city key for a TYPED location, or `''` when it names no city we know.
 *
 * This is the coarse tier of TD-02. It costs no permission prompt and no
 * geocoding service, and it is the path that carries the many seekers who will
 * refuse the browser's location request. It is also what
 * `scripts/backfill/job-coordinates.mjs` calls, so an existing job and a newly
 * posted one can never be placed by different rules.
 *
 * The profile takes free text rather than the dropdown that docs/location-plan.md
 * §3 describes. Ten cities is still far too short a list to be someone's only
 * option — a person in Nagpur or Patna must be able to say where they are, and
 * gets no coordinate rather than a wrong one.
 *
 * `translate` should resolve a city key to its label in the language the seeker
 * is actually using — pass `(key) => t(cityLabelKey(key))`. Without it this
 * matches English spellings only, and a Kannada seeker who types "ಬೆಂಗಳೂರು" —
 * exactly what the job feed just showed them — gets no centroid and an empty
 * Near By. That is 8 of our 10 languages. The backfill omits it on purpose:
 * stored legacy text is Latin, and a script should not guess at a language.
 *
 * Returns `''` rather than guessing. A wrong coordinate is worse than none: it
 * would show a Nagpur worker jobs in Pune and call them nearby.
 */
export function cityKeyFromText(
  value: string | null | undefined,
  translate?: (key: string) => string
): string {
  if (!value) return ''
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
    if (key) return key
  }
  return ''
}

/**
 * The same match, as a centroid. One matcher, two return shapes — so the
 * backfill script and the forms can never disagree about where a job is.
 */
function cityCoordsFromText(
  value: string | null | undefined,
  translate?: (key: string) => string
): City | undefined {
  const key = cityKeyFromText(value, translate)
  return key ? CITY_COORDS[key] : undefined
}

/**
 * The coordinate a save should write, or undefined when we know nothing useful.
 *
 * The two-tier rule from docs/location-plan.md §3, in one place because the
 * seeker profile and the employer job form both need it and must not drift.
 *
 * **Precision ranking:** a fix taken just now beats a coordinate already stored,
 * which beats a city centroid. A centroid may only REPLACE a stored coordinate
 * when the person has plainly moved — judged by distance against the typed
 * city's own radius, never by comparing the location text. See `distanceKm`.
 *
 * **One exception, and it is the whole reason this is not a two-line function:**
 * typed words beat a fix when they name a different city from the one the device
 * is in. A fix says where somebody is standing; the text says where they mean.
 * For a seeker those are usually the same place. For an employer they often are
 * not — a recruiter posts a Bangalore job from a desk in Pune.
 *
 * Returning undefined means **send nothing** — not "send null". The backend
 * fields are `.optional()`, not `.nullable()`, so an explicit null is a 400 and
 * a stored coordinate cannot be cleared through them at all. That is the only
 * reason this returns `| undefined` rather than `| null`.
 *
 * **A named argument object, not positional.** `gpsFix` and `saved` are the same
 * type; transposed, this silently returns the stored coordinate whenever one
 * exists, throwing away a fresh fix and letting a centroid win. That is the
 * exact bug TD-02 was written to kill, it compiles clean, and no smoke test
 * catches it unless the tester presses the location button on a profile that
 * already has coordinates.
 */
export function coordsToWrite({
  gpsFix,
  saved,
  text,
  textIsNewer,
  translate,
}: {
  /** A precise fix taken during THIS edit, not yet saved. */
  gpsFix?: Coords | null
  /** What the server already holds, if anything. */
  saved?: Coords | null
  /** The free-text location, as typed. */
  text?: string | null
  /**
   * Did the person edit the text AFTER taking the fix?
   *
   * This is what makes "which do we believe" answerable: the last thing they
   * did. Without it the rule has to guess, and it guessed wrong in one
   * direction or the other for every caller — a seeker who moved to Pune and
   * tapped the button had their fresh fix thrown away because the box still
   * said "Bangalore", while being told "Location captured".
   */
  textIsNewer?: boolean
  /**
   * Resolves a city key to its label in the CURRENT language —
   * `(key) => t(cityLabelKey(key))`.
   *
   * **Required, deliberately.** As an optional parameter a caller could simply
   * forget it, compile clean, and silently lose the centroid for anyone who
   * typed their city in their own script — 8 of our 10 languages, and no test
   * would catch it.
   */
  translate: (key: string) => string
}): Coords | undefined {
  const typedKey = cityKeyFromText(text, translate)
  const city = typedKey ? CITY_COORDS[typedKey] : undefined
  if (gpsFix) {
    // The last deliberate action wins. Typed words override a fix only when they
    // came AFTER it and name a city the device is demonstrably NOT in:
    //
    //   tap, then type an area name  → fix wins (no city named, nothing to argue)
    //   tap, then type another city  → text wins (a recruiter in Pune posting a
    //                                  Bangalore job)
    //   type a city, then tap        → fix wins (a seeker who moved and is
    //                                  telling us where they are now)
    //
    // "Demonstrably not in" is `cityContaining`, NOT raw distance. A warehouse at
    // Devanahalli is 35 km from the Bangalore centroid — past its 30 km radius —
    // so a distance test threw away a precise fix and replaced it with the city
    // centre the moment the employer typed "Bangalore". It is not another city;
    // it is the edge of that one. Only a fix sitting inside a DIFFERENT listed
    // city loses to the text.
    const fixKey = cityContaining(gpsFix)
    if (!city || !textIsNewer || !fixKey || fixKey === typedKey) return gpsFix
    return { lat: city.lat, lon: city.lon }
  }
  if (!city) return undefined
  // Still inside the city we already have a coordinate for: that coordinate is
  // at least as good as the centroid, so leave it alone.
  if (saved && distanceKm(saved, city) <= city.radius) return undefined
  // A FRESH object, never the CITY_COORDS entry itself. That entry is a `City`
  // and carries `radius` at runtime however this is typed, so a caller spreading
  // `...fix` into a job payload would ship the very field TD-03 removed from
  // PostJobData — and the backend would store it. It would also hand out a
  // mutable reference to module state.
  return { lat: city.lat, lon: city.lon }
}

/**
 * Great-circle distance in km — the same Haversine the backend filters with.
 *
 * Used to tell "the seeker moved city" from "the seeker typed their city in for
 * the first time". Comparing the location TEXT cannot do that: it is often
 * blank, or an area name, or written in another script.
 */
function distanceKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
