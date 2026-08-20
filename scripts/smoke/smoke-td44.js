// TD-44 — the seeker profile must not tell the lie TD-41 fixed for employers.
//
// The status line under the location box went green and said "You will see jobs
// near you" whenever a coordinate was STORED, whatever the box said. So a seeker
// who moved and typed "Nagpur" over their Bangalore pin was reassured, in green,
// that they would see jobs near them — and went on being shown Bangalore jobs.
// Nothing can place "Nagpur", so nothing was written and nothing changed.
//
// It is the same defect TD-41 fixed on the employer's job form, on the half of
// the product with more people behind it.
//
// ⚠️ The states are read from the SCREEN but verified against the RECORD where
// it matters: a line claiming a coordinate was saved is only true if one was.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, authed, loginSeeker, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

// ⚠️ `latitude`/`longitude`, NOT `lat`/`lon`. The API field names differ from
// the internal Coords shape, and a body of `{lat, lon}` is accepted and ignored
// — the profile simply keeps whatever it had. The first version of this file
// used `lat`/`lon` and three checks passed on a seeker that happened to already
// be in Bangalore, including the one asserting the coordinate had MOVED.
// `coordinateFields` in JobForm.tsx exists to stop exactly this in the app.
const BLR = { latitude: 12.9716, longitude: 77.5946 }
// 33 km from the Bangalore centroid, past its 30 km radius, so `cityContaining`
// finds no city — the unnamed variant's case.
const OFF_GRID = { latitude: 13.25, longitude: 77.7 }

const setCoords = (token, body) =>
  authed('/jobseekers/profile', token, { method: 'PUT', body: JSON.stringify(body) })

async function open(browser, seeker) {
  const { ctx, page } = await session(browser, seeker, { width: 1280, height: 900 })
  await page.goto(FE + '/profile', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + '/profile', { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1800)
  return { ctx, page }
}

// The line sits directly under the location input and its datalist.
const line = (page) => page.locator('#seeker-location-cities ~ * [role="status"], [role="status"]').first()
const lineText = async (page) => ((await line(page).innerText()) || '').trim()

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let seeker = null
  try {
    seeker = await loginSeeker()

    // ---- 1. A pin that MATCHES the typed city: the reassuring line is right --
    {
      await setCoords(seeker.token, { ...BLR, location: 'Bangalore' })
      const { ctx, page } = await open(browser, seeker)
      const txt = await lineText(page)
      check('a matching pin still says you will see jobs near you', /near you/i.test(txt), JSON.stringify(txt))
      await ctx.close()
    }

    // ---- 2. THE BUG: typing a place we cannot match over a stored pin -------
    {
      const { ctx, page } = await open(browser, seeker)
      await page.getByPlaceholder('City / area').fill('Nagpur')
      // The line is debounced on the employer side; give the same room here.
      await page.waitForTimeout(900)
      const txt = await lineText(page)

      check('it no longer claims you will see jobs near you', !/near you\.?$/i.test(txt), JSON.stringify(txt))
      check('…it says the pin did not move', /could not match/i.test(txt), JSON.stringify(txt))
      // The value of the message is naming WHERE they are still pinned.
      check('…and names the city they are stuck in', /Bangalore/i.test(txt), JSON.stringify(txt))
      await ctx.close()
    }

    // ---- 3. A pin outside every known city gets the unnamed wording ---------
    {
      await setCoords(seeker.token, OFF_GRID)
      const moved = await authed('/jobseekers/profile', seeker.token)
      check(
        'the seeker really is off-grid now',
        Math.abs((moved?.data?.jobSeeker?.latitude ?? 0) - OFF_GRID.latitude) < 0.01,
        `lat=${moved?.data?.jobSeeker?.latitude}`,
      )
      const { ctx, page } = await open(browser, seeker)
      await page.getByPlaceholder('City / area').fill('Nagpur')
      await page.waitForTimeout(900)
      const txt = await lineText(page)
      check('an off-grid pin still warns', /could not match/i.test(txt), JSON.stringify(txt))
      // The named variant would print "near ." or the raw i18n key here.
      check(
        '…without a hole or a raw key where the city would be',
        !/\s{2,}/.test(txt) && !/seeker\.location/i.test(txt) && !/Bangalore/i.test(txt),
        JSON.stringify(txt),
      )
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    // Put the seeker back — every other suite assumes Bangalore.
    if (seeker) {
      try {
        await setCoords(seeker.token, { ...BLR, location: 'Bangalore' })
        const back = await authed('/jobseekers/profile', seeker.token)
        const js = back?.data?.jobSeeker
        check(
          'seeker restored to Bangalore',
          Math.abs((js?.latitude ?? 0) - BLR.latitude) < 0.01,
          `lat=${js?.latitude} location=${JSON.stringify(js?.location)}`,
        )
      } catch (err) {
        check('seeker restored to Bangalore', false, `RESTORE FAILED — ${err.message}`)
      }
    }
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
