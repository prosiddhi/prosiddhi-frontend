// TD-02: does the seeker profile actually WRITE a coordinate, and does that
// switch the Near By feed back on?
//
// The bug this guards is not "the button is missing" — it is that every write
// endpoint accepted latitude/longitude for months and this client never sent
// them, so every seeker carried a null coordinate and Near By returned nothing
// for everybody. That failure is invisible in the UI: the form saves happily.
// Only the stored record proves it, so every check here reads the record back
// over the API rather than trusting the green "Saved" tick.
const { chromium, LAUNCH, FE, BE, OUT, loginSeeker } = require('./lib-smoke')

// Bangalore's centroid, from src/lib/cities.ts. The coarse tier must produce
// exactly this from typed text.
const BLR = { lat: 12.9716, lon: 77.5946 }
// A precise fix somewhere else in the same city. Deliberately NOT the centroid,
// so "the centroid overwrote my GPS fix" is visible when it happens.
const FIX = { lat: 12.95, lon: 77.6 }

async function profile(token) {
  const res = await fetch(`${BE}/jobseekers/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const j = await res.json()
  const js = j?.data?.jobSeeker
  if (!js) throw new Error('could not read profile: ' + JSON.stringify(j))
  return { lat: js.latitude, lon: js.longitude, location: js.location }
}

async function nearby(token) {
  // radius=50 and page=1 both matter, and both must match what the portal sends
  // (src/lib/api.ts getNearbyJobs). Omitting radius gets the backend's zod
  // default of 5 km — a radius the app never uses. Omitting page is worse: the
  // service computes skip = (page - 1) * limit, which on a null page is -10, and
  // slice(-10, 0) returns nothing while `pagination.total` still reports the
  // real count. See the backend note in docs/teardown-fix-list.md.
  const res = await fetch(`${BE}/jobs/nearby?radius=50&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const j = await res.json()
  return { jobs: j?.data?.jobs ?? [], noLocation: j?.data?.noLocation === true }
}

// Coordinates round-trip through JSON and a 3-decimal rounding step, so compare
// with a tolerance rather than ===.
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 0.002

function check(label, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return ok
}

// A logged-in page. `geo` grants the location permission and pins the device to
// a fixed fake position; omit it to test a seeker who never grants permission.
// `lang` switches the UI language (I18nProvider reads this key on mount).
async function open(browser, seeker, geo, lang) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 840 },
    ...(geo ? { permissions: ['geolocation'], geolocation: { latitude: geo.lat, longitude: geo.lon } } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`))
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([t, u, l]) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
      if (l) localStorage.setItem('preferredLanguage', l)
    },
    [seeker.token, seeker.user, lang],
  )
  await page.goto(FE + '/profile', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return { ctx, page, errors }
}

async function save(page) {
  await page.getByRole('button', { name: 'Save Changes' }).click()
  // The page re-fetches the profile after PUT; wait for the write, not the tick.
  await page.waitForTimeout(2500)
}

;(async () => {
  const seeker = await loginSeeker()
  const before = await profile(seeker.token)
  console.log(`seeker starts at: location=${JSON.stringify(before.location)} lat=${before.lat} lon=${before.lon}`)

  const browser = await chromium.launch(LAUNCH)
  let ok = true

  // --- 1. Coarse tier: typed city text alone must produce a centroid ---------
  // This is the path most seekers take. It needs no permission prompt, which is
  // the whole reason the design does not lean on GPS.
  console.log('\n=== 1. typed city -> centroid (no location permission) ===')
  {
    const { ctx, page, errors } = await open(browser, seeker)
    // No comma. Most people do not punctuate, and matching only comma-separated
    // segments missed every one of them.
    const input = page.getByPlaceholder('City / area')
    await input.fill('Whitefield Bangalore')
    await save(page)
    const p = await profile(seeker.token)
    ok = check('city text stored', p.location === 'Whitefield Bangalore', JSON.stringify(p.location)) && ok
    ok = check('centroid written', near(p.lat, BLR.lat) && near(p.lon, BLR.lon), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td02-1-city.png`, fullPage: true })
    await ctx.close()
  }

  // --- 2. Precise tier: the button must beat the centroid -------------------
  console.log('\n=== 2. "Use my current location" -> precise fix ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, FIX)
    await page.getByRole('button', { name: 'Use my current location' }).click()
    await page.waitForTimeout(1500)
    // Typing AFTER taking a fix must not throw it away. Naming your area once
    // the button has found you is the ordinary way to use this pair of controls,
    // and clearing the fix on every keystroke silently saved no coordinate.
    await page.getByPlaceholder('City / area').fill('Nagpur')
    await save(page)
    const p = await profile(seeker.token)
    ok = check('precise fix written', near(p.lat, FIX.lat) && near(p.lon, FIX.lon), `lat=${p.lat} lon=${p.lon}`) && ok
    ok = check('fix beat the centroid', !near(p.lat, BLR.lat), `centroid is ${BLR.lat}`) && ok
    ok = check('typing after the fix did not discard it', p.lat != null, `location=${JSON.stringify(p.location)}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td02-2-gps.png`, fullPage: true })
    await ctx.close()
  }

  // --- 3. The guard: an unrelated edit must not flatten the precise fix ------
  // The city text still says "Bengaluru, Karnataka", so a naive implementation
  // re-derives the centroid on every save and quietly destroys the GPS fix set
  // in step 2. Editing only the bio is the cheapest way to catch that.
  console.log('\n=== 3. editing only the bio keeps the precise fix ===')
  {
    const { ctx, page, errors } = await open(browser, seeker)
    await page.getByPlaceholder('A short introduction (up to 500 letters)').fill(`smoke ${Date.now()}`)
    await save(page)
    const p = await profile(seeker.token)
    ok = check('fix survived an unrelated save', near(p.lat, FIX.lat) && near(p.lon, FIX.lon), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 3b. Naming your city for the first time must not flatten a fix --------
  // A seeker can hold a precise coordinate with a BLANK city box — pressing the
  // button is enough. Deciding "has the seeker moved?" by comparing the location
  // text then reads blank → "Bangalore" as a move, and replaces their street
  // with the city centre. Distance is what actually answers that question.
  console.log('\n=== 3b. filling a blank city box keeps the precise fix ===')
  {
    const { ctx, page, errors } = await open(browser, seeker)
    const input = page.getByPlaceholder('City / area')
    await input.fill('')
    await save(page)
    await input.fill('Bangalore')
    await save(page)
    const p = await profile(seeker.token)
    ok = check('fix survived first-time city entry', near(p.lat, FIX.lat) && near(p.lon, FIX.lon), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 3c. A real move DOES move the coordinate -----------------------------
  // The mirror of 3b: the guard must not become a lock. Bangalore → Mumbai is
  // ~840 km, far past the threshold, so the centroid should win.
  console.log('\n=== 3c. moving city updates the coordinate ===')
  {
    const { ctx, page, errors } = await open(browser, seeker)
    await page.getByPlaceholder('City / area').fill('Mumbai')
    await save(page)
    const p = await profile(seeker.token)
    ok = check('moved to Mumbai centroid', near(p.lat, 19.076) && near(p.lon, 72.8777), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 4. The city typed in the seeker's OWN script -------------------------
  // The job feed shows city names translated — a Kannada seeker is shown
  // "ಬೆಂಗಳೂರು", so that is what they will type. Matching English spellings only
  // would leave the coarse tier dead in 8 of our 10 languages, which is most of
  // the audience this whole feature exists for.
  console.log('\n=== 4. Kannada UI, city typed in Kannada ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, null, 'kn')
    // Kannada strings, straight from src/locales/kn — if the UI did not switch
    // language these selectors miss and the step fails loudly, which is right:
    // a silent fall back to English would test nothing.
    // The datalist is what keeps the backend's cold-start match alive: it runs
    // `job.location CONTAINS seeker.location`, jobs store canonical English, so
    // a seeker who saves their city in their own script matches NOTHING and gets
    // an empty recommendation list. Reader sees Kannada, field stores English.
    const opts = await page.$$eval('#seeker-location-cities option', (os) =>
      os.map((o) => ({ value: o.value, label: o.label })),
    )
    const blr = opts.find((o) => o.value === 'Bangalore')
    ok = check('city list offers English values', opts.length === 10, `${opts.length} option(s)`) && ok
    ok = check('…under the reader\'s own label', blr?.label === 'ಬೆಂಗಳೂರು', JSON.stringify(blr)) && ok

    await page.getByPlaceholder('ಊರು / ಪ್ರದೇಶ').fill('ಬೆಂಗಳೂರು')
    await page.getByRole('button', { name: 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ' }).click()
    await page.waitForTimeout(2500)
    const p = await profile(seeker.token)
    ok = check('Kannada city name matched', near(p.lat, BLR.lat) && near(p.lon, BLR.lon), `location=${JSON.stringify(p.location)} lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td02-4-kannada.png`, fullPage: true })
    await ctx.close()
  }

  // --- 5. The point of all of it: Near By stops returning nothing ------------
  console.log('\n=== 5. the Near By feed ===')
  {
    const n = await nearby(seeker.token)
    ok = check('noLocation flag is gone', !n.noLocation) && ok
    // Loud about the empty case, per README: 0 jobs with a good coordinate is a
    // real result (there may be no job near this seeker) but it is NOT a pass,
    // and it must never be reported as one.
    console.log(`  jobs returned: ${n.jobs.length}`)
    if (n.jobs.length === 0) {
      console.log('  ⚠️  ZERO JOBS — the coordinate is set, so this is either genuinely')
      console.log('      no nearby job or TD-03 (no job has coordinates yet). Not a pass.')
    } else {
      console.log(`  nearest: ${n.jobs[0].title} @ ${n.jobs[0].location}`)
    }
  }

  await browser.close()
  console.log(`\nTD-02 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
