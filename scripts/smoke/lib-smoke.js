// Shared helpers for the teardown smoke scripts. See README.md in this folder.
//
// These drive a real browser against a real local full stack. They are not unit
// tests and they are not run by CI — they exist so a claim like "the wallet is
// below the jobs now" or "0 of 118 controls are under 44px" can be re-checked
// by anyone, instead of being taken on trust from a commit message.

// Playwright is not a dependency of this app, so resolve it leniently:
//   1. a normal install (npm i -D playwright)
//   2. PLAYWRIGHT_PATH, if you have it somewhere else
//   3. whatever `npx playwright` left in the npx cache
function loadPlaywright() {
  const tried = []
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_PATH,
    'playwright-core',
  ].filter(Boolean)
  for (const c of candidates) {
    try {
      return require(c)
    } catch (e) {
      tried.push(c)
    }
  }
  throw new Error(
    'Could not load playwright. Install it (npm i -D playwright) or set ' +
      'PLAYWRIGHT_PATH to a checkout. Tried: ' + tried.join(', '),
  )
}

const { chromium } = loadPlaywright()

// Override with SMOKE_FE / SMOKE_BE when your ports differ.
const FE = process.env.SMOKE_FE || 'http://localhost:3000'
const BE = process.env.SMOKE_BE || 'http://localhost:5000/api'
const OUT = process.env.SMOKE_OUT || require('os').tmpdir()

// Seeded on the LOCAL database — see README. Registered without an email, so
// the phone IS the identifier.
const SEEKER_PHONE = process.env.SMOKE_SEEKER_PHONE || '+919876500019'
const SEEKER_PASSWORD = process.env.SMOKE_SEEKER_PASSWORD || 'Demo@12345'
const EMPLOYER = {
  identifier: process.env.SMOKE_EMPLOYER || 'demo.employer@prosiddhi.test',
  password: process.env.SMOKE_EMPLOYER_PASSWORD || 'Demo@12345',
}

// Chrome, not the bundled chromium: the bundled build is often not downloaded
// on a machine where playwright came in via npx.
const LAUNCH = { channel: process.env.SMOKE_BROWSER || 'chrome' }

async function post(path, body) {
  const res = await fetch(BE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function loginEmployer() {
  const j = await post('/employers/login', EMPLOYER)
  if (!j.success) throw new Error('employer login failed: ' + JSON.stringify(j))
  return j.data
}

// Phone + password (login arm 3). Preferred over phone+OTP because repeated
// smoke runs trip the OTP rate limiter (5 per 15 min) and then every later
// suite fails for a reason that has nothing to do with what it is testing.
async function loginSeeker() {
  const j = await post('/jobseekers/login', { identifier: SEEKER_PHONE, password: SEEKER_PASSWORD })
  if (j.success) return j.data
  // Fall back to OTP. Needs EXPOSE_OTP_IN_RESPONSE=true on the backend.
  const sent = await post('/auth/login-phone-send', { phoneNumber: SEEKER_PHONE })
  const otp = sent?.data?.otp
  if (!otp) throw new Error('seeker login failed: ' + JSON.stringify(j) + ' / ' + JSON.stringify(sent))
  const k = await post('/jobseekers/login', { identifier: SEEKER_PHONE, otp })
  if (!k.success) throw new Error('seeker OTP login failed: ' + JSON.stringify(k))
  return k.data
}

async function jobs(limit = 5) {
  const res = await fetch(`${BE}/jobs?page=1&limit=${limit}`)
  const j = await res.json()
  return j.data.jobs
}

// A page with the session already in localStorage, plus error collection.
// Keys match src/lib/api.ts (AUTH_TOKEN_KEY / AUTH_USER_KEY).
async function session(browser, { token, user }, viewport) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`))
  await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([t, u]) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
    },
    [token, user],
  )
  return { ctx, page, errors }
}

// Every element whose trimmed text equals `needle`, with its page-space top.
async function allTops(page, needle) {
  return page.evaluate((n) => {
    return [...document.querySelectorAll('button,a,h1,h2,h3,p,span')]
      .filter((el) => el.textContent.trim() === n && el.getBoundingClientRect().height > 0)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        top: Math.round(el.getBoundingClientRect().top + window.scrollY),
      }))
  }, needle)
}

module.exports = {
  chromium,
  LAUNCH,
  FE,
  BE,
  OUT,
  post,
  loginEmployer,
  loginSeeker,
  jobs,
  session,
  allTops,
}
