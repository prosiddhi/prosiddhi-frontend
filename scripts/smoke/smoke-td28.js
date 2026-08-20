// TD-28 — the employer area must look like its own place, from ONE component.
//
// Employer and seeker were the same product: same primary, same logo, same bar,
// same cards. The only difference on the header was a button. And the header
// itself was hand-copied into twelve pages, which is not merely duplication — it
// is the mechanism by which one copy rots. `/employee` did exactly that: the
// seeker header moved to <Link>, its inline duplicate did not, and six dead
// buttons shipped (bf32f3d).
//
// Two things are checked, and the second is the one that would silently regress:
//
//   1. Every employer page renders the SAME header — same border, same colour —
//      so a thirteenth page cannot quietly grow its own.
//   2. The header's text passes WCAG AA contrast. The outline links were
//      `text-primary-50`, the brand sky, which is 1.9:1 on white — a real
//      failure that had been shipping. primary-90 is ~9:1. Contrast is computed
//      from the RENDERED colours, not asserted from the class names, because a
//      class name proves nothing about what the browser painted.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, loginEmployer, loginSeeker, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

// Every authenticated employer page. `/employer/welcome` is deliberately absent:
// it is the public marketing page, has no account controls, and is not part of
// the signed-in area this ticket unifies.
const EMPLOYER_PAGES = [
  '/employer',
  '/employer/jobs',
  '/employer/jobs/new',
  '/employer/candidates',
  '/employer/workers',
  '/employer/team',
  '/employer/plans',
  '/employer/profile',
  '/employer/invoices',
]

// WCAG relative luminance, then the contrast ratio. Written out rather than
// eyeballed from hex, because "dark teal looks fine" is what shipped 1.9:1.
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

async function open(browser, auth, path) {
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1000)
  return { ctx, page }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const employer = await loginEmployer()
    const seeker = await loginSeeker()

    // ---- 1. One header, identical on every employer page -------------------
    const seen = new Map()
    for (const path of EMPLOYER_PAGES) {
      const { ctx, page } = await open(browser, employer, path)
      const header = page.locator('header').first()
      if (!(await header.count())) {
        check(`${path}: has a header`, false, 'none found')
        await ctx.close()
        continue
      }
      const style = await header.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { border: cs.borderBottomColor, width: cs.borderBottomWidth, bg: cs.backgroundColor }
      })
      seen.set(path, `${style.border} / ${style.width}`)
      await ctx.close()
    }
    const distinct = new Set(seen.values())
    check(
      'every employer page renders the same header treatment',
      distinct.size === 1,
      distinct.size === 1
        ? `${seen.size} pages, all ${[...distinct][0]}`
        : [...seen.entries()].map(([p, v]) => `${p}=${v}`).join(' | '),
    )

    // ---- 2. The accent is actually a different colour from the seeker's ----
    {
      const { ctx, page } = await open(browser, seeker, '/job-feed')
      const seekerBorder = await page
        .locator('header')
        .first()
        .evaluate((el) => getComputedStyle(el).borderBottomColor)
      await ctx.close()
      const employerBorder = [...distinct][0]?.split(' / ')[0]
      check(
        'the employer header does NOT match the seeker header',
        !!employerBorder && employerBorder !== seekerBorder,
        `employer ${employerBorder} vs seeker ${seekerBorder}`,
      )
    }

    // ---- 3. Contrast, measured on the rendered pixels -----------------------
    // The dashboard is the only page with outline links in the header, so it is
    // the one that carried the failure.
    {
      const { ctx, page } = await open(browser, employer, '/employer')
      const links = page.locator('header a[href^="/employer/"]')
      const n = await links.count()
      check('the dashboard header has its action links', n >= 2, `${n} link(s)`)

      const measured = []
      for (let i = 0; i < n; i++) {
        const el = links.nth(i)
        if (!(await el.isVisible())) continue
        const c = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          // Walk up for the painted background: an outline link is transparent.
          let bg = cs.backgroundColor
          let p = node.parentElement
          while (p && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
            bg = getComputedStyle(p).backgroundColor
            p = p.parentElement
          }
          return {
            fg: cs.color,
            bg,
            filled: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent',
            text: node.innerText.trim().split('\n')[0],
          }
        })
        measured.push({ ...c, ratio: contrast(c.fg, c.bg) })
      }

      // What THIS ticket changed: the outline links, sky → dark teal.
      const outlines = measured.filter((m) => !m.filled)
      const worstOutline = outlines.reduce((w, m) => (!w || m.ratio < w.ratio ? m : w), null)
      check(
        'the outline header actions clear WCAG AA (4.5:1)',
        !!worstOutline && worstOutline.ratio >= 4.5,
        worstOutline
          ? `worst: "${worstOutline.text}" ${worstOutline.ratio.toFixed(2)}:1`
          : 'none measured',
      )

      // The solid primary button is NOT this ticket's to change — the same style
      // is the product's primary action everywhere, seeker screens included, so
      // repainting it is a brand decision across the whole scale (TD-48).
      // Measured and printed anyway: a known failure that nobody can see the
      // size of is a failure that never gets fixed. Deliberately not a FAIL —
      // a permanently red line is one people learn to scroll past.
      for (const m of measured.filter((x) => x.filled)) {
        const verdict = m.ratio >= 4.5 ? 'passes' : 'FAILS AA — known, TD-48'
        console.log(`  ⚠️  solid CTA "${m.text}": ${m.ratio.toFixed(2)}:1 ${verdict}`)
      }
      await ctx.close()
    }

    // ---- 4. Nothing lost in the extraction ---------------------------------
    // The header carries the account controls on every page; losing them on one
    // is exactly the DEF-021/022 shape (built, but unreachable).
    {
      let missing = []
      for (const path of ['/employer', '/employer/jobs', '/employer/invoices']) {
        const { ctx, page } = await open(browser, employer, path)
        const hasLogo = await page.locator('header a[href^="/employer"] img').count()
        const hasAccount = await page.locator('header').getByRole('button', { name: /account/i }).count()
        if (!hasLogo || !hasAccount) missing.push(`${path}(logo=${hasLogo},account=${hasAccount})`)
        await ctx.close()
      }
      check('logo and account controls survive on every page', missing.length === 0, missing.join(' ') || 'all present')
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
