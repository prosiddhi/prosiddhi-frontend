// TD-22 — a job title must be reachable WITHOUT guessing its two parents.
//
// Category → Sector → Job title left two of the three dropdowns dead until the
// one above was answered. Someone who knows they are a welder had no way to know
// that "Welder" lives under a particular category, so the only route was to open
// each category in turn and look. The same cascade repeats on four screens.
//
// The fix is a search box above the three selects. This checks the thing that
// matters: typing a job and picking it fills ALL THREE levels, so the selects
// the search was meant to bypass end up correctly answered rather than bypassed
// and left empty.
//
// ⚠️ Reads the selects' VALUES, not the search box. A picker that showed the
// right suggestion and set nothing would look identical on screen.
//
// Read the PASS/FAIL lines. The exit code is 0 either way.

const { chromium, LAUNCH, FE, BE, loginSeeker, loginEmployer, session } = require('./lib-smoke')

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass++
  else fail++
}

async function open(browser, auth, path) {
  const { ctx, page } = await session(browser, auth, { width: 1280, height: 900 })
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

// The three cascading selects, in DOM order, by their accessible names — which
// TD-39 guaranteed they have.
async function triple(page) {
  const read = async (name) => {
    const el = page.getByRole('combobox', { name, exact: true }).first()
    return (await el.count()) ? el.inputValue() : null
  }
  return {
    category: await read('Category'),
    sector: await read('Sector'),
    jobTitle: await read('Job title'),
  }
}

async function searchAndPick(page, query, index = 0) {
  const box = page.getByRole('textbox', { name: 'Search for a job' })
  await box.fill(query)
  await page.waitForTimeout(500)
  const options = page.locator('ul[id$="-results"] button')
  const n = await options.count()
  if (!n) return { picked: null, count: 0 }
  const label = (await options.nth(index).innerText()).split('\n')[0].trim()
  await options.nth(index).click()
  await page.waitForTimeout(700)
  return { picked: label, count: n }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    // The tree is the source of truth for what SHOULD come back.
    const tree = (await (await fetch(BE + '/categories')).json()).data
    const flat = []
    for (const c of tree) {
      for (const s of c.sectors ?? []) {
        for (const j of s.jobTitles ?? []) flat.push({ jobTitle: j.name, sector: s.name, category: c.name })
      }
    }
    check('the taxonomy tree loaded', flat.length > 0, `${flat.length} job title(s)`)

    // A title that exists under exactly one parent, so the expected answer is
    // unambiguous — picked from the live tree rather than hardcoded.
    const counts = new Map()
    for (const f of flat) counts.set(f.jobTitle, (counts.get(f.jobTitle) ?? 0) + 1)
    const unique = flat.find((f) => counts.get(f.jobTitle) === 1)
    // And one that exists under MORE than one, which is why results show a path.
    const ambiguous = flat.find((f) => counts.get(f.jobTitle) > 1)

    const seeker = await loginSeeker()
    const employer = await loginEmployer()

    // ---- 1. The seeker profile: one search fills all three levels -----------
    {
      const { ctx, page } = await open(browser, seeker, '/profile')
      const before = await triple(page)
      check('the picker is on the page', before.category !== null, JSON.stringify(before))

      const { picked, count } = await searchAndPick(page, unique.jobTitle)
      check(`searching "${unique.jobTitle}" offers it`, count > 0, `${count} result(s)`)
      check('…and the result is the job searched for', picked === unique.jobTitle, JSON.stringify(picked))

      const after = await triple(page)
      // THE POINT OF THE TICKET: all three, from one action.
      check('category was filled in', after.category === unique.category, `${after.category} (want ${unique.category})`)
      check('sector was filled in', after.sector === unique.sector, `${after.sector} (want ${unique.sector})`)
      check('job title was filled in', after.jobTitle === unique.jobTitle, `${after.jobTitle}`)
      await ctx.close()
    }

    // ---- 2. An ambiguous title shows its path, and both routes work ---------
    if (ambiguous) {
      const { ctx, page } = await open(browser, seeker, '/profile')
      const box = page.getByRole('textbox', { name: 'Search for a job' })
      await box.fill(ambiguous.jobTitle)
      await page.waitForTimeout(500)
      const rows = page.locator('ul[id$="-results"] button')
      const n = await rows.count()
      check(`"${ambiguous.jobTitle}" is offered more than once`, n > 1, `${n} result(s)`)

      const paths = []
      for (let i = 0; i < n; i++) paths.push((await rows.nth(i).innerText()).split('\n')[1]?.trim() ?? '')
      // Without the parent path these rows would be the same word twice.
      check('…each with a DIFFERENT parent path', new Set(paths).size === n, paths.join(' / '))

      await rows.nth(1).click()
      await page.waitForTimeout(700)
      const after = await triple(page)
      check(
        'picking the second one sets ITS parents',
        after.jobTitle === ambiguous.jobTitle && `${after.category} › ${after.sector}` === paths[1],
        `${after.category} › ${after.sector}`,
      )
      await ctx.close()
    }

    // ---- 3. The employer job form: the same cascade, the same fix -----------
    {
      const { ctx, page } = await open(browser, employer, '/employer/jobs/new')
      const { count } = await searchAndPick(page, unique.jobTitle)
      check('the job form offers the search too', count > 0, `${count} result(s)`)
      const after = await triple(page)
      check(
        'one search answers the job form category as well',
        after.category === unique.category && after.jobTitle === unique.jobTitle,
        `${after.category} / ${after.sector} / ${after.jobTitle}`,
      )
      await ctx.close()
    }

    // ---- 3b. It must be dismissable, and usable without a mouse -------------
    // The first version had no way to close the list at all: it was keyed off
    // the query alone, so clicking elsewhere or pressing Escape left it hanging
    // over the three selects until the box was emptied by hand.
    //
    // The keyboard checks are why this is NOT marked up as an ARIA combobox.
    // That role promises arrow keys moving through role="option" children via
    // aria-activedescendant; none of that exists here. The results are ordinary
    // buttons, so Tab reaches them and Enter picks one — which is a real
    // contract, and this is what holds us to it.
    {
      const { ctx, page } = await open(browser, seeker, '/profile')
      const list = page.locator('ul[id$="-results"]')
      const box = page.getByRole('textbox', { name: 'Search for a job' })

      await box.fill(unique.jobTitle.slice(0, 3))
      await page.waitForTimeout(400)
      check('typing opens the list', (await list.count()) === 1)

      await page.keyboard.press('Escape')
      await page.waitForTimeout(250)
      check('Escape closes it', (await list.count()) === 0)

      // Escape does not blur, so a focus handler alone could never reopen it.
      await box.click()
      await page.waitForTimeout(300)
      check('clicking the box reopens it', (await list.count()) === 1)

      await page.locator('h1').first().click({ force: true })
      await page.waitForTimeout(400)
      check('clicking away closes it', (await list.count()) === 0)

      await box.click()
      await page.waitForTimeout(400)
      await box.focus()
      await page.keyboard.press('Tab')
      const onButton = await page.evaluate(() => document.activeElement?.tagName)
      check('Tab moves focus into the results', onButton === 'BUTTON', String(onButton))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(600)
      const picked = await triple(page)
      check('Enter picks the focused result', !!picked.jobTitle, JSON.stringify(picked.jobTitle))
      check('…and the list closes after picking', (await list.count()) === 0)
      await ctx.close()
    }

    // ---- 4. The job feed deliberately does NOT get the box ------------------
    // It already has a free-text search that reaches a job by title, through the
    // backend's weighted FTS. Two similarly-labelled search inputs on one screen
    // is worse than the cascade. Asserted so the exclusion is a decision on the
    // record rather than something that looks like an oversight later.
    {
      const { ctx, page } = await open(browser, seeker, '/job-feed')
      await page.getByRole('button', { name: /filter/i }).first().click()
      await page.waitForTimeout(800)
      const boxes = await page.getByRole('textbox', { name: 'Search for a job' }).count()
      check('the job feed filter has no second search box', boxes === 0, `${boxes} found`)
      const cat = await page.getByRole('combobox', { name: 'Category' }).count()
      check('…but still has its category filter', cat > 0, `${cat} found`)
      await ctx.close()
    }

    // ---- 5. The placeholder must FIT, in every language, on a phone ---------
    // It is native script plus a Latin job title — the one string in the product
    // that is designed to switch script mid-sentence, because the taxonomy is
    // English-only (TD-47). Indic text runs 20–30% longer than English, so the
    // Latin tail is what disappears first. Tamil overflowed by 33px at 360 until
    // it was shortened, and nothing but a measurement catches that: a clipped
    // placeholder looks like a shorter placeholder.
    {
      for (const lng of ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']) {
        const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } })
        const page = await ctx.newPage()
        await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
        await page.evaluate(
          ([t, u, l]) => {
            localStorage.setItem('auth_token', t)
            localStorage.setItem('auth_user', JSON.stringify(u))
            localStorage.setItem('preferredLanguage', l)
          },
          [seeker.token, seeker.user, lng],
        )
        await page.goto(FE + '/profile', { waitUntil: 'networkidle', timeout: 120000 })
        await page.waitForTimeout(2000)
        const el = page.locator('input[id$="-search"]').first()
        if (!(await el.count())) {
          check(`${lng}: the search box rendered`, false, 'not found')
          await ctx.close()
          continue
        }
        // Measured against the real computed font, not an estimate.
        const m = await el.evaluate((node) => {
          const cs = getComputedStyle(node)
          const c = document.createElement('canvas').getContext('2d')
          c.font = `${cs.fontSize} ${cs.fontFamily}`
          return {
            ph: node.placeholder,
            text: Math.round(c.measureText(node.placeholder).width),
            avail: Math.round(
              node.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
            ),
          }
        })
        check(
          `${lng}: placeholder fits a 360px phone`,
          m.text <= m.avail,
          `${m.text}/${m.avail}px — ${JSON.stringify(m.ph)}`,
        )
        await ctx.close()
      }
    }

    // ---- 6. A word matching nothing says so, rather than showing an empty box
    {
      const { ctx, page } = await open(browser, seeker, '/profile')
      await page.getByRole('textbox', { name: 'Search for a job' }).fill('zzzznotajob')
      await page.waitForTimeout(500)
      const text = await page.locator('ul[id$="-results"]').innerText()
      check('an unmatched search explains itself', /no job matches/i.test(text), JSON.stringify(text.trim()))
      await ctx.close()
    }
  } catch (err) {
    check('suite ran to completion', false, err.message)
  } finally {
    await browser.close()
    console.log(`\n${pass} passed, ${fail} failed`)
  }
})()
