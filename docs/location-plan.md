# Location: how it works, why it returns nothing, and what to build

**Written 2026-08-20**, from reading the backend source rather than the API doc.
Covers TD-02 · TD-03 · TD-04 · TD-05 · TD-06 and DEF-035, which are one piece
of work, not six.

**Decided:** a fixed, short city list (~10), per Nazir 2026-08-20.

---

## ⚡ PROGRESS — updated 2026-08-20

| | Status |
|---|---|
| **TD-02** seeker coordinates | ✅ **done** — `aa1abb3` |
| **TD-06** ten cities, per-city radius | ✅ **done** — `f7e631e` `d42204d` |
| **TD-03** job coordinates | 🔵 **next — nothing is user-visible until this lands** |
| **TD-05** re-check the score | 🔴 Asrar, after TD-03 |
| **TD-04 / TD-38** mobile | 🔴 open — mobile has **no geolocation package at all** |

### Five things we learned by building it — read before TD-03

1. **TD-02 alone changes nothing a user can see, and neither does TD-06.**
   `getNearbyForSeeker` drops every job with a null coordinate, and no job has
   one. Verified by putting a seeker on top of the only three jobs that do:
   3 returned at 0 km. The machinery works; it is starved of job coordinates.

2. **The 20-point location score needs BOTH coordinates**
   (`job.service.ts:1314-1319`). The claim that TD-02 "revives 20 dead points"
   was half right — it is TD-03 that switches them on.

3. **`Job.radius` is written and never read.** `getNearbyForSeeker` filters on
   the *seeker's* radius. So TD-03 should **send nothing** for it rather than
   guess — and must NOT pass `City.radius`, which measures the city's extent,
   not the employer's hiring reach. There is a warning on the field in
   `api.ts`.

4. **A city's radius does two jobs** — the feed's `maxDistance`, and the
   threshold at which a typed city may overwrite a stored coordinate. They fail
   in opposite directions. Tuning one retunes the other.

5. **Match city text RIGHT TO LEFT.** Indian addresses end with the city, so
   "Delhi Gate, Ahmedabad" scanned left-to-right resolves 900 km wrong — and a
   wrong centroid reads as a *move*, so the next save overwrites a real
   coordinate. Also match the **translated** labels: a Kannada seeker types
   "ಬೆಂಗಳೂರು", which is what the job feed just showed them.

### For TD-03, do this first

**MOVE** the coordinate-precedence rule out of `app/profile/page.tsx` into
`@/lib/cities` as TD-03's **first commit**, before touching `JobForm.tsx`.
`distanceKm` is already exported there for that single caller and its docstring
already describes the rule, so moving it is lateral, not a new layer. A
"do not copy this" comment is a sign on the thing most likely to be copied.

Also: the city labels live under `seeker:jobFeed.city.*` and the job form is an
**employer** screen.

⚠️ *Correction, 2026-08-20:* an earlier draft of this line cited
`app/employee/page.tsx` as precedent for reaching across roles. **It is not** —
"employee" there means job seeker, so that is a seeker screen reading a seeker
namespace. The real precedent is [`lib/jobFormat.ts`](../src/lib/jobFormat.ts),
which does `i18n.t('seeker:jobCard.perMonth')` and **is already imported and
rendered by `JobForm`** — so the employer job form displays seeker-namespace
strings today.

The key now lives in one place, `cityLabelKey` in `@/lib/cities`, used by all
four screens. **Do not duplicate 100 translated strings into `employer.json`.**
The clean end state is moving the ten-key `jobFeed.city` block into
`common.json` (the default namespace), so every caller says `t('city.bangalore')`
and nothing reaches anywhere — a *move*, so `verify-locales` parity stays clean.
It edits 20 locale files for no user-visible gain, so: after the go-live freeze.

### The job form stays FREE TEXT — not a dropdown

Decided at the TD-03 review, and the asymmetry runs opposite to the intuition
that "a job's city is a business fact":

- A seeker outside the ten cities loses Near By. **An employer outside the ten
  could not post the job at all.** That is "we do not serve Nagpur employers" —
  Shaik's call, not an implementation detail.
- A `<select>` on one form and free text on the other reinstates exactly the
  divergence `coordsToWrite` was extracted to prevent.

**Ship:** keep the text input, add a `<datalist>` of the ten translated labels
for canonical spellings, add `<UseMyLocation>` beneath it, and call
`coordsToWrite` in `handleSubmit`. `<datalist>` → `<select>` is one edit if the
product later restricts it. Note the `location.trim().length >= 3` guard in
`JobForm` stays meaningful with a datalist and would be dead with a select.

⚠️ **`JobForm` keeps every field in one `FormState` object and clones it on each
keystroke.** Its memo must depend on `f.location`, **never** on `f` — depending
on `f` turns the memo into a no-op that rebuilds the ten translated labels on
every keystroke in every field.

---

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

**✅ SETTLED 2026-08-20 by Nazir — the ten, shipped in `f7e631e`:**
Ahmedabad 20 · Bangalore 30 · Chennai 30 · Delhi 50 · Hyderabad 30 ·
Jaipur 20 · Kolkata 25 · Mumbai 30 · Pune 25 · Surat 20 *(km)*.

Alphabetical, because that is the dropdown order. Every radius is on the wire
and checked by `scripts/smoke/smoke-td06.js`.

---

## 5. The trap — ✅ handled 2026-08-20

**`maxDistance` defaults to 5 km.** Pick "Bengaluru", get the centroid, and
without an explicit radius you see only jobs within 5 km of the city centre —
in a city roughly 50 km across.

Fixed in `f7e631e`: the job feed sends `coords.radius`, and `smoke-td06.js`
reads every city's radius off the outgoing request rather than the screen,
because a missing radius is invisible until you look at the wire.

Two places the same trap was still live and are now closed:

- `getNearbyJobs` in `api.ts` defaulted to **5 km**, disagreeing with both the
  city filter on the same screen and the backend service default. It was never
  reached before TD-02 because the call short-circuited on `noLocation`. Now 50.
- The Near By tab keeps a flat 50 **deliberately** — it is keyed to the seeker's
  own coordinate, not a dropdown choice, so there is no city radius to read.

---

## 6. One honest limitation

If every Bengaluru job sits on the same centroid, distance *within* a city is
meaningless — every job is 0 km from every other. Cross-city filtering works
fine; genuine "2 km away" does not arrive until employers supply precise
coordinates.

**So the order matters:** seeker coordinates first (TD-02) — that alone
revives Near By and the recommendation score — then employer precision
(TD-03), then re-check the weights (TD-05).
