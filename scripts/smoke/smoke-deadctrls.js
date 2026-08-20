// Every interactive control on a page should either navigate or have a
// handler. Reports the ones that do neither.
const { chromium, LAUNCH, FE } = require('./lib-smoke')

const PAGES = ['/employee', '/', '/employer/welcome']

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.setItem('preferredLanguage', 'en'))
    await page.goto(FE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // A bare <button> with no React onClick has no listener registered. React
    // 18 attaches at the root, so probe the fiber props instead.
    const dead = await page.evaluate(() => {
      const out = []
      for (const b of document.querySelectorAll('button')) {
        if (b.getBoundingClientRect().height === 0) continue
        if (b.closest('[aria-hidden="true"]')) continue
        if (b.type === 'submit') continue
        const key = Object.keys(b).find((k) => k.startsWith('__reactProps$'))
        const props = key ? b[key] : null
        const hasHandler = !!(props && (props.onClick || props.onMouseDown || props.onPointerDown))
        if (!hasHandler) out.push((b.textContent || '').trim().slice(0, 40) || '(no text)')
      }
      return out
    })

    console.log(`  ${dead.length === 0 ? 'PASS' : 'FAIL'}  ${path.padEnd(20)} dead buttons: ${dead.length ? dead.join(' | ') : 'none'}`)
    await ctx.close()
  }
  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
