// Responsive + navigation check for the three public landing pages: `/`, `/employee`
// and `/employer/welcome`, all of which render the shared PublicHeader.
//
// Why it measures boxes and not just scroll width: the header used to be `fixed`, so a
// button pushed off the right edge never produced a page scrollbar —
// `scrollWidth === clientWidth` passed while Sign In was unreachable. That is exactly
// what Tamil and Malayalam did on /employer/welcome. So every header control's
// BOUNDING BOX is checked against the viewport.
//
//   node smoke-responsive-landing.js
//   SMOKE_LANGS=en,ta node smoke-responsive-landing.js
//   SMOKE_VIEWPORTS=320x720,768x1024 node smoke-responsive-landing.js
//   SMOKE_ROUTES=/employer/welcome node smoke-responsive-landing.js
//
// Needs the portal running (SMOKE_FE). It never logs in, submits a form or changes data.
// Registration return-to-job is NOT covered here (it needs an account): see
// scripts/verify-pending-return.mjs.
const { chromium, LAUNCH, FE, jobs } = require('./lib-smoke')

const LANGS = (process.env.SMOKE_LANGS || 'en,ta,hi,ml').split(',')
const VIEWPORTS = (
  process.env.SMOKE_VIEWPORTS || '320x720,360x800,390x844,430x932,640x900,768x1024,1023x768,1024x768,1280x800,1440x900'
)
  .split(',')
  .map((v) => v.split('x').map(Number))
// '/job-details' stands for a logged-out job page; it needs one real job id from the API.
const ROUTES = (process.env.SMOKE_ROUTES || '/,/employee,/employer/welcome,/job-details').split(',')

const MIN_TARGET = 44

// What the Menu (below 1024px) must list, in order, per page. Mirrors src/lib/publicNav.ts
// (Register is last). "Companies" going to the employer landing page is deliberate.
// The job page's Register carries the job (`returnUrl`), filled in once the job id is known.
const MENU_HREFS = {
  '/': ['/employee#jobs', '/employer/welcome', '/register'],
  '/employee': ['/employee#jobs', '/employer/welcome', '/employer/welcome', '/register'],
  '/employer/welcome': ['#offer', '#hero', '/contact', '/employer/register'],
  '/job-details': ['/employee#jobs', '/employer/welcome', '/employer/welcome', null],
}
// The icons the old headers had on the full bar, in source order (nav, Register, Login). They show
// from 1280px up only; `/employer/welcome` only ever had one (Help). Register / Login carry a
// `?returnUrl` on a job page, so hrefs are compared without their query.
const ICON_HREFS = {
  '/': ['/employee', '/employer/welcome', '/register', '/login'],
  '/employee': ['/employee', '/employer/welcome', '/employer/welcome', '/register', '/login'],
  '/employer/welcome': ['/contact'],
  '/job-details': ['/employee', '/employer/welcome', '/employer/welcome', '/register', '/login'],
}
const REGISTER_HREF = { '/': '/register', '/employee': '/register', '/employer/welcome': '/employer/register', '/job-details': null }
const LOGIN_HREF = { '/': '/login', '/employee': '/login', '/employer/welcome': '/login', '/job-details': null }

let failures = 0
const stats = []
const fail = (route, lang, vp, msg) => {
  failures++
  console.log(`  FAIL  ${route.padEnd(18)} ${lang}  ${vp.padEnd(9)} ${msg}`)
}

// Runs in the page.
function check() {
  const vw = window.innerWidth
  const vis = (e) => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'
  }
  const text = (e) => (e.textContent || '').trim().replace(/\s+/g, ' ')
  const name = (e) => text(e).slice(0, 28) || `[${e.getAttribute('aria-label') || 'icon'}]`
  const de = document.documentElement
  const header = document.querySelector('header')
  const items = header ? [...header.querySelectorAll('a[href],button')].filter(vis) : []
  const rect = (e) => e.getBoundingClientRect()

  // One layout read per control, reused below.
  const boxes = items.map(rect)

  // Tightest gap between two neighbouring controls on the same row. Negative = overlap.
  const byLeft = items.map((e, i) => ({ e, r: boxes[i] })).sort((a, b) => a.r.left - b.r.left)
  let minGap = null
  for (let i = 1; i < byLeft.length; i++) {
    const a = byLeft[i - 1]
    const b = byLeft[i]
    if (a.e.contains(b.e) || b.e.contains(a.e) || Math.abs(a.r.top - b.r.top) > 20) continue
    const g = Math.round(b.r.left - a.r.right)
    if (minGap === null || g < minGap) minGap = g
  }

  const offscreen = items
    .map((e, i) => ({ e, r: boxes[i] }))
    .filter(({ r }) => r.right > vw + 1 || r.left < -1)
    .map(({ e, r }) => `${name(e)} [${Math.round(r.left)}..${Math.round(r.right)}] of ${vw}`)

  // A label wider than its own box paints over its neighbour without any two boxes overlapping.
  const clipped = [...(header ? header.querySelectorAll('a span, button span') : [])]
    .filter((s) => vis(s) && s.scrollWidth > s.clientWidth + 1)
    .map((s) => text(s).slice(0, 28))

  const overlaps = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].contains(items[j]) || items[j].contains(items[i])) continue
      const a = boxes[i]
      const b = boxes[j]
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 2 && oy > 2) overlaps.push(`${name(items[i])} / ${name(items[j])}`)
    }
  }

  // The logo is an image with alt text: its words are the picture's own name, not an icon.
  // The hamburger is the one deliberate icon-only control (its name is aria-label), and is
  // checked on its own below.
  const iconOnly = items.filter((e) => !text(e) && !e.querySelector('img[alt]:not([alt=""])') && e.getAttribute('aria-controls') !== 'public-menu').map((e) => `[${e.getAttribute('aria-label') || 'icon'}] ${e.getAttribute('href') || ''}`)
  const heights = items.map((e, i) => ({ n: name(e), h: Math.round(boxes[i].height), w: Math.round(boxes[i].width) }))

  const home = header && header.querySelector('a[href="/"]')
  // There are two hamburgers in the source (phone / 640-1023); at most one is displayed.
  const menuBtns = header ? [...header.querySelectorAll('button[aria-controls="public-menu"]')] : []
  const shownMenus = menuBtns.filter(vis)
  const menuBtn = shownMenus[0] || null
  const menuCs = menuBtn ? getComputedStyle(menuBtn) : null
  const menuBox = menuBtn ? rect(menuBtn) : null
  const otherRights = items.filter((e) => e !== menuBtn).map((e) => rect(e).right)
  // Two language controls are in the source (phone, under 430px / from 430px); one is displayed.
  const chip = header && [...header.querySelectorAll('[aria-haspopup="listbox"]')].find(vis)
  const login = header && header.querySelector('a[href^="/login"]')
  const register = header && [...header.querySelectorAll('a')].find((a) => /^\/(employer\/)?register(\?|$)/.test(a.getAttribute('href') || ''))

  // Tab follows source order, so source order must be the visual order: reading row by row
  // (rows are ~20px bands), left to right. `items` is in source order.
  const focusOrderBreaks = []
  for (let i = 1; i < items.length; i++) {
    const a = boxes[i - 1]
    const b = boxes[i]
    const sameRow = Math.abs(b.top - a.top) <= 20
    const ok = b.top > a.top + 20 || (sameRow && b.left >= a.left - 1)
    if (!ok) focusOrderBreaks.push(`${name(items[i - 1])} -> ${name(items[i])}`)
  }
  // Icons drawn on the header's links (the closed Menu panel is not visible, so it is not counted).
  const barIcons = header ? [...header.querySelectorAll('a[href] svg')].filter(vis).map((i) => i.closest('a').getAttribute('href').split('?')[0].split('#')[0]) : []
  const top = (e) => (e && vis(e) ? Math.round(rect(e).top) : null)

  const cardEscapes = []
  for (const card of document.querySelectorAll('[role="link"][tabindex="0"]')) {
    const c = rect(card)
    if (c.width === 0) continue
    for (const b of card.querySelectorAll('button,a')) {
      const r = rect(b)
      if (r.width && (r.left < c.left - 1 || r.right > c.right + 1)) cardEscapes.push(name(b))
    }
  }

  const h1 = document.querySelector('h1')
  const banner = [...document.querySelectorAll('main div')].find((d) => /absolute/.test(d.className) && /var\(--lb-w\)/.test(d.className))
  const bg = document.querySelector('div.fixed.inset-0')
  const bgInfo = bg
    ? {
        overlayLast: !!bg.lastElementChild && /bg-white\/\d+/.test(bg.lastElementChild.className),
        imageOpacities: [...bg.querySelectorAll(':scope > div.absolute')]
          .filter((d) => getComputedStyle(d).display !== 'none' && !/bg-white\/\d+/.test(d.className))
          .map((d) => parseFloat(getComputedStyle(d).opacity)),
      }
    : null

  return {
    vw,
    hOverflow: de.scrollWidth > de.clientWidth,
    sw: de.scrollWidth,
    offscreen,
    overlaps,
    clipped,
    iconOnly,
    heights,
    headerPosition: header ? getComputedStyle(header).position : null,
    headerHeight: header ? Math.round(rect(header).height) : 0,
    mains: document.querySelectorAll('main').length,
    logoTop: top(home),
    menuTop: top(menuBtn),
    menuShown: shownMenus.length,
    menuLabel: menuBtn ? (menuBtn.getAttribute('aria-label') || '').trim() : null,
    menuText: menuBtn ? text(menuBtn) : null,
    menuBorder: menuCs ? parseFloat(menuCs.borderTopWidth) : null,
    menuBg: menuCs ? menuCs.backgroundColor : null,
    menuW: menuBox ? Math.round(menuBox.width) : null,
    menuH: menuBox ? Math.round(menuBox.height) : null,
    menuRight: menuBox ? Math.round(menuBox.right) : null,
    maxOtherRight: otherRights.length ? Math.round(Math.max(...otherRights)) : null,
    chipTop: top(chip),
    chipText: chip ? (chip.innerText || '').trim().replace(/s+/g, ' ') : null,
    minGap,
    chipShown: header ? [...header.querySelectorAll('[aria-haspopup="listbox"]')].filter(vis).length : 0,
    chipHeight: chip ? Math.round(rect(chip).height) : null,
    chipLabelClipped: chip ? [...chip.querySelectorAll('span')].some((sp) => sp.scrollHeight > sp.clientHeight + 1) : false,
    loginTop: top(login),
    loginText: login && vis(login) ? text(login) : null,
    registerText: register && vis(register) ? text(register) : null,
    registerHref: register ? register.getAttribute('href') : null,
    loginHref: login ? login.getAttribute('href') : null,
    barIcons,
    focusOrderBreaks,
    cardEscapes,
    h1w: h1 ? Math.round(rect(h1).width) : 0,
    bannerShown: !!banner && getComputedStyle(banner).display !== 'none',
    bgInfo,
    footerPostJobLinks: document.querySelectorAll('footer a[href="/employer/jobs/new"]').length,
    footerFindWorkersLinks: document.querySelectorAll('footer a[href="/employer/workers"]').length,
    footerRegisterLinks: document.querySelectorAll('footer a[href="/employer/register"]').length,
  }
}

async function menuChecks(page, route, lang, vp) {
  const trigger = page.locator('header button[aria-controls="public-menu"]:visible').first()
  const panel = page.locator('#public-menu')
  const state = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('header button[aria-controls="public-menu"]')].find((x) => x.getBoundingClientRect().width > 0)
    return { expanded: b.getAttribute('aria-expanded'), focusOnTrigger: document.activeElement === b, scrollLocked: getComputedStyle(document.body).overflow === 'hidden' }
  })
  const headerTopBefore = await page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().top))
  await trigger.click()
  await panel.waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(350) // let the opening animation finish before measuring

  const opened = await page.evaluate(() => {
    const d = document.querySelector('#public-menu')
    const h = document.querySelector('header').getBoundingClientRect()
    const r = d.getBoundingClientRect()
    const b = [...document.querySelectorAll('header button[aria-controls="public-menu"]')].find((x) => x.getBoundingClientRect().width > 0)
    return {
      focusInside: d.contains(document.activeElement),
      scrollLocked: getComputedStyle(document.body).overflow === 'hidden',
      hrefs: [...d.querySelectorAll('ul a')].map((a) => a.getAttribute('href')),
      names: [...d.querySelectorAll('ul a')].map((a) => (a.textContent || '').trim()),
      // Directly below the header, full width, inside the screen, no sideways scroll.
      gapToHeader: Math.round(r.top - h.bottom),
      fullWidth: Math.abs(r.left - h.left) <= 1 && Math.abs(r.right - h.right) <= 1, // as wide as the header
      withinScreen: r.bottom <= innerHeight + 1,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      rowsClipped: [...d.querySelectorAll('ul a')].some((a) => a.scrollWidth > a.clientWidth + 1),
      named: !!(d.querySelector('nav')?.getAttribute('aria-label') || '').trim(),
      iconIsX: !!b.querySelector('svg.lucide-x'),
      headerTop: Math.round(h.top),
    }
  })
  const o = await state()
  if (!opened.focusInside) fail(route, lang, vp, 'Menu: focus did not move into the panel')
  if (opened.scrollLocked) fail(route, lang, vp, 'Menu: page scroll is locked (it is a dropdown, not a modal)')
  if (o.expanded !== 'true') fail(route, lang, vp, `Menu: aria-expanded is "${o.expanded}" while open`)
  if (opened.gapToHeader !== 0) fail(route, lang, vp, `Menu: panel is ${opened.gapToHeader}px from the header's bottom edge, expected 0`)
  if (!opened.fullWidth) fail(route, lang, vp, 'Menu: panel is not as wide as the header')
  if (!opened.withinScreen) fail(route, lang, vp, 'Menu: the panel runs past the bottom of the screen')
  if (opened.hOverflow) fail(route, lang, vp, 'Menu: opening it made the page scroll sideways')
  if (opened.rowsClipped) fail(route, lang, vp, 'Menu: a row is wider than its box')
  if (!opened.named) fail(route, lang, vp, 'Menu: panel navigation has no accessible name')
  if (!opened.iconIsX) fail(route, lang, vp, 'Menu: the button does not show a close (X) icon while open')
  if (opened.headerTop !== headerTopBefore) fail(route, lang, vp, `Menu: header moved from y=${headerTopBefore} to y=${opened.headerTop} while open`)
  if (JSON.stringify(opened.hrefs) !== JSON.stringify(MENU_HREFS[route]))
    fail(route, lang, vp, `Menu: items ${JSON.stringify(opened.hrefs)} != ${JSON.stringify(MENU_HREFS[route])}`)
  if (opened.names.some((n) => !n)) fail(route, lang, vp, 'Menu: an item has no text')

  // Sticky: scrolled with the panel open, the header sits at the top and the panel stays under it.
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.waitForTimeout(200)
  const scrolled = await page.evaluate(() => {
    const h = document.querySelector('header').getBoundingClientRect()
    const p = document.querySelector('#public-menu').getBoundingClientRect()
    return { headerTop: Math.round(h.top), gap: Math.round(p.top - h.bottom), expanded: p.height > 0 }
  })
  if (scrolled.headerTop !== 0) fail(route, lang, vp, `Menu: header is at y=${scrolled.headerTop} after scrolling with the panel open`)
  if (scrolled.gap !== 0 || !scrolled.expanded) fail(route, lang, vp, `Menu: panel came away from the header when scrolled (gap ${scrolled.gap})`)
  await page.evaluate(() => window.scrollTo(0, 0))

  // The button toggles it closed.
  await trigger.click()
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => fail(route, lang, vp, 'Menu: the button did not close it'))

  // Escape closes and returns focus to the Menu button.
  await trigger.click()
  await panel.waitFor({ state: 'visible', timeout: 5000 })
  await page.keyboard.press('Escape')
  await panel.waitFor({ state: 'hidden', timeout: 5000 })
  const closed = await state()
  if (!closed.focusOnTrigger) fail(route, lang, vp, 'Menu: Escape did not return focus to the Menu button')
  if (closed.expanded !== 'false') fail(route, lang, vp, `Menu: aria-expanded is "${closed.expanded}" after closing`)

  // Closed, the panel is out of the Tab order (it must not be reachable while hidden).
  const hiddenFocusable = await page.evaluate(() => [...document.querySelectorAll('#public-menu a')].some((a) => getComputedStyle(a).visibility !== 'hidden'))
  if (hiddenFocusable) fail(route, lang, vp, 'Menu: links are still focusable while the panel is closed')

  // Clicking the dimmed page (outside) closes it.
  await trigger.click()
  await panel.waitFor({ state: 'visible', timeout: 5000 })
  await page.mouse.click(Math.floor(page.viewportSize().width / 2), page.viewportSize().height - 5)
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => fail(route, lang, vp, 'Menu: a click outside did not close it'))

  // Tabbing past the last link leaves the header and closes it.
  await trigger.click()
  await panel.waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(100)
  for (let i = 0; i < opened.hrefs.length + 1; i++) await page.keyboard.press('Tab')
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => fail(route, lang, vp, 'Menu: tabbing out of the header did not close it'))

  // Following a link closes it (a same-page anchor does not reload the page).
  if (route === '/employer/welcome') {
    await trigger.click()
    await panel.waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('#public-menu a[href="#offer"]').click()
    await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => fail(route, lang, vp, 'Menu: following a link did not close it'))
    // Leave a clean page: the anchor check that follows clicks the same link.
    await page.evaluate(() => { history.replaceState(null, '', location.pathname + location.search); window.scrollTo(0, 0) })
  }
}

async function languageChecks(page, route, lang, vp) {
  const chip = page.locator('header [aria-haspopup="listbox"]:visible').first()
  const before = ((await chip.textContent()) || '').trim()
  await chip.click()
  const list = await page.evaluate(() => {
    const u = document.querySelector('header [role="listbox"]')
    if (!u) return null
    const r = u.getBoundingClientRect()
    return { l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, n: u.querySelectorAll('[role="option"]').length }
  })
  if (!list) return fail(route, lang, vp, 'language list did not open')
  if (list.l < 0 || list.r > list.vw) fail(route, lang, vp, `language list outside the screen [${list.l}..${list.r}] of ${list.vw}`)
  if (list.n !== 10) fail(route, lang, vp, `language list has ${list.n} options, expected 10`)
  // Pick a language that is not the current one.
  const target = lang === 'ta' ? 'hi' : 'ta'
  const opts = page.locator('header [role="listbox"] [role="option"] button')
  const idx = lang === 'ta' ? 1 : 2 // hi = 2nd, ta = 3rd in LANGUAGE_OPTIONS
  await opts.nth(idx).click()
  await page.waitForTimeout(1200)
  const after = await page.evaluate(() => ({
    stored: localStorage.getItem('preferredLanguage'),
    chip: ([...document.querySelectorAll('header [aria-haspopup="listbox"]')].find((b) => b.getBoundingClientRect().width > 0)?.textContent || '').trim(),
  }))
  if (after.stored !== target) fail(route, lang, vp, `language not saved: stored "${after.stored}", expected "${target}"`)
  if (!after.chip || after.chip === before) fail(route, lang, vp, `language chip did not change ("${before}" -> "${after.chip}")`)
}

async function stickyAndAnchors(page, route, lang, vp) {
  // Sticky: after scrolling well past the header it is still at the top of the screen.
  await page.evaluate(() => window.scrollTo(0, 700))
  await page.waitForTimeout(300)
  const stuck = await page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().top))
  if (stuck !== 0) fail(route, lang, vp, `sticky header is at y=${stuck} after scrolling`)
  await page.evaluate(() => window.scrollTo(0, 0))

  // Anchors: a jump must land BELOW the header, not under it.
  const anchor = route === '/employer/welcome' ? '#offer' : route === '/employee' ? '#jobs' : null
  if (!anchor) return
  const link = page.locator(`header a[href$="${anchor}"]:visible`).first()
  if (!(await link.count())) {
    // Below 1024 the links live in the Menu.
    await page.locator('header button[aria-controls="public-menu"]:visible').first().click()
    await page.locator(`#public-menu a[href$="${anchor}"]`).first().click()
  } else {
    await link.click()
  }
  await page.waitForTimeout(1500)
  const landed = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    const hh = document.querySelector('header').getBoundingClientRect().bottom
    return el ? { top: Math.round(el.getBoundingClientRect().top), header: Math.round(hh) } : null
  }, anchor)
  if (!landed) return fail(route, lang, vp, `anchor ${anchor} target not found`)
  // The section's top edge must sit at or below the header's bottom edge (a small tolerance
  // for rounding), and not be pushed far down.
  if (landed.top < landed.header - 2) fail(route, lang, vp, `${anchor} lands under the header (top ${landed.top} < header ${landed.header})`)
  if (landed.top > landed.header + 140) fail(route, lang, vp, `${anchor} lands too low (top ${landed.top}, header ${landed.header})`)
}

// Real keyboard: Tab through the header and compare with the controls' source order, which
// the layout check above has already shown to be the visual order.
async function tabTraversal(page, route, lang, vp) {
  // Controls are tagged by their source position, and Tab is compared by tag, not by text:
  // the label text can still be switching language when this starts.
  const count = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' }
    window.scrollTo(0, 0)
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur()
    const controls = [...document.querySelector('header').querySelectorAll('a[href],button')].filter(vis)
    controls.forEach((e, i) => e.setAttribute('data-smoke-tab', String(i)))
    return controls.length
  })
  const got = []
  // `next dev` adds its own focusable overlay (<nextjs-portal>) that can come before the
  // header when it has a dev warning to show. It is not part of the page, so skip it.
  for (let i = 0; i < count + 3 && got.length < count; i++) {
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e.tagName === 'NEXTJS-PORTAL' || e.closest('nextjs-portal')) return null
      return e.getAttribute('data-smoke-tab') ?? `other:${(e.textContent || '').trim().slice(0, 20)}`
    })
    if (tag !== null) got.push(tag)
  }
  const want = Array.from({ length: count }, (_, i) => String(i))
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(route, lang, vp, `Tab visited ${JSON.stringify(got)}, expected the header's ${count} controls in order ${JSON.stringify(want)}`)
}

// DEF-012, followed for real: logged out, the footer's "Post a Job" and "Find Workers" end on /login
// carrying the employer page as returnUrl, with the Employer role selected. (The role toggle is only
// drawn on the Google arm of the login card, so open that arm to read it.) English only: it reads
// the English labels.
async function footerLoginChecks(page, route, lang, vp) {
  for (const target of ['/employer/jobs/new', '/employer/workers']) {
    await page.goto(FE + route, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(1200)
    await page.locator(`footer a[href="${target}"]`).first().click({ timeout: 15000 })
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 30000 })
    await page.waitForTimeout(1500)
    const url = await page.evaluate(() => location.pathname + location.search)
    if (url !== `/login?returnUrl=${encodeURIComponent(target)}`) fail(route, lang, vp, `footer link to ${target} ended on ${url}`)
    // The default (password) screen must SAY it is the Employer side, without a role toggle.
    const note = await loginNote(page)
    if (note.count !== 1 || !note.visible || note.text !== 'Signing in as Employer') fail(route, lang, vp, `footer link to ${target}: the default login screen shows ${JSON.stringify(note)}, expected one visible "Signing in as Employer"`)
    if (note.toggles) fail(route, lang, vp, `footer link to ${target}: ${note.toggles} role toggle(s) on the password screen, expected none`)
    await page.getByText(/Continue with Google/i).first().click({ timeout: 15000 })
    await page.waitForTimeout(600)
    const pressed = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => (b.textContent || '').trim()))
    if (pressed.join() !== 'Employer') fail(route, lang, vp, `footer link to ${target}: login role selected is "${pressed.join()}", expected "Employer"`)
  }
}

// What the login card shows about the role, read from the page: the DEF-012 note and any role toggle.
const loginNote = (page) =>
  page.evaluate(() => {
    const n = document.querySelector('[data-login-context="employer"]')
    const r = n && n.getBoundingClientRect()
    return {
      count: document.querySelectorAll('[data-login-context]').length,
      visible: !!r && r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= document.documentElement.clientWidth + 1,
      text: n ? (n.textContent || '').trim().replace(/\s+/g, ' ') : null,
      toggles: document.querySelectorAll('button[aria-pressed]').length,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })

// DEF-012 login context, logged out. (1) Opening an employer route lands on /login with the EXACT
// returnUrl (path and query), and the default password screen says "Signing in as Employer" with no
// role toggle. (2) A plain /login and a job-seeker returnUrl look exactly as before: no note. (3) On the
// Google arm the toggle still works, and the note follows it. In other languages only the note's
// presence and fit are checked (the lead-in is a new string; a missing key would print the key).
async function loginContextChecks(page, route, lang, vp) {
  if (lang === 'en') {
    for (const target of ['/employer/jobs/new', '/employer/workers', '/employer/workers?q=a%20b']) {
      await page.goto(FE + target, { waitUntil: 'load', timeout: 60000 })
      await page.waitForURL((u) => u.pathname === '/login', { timeout: 30000 })
      await page.waitForTimeout(1500)
      const url = await page.evaluate(() => location.pathname + location.search)
      if (url !== `/login?returnUrl=${encodeURIComponent(target)}`) fail(route, lang, vp, `${target} redirected to ${url}, expected the exact returnUrl`)
      const note = await loginNote(page)
      if (note.count !== 1 || !note.visible || note.text !== 'Signing in as Employer') fail(route, lang, vp, `${target}: login shows ${JSON.stringify(note)}, expected one visible "Signing in as Employer"`)
      if (note.toggles) fail(route, lang, vp, `${target}: ${note.toggles} role toggle(s) on the password screen, expected none`)
      if (note.hOverflow) fail(route, lang, vp, `${target}: the login page scrolls sideways`)
    }
    // Unchanged for everyone else.
    for (const quiet of ['/login', '/login?returnUrl=' + encodeURIComponent('/job-details/abc?from=employee'), '/login?returnUrl=' + encodeURIComponent('/saved-jobs')]) {
      await page.goto(FE + quiet, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(1500)
      const note = await loginNote(page)
      if (note.count !== 0 || note.toggles) fail(route, lang, vp, `${quiet}: expected the usual login screen, got ${JSON.stringify(note)}`)
    }
    // Google arm: the toggle is there, preselected, and the note follows the choice.
    await page.goto(FE + '/login?returnUrl=' + encodeURIComponent('/employer/jobs/new'), { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(1500)
    await page.getByText(/Continue with Google/i).first().click({ timeout: 15000 })
    await page.waitForTimeout(600)
    const pressed = () => page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => (b.textContent || '').trim()).join())
    if ((await pressed()) !== 'Employer') fail(route, lang, vp, 'Google arm: Employer is not preselected')
    await page.locator('button[aria-pressed]', { hasText: 'Job Seeker' }).click()
    await page.waitForTimeout(400)
    if ((await loginNote(page)).count !== 0) fail(route, lang, vp, 'Google arm: the note stays after switching to Job Seeker')
    await page.locator('button[aria-pressed]', { hasText: 'Employer' }).click()
    await page.waitForTimeout(400)
    if ((await loginNote(page)).count !== 1) fail(route, lang, vp, 'Google arm: the note does not come back after switching to Employer')
  } else {
    await page.goto(FE + '/employer/jobs/new', { waitUntil: 'load', timeout: 60000 })
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 30000 })
    await page.waitForTimeout(1500)
    const note = await loginNote(page)
    if (note.count !== 1 || !note.visible || !note.text || /signingInAs|\{\{|\}\}/.test(note.text)) fail(route, lang, vp, `/employer/jobs/new: login shows ${JSON.stringify(note)}, expected one visible, translated note`)
    if (note.hOverflow) fail(route, lang, vp, 'the login page scrolls sideways with the note')
  }
}

// A logged-out job page: Register and Login (bar, or Menu below 1024) must carry the job, and
// following Register must leave the job remembered for after sign-up.
async function jobReturnChecks(page, jobPath, route, lang, vp, narrow) {
  const enc = encodeURIComponent(jobPath)
  if (narrow) {
    await page.locator('header button[aria-controls="public-menu"]:visible').first().click()
    await page.locator('#public-menu a', { hasText: /\S/ }).last().click()
  } else {
    await page.locator('header a[href^="/register"]:visible').first().click()
  }
  await page.waitForURL(/\/register/, { timeout: 15000 })
  await page.waitForTimeout(800)
  const landed = await page.evaluate(() => ({
    url: location.pathname + location.search,
    pending: sessionStorage.getItem('prosiddhi.pendingReturn'),
  }))
  if (landed.url !== `/register?returnUrl=${enc}`) fail(route, lang, vp, `Register went to ${landed.url}`)
  let saved = null
  try { saved = JSON.parse(landed.pending || 'null')?.path } catch {}
  if (saved !== jobPath) fail(route, lang, vp, `job not remembered after Register (stored ${JSON.stringify(saved)}, expected ${jobPath})`)

  // The login card's "Sign up to find work" (what Apply leads to) must carry the job in its
  // href — not in a click handler — so a new-tab click carries it too.
  // Generous timeout: on a cold `next dev`, /login compiles the first time it is asked for.
  await page.goto(FE + `/login?returnUrl=${enc}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(800)
  const cardHref = await page.evaluate(() => [...document.querySelectorAll('a[href^="/register"]')].map((a) => a.getAttribute('href'))[0] || null)
  if (cardHref !== `/register?returnUrl=${enc}`) fail(route, lang, vp, `login card Sign up goes to ${cardHref}`)
}

// The decorative background must not cost the hero text its contrast. Measured on a real
// screenshot: for each piece of text drawn straight on the page background (no fill of its
// own), the median pixel colour behind it against the text colour.
async function backgroundReadability(page, route, lang, vp) {
  const shot = (await page.screenshot()).toString('base64')
  const rows = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const k = img.width / innerWidth
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const g = canvas.getContext('2d')
    g.drawImage(img, 0, 0)
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b)
    const out = []
    for (const el of document.querySelectorAll('#hero h1, #hero p, #hero a')) {
      const cs = getComputedStyle(el)
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') continue // a button or pill with its own fill
      const rc = el.getBoundingClientRect()
      const x = Math.max(0, Math.floor(rc.left * k))
      const y = Math.max(0, Math.floor(rc.top * k))
      const w = Math.floor(Math.min(rc.width, innerWidth - rc.left) * k)
      const h = Math.floor(Math.min(rc.height, innerHeight - rc.top) * k)
      if (w < 4 || h < 4) continue
      const px = g.getImageData(x, y, w, h).data
      const ls = []
      for (let i = 0; i < px.length; i += 16) ls.push(lum(px[i], px[i + 1], px[i + 2]))
      ls.sort((a, b) => a - b)
      const bg = ls[Math.floor(ls.length / 2)]
      const m = cs.color.match(/\d+(\.\d+)?/g).map(Number)
      const fg = lum(m[0], m[1], m[2])
      const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)
      const size = parseFloat(cs.fontSize)
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700)
      out.push({ el: el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 18), ratio: +ratio.toFixed(2), need: large ? 3 : 4.5 })
    }
    return out
  }, shot)
  for (const r of rows) if (r.ratio < r.need) fail(route, lang, vp, `hero text over the background: ${r.el} ${r.ratio}:1, needs ${r.need}:1`)
  return rows
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)
  let runs = 0

  // One real job for the logged-out job page; its Register / Login return to it.
  let jobPath = null
  if (ROUTES.includes('/job-details')) {
    const list = await jobs(1)
    if (!list[0]) throw new Error('/job-details needs at least one job from the API')
    jobPath = `/job-details/${list[0].id}?from=employee`
    const enc = encodeURIComponent(jobPath)
    MENU_HREFS['/job-details'][3] = `/register?returnUrl=${enc}`
    REGISTER_HREF['/job-details'] = `/register?returnUrl=${enc}`
    LOGIN_HREF['/job-details'] = `/login?returnUrl=${enc}`
  }

  for (const route of ROUTES) {
    for (const lang of LANGS) {
      for (const [w, h] of VIEWPORTS) {
        const vp = `${w}x${h}`
        const ctx = await browser.newContext({ viewport: { width: w, height: h } })
        await ctx.addInitScript((l) => {
          try { localStorage.setItem('preferredLanguage', l) } catch {}
        }, lang)
        const page = await ctx.newPage()
        try {
          await page.goto(FE + (route === '/job-details' ? jobPath : route), { waitUntil: 'networkidle', timeout: 60000 })
          await page.waitForTimeout(1500)
          const m = await page.evaluate(check)
          runs++

          // --- layout ---
          if (m.focusOrderBreaks.length) fail(route, lang, vp, `source order is not visual order: ${m.focusOrderBreaks.join('; ')}`)
          if (m.loginHref !== LOGIN_HREF[route]) fail(route, lang, vp, `Login goes to ${m.loginHref}, expected ${LOGIN_HREF[route]}`)
          if (m.hOverflow) fail(route, lang, vp, `page scrolls sideways (${m.sw} > ${m.vw})`)
          if (m.offscreen.length) fail(route, lang, vp, `header control off-screen: ${m.offscreen.join('; ')}`)
          if (m.overlaps.length) fail(route, lang, vp, `header controls overlap: ${m.overlaps.join('; ')}`)
          if (m.clipped.length) fail(route, lang, vp, `header label wider than its box: ${m.clipped.join('; ')}`)
          if (m.iconOnly.length) fail(route, lang, vp, `icon-only header control (no visible words): ${m.iconOnly.join('; ')}`)
          // Every control is 44px tall. Width is checked on the hamburger below: a text link such
          // as "Help" is as wide as its word, which has never been a 44px-wide target.
          const tooShort = m.heights.filter((x) => x.h < MIN_TARGET)
          if (tooShort.length) fail(route, lang, vp, `header target under ${MIN_TARGET}px tall: ${tooShort.map((x) => `${x.n}=${x.w}x${x.h}`).join(', ')}`)
          if (m.headerPosition !== 'sticky') fail(route, lang, vp, `header is "${m.headerPosition}", expected sticky`)
          // (The job page's own landmark is JobDetailsView's, outside this change.)
          if (route !== '/job-details' && m.mains < 1) fail(route, lang, vp, 'no <main> landmark')

          // --- the approved header layouts ---
          if (!m.chipText) fail(route, lang, vp, 'no visible language control in the header')
          if (m.chipShown !== 1) fail(route, lang, vp, `${m.chipShown} language controls displayed, expected exactly 1`)
          // The English gloss is always kept ("தமிழ் (Tamil)"; English has none). "Language:" (the
          // translated word + ': ') is there from 430px and gone below it, where it does not fit.
          if (m.chipText && lang !== 'en' && !m.chipText.includes('(')) fail(route, lang, vp, `language control lost its English gloss: "${m.chipText}"`)
          // "Language:" is shown at 430–1023px and from 1536px; hidden under 430 (phone variant) and at 1024–1535.
          const wantPrefix = (w >= 430 && w < 1024) || w >= 1536
          if (m.chipText && wantPrefix && !m.chipText.includes(': ')) fail(route, lang, vp, `the language control should read "Language: …" at this width, got "${m.chipText}"`)
          if (m.chipText && !wantPrefix && m.chipText.includes(': ')) fail(route, lang, vp, `the "Language:" prefix should be hidden at this width, got "${m.chipText}"`)
          // The desktop bar keeps at least 12px between neighbouring controls (logo, links, language, Register, Login).
          if (w >= 1024 && m.minGap !== null && m.minGap < 12) fail(route, lang, vp, `desktop bar: tightest gap between controls is ${m.minGap}px, expected at least 12`)
          if (m.minGap !== null) stats.push({ route, lang, vp, w, gap: m.minGap })
          if (m.chipLabelClipped) fail(route, lang, vp, 'language label is clipped (needs more than two lines)')
          if (w < 640 && m.headerHeight > 105) fail(route, lang, vp, `phone header is ${m.headerHeight}px tall, expected 104`)
          if (!m.loginText) fail(route, lang, vp, 'Login is not visible as text')
          // The hamburger (below 1024): exactly one displayed, icon only, no box, named, 44x44.
          if (w < 1024) {
            if (m.menuShown !== 1) fail(route, lang, vp, `${m.menuShown} hamburgers displayed, expected exactly 1`)
            if (!m.menuLabel) fail(route, lang, vp, 'hamburger has no accessible name (aria-label)')
            if (m.menuText) fail(route, lang, vp, `hamburger shows the text "${m.menuText}", expected an icon only`)
            if (m.menuBorder) fail(route, lang, vp, `hamburger has a ${m.menuBorder}px border, expected none`)
            if (m.menuBg !== 'rgba(0, 0, 0, 0)') fail(route, lang, vp, `hamburger has a filled background (${m.menuBg})`)
            if (m.menuW < MIN_TARGET || m.menuH < MIN_TARGET) fail(route, lang, vp, `hamburger is ${m.menuW}x${m.menuH}, under 44x44`)
          }
          if (w < 640) {
            // Two rows: logo + hamburger on the first, language + Login on the second.
            if (m.menuTop === null) fail(route, lang, vp, 'phone: hamburger is missing')
            else if (Math.abs(m.menuTop - m.logoTop) > 12) fail(route, lang, vp, `phone: hamburger is not on the logo's row (${m.menuTop} vs ${m.logoTop})`)
            else if (m.menuRight < m.vw - 30) fail(route, lang, vp, `phone: hamburger is not at the right edge (right ${m.menuRight} of ${m.vw})`)
            if (m.chipTop !== null && m.logoTop !== null && m.chipTop < m.logoTop + 40) fail(route, lang, vp, 'phone: language is not on a second row')
            if (m.chipTop !== null && m.loginTop !== null && Math.abs(m.chipTop - m.loginTop) > 12) fail(route, lang, vp, 'phone: language and Login are not on the same row')
            if (m.headerHeight < 90) fail(route, lang, vp, `phone: header is ${m.headerHeight}px tall, expected two rows`)
          } else if (w < 1024) {
            // Far right, after language and Login (the bar is one row, so "last" is "rightmost").
            if (m.menuTop === null) fail(route, lang, vp, 'tablet: hamburger is missing')
            else {
              if (m.menuRight < m.maxOtherRight) fail(route, lang, vp, `tablet: hamburger is not the rightmost control (right ${m.menuRight} < ${m.maxOtherRight})`)
              if (m.menuRight < m.vw - 30) fail(route, lang, vp, `tablet: hamburger is not at the right edge (right ${m.menuRight} of ${m.vw})`)
            }
            if (m.headerHeight > 80) fail(route, lang, vp, `tablet: header is ${m.headerHeight}px tall, expected one row`)
            if (m.chipTop !== null && m.loginTop !== null && Math.abs(m.chipTop - m.loginTop) > 12) fail(route, lang, vp, 'tablet: language and Login are not on one row')
          } else {
            if (m.menuShown) fail(route, lang, vp, 'desktop: a hamburger is still displayed')
            if (!m.registerText) fail(route, lang, vp, 'desktop: Register is not visible as text')
            else if (m.registerHref !== REGISTER_HREF[route]) fail(route, lang, vp, `desktop: Register goes to ${m.registerHref}`)
            if (m.headerHeight > 80) fail(route, lang, vp, `desktop: header is ${m.headerHeight}px tall, expected one row`)
          }

          // Icons: the old ones from 1280px up, and none below (text only at 1024-1279, and on the
          // phone / tablet bar).
          const wantIcons = w >= 1280 ? ICON_HREFS[route] : []
          if (JSON.stringify(m.barIcons) !== JSON.stringify(wantIcons))
            fail(route, lang, vp, `header icons on ${JSON.stringify(m.barIcons)}, expected ${JSON.stringify(wantIcons)}`)

          // --- page-specific ---
          if (m.cardEscapes.length) fail(route, lang, vp, `job-card button outside its card: ${m.cardEscapes.join(', ')}`)
          if (route === '/') {
            if (w >= 768 && w < 1024 && m.h1w < w * 0.8) fail(route, lang, vp, `hero narrower than 80% of the screen (${m.h1w}px)`)
            if (w < 1024 && m.bannerShown) fail(route, lang, vp, 'vertical banner shown below 1024px')
            if (w >= 1024 && !m.bannerShown) fail(route, lang, vp, 'vertical banner missing at 1024px and up')
          }
          if (route === '/employer/welcome' && m.bgInfo) {
            if (!m.bgInfo.overlayLast) fail(route, lang, vp, 'background overlay is not painted over the images')
            // Visible but dimmed: not the full-opacity images the invalid classes used to give,
            // and not so faint (<0.15) that the decoration is gone.
            if (m.bgInfo.imageOpacities.some((o) => o > 0.4 || o < 0.15)) fail(route, lang, vp, `background image opacity out of range (${m.bgInfo.imageOpacities.join(',')})`)
          }
          // DEF-012: the footer's "Post a Job" / "Find Workers" keep pointing at the protected employer
          // routes. Logged out, those redirect to /login with the employer returnUrl, which preselects
          // the Employer role (footerLoginChecks below follows them). They must NOT go to sign-up.
          if (route === '/' || route === '/employer/welcome') {
            if (m.footerPostJobLinks !== 1) fail(route, lang, vp, `footer: expected 1 "Post a Job" link to /employer/jobs/new, found ${m.footerPostJobLinks}`)
            if (m.footerFindWorkersLinks !== 1) fail(route, lang, vp, `footer: expected 1 "Find Workers" link to /employer/workers, found ${m.footerFindWorkersLinks}`)
            if (m.footerRegisterLinks) fail(route, lang, vp, `footer has ${m.footerRegisterLinks} link(s) to /employer/register, expected none (DEF-012)`)
          }

          // --- behaviour: once per page and viewport, in English and the longest scripts ---
          if (lang === 'en' || lang === 'ta' || lang === 'ml') {
            if (w < 1024) await menuChecks(page, route, lang, vp)
            await stickyAndAnchors(page, route, lang, vp)
          }
          if (lang === 'en' || lang === 'ta') await languageChecks(page, route, lang, vp)
          if (route === '/employer/welcome' && lang === 'en') await backgroundReadability(page, route, lang, vp)
          if (lang === 'en' || lang === 'ta') {
            // A clean load: an anchor clicked earlier leaves `#offer` / `#jobs` in the address
            // bar, and the browser would then start Tab from that section, not the page top.
            await page.goto(page.url().split('#')[0], { waitUntil: 'networkidle' })
            await page.waitForTimeout(800)
            await tabTraversal(page, route, lang, vp)
          }
          // Last: these navigate away from the page.
          if ((route === '/' || route === '/employer/welcome') && lang === 'en' && (w === 390 || w === 1280)) {
            await footerLoginChecks(page, route, lang, vp)
          }
          // DEF-012 login context, once per language (the route is only a place to start from): English
          // at both widths, the other languages at the phone width.
          if (route === '/' && ((lang === 'en' && (w === 390 || w === 1280)) || (lang !== 'en' && w === 390))) {
            await loginContextChecks(page, route, lang, vp)
          }
          if (route === '/job-details' && lang === 'en' && (w === 390 || w === 1280 || w === 768)) {
            await jobReturnChecks(page, jobPath, route, lang, vp, w < 1024)
          }
        } catch (e) {
          fail(route, lang, vp, 'check failed: ' + String(e).slice(0, 160))
        }
        await ctx.close()
      }
    }
  }

  await browser.close()
  const tight = stats.filter((x) => x.w >= 1024).sort((a, b) => a.gap - b.gap)[0]
  if (tight) console.log(`
Tightest desktop clearance measured: ${tight.gap}px (${tight.route} ${tight.lang} ${tight.vp})`)
  console.log(failures ? `\n${failures} FAILED over ${runs} page loads` : `\nPASS — ${runs} page loads, no failures`)
  process.exit(failures ? 1 : 0)
})()
