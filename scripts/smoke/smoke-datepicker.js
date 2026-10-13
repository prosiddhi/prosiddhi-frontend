// DatePicker checks: year range, min/max, keyboard focus around disabled days.
// See README.md in this folder. Needs only the portal dev server (no API, no login).
//
// The picker is a leaf component, so this writes a throwaway page that renders it
// with the same props the real forms pass, drives it in Chrome, and deletes the
// page again. The Founded callers are checked from source (they sit behind login).
//
//   cd prosiddhi-frontend && npx next dev -p 3000
//   node scripts/smoke/smoke-datepicker.js
const fs = require('fs')
const path = require('path')

function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_PATH, 'playwright-core'].filter(Boolean)) {
    try {
      return require(c)
    } catch (e) {}
  }
  throw new Error('Could not load playwright. Install it or set PLAYWRIGHT_PATH.')
}
const { chromium } = loadPlaywright()

const FE = process.env.SMOKE_FE || 'http://localhost:3000'
const ROOT = path.resolve(__dirname, '..', '..')
const HARNESS_DIR = path.join(ROOT, 'src', 'app', 'datepicker-harness')
const cleanup = () => {
  fs.rmSync(HARNESS_DIR, { recursive: true, force: true })
  // next dev leaves generated route types behind, which would break tsc
  fs.rmSync(path.join(ROOT, '.next', 'types', 'app', 'datepicker-harness'), { recursive: true, force: true })
}

const HARNESS = `'use client'
import { useState } from 'react'
import { DatePicker } from '@/components/form/DatePicker'
import { Field } from '@/components/form/Field'

function Case({ id, ...props }: { id: string; min?: string; max?: string; minYear?: number; defaultMonth?: string; initial?: string }) {
  const [v, setV] = useState(props.initial ?? '')
  return (
    <div>
      <DatePicker id={id} value={v} onChange={setV} min={props.min} max={props.max} minYear={props.minYear} defaultMonth={props.defaultMonth} />
      <output id={id + '-out'}>{v}</output>
    </div>
  )
}

// A picker that can be disabled or unmounted from outside, while it is open.
function Life() {
  const [off, setOff] = useState(false)
  const [shown, setShown] = useState(true)
  const [v, setV] = useState('')
  return (
    <div>
      {shown && <DatePicker id="life" value={v} onChange={setV} disabled={off} />}
      <button type="button" id="life-dis" disabled>disabled neighbour</button>
      <button type="button" id="life-hidden" style={{ visibility: 'hidden' }}>hidden neighbour</button>
      <button type="button" id="life-toggle" onClick={() => setOff((x) => !x)}>toggle</button>
      <button type="button" id="life-hide" onClick={() => setShown(false)}>hide</button>
    </div>
  )
}

// A picker with a control before it and (at the end of the page) none after it.
function Life2() {
  const [off, setOff] = useState(false)
  const [v, setV] = useState('')
  return (
    <div>
      <button type="button" id="life2-toggle" onClick={() => setOff((x) => !x)}>toggle2</button>
      <DatePicker id="life2" value={v} onChange={setV} disabled={off} />
    </div>
  )
}

export default function Page() {
  const [f, setF] = useState('')
  return (
    <div style={{ padding: 20 }}>
      <Field label="Founded field label"><DatePicker value={f} onChange={setF} minYear={1800} /></Field>
      <Case id="jan31" initial="2026-01-31" />
      <Case id="jan31leap" initial="2024-01-31" />
      <Case id="yrs" minYear={2020} />
      <Case id="dateonly" min="2026-03-10" max="2026-03-20" defaultMonth="2026-03-15" />
      <Case id="dtbound" min="2026-03-10T00:00:00" max="2026-03-20T23:59:59Z" defaultMonth="2026-03-15" />
      <Case id="spacebound" min="2026-03-10 08:00" max="2026-03-20" defaultMonth="2026-03-15" />
      <Case id="badmin" min="abc" defaultMonth="2026-03-15" />
      <Case id="badfeb" min="2026-02-31" defaultMonth="2026-03-15" />
      <Case id="badtail" max="2026-03-10x" defaultMonth="2026-03-15" />
      <Case id="minonly" min="2030-03-10" />
      <Case id="maxonly" max="2030-03-10" />
      <Case id="dmlow" minYear={1800} defaultMonth="1700-05-10" />
      <Case id="dmhigh" defaultMonth="2999-01-01" />
      <Case id="below" min="2026-03-10" max="2026-03-20" initial="2026-01-05" />
      <Case id="inverted" min="2026-06-10" max="2026-06-01" defaultMonth="2026-06-05" />
      <Case id="invertedyears" min="2027-01-01" max="2025-01-01" defaultMonth="2026-01-15" />
      <Life />
      <Case id="founded" minYear={1800} />
      <Case id="dob" defaultMonth="2000-06-15" />
      <Case id="range" min="2026-03-10" max="2026-03-20" defaultMonth="2026-03-15" />
      <Case id="rangesel" min="2026-03-10" max="2026-03-20" initial="2026-03-15" />
      <Case id="leap" min="2020-01-01" max="2030-12-31" defaultMonth="2024-02-28" />
      <Case id="span" min="2025-12-30" max="2026-01-02" defaultMonth="2025-12-31" />
      <div style={{ height: 3000 }} />
      <Life2 />
    </div>
  )
}
`

// The real interview modal, on its own route so its overlay cannot cover the cases above.
const MODAL_HARNESS = `'use client'
import { ScheduleInterviewModal } from '@/components/employer/ScheduleInterviewModal'

export default function Page() {
  return <ScheduleInterviewModal isOpen onClose={() => {}} applicationId="a1" candidateName="Test Candidate" onAccepted={() => {}} />
}
`

// A modal-style overlay (position: fixed, no ARIA role, like the portal's modals) with
// page controls behind it, to check where focus goes when the picker's field is disabled.
const OVERLAY_HARNESS = `'use client'
import { useEffect, useState } from 'react'
import { DatePicker } from '@/components/form/DatePicker'

export default function Page() {
  const [mode, setMode] = useState('A')
  const [off, setOff] = useState(false)
  const [v, setV] = useState('')
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__setMode = setMode
    w.__setOff = setOff
  })
  if (mode === 'D') {
    return (
      <div>
        <button type="button" id="behind-before">before</button>
        <form id="plain" onSubmit={(e) => e.preventDefault()}>
          <DatePicker id="ov" value={v} onChange={setV} disabled={off} />
        </form>
        <button type="button" id="behind-after">after</button>
      </div>
    )
  }
  return (
    <div>
      <button type="button" id="behind-before">before</button>
      <div id="ov-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', padding: 24 }}>
          {mode === 'B' && <button type="button" id="ov-prev">prev</button>}
          <DatePicker id="ov" value={v} onChange={setV} disabled={off} />
          {mode === 'A' && <button type="button" id="ov-next">next</button>}
        </div>
      </div>
      <button type="button" id="behind-after">after</button>
    </div>
  )
}
`

// Counts the listeners and observers still alive, so "cleaned up" is a number, not a hope.
const TRACK = `(() => {
  const live = []
  const cap = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture))
  for (const t of [window, document]) {
    const add = t.addEventListener.bind(t)
    const rem = t.removeEventListener.bind(t)
    t.addEventListener = (type, l, o) => {
      if (!live.some((e) => e.t === t && e.type === type && e.l === l && e.c === cap(o))) live.push({ t, type, l, c: cap(o) })
      return add(type, l, o)
    }
    t.removeEventListener = (type, l, o) => {
      const i = live.findIndex((e) => e.t === t && e.type === type && e.l === l && e.c === cap(o))
      if (i >= 0) live.splice(i, 1)
      return rem(type, l, o)
    }
  }
  let observers = 0
  const IO = window.IntersectionObserver
  window.IntersectionObserver = class extends IO {
    constructor(...a) {
      super(...a)
      observers++
      let done = false
      const disconnect = this.disconnect.bind(this)
      this.disconnect = () => { if (!done) { done = true; observers-- } disconnect() }
    }
  }
  window.__alive = () => ({
    listeners: live.filter((e) => ['resize', 'scroll', 'mousedown'].includes(e.type)).length,
    observers,
  })
})()`

const results = []
function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`)
}

async function main() {
  fs.mkdirSync(HARNESS_DIR, { recursive: true })
  fs.writeFileSync(path.join(HARNESS_DIR, 'page.tsx'), HARNESS)
  fs.mkdirSync(path.join(HARNESS_DIR, 'modal'), { recursive: true })
  fs.writeFileSync(path.join(HARNESS_DIR, 'modal', 'page.tsx'), MODAL_HARNESS)
  fs.mkdirSync(path.join(HARNESS_DIR, 'overlay'), { recursive: true })
  fs.writeFileSync(path.join(HARNESS_DIR, 'overlay', 'page.tsx'), OVERLAY_HARNESS)
  const browser = await chromium.launch({ channel: process.env.SMOKE_BROWSER || 'chrome' })
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
    await page.addInitScript(TRACK)
    await page.goto(`${FE}/datepicker-harness`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForSelector('#founded')

    const open = async (id) => {
      if (await page.locator('[role=dialog]').count()) await page.keyboard.press('Escape')
      await page.click(`#${id}`)
      await page.waitForSelector('[role=dialog] button[data-iso]:focus')
    }
    const focusedISO = () => page.evaluate(() => document.activeElement?.getAttribute('data-iso') ?? null)
    const focusedDisabled = () => page.evaluate(() => document.activeElement?.getAttribute('aria-disabled') === 'true')
    const yearOptions = () =>
      page.$$eval('[role=dialog] select:nth-of-type(2) option', (o) => o.map((x) => Number(x.value)))
    const out = (id) => page.textContent(`#${id}-out`)
    const press = async (key, expect, label) => {
      await page.keyboard.press(key)
      // Focus moves in an effect, a tick after the key; wait for it (or time out and report).
      await page.waitForFunction((iso) => document.activeElement?.getAttribute('data-iso') === iso, expect, { timeout: 1500 }).catch(() => {})
      const iso = await focusedISO()
      check(label ?? `${key} -> ${expect}`, iso === expect && !(await focusedDisabled()), `focus on ${iso}`)
    }

    // R1: Founded can reach 1897 (and still starts 100 years back by default)
    await open('founded')
    let years = await yearOptions()
    check('Founded: 1897 and 1800 are in the year list', years.includes(1897) && years.includes(1800) && !years.includes(1799))
    await page.selectOption('[role=dialog] select:nth-of-type(2)', '1897')
    await page.click('[role=dialog] button[data-iso="1897-06-15"], [role=dialog] button[data-iso^="1897-"]:not([aria-disabled=true])')
    check('Founded: picking a day in 1897 sets an 1897 value', (await out('founded')).startsWith('1897-'), await out('founded'))

    // DOB range unchanged: this year + 20 down to this year - 100
    await open('dob')
    years = await yearOptions()
    const thisYear = new Date().getFullYear()
    check('DOB: year list is this year+20 .. this year-100', years[0] === thisYear + 20 && years[years.length - 1] === thisYear - 100, `${years[0]}..${years[years.length - 1]}`)

    // explicit min/max still rule
    await open('range')
    years = await yearOptions()
    check('min/max: year list is just 2026', years.length === 1 && years[0] === 2026, String(years))
    await page.click('[role=dialog] button[data-iso="2026-03-05"]', { force: true })
    check('min/max: clicking a disabled day selects nothing', (await out('range')) === '' && (await page.locator('[role=dialog]').count()) === 1)

    // N1: keyboard never rests on a disabled day (2026-03-15 is a Sunday)
    await open('range')
    await press('End', '2026-03-20', 'End past max lands on max')
    await press('ArrowRight', '2026-03-20', 'ArrowRight at max stays on max')
    await press('PageDown', '2026-03-20', 'PageDown past max lands on max')
    await press('ArrowDown', '2026-03-20', 'ArrowDown past max lands on max')
    await press('PageUp', '2026-03-10', 'PageUp past min lands on min')
    await press('ArrowLeft', '2026-03-10', 'ArrowLeft at min stays on min')
    await press('ArrowUp', '2026-03-10', 'ArrowUp past min lands on min')
    await press('Home', '2026-03-10', 'Home before min lands on min')

    // month ends and a range that straddles a year end
    await open('span')
    await press('ArrowRight', '2026-01-01', 'Dec 31 + ArrowRight crosses into Jan 1')
    await press('ArrowDown', '2026-01-02', 'ArrowDown past max lands on max')
    await press('PageUp', '2025-12-30', 'PageUp into Dec lands on min')

    // leap days
    await open('leap')
    await press('ArrowRight', '2024-02-29', 'Feb 28 -> Feb 29 in a leap year')
    await press('ArrowRight', '2024-03-01', 'Feb 29 -> Mar 1')
    await press('ArrowLeft', '2024-02-29', 'Mar 1 -> Feb 29')
    await press('Shift+PageUp', '2023-02-28', 'Feb 29 - 1 year clamps to Feb 28')
    await press('Shift+PageDown', '2024-02-29', 'Feb 28 2023 + 1 year returns to the remembered Feb 29')
    await open('leap')
    await page.keyboard.press('PageUp')
    await page.keyboard.press('ArrowRight')
    await press('End', '2024-02-03', 'End from Mon Jan 29 crosses the month end to Sat Feb 3')

    // N2: click a disabled day, then keys start from that day
    await open('range')
    await page.click('[role=dialog] button[data-iso="2026-03-05"]', { force: true })
    await press('ArrowRight', '2026-03-10', 'After clicking a disabled day, ArrowRight starts from it (Mar 5 -> clamp to min)')
    await open('range')
    await page.click('[role=dialog] button[data-iso="2026-03-25"]', { force: true })
    await press('ArrowLeft', '2026-03-20', 'After clicking a disabled day past max, ArrowLeft clamps to max')

    // N2: Tab / Shift+Tab continue from the clicked day, not from the old tab stop
    await open('rangesel')
    await page.click('[role=dialog] button[data-iso="2026-03-05"]', { force: true })
    await page.keyboard.press('Tab')
    const label = await page.evaluate(() => document.activeElement?.textContent?.trim())
    check('After clicking a disabled day, Tab goes to Clear', label === 'Clear', label)
    await open('rangesel')
    await page.click('[role=dialog] button[data-iso="2026-03-05"]', { force: true })
    await page.keyboard.press('Shift+Tab')
    const prev = await page.evaluate(() => ({ tag: document.activeElement?.tagName, day: document.activeElement?.hasAttribute('data-iso') }))
    check('After clicking a disabled day, Shift+Tab goes to the next-month arrow', prev.tag === 'BUTTON' && !prev.day, JSON.stringify(prev))
    check('Disabled days stay unselectable', (await out('rangesel')) === '2026-03-15', await out('rangesel'))


    // ---- N4: month navigation keeps the intended day ----------------------------
    const tabStop = () => page.evaluate(() => document.querySelector('[role=dialog] button[data-iso][tabindex="0"]')?.getAttribute('data-iso'))
    const arrow = (which) => page.locator('[role=dialog] button:not([data-iso])').nth(which === 'prev' ? 0 : 1)
    const step = async (which, expect, label) => {
      await arrow(which).click()
      await page.waitForFunction((iso) => document.querySelector('[role=dialog] button[data-iso][tabindex="0"]')?.getAttribute('data-iso') === iso, expect, { timeout: 1500 }).catch(() => {})
      const got = await tabStop()
      check(label, got === expect, got)
    }
    await open('jan31')
    await step('next', '2026-02-28', 'Jan 31 -> Feb 28')
    await step('next', '2026-03-31', 'Feb 28 -> Mar 31 (not Mar 28)')
    await step('prev', '2026-02-28', 'Mar 31 -> Feb 28')
    await step('prev', '2026-01-31', 'Feb 28 -> Jan 31')
    check('Navigating months does not change the value', (await out('jan31')) === '2026-01-31' && (await page.locator('[role=dialog]').count()) === 1, await out('jan31'))
    await open('jan31leap')
    await step('next', '2024-02-29', 'Leap year: Jan 31 -> Feb 29')
    await step('next', '2024-03-31', 'Leap year: Feb 29 -> Mar 31')
    await step('prev', '2024-02-29', 'Leap year: Mar 31 -> Feb 29')
    await page.selectOption('[role=dialog] select:nth-of-type(2)', '2025')
    check('Year select: Feb 29 2024 -> Feb 28 2025', (await tabStop()) === '2025-02-28', await tabStop())
    await page.selectOption('[role=dialog] select:nth-of-type(2)', '2028')
    check('Year select: back to a leap year restores Feb 29', (await tabStop()) === '2028-02-29', await tabStop())
    await page.selectOption('[role=dialog] select:nth-of-type(1)', '3')
    check('Month select: Feb 29 -> Mar 31', (await tabStop()) === '2028-03-31', await tabStop())
    await open('jan31')
    await press('PageDown', '2026-02-28', 'PageDown Jan 31 -> Feb 28')
    await press('PageDown', '2026-03-31', 'PageDown Feb 28 -> Mar 31')
    await press('ArrowRight', '2026-04-01', 'ArrowRight picks a new day (Apr 1)')
    await press('PageDown', '2026-05-01', 'PageDown keeps the newly picked day')
    await open('jan31')
    await page.keyboard.press('ArrowLeft') // Jan 30
    await press('PageDown', '2026-02-28', 'Jan 30 PageDown -> Feb 28')
    await press('PageUp', '2026-01-30', 'Feb 28 PageUp -> Jan 30 (remembers 30)')

    // ---- year-list boundary: arrows agree with PageUp/PageDown and the year select ----
    const arrowState = () => page.$$eval('[role=dialog] button:not([data-iso])', (b) => b.slice(0, 2).map((x) => x.getAttribute('aria-disabled')).join())
    const dialogLabel = () => page.getAttribute('[role=dialog]', 'aria-label')
    await open('founded')
    await page.selectOption('[role=dialog] select:nth-of-type(2)', '1800')
    await page.selectOption('[role=dialog] select:nth-of-type(1)', '2')
    check('minYear: Feb 1800 -> previous arrow still works', (await arrowState()) === 'false,false', await arrowState())
    await arrow('prev').click()
    const monthYear = () => page.evaluate(() => [...document.querySelectorAll('[role=dialog] select')].map((e) => e.value).join('/'))
    check('minYear: previous arrow reaches January 1800', (await monthYear()) === '1/1800', await monthYear())
    check('minYear: ...and is then disabled', (await arrowState()).startsWith('true'), await arrowState())
    await arrow('prev').click({ force: true })
    check('minYear: clicking it at Jan 1800 does not go to 1799', (await monthYear()) === '1/1800', await monthYear())
    await page.focus('[role=dialog] button[data-iso][tabindex="0"]')
    await page.keyboard.press('PageUp')
    await page.keyboard.press('Shift+PageUp')
    check('minYear: PageUp / Shift+PageUp at Jan 1800 agree with the arrow (stay)', (await monthYear()) === '1/1800', await monthYear())
    await open('dob')
    const dobYears = await page.$$eval('[role=dialog] select:nth-of-type(2) option', (o) => o.map((x) => Number(x.value)))
    await page.selectOption('[role=dialog] select:nth-of-type(2)', String(dobYears[dobYears.length - 1]))
    await page.selectOption('[role=dialog] select:nth-of-type(1)', '1')
    check('DOB: oldest year, January -> previous arrow disabled (default range unchanged)', (await arrowState()).startsWith('true'), await arrowState())
    await page.selectOption('[role=dialog] select:nth-of-type(2)', String(dobYears[0]))
    await page.selectOption('[role=dialog] select:nth-of-type(1)', '12')
    check('Top of the year list, December -> next arrow disabled', (await arrowState()).endsWith('true'), await arrowState())
    await arrow('next').click({ force: true })
    check('...and clicking it stays in that December', (await page.$eval('[role=dialog] select:nth-of-type(2)', (e) => Number(e.value))) === dobYears[0])

    // ---- year-list edges: every key and the arrows agree --------------------------------
    const hiYear = new Date().getFullYear() + 20
    const atEdge = async (id, name, year, month, climb, edgeISO, keys, arrowIdx) => {
      await open(id)
      await page.selectOption('[role=dialog] select:nth-of-type(2)', String(year))
      await page.selectOption('[role=dialog] select:nth-of-type(1)', String(month))
      await page.focus('[role=dialog] button[data-iso][tabindex="0"]')
      for (let i = 0; i < 5; i++) await page.keyboard.press(climb)
      await page.waitForFunction((iso) => document.activeElement?.getAttribute('data-iso') === iso, edgeISO, { timeout: 1500 }).catch(() => {})
      check(name + ': ' + climb + ' climbs to the edge day and stops there', (await focusedISO()) === edgeISO, await focusedISO())
      for (const key of keys) await press(key, edgeISO, name + ' edge ' + edgeISO + ': ' + key + ' stays')
      check(name + ': the view stayed in the edge month', (await monthYear()) === month + '/' + year, await monthYear())
      check(name + ': the month arrow is disabled', (await arrowState()).split(',')[arrowIdx] === 'true', await arrowState())
    }
    await atEdge('yrs', 'First year', 2020, 1, 'ArrowUp', '2020-01-01', ['ArrowLeft', 'ArrowUp', 'Home', 'PageUp', 'Shift+PageUp'], 0)
    await press('ArrowRight', '2020-01-02', 'First year: ArrowRight leaves the edge normally')
    await press('Home', '2020-01-01', 'First year: Home from Jan 2 clamps to Jan 1')
    await atEdge('yrs', 'Last year', hiYear, 12, 'ArrowDown', hiYear + '-12-31', ['ArrowRight', 'ArrowDown', 'End', 'PageDown', 'Shift+PageDown'], 1)
    await press('ArrowLeft', hiYear + '-12-30', 'Last year: ArrowLeft leaves the edge normally')
    await press('ArrowRight', hiYear + '-12-31', 'Last year: ArrowRight comes back')

    // min-only and max-only pickers (the real callers): the other end is the year list's
    await atEdge('minonly', 'min-only, last year', hiYear, 12, 'ArrowDown', hiYear + '-12-31', ['ArrowRight', 'ArrowDown', 'End', 'PageDown', 'Shift+PageDown'], 1)
    await atEdge('maxonly', 'max-only, first year', new Date().getFullYear() - 100, 1, 'ArrowUp', new Date().getFullYear() - 100 + '-01-01', ['ArrowLeft', 'ArrowUp', 'Home', 'PageUp', 'Shift+PageUp'], 0)

    // ---- opening outside the allowed years lands inside them ----------------------------
    await open('dmlow')
    check('defaultMonth before the first year opens on the first day of the list', (await focusedISO()) === '1800-01-01' && (await monthYear()) === '1/1800', (await focusedISO()) + ' ' + (await monthYear()))
    check('...and the user can navigate from there', (await arrowState()) === 'true,false')
    await press('ArrowRight', '1800-01-02', '...ArrowRight moves on')
    await open('dmhigh')
    check('defaultMonth after the last year opens on the last day of the list', (await focusedISO()) === hiYear + '-12-31' && (await monthYear()) === '12/' + hiYear, (await focusedISO()) + ' ' + (await monthYear()))
    check('...and the user can navigate from there', (await arrowState()) === 'false,true')
    await press('ArrowLeft', hiYear + '-12-30', '...ArrowLeft moves on')
    await open('below')
    check('A value below min opens on min, not on the stale value', (await focusedISO()) === '2026-03-10', await focusedISO())

    // ---- N5: min after max ---------------------------------------------------------
    await open('inverted')
    const dayStates = await page.$$eval('[role=dialog] button[data-iso]', (b) => b.map((x) => x.getAttribute('aria-disabled')))
    check('min > max: every day is disabled', dayStates.length > 0 && dayStates.every((x) => x === 'true'), String(dayStates))
    const navStates = await page.$$eval('[role=dialog] button:not([data-iso])', (b) => b.slice(0, 2).map((x) => x.getAttribute('aria-disabled')))
    check('min > max: both month arrows are disabled', navStates.join() === 'true,true', String(navStates))
    const selDisabled = await page.$$eval('[role=dialog] select', (x) => x.map((e) => e.disabled))
    check('min > max: month and year selects are disabled too', selDisabled.length === 2 && selDisabled.every(Boolean), String(selDisabled))
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
    check('min > max: Tab keeps focus inside the picker', await page.evaluate(() => !!document.querySelector('[role=dialog]')?.contains(document.activeElement)))
    await page.focus('[role=dialog] button[data-iso="2026-06-05"]')
    await page.click('[role=dialog] button[data-iso="2026-06-05"]', { force: true })
    check('min > max: clicking a day selects nothing and stays open', (await out('inverted')) === '' && (await page.locator('[role=dialog]').count()) === 1)
    for (const key of ['ArrowRight', 'PageDown', 'End', 'Home', 'ArrowUp']) await page.keyboard.press(key)
    check('min > max: keys do nothing, focus stays on a day', (await focusedISO()) === '2026-06-05', await focusedISO())
    check('min > max: Today is not selectable', await page.$eval('[role=dialog]', (d) => [...d.querySelectorAll('button:not([data-iso])')].pop().matches('[disabled],[aria-disabled=true]')))
    await open('invertedyears')
    const invFocus = await focusedISO()
    check('min > max (years inverted): opens, no selectable day', (await page.$$eval('[role=dialog] button[data-iso]', (b) => b.length > 0 && b.every((x) => x.getAttribute('aria-disabled') === 'true'))))
    await page.keyboard.press('ArrowRight')
    check('min > max (years inverted): keys are safe, focus and view stay put', (await page.locator('[role=dialog]').count()) === 1 && (await focusedISO()) === invFocus, invFocus + ' -> ' + (await focusedISO()))

    // ---- N3: a month arrow that becomes disabled keeps focus -------------------------
    const active = () => page.evaluate(() => {
      const a = document.activeElement
      return { tag: a?.tagName, role: a?.getAttribute('role'), disabled: a?.getAttribute('aria-disabled'), label: a?.getAttribute('aria-label'), iso: a?.getAttribute('data-iso') }
    })
    await open('span')
    await page.keyboard.press('Shift+Tab') // day -> next arrow (Jan 2026)
    let a = await active()
    check('Shift+Tab from the day reaches the next-month arrow', a.tag === 'BUTTON' && !a.iso && a.disabled === 'false', JSON.stringify(a))
    await page.keyboard.press('Enter') // go to Jan 2026: nothing further is selectable, arrow becomes disabled
    await page.waitForTimeout(150)
    a = await active()
    check('Arrow that just became disabled keeps focus (not the popover root)', a.tag === 'BUTTON' && a.disabled === 'true' && a.role !== 'dialog', JSON.stringify(a))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    a = await active()
    check('Enter on the disabled arrow does nothing', a.disabled === 'true' && (await page.locator('[role=dialog]').count()) === 1 && /Jan/.test(await page.getAttribute('[role=dialog]', 'aria-label')), JSON.stringify(a))
    await page.keyboard.press('Tab')
    a = await active()
    check('Tab from the disabled arrow reaches the day grid', a.iso === '2026-01-02', JSON.stringify(a))
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    a = await active()
    check('Shift+Tab walks back through the year select', a.tag === 'SELECT', JSON.stringify(a))
    await page.keyboard.press('Tab')
    a = await active()
    check('Tab returns to the disabled arrow', a.disabled === 'true', JSON.stringify(a))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    check('Escape from the disabled arrow closes the picker', (await page.locator('[role=dialog]').count()) === 0)
    check('Escape restores focus to the trigger', (await page.evaluate(() => document.activeElement?.id)) === 'span')
    // and with the popover root as the only fallback: a click on blank space still works
    await open('span')
    await page.click('[role=dialog]', { position: { x: 3, y: 3 } })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    check('Escape after clicking blank popover space closes it', (await page.locator('[role=dialog]').count()) === 0)

    // ---- N7: popover lifecycle --------------------------------------------------------
    await page.evaluate(() => window.scrollTo(0, 0))
    let base = await page.evaluate(() => window.__alive())
    await open('founded')
    let live = await page.evaluate(() => window.__alive())
    check('Open picker holds listeners and an observer', live.listeners > base.listeners && live.observers === base.observers + 1, JSON.stringify({ base, live }))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    live = await page.evaluate(() => window.__alive())
    check('Closing the picker removes them all', live.listeners === base.listeners && live.observers === base.observers, JSON.stringify({ base, live }))

    await open('founded')
    const rect = await page.evaluate(() => { const r = document.getElementById('founded').getBoundingClientRect(); return { top: r.top, h: r.height } })
    await page.evaluate((y) => window.scrollTo(0, y), rect.top + rect.h / 2)
    await page.waitForTimeout(400)
    check('Trigger half out of view: picker stays open', (await page.locator('[role=dialog]').count()) === 1)
    await page.evaluate(() => window.scrollTo(0, 3000))
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'), null, { timeout: 3000 }).catch(() => {})
    check('Trigger completely out of view: picker closes', (await page.locator('[role=dialog]').count()) === 0)
    check('Out-of-view close hands focus to the trigger without scrolling', (await page.evaluate(() => document.activeElement?.id)) === 'founded' && (await page.evaluate(() => window.scrollY)) > 1000)
    live = await page.evaluate(() => window.__alive())
    check('Out-of-view close removes listeners and observer', live.listeners === base.listeners && live.observers === base.observers, JSON.stringify({ base, live }))
    await page.evaluate(() => window.scrollTo(0, 0))

    await page.click('#life')
    await page.waitForSelector('[role=dialog] button[data-iso]:focus')
    await page.evaluate(() => document.getElementById('life-toggle').click()) // programmatic: no mousedown, so not an outside click
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'), null, { timeout: 2000 }).catch(() => {})
    check('Field becomes disabled while open: picker closes', (await page.locator('[role=dialog]').count()) === 0 && (await page.locator('#life').isDisabled()))
    let fid = await page.evaluate(() => document.activeElement?.id)
    check('Disabled while focus was in the picker: focus skips a disabled and a hidden neighbour and lands on the next usable control, not the disabled trigger or <body>', fid === 'life-toggle', fid)
    await page.keyboard.press('Tab')
    const afterTab = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
    await page.keyboard.press('Shift+Tab')
    fid = await page.evaluate(() => document.activeElement?.id)
    check('Keyboard is not stuck after that (Tab moves on, Shift+Tab comes back)', afterTab !== 'life-toggle' && afterTab !== 'BODY' && fid === 'life-toggle', afterTab + ' / ' + fid)
    live = await page.evaluate(() => window.__alive())
    check('Disabled close removes listeners and observer', live.listeners === base.listeners && live.observers === base.observers, JSON.stringify({ base, live }))
    await page.evaluate(() => document.getElementById('life-toggle').click())
    await page.click('#life')
    await page.waitForSelector('[role=dialog]')
    await page.evaluate(() => document.getElementById('life-hide').click())
    await page.waitForTimeout(150)
    live = await page.evaluate(() => window.__alive())
    check('Unmounting an open picker removes listeners and observer', (await page.locator('[role=dialog]').count()) === 0 && live.listeners === base.listeners && live.observers === base.observers, JSON.stringify({ base, live }))

    await page.click('#life2')
    await page.waitForSelector('[role=dialog] button[data-iso]:focus')
    await page.evaluate(() => document.getElementById('life2-toggle').click())
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'), null, { timeout: 2000 }).catch(() => {})
    fid = await page.evaluate(() => document.activeElement?.id)
    check('Disabled with nothing after it: focus goes to the control before it', (await page.locator('[role=dialog]').count()) === 0 && fid === 'life2-toggle', fid)
    await page.evaluate(() => window.scrollTo(0, 0))

    await open('range')
    await page.mouse.click(5, 5)
    await page.waitForTimeout(100)
    check('Outside click still closes', (await page.locator('[role=dialog]').count()) === 0)
    await open('range')
    await page.keyboard.press('Escape')
    check('Escape still closes and restores trigger focus', (await page.locator('[role=dialog]').count()) === 0 && (await page.evaluate(() => document.activeElement?.id)) === 'range')

    // ---- date-only and datetime bounds, with no timezone shift -----------------------------
    const boundsOn = async (pg, label) => {
      const openOn = async (id) => {
        if (await pg.locator('[role=dialog]').count()) await pg.keyboard.press('Escape')
        await pg.click('#' + id)
        await pg.waitForSelector('[role=dialog] button[data-iso]:focus')
      }
      const days = ['2026-03-09', '2026-03-10', '2026-03-20', '2026-03-21']
      const dis = (iso) => pg.getAttribute('[role=dialog] button[data-iso="' + iso + '"]', 'aria-disabled')
      for (const id of ['dateonly', 'dtbound', 'spacebound']) {
        await openOn(id)
        const st = await Promise.all(days.map(dis))
        check(label + ' ' + id + ': 9th and 21st disabled, 10th and 20th selectable', st.join() === 'true,false,false,true', st.join())
        const yrs = await pg.$$eval('[role=dialog] select:nth-of-type(2) option', (o) => o.map((x) => x.value).join())
        check(label + ' ' + id + ': year list is just 2026', yrs === '2026', yrs)
        await pg.click('[role=dialog] button[data-iso="2026-03-10"]')
        check(label + ' ' + id + ': picking the min day selects it', (await pg.textContent('#' + id + '-out')) === '2026-03-10', await pg.textContent('#' + id + '-out'))
        await openOn(id)
        await pg.click('[role=dialog] button[data-iso="2026-03-20"]')
        check(label + ' ' + id + ': picking the max day selects it', (await pg.textContent('#' + id + '-out')) === '2026-03-20', await pg.textContent('#' + id + '-out'))
      }
      for (const id of ['badmin', 'badfeb', 'badtail']) {
        await openOn(id)
        const bad = await Promise.all(days.map(dis))
        check(label + ' ' + id + ': an unusable bound is ignored, not "every day disabled"', bad.join() === 'false,false,false,false', bad.join())
      }
      await pg.keyboard.press('Escape')
    }
    await boundsOn(page, 'local tz')
    for (const timezoneId of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, timezoneId })
      const pg = await ctx.newPage()
      await pg.goto(FE + '/datepicker-harness', { waitUntil: 'networkidle', timeout: 120000 })
      await pg.waitForSelector('#dateonly')
      await boundsOn(pg, timezoneId)
      await ctx.close()
    }
    await page.evaluate(() => window.scrollTo(0, 0))

    // ---- N8: labels name the date fields --------------------------------------------
    const named = await page.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Founded field label'))
      const ctl = label && label.htmlFor ? document.getElementById(label.htmlFor) : null
      return { found: !!ctl, isTrigger: ctl?.tagName === 'BUTTON' && ctl.getAttribute('aria-haspopup') === 'dialog' }
    })
    check('Field-wrapped Founded picker (employer profile pattern) is named by its label', named.found && named.isTrigger, JSON.stringify(named))
    check('...and Playwright resolves it by that label', (await page.getByLabel('Founded field label').count()) === 1)
    await page.goto(FE + '/datepicker-harness/modal', { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForSelector('[role=dialog], form, h2', { timeout: 60000 })
    const modal = await page.evaluate(() => {
      const trigger = [...document.querySelectorAll('button[aria-haspopup="dialog"]')][0]
      const lab = trigger?.id ? document.querySelector('label[for="' + CSS.escape(trigger.id) + '"]') : null
      return { hasId: !!trigger?.id, label: lab?.textContent.trim() ?? '', labelsForId: trigger?.id ? document.querySelectorAll('label[for="' + CSS.escape(trigger.id) + '"]').length : 0, idCount: trigger?.id ? document.querySelectorAll('[id="' + CSS.escape(trigger.id) + '"]').length : 0 }
    })
    check('Interview modal: date picker has an id and exactly one label naming it', modal.hasId && modal.label.length > 0 && modal.labelsForId === 1 && modal.idCount === 1, JSON.stringify(modal))
    const fields = await page.evaluate(() => {
      const one = (el) => {
        if (!el || !el.id) return { id: false }
        const q = CSS.escape(el.id)
        return { id: true, labels: document.querySelectorAll('label[for="' + q + '"]').length, dupes: document.querySelectorAll('[id="' + q + '"]').length, text: document.querySelector('label[for="' + q + '"]')?.textContent.trim() ?? '' }
      }
      return { time: one(document.querySelector('input[type="text"]')), notes: one(document.querySelector('textarea')) }
    })
    for (const k of ['time', 'notes']) {
      const f = fields[k]
      check('Interview modal: ' + k + ' field has an id and exactly one label naming it', f.id && f.labels === 1 && f.dupes === 1 && f.text.length > 0, JSON.stringify(f))
      check('Interview modal: ' + k + ' field resolves by its visible label text', f.text.length > 0 && (await page.getByLabel(f.text, { exact: true }).count()) === 1, f.text)
    }
    check('Interview modal: picker resolves by its visible label text', modal.label.length > 0 && (await page.getByLabel(modal.label, { exact: true }).count()) === 1, modal.label)

    // company-details sits behind a registration guard, so check the wiring from source
    {
      const src = fs.readFileSync(path.join(ROOT, 'src/app/employer/register/company-details/page.tsx'), 'utf8')
      const label = src.match(/<label htmlFor=\{(\w+)\}[^\n]*foundedDate/)
      const picker = label && src.match(new RegExp('<DatePicker id=\\{' + label[1] + '\\}'))
      check('company-details: Founded label htmlFor matches the picker id', !!label && !!picker && new RegExp('const ' + label[1] + ' = useId\\(\\)').test(src))
    }

    // ---- focus hand-off stays inside the modal -------------------------------------------
    await page.goto(FE + '/datepicker-harness/overlay', { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForSelector('#ov')
    for (const [mode, want, why] of [
      ['A', 'ov-next', 'next control inside the modal'],
      ['B', 'ov-prev', 'previous control inside the modal (the only one after it is behind the overlay)'],
      ['C', 'ov-overlay', 'nothing usable: the overlay itself, not <body> or a control behind it'],
      ['D', 'behind-after', 'a plain form is not an overlay, so with nothing else in the form the page is searched'],
    ]) {
      await page.evaluate((m) => { window.__setOff(false); window.__setMode(m) }, mode)
      await page.click('#ov')
      await page.waitForSelector('[role=dialog] button[data-iso]:focus')
      await page.evaluate(() => window.__setOff(true))
      await page.waitForFunction(() => !document.querySelector('[role=dialog]'), null, { timeout: 2000 }).catch(() => {})
      const where = await page.evaluate(() => (document.activeElement === document.body ? 'BODY' : document.activeElement?.id))
      check('Modal hand-off (' + mode + '): ' + why, where === want, where)
    }
    // The overlay is only made focusable while it holds focus, and its own attributes survive.
    const leftover = async () => {
      await page.evaluate(() => document.getElementById('behind-before').focus())
      return page.evaluate(() => { const o = document.getElementById('ov-overlay'); return { tabindex: o.getAttribute('tabindex'), outline: o.style.outline } })
    }
    await page.evaluate(() => { window.__setMode('C'); window.__setOff(false) })
    await page.click('#ov')
    await page.waitForSelector('[role=dialog] button[data-iso]:focus')
    await page.evaluate(() => window.__setOff(true))
    await page.waitForFunction(() => document.activeElement?.id === 'ov-overlay', null, { timeout: 2000 }).catch(() => {})
    const during = await page.evaluate(() => { const o = document.getElementById('ov-overlay'); return { tabindex: o.getAttribute('tabindex'), outline: o.style.outline } })
    check('Modal fallback: the overlay is focusable only while it has focus', during.tabindex === '-1' && during.outline === 'none', JSON.stringify(during))
    const after = await leftover()
    check('Modal fallback: tabindex and outline are removed again afterwards', after.tabindex === null && after.outline === '', JSON.stringify(after))
    await page.evaluate(() => { window.__setOff(false); const o = document.getElementById('ov-overlay'); o.setAttribute('tabindex', '0'); o.style.outline = '1px solid red' })
    await page.evaluate(() => (window.__keep = document.getElementById('ov-overlay').style.outline))
    await page.click('#ov')
    await page.waitForSelector('[role=dialog] button[data-iso]:focus')
    await page.evaluate(() => window.__setOff(true))
    await page.waitForFunction(() => document.activeElement?.id === 'ov-overlay', null, { timeout: 2000 }).catch(() => {})
    await page.evaluate(() => (window.__tookFocus = document.activeElement?.id === 'ov-overlay'))
    check("Modal fallback: the overlay took focus (caller's own tabindex case)", (await page.evaluate(() => window.__tookFocus)) === true)
    const kept = await leftover()
    const keep = await page.evaluate(() => window.__keep)
    check("Modal fallback: a caller's own tabindex and outline are left as they were", kept.tabindex === '0' && kept.outline === keep, JSON.stringify({ kept, keep }))

    // Founded callers pass minYear (they are behind login, so checked from source)
    for (const f of ['src/app/employer/profile/page.tsx', 'src/app/employer/register/company-details/page.tsx']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      // One element's props, wherever the line breaks fall (props contain `=>`, so no [^>]).
      const tag = src.split('<DatePicker').slice(1).map((c) => c.split('/>')[0]).find((c) => /Founded/i.test(c))
      check(`${f}: Founded picker passes minYear`, !!tag && /minYear=\{\d+\}/.test(tag) && !/\bmin=/.test(tag))
    }
  } finally {
    await browser.close()
    cleanup()
  }
  const failed = results.filter((r) => !r).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exitCode = failed ? 1 : 0
}

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130) })

main().catch((e) => {
  cleanup()
  console.error(e)
  process.exit(1)
})
