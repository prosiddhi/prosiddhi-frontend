# The one list — teardown findings + QA register, merged

**Created:** 2026-08-19 · **Supersedes** the first draft of this file and sits
alongside [competitor-teardown.md](competitor-teardown.md) (the analysis) and
[qa/defect-log.csv](qa/defect-log.csv) (the formal register).

Everything here was **seen in a real browser** — live production, a local
full-stack run, or the Flutter app compiled to web — on a 390×840 phone. Nothing
is theoretical. Where a claim comes from code, the file and line are named.

**Surfaces:** `WEB` `prosiddhi-frontend` · `MOB` `prosiddhi-mobile-app` ·
`BE` `prosiddhi-backend` (⚠️ coordinate with Asrar) · `DATA` · `OPS`
**Effort:** S under an hour · M half a day · L a day or more

---

## 📋 STATUS INDEX — every TD item, one glance

**Updated 2026-08-20.** Keep this current when you close something. Closures used
to be recorded only as prose inside three separate session sections, which meant
working out what was left required cross-referencing them by hand — and three
items (TD-09, TD-11, TD-24) sat looking open for a day when they were already
done.

**43 items: 17 done · 18 open · 4 WEB-done/MOBILE-pending · 3 superseded · 1 that
cannot be done from this machine (TD-32).**

⚠️ **A ✅ here meant "done on the web".** Checked 2026-08-20: TD-07, TD-08,
TD-10 and TD-12 are all marked `WEB` `MOB` and only ever shipped on the web.
The mobile halves were never started. Surface matters — read the badges.

*Counted from the table below, not by hand — the hand-written total was wrong
twice. To recount:*

```bash
grep -c '^| TD-.* ✅' docs/teardown-fix-list.md   # done
grep -c '^| TD-.* 🔴' docs/teardown-fix-list.md   # open
```

| # | Item | Status | Where |
|---|---|---|---|
| TD-00 | Deploy `main` to production | 🔴 **OPEN — blocks 19 retests** | Nayan / Asrar |
| TD-01 | Re-run the retest table | 🔴 open — after TD-00 | |
| TD-02 | Seeker coordinates | ✅ done | `aa1abb3` |
| TD-03 | **Job coordinates** | ✅ **done — DEF-035 closed end to end** | `6fd606c` `da49122` |
| TD-04 | Surface `noLocation` on mobile | 🔴 open — folded into TD-38 | |
| TD-05 | Re-check the 20-point score | 🔴 open — Asrar, needs TD-03 first | |
| TD-06 | Widen the city list to ten | ✅ done | `f7e631e` `d42204d` |
| TD-07 | Tell employers about the trial | 🟠 **WEB done, MOBILE not started** — 0 mentions of "trial" in app_en.arb | `e098ae9` `d1d6f38` |
| TD-08 | Wrong-role login error | 🟠 **WEB done, MOBILE not started** — no `ROLE_MISMATCH` handling in lib/ | `cf1927e` + BE `d3bda2b` |
| TD-09 | Paywall quotes ₹499 on ₹589 | ✅ done in code — ships with deploy | |
| TD-10 | Wallet speaks accounting | 🟠 **WEB done, MOBILE not started** — 33 "credit" strings still in app_en.arb | `eacd112` |
| TD-11 | Footer legal name | ✅ done in code — ships with deploy | |
| TD-12 | Trust signals | 🟠 **WEB done, MOBILE not started** | `7f8b2b4` |
| TD-13 | Copy / format inconsistencies | ✅ done | `4de0b23` |
| TD-14 | "App is on the way" footer | ✅ done | `4457fd1` |
| TD-15 | Job feed first screen | ✅ done | `f9b5f3b` |
| TD-16 | Rebuild the web login | ⛔ **SUPERSEDED by TD-37** | |
| TD-17 | Mirror login on mobile | ⛔ **SUPERSEDED by TD-37** | |
| TD-18 | Employer dashboard order | ✅ done | `de79a36` `f8caf5b` |
| TD-19 | One Apply button | ✅ done | `e67564a` |
| TD-20 | Tap targets under 44 px | ✅ done | `8630d7d` |
| TD-21 | Remove voice icons | ✅ done | `5755d6e` |
| TD-22 | Untangle the filter cascade | 🔴 open | |
| TD-23 | Show candidates before typing | 🔴 open | |
| TD-24 | Stale "Applied" badge | ✅ done in code — ships with deploy | |
| TD-25 | "Recommended" returns 1 in 10 | 🔴 open — partly TD-05 | |
| TD-26 | Mobile's two brand blues | ✅ done — ⚠️ visual check owed | `55dc23e` |
| TD-27 | Mobile welcome logo | ✅ done — ⚠️ visual check owed | `cd8ee11` |
| TD-28 | Employer vs seeker identity | 🔴 open | |
| TD-29 | Welcome screen onto the web | 🔴 open | |
| TD-30 | `NODE_ENV` danger flags | ✅ code done — env is deliberate, see §9 | BE `79ebc15` |
| TD-31 | CORS allowlist | ✅ done | BE `624fd30` |
| TD-32 | Run mobile on a real device | ⚠️ **cannot be done from this machine** | Sailaja |
| TD-33 | Mobile checkout | ⛔ **SUPERSEDED by TD-36** | |
| TD-34 | Untidy job data | 🔴 open — data, **now also a search fix** | |
| TD-35 | Ten jobs in production | 🔴 open — data | |
| TD-36 | Remove purchasing from mobile | 🔴 open — **unblocked, D2 resolved 2026-08-20** | |
| TD-37 | One login: phone + password + Google | 🔴 open — approach agreed 2026-08-20 | |
| TD-38 | Location on mobile | 🔴 open | |
| TD-39 | `aria-required` with no field name | 🔴 open | |
| TD-40 | Backfill coordinates on existing jobs | 🟡 **script written + tested** — needs running on prod | `scripts/backfill/` |
| TD-41 | Job form gives no location feedback | 🔴 open | |
| TD-42 | A coordinate cannot be cleared | 🔴 open — ⚠️ Asrar, BE schema | |

### The register — `docs/qa/defect-log.csv`, 35 rows

**11 resolved · 19 awaiting retest · 5 open** *(re-counted 2026-08-20, after TD-03 closed DEF-035)*.

The 19 cannot be judged until TD-00. The 5 genuinely open are DEF-006
(deferred), DEF-018 (Asrar), DEF-032 plus one more that is Shaik's call, and one
landing-page item. **DEF-035 closed 2026-08-20** — the first register row this
workstream closes outright.

---

## 🔴 SESSION STATE — 2026-08-20, end of the SECOND fix session

**Read this first.** The 2026-08-19 section below it is the first session; §0
onwards is the original plan.

### ⚠️ Do these two before anything else — the live API is misconfigured

**`NODE_ENV` is not `production` on `api.prosiddhi.com`.** Proven from outside,
without shell access: `utils/response.ts:84` serialises a raw `Error` into the
JSON body only when `NODE_ENV === 'development'` **exactly**, and a
bad-credentials POST to the live login returns
`{"success":false,"message":"Invalid credentials","error":{}}` — that `error`
key is the development-only branch, byte-identical to a local dev server.

Two live consequences:

1. **OTPs are returned in API response bodies.** Both OTP services gated on
   `NODE_ENV !== 'production'`. Anyone who can call a send-OTP endpoint for an
   address gets that account's OTP back over HTTP — account takeover with no
   inbox or handset. SMS not being live via DLT does not mitigate it; it is
   what makes it quiet.
2. **The Razorpay weak-webhook-secret boot guard never runs.** It fired only
   `if (NODE_ENV === 'production')`, so the one check between production and
   the placeholder committed in `.env.example` was disabled by the very
   misconfiguration it existed to catch.

**Owner: Nayan / Asrar.** Set `NODE_ENV=production`, and **rotate
`RAZORPAY_WEBHOOK_SECRET`** — treat it as exposed. `79ebc15` makes both
behaviours opt-in so a repeat misconfiguration is no longer silently fatal,
but it does not fix the deployed environment.

**TD-00 still stands too** — production has not been deployed, so the 19
"awaiting retest" register rows still cannot be judged.

### Shipped this session (14 commits, all gates green)

| Repo | Commits |
|---|---|
| `prosiddhi-backend` | `79ebc15` **TD-30 danger flags** · `d3bda2b` TD-08 `ROLE_MISMATCH` contract · `624fd30` **TD-31 CORS allowlist** |
| `prosiddhi-frontend` | `de79a36` TD-18 · `f8caf5b` TD-18 gate correction · `e67564a` TD-19 · `cf1927e` TD-08 · `4457fd1` TD-14 · `7f8b2b4` TD-12 · `67b0787` review fixes · `bf32f3d` dead buttons · `8630d7d` **TD-20 tap targets** |
| `prosiddhi-mobile-app` | `55dc23e` TD-26 one brand blue · `cd8ee11` TD-27 welcome logo |

⚠️ **Partly pushed — do not assume either way.** Checked against the remote
after a fetch on 2026-08-20: mobile is fully pushed, backend has only `624fd30`
local, frontend has 7 local. An earlier note here said all 14 were unpushed;
that was wrong. Re-check before deploying:

```bash
for r in prosiddhi-frontend prosiddhi-backend prosiddhi-mobile-app; do
  printf '%-24s ' "$r"; (cd "../$r" && git fetch -q origin && git status -sb | head -1)
done
```

**Push backend before frontend** — the portal's TD-08 fix reads the
`ROLE_MISMATCH` code the backend only started sending in `d3bda2b`.

⚠️ **`79ebc15` is already on `main` and will refuse to boot on a placeholder
Razorpay webhook secret.** See [deploy-checklist.md](deploy-checklist.md) §1
before any backend deploy.

### Closed: TD-08, TD-12, TD-14, TD-18, TD-19, TD-20, TD-26, TD-27, TD-30, TD-31

### Found while working — not in the original plan

- **Six dead buttons on the seeker landing** (fixed, `bf32f3d`) — Register,
  Login, Companies, View more categories, Sign up today and Contact us were
  all plain `<button>`s with no handler. `/employee` hand-rolls its own header
  instead of using `components/home/Header.tsx`; the original was moved to
  `<Link>` and this copy was not. **The duplication itself is still there and
  is why one copy rotted — worth its own ticket.**
- **Fake App Store / Google Play tiles** (fixed, part of TD-14) — plain divs,
  not links, for listings that do not exist.
- **The home header has no mobile treatment at all** (OPEN) — at 390px "Find
  Jobs" wraps to two lines, "Companies" runs off the right edge, and Register
  and Login are pushed out of view. Needs a mobile nav design, not a padding
  tweak. Related to DEF-006.
- **`app_icon.png` has no alpha channel** — `pubspec.yaml:79` sets
  `remove_alpha_ios: true`, so it is flattened onto opaque white. Nearly
  shipped as a white square on the mobile welcome screen. Use
  `watermark_logo.png` for in-app art.
- **`primaryDark` was dead in the mobile theme** — zero references; deleted.

### Two process traps that cost real time — avoid them next session

1. **Never run two `next dev` servers on this project at once.** They share
   `.next` and clobber each other's builds. A stale server on `:3000`
   silently rebuilt my bundle pointing at **production**, so a smoke run was
   testing prod while claiming to test local. Later the same collision
   corrupted the build into "missing required error components". One server,
   one port.
2. **`TaskStop` kills the npm wrapper, not the `tsx`/`node` child.** A backend
   process from a previous start kept holding `:5000` and answering with old
   code for several minutes. Kill by PID from `netstat`, with `//T`.

### The agreed order of work (Nazir, 2026-08-20)

**Location first → then the rest of the teardown → then every bug, one by one,
last.** The bug pass is deliberately last because 20 register rows cannot be
judged until the deploy lands.

### Still to do, in that order

1. **TD-02/03/04/05/06 — the location workstream.** ⭐ **Design is written up
   in [location-plan.md](location-plan.md)** — read that, not the backend.
   It records the three mechanisms, why all three return zero (nothing ever
   writes a coordinate, and the city filter discards every job on a null check
   before the distance maths runs), and the two-tier plan. **No backend change
   is needed for any of it.**
   ⚠️ Blocked on one input: **the six new city names.** ~10 cities is decided;
   which ten is not. Do NOT map one city per language — see §4 for why that
   breaks for migrant workers.
2. **TD-23** show candidates before the employer types · `WEB` `MOB` · M
3. **TD-22** the Category→Sector→Job title cascade · `WEB` · M
4. **TD-25** "Recommended" returns 1 job in 10 — partly TD-05 · M
5. **TD-28 / TD-29** employer vs seeker identity; mobile's welcome onto web · M
6. **TD-32** run mobile on a real device — **cannot be done from here**: this
   machine has no emulator, and the repo has only `android` and `ios`
   configured, so there is no web or desktop target to fall back on.
7. **DEF-018** duplicate GST at registration · needs BE verification
8. **TD-34 / TD-35** data, not code

### Closed after the list above was written

- **DEF-024** (`b46301a`) — the register said the job form had no
  required-field indicators. Half true: four labels had an asterisk **baked
  into the translated string** in all ten languages, Category had none at all,
  nothing explained what the asterisk meant, and no control carried
  `aria-required`. The asterisk now lives in the component, not the copy.
- **DEF-031** (`b8f9a1f`) — the work-experience step used
  `grid-cols-[434px_265px_265px_auto]`, fixed pixel columns needing ~1036px in
  a pane only 785px wide at 1440. "To Year" was **clipped, not scrollable**, so
  it could not be reached at all. It only ever fitted at 1920. Mobile was never
  affected.

### Verification scripts now live in the repo

[scripts/smoke/](../scripts/smoke/) — eight browser checks covering TD-08, 12,
14, 18, 19, 20 plus a dead-control scan. They were in a session temp directory
and would have been lost. `smoke-td20.js` is how anyone re-checks the 0/118 tap
targets. Read that folder's README before running two dev servers at once.

**Blocked, unchanged:** TD-16/17 on DLT, TD-33 on decision D2.

### Owed

- **Mobile has NOT been visually verified.** TD-26 and TD-27 are
  `flutter analyze` clean and reasoned from the code, but nothing rendered
  them. Sailaja should eyeball both.
- **Nine non-English strings for the admin-login message were written by me**,
  not by the i18n-translator agent (it died on an auth error). They use the
  "admin" / "admin console" loanword. Worth a native check, like the existing
  Tamil and Odia notes.
- **TD-26 left a design decision open:** mobile's action colour is now brand
  primary/80, not the sky primary/50 the website uses, because all 58 call
  sites are text or fills behind white text and sky is 2.0:1 on white.
  Making sky the mobile action colour needs a designer to reassign those call
  sites across the scale.

---

## SESSION STATE — 2026-08-19, end of the first fix session

Everything below §0 is the original plan; this section is what happened in the
first session.

### Shipped (14 commits, all gates green)

| Repo | Commits |
|---|---|
| `prosiddhi-backend` | `6a1f622` trial fields on the wallet · `a2f1bc1` one-pass refactor · `fa78c9e` **register issues the session** |
| `prosiddhi-frontend` | `e098ae9` + `d1d6f38` trial visibility · `5755d6e` voice icons removed · `91555d4` register redirect race · `bd32744` registration storage + double-submit · `4f360f7` gates + teardown docs · `049f77f` use the register session · `f9b5f3b` **job feed density** · `4de0b23` salary/seats/sign-up copy · `eacd112` **"credits" renamed everywhere** |
| `prosiddhi-mobile-app` | `7c3b303` sign in at registration · `6205e2d` **business document upload** · `8244eda` result-count plurals |

⚠️ **Unpushed at session end:** `prosiddhi-frontend` `4de0b23`, `eacd112` ·
`prosiddhi-mobile-app` `8244eda`. Backend is fully pushed. **Push backend before
frontend** whenever both are pending — the trial banners need the API fields.

### Five items needed NO work — production is just stale

Audited against the code before building anything. All ship with the deploy:
the footer legal name, the ₹499-without-GST paywall copy, the stale "Applied"
badge (DEF-028), the seeker profile's developer-speak, and DEF-021/022/023
(`HeaderActions` is imported by all 12 employer pages).

**Lesson for the next session: check the code before fixing anything on this
list.** Roughly a third of what looked broken on production was already fixed.

### Found while working — not in the original plan

- **Register redirect race** (fixed) — a successful employer registration was
  bounced backwards; on the corporate path it stranded a PENDING_DOCUMENTS
  employer with no route to approval.
- **`reset()` never cleared storage** (fixed) — the persist effect wrote the
  blank default straight back, so every registration left its key behind.
- **Double-submit on all three register pages** (fixed) — the button re-enabled
  during the async route transition.
- **Business employers could not finish on mobile** (fixed) — no document-upload
  screen existed at all, so no approval, and no trial (it is granted AT
  approval).
- **`legal.json` still says "credits"** (OPEN) — 11 strings across Terms and
  Privacy, all ten languages, including English. Contract text; needs a
  conscious call, see §9.
- **20 orphan locale strings** (OPEN, harmless) — `jobFeed.heroTitle` /
  `heroSubtitle` are dead in all ten files. `verify-locales` only checks parity,
  so no gate catches them.
- **Register session omits `phoneNumber`** (OPEN, harmless today) — the login
  response includes it. Only `userDisplay.ts` consumes it and never reaches that
  fallback.
- **Tamil and Odia wording need a native eye** — Tamil needed two different words
  to keep "jobs" and "Job Posts" distinct in one sentence; Odia `ପୋଷ୍ଟ` can read
  as "a position", so "3 Job Posts" may parse as "3 job openings".

### Still to do, in the order I would take them

1. **TD-18** employer dashboard order — hiring first, billing below (mobile
   already does this) · `WEB` · S
2. **TD-19** one Apply button on the job detail · `WEB` · S
3. **TD-26 + TD-27** mobile's two brand blues and the missing welcome logo ·
   `MOB` · S
4. **TD-08** the wrong-role login error · `BE` `WEB` `MOB` · S
5. **TD-12** trust signals on the front page · `WEB` `MOB` · S
6. **TD-14** decide on the "our app is on the way" footer · `WEB` · S
7. **TD-28 / TD-29** employer vs seeker identity; mobile's welcome screen onto
   the web · `WEB` · M
8. **TD-22** the Category→Sector→Job title cascade · `WEB` · M
9. **TD-23** show candidates before the employer types · `WEB` `MOB` · M
10. **TD-25** "Recommended" returns 1 job in 10 · M
11. **TD-20** tap targets under 44px · `WEB` · M
12. **The location workstream** — TD-02/03/04/05/06. The biggest piece, and the
    backend needs nothing: it already stores and accepts coordinates, nothing
    ever writes one.
13. **TD-30 / TD-31** verify `NODE_ENV=production`; review the wildcard CORS ·
    `OPS`
14. **TD-32** run mobile on a real device

**Blocked:** TD-16/17 (the login rebuild) until DLT clears — phone OTP does not
deliver in production today, so making it primary would lock everyone out.
TD-33 (mobile checkout) on decision D2.

### The QA register — where all 35 rows stand

`docs/qa/defect-log.csv`, re-counted 2026-08-19: **3 closed · 6 not-a-defect ·
19 awaiting retest · 7 genuinely open.**

**The 19 "awaiting retest" cannot be judged until the deploy lands.** I retested
13 of them against production and got 5 PASS, 3 FAIL and 2 inconclusive — but
the 3 failures (DEF-021 notifications, DEF-022 employer Messages, DEF-023
employer's own job) are **almost certainly deploy gaps, not regressions**:
`HeaderActions` is imported by all 12 employer pages in the code, and a local
build renders the mail and bell that production does not. **Re-run the whole
table after TD-00.**

The 7 genuinely open, and who owns each:

| Defect | Sev | Status now | Owned by |
|---|---|---|---|
| **DEF-017** wrong error on a role mismatch | S3 | **Live-verified 2026-08-19** — reproduced on web AND mobile, traced to the backend string (`employer.controller.ts:106`, `jobseeker.controller.ts:111`), which both clients print raw | **TD-08** — verification done, fix pending |
| **DEF-035** jobs not filtered by location | S2 | Root cause confirmed. ⚠️ **The behaviour has CHANGED since it was written** — the row says Near By "returns the same as All Jobs"; it now returns **0 results**. Backend needs nothing; nothing ever writes a coordinate | **The location workstream** (TD-02/03/04/05/06) |
| **DEF-006** seeker landing does not fit the window | S3 | Same disease as the job feed (fixed in `f9b5f3b`, 999px → 465px) but on `/employee`, which was not touched | **TD-15 follow-up** — apply the same treatment |
| **DEF-018** duplicate GST / registration number accepted | S2 | Needs BE verification. Untouched | Asrar |
| **DEF-024** no required-field markers on the job form | S3 | Needs live verification. Untouched | small `WEB` |
| **DEF-031** Work Experience step only partly visible | S3 | Needs live verification. Untouched | small `WEB` |
| **DEF-032** cannot edit email / phone / account type | S3 | Partly valid; product decision | Shaik |

**Nothing shipped today closes a register row outright.** Today's commits were
teardown items (TD-07/10/13/15/21) plus four defects found while working that
were never in the register at all — the register race, the storage bug, the
double-submit, and mobile's missing document upload. DEF-017's *verification* is
done; its fix is not.

---

## 0. Blocker — production is running a stale build

**Found 2026-08-19, confirmed by Nazir: `prosiddhi.com` has not been deployed.**

Proof: `HeaderActions` — the Mail link to `/messages` plus `NotificationBell` — is
imported by **all 12 employer pages** including
[app/employer/page.tsx](../src/app/employer/page.tsx). A local build of the same
code shows the envelope and bell in the employer header. **Production shows
neither.**

**Consequences, and they are large:**

1. The register's **19 "fixed — awaiting retest"** rows **cannot be validly
   retested against production.** Retesting there tests old code.
2. Three S1/S2 defects I confirmed "still broken" on production are **probably
   already fixed in code** — see the retest table below.
3. Some findings in the teardown may also already be fixed.

### TD-00 · Deploy `main` to production, then re-run the retest `OPS` · ⭐ do first

Nothing else on this list should be judged until this happens. Owner: Nayan /
Asrar.

---

## 1. Retest results, 2026-08-19

Run against **production (stale)**, logged in as `qa.employer` and `qa.seeker`.

| Defect | Sev | Verdict on stale prod | Read as |
|---|---|---|---|
| DEF-005 / DEF-013 | S2 | **PASS** — register asks "I want a job / I want to hire" first | Close |
| DEF-011 | S3 | **PASS** — ProSiddhi logo present | Close |
| DEF-012 | S3 | **PASS** — footer employer links open Login on the Employer tab | Close |
| DEF-025 | S2 | **PASS** — switching users lands on the right dashboard | Close |
| DEF-026 | S3 | **PASS** — profile shows full details, "Verification: Approved" | Close |
| DEF-010 | S3 | **N/A** — no Azkashine mark on the home page at all | Close as N/A |
| DEF-022 | **S1** | **FAIL on prod** — no Messages entry point anywhere, phone or desktop, including the account menu. But `/messages` **works when typed directly** | **Almost certainly a deploy gap** — retest after TD-00 |
| DEF-021 | S2 | **FAIL on prod** — no notification bell anywhere | **Same — retest after TD-00** |
| DEF-023 | **S1** | **FAIL on prod** — employer opens their own job → bounced to `/employer`. Verified twice | **Retest after TD-00** |
| DEF-014 | S2 | **FAIL, low confidence** — typed "driver" on `/employee`, Enter and search click, stayed put | Retest after TD-00 |
| DEF-004 | S2 | **INCONCLUSIVE** — "Select location" is a button, not a dropdown; my probe caught footer links | Needs a human look |
| DEF-033 | S2 | **INCONCLUSIVE** — Shortlisted control exists; proving it filters needs a shortlisted candidate | Needs test data |
| DEF-007, 008, 015, 019, 020, 030 | mixed | **NOT RUN** — each needs a registration, i.e. a write | Run against local BE |

*Correction for the record: my first automated pass scored DEF-023 a PASS. It only
checked for a bounce to `/job-feed`; this bounces to `/employer`. The verdict above
is the corrected one.*

### TD-01 · Re-run this whole table after the deploy `WEB` · S

Then update [qa/defect-log.csv](qa/defect-log.csv) with real retest results.

---

## 2. The location workstream — `MOB` + `WEB` + `BE`

*Nazir asked specifically that this ship across all three surfaces. Here is what is
actually required, verified against the backend source rather than the API doc.*

### What already exists — more than expected

- `JobSeeker.latitude` / `.longitude` — `prisma/schema.prisma:284-285`
- `Job.latitude` / `.longitude` / `.radius` (default 5 km) — `schema.prisma:513-515`,
  with `@@index([latitude, longitude])`
- `GET /api/jobs/nearby` — *"Reads seeker's lat/lng. Returns empty + noLocation flag
  if not set"* (`job.controller.ts:287-290`). **So the FE sending only `radius` is
  correct, not a bug.**
- Every write endpoint **already accepts coordinates**: job create
  (`job.validator.ts:30`), job update (`:77`), job query (`:133`), seeker
  registration and profile (`auth.validator.ts:74`, `:250`).

### The actual defect

**Nothing ever writes a coordinate.** The feature is built end to end on the
backend and starved of input by both clients. That single gap causes all of:

- "Near By" returning **0 results** (web tab, and the mobile home section)
- the recommendation score's **20-point location component being 0** for every user
  on every job — which is part of why "Recommended" returns 1 job in 10
- DEF-035 in the register

### TD-02 · Capture the seeker's coordinates `WEB` `MOB` · M

On the seeker profile and in registration: ask for browser/device location with a
clear reason, and **always** offer a manual fallback (choose your area) — permission
will often be refused, and this audience may not understand the prompt. Send
`latitude` + `longitude` on the existing profile update. **No BE change.**

### TD-03 · Capture the job's coordinates `WEB` `MOB` · M

On the post-a-job form, geocode the typed location, or let the employer drop a pin.
Send `latitude` + `longitude` on job create/update. Set `radius` sensibly (the BE
default is 5 km). **No BE change.**

### TD-04 · Surface `noLocation` properly `WEB` `MOB` · S

The web already handles it well — "No jobs near your saved location yet" with an
**"Add your location"** button. **Mobile shows a struck-through pin and nothing
else, on the home screen.** Give mobile the same recovery action, or hide the
section until a coordinate exists.

### TD-05 · Then re-check the recommendation score `BE` · M

Once coordinates flow, confirm the 20-point location component actually scores.
⚠️ BE reading/possible tuning — Asrar.

### TD-06 · Widen the city list `WEB` · S–M

[cities.ts:18-23](../src/lib/cities.ts#L18-L23) hardcodes four cities — Bangalore,
Delhi, Mumbai, Pune — against jobhai's 500+. A person in Nagpur or Patna cannot
pick their city. Related: DEF-004.

---

## 3. Truth and copy — cheapest work, biggest change in feel

### TD-07 · Tell employers about the free trial `WEB` `MOB` · S · ⭐

Every new employer gets **1 job post + 3 candidate unlocks free for 14 days**, and
we never say so. **Verified on a local backend**: a fresh employer's dashboard reads
*"Credit wallet · 1 Job-post credits · Expires 02 Sept 2026"* next to a **Buy
credits** button. The words "free" and "trial" appear **nowhere** — checked in the
DOM, both `false`. It reads like a bill.

Grant: [credit.service.ts:445](../../prosiddhi-backend/src/services/credit.service.ts#L445).
Copy exists only on the pricing page ([employer.json:177](../src/locales/en/employer.json#L177))
and in the terms ([legal.json:153](../src/locales/en/legal.json#L153)).

Four changes: employer landing + registration · the wallet card
([CreditWallet.tsx](../src/components/employer/CreditWallet.tsx)) · the post-job
form · the paywall title ([employer.json:304](../src/locales/en/employer.json#L304)).
Mirror all four on mobile.

### TD-08 · Fix the wrong-role login error `BE` `WEB` `MOB` · S

Correct email + correct password + wrong role toggle → **"Please use the correct
login URL for your account type"**, on a phone app with no URL. From
[employer.controller.ts:106](../../prosiddhi-backend/src/controllers/employer.controller.ts#L106)
and [jobseeker.controller.ts:111](../../prosiddhi-backend/src/controllers/jobseeker.controller.ts#L111);
both clients print it raw. Say *"This is an employer account. Tap Employer above."*
and switch the toggle. Register cross-ref: **DEF-017**. ⚠️ BE string — Asrar.

### TD-09 · Web paywall quotes ₹499 on a ₹589 charge `WEB` · S

**Mobile already shows "₹589 incl. GST · ₹499 + 18% GST".** Copy mobile.
Already recorded at [MONETIZATION.md:121](MONETIZATION.md#L121).

### TD-10 · Wallet speaks accounting, not English `WEB` `MOB` · S

"Credit wallet / Job-post credits / Candidate unlocks" → "**Job posts left: 1**",
"**Worker contacts left: 3**". [MONETIZATION.md §1](MONETIZATION.md) approves a
display-layer rename — **do not rename columns or API fields.**

### TD-11 · Footer names the company wrongly `WEB` · S

*"© 2026 Azkashine Software & Services Pvt. Ltd.."* — double full stop and the
wrong legal name, on a product issuing GST invoices. Correct:
**AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED**. Fill the empty GSTIN and
registered office in `legal.ts` while there.

### TD-12 · Add trust signals `WEB` `MOB` · S

jobhai leads with *"100% FREE & Verified Jobs"* and *"2 Crore+ Indians trust Job Hai
App"*; taphubs with rating + SSL badges. We promise nothing, in a market full of job
scams. One line above the fold plus a verified-employer badge.

### TD-13 · Copy and format inconsistencies `WEB` `MOB` · S

"1 results" (MOB) · "Welcome Back" vs "Welcome back" · "₹ Negotiable / Month" vs
"Salary not disclosed" · "11/08/2026" vs "5 hours ago" · "0 seat(s) available" ·
"Only rows with a position and start date are saved." · "10 Results" vs "Showing 9
results" for the same account.

### TD-14 · Decide on the "app is on the way" footer `WEB` · S

Every page tells visitors the product is a preview.

---

## 4. Layout and density

### TD-15 · Fix the web job feed's first screen `WEB` · S · ⭐

First job card at **991 px** — 1.17 screens of scroll, **zero** jobs visible. apna:
234 px, three jobs. **Our own mobile app: ~155 px, 2.5 jobs.** Copy the mobile
layout — title, search box, result count, jobs. Delete the hero heading and subtitle
from [job-feed/page.tsx](../src/app/job-feed/page.tsx). **Target: first card above
300 px.** Related: DEF-006.

### TD-16 · Rebuild the web login as one choice `WEB` · M · ⛔ SUPERSEDED

> **Replaced by TD-37 (2026-08-20).** Same goal — one login instead of eight
> combinations — but TD-16 was parked on DLT because it assumed phone + OTP had
> to be the primary method. TD-37 uses **phone + password**, which already works
> with no SMS, so the DLT block does not apply. Do not build TD-16. Read §9b.


2 roles × 4 methods = **8 combinations**; 11 buttons and 3 inputs. WorkIndia's is one
box and a "Skip" link. Default to **phone + OTP**, "Use email instead" as a text
link, **remove the role toggle** —
[login/page.tsx:19](../src/app/login/page.tsx#L19). Keep all methods working
underneath. If this lands, **TD-08 becomes unreachable**.

### TD-17 · Mirror the login simplification on mobile `MOB` · M · ⛔ SUPERSEDED

> **Replaced by TD-37 (2026-08-20)**, which covers web and mobile together.


9 buttons, 8 under 44 px.

### TD-18 · Reorder the employer dashboard `WEB` · S

It opens with the credit wallet and six zeros. **Mobile opens with *Job Posted 1 · 2
applicants*** — their hiring, not their bill. Copy mobile's order.

### TD-19 · One Apply button on the job detail `WEB` · S

Two identical blue Apply buttons on one screen.

### TD-20 · Raise small tap targets `WEB` · M

My Applications 14 of 15 under 44 px; Saved Jobs 13/15; Messages 11/12; login 15/17.
*(We are still far better than apna's 251 of 283 — polish, not crisis.)*

---

## 5. Broken or misleading

### TD-21 · Remove the "coming soon" voice icons `WEB` · S · ⭐

[VoiceButton.tsx](../src/components/feedback/VoiceButton.tsx) is used in **10 files**
and only ever says voice is coming soon. **Two sit on the login screen.** Render
`null` or remove the call sites. Voice stays deferred (locked scope Q2) — we stop
advertising the gap.

### TD-22 · Untangle the filter cascade `WEB` · M

Category → Sector → Job title, two dropdowns dead until the parent is chosen. Repeats
in the seeker profile and the post-job form. Let job title be searched directly.

### TD-23 · Show candidates before the employer types `WEB` `MOB` · M

"Find workers" is an empty box until you type. The free tier already permits snippet
search — show recent or matching candidates by default.

### TD-24 · Job-details stale "Applied" badge `WEB` · S

The effect never resets `hasApplied` / `isSaved` on `jobId` change, so a failed check
leaves the previous job's badge. Fix written previously, never applied.

### TD-25 · "Recommended" returns 1 job in 10 `WEB` `MOB` · M

Partly TD-05 (dead location component). Audit the remaining weights.

---

## 6. Brand and role identity

### TD-26 · Mobile uses two brand blues `MOB` · S · ⭐

[app_theme.dart:4](../../prosiddhi-mobile-app/lib/core/constants/app_theme.dart#L4)
`primary = 0xFF2563EB` (generic royal) vs
[:24](../../prosiddhi-mobile-app/lib/core/constants/app_theme.dart#L24)
`textAction = 0xFF5CC2ED` (the real brand sky). Welcome and login are royal, home is
sky, the website is sky. **Three appear at once on the employer dashboard** — plus
dark teal `#164E65`.

### TD-27 · Mobile welcome screen has no logo `MOB` · S

A generic briefcase in a royal square — the Flutter starter look — with our real mark
as a pale watermark behind it.

### TD-28 · Employer and seeker look identical `WEB` · M

Same primary `rgb(92,194,237)`, same logo, bar, avatar and cards. The only header
difference is one button. Give the employer area its own accent and header.

### TD-29 · Copy the mobile welcome screen onto the web `WEB` · M

Mobile's "I'm a Job Seeker / I'm an Employer" cards beat anything on our website;
taphubs does the same with two buttons.

---

## 7. Backend and operations

### TD-30 · Confirm `NODE_ENV=production` on the live API `BE` `OPS` · S

OTPs are returned in the response body when `NODE_ENV !== 'production'`
([otp.service.ts:87](../../prosiddhi-backend/src/services/otp.service.ts#L87),
[email-otp.service.ts:95](../../prosiddhi-backend/src/services/email-otp.service.ts#L95)).
**The gate is correct — verify the deployed environment sets it.** Not a code defect.

### TD-31 · Review `Access-Control-Allow-Origin: *` `BE` · S

`api.prosiddhi.com` answers with a wildcard origin, so any site can call it from a
browser; bearer tokens are then the only protection. May be deliberate for mobile.
Worth a conscious decision plus `/security-review`.

### TD-32 · Mobile has never run on a real device `MOB` · M

It demonstrably **runs**: clean `flutter analyze`, builds, boots, logs into
production, zero console errors, both roles walked. But that was the **web target**.
Still needs a real device or emulator before release.

### TD-33 · Mobile checkout `MOB` · L · ⛔ SUPERSEDED

> **Replaced by TD-36 (2026-08-20).** Nazir's call: purchasing is web-only, to
> avoid Play's 30%. So mobile checkout is not "blocked" — it is **not being
> built**. TD-36 removes the shopfront instead. Still needs Shaik to reopen D2.


---

## 8. Still open in the register (not from the teardown)

| Defect | Sev | Status | Note |
|---|---|---|---|
| DEF-006 | S3 | Open — deferred | Landing page does not fit the window. Same disease as TD-15 |
| DEF-018 | S2 | Open — needs BE verification | Duplicate GST / registration number accepted at employer registration |
| DEF-024 | S3 | Open — needs live verification | No required-field indicators on the job posting form |
| DEF-031 | S3 | Open — needs live verification | Work Experience step only partially visible during registration |
| DEF-032 | S3 | Open — product decision | Cannot edit email, phone or account type in Settings |
| DEF-035 | S2 | Open — root cause traced | Location filtering. **Superseded by §2 above** — note the behaviour changed: the register says Near By returns *the same as All Jobs*; it now returns **0** |

---

## 9. Decisions — Shaik's, not ours ⚠️

- **The 14-day trial expiry.** A free post that quietly dies is worse than none.
  `validityDays = 14`, [credit.service.ts:455](../../prosiddhi-backend/src/services/credit.service.ts#L455).
  **Making the trial visible (TD-07) needs no decision — do it regardless.**
- **A business employer's trial starts only at admin approval.** A four-day approval
  silently spends a quarter of it.
- **Should a seeker see a phone number?** WorkIndia puts Call and WhatsApp on every
  job card. Our paywall sits between the two people who want to talk. ⚠️ Contradicts
  the contact-unlock model.
- **Are we building for the right buyer?** Team seats, credit ledger, GST invoices, 8
  plans, seat suspension — enterprise machinery. WorkIndia says 90% of its customers
  are SMEs.
- **Does the "credits" rename extend to Terms and Privacy?** ⚠️ *added 2026-08-19.*
  `legal.json` carries 11 user-facing strings with the word, in all ten languages
  including English — e.g. *"A post credit is spent when you publish a job."* The
  2026-07-28 decision says the word is never user-facing, and the Terms page is
  user-facing. But it is contract text, so renaming it is a call for Shaik with a
  legal eye, not a side effect of a UI ticket.

---

## 9b. Added by Nazir, 2026-08-20 (second batch)

Three new items. All checked against the code before writing; none is started.

### TD-36 · Remove purchasing from mobile — web-only `MOB` · M · ✅ UNBLOCKED

**Decision (Nazir, 2026-08-20): all purchases happen on the web.** Reason: Play
takes 30% and, per
[store-policy notes](../../prosiddhi-mobile-app), grants **no B2B exemption** —
the credits→"Job Posts" rename is not a defence.

**No in-app purchase was ever built**, so this is removal of *shopfront*, not of
plumbing: `pubspec.yaml` has no Razorpay and no billing dependency at all. What
exists and sells:

| File | What it does |
|---|---|
| `features/employer/screens/plans_screen.dart` | the 8 plans |
| `features/employer/widgets/plan_card.dart` | a plan, priced |
| `features/employer/screens/credit_wallet_screen.dart` | wallet + top-up entry |
| `features/employer/widgets/no_credits_sheet.dart` | "you are out" upsell |
| `features/employer/widgets/action_blocked_sheet.dart` | the gate's upsell |
| `features/employer/utils/post_job_gate.dart` | blocks posting when empty |

**Keep** the wallet *balance* and the gates — an employer must still see what
they have and why a post is blocked. **Remove** the priced plans and every
buy/top-up action.

⚠️ **Do not write the "buy it on the web" copy from guesswork.** Play's
anti-steering rules govern whether the app may link to, or even mention, an
external purchase — and they differ by market (India has the CCI ruling; the US
position moved after Epic v. Google). **Check current policy, then write the
words.** Removing the purchase is safe; advertising the alternative may not be.

✅ **D2 is REOPENED AND RESOLVED — 2026-08-20, Nazir as PO.** Purchasing is
web-only. Nothing about this is blocked; build it. The decision is recorded in
`docs/STATUS.md` §Decisions and in the mobile repo's own STATUS and session-start
docs, so `scope-drift-checker` will not fight it. **Closes TD-33** as won't-do.

### TD-37 · One login: phone + password, plus Google `WEB` `MOB` · M · ⛔ see the warning

**Decision (Nazir, 2026-08-20): keep mobile-number login only; Google stays
alongside it.** That part is good and unblocks TD-16/TD-17, which were parked on
DLT.

⛔ **But NOT by "hiding the OTP and letting the user straight in."** That is an
authentication bypass: anyone who knows a phone number owns that account —
every seeker's PII, every employer's billing. It would also make the existing
`EXPOSE_OTP_IN_RESPONSE` hole (§ SESSION STATE, 2026-08-20) the front door
rather than a leak.

**It is not needed.** Phone + password **already works** and needs no SMS:
`POST /jobseekers/login` and `/employers/login` take `identifier` + `password`,
where `identifier` is the phone. The smoke suite has used exactly this since
2026-08-20 (`scripts/smoke/lib-smoke.js`, `loginSeeker`) precisely because OTP
trips the rate limiter.

So the single clean login is: **phone + password**, with **"Continue with
Google"** beside it. Google is real on both surfaces — backend
`authService.googleLoginOrSignup` verifies the ID token against Google's JWKS
(`google-auth-library`, needs `GOOGLE_CLIENT_ID`), and mobile already ships
`google_sign_in: ^7.2.0`.

**Bonus: this lets `EXPOSE_OTP_IN_RESPONSE` be turned OFF**, closing a live
account-takeover vector instead of formalising it. Registration is unaffected —
it verifies by **email**, which does deliver.

Keep phone-OTP in the code, unadvertised, and promote it when DLT clears.

### TD-38 · Location on mobile — nothing is captured `MOB` · M

**Answer to "have we done location filtering in mobile?": no.** Mobile is
exactly where the web was before TD-02.

- The service layer is **already ready** — `seeker_profile_service.dart:35-48`
  accepts and sends `latitude` / `longitude`.
- **Nothing ever calls it with a coordinate**, because there is **no
  geolocation package in `pubspec.yaml` at all** — no `geolocator`, no
  `location`. *(This settles the "⚠️ Unverified" question in
  [location-plan.md](location-plan.md) §3.)*
- `home_tab.dart:115` does call `/api/jobs/nearby`, so it gets
  `noLocation: true` and shows the struck-through pin — **TD-04**.

Work: add a geolocation plugin, mirror TD-02's two tiers (typed city → centroid,
button → precise fix), and give TD-04 its recovery action. Android needs
`ACCESS_FINE_LOCATION`, iOS `NSLocationWhenInUseUsageDescription`, both with a
translated plain-language reason.

### TD-40 · Existing jobs have no coordinates — backfill them `DATA` · S ⭐

**Found by review during TD-03, and it is the difference between "fixed" and
"fixed for new jobs only".**

TD-03 gives a coordinate to every job posted or edited *from now on*. It does
nothing for the jobs already in the table, and both
`getJobs` (`job.service.ts:336`) and `getNearbyForSeeker` (`:1478`) drop a job
with a null coordinate. So **after the deploy, DEF-035 still reproduces on the
whole existing job table** — Near By and the city filter will look broken to
anyone testing with today's data, while `smoke-td03.js` passes on a job it just
created.

**✅ The script is written and tested: [`scripts/backfill/job-coordinates.mjs`](../scripts/backfill/job-coordinates.mjs).
What remains is running it on production — Asrar or Nayan.**

```bash
API=https://api.prosiddhi.com/api npx tsx scripts/backfill/job-coordinates.mjs > backfill.sql
```

**It writes nothing.** It reads the job list, matches each `location` string with
the application's own matcher, and prints `UPDATE` statements for a human to
**read before running**. That shape is deliberate: the frontend holds no database
credentials, the backend is Asrar's to commit to, and — because of **TD-42** — a
coordinate written onto the wrong city cannot be cleared through any API, only
by more hand-SQL.

Each statement names the job id and the text it matched, and carries
`AND latitude IS NULL`, so re-running is safe and a job that gained a coordinate
in the meantime is left alone.

Jobs whose text names no city we know are **left alone on purpose** and listed at
the end with their ids, for **TD-34** or a human. A wrong coordinate is worse
than none.

⚠️ `tsx` is not a dependency of this repo, so `npx` fetches it on first run —
the same friction `scripts/smoke/README.md` documents for Playwright.

*Two things found while building it, both now fixed and worth knowing: the first
draft re-implemented the matcher and silently lost alias support, so "Bengaluru"
matched nothing; and it read only ACTIVE jobs, because `getJobs` defaults its
WHERE to that — it now asks for all six `JobStatus` values by name and prints
which it scanned. On the local database those two bugs hid 9 jobs and 3 of the
rows needing a coordinate.*

### TD-41 · The job form never says whether it captured a location `WEB` · S

A coordinate has no visible representation. Press "Use my current location" on
the job form and the button simply stops spinning; type "Nagpur" and nothing
hints that the job will be invisible in Near By. The seeker profile has three
explicit states for exactly this reason; the employer form has none.

The seeker copy cannot be borrowed — `profile:seeker.locationOn` is worded
"You will see jobs near you", which is backwards for an employer. Needs 3 new
keys × 10 locales.

### TD-42 · A coordinate cannot be cleared, only replaced `BE` · S ⚠️ Asrar

`latitude` / `longitude` are `.optional()` and **not** `.nullable()` on both the
seeker-profile and job schemas, so no client can null one. Consequence, worst on
the employer side: edit a job's location from "Bangalore" to "Nagpur" and it
**keeps the Bangalore coordinates** — it goes on showing to Bangalore seekers at
0 km and never reaches Nagpur.

Not fixable in the frontend. Needs `.nullable()` plus a service that writes
`null` through, then one line in `coordsToWrite`.

### TD-39 · `aria-required` announces a field with no name `WEB` · S

Found by review on **already-shipped `b46301a`** (DEF-024), so it is not a
regression from that fix — the fix simply made an existing gap audible.

`TaxonomyPicker.tsx:96` now sets `aria-required` on `<select>` elements whose
`<label>` neither wraps them nor carries an `htmlFor`. A `<select>` has no
placeholder to fall back on, so a screen reader announces **"combo box,
required"** with no field name at all. The same sibling-label pattern is in
`JobForm.tsx:170 / 194 / 199 / 245`.

Fix is mechanical — `id` on the control, `htmlFor` on the label — but it
touches the shared `Field` wrapper used across the whole form, so it is its own
ticket rather than a rider on someone else's.

Same family, found 2026-08-20 by the TD-06 review: the city `<select>` on
[job-feed/page.tsx:355](../src/app/job-feed/page.tsx#L355) has **no**
`aria-label`, while the identical control on
[employee/page.tsx:158](../src/app/employee/page.tsx#L158) has one. Fold into
this ticket.

### How job filtering actually works — answer to Nazir's question

**Yes, there is real keyword search, and it is better than expected.** Two
layers, in `job.service.ts:239-260` and `utils/search.ts:40`.

**1. Postgres full-text search.** A `search_vector` column kept current by a
trigger and GIN-indexed (`prisma/migrations/fts-setup.sql`). Fields are
**weighted**:

| Weight | Fields |
|---|---|
| **A** (highest) | `title`, `location`, `jobTitle` |
| **B** | `skillsRequired`, `category`, `sector`, `requirements` |
| **C** (lowest) | `description` |

The query is stemmed and OR-joined, so *"need nodejs job in banglore"* becomes
`bangalor | job | need | nodej` and ranks by `ts_rank_cd`. There is also a
**typo-tolerant location bonus**: `word_similarity(location, query) > 0.3` adds
`+1.0`, which is why *"banglore"* still puts Bangalore jobs above Pune ones.

**2. Fallback.** If FTS matches nothing (a query of pure stop words), it drops
to `ILIKE contains` on `title` + `description` only.

On top of both sit exact filters — category, sector, jobTitle, jobType, salary
— and the geographic filter.

⚠️ **This raises the price of TD-34.** Location text is weighted **A**, the
joint-highest. So *"bangalore"* / *"Bengaluru, Karnataka"* / *"Mysore"* sitting
in one column degrades **search ranking**, not just the city filter. Cleaning
that data is now a search fix as well as a filter fix.

---

## 10. Data, not code

- **TD-34 · Untidy job data.** Cities stored as *"bangalore"*, *"Mysore"* and
  *"Bengaluru, Karnataka"*; titles like *"furniture designer"*. **Inconsistent city
  text makes any city filter unreliable** — independent of the missing coordinates.
  Normalise on write, clean what exists.
- **TD-35 · Ten jobs in production.** No design change fixes an empty marketplace.

---

## 11. How we work — the gates on every item

- `npm run type-check` exits 0 — a pre-commit hook enforces it
- `npm run lint` **and** `node scripts/verify-locales.mjs` whenever copy or locales
  change — §3 touches ten locale files per item
- `/security-review` — Claude can run this
- **`/code-review` — Claude cannot.** Nazir types it. Ask; never imply it ran
- **One ticket, one commit.** Conventional message referencing the PJP ticket.
  **No `Co-Authored-By` trailer**
- ⚠️ `BE` items: coordinate with Asrar before committing
- ⚠️ `MOB` items: `flutter analyze` clean; coordinate with Sailaja
- Locked scope stays locked: no Aadhaar, no escrow/platform payments, no WebSockets
  for chat, no voice transcription, no audio. `.ics` is permitted for the interview
  email only
- Plan first on multi-file work and wait for a go-ahead
