// TD-20: interactive controls under the 44px minimum tap target.
const { chromium, LAUNCH, FE, loginSeeker, session } = require('./lib-smoke')

const PAGES = ['/my-applications', '/saved-jobs', '/messages', '/login', '/job-feed', '/profile']

;(async () => {
  const seeker = await loginSeeker()
  const browser = await chromium.launch(LAUNCH)
  let grand = { total: 0, small: 0 }

  for (const path of PAGES) {
    const { ctx, page } = await session(browser, seeker, { width: 390, height: 840 })
    // Dev compiles a route on first hit; visit once to warm, then measure.
    await page.goto(FE + path, { waitUntil: 'domcontentloaded', timeout: 240000 })
    await page.waitForTimeout(2500)
    await page.goto(FE + path, { waitUntil: 'domcontentloaded', timeout: 240000 })
    await page.waitForTimeout(2000)

    const r = await page.evaluate(() => {
      const sel = 'button,a,input,select,textarea,[role="button"],[role="link"]'
      const small = []
      let total = 0
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect()
        if (b.width === 0 || b.height === 0) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        if (el.closest('[aria-hidden="true"]')) continue
        if (el.type === 'hidden') continue
        total++
        // A text link whose height already clears 44 is fine: its width is
        // just the width of the words, and WCAG exempts inline text from the
        // target-size rule. Icon-only controls have no text, so they still
        // have to be 44 in BOTH directions.
        const isTextLink = el.tagName === 'A' && (el.textContent || '').trim().length > 0
        // A checkbox or radio is 16px by definition. What has to be 44 is the
        // label row wrapping it, which is where the tap actually lands.
        if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
          const row = el.closest('label')
          if (row && row.getBoundingClientRect().height >= 43.5) continue
        }
        const tooSmall = b.height < 43.5 || (b.width < 43.5 && !isTextLink)
        if (tooSmall) {
          small.push({
            tag: el.tagName.toLowerCase(),
            label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
            w: Math.round(b.width),
            h: Math.round(b.height),
          })
        }
      }
      return { total, small }
    })

    grand.total += r.total
    grand.small += r.small.length
    const note = r.total === 0 ? '   <-- PAGE RENDERED NO CONTROLS, not a pass' : ''
    console.log(`  ${path.padEnd(18)} ${String(r.small.length).padStart(3)}/${String(r.total).padStart(3)} under 44px${note}`)
    for (const s of r.small.slice(0, 8)) {
      console.log(`        ${s.tag.padEnd(8)} ${String(s.w).padStart(4)}x${String(s.h).padStart(3)}  ${s.label}`)
    }
    await ctx.close()
  }

  console.log(`\n  TOTAL: ${grand.small}/${grand.total} under 44px`)
  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
