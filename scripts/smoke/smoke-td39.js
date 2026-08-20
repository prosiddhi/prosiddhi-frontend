// TD-39 — every form control a screen reader can reach must have a NAME.
//
// The gap this guards is specific and quiet. `b46301a` (DEF-024) put
// `aria-required` on the job form's mandatory controls, which was right — but
// the labels sat NEXT TO the controls rather than pointing at them, and a
// `<select>` has no placeholder to fall back on. So a screen reader announced
// "combo box, required" with no field name at all: the fix made an existing gap
// audible rather than creating one.
//
// ⚠️ The name is taken from the BROWSER, never computed here. `ariaSnapshot()`
// returns Chrome's own role tree — `- combobox "Category"` when a control is
// named, a bare `- combobox` when it is not. The first draft of this file
// hand-rolled the lookup instead and got it wrong four ways: it read
// `aria-labelledby` last when the spec reads it first, treated that attribute as
// a single id when it is a space-separated list, counted the `aria-hidden`
// asterisk as part of the name, and ignored the placeholder fallback that Chrome
// does apply to text inputs. A check written as the tie-breaker has to use the
// real algorithm.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, loginSeeker, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

// The roles a form control shows up as. `button` and `link` are deliberately
// out: they take their name from their own text, which is a different problem.
const CONTROL_ROLES = ['combobox', 'textbox', 'spinbutton', 'checkbox', 'radio']

// Every control in the page's role tree, named or not.
//
// A line is `- combobox "Category"` or `- combobox`. Anything with a quoted
// string has a name; anything without does not. Chrome decided which.
function controlsIn(snapshot) {
  const named = []
  const unnamed = []
  for (const raw of snapshot.split('\n')) {
    const line = raw.trim().replace(/^-\s*/, '')
    const role = CONTROL_ROLES.find((r) => line === r || line.startsWith(`${r} `) || line.startsWith(`${r}:`))
    if (!role) continue
    const name = line.match(/"((?:[^"\\]|\\.)*)"/)?.[1]
    if (name) named.push({ role, name })
    else unnamed.push({ role, line })
  }
  return { named, unnamed }
}

async function auditPage(browser, auth, path, title) {
  console.log(`\n=== ${title} (${path}) ===`)
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  // Twice, like smoke-td20.js. The dev server compiles a route on first hit and
  // the README records /employer/jobs/new — the first page this audits — sitting
  // at "Compiling…" past 90 seconds. One goto with a 20s wait would audit a
  // blank page and report every control as absent rather than unnamed.
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

// Assert on one page's controls. `expect` names controls that must resolve.
async function assertNamed(page, expect) {
  const { named, unnamed } = controlsIn(await page.locator('body').ariaSnapshot())

  // Loud on the empty case, per the folder's README: zero controls scored as
  // "all named" is how four pages passed while the dev build was corrupt.
  check(
    'the page rendered its controls',
    named.length + unnamed.length >= expect.length,
    `${named.length + unnamed.length} control(s)`,
  )
  check(
    'every control has an accessible name',
    unnamed.length === 0,
    unnamed.map((u) => u.role).join(', ') || 'all named',
  )
  for (const want of expect) {
    // Substring, because a name legitimately carries a hint span — the job
    // form's description label is "Description (min 50 chars)".
    const hit = named.find((n) => n.name.includes(want))
    check(`"${want}" resolves to a named control`, !!hit, hit ? `${hit.role} "${hit.name}"` : 'NOT FOUND')
  }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const employer = await loginEmployer()
    const seeker = await loginSeeker()

    // 1. The job form — the screen DEF-024 touched. The five it marks mandatory.
    {
      const { ctx, page } = await auditPage(browser, employer, '/employer/jobs/new', 'employer job form')
      await assertNamed(page, ['Job Post Headline', 'Category', 'Location', 'Description', 'Job Type'])
      await ctx.close()
    }

    // 2. The job feed — the city select the TD-06 review caught with no label at
    //    all, while the identical control on /employee had one.
    {
      const { ctx, page } = await auditPage(browser, seeker, '/job-feed', 'seeker job feed')
      await page.getByRole('button', { name: /filter/i }).first().click()
      await page.waitForTimeout(800)
      await assertNamed(page, ['Select location', 'Job title or keyword', 'Job Type', 'Sort By', 'Category'])
      await ctx.close()
    }

    // 3. The seeker profile — 8 controls behind the shared Field wrapper, four of
    //    them inside the work-experience loop, so this also proves Field's useId
    //    survives being rendered more than once.
    {
      const { ctx, page } = await auditPage(browser, seeker, '/profile', 'seeker profile')
      await assertNamed(page, ['Full Name', 'Location', 'Preferred Language', 'About You', 'Category', 'Document type'])
      await ctx.close()
    }

    // 4. The employer profile — the other copy of that wrapper. It carried the
    //    same defect because it was a byte-identical duplicate.
    //
    //    Only the two contact fields are asserted. The company block (name,
    //    email, size, GST, registration number) renders for a BUSINESS employer
    //    only, and SMOKE_EMPLOYER is an individual — asserting those here fails
    //    on a conditional branch rather than on a missing name, which is a check
    //    that lies about what it found.
    {
      const { ctx, page } = await auditPage(browser, employer, '/employer/profile', 'employer profile')
      await assertNamed(page, ['Full Name', 'Designation', 'Document type'])
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
