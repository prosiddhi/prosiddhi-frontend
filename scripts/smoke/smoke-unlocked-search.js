// Find workers → Unlocked tab: search box.
//
// The unlocked-candidates API is MOCKED here (page.route), so the checks do not depend on what
// the local employer has unlocked. Only the login and the rest of the page use the real stack.
//
//   (no search) → page 1: 12 people, page 2: 1 person   (2 pages)
//   Ravi        → one card "Ravi Kumar"      Kiran → one card "Kiran Rao"
//   Slow        → "Ravi Kumar" after 1.5 s   Fail  → HTTP 500
//   Nobody      → no results
//
// Checked:
//   1. the ?tab=unlocked deep link opens the tab and loads the full list in exactly ONE request
//      (also under `next dev`, whose strict mode would otherwise send two: the page guards
//      against it, so any second request is a real duplicate)
//   2. typing "Kiran" key by key sends nothing for 500 ms, then ONE request; the filtered count
//      reads "1 matching candidate"; retyping it with other spacing sends nothing
//   (Not covered: IME composition and Clear during composition. Playwright cannot drive a real
//   IME, so that is checked by hand with an Indic keyboard.)
//   3. blank and whitespace-only input send no `search` parameter and no extra request
//   4. a new term from page 2 asks for page 1
//   5. a slow reply for an older term never overwrites a newer one
//   6. the box keeps focus and its text while results load
//   7. a failure shows Retry, and Retry re-sends the same term and page
//   8. no match shows the "no match" copy (not "no unlocked candidates yet"); Clear (the X and
//      the button in the message) empties the box, restores the full list and refocuses the box
//   9. leaving the tab and coming back starts from an empty box
//
// Needs the local full stack and Playwright (see README.md). Read the PASS/FAIL lines: this
// script exits 1 if any check fails or anything unexpected throws, and 0 only when every check
// passed.

const { chromium, LAUNCH, FE, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

const person = (n, fullName) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  fullName,
  profilePhoto: null,
  bio: '',
  preferredCities: [],
  preferredCategory: null,
  preferredSector: null,
  preferredJobTitle: 'Driver',
  createdAt: '2026-01-01T00:00:00.000Z',
  skills: [],
  workExperience: [],
  email: null,
  phoneNumber: '+919800000000',
  available: true,
  unlockedAt: '2026-01-02T00:00:00.000Z',
})
const RAVI = person(1, 'Ravi Kumar')
const KIRAN = person(2, 'Kiran Rao')
const FILLER = Array.from({ length: 13 }, (_, i) => person(100 + i, `Filler Person ${i + 1}`))

const envelope = (rows, page = 1, totalPages = 1, total = rows.length) => ({
  success: true,
  message: 'ok',
  data: {
    unlockedCandidates: rows,
    pagination: {
      total,
      page,
      limit: 12,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  },
})

const cards = (page) => page.locator('a[href^="/employer/workers/"]')
const box = (page) => page.getByRole('searchbox')
const retryButton = (page) => page.getByRole('button', { name: /retry/i })
const clearButtons = (page) => page.getByRole('button', { name: /clear search/i })
const spinner = (page) => page.getByText(/loading your unlocked/i)

// Mock the API. `calls` records every request that reached it, in order, as { search, page }.
// `search` is the raw parameter ('' when it was absent) so "no parameter" is distinguishable
// from a wrong one only through `hadSearch`.
async function mockUnlocked(page) {
  const calls = []
  await page.route('**/employers/me/unlocked-candidates**', async (route) => {
    const q = new URL(route.request().url()).searchParams
    const hadSearch = q.has('search')
    const search = q.get('search') || ''
    const pageNo = Number(q.get('page') || '1')
    calls.push({ search, page: pageNo, hadSearch })
    const json = (status, body) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (search === 'Fail') return json(500, { success: false, message: 'boom' })
    if (search === 'Slow') await new Promise((r) => setTimeout(r, 1500))
    if (search === 'Ravi' || search === 'Slow') return json(200, envelope([RAVI]))
    if (search === 'Kiran') return json(200, envelope([KIRAN]))
    if (search) return json(200, envelope([], 1, 0, 0))
    return pageNo === 2
      ? json(200, envelope([FILLER[12]], 2, 2, 13))
      : json(200, envelope(FILLER.slice(0, 12), 1, 2, 13))
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

async function open(browser, auth) {
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  const calls = await mockUnlocked(page)
  await page.goto(FE + '/employer/workers?tab=unlocked', { waitUntil: 'networkidle', timeout: 120000 })
  await box(page).waitFor({ timeout: 15000 })
  await cards(page).first().waitFor({ timeout: 15000 })
  return { ctx, page, calls }
}

// Longer than the 500 ms debounce plus a mocked round trip, so "nothing more was sent" is a
// real observation and not just a request that has not left yet.
const settle = (page) => page.waitForTimeout(1200)

;(async () => {
  let browser
  try {
    browser = await chromium.launch(LAUNCH)
    const employer = await loginEmployer()

    // ---- 1. Deep link ------------------------------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await settle(page)
      check('deep link: the Unlocked tab opened with its search box', await box(page).isVisible())
      check('deep link: the full list loaded', (await cards(page).count()) === 12)
      check('deep link: no search parameter sent', calls.every((c) => !c.hadSearch))
      // Exactly one. React strict mode (`next dev`) mounts effects twice, which would be two
      // identical requests here; UnlockedResults guards against that on purpose, so a second
      // request, in dev or in a production build, is a real duplicate and a failure.
      check('deep link: exactly one request, and nothing more once settled', calls.length === 1, `${calls.length} requests`)
      check('deep link: the unfiltered count wording', /13 unlocked candidates/i.test(await page.evaluate(() => document.body.innerText)))
      await ctx.close()
    }

    // ---- 2. Debounce ---------------------------------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await settle(page)
      const before = calls.length
      await box(page).pressSequentially('Kiran', { delay: 60 })
      await page.waitForTimeout(250) // typing stopped 250 ms ago: inside the 500 ms window
      check('debounce: nothing is sent before typing has paused for 500 ms', calls.length === before, `${calls.length - before} sent`)
      await page.getByText('Kiran Rao').first().waitFor({ timeout: 10000 })
      await settle(page)
      const sent = calls.slice(before)
      // Exactly one even under strict mode (see the deep link check): this is a settled term
      // change, so a second request would be an accidental duplicate.
      check('debounce: typing "Kiran" key by key sent one request', sent.length === 1, `${sent.length} sent`)
      check('debounce: it carried the full term', sent[0] && sent[0].search === 'Kiran')
      check('debounce: Kiran is shown', (await cards(page).count()) === 1)
      check('debounce: the filtered count wording', /1 matching candidate\b/i.test(await page.evaluate(() => document.body.innerText)))

      // The same term with different spacing is not a new search.
      const afterKiran = calls.length
      await box(page).fill('  Kiran  ')
      await settle(page)
      check('same term, different spacing: no new request', calls.length === afterKiran, `${calls.length - afterKiran} extra`)
      check('same term, different spacing: Kiran is still shown', (await cards(page).count()) === 1)
      await ctx.close()
    }

    // ---- 3. Blank and whitespace-only ------------------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await settle(page)
      const before = calls.length
      await box(page).fill('   ')
      await settle(page)
      check('whitespace: no request was sent', calls.length === before, `${calls.length - before} extra`)
      check('whitespace: the list is still there', (await cards(page).count()) === 12)

      await box(page).fill('Kiran')
      await page.getByText('Kiran Rao').first().waitFor({ timeout: 10000 })
      const mid = calls.length
      await box(page).fill('')
      await until(() => calls.length > mid, 5000)
      const last = calls[calls.length - 1]
      check('empty: the full list was asked for without a search parameter', !last.hadSearch)
      await page.waitForFunction(() => document.querySelectorAll('a[href^="/employer/workers/"]').length === 12, null, { timeout: 10000 })
      check('empty: the full list is back', true)
      await ctx.close()
    }

    // ---- 4. A new term goes back to page 1 -------------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await page.locator('button:has(svg.lucide-chevron-right)').last().click()
      await page.getByText('Filler Person 13').first().waitFor({ timeout: 10000 })
      check('pagination: page 2 was requested', calls.some((c) => c.page === 2 && !c.hadSearch))

      const before = calls.length
      await box(page).fill('Ravi')
      await page.getByText('Ravi Kumar').first().waitFor({ timeout: 10000 })
      await settle(page) // a duplicate request would have landed by now
      const sent = calls.slice(before)
      check('pagination: the new term asked for page 1', sent.length === 1 && sent[0].page === 1 && sent[0].search === 'Ravi', JSON.stringify(sent))
      await ctx.close()
    }

    // ---- 5 + 6. Stale reply; focus while loading --------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await box(page).fill('Slow') // answers after 1.5 s
      await until(() => calls.some((c) => c.search === 'Slow'), 5000)
      check('loading: the spinner is up', (await spinner(page).count()) > 0)
      check(
        'loading: the box is still focused and still holds its text',
        await box(page).evaluate((el) => el === document.activeElement && el.value === 'Slow'),
      )

      await box(page).fill('Kiran') // newer term, answers at once
      await page.getByText('Kiran Rao').first().waitFor({ timeout: 10000 })
      await page.waitForTimeout(2200) // longer than the slow reply
      const body = await page.evaluate(() => document.body.innerText)
      check('stale: Kiran is still shown after the slow reply landed', body.includes('Kiran Rao'))
      check('stale: the slow reply (Ravi) did not overwrite it', !body.includes('Ravi Kumar'))
      check('stale: the spinner is not stuck', (await spinner(page).count()) === 0)
      await ctx.close()
    }

    // ---- 7. Failure and Retry ---------------------------------------------------------
    {
      const { ctx, page, calls } = await open(browser, employer)
      await box(page).fill('Fail')
      await retryButton(page).waitFor({ timeout: 10000 })
      check('failure: Retry shows', true)
      check('failure: the box is still there with its text', (await box(page).inputValue()) === 'Fail')
      const before = calls.length
      await retryButton(page).click()
      await until(() => calls.length > before, 5000)
      const again = calls[calls.length - 1]
      check('failure: Retry re-sent the same term and page', calls.length === before + 1 && again.search === 'Fail' && again.page === 1)
      await ctx.close()
    }

    // ---- 8. No match, and Clear -------------------------------------------------------
    for (const [name, pick] of [
      ['X button', (page) => clearButtons(page).first()],
      ['no-match button', (page) => clearButtons(page).last()],
    ]) {
      const { ctx, page } = await open(browser, employer)
      await box(page).fill('Nobody')
      await page.getByText(/no unlocked candidates match/i).waitFor({ timeout: 10000 })
      check(`no match (${name}): the no-match message shows`, true)
      check(`no match (${name}): not the "none yet" message`, (await page.getByText(/no unlocked candidates yet/i).count()) === 0)

      await pick(page).click()
      await cards(page).first().waitFor({ timeout: 10000 })
      check(`clear (${name}): the box is empty`, (await box(page).inputValue()) === '')
      check(`clear (${name}): the full list is back`, (await cards(page).count()) === 12)
      check(
        `clear (${name}): the box has focus`,
        await box(page).evaluate((el) => el === document.activeElement),
      )
      await ctx.close()
    }

    // ---- 9. Tab round trip ------------------------------------------------------------
    {
      const { ctx, page } = await open(browser, employer)
      await box(page).fill('Kiran')
      await page.getByText('Kiran Rao').first().waitFor({ timeout: 10000 })
      await page.getByRole('button', { name: /^search$/i }).first().click() // the Search tab
      await page.getByRole('button', { name: /^unlocked$/i }).click()
      await cards(page).first().waitFor({ timeout: 10000 })
      check('tab round trip: the box starts empty', (await box(page).inputValue()) === '')
      check('tab round trip: the full list is showing', (await cards(page).count()) === 12)
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
