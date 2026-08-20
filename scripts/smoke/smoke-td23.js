// TD-23 — "Find workers" must show somebody before the employer types.
//
// The screen opened as an empty box with an instruction in it. The free tier
// already permits snippet search, so nothing was being protected: it asked a
// question and showed nothing until it was answered.
//
// ⚠️ It cannot be fixed by fetching a default list. `search` is REQUIRED, min 2
// characters, on GET /employers/search/workers — there is no browse mode. The
// first search is therefore seeded from the employer's own most recent job
// title, which is a better guess than "recent candidates" anyway.
//
// Three things are checked, and the third is the one that would be easy to get
// wrong quietly:
//
//   1. Cards are on screen with NO typing, and the seed is visible in the box
//      so it reads as an editable search rather than a mystery list.
//   2. The employer's own search still wins — the seed must never fight a real
//      one, or re-seed over it.
//   3. An employer with NO jobs still gets the original empty state, not an
//      error and not a spinner. There is nothing to seed from, and saying so is
//      the honest answer.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, BE, authed, post, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

async function open(browser, auth, path) {
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  // The seed is a second request after the page settles.
  await page.waitForTimeout(2500)
  return { ctx, page }
}

const cards = (page) => page.locator('a[href^="/employer/workers/"]')
const searchBox = (page) => page.getByPlaceholder(/skill|keyword|search/i).first()

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const employer = await loginEmployer()

    // What the seed SHOULD be — read from the API, not assumed.
    const mine = await authed('/jobs/employer/me/jobs?page=1&limit=1', employer.token)
    const latest = mine?.data?.jobs?.[0]
    const expected = (latest?.jobTitle || latest?.title || '').trim()
    check('the employer has a job to seed from', !!expected, JSON.stringify(expected))

    // ---- 1. Candidates, with no typing -------------------------------------
    {
      const { ctx, page } = await open(browser, employer, '/employer/workers')
      const n = await cards(page).count()
      check('workers are on screen without typing anything', n > 0, `${n} card(s)`)

      const box = await searchBox(page).inputValue()
      check('the seed is visible in the search box', box === expected, `box=${JSON.stringify(box)} want ${JSON.stringify(expected)}`)

      // Without this line an unbidden list reads as "this is everyone we have".
      const body = await page.evaluate(() => document.body.innerText)
      check(
        'the page says where the list came from',
        /most recent job/i.test(body) && body.includes(expected),
        (body.match(/These workers[^\n]*/) ?? ['(not found)'])[0],
      )

      // The old empty-state instruction must be gone, not merely covered.
      check(
        'the "search to find workers" empty state is not showing',
        !/Search the candidate database by skill/i.test(body),
      )

      // The copy says "Search ABOVE to look for something else" — in English and
      // in all nine translations, which faithfully render the direction. That
      // makes a layout claim, so it is worth asserting rather than assuming: if
      // the box ever stacks below the results, ten strings go wrong at once and
      // nothing else would catch it.
      const boxBox = await searchBox(page).boundingBox()
      const noteBox = await page.locator('p', { hasText: 'most recent job' }).first().boundingBox()
      check(
        'the search box really is above the explanation',
        !!boxBox && !!noteBox && boxBox.y < noteBox.y,
        `box y=${Math.round(boxBox?.y ?? -1)} note y=${Math.round(noteBox?.y ?? -1)}`,
      )
      await ctx.close()
    }

    // ---- 2a. A search typed DURING the seed must win ------------------------
    // The race the post-await guard exists for.
    //
    // ⚠️ The timing is FORCED, not hoped for. A first attempt just typed quickly
    // after load: on localhost `getMyJobs` answers in milliseconds, so the seed
    // had always finished and the check passed even with the guard deleted — a
    // test for a race that could not observe one. Delaying that one response by
    // three seconds puts the submit squarely inside the window, and with the
    // guard removed this block does fail.
    {
      const { ctx, page } = await session(browser, employer, { width: 1280, height: 900 })
      // Both endpoints are slowed, and the search is slowed MORE, so the
      // employer's own request is still in flight when the seed comes back.
      // That overlap is what exercises the pre-search guard: without it the seed
      // takes a fresh request id, and `runSearch`'s `finally` only clears the
      // spinner when ITS id is still current — so the employer's results are
      // discarded and the page spins forever.
      await page.route('**/jobs/employer/me/jobs**', async (route) => {
        await new Promise((r) => setTimeout(r, 3000))
        await route.continue()
      })
      await page.route('**/employers/search/workers**', async (route) => {
        await new Promise((r) => setTimeout(r, 4000))
        await route.continue()
      })
      await page.goto(FE + '/employer/workers', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.goto(FE + '/employer/workers', { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.getByPlaceholder(/skill|keyword|search/i).first().waitFor({ timeout: 30000 })
      await searchBox(page).fill('driver')
      await page.locator('button.bg-primary-50', { hasText: 'Search' }).first().click()
      // Past both artificial delays, so the seed has had every chance to clobber.
      await page.waitForTimeout(9000)

      const raced0 = await page.evaluate(() => document.body.innerText)
      check(
        'the employer is not left on a spinner',
        !/Searching candidates/i.test(raced0),
        (raced0.match(/[^\n]*Searching[^\n]*/) ?? ['no spinner'])[0],
      )

      check(
        'a search typed during the seed is not overwritten',
        (await searchBox(page).inputValue()) === 'driver',
        `box=${JSON.stringify(await searchBox(page).inputValue())}`,
      )
      const raced = await page.evaluate(() => document.body.innerText)
      check('…and the seed explanation does not appear over it', !/most recent job/i.test(raced))
      await ctx.close()
    }

    // ---- 2b. A real search wins, and is not re-seeded over ------------------
    {
      const { ctx, page } = await open(browser, employer, '/employer/workers')
      const box = searchBox(page)
      await box.fill('driver')
      // ⚠️ NOT `getByRole('button', {name: /^search$/i}).first()`. The TAB is
      // also called "Search" (workers.tabSearch === workers.searchButton ===
      // "Search"), it comes first in the DOM, and clicking it does nothing
      // because that tab is already open — so the search never ran, `applied`
      // stayed on the seed, and this block failed while blaming the code.
      // The submit button is the filled one next to the input.
      await page.locator('button.bg-primary-50', { hasText: 'Search' }).first().click()
      await page.waitForTimeout(2500)

      check('the box holds the typed search', (await box.inputValue()) === 'driver')
      const body = await page.evaluate(() => document.body.innerText)
      // The explanation is tied to the seed, so it must disappear once the
      // employer owns the query — otherwise it claims results came from a job
      // when they came from what was typed.
      check('the seed explanation is gone once they search', !/most recent job/i.test(body))
      await ctx.close()
    }

    // ---- 3. An employer with no jobs sees the original empty state ----------
    // A fresh account, so there is genuinely nothing to seed from. Registered
    // once and reused; it never posts a job, which is its whole purpose.
    {
      const email = process.env.SMOKE_EMPLOYER_NOJOBS || 'smoke.nojobs@prosiddhi.test'
      const password = process.env.SMOKE_EMPLOYER_NOJOBS_PASSWORD || 'Demo@12345'
      let auth = null
      const existing = await post('/employers/login', { identifier: email, password })
      if (existing.success) {
        auth = existing.data
      } else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(BE)) {
        // Same guard as smoke-td04: this creates a real account with a password
        // committed to this repo, so localhost only.
        //
        // The route is /employers/register/individual — NOT /employers/register,
        // which 404s. And it requires BOTH contacts already verified, so the
        // OTPs come first. "already verified"/"already registered" from either
        // send is a usable state on a re-run, not an error.
        const phone = process.env.SMOKE_EMPLOYER_NOJOBS_PHONE || '+919876500088'
        const verify = async (kind, sendPath, verifyPath, body, key) => {
          const sent = await post(sendPath, body)
          if (/already (verified|registered)/i.test(sent?.message ?? '')) return true
          const code = sent?.data?.otp
          if (!code) {
            console.log(`  (no ${kind} OTP in the response — EXPOSE_OTP_IN_RESPONSE off? ${JSON.stringify(sent).slice(0, 120)})`)
            return false
          }
          const ok = await post(verifyPath, { ...body, [key]: code })
          return ok?.success === true
        }
        // `purpose` is required and enum-checked: REGISTRATION | CHANGE_EMAIL |
        // FORGOT_PASSWORD. Omitting it fails validation, and the failure reads
        // as a missing OTP rather than a missing field.
        const emailOk = await verify('email', '/email-otp/send', '/email-otp/verify', { email, purpose: 'REGISTRATION' }, 'otp')
        const phoneOk = await verify('phone', '/otp/send', '/otp/verify', { phoneNumber: phone }, 'otp')

        if (emailOk && phoneOk) {
          const reg = await post('/employers/register/individual', {
            fullName: 'Smoke NoJobs',
            email,
            password,
            phoneNumber: phone,
            designation: 'Owner',
          })
          const fresh = await post('/employers/login', { identifier: email, password })
          if (fresh.success) auth = fresh.data
          else console.log(`  (register failed: ${JSON.stringify(reg).slice(0, 200)})`)
        }
      }

      if (!auth) {
        console.log('  SKIP  no-jobs employer unavailable — set SMOKE_EMPLOYER_NOJOBS to an employer with zero jobs')
      } else {
        const { ctx, page } = await open(browser, auth, '/employer/workers')
        const body = await page.evaluate(() => document.body.innerText)
        const n = await cards(page).count()
        check('an employer with no jobs sees no cards', n === 0, `${n} card(s)`)
        // ⚠️ Match the TAIL, not the opening. `workers.subtitle` is "Search the
        // candidate database. Unlock a candidate…" and sits on this page at all
        // times, so a check for "Search the candidate database" passes whether
        // the empty state rendered or not — and the DETAIL line printed the
        // subtitle, which is how the false pass was spotted. Only `emptyInitial`
        // says "by skill, job title".
        check(
          '…and gets the original invitation to search',
          /by skill, job title, or keyword/i.test(body),
          (body.match(/[^\n]*by skill[^\n]*/) ?? ['(not found)'])[0],
        )
        // A failed or empty seed must never surface as a search failure: the
        // employer did not search for anything.
        check('…and no error is shown', !/failed/i.test(body), (body.match(/[^\n]*failed[^\n]*/i) ?? ['none'])[0])
        await ctx.close()
      }
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
