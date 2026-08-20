// TD-48 — the primary action button must be readable.
//
// `bg-primary-50 text-white` was the product's primary action on every screen,
// seeker and employer alike, and white on the brand sky measures **2.02:1**
// against the 4.5:1 WCAG AA needs for text. It had been shipping for months, and
// it was found only because smoke-td28.js started computing contrast from
// rendered pixels instead of trusting class names.
//
// The fix keeps the sky — it is the brand — and darkens the text to
// `primary-100`: 6.62:1 on the fill, 4.73:1 on the primary-60 hover shade. That
// was chosen over darkening the fill to primary-80 because it is the only option
// where the product still LOOKS like itself.
//
// This walks the real screens and measures every filled button it finds. Nothing
// is asserted from a class name, because a class name is what hid this.
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

const REL_L = (r, g, b) => {
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const parse = (css) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
function contrast(fg, bg) {
  const a = REL_L(...parse(fg))
  const b = REL_L(...parse(bg))
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

// Seeker and employer, because the failing pairing was on both.
const PAGES = [
  ['seeker', '/job-feed'],
  ['seeker', '/profile'],
  ['seeker', '/saved-jobs'],
  ['employer', '/employer'],
  ['employer', '/employer/jobs'],
  ['employer', '/employer/jobs/new'],
  ['employer', '/employer/workers'],
  ['employer', '/employer/plans'],
]

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const who = { seeker: await loginSeeker(), employer: await loginEmployer() }
    let measured = 0
    const failures = []

    for (const [role, path] of PAGES) {
      const { ctx, page } = await session(browser, who[role], { width: 1280, height: 900 })
      await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
      await page.waitForTimeout(1200)

      // Every visible control with a painted background and its own text.
      const rows = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('button, a')) {
          const cs = getComputedStyle(el)
          const bg = cs.backgroundColor
          if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue
          if (!el.getBoundingClientRect().height) continue
          const text = (el.innerText || '').trim()
          if (!text) continue
          // Disabled controls are exempt from the contrast requirement.
          if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue
          out.push({ fg: cs.color, bg, text: text.split('\n')[0].slice(0, 28) })
        }
        return out
      })

      for (const r of rows) {
        measured++
        const ratio = contrast(r.fg, r.bg)
        if (ratio < 4.5) failures.push(`${path} "${r.text}" ${ratio.toFixed(2)}:1`)
      }
      await ctx.close()
    }

    // Loud on the empty case: zero controls scored as "all pass" is how four
    // pages passed while a build was corrupt (see the folder README).
    check('filled controls were found to measure', measured >= 20, `${measured} across ${PAGES.length} pages`)
    check(
      'every filled control clears WCAG AA (4.5:1)',
      failures.length === 0,
      failures.length ? failures.slice(0, 6).join(' | ') + (failures.length > 6 ? ` … +${failures.length - 6}` : '') : `${measured} measured, all pass`,
    )

    // And the specific pairing this ticket is about, named so a regression
    // reads as itself rather than as an anonymous ratio.
    {
      const { ctx, page } = await session(browser, who.employer, { width: 1280, height: 900 })
      await page.goto(FE + '/employer', { waitUntil: 'networkidle', timeout: 120000 })
      await page.waitForTimeout(1000)
      const cta = page.getByRole('link', { name: /post a job/i }).first()
      const c = await cta.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { fg: cs.color, bg: cs.backgroundColor }
      })
      const ratio = contrast(c.fg, c.bg)
      check(
        'the primary action keeps the sky fill',
        parse(c.bg).join(',') === '92,194,237',
        c.bg,
      )
      check('…and its text is readable on it', ratio >= 4.5, `${ratio.toFixed(2)}:1 (${c.fg})`)
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
