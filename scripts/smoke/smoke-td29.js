// TD-29 — the role choice must be ON the home page, not behind a door.
//
// "I'm a job seeker / I'm an employer" already existed and was the best thing on
// the site — the same pair mobile's welcome screen leads with. But it was step 2
// of a wizard: a visitor had to pick a language and press Continue before being
// shown the question the site is actually asking. Nobody scrolling the home page
// saw it.
//
// The checks that matter are the ones a screenshot cannot fake:
//
//   1. Both cards are present and VISIBLE on first paint, with no interaction.
//      That is the entire ticket — the old build would fail this, because the
//      cards were not in the DOM until Continue was pressed.
//   2. Each one actually navigates, and to the right half of the product.
//   3. The language switch still switches, and the cards translate with it —
//      it moved from a gate to a control beside them, and a switch that no
//      longer switches would be a silent regression.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

// Signed out, on a phone. This is a first-visit screen.
async function home(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  if (lang) {
    await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate((l) => localStorage.setItem('preferredLanguage', l), lang)
  }
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + '/', { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

const seekerCard = (page) => page.getByRole('button', { name: /Looking for a Job/i })
const employerCard = (page) => page.getByRole('button', { name: /Looking to Hire/i })

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    // ---- 1. Visible immediately, no interaction ----------------------------
    {
      const { ctx, page } = await home(browser)
      const s = await seekerCard(page).count()
      const e = await employerCard(page).count()
      check('the seeker card is on the page unprompted', s === 1, `${s} found`)
      check('the employer card is on the page unprompted', e === 1, `${e} found`)

      if (s && e) {
        check('both are visible', (await seekerCard(page).isVisible()) && (await employerCard(page).isVisible()))

        // How far down they sit. Not asserted as "above the fold" — the hero
        // legitimately comes first — but printed, because "unburied" is a claim
        // about distance and a number is the only honest form of it.
        const top = Math.round((await seekerCard(page).boundingBox()).y + (await page.evaluate(() => window.scrollY)))
        const screens = (top / 844).toFixed(2)
        check('reachable within two screens of scrolling', top < 844 * 2, `first card at ${top}px = ${screens} screens`)
      }

      // The old wizard's Continue/Get Started/Back are gone. If any survive, the
      // gate survived with them.
      for (const gone of ['Get Started', 'Continue']) {
        const n = await page.getByRole('button', { name: new RegExp(`^${gone}$`, 'i') }).count()
        check(`no "${gone}" gate remains`, n === 0, `${n} found`)
      }
      await ctx.close()
    }

    // ---- 2. Each card goes to the right half of the product ----------------
    for (const [label, card, expected] of [
      ['seeker', seekerCard, '/employee'],
      ['employer', employerCard, '/employer/welcome'],
    ]) {
      const { ctx, page } = await home(browser)
      await card(page).click()
      await page.waitForURL(`**${expected}`, { timeout: 30000 }).catch(() => {})
      const url = new URL(page.url()).pathname
      check(`the ${label} card lands on ${expected}`, url === expected, url)
      // The old flow also recorded the choice; keep that contract.
      const stored = await page.evaluate(() => localStorage.getItem('userType'))
      check(`…and remembers the ${label} choice`, !!stored, JSON.stringify(stored))
      await ctx.close()
    }

    // ---- 3. The language control still switches the page -------------------
    {
      const { ctx, page } = await home(browser, 'ta')
      const tamil = await seekerCard(page).count()
      // The label is translated, so the English matcher must MISS in Tamil.
      check('the cards translate with the language', tamil === 0, `English matcher found ${tamil} in Tamil`)

      // Two role buttons should still be there, just named in Tamil.
      const cards = await page.locator('section button[class*="min-h-[112px]"]').count()
      check('…and there are still two of them', cards === 2, `${cards} found`)
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
