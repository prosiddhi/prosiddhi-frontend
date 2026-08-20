// TD-06: ten cities in the dropdown, and each one sends its OWN radius.
//
// The radius is the part that actually matters and the part you cannot see.
// The backend's maxDistance defaults to 5 km, so a centroid sent without one
// shows a Bengaluru seeker only what is within 5 km of the city centre — the
// filter looks broken while being perfectly implemented. These checks read the
// outgoing request, not the screen.
const { chromium, LAUNCH, FE, BE, OUT, loginSeeker } = require('./lib-smoke')

// Must match CITY_COORDS in src/lib/cities.ts.
const EXPECTED = {
  ahmedabad: 20,
  bangalore: 30,
  chennai: 30,
  delhi: 50,
  hyderabad: 30,
  jaipur: 20,
  kolkata: 25,
  mumbai: 30,
  pune: 25,
  surat: 20,
}
const CHENNAI = { lat: 13.0827, lon: 80.2707 }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 0.002

function check(label, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return ok
}

async function profile(token) {
  const res = await fetch(`${BE}/jobseekers/profile`, { headers: { Authorization: `Bearer ${token}` } })
  const js = (await res.json())?.data?.jobSeeker
  if (!js) throw new Error('could not read profile')
  return { lat: js.latitude, lon: js.longitude }
}

// `lang` switches the UI language — I18nProvider reads this key on mount.
async function open(browser, seeker, path, lang) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([t, u, l]) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
      if (l) localStorage.setItem('preferredLanguage', l)
    },
    [seeker.token, seeker.user, lang],
  )
  await page.goto(FE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return { ctx, page, errors }
}

;(async () => {
  const seeker = await loginSeeker()
  const browser = await chromium.launch(LAUNCH)
  let ok = true

  // --- 1. The dropdown offers all ten, translated -----------------------------
  console.log('\n=== 1. the city dropdown ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/job-feed')
    const values = await page.$$eval('select option', (os) => os.map((o) => o.value).filter(Boolean))
    const labels = await page.$$eval('select option', (os) => os.map((o) => o.textContent.trim()).filter(Boolean))
    const wanted = Object.keys(EXPECTED)
    const cityValues = values.filter((v) => wanted.includes(v))
    ok = check('ten cities offered', cityValues.length === 10, cityValues.join(', ')) && ok
    // A label that still reads as its own key means the locale file is missing it
    // and i18next fell back to printing the key — silent, and easy to ship.
    const rawKeys = labels.filter((l) => l.startsWith('seeker:') || l.startsWith('jobFeed.'))
    ok = check('every city has a real label', rawKeys.length === 0, rawKeys.join(', ') || 'none untranslated') && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 2. Each city sends its OWN radius --------------------------------------
  // Delhi 50 vs Surat 20 is the whole ticket: one flat number either strands
  // people on the edge of a big city or drags a small city's results in from
  // two towns over.
  console.log('\n=== 2. the radius on the wire ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/job-feed')
    for (const [city, expected] of Object.entries(EXPECTED)) {
      const seen = []
      const listen = (req) => {
        const u = req.url()
        if (u.includes('/jobs?')) seen.push(new URL(u).searchParams.get('maxDistance'))
      }
      await page.selectOption('select', city)
      // The feed keeps draft filters separate from applied ones on purpose
      // (page.tsx:79), so choosing a city commits nothing until Search is
      // pressed. Listening only from here keeps the previous city's request
      // out of the sample.
      page.on('request', listen)
      await page.getByRole('button', { name: 'Search Jobs' }).click()
      await page.waitForTimeout(1600)
      page.off('request', listen)
      const sent = seen.filter(Boolean).pop()
      ok = check(`${city.padEnd(10)} radius`, Number(sent) === expected, `sent ${sent}, expected ${expected}`) && ok
    }
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td06-feed.png`, fullPage: true })
    await ctx.close()
  }

  // --- 3. A new city works in the profile's coarse tier too -------------------
  // TD-02 matches typed text against this same list, so widening it must widen
  // that too — otherwise the dropdown and the profile disagree about Chennai.
  console.log('\n=== 3. a new city in the profile (TD-02 path) ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/profile')
    await page.getByPlaceholder('City / area').fill('Chennai')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.waitForTimeout(2500)
    const p = await profile(seeker.token)
    ok = check('Chennai centroid stored', near(p.lat, CHENNAI.lat) && near(p.lon, CHENNAI.lon), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 3b. A job's city is DISPLAYED in the reader's script ------------------
  // Storage is canonical English so the cold-start recommendation has one
  // spelling to match. Display must not be — this product ships ten languages
  // for people who may not read Latin at all, and job.location is printed
  // straight onto every card.
  console.log('\n=== 3b. job cards show the city in the reader\'s script ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/job-feed', 'kn')
    await page.waitForTimeout(2500)
    const body = await page.evaluate(() => document.body.innerText)
    // Guard on what is ON THE PAGE, not on a database query. Querying 50 jobs
    // while the feed renders 10 can assert against a page that legitimately has
    // no Hyderabad job on it, and report a failure that is really a paging
    // accident.
    if (!body.includes('Hyderabad') && !body.includes('ಹೈದರಾಬಾದ್')) {
      console.log('  ⚠️  SKIPPED — no Hyderabad job on this page of the feed to translate')
    } else {
      ok = check('Kannada label shown, not the stored English', body.includes('ಹೈದರಾಬಾದ್'), body.includes('Hyderabad') ? 'still showing "Hyderabad"' : 'ಹೈದರಾಬಾದ್ found') && ok
    }
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 4. The city is the LAST word, not the first ---------------------------
  // "Delhi Gate" is a real place in Ahmedabad. Scanning left to right put this
  // seeker in Delhi, 900 km away — and because that is far past Ahmedabad's
  // radius it also reads as a move, so the next save would overwrite a real
  // coordinate with the wrong one.
  console.log('\n=== 4. a street named after another city ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/profile')
    await page.getByPlaceholder('City / area').fill('Delhi Gate, Ahmedabad')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.waitForTimeout(2500)
    const p = await profile(seeker.token)
    ok = check('resolved to Ahmedabad, not Delhi', near(p.lat, 23.0225) && near(p.lon, 72.5714), `lat=${p.lat} lon=${p.lon}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  await browser.close()
  console.log(`\nTD-06 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
