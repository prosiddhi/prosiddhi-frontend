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

**49 items: 25 ✅ done · 15 🔴 open · 4 🟠 WEB-done/MOBILE-pending · 3 ⛔ superseded ·
1 🟡 written-but-not-run (TD-40) · 1 ⚠️ not possible here (TD-32).**

*Recounted 2026-08-20 from the table with the loop below, after TD-04, TD-39 and
TD-41 closed and TD-44/45/46 were added. **The hand-written total has now been
wrong three times, most recently by the person adding this note.** Run the loop;
do not count by hand:*

```bash
for m in '✅' '🔴' '🟠' '⛔' '🟡'; do
  printf '%s ' "$m"; grep -c "^| TD-.*$m" docs/teardown-fix-list.md
done
grep -c '^| TD-' docs/teardown-fix-list.md   # total
```

⚠️ **A ✅ here used to mean "done on the web".** Checked 2026-08-20: TD-07,
TD-08, TD-10 and TD-12 were marked `WEB` `MOB` but had only ever shipped on the
web. **Closed 2026-08-21** — the mobile halves are now shipped too, along with
TD-13, TD-36, TD-37 and TD-38. Rows say **done both** where that is true.

⚠️ **The remaining badge to distrust is the reverse one: ✅ does NOT mean
"seen working".** Nothing in the mobile app has *ever* run on a device or an
emulator (TD-32, still open). The mobile ticks mean: verified against the live
API, `flutter analyze` clean, tests passing, and reviewed. They do **not** mean
anyone has looked at the screen.

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
| TD-04 | Surface `noLocation` | ✅ **done both surfaces** — web `0d6b4d8`, mobile `724b120` | |
| TD-05 | Re-check the 20-point score | ✅ done — fires; unplaced jobs no longer buried | BE `b5f6a0d` |
| TD-06 | Widen the city list to ten | ✅ done | `f7e631e` `d42204d` |
| TD-07 | Tell employers about the trial | ✅ **done both** — WEB `e098ae9` `d1d6f38`; MOB `767c163` | `767c163` |
| TD-08 | Wrong-role login error | ⛔ **SUPERSEDED by TD-37** — mobile shipped it (`e47692f`) and TD-37 then removed the two-gate login it depended on, so `ROLE_MISMATCH` is unreachable from mobile | `e47692f` |
| TD-09 | Paywall quotes ₹499 on ₹589 | ✅ done in code — ships with deploy | |
| TD-10 | Wallet speaks accounting | ✅ **done both** — MOB is display-layer only; API fields and columns untouched. ⚠️ 135 machine-substituted values across 10 locales are **unread by a speaker** | `c507b81` |
| TD-11 | Footer legal name | ✅ done in code — ships with deploy | |
| TD-12 | Trust signals | ✅ **done both** | `767c163` |
| TD-13 | Copy / format inconsistencies | ✅ **done both** — MOB: the job preview now says what the seeker will read | `4de0b23` · MOB `3f5dc34` |
| TD-14 | "App is on the way" footer | ✅ done | `4457fd1` |
| TD-15 | Job feed first screen | ✅ done | `f9b5f3b` |
| TD-16 | Rebuild the web login | ⛔ **SUPERSEDED by TD-37** | |
| TD-17 | Mirror login on mobile | ⛔ **SUPERSEDED by TD-37** | |
| TD-18 | Employer dashboard order | ✅ done | `de79a36` `f8caf5b` |
| TD-19 | One Apply button | ✅ done | `e67564a` |
| TD-20 | Tap targets under 44 px | ✅ done | `8630d7d` |
| TD-21 | Remove voice icons | ✅ done | `5755d6e` |
| TD-22 | Untangle the filter cascade | ✅ done — 32/32, `smoke-td22.js` | |
| TD-23 | Show candidates before typing | ✅ **WEB done** — 14/14, mobile pending | |
| TD-24 | Stale "Applied" badge | ✅ done in code — ships with deploy | |
| TD-25 | "Recommended" returns 1 in 10 | 🔴 open — partly TD-05 | |
| TD-26 | Mobile's two brand blues | ✅ done — ⚠️ visual check owed | `55dc23e` |
| TD-27 | Mobile welcome logo | ✅ done — ⚠️ visual check owed | `cd8ee11` |
| TD-28 | Employer vs seeker identity | ✅ done — one header, 5/5 `smoke-td28.js` | |
| TD-29 | Welcome screen onto the web | ✅ done — 12/12, `smoke-td29.js` | |
| TD-30 | `NODE_ENV` danger flags | ✅ code done — env is deliberate, see §9 | BE `79ebc15` |
| TD-31 | CORS allowlist | ✅ done | BE `624fd30` |
| TD-32 | Run mobile on a real device | ⚠️ **cannot be done from this machine** | Sailaja |
| TD-33 | Mobile checkout | ⛔ **SUPERSEDED by TD-36** | |
| TD-34 | Untidy job data | 🔴 open — data, **now also a search fix** | |
| TD-35 | Ten jobs in production | 🔴 open — data | |
| TD-36 | Remove purchasing from mobile | ✅ **done** — catalog + buy CTAs deleted; wallet and post-job gate KEPT; no external-payment steer (§99–100) | `705e358` |
| TD-37 | One login: phone or email + password, Google | ✅ **done both** — MOB: one endpoint, role toggle gone, `ROLE_MISMATCH`→`ADMIN_ACCOUNT`. ⚠️ **never run on a device** | `a2dbbf8` · MOB `41643d3` |
| TD-38 | Location on mobile | ✅ **done** — `cities.ts` **ported**, not re-derived; GPS rounded to 3 dp, manual fallback always offered. ⚠️ a runtime permission that has **never run on a device** | `4f37352` `b0ea4ab` `724b120` |
| TD-39 | `aria-required` with no field name | ✅ done — 27/27, `smoke-td39.js` | |
| TD-40 | Backfill coordinates on existing jobs | 🟡 **script written + tested** — needs running on prod | `scripts/backfill/` |
| TD-41 | Job form gives no location feedback | ✅ done — 14/14, `smoke-td41.js` | `80b8002` |
| TD-42 | A coordinate cannot be cleared | ✅ done — BE nullish + a clear control | BE `9dbb470` |
| TD-43 | Role-agnostic `POST /auth/login` | ✅ **done** — BE + FE, ⚠️ tell Asrar | BE `61258ef` |
| TD-44 | Seeker profile repeats TD-41's lie | ✅ done — 8/8, `smoke-td44.js` | |
| TD-45 | Job-form validation error is silent to a screen reader | ✅ done — announces + moves focus, 7/7 | |
| TD-46 | `language-fallback.png` 404 — was DEAD CODE | ✅ done — LanguageModal deleted, 269 lines | |
| TD-47 | Taxonomy renders in English in all ten locales | 🔴 open — ⚠️ Asrar, needs a display-name layer | |
| TD-48 | Primary action button is 2.02:1 — fails WCAG AA | ✅ done — sky kept, text darkened, 6.62:1 | ⚠️ mobile should match |

### The register — `docs/qa/defect-log.csv`, 35 rows

**11 resolved · 19 awaiting retest · 5 open** *(re-counted 2026-08-20, after TD-03 closed DEF-035)*.

The 19 cannot be judged until TD-00. The 5 genuinely open are DEF-006
(deferred), DEF-018 (Asrar), DEF-032 plus one more that is Shaik's call, and one
landing-page item. **DEF-035 closed 2026-08-20** — the first register row this
workstream closes outright.

---

## 🟢 SESSION STATE — 2026-08-21, end of the FOURTH fix session

**Read this first.** The status index at the top is the live truth; this is what
it cannot say.

### Shipped — six tickets, all gates green, every one smoke-proven

| Ticket | Commit | What, and the checks |
|---|---|---|
| **TD-04** | `0d6b4d8` | Near By offers "Add your location" only when there IS none. The debt owed to the mobile session — kept. 8/8 |
| **TD-39** | `a2cade5` | Every form control has a name a screen reader can read. 27/27 across four screens |
| **TD-41** | `80b8002` | The job form says what it did with the location — five states. 14/14 |
| **TD-22** | `e0a1909` | A job title can be searched instead of guessed. 34/34 |
| **TD-28** | `1c017b7` | Twelve hand-rolled employer headers → one, in the employer's own colour. 5/5 |
| **TD-29** | `ddec661` | The role choice is on the home page, not behind a language gate. 12/12 |

**Nothing is pushed.** Seven commits sit on local `main`, including `208ae2c`
from the previous session. `origin/main` is still at `777acb3`.

### ⚠️ Four things that are now other people's

1. **TD-47 — the taxonomy is English in all ten languages.** ⚠️ Asrar. The names
   are `@unique` primary keys used as the FOREIGN KEYS between the three levels,
   rendered raw. **It cannot be fixed in the locale files** — a translated
   `categoryName` stops matching its sector. Needs a display-name layer.
2. **TD-48 — the primary action button is 2.02:1.** ⚠️ designer. White on
   `primary-50`, measured off rendered pixels. That pairing is the product's
   action colour on every screen, seeker included. **This is the same open
   question as TD-26 on mobile — decide it once, for both surfaces.**
3. **TD-44** the seeker profile still tells the lie TD-41 fixed on the employer
   side, and **TD-45** the job form's validation error is silent to a screen
   reader. Both small, both web.
4. **TD-40's SQL still has not run on production**, and **TD-00 still blocks 19
   register rows.** Unchanged from the third session.

### What the smoke suites now cover

`scripts/smoke/` gained four: `smoke-td04`, `td22`, `td28`, `td29`, and
`lib-smoke.js` gained `authed`, `nearby` and a `geo` option on `session()` that
three suites had each hand-rolled. **100 checks across nine suites**, all green
at close.

Two of them measure rather than assert, and that is the point:
`smoke-td28.js` computes WCAG contrast from the painted colours, and
`smoke-td22.js` measures the placeholder against the real font in all ten
languages. Both caught things reading the code did not.

### Five things learned, and one repeated

1. **My own checks lied twelve times.** Wrong endpoint, wrong tab label
   ("Nearby", one word — every doc here writes "Near By"), an href that matched
   the header's account link, `/save/i` passing on the very sentence it forbade,
   `tagName === 'BUTTON'` passing on the Clear button, expectations invented
   rather than read from the locale file. **When a check goes red, suspect the
   check** — it was the check every time but two.
2. **A comment written from memory is a comment that is wrong.** `SAME_PLACE_KM`
   was justified with "the nearest pair is Ahmedabad–Surat at ~230 km". It is
   Mumbai–Pune at 120.2. I also wrote "passes contrast" about a button that
   measures 2.02:1. **Compute it, paste the number.**
3. **Chromium-only smoke cannot see a Safari bug.** The taxonomy search was
   completely dead on iOS — Safari does not focus a `<button>` on click, so the
   blur-close unmounted the result before its click fired. Every check passed.
4. **A live region mounted with its first content announces nothing.** Learned
   on TD-41, then immediately re-committed on TD-22's results list. Render the
   region always, empty when silent.
5. **The parallel mobile session refactored a file mid-read.** `canAddLocation`
   existed when I read `home_tab.dart` and was gone an hour later
   (`724b120`). **Re-read a cross-repo file before quoting it.**

### Owed

- **Nothing in this session was seen by a human eye.** Every claim is a
  measurement or a browser assertion. The employer header's new dark teal, the
  home page's role cards and the job-title search should all get a look.
- **`/register/categories` was never rendered.** It is the fourth host of the
  taxonomy picker and sits behind a phone-verification guard that redirects, so
  the browser could not reach it. Same non-grid layout as the job form, which
  was checked at 390 and 1280.
- **Nine strings and one Tamil rewrite came from the i18n-translator**, against
  each language's termbase. It flagged three itself worth a native eye: Marathi
  `स्वरूप` for "type", Telugu `ప్రాంతం` reading broader than "a dropped pin", and
  the Tamil placeholder now being a bare noun phrase.

---

## 🟢 SESSION STATE — 2026-08-20, end of the THIRD fix session

**Read this first.** The status index at the top of this file is the live truth;
this section is what a new session needs that the index cannot say.

### Shipped this session — all gates green on every one

| Ticket | What |
|---|---|
| **TD-02** `aa1abb3` | Seeker coordinates. Two tiers: typed city → centroid, button → precise fix |
| **TD-06** `f7e631e` `d42204d` | Ten cities, **each with its own radius**. The radius is the half that matters |
| **TD-03** `6fd606c` `da49122` | Job coordinates. **DEF-035 closed end to end** — the first register row this workstream closes outright |
| **TD-40** `20a7e8f` | Backfill script for existing jobs. Written and tested; **still needs running on prod** |
| **TD-37** `a2dbbf8` `777acb3` | One login. 11 buttons → 6, 3 inputs → 2, role choices → 0 |
| **TD-43** BE `61258ef` | Role-agnostic `POST /api/auth/login` |

**Everything is PUSHED**, both repos. No deploy-ordering problem remains.

### ⚠️ Three things owed to people

1. **Asrar has not been told** about backend `61258ef`. It is on `main`. Additive
   only — one controller method, one route — but he should hear it from Nazir,
   not discover it.
2. **TD-40's SQL has not been run on production.** Until it is, DEF-035 still
   reproduces on the existing job table, because TD-03 only writes a coordinate
   for jobs posted or edited *after* it. Nayan or Asrar.
   `API=https://api.prosiddhi.com/api npx tsx scripts/backfill/job-coordinates.mjs`
3. **TD-00 is still the biggest blocker in the project.** 19 register rows cannot
   be judged until production is deployed. Nothing built today is visible to
   anyone yet.

### The parallel mobile session — ✅ FINISHED 2026-08-21

`prosiddhi-mobile-app` closed its whole queue: **TD-38 (+TD-04) → TD-08 → TD-10
→ TD-07+TD-12 → TD-13 → TD-36 → TD-37**, plus a backend fix (`a0116f4`).
Everything is committed on `main`. Mobile is no longer the surface that is
behind.

**What it did NOT do, and both belong on someone's list:**
1. **Nothing ran on a device** (TD-32). TD-37 rewrote login and TD-38 added the
   app's first runtime permission, so the two riskiest screens are the two most
   recently changed. `flutter analyze`, 158 tests and the live API all pass —
   none of them can see a layout.
2. **No translation was read by a speaker.** Ten locales, filled by reuse from
   the web wherever possible and by machine substitution otherwise. The largest
   item is **TD-10's 135 substituted values**. Detail:
   `prosiddhi-mobile-app/docs/STATUS.md` §13.

**Also owed by the web side:** the mobile port of `identifier.ts` is faithful,
but **that file's comment overstates what its 11-digit handling does** — the
code's actual behaviour on an 11-digit input is not what the comment claims.
Mobile pinned the real behaviour in a test rather than "fixing" the port.

**Sailaja also commits there.** Coordinate.

✅ **That promise is KEPT — 2026-08-20, `0d6b4d8`.** The Near By empty state now
branches on `noLocation`, so the "Add your location" CTA appears only for a
seeker who has no coordinate at all. Mobile landed its half in `724b120` and went
further, switching icon, message and action off one pair rather than three — the
web copied that shape, because branching them separately is how mobile shipped a
struck-through pin stacked above an "Add location" button. Both branches are
proven on a local full stack by `scripts/smoke/smoke-td04.js` (8/8).

⚠️ Note for whoever reads this next: mobile REFACTORED `home_tab.dart` mid-session.
`canAddLocation`, cited in an earlier draft here, no longer exists — it is a
`switch` on `(showDistance, _noLocation)` now. Re-read that file before quoting it.

### Five things learned the hard way — worth not relearning

1. **My own tests lied five times today.** A wrong endpoint, a missing language
   switch, an email in a phone field, a mock that swallowed the path under test,
   a guard keyed on the wrong string. **When a check goes red, suspect the check
   first** — it was the test, not the code, every time but one.
2. **`/simplify` catches what the other gates miss.** type-check, lint,
   `/code-review` and `/security-review` all passed a matcher that silently lost
   alias support, a rule that discarded a fresh GPS fix, and a helper that
   deleted Devanagari digits. Diff size is not a reason to skip it.
3. **The dev server wedges on ONE route** while every other route compiles in a
   second — twice today, once with webpack cache corruption. Restart by PID
   before debugging. See `scripts/smoke/README.md`.
4. **`/security-review` sometimes harvests an empty diff** and reports clean on
   nothing. Check the branch state; review the real diff.
5. **Comments go stale inside the same commit that writes them.** Three times a
   docblock described the behaviour the diff had just changed.

### What is left for the WEB session

**Mine: 6.** TD-39 (aria-label, small) · TD-41 (job-form location feedback,
small) · TD-22 (filter cascade) · TD-23 (candidates before typing — mobile may
design this first; follow them) · TD-28 (employer identity) · TD-29 (welcome
screen onto web). Plus **TD-25**, which needs TD-05 first.

**Not mine: 7.** TD-00 deploy · TD-01 retest · TD-05 the score (Asrar) ·
TD-42 nullable coordinates (Asrar) · TD-34/35 data · TD-40's SQL run.

**Register: 11 resolved · 19 awaiting retest · 5 open.** Only ONE of the five
open is web code I can pick up (DEF-006). The 19 are the real number and they
move only when TD-00 does.

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

### TD-10 · Wallet speaks accounting, not English `WEB` `MOB` · S · ✅ DONE BOTH

> ✅ **MOBILE SHIPPED 2026-08-21 (`c507b81`).** **Display layer only** — no API
> field, no column, no wire value was renamed. ⚠️ It substituted **135 values
> across ten locales** by script. Blind substitution first produced *"You're out
> of unlock Candidate Unlocks"*, caught by reading the English output and fixed
> by collapsing the qualifier before swapping; **the other nine languages'
> output has not been read by a speaker.**

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

### TD-36 · Remove purchasing from mobile — web-only `MOB` · M · ✅ DONE

> ✅ **SHIPPED 2026-08-21 (`705e358`).** `plans_screen.dart`, `plan_card.dart`,
> `plans_service.dart` and `core/models/plan.dart` are deleted. The wallet
> balance and `post_job_gate.dart` are **kept**, as specified.
>
> **The "buy it on the web" copy was deliberately NOT written.** The warning
> above says to check policy first; `store-policy-assessment.md` line 99 already
> forbids any external-payment steer and line 100 accepts the consequence —
> *"the gate becomes a dead end, not a funnel."* Writing that copy would have
> been the drift, so the question was left closed rather than reopened.
>
> ⚠️ **Still owed (product, not engineering):** three strings —
> `empwNoCreditsBody`, `empwNoCreditsBodyAfterSubmit`, `empwTrialEndedBody` —
> still say *"Buy a plan, or the single-post pack, to keep hiring"*, instructing
> an action the app can no longer perform.

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

### TD-37 · One login: phone + password, plus Google `WEB` `MOB` · M · ✅ DONE BOTH

> ✅ **MOBILE SHIPPED 2026-08-21 (`41643d3`).** The warning below was respected:
> **the OTP was not hidden and nobody is let in without a credential.** Every arm
> still sends a password or a server-issued, single-use OTP. A security review
> read the backend and confirmed **no bypass and no downgrade**.
>
> What mobile built: one `POST /api/auth/login`, one identifier field taking a
> phone *or* an email, and **no role sent by the client**. The seeker/employer
> toggle is deleted — it was never an authorization check, only a choice of
> which endpoint to POST to. `ROLE_MISMATCH` is therefore **unreachable from
> mobile**; the one refusal that carries a role is **`403 ADMIN_ACCOUNT`**
> (ADMIN *and* SUPER_ADMIN). Phone-OTP survives **unadvertised**, behind a link
> that goes **both ways**. `identifier.ts` was **ported**, not re-derived.
>
> ⚠️ **Never run on a device.** Login is the one screen where an unnoticed
> failure means nobody gets in at all.

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

### TD-38 · Location on mobile — nothing is captured `MOB` · M · ✅ DONE

> ✅ **SHIPPED 2026-08-21** (`4f37352` · `b0ea4ab` · `724b120`), TD-04 with it.
> `core/location/cities.dart` is a **port** of `src/lib/cities.ts`, not a
> rewrite from the description: per-city radii, **right-to-left** matching,
> translated labels matched, canonical English stored while the reader's script
> displays, and the **two alias tables kept apart**. GPS is rounded to 3 dp at
> source and never logged; a manual fallback is always offered.
>
> ⚠️ **This added the app's first runtime permission and it has never run on a
> device.** Separately, the nine `ios/Runner/<lang>.lproj/InfoPlist.strings`
> files are **not in the Xcode target**, so iOS shows the English prompt in
> every language — and on iOS that prompt is the consent artifact a reviewer
> reads. A 5-minute click-through, not code.

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

### TD-43 · A role-agnostic login endpoint `BE` · S ⚠️ Asrar

TD-37 removed the seeker/employer toggle by having the client try one gate and,
on `ROLE_MISMATCH`, retry the other. It works, and it is safe — the retry only
ever fires on credentials that have already verified. But it puts two pieces of
backend knowledge into the client, and **in two languages** once mobile mirrors
it:

1. **The role enum.** `EMPLOYER_INDIVIDUAL` / `EMPLOYER_BUSINESS` are hardcoded
   in `loginAnyRole`. A new role added backend-side silently breaks login for it.
2. **The ORDER of two server-side checks.** The retry only works because the
   password is verified *before* the role gate runs. Failing the role gate first
   is arguably the more defensible order — and that change would break every
   employer login with no frontend change and nothing obvious to point at.

It also costs a **second token against `authRateLimit`** (10 per 15 min, no
`skipSuccessfulRequests`), so an employer who mistypes a few times and then types
correctly can be locked out **at the moment they succeed**.

**The ask is small.** `authService.login` already calls `detectIdentifierType`,
finds the user and verifies the password role-blind — the role gate is the last
step, and it lives in the controllers. A `POST /api/auth/login` that skips that
gate and returns the user with their real role deletes the guess, the enum copy,
the ordering dependency and the double rate-limit spend, on both clients at once.

⏱️ **Worth raising BEFORE the mobile session ports `loginAnyRole` into Dart**, or
we own the same backend detail twice, in two languages.

### TD-47 · The whole taxonomy is English in all ten languages `BE` `DATA` · M ⚠️ Asrar

**Found by the i18n-translator during TD-22, and it is bigger than TD-22.**

Category, Sector and Job title are `name String @unique` on the backend
(`schema.prisma:1046,1061`) and are used as the FOREIGN KEYS between the three
levels (`categoryName references name`). The frontend renders `c.name` raw —
there is no translation layer anywhere in `src/`. So a Tamil seeker picking
their trade reads **"Agri & Food-Based Industries"**, **"Machine Operator"**,
in English, on a screen where every other word is Tamil. All ten locales, all
four screens that show the picker.

This is not a locale-file gap — nothing is missing from the JSON. The names are
identifiers, so they cannot simply be translated in place: it needs a display-name
table keyed by (name, language) on the backend, or a translated label map shipped
with the client, and a decision about which.

**It bites hardest on the thing TD-22 just built.** The dropdowns at least let a
reader pick from a list and recognise the shape of a word. A search box invites
them to TYPE, and typing their own language matches nothing. TD-22 works around
it by drawing its placeholder example from the live tree rather than from the
translation, so the example is always a string the search can find — but that is
a guard against the symptom, not a fix.

⚠️ **Do not "fix" this by translating the names in the locale files.** They are
join keys; a translated `categoryName` stops matching its sector.

### TD-48 · The primary action button fails contrast, everywhere `WEB` `MOB` · M ⚠️ designer

**Measured, not estimated:** white text on `primary-50` (#5cc2ed) is **2.02:1**.
WCAG AA wants 4.5:1 for text. Verified in a real browser off the rendered pixels
by [`scripts/smoke/smoke-td28.js`](../scripts/smoke/smoke-td28.js), which prints
the ratio on every run.

That combination — `bg-primary-50 text-white` — is the product's primary action.
It is on Post a Job, Apply, Save Changes, Search Jobs, every retry button, on
seeker screens as much as employer ones. So this is not a bug in any one screen.

**TD-28 deliberately did not fix it.** It fixed the *outline* links in the
employer header, which were `text-primary-50` on white — 1.9:1, sky as TEXT — by
moving them to `primary-90` at 9.08:1. Repainting the solid button is a different
thing: it changes the brand's action colour across the whole product, and picking
what replaces it is a designer's call across the scale.

⚠️ **This is the same open question as TD-26 on mobile**, which ended with:
"mobile's action colour is now brand primary/80, not the sky primary/50 the
website uses, because all 58 call sites are text or fills behind white text and
sky is 2.0:1 on white. Making sky the mobile action colour needs a designer to
reassign those call sites across the scale." Web has now measured the same wall
from the other side. **Decide it once, for both surfaces.**

Cheapest honest options, for whoever decides: darken the fill to `primary-60`
(#46a4cb, ~2.9:1 — still fails) or `primary-80` (#236987, ~6.4:1 — passes), or
keep sky and put dark text on it (#0c3343 on #5cc2ed is ~7.4:1). The last keeps
the brand colour and is the smallest visual change.

### TD-44 · The seeker profile tells the same lie TD-41 just fixed `WEB` · S

Found by review during TD-41, on the other side of the same feature.

A seeker with saved Bangalore coordinates who edits their location to "Nagpur"
still sees **"You will see jobs near you."** in green
([profile/page.tsx](../src/app/profile/page.tsx), the `locationOn` branch). They
will see Bangalore jobs. `pendingFix` is undefined because nothing can be
written, `savedCoords` is set, and the three-state line reads that as success.

The machinery to fix it already exists: `coordsToWrite` now returns a `reason`
(`fix` / `city` / `keep` / `none`), so the seeker screen can branch exactly as
the employer form does. What it needs is its own copy — the employer's wording
is about who will see the job, and the seeker's is about what they will see —
so it is 2–3 new keys × 10 locales, not a code-only change.

### TD-45 · The job form's validation error is silent to a screen reader `WEB` · S

Found by review during TD-39. `JobForm.tsx` renders `shownError` in a plain
`<div>` with no `role="alert"` and no `aria-live`, and no control carries
`aria-invalid` or `aria-describedby` pointing at it. Press Post with a screen
reader and nothing is announced; focus stays on the button. Now that every field
on that form has a name (TD-39), this is the largest hole left on it.

Note the pattern TD-41 used for its own status line: the live region is rendered
**always**, empty when there is nothing to say. Mounting the element and its
first message in the same commit means screen readers generally announce
neither — which is the trap this ticket has to avoid, not repeat.

### TD-46 · `/assets/language-fallback.png` does not exist `WEB` · XS

A 404 for a file that does not exist: `public/assets/` holds `language.mp4` and
no such PNG. It is the `<img>` fallback inside a `<video>`, and Chrome requests
it regardless, so `scripts/smoke/smoke-td41.js` filters it as known noise.

**Shrunk by TD-29.** It had two call sites; the home page's went with
`LanguageSection`, which TD-29 replaced by
[GetStartedSection.tsx](../src/components/home/GetStartedSection.tsx) — no video,
no fallback. The one left is
[LanguageModal.tsx:85](../src/components/home/LanguageModal.tsx#L85), which is
**not** on the home page, so the "every load" this was first written about is
already gone. Either add the file or drop the `<img>`; and if it is dropped, drop
the filter in the smoke with it.

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
