#!/usr/bin/env node
/**
 * Seeker bottom nav — the mechanical gate for src/lib/seekerNav.ts and for how
 * SeekerBottomNav / EmployeeHeader / UserDropdown wire it in.
 *
 *   node scripts/verify-seeker-nav.mjs
 *
 * Two kinds of check, same approach as verify-login-session.mjs (no new dependencies):
 *   1. LOGIC     the REAL src/lib/seekerNav.ts, transpiled in memory — tab list, More list,
 *                which tab is lit for a given `active` + pathname.
 *   2. WIRING    assertions on the component sources and CSS — responsive visibility, safe-area,
 *                language reuse, desktop nav untouched, locale keys. These read text, so they
 *                prove the pieces are present and consistent, not how a browser lays them out.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8')

const cache = new Map()
function loadLib(name) {
  if (cache.has(name)) return cache.get(name).exports
  const file = path.join(SRC, 'lib', `${name}.ts`)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const mod = new Module(file)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  const baseRequire = createRequire(file)
  mod.require = (id) => (id.startsWith('@/lib/') ? loadLib(id.slice('@/lib/'.length)) : baseRequire(id))
  cache.set(name, mod)
  mod._compile(outputText, file)
  return mod.exports
}

let checks = 0
const failures = []
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(actual)
  const w = JSON.stringify(want)
  if (a !== w) failures.push(`${name}\n    got  ${a}\n    want ${w}`)
}
const ok = (name, cond) => expect(name, !!cond, true)

const nav = loadLib('seekerNav')

// ── 1. LOGIC ────────────────────────────────────────────────────────────────
expect('tabs: keys, in order', nav.SEEKER_NAV_TABS.map((t) => t.key), ['home', 'jobFeed', 'savedJobs'])
expect('tabs: routes', nav.SEEKER_NAV_TABS.map((t) => t.href), ['/home', '/job-feed', '/saved-jobs'])
expect('tabs: labels reuse seeker:nav.*', nav.SEEKER_NAV_TABS.map((t) => t.labelKey), [
  'seeker:nav.home',
  'seeker:nav.jobFeed',
  'seeker:nav.savedJobs',
])
expect('more: routes', nav.SEEKER_MORE_ITEMS.map((i) => i.href), ['/my-applications', '/my-interviews', '/settings', '/profile'])
expect('more: labels reuse nav.*', nav.SEEKER_MORE_ITEMS.map((i) => i.labelKey), [
  'nav.myApplications',
  'nav.myInterviews',
  'nav.settings',
  'nav.profile',
])

// Every linked route is a real page.
for (const href of [...nav.SEEKER_NAV_TABS, ...nav.SEEKER_MORE_ITEMS].map((x) => x.href)) {
  ok(`route exists: ${href}`, fs.existsSync(path.join(SRC, 'app', href, 'page.tsx')))
}

// Active styling: exactly one of the four is lit.
expect('more lit on /settings', nav.isMoreActive(undefined, '/settings'), true)
expect('more lit on /my-applications', nav.isMoreActive(undefined, '/my-applications'), true)
expect('more lit on /my-applications/42', nav.isMoreActive(undefined, '/my-applications/42'), true)
expect('more lit on /profile', nav.isMoreActive(undefined, '/profile'), true)
expect('more NOT lit when a tab is active', nav.isMoreActive('home', '/my-applications'), false)
expect('more NOT lit on /home with no active', nav.isMoreActive(undefined, '/home'), false)
expect('more NOT lit on a look-alike prefix', nav.isMoreActive(undefined, '/settingsx'), false)
expect('more NOT lit on /profile-foo', nav.isMoreActive(undefined, '/profile-foo'), false)
expect('more NOT lit with null pathname', nav.isMoreActive(undefined, null), false)
expect('more NOT lit with undefined pathname', nav.isMoreActive(undefined, undefined), false)
// job-details with no ?from= has no active tab and is not a More page: nothing lit.
expect('job-details without from: nothing lit', nav.isMoreActive(undefined, '/job-details/9'), false)

// ── 2. WIRING ───────────────────────────────────────────────────────────────
// The bar and the More sheet live in two files (the sheet is shared with the employer bar),
// so the wiring checks read both as one.
const bar = read('components/navigation/SeekerBottomNav.tsx') + read('components/navigation/BottomNavShared.tsx')
const header = read('components/navigation/EmployeeHeader.tsx')
const dropdown = read('components/navigation/UserDropdown.tsx')
const css = read('styles/globals.css')
const popup = read('components/feedback/TestOtpPopup.tsx')
const layout = read('app/layout.tsx')

// Responsive visibility.
ok('bar is hidden from lg up', /<nav[\s\S]*?className=\{BOTTOM_NAV_BAR_CLS\}/.test(bar) && bar.includes("'lg:hidden fixed bottom-0 inset-x-0"))
ok('desktop nav still hidden below lg, flex at lg', header.includes('<nav className={`hidden lg:flex items-center'))
ok('header grid: 2 columns below lg, 3 at lg', header.includes('grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr]'))

// Layering and clearance.
ok('bar is below modals (z-40)', /fixed bottom-0 inset-x-0 z-40/.test(bar))
ok('bar gets the same `active` prop', header.includes('<SeekerBottomNav active={active} />'))
ok('EmployeeHeaderActiveTab is the shared type', header.includes('EmployeeHeaderActiveTab = SeekerNavTab'))
ok('body class is set and removed on unmount', bar.includes('classList.add(BOTTOM_NAV_BODY_CLASS)') && bar.includes('classList.remove(BOTTOM_NAV_BODY_CLASS)'))
expect('body class name matches the CSS', css.includes(`body.${nav.BOTTOM_NAV_BODY_CLASS}`), true)
ok('CSS padding only below lg', /@media \(max-width: 1023\.98px\)\s*\{\s*body\.has-seeker-bottom-nav/.test(css))
ok('CSS padding height matches the constant', css.includes(`calc(${nav.SEEKER_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`))
ok('test-OTP popup lifts above the bar', popup.includes('bottom-[calc(1rem+var(--bottom-nav-h,0px))]'))

// Language: reuses the one hook and the one option list; no second API call.
ok('language uses useLanguagePreference', bar.includes("useLanguagePreference } from '@/hooks/useLanguagePreference'") && bar.includes('= useLanguagePreference()'))
ok('language options are the shared list', bar.includes("LANGUAGE_OPTIONS } from './LanguageSwitcher'"))
ok('no direct API / fetch in the bar', !/meAPI|fetch\(|@\/lib\/api|localStorage/.test(bar))
ok('picking a language closes the sheet', /setLanguage\(opt\.value\)\s*onClose\(\)/.test(bar))
ok('Escape closes the sheet', bar.includes("e.key === 'Escape'"))
ok('links in the sheet close it', bar.includes('onClick={onClose}'))

// Copy: no "Saved Applications" anywhere in the nav.
ok('no "Saved Applications" tab', !nav.SEEKER_NAV_TABS.some((t) => /applications/i.test(t.labelKey + t.href)))

// Arrow: the chevron is not inside the `hidden sm:` wrapper any more; the NAME still is.
ok('chevron is outside the hidden wrapper', !/hidden sm:flex[^>]*>[\s\S]{0,400}<ChevronDown/.test(dropdown))

// My Interviews: in the seeker profile dropdown too, same route + key as the More sheet, never for employers.
const moreInterviews = nav.SEEKER_MORE_ITEMS.find((i) => i.href === '/my-interviews')
ok('More sheet keeps My Interviews', !!moreInterviews)
const interviewsBlock = dropdown.match(/\{!isEmployer && \(\s*<Link\s+href="\/my-interviews"[\s\S]*?<\/Link>\s*\)\}/)?.[0] ?? ''
ok('dropdown: My Interviews link is seeker-only (!isEmployer)', interviewsBlock !== '')
ok('dropdown: My Interviews uses the More sheet label key', interviewsBlock.includes(`t('${moreInterviews?.labelKey}')`))
ok('dropdown: employer-only block has no My Interviews', !/\{isEmployer && \(\s*<>[\s\S]*?<\/>\s*\)\}/.test(dropdown) || !dropdown.match(/\{isEmployer && \(\s*<>[\s\S]*?<\/>\s*\)\}/)[0].includes('/my-interviews'))

// Locales: both new keys in all 10 languages, and the shared keys the bar reads exist.
for (const lng of ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']) {
  const common = JSON.parse(fs.readFileSync(path.join(SRC, 'locales', lng, 'common.json'), 'utf8'))
  const seeker = JSON.parse(fs.readFileSync(path.join(SRC, 'locales', lng, 'seeker.json'), 'utf8'))
  ok(`${lng}: nav.more + nav.mainNavigation`, typeof common.nav?.more === 'string' && typeof common.nav?.mainNavigation === 'string')
  ok(`${lng}: nav.myApplications/myInterviews/settings/profile`, ['myApplications', 'myInterviews', 'settings', 'profile'].every((k) => typeof common.nav?.[k] === 'string'))
  ok(`${lng}: buttons.close, language.label, language.select`, [common.buttons?.close, common.language?.label, common.language?.select].every((v) => typeof v === 'string'))
  ok(`${lng}: seeker nav.home/jobFeed/savedJobs`, ['home', 'jobFeed', 'savedJobs'].every((k) => typeof seeker.nav?.[k] === 'string'))
}

if (failures.length) {
  console.error(`\n${failures.length} of ${checks} checks FAILED:\n`)
  for (const f of failures) console.error(` ✗ ${f}`)
  process.exit(1)
}
console.log(`verify-seeker-nav: ${checks} checks passed`)
