// TD-18 live smoke: employer dashboard section order, against a local full stack
// (FE http://localhost:3210 -> BE http://localhost:5000/api).
const { chromium, LAUNCH, FE, BE, OUT, post, loginEmployer } = require('./lib-smoke')

// Vertical offset of the first element whose text matches, in page coordinates.
async function topOf(page, text) {
  return page.evaluate((needle) => {
    const els = [...document.querySelectorAll('h1,h2,h3,p,span,a,div')]
    const hit = els.find((el) => el.textContent.trim() === needle && el.getBoundingClientRect().height > 0)
    if (!hit) return null
    return Math.round(hit.getBoundingClientRect().top + window.scrollY)
  }, text)
}

;(async () => {
  const { token, user } = await loginEmployer()
  // The cached playwright's bundled chromium build isn't downloaded; drive the
  // real Chrome that is installed on this machine instead.
  const browser = await chromium.launch(LAUNCH)

  for (const [name, viewport] of [
    ['phone', { width: 390, height: 840 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`))
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

    // Seed the session the way AuthContext stores it (api.ts:18-19).
    await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([t, u]) => {
        localStorage.setItem('auth_token', t)
        localStorage.setItem('auth_user', JSON.stringify(u))
      },
      [token, user],
    )

    await page.goto(FE + '/employer', { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Your Jobs', { timeout: 30000 })
    await page.waitForTimeout(1500)

    const marks = {
      'h1 Dashboard': await topOf(page, 'Dashboard'),
      'stat: Total Jobs': await topOf(page, 'Total Jobs'),
      'section: Your Jobs': await topOf(page, 'Your Jobs'),
      'section: Recent Applications': await topOf(page, 'Recent Applications'),
      'wallet: What you have left': await topOf(page, 'What you have left'),
      'card: Unlocked candidates': await topOf(page, 'Unlocked candidates'),
    }

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    console.log(`\n=== ${name} ${viewport.width}x${viewport.height} · page height ${pageHeight}px ===`)
    for (const [k, v] of Object.entries(marks)) console.log(`  ${String(v).padStart(6)}px  ${k}`)
    console.log(`  console errors: ${errors.length ? errors.join(' | ') : 'none'}`)

    // Order assertions
    const w = marks['wallet: What you have left']
    const hiring = Math.max(marks['section: Your Jobs'], marks['section: Recent Applications'])
    const billing = Math.min(
      w ?? Infinity,
      marks['card: Unlocked candidates'] ?? Infinity,
    )
    console.log(`  ORDER: hiring last at ${hiring}px, billing first at ${billing}px -> ${billing > hiring ? 'PASS' : 'FAIL'}`)
    console.log(`  STATS ABOVE WALLET: ${marks['stat: Total Jobs'] < billing ? 'PASS' : 'FAIL'}`)
    console.log(`  WALLET ABOVE UNLOCKED: ${w != null && w < marks['card: Unlocked candidates'] ? 'PASS' : 'FAIL'}`)

    await page.screenshot({ path: `${OUT}/td18-${name}-full.png`, fullPage: true })
    await page.screenshot({ path: `${OUT}/td18-${name}-fold.png` })
    await ctx.close()
  }

  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
