// TD-14: no page should still tell visitors the product is a preview.
const { chromium, LAUNCH, FE, OUT } = require('./lib-smoke')

const CLAIMS = [
  /on the way/i,
  /in development/i,
  /Download our App/i,
  /App Store/i,
  /Google Play/i,
]

const PAGES = ['/', '/employee', '/employer/welcome', '/job-feed', '/login']

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let failures = 0

  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
    const page = await ctx.newPage()
    await page.goto(FE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const text = await page.evaluate(() => document.body.innerText)
    const hits = CLAIMS.filter((re) => re.test(text)).map(String)
    const ok = hits.length === 0
    if (!ok) failures++
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${path.padEnd(20)} ${ok ? '' : hits.join(' ')}`)
    if (path === '/' || path === '/employee') {
      await page.screenshot({ path: `${OUT}/td14${path.replace(/\//g, '-') || '-home'}.png`, fullPage: true })
    }
    await ctx.close()
  }

  console.log(`\n  NO PREVIEW CLAIMS ANYWHERE: ${failures === 0 ? 'PASS' : 'FAIL'}`)
  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
