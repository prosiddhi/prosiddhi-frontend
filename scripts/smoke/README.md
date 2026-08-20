# Smoke scripts

Browser checks that drive a **real local full stack**. Not unit tests, not run
by CI.

They exist so a claim like *"the wallet is below the jobs now"* or *"0 of 118
controls are under 44px"* can be re-checked by anyone, instead of being taken
on trust from a commit message. Several of them caught real regressions while
the fixes they verify were being written.

## Running them

You need the portal and the API running locally, and Playwright available.

```bash
# 1. API on :5000  (from prosiddhi-backend)
npm run dev

# 2. Portal, pointed at the LOCAL api — not production
cd prosiddhi-frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api npx next dev -p 3000

# 3. The checks
cd scripts/smoke
node smoke-td20.js
```

Playwright is not a dependency of this app. Either install it
(`npm i -D playwright`) or point at an existing copy:

```bash
export PLAYWRIGHT_PATH=/path/to/node_modules/playwright
```

They drive **system Chrome** by default (`channel: 'chrome'`), because a
machine that got Playwright via `npx` usually has no bundled Chromium.

### Environment

| Variable | Default |
|---|---|
| `SMOKE_FE` | `http://localhost:3000` |
| `SMOKE_BE` | `http://localhost:5000/api` |
| `SMOKE_OUT` | the OS temp dir — where screenshots land |
| `PLAYWRIGHT_PATH` | — |
| `SMOKE_BROWSER` | `chrome` |
| `SMOKE_SEEKER_PHONE` / `SMOKE_SEEKER_PASSWORD` | `+919876500019` / `Demo@12345` |
| `SMOKE_EMPLOYER` / `SMOKE_EMPLOYER_PASSWORD` | `demo.employer@prosiddhi.test` / `Demo@12345` |

## Two traps that will waste your afternoon

**Run exactly one `next dev` per repo.** Two dev servers on this project share
`.next` and clobber each other's builds. During the 2026-08-20 session a stale
server silently rebuilt the bundle pointing at **production**, so a run was
testing prod while reporting local. Later the same collision corrupted the
build into `missing required error components`.

**Killing the npm wrapper does not kill the server.** `npm run dev` spawns
`tsx`/`next` as a child. Kill by PID from `netstat -ano`, with `//T`, or the
old process keeps holding the port and answering with old code.

**A long-lived dev server can wedge on one route.** Same family as the first
trap, but it happens with only ONE server running. On 2026-08-20, after a long
session of hot reloads, `/employer/jobs/new` sat at `○ Compiling …` past 90
seconds while every other route compiled in about one. Nothing was wrong with
the code — killing the server by PID and restarting compiled the same route in
5.7 s. **If one route hangs and the rest are fine, restart before you debug.**

## What each one checks

| Script | Checks |
|---|---|
| `smoke-td02.js` | The seeker profile actually **writes** a coordinate — typed city → centroid, the GPS button → a precise fix, a bio-only save leaves that fix alone, a city typed in Kannada still matches, and Near By loses `noLocation`. Every check reads the record back over the API, because the form saves happily either way |
| `smoke-td03.js` | The payoff check for the whole location workstream: a job posted through the real form carries the city centroid, **a seeker in that city then finds it in Near By**, a title edit does not move the pin, and the location button overrides the centroid. ⚠️ **Posts a real job and spends a real post credit** — it deletes the job at the end, so let it finish |
| `smoke-td06.js` | All ten cities are offered and translated, and each sends **its own** `maxDistance` (Delhi 50, Surat 20 …). Reads the outgoing request, not the screen — a missing radius silently becomes the backend's 5 km default |
| `smoke-td08.js` | Wrong-role login names the account and moves the tab; a wrong password does **not**; an ADMIN does not start a tab ping-pong |
| `smoke-td12.js` | The trust claim is above the fold on `/` and `/employee`, in four languages, at ≥4.5:1 contrast |
| `smoke-td14.js` | No page still says the product is a preview |
| `smoke-td18.js` | Employer dashboard puts hiring above billing |
| `smoke-td18-errors.js` | Dashboard error paths: panels down + credits healthy still reaches invoices |
| `smoke-td19.js` | Exactly one Apply button, above the description |
| `smoke-td20.js` | Tap targets ≥44px across six seeker pages |
| `smoke-deadctrls.js` | Every visible `<button>` has a real handler |

## Reading the results

They print `PASS` / `FAIL` per assertion and exit 0 either way — **read the
output, don't trust the exit code.**

`smoke-td20.js` also flags a page that rendered **zero** controls rather than
scoring it `0/0` and calling it a pass. It quietly did exactly that for four
pages while the dev build was corrupt, which read as success. If you add a
script, make the empty case loud in the same way.

Two judgement calls are encoded in `smoke-td20.js` rather than left implicit:
a text link whose height clears 44px passes even when it is narrower, because
WCAG exempts inline text from the target-size rule; and a checkbox stays 16px
while its **label row** carries the 44px target.

## Test data

`SMOKE_SEEKER_PHONE` is a seeker seeded on the **local** database during the
2026-08-20 session, registered without an email — so the phone is the
identifier. Recreate it with `POST /api/otp/send` → `/api/otp/verify` →
`/api/jobseekers/register`.

Seeker login uses **phone + password**, not phone + OTP, on purpose: repeated
runs trip the OTP rate limiter (5 per 15 min) and then every later suite fails
for a reason unrelated to what it was testing.
