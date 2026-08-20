// TD-19: how many Apply buttons the job detail renders, and where they sit.
const { chromium, LAUNCH, FE, OUT, loginSeeker, jobs, session, allTops } = require('./lib-smoke')

;(async () => {
  const seeker = await loginSeeker()
  const list = await jobs(5)
  const job = list[0]
  console.log(`job: ${job.title} (${job.id})`)

  const browser = await chromium.launch(LAUNCH)

  for (const [name, viewport] of [
    ['phone', { width: 390, height: 840 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const { ctx, page, errors } = await session(browser, seeker, viewport)
    await page.goto(`${FE}/job-details/${job.id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)

    const apply = await allTops(page, 'Apply')
    const applied = await allTops(page, 'Applied')
    const contact = await allTops(page, 'Contact the Recruiter')
    const save = [...(await allTops(page, 'Save')), ...(await allTops(page, 'Saved'))]
    const desc = await allTops(page, 'Job Description')

    console.log(`\n=== ${name} ${viewport.width}x${viewport.height} ===`)
    console.log(`  Apply buttons:      ${apply.length + applied.length} -> ${JSON.stringify([...apply, ...applied])}`)
    console.log(`  Save button:        ${JSON.stringify(save)}`)
    console.log(`  Contact recruiter:  ${JSON.stringify(contact)}`)
    console.log(`  Job Description at: ${JSON.stringify(desc)}`)
    console.log(`  viewport fold:      ${viewport.height}px`)
    console.log(`  ONE APPLY: ${apply.length + applied.length === 1 ? 'PASS' : 'FAIL'}`)
    const first = [...apply, ...applied].sort((a, b) => a.top - b.top)[0]
    if (first) console.log(`  APPLY ABOVE FOLD: ${first.top < viewport.height ? 'PASS' : 'FAIL'} (${first.top}px)`)
    console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`)

    await page.screenshot({ path: `${OUT}/td19-${name}-full.png`, fullPage: true })
    await ctx.close()
  }
  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
