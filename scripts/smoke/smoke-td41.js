// TD-41 — the job form must SAY what it did with the location.
//
// A coordinate has no visible representation. Before this, pressing "Use my
// current location" just stopped the spinner, and typing a town we cannot place
// gave no hint that the job would be missing from every seeker's Nearby list.
// The seeker profile has had three explicit states since TD-02; this is the
// employer half.
//
// Four states, and the last one is the one worth having:
//
//   captured  a fix was taken this edit, NOT yet saved
//   city      the text matched one of the ten — seekers there will see it
//   unknown   text we cannot place, nothing stored → invisible in Nearby
//   pinned    text we cannot place, but a pin IS stored → the job keeps showing
//             in the OLD city. That is TD-42 (the backend fields are .optional()
//             and not .nullable(), so no client can clear a coordinate) and it
//             is completely silent today.
//
// This drives the real form in a real browser and reads the line the employer
// would read.
//
// ⚠️ The last case needs a job that ALREADY holds a coordinate, so it creates
// one over the API. That spends a POST credit (`job.service.ts` debits it inside
// the create transaction) and the delete at the end refunds it — `refundPostCredit`
// applies under 24 h with no applications, which holds here. Net zero WHEN
// CLEANUP SUCCEEDS. If the run dies before that, the credit is gone and the job
// is left behind; the cleanup block says so loudly.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, authed, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

// The hint sits directly under the location input. Matched as ITS SIBLING rather
// than by a page-wide `[role="status"]`: ProtectedRoute carries that role too,
// and although the two never co-render, a selector that is correct by accident
// stops being correct without warning.
const HINT = '#job-location ~ [role="status"]'

async function open(browser, employer, path, geo) {
  // `errors` is the reason this uses the shared session() rather than building
  // its own context: console errors, pageerrors and any HTTP >= 400. Collecting
  // them and then dropping them on the floor is the same as not collecting them
  // — this suite reads one line of text, and would read it just as happily
  // while a 500 fired behind it.
  const { ctx, page, errors } = await session(browser, employer, { width: 1280, height: 900 }, geo)
  // Twice — the dev server compiles a route on first hit, and the README records
  // this exact route sitting at "Compiling…" past 90 seconds.
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1200)
  return { ctx, page, errors }
}

// Called before every ctx.close(). A failed API call under a hint claiming all
// is well is exactly what this suite would otherwise miss.
//
// The `/assets/language-fallback.png` 404 that used to be filtered here is gone:
// it was referenced by LanguageSection (replaced in TD-29) and by LanguageModal,
// which turned out to be dead code and was deleted in TD-46. Nothing is
// whitelisted now — if this prints, look at it.
function reportErrors(errors) {
  if (errors.length) console.log(`  ⚠️  page errors: ${errors.join(' | ')}`)
}

const settle = (page) => page.waitForTimeout(900)

const hintText = async (page) =>
  (await page.locator(HINT).count()) ? (await page.locator(HINT).first().innerText()).trim() : ''

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let createdJobId = null
  let employer = null
  try {
    employer = await loginEmployer()

    // ---- The post-a-job form: three of the four states --------------------
    {
      const { ctx, page, errors } = await open(browser, employer, '/employer/jobs/new')
      const box = page.locator('#job-location')

      const initial = await hintText(page)
      check('an empty box says nothing', initial === '', JSON.stringify(initial))

      await box.fill('Bengaluru, Karnataka')
      await settle(page)
      const city = await hintText(page)
      // "Bengaluru" is an alias for the Bangalore key, so this also proves the
      // hint runs the app's real matcher rather than an exact-name compare.
      check('a recognised city is named back', /Bangalore/i.test(city), JSON.stringify(city))

      await box.fill('Nagpur')
      await settle(page)
      const unknown = await hintText(page)
      check(
        'an unplaceable town warns that Nearby will miss it',
        unknown !== '' && !/Nagpur will see/i.test(unknown) && /Nearby|nearby/.test(unknown),
        JSON.stringify(unknown),
      )
      check('…and that warning is NOT the reassuring one', unknown !== city)

      reportErrors(errors)
      await ctx.close()
    }

    // ---- "Use my current location" must say something ----------------------
    {
      // Inside Bangalore, away from the centroid, so the captured state cannot
      // be confused with the typed-city state.
      const { ctx, page, errors } = await open(browser, employer, '/employer/jobs/new', { lat: 12.95, lon: 77.6 })
      await page.getByRole('button', { name: 'Use my current location' }).click()
      await page.waitForTimeout(1500)
      const captured = await hintText(page)
      check('pressing the location button is acknowledged', captured !== '', JSON.stringify(captured))
      // The job does not exist yet, so the line must ASK for a save, never report
      // one. `/save/i` alone was the wrong test — it passes just as happily on
      // "Location saved.", which is the exact sentence it exists to forbid.
      check(
        '…and it asks for a save rather than reporting one',
        /save the job/i.test(captured) && !/\bsaved\b/i.test(captured),
        JSON.stringify(captured),
      )
      reportErrors(errors)
      await ctx.close()
    }

    // ---- The recruiter-in-another-city case, which the hint used to lie about -
    // A fix taken in Pune, then "Bangalore" typed after it. `coordsToWrite`
    // deliberately lets the later typed city win — that is a recruiter posting a
    // Bangalore job from a Pune desk — so the job gets the BANGALORE centroid.
    // The first draft of the hint re-derived its own answer from the same inputs
    // and said "Location captured", describing a fix that was about to be thrown
    // away. The two now read one shared decision.
    {
      const { ctx, page, errors } = await open(browser, employer, '/employer/jobs/new', { lat: 18.5204, lon: 73.8567 })
      await page.getByRole('button', { name: 'Use my current location' }).click()
      await page.waitForTimeout(1500)
      await page.locator('#job-location').fill('Bangalore')
      await settle(page)
      const after = await hintText(page)
      check(
        'a city typed AFTER a fix is what the hint reports',
        /Bangalore/i.test(after),
        JSON.stringify(after),
      )
      check(
        '…and it no longer claims the Pune fix was captured',
        !/captured/i.test(after),
        JSON.stringify(after),
      )
      reportErrors(errors)
      await ctx.close()
    }

    // ---- The TD-42 case: an existing pin the new text cannot move -----------
    // Needs a real job that already carries a coordinate, so create one over the
    // API (no post credit is spent by PUT, and this deletes it at the end).
    {
      const created = await authed('/jobs', employer.token, {
        method: 'POST',
        body: JSON.stringify({
          title: `TD41 pin check ${Date.now()}`,
          description:
            'Temporary job created by scripts/smoke/smoke-td41.js to check the pinned-location warning. It is deleted at the end of the run.',
          category: 'Agri & Food-Based Industries',
          location: 'Bangalore',
          jobType: 'FULL_TIME',
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      })
      createdJobId = created?.data?.id ?? created?.data?.job?.id ?? null
      check('created a job holding a Bangalore pin', !!createdJobId, createdJobId || JSON.stringify(created).slice(0, 160))

      if (createdJobId) {
        const { ctx, page, errors } = await open(browser, employer, `/employer/jobs/${createdJobId}/edit`)
        const box = page.locator('#job-location')
        await box.fill('Nagpur')
        await settle(page)
        const pinned = await hintText(page)
        // The whole point: it must name the city the job is STUCK in, not the
        // one just typed. Silence here is the bug TD-41 exists to end.
        check('editing to an unplaceable town warns the pin did not move', pinned !== '', JSON.stringify(pinned))
        check('…and names the city it is stuck in', /Bangalore/i.test(pinned), JSON.stringify(pinned))
        reportErrors(errors)
      await ctx.close()
      }
    }

    // ---- A pin that sits in NO city we know --------------------------------
    // `cityContaining` answers '' for a coordinate outside every radius — a fix
    // taken at a Devanahalli warehouse is 35 km from the Bangalore centroid,
    // past its 30 km. The named wording would then render "stays pinned to  and
    // will keep showing", a broken sentence in ten languages, in the one state
    // this ticket exists to expose.
    if (createdJobId) {
      // Assert the move LANDED. Without this the block is negative-only: a
      // rejected PUT leaves the Bangalore centroid, the NAMED wording renders,
      // and both assertions below pass on it — reporting success for a state
      // never reached.
      const moved = await authed(`/jobs/${createdJobId}`, employer.token, {
        method: 'PUT',
        body: JSON.stringify({ latitude: 13.25, longitude: 77.7 }),
      })
      const after = await authed(`/jobs/${createdJobId}`, employer.token)
      const pin = after?.data?.job ?? after?.data
      check(
        'moved the pin outside every city radius',
        moved?.success === true && Math.abs((pin?.latitude ?? 0) - 13.25) < 0.01,
        `lat=${pin?.latitude} lon=${pin?.longitude}`,
      )

      const { ctx, page, errors } = await open(browser, employer, `/employer/jobs/${createdJobId}/edit`)
      await page.locator('#job-location').fill('Nagpur')
      await settle(page)
      const unnamed = await hintText(page)
      check('an off-grid pin still warns', unnamed !== '', JSON.stringify(unnamed))
      // The distinguishing test: the NAMED wording would say "Bangalore" here.
      // Its absence is what proves `locationPinnedUnnamed` was the string used.
      check(
        '…using the wording that names no city',
        !/Bangalore/i.test(unnamed) && !/\s{2,}/.test(unnamed),
        JSON.stringify(unnamed),
      )
      reportErrors(errors)
      await ctx.close()
    }
    // ---- TD-42: the warning now has a way out, and it must REACH the DB -----
    // Until 9dbb470 the coordinate fields were `.optional()` and not nullable,
    // so this button could not have existed. Asserted against the stored record
    // rather than the screen: the form will happily look like it worked.
    if (createdJobId) {
      // Put the Bangalore pin back — the previous block moved it out to sea.
      await authed(`/jobs/${createdJobId}`, employer.token, {
        method: 'PUT',
        body: JSON.stringify({ latitude: 12.9716, longitude: 77.5946 }),
      })
      const { ctx, page, errors } = await open(browser, employer, `/employer/jobs/${createdJobId}/edit`)
      await page.locator('#job-location').fill('Nagpur')
      await settle(page)

      const clear = page.getByRole('button', { name: 'Remove the saved location' })
      check('the pinned warning offers a way out', (await clear.count()) === 1, `${await clear.count()} button(s)`)
      await clear.click()
      await page.waitForTimeout(400)
      const after = await page.evaluate(() => document.body.innerText)
      check('…and says the removal happens on save', /when you save/i.test(after), (after.match(/[^\n]*when you save[^\n]*/) ?? ['(not found)'])[0])

      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(
          (x) => x.className.includes('bg-primary-50') && !x.disabled && x.offsetParent !== null,
        )
        if (b) b.click()
      })
      await page.waitForTimeout(4000)
      const saved = await authed(`/jobs/${createdJobId}`, employer.token)
      const row = saved?.data?.job ?? saved?.data
      check(
        'the coordinate is actually NULL in the database',
        row?.latitude == null && row?.longitude == null,
        `lat=${row?.latitude} lon=${row?.longitude}`,
      )
      reportErrors(errors)
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    if (createdJobId && employer) {
      // Its own try/catch: a throw out of `finally` would skip browser.close()
      // and leave the job behind as well as a live Chrome.
      try {
        await authed(`/jobs/${createdJobId}`, employer.token, { method: 'DELETE' })
        console.log(`  cleanup: job ${createdJobId.slice(0, 8)} deleted`)
      } catch (err) {
        console.log(`  ⚠️  cleanup FAILED — delete job ${createdJobId} by hand: ${err.message}`)
      }
    }
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
