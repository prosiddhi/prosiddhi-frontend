// TD-04 (web half) — the Near By empty state must tell two different problems
// apart, and only offer the fix to the one that HAS a fix.
//
//   noLocation: true   the seeker never gave us a coordinate.  → message + CTA
//   empty, no flag     they gave us one; nothing is within 50 km. → message ONLY
//
// The second case is what this exists to protect. Before the change the CTA
// rendered whenever the tab was empty, so a seeker standing in Bangalore with
// their coordinate saved was still told to "Add your location" — advice they had
// already taken, about a thing they could not change. Mobile branches on the
// same pair in `home_tab.dart`; the full argument lives on `JobsPage.noLocation`
// in src/lib/api.ts.
//
// ⚠️ Needs a seeker with NO coordinate, and because of TD-42 a coordinate cannot
// be cleared through any API — only overwritten. So this registers its own
// phone-only seeker on first run and reuses it forever after. It never gets a
// coordinate, which is precisely its job.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, BE, post, authed, nearby, loginSeeker, session } = require('./lib-smoke')

// A seeker that must never own a coordinate. Distinct from SMOKE_SEEKER_PHONE,
// which TD-02's suite deliberately gives one.
const NOLOC_PHONE = process.env.SMOKE_SEEKER_NOLOC || '+919876500077'
const NOLOC_PASSWORD = process.env.SMOKE_SEEKER_NOLOC_PASSWORD || 'Demo@12345'

// Far out in the Bay of Bengal. The point is not the sea — it is being more than
// 50 km from every job in the table, so the nearby feed comes back empty with a
// coordinate present. A land city risks a job actually being there.
const NOWHERE = { lat: 15.5, lon: 87.5 }
const HOME = { lat: 12.9716, lon: 77.5946, location: 'Bangalore' }

// Argument order matches every sibling in this folder — smoke-td02.js:47,
// td03:14, td06:26, td08:17, td37:18 are all `check(label, ok, detail)`. Both
// orders take (string, boolean-ish, string), so a line copied between two
// scripts under the other convention does not throw: it prints `PASS true` and
// the assertion can never fail again.
let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

function setCoords(token, coords) {
  return authed('/jobseekers/profile', token, { method: 'PUT', body: JSON.stringify(coords) })
}

const tryNoLocLogin = () =>
  post('/jobseekers/login', { identifier: NOLOC_PHONE, password: NOLOC_PASSWORD })

// Log in as the coordinate-less seeker, registering them if this is a first run.
// Login is tried FIRST: register consumes the phone-verification mark and is not
// safely repeatable, so attempting it on an existing account fails in a way that
// reads like a broken backend.
async function loginOrCreateNoLocSeeker() {
  const existing = await tryNoLocLogin()
  if (existing.success) return existing.data

  // ⛔ Registration only ever happens against a LOCAL backend.
  //
  // This is the only script in the folder that CREATES AN ACCOUNT, and it does
  // so with a password written down in this repo and in the README. Pointed at
  // a shared or production API — one `SMOKE_BE=` away — it would stand up a
  // real, permanent seeker whose credentials are public, and TD-42 means the
  // coordinate it never gets could not be cleaned up through any API either.
  // Failing loudly here is cheaper than discovering that account later.
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(BE)) {
    throw new Error(
      `Refusing to register a seeker against ${BE}. This creates a real account with a ` +
        'password committed to this repo, so it is allowed only on localhost. Point SMOKE_BE ' +
        'at the local API, or pre-create the account and set SMOKE_SEEKER_NOLOC.',
    )
  }

  // /otp/send refuses in two different ways, and they mean opposite things
  // (prosiddhi-backend/src/services/otp.service.ts):
  //
  //   "already verified"   — the verification mark survives a failed register,
  //                          so a re-run is mid-flow. Usable: skip to register.
  //   "already registered" — a real account exists and is phone-verified. The
  //                          login above therefore failed on the PASSWORD, and
  //                          no amount of registering will fix that.
  //
  // Treating the second as the first is what makes this suite blame
  // EXPOSE_OTP_IN_RESPONSE for a wrong password.
  const sent = await post('/otp/send', { phoneNumber: NOLOC_PHONE })
  const message = sent?.message ?? ''
  if (/already registered/i.test(message)) {
    throw new Error(
      `${NOLOC_PHONE} already exists but did not accept the password. Either set ` +
        'SMOKE_SEEKER_NOLOC_PASSWORD to the right one, or point SMOKE_SEEKER_NOLOC at an ' +
        'unused number — it must be a seeker that has NEVER had a coordinate.',
    )
  }
  if (!/already verified/i.test(message)) {
    const otp = sent?.data?.otp
    if (!otp) {
      throw new Error(
        'Cannot create the no-coordinate seeker: the OTP was not in the response. ' +
          'Set EXPOSE_OTP_IN_RESPONSE=true on the local backend. Got: ' + JSON.stringify(sent),
      )
    }
    const verified = await post('/otp/verify', { phoneNumber: NOLOC_PHONE, otp })
    if (!verified.success) throw new Error('OTP verify failed: ' + JSON.stringify(verified))
  }

  // Multipart, because the register route is mounted behind multer.
  const fd = new FormData()
  fd.append('fullName', 'Smoke NoLocation')
  fd.append('password', NOLOC_PASSWORD)
  fd.append('phoneNumber', NOLOC_PHONE)
  // Read off the live tree rather than hardcoded: the backend rejects a sector
  // it does not know, and a name invented here fails with "Sector 'X' does not
  // exist", which reads like a broken taxonomy rather than a broken test.
  const tree = await (await fetch(BE + '/categories')).json()
  const sector = tree?.data?.[0]?.sectors?.[0]
  if (!sector?.jobTitles?.length) {
    throw new Error('the taxonomy tree is empty — cannot register a seeker')
  }
  fd.append('preferredCategory', tree.data[0].name)
  fd.append('preferredSector', sector.name)
  fd.append('preferredJobTitle', sector.jobTitles[0].name)
  fd.append('preferredLanguage', 'en')
  // No latitude, no longitude, no location. That is the entire point.
  const res = await fetch(BE + '/jobseekers/register', { method: 'POST', body: fd })
  const reg = await res.json()
  if (!reg.success) throw new Error('register failed: ' + JSON.stringify(reg))

  const fresh = await tryNoLocLogin()
  if (!fresh.success) throw new Error('login after register failed: ' + JSON.stringify(fresh))
  return fresh.data
}

// What the Near By tab is showing: the body sentence, and whether the recovery
// link is on the page.
//
// The CTA is matched by its LABEL, not by `a[href="/profile"]` — the account
// dropdown in the header points at /profile too, so counting hrefs scores a
// header link as the empty-state CTA and the "no CTA" assertion can never fail.
//
// The tab is "Nearby", one word. Every doc in this repo writes "Near By"; the
// shipped string does not, and a /near by/ regex simply times out.
async function readNearbyTab(browser, auth) {
  const { ctx, page } = await session(browser, auth, { width: 390, height: 840 })
  await page.goto(FE + '/job-feed', { waitUntil: 'domcontentloaded' })
  // Proof of hydration rather than a guess at it. The feed fetches its first
  // page from a mount effect, so a reply from the API means the client
  // component is live and its onClick handlers are attached. Clicking before
  // that is silently lost — the page stays on All Jobs and the wait below then
  // times out blaming the empty state. The siblings sleep 1500–2000 ms here;
  // this waits for the actual signal instead.
  await page.waitForResponse((r) => r.url().includes('/api/jobs'), { timeout: 20000 })
  await page.getByRole('button', { name: /^nearby$/i }).click()
  // Wait for the thing being asserted on, not for the absence of a spinner.
  // "No jobs found" is the empty block's heading and renders in BOTH branches
  // this helper is called in, so one wait covers both — and a genuine hang
  // fails here, naming the timeout, instead of falling through to an assertion
  // that reports the wrong cause.
  await page.getByText('No jobs found').waitFor({ timeout: 15000 })
  const text = await page.evaluate(() => document.body.innerText)
  const ctas = await page.getByRole('link', { name: 'Add your location' }).count()
  await ctx.close()
  return { text, ctas }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  // Set the moment the shared seeker is moved. The restore lives in `finally`
  // because everything between the move and the move-back drives a browser: one
  // timeout there and the account is stranded at sea PERMANENTLY — TD-42 means
  // the only way back is the overwrite that would never run. td02, td03 and
  // td06 all assume that account is in Bangalore and would then fail for a
  // reason none of them can explain.
  let movedSeeker = null
  try {
    // ---- 1. No coordinate at all → message AND the recovery action ----------
    const noloc = await loginOrCreateNoLocSeeker()
    const flagged = await nearby(noloc.token)
    check(
      'backend flags a coordinate-less seeker with noLocation',
      flagged.noLocation === true,
      `noLocation=${flagged.noLocation}`,
    )

    const a = await readNearbyTab(browser, noloc)
    const noLocSentence = a.text.match(/Add your city[^\n]*/)?.[0] ?? ''
    check('no coordinate → the page names the fix', !!noLocSentence, JSON.stringify(noLocSentence))
    check('no coordinate → the "Add your location" link IS offered', a.ctas === 1, `${a.ctas} link(s)`)

    // ---- 2. A coordinate, but nothing within 50 km → message, NO action -----
    // This is the case the change exists for.
    const seeker = await loginSeeker()
    const moved = await setCoords(seeker.token, { latitude: NOWHERE.lat, longitude: NOWHERE.lon })
    if (moved.success) movedSeeker = seeker
    check('moved the seeker away from every job', moved.success === true, `ok=${moved.success}`)

    const far = await nearby(seeker.token)
    // Guard the guard: if this seeker somehow still has jobs nearby, the UI
    // assertion below would pass for the wrong reason.
    check(
      'backend returns an empty list with NO noLocation flag',
      !far.noLocation && far.jobs.length === 0,
      `noLocation=${far.noLocation} jobs=${far.jobs.length}`,
    )

    const b = await readNearbyTab(browser, seeker)
    const nothingNearSentence = b.text.match(/No jobs near[^\n]*/)?.[0] ?? ''
    check(
      'has a coordinate → the page says nothing is nearby',
      !!nothingNearSentence,
      JSON.stringify(nothingNearSentence),
    )
    check(
      'has a coordinate → the "Add your location" link is NOT offered',
      b.ctas === 0,
      `${b.ctas} link(s)`,
    )
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    if (movedSeeker) {
      // Its own try/catch, because this is the restore. If the backend went
      // away mid-run, `res.json()` throws on an HTML error page — and a throw
      // out of `finally` skips `browser.close()`, hangs the process on a live
      // Chrome, and leaves the shared seeker at sea permanently, which is the
      // exact outcome this block exists to prevent.
      try {
        const restored = await setCoords(movedSeeker.token, {
          latitude: HOME.lat,
          longitude: HOME.lon,
          location: HOME.location,
        })
        const after = await nearby(movedSeeker.token)
        check(
          'seeker restored to Bangalore and finds jobs again',
          restored.success === true && after.jobs.length > 0,
          `jobs=${after.jobs.length}`,
        )
      } catch (err) {
        check('seeker restored to Bangalore', false, `RESTORE FAILED — ${err.message}`)
        console.log(
          `\n⚠️  ${process.env.SMOKE_SEEKER_PHONE || '+919876500019'} is still at ` +
            `${NOWHERE.lat},${NOWHERE.lon}. td02/td03/td06 assume Bangalore and will fail ` +
            `until it is put back. TD-42: a coordinate can only be overwritten, never cleared.`,
        )
      }
    }
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
