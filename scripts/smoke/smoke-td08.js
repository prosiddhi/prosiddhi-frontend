// TD-08: a wrong-role login must explain itself and move the tab; a wrong
// password must not; an ADMIN must not start a tab ping-pong.
const { chromium, LAUNCH, FE, OUT } = require('./lib-smoke')

const EMPLOYER = { email: 'demo.employer@prosiddhi.test', password: 'Demo@12345' }

async function readState(page) {
  return page.evaluate(() => {
    const tabs = [...document.querySelectorAll('button[aria-pressed]')].map((b) => ({
      label: b.textContent.trim(),
      pressed: b.getAttribute('aria-pressed') === 'true',
    }))
    const body = document.body.innerText
    return {
      active: tabs.find((t) => t.pressed)?.label ?? null,
      rawBackendString: /correct login URL/i.test(body),
      wrongRoleMsg: /We opened the Employer tab|We opened the Job Seeker tab/i.test(body),
      adminMsg: /admin console/i.test(body),
      badCreds: /invalid credentials/i.test(body),
    }
  })
}

async function open(browser, { tab, fulfilRoleMismatchAs } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()

  if (fulfilRoleMismatchAs) {
    // Drive the ADMIN branch without admin credentials: answer the login call
    // with exactly what the backend's role gate now sends for that role.
    await page.route('**/api/*/login', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'This is not a job seeker account.',
          error: { actualRole: fulfilRoleMismatchAs },
          code: 'ROLE_MISMATCH',
        }),
      }),
    )
  }

  await page.goto(FE + '/login', { waitUntil: 'networkidle' })
  await page.waitForSelector('button[aria-pressed]')
  const buttons = await page.$$('button[aria-pressed]')
  await buttons[tab === 'seeker' ? 0 : 1].click()
  return { ctx, page }
}

async function submit(page, email, password) {
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2200)
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)

  // 1. Employer credentials on the Job Seeker tab.
  {
    const { ctx, page } = await open(browser, { tab: 'seeker' })
    await submit(page, EMPLOYER.email, EMPLOYER.password)
    const s = await readState(page)
    console.log('\n=== employer credentials on the Job Seeker tab ===')
    console.log('   ', JSON.stringify(s))
    console.log(`    FRIENDLY MESSAGE:   ${s.wrongRoleMsg ? 'PASS' : 'FAIL'}`)
    console.log(`    RAW BE STRING GONE: ${!s.rawBackendString ? 'PASS' : 'FAIL'}`)
    console.log(`    TAB SWITCHED:       ${/employer/i.test(s.active || '') ? 'PASS' : 'FAIL'} (now "${s.active}")`)
    await page.screenshot({ path: `${OUT}/td08-wrong-role.png` })
    await ctx.close()
  }

  // 2. Wrong password on the correct tab — must not switch or claim a role.
  {
    const { ctx, page } = await open(browser, { tab: 'employer' })
    await submit(page, EMPLOYER.email, 'WrongPass@123')
    const s = await readState(page)
    console.log('\n=== wrong password on the correct tab ===')
    console.log('   ', JSON.stringify(s))
    console.log(`    NO FALSE SWITCH:   ${/employer/i.test(s.active || '') ? 'PASS' : 'FAIL'}`)
    console.log(`    NO WRONG-ROLE MSG: ${!s.wrongRoleMsg ? 'PASS' : 'FAIL'}`)
    await ctx.close()
  }

  // 3. ADMIN — fails BOTH role gates, so a status-only client would ping-pong.
  {
    const { ctx, page } = await open(browser, { tab: 'seeker', fulfilRoleMismatchAs: 'ADMIN' })
    const before = (await readState(page)).active
    await submit(page, 'admin@prosiddhi.test', 'whatever')
    const first = await readState(page)
    // Submit again — a status-only implementation flips back here.
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    const second = await readState(page)
    console.log('\n=== ADMIN account on the portal login ===')
    console.log(`    tab before=${before} after1=${first.active} after2=${second.active}`)
    console.log('   ', JSON.stringify(first))
    console.log(`    ADMIN MESSAGE:     ${first.adminMsg ? 'PASS' : 'FAIL'}`)
    console.log(`    NO WRONG-ROLE MSG: ${!first.wrongRoleMsg ? 'PASS' : 'FAIL'}`)
    console.log(`    TAB HELD STILL:    ${before === first.active && first.active === second.active ? 'PASS' : 'FAIL'}`)
    await page.screenshot({ path: `${OUT}/td08-admin.png` })
    await ctx.close()
  }

  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
