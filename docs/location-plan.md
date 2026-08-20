# Location: how it works, why it returns nothing, and what to build

**Written 2026-08-20**, from reading the backend source rather than the API doc.
Covers TD-02 · TD-03 · TD-04 · TD-05 · TD-06 and DEF-035, which are one piece
of work, not six.

**Decided:** a fixed, short city list (~10), per Nazir 2026-08-20.
**Still open:** which cities. See §4.

---

## 1. There are three location mechanisms, all already built

Nothing in this section needs writing. It exists and works.

### a. The city filter on the job feed

`GET /api/jobs?latitude=&longitude=&maxDistance=`

The backend has **no city-name filter on this path at all**. The web turns a
city choice into a centroid via `CITY_COORDS` in
[src/lib/cities.ts](../src/lib/cities.ts), sends coordinates, and
`job.service.ts` loads matching jobs, drops any with null coordinates, computes
Haversine distance in Node and keeps `distance <= maxDistance`.

⚠️ **`maxDistance` defaults to 5 km** and is capped at 100
(`job.validator.ts`, "M4-AC4"). See §5 — this is the single easiest thing to
get wrong.

### b. The "Near By" feed

`GET /api/jobs/nearby?radius=` → `jobService.getNearbyForSeeker`

Reads the **seeker's saved** `latitude` / `longitude`. If either is null it
returns, verbatim:

```json
{ "jobs": [], "noLocation": true, "message": "Add your location to see nearby jobs." }
```

Otherwise: same Haversine, filter by radius, sort by distance ascending,
newest as tiebreak. Service default radius is 50 km.

### c. Recommendations

Two paths. The **cold-start** one (`getColdStartRecommendations`) does not use
coordinates at all — it filters on the seeker's `location` **text** field with
a case-insensitive `contains`. The **scored** path has a distance component
worth 20 points.

---

## 2. Why all three return nothing

**No coordinate is ever written.** Not by a seeker, not by an employer.

Every write endpoint already *accepts* them and has for months:

| Endpoint | Field |
|---|---|
| job create / update | `job.validator.ts` — `latitude`, `longitude`, `radius` (default 5) |
| seeker register | `auth.validator.ts` — `latitude`, `longitude` optional |
| seeker profile update | same; `SeekerProfileUpdate` in `src/lib/api.ts` already declares both |

The columns exist too, with an index: `JobSeeker.latitude/.longitude`,
`Job.latitude/.longitude/.radius`, `@@index([latitude, longitude])`.

**The frontend simply never sends them.** `src/app/profile/page.tsx` builds its
`updateProfile` payload without either field.

So:

- **Near By** → `noLocation: true` → 0 jobs, every time
- **City filter** → `.filter(job => job.latitude !== null)` discards *every*
  job **before** the distance maths runs → 0 jobs, however good the city choice
- **Recommendation location points** → always 0, for everyone, on every job

That last one is the sharp edge worth remembering: the city filter fails not
because the maths is wrong but because nothing survives the null check.

---

## 3. The plan: two tiers of precision

The core idea. **Do not make GPS the only path** — this audience will often
refuse or not understand the permission prompt.

| Tier | Source | Needs permission | Good for |
|---|---|---|---|
| **Coarse** | city centroid from the dropdown | no | "jobs in my city" |
| **Precise** | device GPS | yes | real distance, "2 km away" |

Store **both**: the canonical city name in `location`, plus `latitude` /
`longitude`. The backend already has all three fields, so **none of this needs
a backend change.**

### TD-02 — seeker coordinates · do this first

On the profile, and optionally as a registration step:

- a city dropdown (from the fixed list)
- a "Use my current location" button → `navigator.geolocation.getCurrentPosition`
  (works: we are on HTTPS)
- on denial or failure, fall back to the chosen city's centroid — **never a
  dead end**
- send `location`, `latitude`, `longitude` on the existing profile update

This alone switches Near By back on and revives the 20 recommendation points.
It is the highest-value single change in the whole workstream.

### TD-03 — job coordinates

Post-a-job gets the same city dropdown → centroid, plus an optional "use my
current location" for an employer posting from the workplace.

**The fixed city list removes the need for a geocoding service entirely.** No
Google Maps key, no bill, no rate limit — we already know each city's centroid.

### TD-04 — mobile

Same two tiers. Today mobile shows a struck-through pin and nothing else when
`noLocation` is true; it needs the same "Add your location" action the web has,
or the section should hide until a coordinate exists.

⚠️ **Unverified:** whether a geolocation plugin (`geolocator`) is already in
`pubspec.yaml`. Check before estimating. Android needs
`ACCESS_FINE_LOCATION`; iOS needs `NSLocationWhenInUseUsageDescription`. Both
need a plain-language reason string, translated.

### TD-05 — recheck the score

Only meaningful once coordinates flow. Do it last.

---

## 4. The city list (TD-06)

**Decided: about 10 cities, fixed.** Three reasons beyond the obvious saving:

1. **~100 translated labels instead of ~300.** Ten cities × ten locales.
2. **It fixes TD-34 at the source.** City text is currently a mess —
   `"bangalore"`, `"Mysore"`, `"Bengaluru, Karnataka"`. The cold-start
   recommendation does a **substring match on that text**, so the mess silently
   breaks it. A fixed list makes every string canonical.
3. **It removes the geocoder**, as above.

### ⚠️ Do NOT map one city per language

It is a tempting symmetry and it breaks on the people we are building for.

- **Language ≠ location.** A Bihari worker in Bengaluru speaks Hindi and needs
  Bengaluru jobs. Migrant workers are the whole point of the product.
- **English maps to no city.**
- **Hindi maps to ten** — Delhi, Lucknow, Patna, Jaipur, Kanpur, Bhopal…
- **Telugu spans two states** — Hyderabad and Visakhapatnam.

You would end up with one dead slot and one slot carrying a third of the
country. **Pick cities by where the jobs are; leave language independent.**
Someone must be able to choose Tamil *and* Bengaluru.

### Shape

`CITY_COORDS` should carry a **radius per city**, not just a centroid:

```ts
bengaluru: { lat: 12.9716, lon: 77.5946, radius: 30 },
```

Delhi NCR ~50, Mumbai and Bengaluru ~30, smaller cities ~20.

**Still to decide:** the six new names. Four exist already (Bangalore, Delhi,
Mumbai, Pune). Candidates, to be confirmed against where our employers
actually are: Hyderabad, Chennai, Kolkata, Ahmedabad, Surat, Jaipur.

---

## 5. The trap

**`maxDistance` defaults to 5 km.** Pick "Bengaluru", get the centroid, and
without an explicit radius you see only jobs within 5 km of the city centre —
in a city roughly 50 km across. The frontend **must** send the city's radius
explicitly. This is a one-line change and very easy to miss.

---

## 6. One honest limitation

If every Bengaluru job sits on the same centroid, distance *within* a city is
meaningless — every job is 0 km from every other. Cross-city filtering works
fine; genuine "2 km away" does not arrive until employers supply precise
coordinates.

**So the order matters:** seeker coordinates first (TD-02) — that alone
revives Near By and the recommendation score — then employer precision
(TD-03), then re-check the weights (TD-05).
