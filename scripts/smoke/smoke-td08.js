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
async function openWithAdminRoleMismatch(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()
  let loginCalls = 0
  await page.route('**/api/*/login', (route) => {
    loginCalls++
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
  return { ctx, page, calls: () => loginCalls }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let ok = true

  console.log('\n=== an ADMIN account on the portal login ===')
  {
    const { ctx, page, calls } = await openWithAdminRoleMismatch(browser)
    await page.locator('#pp-phone').fill('admin@prosiddhi.test')
    await page.locator('input[type="password"]').first().fill('whatever')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2500)

    const body = await page.evaluate(() => document.body.innerText)
    ok = check('says it is an admin account', /admin console|admin/i.test(body)) && ok
    ok = check('does NOT claim it is the other role', !/employer account|job seeker account/i.test(body)) && ok
    ok = check('does NOT print the raw backend string', !/correct login URL/i.test(body)) && ok
    // The retry must not fire for ADMIN. One request in, one request out.
    ok = check('did not retry the other gate', calls() === 1, `${calls()} login call(s)`) && ok
    ok = check('stayed on /login', /\/login/.test(page.url()), page.url().replace(FE, '')) && ok

    // Submit again — a status-only implementation ping-pongs here.
    const before = calls()
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    ok = check('a second attempt behaves the same', calls() === before + 1, `${calls() - before} call(s) on retry`) && ok

    await page.screenshot({ path: `${OUT}/td08-admin.png`, fullPage: true })
    console.log(`  total login calls: ${calls()} (2 submits, 1 request each)`)
    await ctx.close()
  }

  await browser.close()
  console.log(`\nTD-08 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
