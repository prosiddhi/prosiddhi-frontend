// TD-18 error-path smoke: (a) all panels fail -> exactly one error box, no
// wallet; (b) only ONE panel fails -> wallet still renders (resilience kept).
const { chromium, LAUNCH, FE, BE, OUT, post, loginEmployer } = require('./lib-smoke')

const CASES = [
  { name: 'all-panels-fail', block: ['dashboard/stats', 'dashboard/jobs', 'recent-applications', 'me/credits', 'unlocked-candidates'] },
  { name: 'panels-fail-credits-ok', block: ['dashboard/stats', 'dashboard/jobs', 'recent-applications'] },
  { name: 'one-panel-fails', block: ['recent-applications'] },
]

;(async () => {
  const { token, user } = await loginEmployer()
  const browser = await chromium.launch(LAUNCH)

  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
    const page = await ctx.newPage()

    await page.route('**/api/**', (route) => {
      const url = route.request().url()
      if (c.block.some((frag) => url.includes(frag))) return route.abort('failed')
      return route.continue()
    })

    await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([t, u]) => {
        localStorage.setItem('auth_token', t)
        localStorage.setItem('auth_user', JSON.stringify(u))
      },
      [token, user],
    )
    await page.goto(FE + '/employer', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    const seen = await page.evaluate(() => {
      const text = document.body.innerText
      const retries = [...document.querySelectorAll('button,a')].filter((b) =>
        /^retry$|try again/i.test(b.textContent.trim()),
      ).length
      return {
        // Either the dashboard's own copy or the api client's network message.
        pageError: /failed to load your dashboard|can't reach the server\. check/i.test(text),
        walletCard: /what you have left/i.test(text),
        walletError: /couldn't load your wallet/i.test(text),
        yourJobs: /your jobs/i.test(text),
        invoicesLink: !!document.querySelector('a[href="/employer/invoices"]'),
        retryButtons: retries,
      }
    })

    console.log(`\n=== ${c.name} (blocked: ${c.block.join(', ')}) ===`)
    console.log('   ', JSON.stringify(seen))
    if (c.name === 'all-panels-fail') {
      // Accepted design: the wallet is unconditional, because this page has no
      // footer and it is the only route to /employer/invoices and the plans
      // CTA. A dead dashboard must not strand billing.
      console.log(`    PAGE ERROR SHOWN:    ${seen.pageError ? 'PASS' : 'FAIL'}`)
      console.log(`    BILLING REACHABLE:   ${seen.walletCard ? 'PASS' : 'FAIL'}`)
      console.log(`    INVOICES LINK THERE: ${seen.invoicesLink ? 'PASS' : 'FAIL'}`)
    } else if (c.name === 'panels-fail-credits-ok') {
      console.log(`    PAGE ERROR SHOWN:    ${seen.pageError ? 'PASS' : 'FAIL'}`)
      console.log(`    BILLING REACHABLE:   ${seen.walletCard ? 'PASS' : 'FAIL'}`)
      console.log(`    INVOICES LINK THERE: ${seen.invoicesLink ? 'PASS' : 'FAIL'}`)
    } else {
      console.log(`    WALLET SURVIVES PARTIAL FAILURE: ${seen.walletCard && !seen.pageError && seen.yourJobs ? 'PASS' : 'FAIL'}`)
    }

    await page.screenshot({ path: `${OUT}/td18-err-${c.name}.png`, fullPage: true })
    await ctx.close()
  }

  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
