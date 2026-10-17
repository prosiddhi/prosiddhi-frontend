// Find workers → Search: an empty query must not bring the previous search back.
//
// The bug: clearing the box and pressing Search put "Enter at least 2 characters" into the
// same panel as a failed request. That panel had a Retry button, and Retry re-ran the
// PREVIOUS search ("Ravi") even though the box was empty.
//
// The search API is MOCKED here (page.route), so the checks do not depend on which seekers
// the local database holds. Only the login and the first-load seed use the real API; the seed
// gets an empty reply for its term, so it is discarded and the page starts on the invitation.
//
//   Ravi   → one card "Ravi Kumar"      Kiran → one card "Kiran Rao"
//   Slow   → "Ravi Kumar" after 1.5 s   Fail  → HTTP 500
//   (anything else → no results)
//
// Checked:
//   1. empty input        → validation message, NO Retry, NO request, old results gone
//   2. whitespace-only    → same
//   3. in flight, then an empty submit → the late reply never repopulates the page
//   3b. one character     → validation message, NO request, the Ravi result stays, no Retry
//   3c. one character while "Slow" is in flight → message shows, "Slow" still completes,
//                           the spinner clears, "R" is never sent
//   4. Ravi → Kiran       → Kiran's results replace Ravi's
//   5. a real failure     → still shows Retry, and Retry re-runs that search
//
// Read the PASS/FAIL lines. Unlike the older smoke scripts this one exits 1 if any check
// fails or anything unexpected throws (a timeout, a failed login), and 0 only when every
// check passed.

const { chromium, LAUNCH, FE, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

const person = (id, fullName) => ({
  id,
  fullName,
  profilePhoto: null,
  bio: '',
  preferredCities: [],
  preferredSector: null,
  preferredJobTitle: 'Driver',
  createdAt: '2026-01-01T00:00:00.000Z',
  skills: [],
  workExperience: [],
})
const RAVI = person('00000000-0000-4000-8000-000000000001', 'Ravi Kumar')
const KIRAN = person('00000000-0000-4000-8000-000000000002', 'Kiran Rao')

const envelope = (jobSeekers) => ({
  success: true,
  message: 'ok',
  data: {
    jobSeekers,
    pagination: {
      total: jobSeekers.length,
      page: 1,
      limit: 12,
      totalPages: jobSeekers.length ? 1 : 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
  },
})

const cards = (page) => page.locator('a[href^="/employer/workers/"]')
const searchBox = (page) => page.getByPlaceholder(/skill|keyword|search/i).first()
// The Search tab is also a button named "Search", so match the action button by what only it
// has: the magnifier icon beside the text. (The tab and Retry carry no icon.)
const searchButton = (page) => page.locator('button:has(svg)').filter({ hasText: /^\s*search\s*$/i })
const retryButton = (page) => page.getByRole('button', { name: /retry/i })
const validation = (page) => page.locator('#worker-query-error')

// Mock the search API. `calls` records every search term that reached it, in order.
async function mockSearch(page) {
  const calls = []
  await page.route('**/employers/search/workers**', async (route) => {
    const term = (new URL(route.request().url()).searchParams.get('search') || '').trim()
    calls.push(term)
    if (term === 'Fail') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'boom' }) })
    }
    if (term === 'Slow') await new Promise((r) => setTimeout(r, 1500))
    const rows = term === 'Ravi' || term === 'Slow' ? [RAVI] : term === 'Kiran' ? [KIRAN] : []
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(rows)) })
  })
  return calls
}

// Poll a condition on the Node side (the mock's `calls` list is not visible to the page).
async function until(condition, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out after ${timeoutMs} ms waiting for a condition`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

async function search(page, text) {
  await searchBox(page).fill(text)
  await searchButton(page).click()
}

async function open(browser, auth) {
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  const calls = await mockSearch(page)
  await page.goto(FE + '/employer/workers', { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(2500) // the first-load seed is a second request
  return { ctx, page, calls }
}

;(async () => {
  let browser
  try {
    browser = await chromium.launch(LAUNCH)
    const employer = await loginEmployer()

    // ---- 1 + 2. Empty and whitespace-only ------------------------------------
    for (const [name, blank] of [['empty input', ''], ['whitespace-only input', '   ']]) {
      const { ctx, page, calls } = await open(browser, employer)
      await search(page, 'Ravi')
      await page.getByText('Ravi Kumar').first().waitFor({ timeout: 10000 })
      check(`${name}: Ravi results are showing first`, (await cards(page).count()) === 1)

      const before = calls.length
      await search(page, blank)
      await page.waitForTimeout(500)

      check(`${name}: the validation message shows`, await validation(page).isVisible())
      check(`${name}: there is no Retry button`, (await retryButton(page).count()) === 0)
      check(`${name}: no request was sent`, calls.length === before, `${calls.length - before} extra`)
      check(`${name}: the old results are gone`, (await cards(page).count()) === 0)
      await ctx.close()
    }

    // ---- 3. In flight, then an empty submit -----------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await search(page, 'Slow') // answers after 1.5 s
      await page.waitForTimeout(300)
      await search(page, '') // while it is still in flight
      await page.waitForTimeout(2500) // longer than the mock delay
      check('in flight: the slow request did go out', calls.includes('Slow'))
      check('in flight: its late reply did not repopulate the page', (await cards(page).count()) === 0)
      check('in flight: the spinner is not stuck', (await page.getByText(/searching/i).count()) === 0)
      check('in flight: the validation message still shows', await validation(page).isVisible())
      await ctx.close()
    }

    // ---- 3b. One character: the message shows, the search on screen stays ---------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await search(page, 'Ravi')
      await page.getByText('Ravi Kumar').first().waitFor({ timeout: 10000 })
      check('one character: Ravi results are showing first', (await cards(page).count()) === 1)

      const before = calls.length
      await search(page, 'R')
      // The message appearing means submit() has run, so a request would already have gone out.
      await validation(page).waitFor({ timeout: 5000 })
      check('one character: the validation message shows', true)
      check('one character: no request was sent', calls.length === before, `${calls.length - before} extra`)
      check(
        'one character: the Ravi result is still showing',
        (await cards(page).count()) === 1 && (await page.getByText('Ravi Kumar').first().isVisible()),
      )
      check('one character: there is no Retry button', (await retryButton(page).count()) === 0)
      await ctx.close()
    }

    // ---- 3c. One character while a valid search is still in flight -----------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await search(page, 'Slow') // the mock answers after 1.5 s
      await until(() => calls.includes('Slow'), 5000) // it has reached the API and is waiting
      await search(page, 'R')
      await validation(page).waitFor({ timeout: 5000 })
      check('one character in flight: the validation message shows', true)
      // Still waiting on the slow reply, so the one-character submit has not cancelled it.
      check('one character in flight: the search is still loading', (await page.getByText(/searching/i).count()) > 0)

      await page.getByText('Ravi Kumar').first().waitFor({ timeout: 10000 }) // the valid reply lands
      check('one character in flight: the valid search completed', (await cards(page).count()) === 1)
      check('one character in flight: the spinner is gone', (await page.getByText(/searching/i).count()) === 0)
      check('one character in flight: the validation message is still showing', await validation(page).isVisible())
      check('one character in flight: "R" was never sent', !calls.includes('R'))
      await ctx.close()
    }

    // ---- 4. Ravi → Kiran --------------------------------------------------------
    {
      const { ctx, page } = await open(browser, employer)
      await search(page, 'Ravi')
      await page.getByText('Ravi Kumar').first().waitFor({ timeout: 10000 })
      await search(page, 'Kiran')
      await page.getByText('Kiran Rao').first().waitFor({ timeout: 10000 })
      const body = await page.evaluate(() => document.body.innerText)
      check('Ravi → Kiran: Kiran is shown', body.includes('Kiran Rao'))
      check('Ravi → Kiran: Ravi is not', !body.includes('Ravi Kumar'))
      check('Ravi → Kiran: no validation message', (await validation(page).count()) === 0)
      await ctx.close()
    }

    // ---- 5. A real failure keeps its Retry ---------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await search(page, 'Fail')
      await retryButton(page).waitFor({ timeout: 10000 })
      check('failure: Retry shows', true)
      check('failure: no validation message', (await validation(page).count()) === 0)
      const before = calls.length
      await retryButton(page).click()
      await page.waitForTimeout(800)
      check('failure: Retry re-runs the same search', calls.length === before + 1 && calls[calls.length - 1] === 'Fail')
      await ctx.close()
    }
  } catch (err) {
    // A timeout, a failed login or a missing browser is a failed run, not a skipped one.
    check('the run finished without an unexpected error', false, err && err.message ? err.message.split('\n')[0] : String(err))
  } finally {
    // Closing the browser closes every context left open by a failed section.
    if (browser) await browser.close().catch(() => {})
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exitCode = fail > 0 ? 1 : 0
  }
})()
