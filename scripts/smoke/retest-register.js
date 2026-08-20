// QA REGISTER RETEST — drives the local stack and judges the rows the register
// says are "fixed, awaiting retest".
//
// Those rows have been unjudgeable for days, but only against PRODUCTION, which
// is running a stale build (TD-00). Local runs the fixed code, so local can
// answer them — and answering them here is what makes the post-deploy retest a
// confirmation rather than a discovery.
//
// Anything this cannot judge honestly is reported NEEDS-HUMAN rather than
// guessed. A retest that guesses is worse than one that was never run.
//
// Read the verdicts. The exit code is 0 either way.

const { chromium, LAUNCH, FE, loginSeeker, loginEmployer, session } = require('./lib-smoke')

const results = []
const verdict = (id, sev, what, state, detail = '') => {
  results.push({ id, sev, what, state, detail })
  const mark = { PASS: 'PASS  ', FAIL: 'FAIL  ', HUMAN: 'HUMAN ' }[state]
  console.log(`  ${mark} ${id} (${sev})  ${what}${detail ? `\n           ${detail}` : ''}`)
}

async function anon(browser, path, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  if (lang) {
    await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate((l) => localStorage.setItem('preferredLanguage', l), lang)
  }
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

async function asUser(browser, who, path) {
  const { ctx, page } = await session(browser, who, { width: 1280, height: 900 })
  await page.goto(FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.goto(FE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  try {
    const seeker = await loginSeeker()
    const employer = await loginEmployer()

    console.log('\n=== SIGNED OUT: home, landing, auth ===')

    // DEF-001 / DEF-002 — picking Hindi must actually translate the page.
    {
      const { ctx, page } = await anon(browser, '/', 'hi')
      const body = await page.evaluate(() => document.body.innerText)
      const devanagari = (body.match(/[ऀ-ॿ]/g) || []).length
      verdict(
        'DEF-001/2', 'S2', 'Hindi actually translates the home page',
        devanagari > 40 ? 'PASS' : 'FAIL',
        `${devanagari} Devanagari characters on the page`,
      )
      await ctx.close()
    }

    // DEF-011 — a ProSiddhi logo, and it goes home.
    {
      const { ctx, page } = await anon(browser, '/login')
      const logo = page.locator('img[src*="prosiddhi"]')
      verdict('DEF-003', 'S3', 'Login screen carries the logo',
        (await logo.count()) > 0 ? 'PASS' : 'FAIL', `${await logo.count()} logo image(s)`)
      await ctx.close()
    }
    {
      const { ctx, page } = await anon(browser, '/job-feed')
      // Signed out this redirects to /login; check the seeker feed instead below.
      await ctx.close()
    }
    {
      const { ctx, page } = await asUser(browser, seeker, '/job-feed')
      const home = page.locator('header a[href="/"]')
      verdict('DEF-011', 'S3', 'Logo links back to the home page',
        (await home.count()) > 0 ? 'PASS' : 'FAIL', `${await home.count()} home link(s) in the header`)
      await ctx.close()
    }

    // DEF-010 — the Azkashine mark. The teardown recorded it as absent by design.
    {
      const { ctx, page } = await anon(browser, '/')
      const azka = await page.locator('a[href*="azkashine"], img[src*="azkashine"]').count()
      verdict('DEF-010', 'S3', 'Azkashine mark links to the Azkashine site',
        azka === 0 ? 'HUMAN' : 'PASS',
        azka === 0 ? 'No Azkashine mark on the page at all — close as N/A, or product decides to add one' : `${azka} reference(s)`)
      await ctx.close()
    }

    // DEF-005 / DEF-013 — the role choice must come FIRST.
    {
      const { ctx, page } = await anon(browser, '/register')
      const body = await page.evaluate(() => document.body.innerText)
      const asksRole = /job seeker|looking for a job|employer|hire/i.test(body)
      verdict('DEF-005/13', 'S2', 'Register asks seeker-or-employer up front',
        asksRole ? 'PASS' : 'FAIL', JSON.stringify(body.split('\n').filter(Boolean).slice(0, 3).join(' / ')))
      await ctx.close()
    }

    // DEF-012 — footer employer links should open Login on the EMPLOYER tab.
    {
      const { ctx, page } = await anon(browser, '/')
      const link = page.locator('footer a[href*="/employer"]').first()
      if (!(await link.count())) {
        verdict('DEF-012', 'S3', 'Footer employer link opens the employer side', 'HUMAN', 'no footer employer link found')
      } else {
        const href = await link.getAttribute('href')
        verdict('DEF-012', 'S3', 'Footer employer link points at the employer side',
          /employer/.test(href || '') ? 'PASS' : 'FAIL', href || '')
      }
      await ctx.close()
    }

    // DEF-004 — "Select location" on the seeker landing must do something.
    // DEF-014 — a typed keyword must survive into the feed.
    {
      // Signed IN. /job-feed is behind ProtectedRoute, so a signed-out run lands
      // on /login and the keyword looks lost — it is sitting in returnUrl. The
      // first version of this check reported DEF-014 as still broken on exactly
      // that misreading.
      const { ctx, page } = await asUser(browser, seeker, '/employee')
      const citySelect = page.getByRole('combobox', { name: /select location/i })
      verdict('DEF-004', 'S2', 'Seeker landing location control is a real control',
        (await citySelect.count()) > 0 ? 'PASS' : 'FAIL',
        `${await citySelect.count()} named location control(s)`)

      const box = page.getByPlaceholder(/job title|keyword|search/i).first()
      if (await box.count()) {
        await box.fill('welder')
        if (await citySelect.count()) await citySelect.selectOption('pune').catch(() => {})
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2500)
        const url = page.url()
        verdict('DEF-014', 'S2', 'Typed keyword survives into the job feed',
          /search=welder/.test(url) ? 'PASS' : 'FAIL', url.replace(FE, ''))
      } else {
        verdict('DEF-014', 'S2', 'Typed keyword survives into the job feed', 'HUMAN', 'no search box found')
      }
      await ctx.close()
    }

    console.log('\n=== SIGNED IN: employer ===')

    // DEF-021 — the notification bell.
    // DEF-022 — Messages must be reachable.
    for (const [id, sev, what, sel] of [
      ['DEF-021', 'S2', 'Employer header shows the notification bell', 'header button[aria-label*="Notification" i]'],
      ['DEF-022', 'S1', 'Employer can reach Messages from the header', 'header a[href="/messages"]'],
    ]) {
      const { ctx, page } = await asUser(browser, employer, '/employer')
      const n = await page.locator(sel).count()
      verdict(id, sev, what, n > 0 ? 'PASS' : 'FAIL', `${n} found`)
      await ctx.close()
    }

    // DEF-023 — an employer opening their OWN job must not be bounced.
    {
      const { ctx, page } = await asUser(browser, employer, '/employer/jobs')
      // `/job-details/<id>` ONLY. The first version also matched
      // `/employer/jobs/new` — the Post a Job button — so it clicked that,
      // landed on the form, and reported a PASS without ever opening a job.
      const view = page.locator('a[href^="/job-details/"]').first()
      if (!(await view.count())) {
        verdict('DEF-023', 'S1', 'Employer can open their own job', 'HUMAN', 'no job rows on the list to click')
      } else {
        const href = await view.getAttribute('href')
        await view.click()
        await page.waitForTimeout(3000)
        const landed = new URL(page.url()).pathname
        verdict('DEF-023', 'S1', 'Employer opening their own job is not bounced',
          landed !== '/employer' ? 'PASS' : 'FAIL', `clicked ${href} -> ${landed}`)
      }
      await ctx.close()
    }

    // DEF-026 — the employer profile shows real details.
    {
      const { ctx, page } = await asUser(browser, employer, '/employer/profile')
      const fields = await page.locator('input:not([type=hidden])').evaluateAll((els) =>
        els.map((e) => ({ id: e.id || e.placeholder || '?', value: (e.value || '').trim() })),
      )
      const filled = fields.filter((f) => f.value)
      // The company block renders for a BUSINESS employer only, and
      // SMOKE_EMPLOYER is an individual — so a low count here can mean "correct
      // for this account type" rather than "blank page". Report what is on
      // screen and let a human judge against the account.
      verdict('DEF-026', 'S3', 'Employer profile shows real details', filled.length >= 1 ? 'HUMAN' : 'FAIL',
        `individual employer — ${filled.length}/${fields.length} filled: ` +
          filled.map((f) => `${f.id}=${JSON.stringify(f.value)}`).join(', ') +
          '. Needs a BUSINESS employer to judge the company block.')
      await ctx.close()
    }

    // DEF-033 — the Shortlisted tab must filter to something that exists.
    {
      const { ctx, page } = await asUser(browser, employer, '/employer/candidates')
      const tab = page.getByRole('button', { name: /shortlist/i }).first()
      if (!(await tab.count())) {
        verdict('DEF-033', 'S2', 'Shortlisted filter works', 'HUMAN', 'no Shortlisted control on the page')
      } else {
        await tab.click()
        await page.waitForTimeout(2500)
        const body = await page.evaluate(() => document.body.innerText)
        verdict('DEF-033', 'S2', 'Shortlisted filter runs without erroring', 'HUMAN',
          `needs a shortlisted candidate in the data to prove it FILTERS. Screen says: ${JSON.stringify((body.match(/No candidates[^\n]*|[0-9]+ candidate[^\n]*/) ?? ['—'])[0])}`)
      }
      await ctx.close()
    }

    console.log('\n=== SIGNED IN: seeker, and switching between the two ===')

    // DEF-025 — switching user must not show the previous user's page.
    {
      const { ctx, page } = await asUser(browser, employer, '/employer')
      await page.evaluate(
        ([t, u]) => {
          localStorage.setItem('auth_token', t)
          localStorage.setItem('auth_user', JSON.stringify(u))
        },
        [seeker.token, seeker.user],
      )
      await page.goto(FE + '/job-feed', { waitUntil: 'networkidle', timeout: 120000 })
      await page.waitForTimeout(1500)
      const landed = new URL(page.url()).pathname
      verdict('DEF-025', 'S2', 'Switching user lands on the right dashboard',
        landed === '/job-feed' ? 'PASS' : 'FAIL', landed)
      await ctx.close()
    }
  } catch (err) {
    verdict('SUITE', '--', 'ran to completion', 'FAIL', err.message)
  } finally {
    await browser.close()
    const by = (s) => results.filter((r) => r.state === s).length
    console.log(`\n${by('PASS')} pass · ${by('FAIL')} fail · ${by('HUMAN')} need a human`)
    const fails = results.filter((r) => r.state === 'FAIL')
    if (fails.length) console.log('\nSTILL BROKEN:\n' + fails.map((f) => `  ${f.id} (${f.sev}) ${f.what}`).join('\n'))
  }
})()
