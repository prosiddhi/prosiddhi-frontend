// TD-08, after TD-37 removed the role toggle from the password arms.
//
// The original version of this file asserted that a wrong-role login "names the
// account and moves the tab". That was right while the user had to pick a role
// first. TD-37 removed that choice, so the tab assertions now test a control
// that is not on the screen — and a passing test for a removed control is worse
// than no test. The happy path moved to smoke-td37 (an employer signs in with no
// role chosen and lands on /employer).
//
// What is left here is the case TD-37 does NOT cover and that still has teeth:
// an ADMIN fails BOTH role gates, because the console is a separate app. A
// client that treated 403 as "must be the other role" would retry forever.
// `loginAnyRole` deliberately RETHROWS for ADMIN rather than retrying, and this
// is what proves it.
const { chromium, LAUNCH, FE, OUT } = require('./lib-smoke')

function check(label, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return ok
}

// Drive the ADMIN branch without admin credentials: answer BOTH login endpoints
// with exactly what the backend's role gate sends for that role. Both, because
// the point is that a retry would also fail — if loginAnyRole ever starts
// retrying on ADMIN, this mock is what lets it loop.
/**
 * `unifiedLogin: 404` simulates a backend that PREDATES TD-43, forcing the
 * client down the old guess-and-retry path.
 *
 * That distinction matters. The previous version of this file mocked every
 * login URL with one wildcard, which also caught the new unified endpoint — so
 * the run short-circuited before `loginByGuessingRole` ever ran, and the test
 * passed while proving nothing about the thing it exists to prove. Both paths
 * are live during the deploy window, so both get a case.
 */
async function openAsAdmin(browser, { unifiedLogin }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()
  const seen = []

  await page.route('**/api/auth/login', (route) => {
    seen.push('auth')
    if (unifiedLogin === 404) {
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not found' }) })
      return
    }
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'Admin accounts sign in through the admin console.',
        error: { actualRole: 'ADMIN' },
        code: 'ADMIN_ACCOUNT',
      }),
    })
  })

  // The role-split gates. An ADMIN fails BOTH, which is the whole point.
  await page.route('**/api/{jobseekers,employers}/login', (route) => {
    seen.push(route.request().url().includes('employers') ? 'employers' : 'jobseekers')
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'This is not a job seeker account.',
        error: { actualRole: 'ADMIN' },
        code: 'ROLE_MISMATCH',
      }),
    })
  })

  await page.goto(FE + '/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  return { ctx, page, seen }
}

async function submit(page) {
  await page.locator('#pp-phone').fill('admin@prosiddhi.test')
  await page.locator('input[type="password"]').first().fill('whatever')
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(2500)
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let ok = true

  // A. Backend carrying TD-43: one request, refused by code, nothing guessed.
  console.log('\n=== ADMIN, backend WITH the unified endpoint ===')
  {
    const { ctx, page, seen } = await openAsAdmin(browser, { unifiedLogin: 403 })
    await submit(page)
    const body = await page.evaluate(() => document.body.innerText)
    ok = check('says it is an admin account', /admin/i.test(body)) && ok
    ok = check('does NOT claim the other role', !/employer account|job seeker account/i.test(body)) && ok
    ok = check('one request, no role guessing', JSON.stringify(seen) === JSON.stringify(['auth']), JSON.stringify(seen)) && ok
    ok = check('stayed on /login', /\/login/.test(page.url())) && ok
    await ctx.close()
  }

  // B. Older backend — the deploy window. The client falls back to guessing, and
  // must NOT try the second gate for an ADMIN or it ping-pongs forever.
  console.log('\n=== ADMIN, backend WITHOUT it (the deploy window) ===')
  {
    const { ctx, page, seen } = await openAsAdmin(browser, { unifiedLogin: 404 })
    await submit(page)
    const body = await page.evaluate(() => document.body.innerText)
    ok = check('fell back to the role-split route', seen.includes('jobseekers'), JSON.stringify(seen)) && ok
    ok = check('did NOT also try the employer gate', !seen.includes('employers'), JSON.stringify(seen)) && ok
    ok = check('still says it is an admin account', /admin/i.test(body)) && ok
    ok = check('no raw backend string', !/correct login URL/i.test(body)) && ok
    await page.screenshot({ path: `${OUT}/td08-admin.png`, fullPage: true })
    await ctx.close()
  }

  await browser.close()
  console.log(`\nTD-08 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
