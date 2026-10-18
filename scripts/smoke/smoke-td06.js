// TD-06: the job feed's location filter — State → City from the backend's own
// lists, NOT a hardcoded ten-city dropdown with a radius per city.
//
// Which parameters the feed sends is the part that matters and the part you
// cannot see: a city must send `cityId` alone, a bare state `stateCode` alone,
// and neither may carry `latitude`, `longitude` or `maxDistance` (the backend
// matches a job's cities by id; a leftover radius would silently AND a second,
// wrong filter on top). These checks read the outgoing request, not the screen.
//
// It also covers a link that names a city that does not exist. That must not
// quietly become a whole-state search — it searches nothing and says so.
//
// Sections 3, 3b and 4 are the profile / display half of TD-06 and are unchanged:
// they still exercise the typed-city matching in src/lib/cities.ts.
const { chromium, LAUNCH, FE, BE, OUT, loginSeeker } = require('./lib-smoke')

// Every parameter that scopes a search by place — the feed may send at most the
// ones the case calls for.
const PLACE_KEYS = ['stateCode', 'cityId', 'latitude', 'longitude', 'maxDistance']
const GHOST_CITY = '11111111-1111-4111-8111-111111111111' // well-formed, not a city
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

// The query of every feed request (`/jobs?…`, not `/jobs/nearby` or `/jobs/:id`)
// the page makes from now on, as plain objects.
function recordFeedRequests(page) {
  const seen = []
  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('/jobs?')) seen.push(Object.fromEntries(new URL(u).searchParams))
  })
  return seen
}

// The place parameters a request carries, e.g. "stateCode=28" — for readable output.
const placeOf = (q) => PLACE_KEYS.filter((k) => k in q).map((k) => `${k}=${q[k]}`).join('&') || 'none'

// True when `q` carries exactly the place parameters in `only` and none of the rest.
const placeIs = (q, only) => PLACE_KEYS.every((k) => (only[k] === undefined ? !(k in q) : q[k] === String(only[k])))

// `lang` switches the UI language — I18nProvider reads this key on mount.
// `beforeGoto(page)` runs before the page loads, for a listener that must see the
// very first request. `settle: false` returns shortly after the page starts instead of
// waiting for the network to go idle — for a check that looks at a request in flight.
async function open(browser, seeker, path, lang, beforeGoto, settle = true) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  if (beforeGoto) beforeGoto(page)
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([t, u, l]) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
      if (l) localStorage.setItem('preferredLanguage', l)
    },
    [seeker.token, seeker.user, lang],
  )
  await page.goto(FE + path, { waitUntil: settle ? 'networkidle' : 'domcontentloaded' })
  await page.waitForTimeout(settle ? 1500 : 800)
  return { ctx, page, errors }
}

;(async () => {
  const seeker = await loginSeeker()
  const browser = await chromium.launch(LAUNCH)
  let ok = true

  // The backend's own lists — what the pickers must offer, and real ids to choose.
  const states = (await (await fetch(`${BE}/locations/states`)).json()).data
  const stateCodeOf = (name) => states.find((s) => s.name === name)?.code
  const AP = stateCodeOf('Andhra Pradesh')
  const KA = stateCodeOf('Karnataka')
  const apCities = (await (await fetch(`${BE}/locations/cities?state=${AP}`)).json()).data
  const REAL_CITY = apCities[1] // any real city of that state; [0] is left unused on purpose
  // Fail loudly if the data moved, instead of testing `stateCode=undefined`.
  if (AP === undefined || KA === undefined || !REAL_CITY) {
    throw new Error('need Andhra Pradesh, Karnataka and at least two Andhra Pradesh cities from the backend')
  }
  // Waits until a City select has real options besides its prompt. Takes the select
  // itself, so it does not depend on where it sits among the page's <select>s.
  const citiesLoaded = async (page, citySelect) =>
    page.waitForFunction((el) => el.options.length > 1, await citySelect.elementHandle())

  // --- 1. The State and City pickers -------------------------------------------
  // (Two copies are on the page — top bar and sidebar — and kept in step; `.first()`
  // is the top bar.)
  console.log('\n=== 1. the State / City pickers ===')
  {
    const { ctx, page, errors } = await open(browser, seeker, '/job-feed')
    const stateSelect = page.getByLabel('State').first()
    const citySelect = page.getByLabel('City').first()
    const optionTexts = (sel) => sel.evaluate((s) => [...s.options].map((o) => o.textContent.trim()))
    const stateOptions = (await optionTexts(stateSelect)).slice(1) // [0] is the "Select state" prompt
    ok = check('every backend state is offered', stateOptions.length === states.length, `${stateOptions.length} of ${states.length}`) && ok
    ok = check('Andhra Pradesh and Karnataka among them', stateOptions.includes('Andhra Pradesh') && stateOptions.includes('Karnataka')) && ok
    ok = check('City starts with only its prompt', (await citySelect.evaluate((s) => s.options.length)) === 1, (await optionTexts(citySelect)).join(' | ')) && ok
    await stateSelect.selectOption({ label: 'Andhra Pradesh' })
    await citiesLoaded(page, citySelect)
    const cityOptions = (await optionTexts(citySelect)).slice(1)
    ok = check('choosing a state lists that state\'s cities', cityOptions.length === apCities.length, `${cityOptions.length} of ${apCities.length}`) && ok
    // A label that still reads as its own key means the locale file is missing it
    // and i18next fell back to printing the key — silent, and easy to ship.
    const rawKeys = [...stateOptions, ...cityOptions].filter((l) => /^(location|seeker|jobFeed)[.:]/.test(l))
    ok = check('every option has a real label', rawKeys.length === 0, rawKeys.join(', ') || 'none untranslated') && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 2. What the location sends on the wire ---------------------------------
  // The feed applies a location as soon as it is chosen (no Search press needed).
  console.log('\n=== 2. the location on the wire ===')
  {
    let seen
    const { ctx, page, errors } = await open(browser, seeker, '/job-feed', undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    const stateSelect = page.getByLabel('State').first()
    const citySelect = page.getByLabel('City').first()
    // Requests made by one action: everything that arrives after `act` starts.
    const during = async (act) => {
      const from = seen.length
      await act()
      await page.waitForTimeout(1600)
      return seen.slice(from)
    }
    const allAre = (reqs, only) => reqs.length > 0 && reqs.every((q) => placeIs(q, only) && q.page === '1')

    ok = check('no location chosen → no place parameter', seen.length > 0 && seen.every((q) => placeIs(q, {})), placeOf(seen.at(-1) ?? {})) && ok

    let reqs = await during(() => stateSelect.selectOption({ label: 'Andhra Pradesh' }))
    ok = check('state only → stateCode alone, page 1', allAre(reqs, { stateCode: AP }), reqs.map(placeOf).join(' ; ') || 'no request') && ok

    await citiesLoaded(page, citySelect)
    reqs = await during(() => citySelect.selectOption(REAL_CITY.id))
    ok = check('city → cityId alone (no stateCode, no coordinates, no radius)', allAre(reqs, { cityId: REAL_CITY.id }), reqs.map(placeOf).join(' ; ') || 'no request') && ok

    reqs = await during(() => stateSelect.selectOption({ label: 'Karnataka' }))
    ok = check('another state drops the city → stateCode alone', allAre(reqs, { stateCode: KA }), reqs.map(placeOf).join(' ; ') || 'no request') && ok

    reqs = await during(() => stateSelect.selectOption(''))
    ok = check('"Select state" clears → no place parameter', reqs.length > 0 && reqs.every((q) => placeIs(q, {})), reqs.map(placeOf).join(' ; ') || 'no request') && ok

    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td06-feed.png`, fullPage: true })
    await ctx.close()
  }

  // --- 2b. A link naming a city that does not exist ---------------------------
  // A well-formed id the backend has never heard of. It used to be sent (a 400),
  // and then the picker dropped the unknown city and the feed quietly searched the
  // whole state — an answer to a question nobody asked. Now it searches nothing,
  // says so, and waits for the seeker to choose.
  console.log('\n=== 2b. a link with an unknown city ===')
  {
    let seen
    const { ctx, page, errors } = await open(browser, seeker, `/job-feed?stateCode=${AP}&cityId=${GHOST_CITY}`, undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    const notice = page.getByRole('alert').filter({ hasText: /couldn.t find the city/i })
    ok = check('no search is sent at all', seen.length === 0, seen.map(placeOf).join(' ; ') || 'none') && ok
    ok = check('the page says the city was not found', (await notice.count()) === 1) && ok
    const stateSelect = page.getByLabel('State').first()
    const citySelect = page.getByLabel('City').first()
    ok = check('the pickers still show the state, with no city', (await stateSelect.inputValue()) === String(AP) && (await citySelect.inputValue()) === '') && ok

    // Choosing a real city is the way forward.
    const from = seen.length
    await citySelect.selectOption(REAL_CITY.id)
    await page.waitForTimeout(1600)
    const after = seen.slice(from)
    ok = check('choosing a real city searches it (cityId alone)', after.length > 0 && after.every((q) => placeIs(q, { cityId: REAL_CITY.id })), after.map(placeOf).join(' ; ') || 'no request') && ok
    ok = check('...and the notice goes away', (await notice.count()) === 0) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // A real city in a link is searched as asked; the seeker clearing it is THEIR
  // choice of a state-wide search, not the unknown-city case.
  console.log('\n=== 2c. a link with a real city ===')
  {
    let seen
    const { ctx, page, errors } = await open(browser, seeker, `/job-feed?stateCode=${AP}&cityId=${REAL_CITY.id}`, undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    const notice = page.getByRole('alert').filter({ hasText: /couldn.t find the city/i })
    ok = check('searched by cityId alone, from the first request', seen.length > 0 && seen.every((q) => placeIs(q, { cityId: REAL_CITY.id })), seen.map(placeOf).join(' ; ') || 'no request') && ok
    ok = check('no "not found" notice', (await notice.count()) === 0) && ok
    const citySelect = page.getByLabel('City').first()
    const from = seen.length
    await citySelect.selectOption('')
    await page.waitForTimeout(1600)
    const after = seen.slice(from)
    ok = check('clearing the city by hand → stateCode alone, still no notice', after.length > 0 && after.every((q) => placeIs(q, { stateCode: AP })) && (await notice.count()) === 0, after.map(placeOf).join(' ; ') || 'no request') && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 2d. The city list fails to load, then recovers -------------------------
  // The feed cannot check a link's city while the list is down, so it sends the id
  // and lets the backend judge. When the list then comes back (Try again on the
  // picker) and does NOT contain the city, the picker drops it — and that must not
  // turn into a whole-state search. The first /locations/cities request is aborted;
  // the retry goes through. (The aborted request logs a console error: expected.)
  console.log('\n=== 2d. the city list fails once, then the seeker retries ===')
  for (const [label, cityId, isReal] of [['unknown', GHOST_CITY, false], ['real', REAL_CITY.id, true]]) {
    let seen
    const { ctx, page } = await open(browser, seeker, `/job-feed?stateCode=${AP}&cityId=${cityId}`, undefined, (p) => {
      seen = recordFeedRequests(p)
      let aborted = false
      p.route('**/locations/cities**', (route) => {
        if (aborted) return route.continue()
        aborted = true
        return route.abort()
      })
    })
    const notice = page.getByRole('alert').filter({ hasText: /couldn.t find the city/i })
    ok = check(`${label} city: the picker reports the failed list`, (await page.getByText(/could not load the list/i).count()) > 0) && ok
    const from = seen.length
    await page.getByRole('button', { name: /try again/i }).first().click()
    await page.waitForTimeout(2000)
    ok = check(`${label} city: nothing but the linked city is ever searched (no stateCode alone)`, seen.length > 0 && seen.every((q) => placeIs(q, { cityId })), seen.map(placeOf).join(' ; ') || 'no request') && ok
    ok = check(`${label} city: the retry itself sends no state-wide search`, seen.slice(from).every((q) => !('stateCode' in q)), seen.slice(from).map(placeOf).join(' ; ') || 'no request') && ok
    ok = check(isReal ? 'real city: no "not found" notice' : 'unknown city: the "not found" notice appears', (await notice.count()) === (isReal ? 0 : 1)) && ok
    await ctx.close()
  }

  // --- 2e. The state in a link is checked against the backend's list ------------
  // A state code that is well-formed but not a state (0, 99) used to be searched
  // anyway: an empty feed under a blank State select. Now it is treated like an
  // unknown city — nothing searched, a notice, pickers left blank. Malformed codes
  // never reach the page's state and just give the unfiltered feed. A real state
  // keeps working, with the picker showing it.
  console.log('\n=== 2e. a link with a state that does not exist ===')
  for (const code of ['99', '0']) {
    let seen
    const { ctx, page } = await open(browser, seeker, `/job-feed?stateCode=${code}`, undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    const notice = page.getByRole('alert').filter({ hasText: /couldn.t find the state/i })
    const stateSelect = page.getByLabel('State').first()
    ok = check(`stateCode=${code}: no search is sent`, seen.length === 0, seen.map(placeOf).join(' ; ') || 'none') && ok
    ok = check(`stateCode=${code}: the page says the state was not found`, (await notice.count()) === 1) && ok
    ok = check(`stateCode=${code}: both pickers are blank and agree`, (await stateSelect.inputValue()) === '' && (await page.getByLabel('State').nth(1).inputValue()) === '') && ok
    const from = seen.length
    await stateSelect.selectOption({ label: 'Karnataka' })
    await page.waitForTimeout(1600)
    const after = seen.slice(from)
    ok = check(`stateCode=${code}: choosing a real state then searches it`, after.length > 0 && after.every((q) => placeIs(q, { stateCode: KA })) && (await notice.count()) === 0, after.map(placeOf).join(' ; ') || 'no request') && ok
    await ctx.close()
  }
  for (const [qs, label] of [['?stateCode=abc', 'non-numeric'], ['?stateCode=1234', 'four digits']]) {
    let seen
    const { ctx, page } = await open(browser, seeker, `/job-feed${qs}`, undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    // (Next.js's own route announcer is a role="alert" too, so match our notice by text.)
    const anyNotice = page.getByRole('alert').filter({ hasText: /couldn.t find the (state|city)/i })
    ok = check(`${label} state code: unfiltered feed, blank pickers, no notice`, seen.length > 0 && seen.every((q) => placeIs(q, {})) && (await page.getByLabel('State').first().inputValue()) === '' && (await anyNotice.count()) === 0, seen.map(placeOf).join(' ; ') || 'no request') && ok
    await ctx.close()
  }
  {
    let seen
    const { ctx, page } = await open(browser, seeker, `/job-feed?stateCode=${AP}`, undefined, (p) => {
      seen = recordFeedRequests(p)
    })
    ok = check('a real state link: searched by stateCode alone', seen.length > 0 && seen.every((q) => placeIs(q, { stateCode: AP })), seen.map(placeOf).join(' ; ') || 'no request') && ok
    ok = check('...and both pickers show that state', (await page.getByLabel('State').first().inputValue()) === String(AP) && (await page.getByLabel('State').nth(1).inputValue()) === String(AP)) && ok
    await ctx.close()
  }

  // --- 2f. A linked city is labelled while its list loads ----------------------
  // The link carries only the city's id, so the City select used to show a blank
  // entry until the list arrived. The list is held back here to look at that gap.
  console.log('\n=== 2f. the linked city while its list loads ===')
  {
    const { ctx, page } = await open(browser, seeker, `/job-feed?stateCode=${AP}&cityId=${REAL_CITY.id}`, undefined, (p) => {
      p.route('**/locations/cities**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000))
        return route.continue()
      })
    }, false)
    // The pickers show the linked state only once the State list has confirmed it;
    // the City list is held for 4 s, so look as soon as the state is showing.
    const stateSelect = page.getByLabel('State').first()
    for (let i = 0; i < 20 && (await stateSelect.inputValue()) !== String(AP); i++) await page.waitForTimeout(250)
    const citySelect = page.getByLabel('City').first()
    const shown = await citySelect.evaluate((s) => ({ text: s.selectedOptions[0]?.textContent.trim(), disabled: s.disabled }))
    ok = check('while loading: labelled "Loading…", not blank', shown.text === 'Loading…', JSON.stringify(shown)) && ok
    ok = check('while loading: the select is disabled', shown.disabled === true) && ok
    await page.waitForTimeout(4500)
    const done = await citySelect.evaluate((s) => ({ text: s.selectedOptions[0]?.textContent.trim(), value: s.value }))
    ok = check('after loading: shows the real city name', done.text === REAL_CITY.name && done.value === REAL_CITY.id, JSON.stringify(done)) && ok
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
    // Guard on a job whose location is EXACTLY a city name, matching the feed's
    // own page size. Two ways to get this wrong, both of which produce a failure
    // that is not a defect: query more jobs than the feed renders, or key on the
    // word "Hyderabad" appearing at all — a job stored "Hyderabad, Telangana" is
    // correctly left untranslated, because localizeLocation swaps whole strings
    // only and must not delete "Telangana".
    const page1 = await (await fetch(`${BE}/jobs?page=1&limit=10`)).json()
    const translatable = (page1?.data?.jobs ?? []).some(
      (j) => String(j.location ?? '').trim().toLowerCase() === 'hyderabad',
    )
    if (!translatable) {
      console.log('  ⚠️  SKIPPED — no job on page 1 whose location is exactly a city name')
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
