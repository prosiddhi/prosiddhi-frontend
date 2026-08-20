// TD-45 — pressing Post must ANNOUNCE the problem and go to it.
//
// The job form's validation error was a plain <div>: painted red for sighted
// users and invisible to everyone else. A screen-reader user pressed Post, heard
// nothing, and kept focus on the button with no idea the form had refused. Once
// TD-39 gave every field on that form a name, this was the largest hole left.
//
// Three things, and the second is the one that turns a message into a fix:
//   1. the error is inside a live region, mounted BEFORE the message arrives —
//      a region created together with its first content announces neither
//      (the trap TD-41 documented and TD-22 then re-committed)
//   2. focus MOVES to the offending control, so the employer is put on the box
//      to fix rather than told that something somewhere is wrong
//   3. that control is marked aria-invalid, so it says so when reached again
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

async function open(browser, employer) {
  const { ctx, page } = await session(browser, employer, { width: 1280, height: 900 })
  await page.goto(FE + '/employer/jobs/new', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + '/employer/jobs/new', { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

const post = (page) =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.className.includes('bg-primary-50') && !x.disabled && x.offsetParent !== null,
    )
    if (b) b.click()
  })

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const employer = await loginEmployer()

    // ---- 1. The live region exists BEFORE anything goes wrong ---------------
    {
      const { ctx, page } = await open(browser, employer)
      const region = page.locator('[role="alert"]')
      check(
        'the alert region is in the DOM on a clean form',
        (await region.count()) >= 1,
        `${await region.count()} region(s)`,
      )
      check('…and is silent', ((await region.first().innerText()) || '').trim() === '')
      await ctx.close()
    }

    // ---- 2. Submitting an empty form announces, and moves focus ------------
    {
      const { ctx, page } = await open(browser, employer)
      await post(page)
      await page.waitForTimeout(800)

      const spoken = ((await page.locator('[role="alert"]').first().innerText()) || '').trim()
      check('pressing Post fills the alert region', spoken !== '', JSON.stringify(spoken))

      // The real fix: the employer is put ON the field, not told about it.
      const focused = await page.evaluate(() => document.activeElement?.id ?? '')
      check('focus moves to the offending control', focused === 'job-title', `focus on ${JSON.stringify(focused)}`)
      check(
        '…and that control is marked invalid',
        (await page.locator('#job-title').getAttribute('aria-invalid')) === 'true',
      )
      await ctx.close()
    }

    // ---- 3. It tracks the NEXT problem, not just the first ------------------
    // A form that always blames the title would be worse than useless once the
    // title is filled in.
    {
      const { ctx, page } = await open(browser, employer)
      await page.locator('#job-title').fill('Warehouse packer needed')
      // Category comes next and lives in TaxonomyPicker, whose ids are generated
      // — that case announces without moving focus, deliberately. Fill it so the
      // run reaches a field that CAN be focused.
      const selects = page.locator('select')
      const values = await selects
        .first()
        .locator('option')
        .evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
      if (values.length) await selects.first().selectOption(values[0])
      await page.waitForTimeout(600)

      await post(page)
      await page.waitForTimeout(800)
      const focused = await page.evaluate(() => document.activeElement?.id ?? '')
      check(
        'the next problem moves focus to ITS field',
        focused === 'job-description',
        `focus on ${JSON.stringify(focused)}`,
      )
      check(
        '…and the title is no longer marked invalid',
        (await page.locator('#job-title').getAttribute('aria-invalid')) !== 'true',
      )
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
