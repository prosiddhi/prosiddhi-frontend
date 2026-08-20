// TD-37: one login. Phone + password, no role to choose, Google beside it.
//
// This REPLACES the tab-switching half of smoke-td08. That test asserted the
// screen "names the account and moves the tab" — correct behaviour when the user
// had to pick a role first. TD-37 removes that choice from both password arms,
// so the right assertion is now stronger: the user picks nothing and still lands
// in the right place.
//
// smoke-td08 is kept for the two cases that survive: an ADMIN must not start a
// ping-pong, and a wrong password must not claim a role. Those still run on the
// arms that legitimately keep a role toggle (Google, phone-OTP).
const { chromium, LAUNCH, FE, BE, OUT } = require('./lib-smoke')

const EMPLOYER = { id: 'demo.employer@prosiddhi.test', password: 'Demo@12345' }
const SEEKER_PHONE = process.env.SMOKE_SEEKER_PHONE || '+919876500019'
const SEEKER_PASSWORD = process.env.SMOKE_SEEKER_PASSWORD || 'Demo@12345'

function check(label, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return ok
}

async function open(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
  if (lang) await page.evaluate((l) => localStorage.setItem('preferredLanguage', l), lang)
  await page.goto(FE + '/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  return { ctx, page, errors }
}

// Everything a person must decide before they can start typing.
async function controlCount(page) {
  return page.evaluate(() => ({
    buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).length,
    inputs: [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null).length,
    rolePickers: [...document.querySelectorAll('button[aria-pressed]')].filter((b) => b.offsetParent !== null).length,
  }))
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let ok = true

  // --- 1. The screen a person actually arrives at --------------------------
  // The teardown counted 2 roles x 4 methods = 8 combinations, behind 11 buttons
  // and 3 inputs. The point of TD-37 is that you can start typing immediately.
  console.log('\n=== 1. what you see on arrival ===')
  {
    const { ctx, page, errors } = await open(browser)
    const c = await controlCount(page)
    console.log(`  buttons=${c.buttons} inputs=${c.inputs} rolePickers=${c.rolePickers}`)
    ok = check('no role to choose before typing', c.rolePickers === 0, `${c.rolePickers} role button(s) visible`) && ok
    ok = check('exactly two fields', c.inputs === 2, `${c.inputs} input(s)`) && ok
    ok = check('button count well down from 11', c.buttons <= 7, `${c.buttons} button(s)`) && ok
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    await page.screenshot({ path: `${OUT}/td37-login.png`, fullPage: true })
    await ctx.close()
  }

  // --- 2. THE POINT: an employer logs in without saying they are one -------
  // This is the case that used to fail. Right credentials, no role picked, and
  // the backend's own ROLE_MISMATCH answer is what routes them.
  console.log('\n=== 2. employer signs in with no role chosen ===')
  {
    const { ctx, page, errors } = await open(browser)
    await page.locator('#pp-phone').fill(EMPLOYER.id)
    await page.locator('input[type="password"]').first().fill(EMPLOYER.password)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(4000)
    const url = page.url()
    ok = check('landed on the employer dashboard', /\/employer/.test(url), url.replace(FE, '')) && ok
    ok = check('no raw backend string shown', !/correct login URL/i.test(await page.evaluate(() => document.body.innerText))) && ok
    console.log(`  errors: ${errors.filter((e) => !/language-fallback/.test(e)).join(' | ') || 'none'}`)
    await ctx.close()
  }

  // --- 3. A seeker, same screen, same absence of choice --------------------
  console.log('\n=== 3. seeker signs in with no role chosen ===')
  {
    const { ctx, page, errors } = await open(browser)
    await page.locator('#pp-phone').fill(SEEKER_PHONE)
    await page.locator('input[type="password"]').first().fill(SEEKER_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(4000)
    const url = page.url()
    ok = check('landed on the job feed', /\/job-feed/.test(url), url.replace(FE, '')) && ok
    console.log(`  errors: ${errors.filter((e) => !/language-fallback/.test(e)).join(' | ') || 'none'}`)
    await ctx.close()
  }

  // --- 4. A wrong password must still be a wrong password ------------------
  // The retry in loginAnyRole fires ONLY on ROLE_MISMATCH, which the backend
  // sends only for CORRECT credentials. If this ever starts reporting a role,
  // the retry has been wired to the wrong condition.
  console.log('\n=== 4. wrong password ===')
  {
    const { ctx, page, errors } = await open(browser)
    await page.locator('#pp-phone').fill(EMPLOYER.id)
    await page.locator('input[type="password"]').first().fill('WrongPass@123')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(3000)
    const body = await page.evaluate(() => document.body.innerText)
    ok = check('stayed on /login', /\/login/.test(page.url()), page.url().replace(FE, '')) && ok
    ok = check('said invalid credentials', /invalid credentials/i.test(body)) && ok
    ok = check('did NOT name an account type', !/employer account|job seeker account/i.test(body)) && ok
    console.log(`  errors: ${errors.filter((e) => !/language-fallback/.test(e)).join(' | ') || 'none'}`)
    await ctx.close()
  }

  // --- 5. The other methods are still reachable ----------------------------
  // "Simplified" must not mean "removed". Every arm still works; they are one
  // text link below the form instead of a tab row above it.
  console.log('\n=== 5. the other ways in are still there ===')
  {
    const { ctx, page, errors } = await open(browser)
    const body = await page.evaluate(() => document.body.innerText)
    ok = check('Google offered', /google/i.test(body)) && ok
    ok = check('email offered', /email/i.test(body)) && ok
    // Google needs a role because a new user is a SIGN-UP — so tapping it must
    // ask, and that is the only place a role question should now appear.
    await page.getByRole('button', { name: /continue with google/i }).click()
    await page.waitForTimeout(1200)
    const after = await controlCount(page)
    ok = check('tapping Google asks which you are', after.rolePickers === 2, `${after.rolePickers} role button(s)`) && ok
    console.log(`  errors: ${errors.filter((e) => !/language-fallback/.test(e)).join(' | ') || 'none'}`)
    await page.screenshot({ path: `${OUT}/td37-google-role.png`, fullPage: true })
    await ctx.close()
  }

  await browser.close()
  console.log(`\nTD-37 OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
