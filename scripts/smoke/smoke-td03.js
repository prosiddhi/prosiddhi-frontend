// TD-03: does a posted job carry coordinates, and does that finally make the
// seeker's Near By feed return something?
//
// This is the payoff check for the whole location workstream. TD-02 gave the
// seeker a coordinate and TD-06 gave the cities a radius, but until a JOB has
// coordinates every one of those returns nothing: getNearbyForSeeker drops any
// job with a null latitude before the distance maths runs. So the assertion
// that matters is the last one — a seeker in the same city sees the job.
const { chromium, LAUNCH, FE, OUT, authed, loginSeeker, loginEmployer } = require('./lib-smoke')

const BLR = { lat: 12.9716, lon: 77.5946 }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 0.002

function check(label, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return ok
}

// `authed` moved to lib-smoke.js — TD-04's suite needed the same wrapper.

async function session(browser, who, geo) {
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
    ([t, u]) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
    },
    [who.token, who.user],
  )
  return { ctx, page, errors }
}

;(async () => {
  const employer = await loginEmployer()
  const browser = await chromium.launch(LAUNCH)
  let ok = true
  // Unique per run. A fixed title would let step 1 "find" a job left behind by
  // an earlier run and report a pass without having posted anything.
  const title = `Smoke Warehouse Packer ${Date.now()}`

  // --- 1. Post a job through the real form ----------------------------------
  console.log('\n=== 1. post a job with a recognised city ===')
  let jobId = null
  {
    const { ctx, page, errors } = await session(browser, employer)
    await page.goto(FE + '/employer/jobs/new', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await page.getByPlaceholder('e.g. Cook needed for family kitchen, Bandra').fill(title)
    // TaxonomyPicker renders three cascading selects; pick the first real option
    // of each in order, waiting between because each one loads the next.
    const selects = page.locator('select')
    for (let i = 0; i < 3; i++) {
      const values = await selects.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
      if (!values.length) break
      await selects.nth(i).selectOption(values[0])
      await page.waitForTimeout(900)
    }
    await page.locator('textarea').first().fill(
      'We need a reliable warehouse packer for day shifts. Duties include picking, packing and loading orders safely and on time.',
    )
    await page.locator('#job-location').fill('Bengaluru, Karnataka')
    // jobType is a select that is not part of the taxonomy trio.
    const allSelects = await page.locator('select').count()
    for (let i = 3; i < allSelects; i++) {
      const vals = await page.locator('select').nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
      if (vals.includes('FULL_TIME')) {
        await page.locator('select').nth(i).selectOption('FULL_TIME')
        break
      }
    }

    await page.screenshot({ path: `${OUT}/td03-1-form.png`, fullPage: true })
    // Submit is the primary button at the foot of the form.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.className.includes('bg-primary-50') && !x.disabled && x.offsetParent !== null,
      )
      if (b) b.click()
    })
    await page.waitForTimeout(4000)

    const mine = await authed('/jobs/employer/me/jobs?limit=20', employer.token)
    const jobs = mine?.data?.jobs ?? mine?.data ?? []
    const posted = Array.isArray(jobs) ? jobs.find((j) => j.title === title) : null
    ok = check('job was created', !!posted, posted ? posted.id : `none matched "${title}"`) && ok
    if (posted) {
      jobId = posted.id
      ok = check('job carries the city centroid', near(posted.latitude, BLR.lat) && near(posted.longitude, BLR.lon), `lat=${posted.latitude} lon=${posted.longitude}`) && ok
      // The BE stores Job.radius and never reads it. TD-03 sends nothing, so it
      // must be the schema default of 5 — never a city radius (Bangalore is 30).
      ok = check('no city radius leaked into the job', posted.radius == null || posted.radius === 5, `radius=${posted.radius}`) && ok
    }
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  }

  // --- 2. THE PAYOFF: a seeker in that city now sees it ----------------------
  // Every earlier ticket in this workstream ended with "still returns nothing".
  // This is the assertion that is supposed to change.
  console.log('\n=== 2. the seeker Near By feed ===')
  {
    const seeker = await loginSeeker()
    await authed('/jobseekers/profile', seeker.token, {
      method: 'PUT',
      body: JSON.stringify({ latitude: BLR.lat, longitude: BLR.lon, location: 'Bengaluru' }),
    })
    const n = await authed('/jobs/nearby?radius=50&page=1&limit=20', seeker.token)
    const found = (n?.data?.jobs ?? []).find((j) => j.title === title)
    ok = check('Near By returns the posted job', !!found, `${n?.data?.jobs?.length ?? 0} job(s) nearby`) && ok
    if (found) console.log(`    -> ${found.title} @ ${Math.round(found.distance)} km`)

    // The city filter is the other half of DEF-035 — same coordinates, the
    // dropdown path rather than the GPS one.
    const feed = await authed(`/jobs?latitude=${BLR.lat}&longitude=${BLR.lon}&maxDistance=30&limit=20`, seeker.token)
    const inFeed = (feed?.data?.jobs ?? []).find((j) => j.title === title)
    ok = check('city filter returns the posted job', !!inFeed, `${feed?.data?.jobs?.length ?? 0} job(s) in radius`) && ok
  }

  // --- 3. Editing an unrelated field must not move the pin ------------------
  // The employer half of the guard TD-02 built. JobForm hydrates saved
  // coordinates from `initial`, so a title edit must leave them alone.
  console.log('\n=== 3. editing the title leaves the pin alone ===')
  if (jobId) {
    const { ctx, page, errors } = await session(browser, employer)
    await page.goto(`${FE}/employer/jobs/${jobId}/edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.getByPlaceholder('e.g. Cook needed for family kitchen, Bandra').fill(`${title} (edited)`)
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.className.includes('bg-primary-50') && !x.disabled && x.offsetParent !== null,
      )
      if (b) b.click()
    })
    await page.waitForTimeout(4000)
    const after = await authed(`/jobs/${jobId}`, employer.token)
    const j = after?.data?.job ?? after?.data
    // Assert the edit LANDED first. Without this the check below is negative-only:
    // a submit that silently failed leaves the coordinates untouched and reports
    // a pass for a guard it never exercised.
    ok = check('the title edit actually saved', j?.title === `${title} (edited)`, JSON.stringify(j?.title)) && ok
    ok = check('coordinates unchanged by a title edit', near(j?.latitude, BLR.lat) && near(j?.longitude, BLR.lon), `lat=${j?.latitude} lon=${j?.longitude}`) && ok
    // The edit path is where a future updateJob change would leak a city radius
    // into a job. Assert it here as well as on create.
    ok = check('still no radius on the job', j?.radius == null || j?.radius === 5, `radius=${j?.radius}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  } else {
    console.log('  SKIPPED — no job id from step 1')
    ok = false
  }

  // --- 4. The employer's precise tier -----------------------------------------
  // Steps 1-3 only ever exercise the coarse tier, so the GPS branch of TD-03 was
  // shipping unverified. A coordinate is invisible in the UI, so nothing else
  // would have caught it.
  console.log('\n=== 4. "Use my current location" on the job form ===')
  if (jobId) {
    const FIX = { lat: 12.95, lon: 77.6 }
    const { ctx, page, errors } = await session(browser, employer, FIX)
    await page.goto(`${FE}/employer/jobs/${jobId}/edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'Use my current location' }).click()
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.className.includes('bg-primary-50') && !x.disabled && x.offsetParent !== null,
      )
      if (b) b.click()
    })
    await page.waitForTimeout(4000)
    const after = await authed(`/jobs/${jobId}`, employer.token)
    const j = after?.data?.job ?? after?.data
    ok = check('precise fix replaced the centroid', near(j?.latitude, FIX.lat) && near(j?.longitude, FIX.lon), `lat=${j?.latitude} lon=${j?.longitude}`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await ctx.close()
  } else {
    console.log('  SKIPPED — no job id from step 1')
    ok = false
  }

  await browser.close()

  // --- Clean up ---------------------------------------------------------------
  // This script posts a REAL job, which spends a real post credit. Left behind,
  // repeated runs drain the demo employer's wallet; at zero the form renders the
  // upsell instead and step 1 fails as though TD-03 had regressed.
  if (jobId) {
    const del = await authed(`/jobs/${jobId}`, employer.token, { method: 'DELETE' })
    console.log(`\ncleanup: job ${jobId.slice(0, 8)} ${del?.success ? 'deleted' : 'NOT deleted — ' + JSON.stringify(del).slice(0, 120)}`)
  }

  console.log(`\nTD-03 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
