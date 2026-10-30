#!/usr/bin/env node
/**
 * Public-header check — the mechanical gate for src/lib/publicNav.ts: what the shared
 * public header links to on `/`, `/employee` and `/employer/welcome`.
 *
 *   node scripts/verify-public-nav.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory (see lib-verify.mjs). No network,
 * no new dependencies.
 *
 * Pins three things:
 *   1. Destinations — in particular that "Companies" still means exactly what it meant
 *      (label `nav.companies` → /employer/welcome) until the product owner decides what
 *      it should be. If someone renames or retargets it, this fails on purpose.
 *   2. Register is the one word everywhere; only its destination differs by audience.
 *   3. Every label the header and its Menu use exists, with text, in all 10 portal
 *      locales — so a language-specific gap cannot ship as a raw key.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import { ROOT, createChecker, loadLib } from './lib-verify.mjs'

const LOCALES = path.join(ROOT, 'src', 'locales')

globalThis.window = { location: { origin: 'https://prosiddhi.test' } }

const {
  publicNavItems,
  publicMenuItems,
  publicRegisterHref,
  publicLoginHref,
  PUBLIC_LOGIN_HREF,
  EMPLOYER_REGISTER_HREF,
} = loadLib('publicNav')
const { expect, finish } = createChecker()

const VARIANTS = ['main', 'seeker', 'employer']
const pick = (items) => items.map((i) => [i.id, i.labelKey, i.href])

// --- destinations, per page ---
expect('main: Find Jobs, Companies', pick(publicNavItems('main')), [
  ['findJobs', 'nav.findJobs', '/employee#jobs'],
  ['companies', 'nav.companies', '/employer/welcome'],
])
expect('seeker: Find Jobs, Companies and the existing Employer link', pick(publicNavItems('seeker')), [
  ['findJobs', 'nav.findJobs', '/employee#jobs'],
  ['companies', 'nav.companies', '/employer/welcome'],
  ['employer', 'seeker:nav.employer', '/employer/welcome'],
])
expect('employer: the page anchors and Help', pick(publicNavItems('employer')), [
  ['offer', 'employer:landing.offers.heading', '#offer'],
  ['findWorkers', 'employer:landing.nav.findWorkers', '#hero'],
  ['help', 'employer:landing.help', '/contact'],
])

// --- Companies is unchanged (pending the product decision) ---
for (const v of ['main', 'seeker']) {
  const c = publicNavItems(v).find((i) => i.id === 'companies')
  expect(`${v}: Companies label is unchanged`, c?.labelKey, 'nav.companies')
  expect(`${v}: Companies still opens the employer landing page`, c?.href, '/employer/welcome')
}

// --- Register / Login ---
expect('login goes to /login', PUBLIC_LOGIN_HREF, '/login')
expect('employer sign-up constant', EMPLOYER_REGISTER_HREF, '/employer/register')
expect('main: register', publicRegisterHref('main'), '/register')
expect('seeker: register', publicRegisterHref('seeker'), '/register')
expect('employer: register', publicRegisterHref('employer'), '/employer/register')

// --- the Menu is the page's links, then Register (what the smoke test expects) ---
for (const v of VARIANTS) {
  const menu = publicMenuItems(v)
  expect(`${v}: Menu = page links + Register`, pick(menu.slice(0, -1)), pick(publicNavItems(v)))
  expect(`${v}: Menu ends with Register`, pick(menu.slice(-1)), [['register', 'nav.register', publicRegisterHref(v)]])
}

// --- a logged-out job page: Register and Login carry the job ---
{
  const JOB = '/job-details/e7adbe71-27c0-402d-8ecc-b91b13a61f5f?from=employee'
  const enc = encodeURIComponent(JOB)
  expect('seeker register with a job', publicRegisterHref('seeker', JOB), `/register?returnUrl=${enc}`)
  expect('main register with a job', publicRegisterHref('main', JOB), `/register?returnUrl=${enc}`)
  expect('employer register ignores a job', publicRegisterHref('employer', JOB), '/employer/register')
  expect('login with a job', publicLoginHref(JOB), `/login?returnUrl=${enc}`)
  expect('login without a job', publicLoginHref(), '/login')
  expect('register without a job', publicRegisterHref('seeker'), '/register')
  expect('Menu Register carries the job', pick(publicMenuItems('seeker', JOB).slice(-1)), [['register', 'nav.register', `/register?returnUrl=${enc}`]])
  // The same path the Apply link uses, so the three entry points agree.
  const { publicJobPath, loginForJobHref } = loadLib('publicJobs')
  expect('publicJobPath', publicJobPath('abc'), '/job-details/abc?from=employee')
  expect('Apply link = publicLoginHref(publicJobPath)', loginForJobHref('abc'), publicLoginHref(publicJobPath('abc')))
  // …and it survives the round trip through the address bar and the store.
  const { rememberPendingReturn, destinationAfterSeekerRegistration } = loadLib('pendingReturn')
  const fromUrl = new URLSearchParams(publicRegisterHref('seeker', JOB).split('?')[1]).get('returnUrl')
  expect('returnUrl decodes back to the job path', fromUrl, JOB)
  const m = new Map()
  const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) }
  rememberPendingReturn(fromUrl, store)
  expect('after sign-up: back to the job', destinationAfterSeekerRegistration(store), JOB)
}

// --- ids are unique within a page (the bar keys off them) ---
for (const v of VARIANTS) {
  const ids = publicMenuItems(v).map((i) => i.id)
  expect(`${v}: item ids are unique`, new Set(ids).size, ids.length)
}

// --- every label exists, with text, in all 10 locales ---
const LANGS = ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']
const labelKeys = new Set(['nav.register', 'nav.login', 'nav.menu', 'nav.mainNavigation', 'language.select'])
for (const v of VARIANTS) for (const i of publicNavItems(v)) labelKeys.add(i.labelKey)

const parsed = new Map()
function lookup(lang, key) {
  const [ns, rest] = key.includes(':') ? key.split(':') : ['common', key]
  const file = path.join(LOCALES, lang, `${ns}.json`)
  if (!parsed.has(file)) parsed.set(file, JSON.parse(fs.readFileSync(file, 'utf8')))
  let node = parsed.get(file)
  for (const part of rest.split('.')) node = node?.[part]
  return node
}
for (const lang of LANGS) {
  for (const key of labelKeys) {
    const v = lookup(lang, key)
    expect(`${lang}: ${key} has text`, typeof v === 'string' && v.trim().length > 0, true)
  }
}

finish('public-nav')
