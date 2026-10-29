#!/usr/bin/env node
/**
 * Employer bottom nav — the mechanical gate for src/lib/employerNav.ts and for how
 * EmployerBottomNav / employer/layout.tsx / EmployerHeader / UserDropdown wire it in.
 *
 *   node scripts/verify-employer-nav.mjs
 *
 * Same two kinds of check as verify-seeker-nav.mjs (no new dependencies):
 *   1. LOGIC     the REAL src/lib/employerNav.ts, transpiled in memory — tab list, route
 *                mapping, which tab is lit for a pathname, More list, excluded routes.
 *   2. WIRING    assertions on the component sources and CSS — role gating, owner-only
 *                Ledger, z-index order, logo target, dashboard order, seeker untouched.
 *                These read text, so they prove the pieces are present and consistent, not
 *                how a browser lays them out.
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

const nav = loadLib('employerNav')

// ── 1. LOGIC ────────────────────────────────────────────────────────────────
expect('tabs: keys, in order', nav.EMPLOYER_NAV_TABS.map((t) => t.key), ['dashboard', 'jobs', 'workers', 'postJob'])
expect('tabs: routes', nav.EMPLOYER_NAV_TABS.map((t) => t.href), ['/employer', '/employer/jobs', '/employer/workers', '/employer/jobs/new'])
expect('tabs: labels reuse existing keys', nav.EMPLOYER_NAV_TABS.map((t) => t.labelKey), [
  'nav.dashboard',
  'nav.myJobs',
  'employer:dashboard.findWorkers',
  'employer:dashboard.postJob',
])
expect('more: routes', nav.EMPLOYER_MORE_ITEMS.map((i) => i.href), [
  '/employer/candidates',
  '/employer/team',
  '/employer/plans',
  '/employer/my-plans',
  '/employer/invoices',
  '/employer/ledger',
  '/employer/settings',
])
expect('more: labels reuse existing keys', nav.EMPLOYER_MORE_ITEMS.map((i) => i.labelKey), [
  'employer:candidates.navLabel',
  'employer:dashboard.team',
  'employer:plans.navLabel',
  'employer:myPlans.navLabel',
  'employer:invoices.navLabel',
  'employer:ledger.navLabel',
  'nav.settings',
])
expect(
  'more: no Help & Support item (by route or label)',
  nav.EMPLOYER_MORE_ITEMS.some((i) => /help|support|contact|faq|guides/.test(i.href) || /help|support/i.test(i.labelKey)),
  false,
)
expect('more: only the ledger is owner-only', nav.EMPLOYER_MORE_ITEMS.filter((i) => i.ownerOnly).map((i) => i.href), ['/employer/ledger'])
expect('more: no Messages or Profile (they stay in the header)', nav.EMPLOYER_MORE_ITEMS.some((i) => /messages|profile/.test(i.href)), false)

// Which tab is lit.
const lit = (p) => nav.employerActiveTab(p)
expect('active: dashboard', lit('/employer'), 'dashboard')
expect('active: my jobs list', lit('/employer/jobs'), 'jobs')
expect('active: one job (view)', lit('/employer/jobs/42'), 'jobs')
expect('active: one job (edit)', lit('/employer/jobs/42/edit'), 'jobs')
expect('active: Post a Job is lit on /employer/jobs/new, NOT My Jobs', lit('/employer/jobs/new'), 'postJob')
expect('active: a job whose id starts with "new" is still My Jobs', lit('/employer/jobs/newton'), 'jobs')
expect('active: find workers', lit('/employer/workers'), 'workers')
expect('active: one worker', lit('/employer/workers/abc'), 'workers')
expect('active: a longer lookalike is not a tab', lit('/employer/workers-archive'), undefined)
expect('active: candidates lights no tab', lit('/employer/candidates'), undefined)
expect('active: settings lights no tab', lit('/employer/settings'), undefined)
expect('active: messages lights no tab', lit('/employer/messages'), undefined)
expect('active: null pathname', lit(null), undefined)
expect('active: undefined pathname', lit(undefined), undefined)

// More lights only where no tab does — so exactly one of the five is ever lit.
const moreLit = (p) => nav.isEmployerMoreActive(p)
for (const item of nav.EMPLOYER_MORE_ITEMS) expect(`more lit on ${item.href}`, moreLit(item.href), true)
expect('more lit on a candidate below /employer/candidates', moreLit('/employer/candidates/9'), true)
expect('more not lit on the dashboard', moreLit('/employer'), false)
expect('more not lit on My Jobs', moreLit('/employer/jobs'), false)
expect('more not lit on Post a Job', moreLit('/employer/jobs/new'), false)
expect('more not lit on messages', moreLit('/employer/messages'), false)
expect('more not lit on profile', moreLit('/employer/profile'), false)
for (const p of ['/employer', '/employer/jobs', '/employer/jobs/new', '/employer/workers', '/employer/candidates', '/employer/ledger', '/employer/messages']) {
  expect(`at most one of five lit on ${p}`, (lit(p) ? 1 : 0) + (moreLit(p) ? 1 : 0) <= 1, true)
}

// Where the bar (and the footer) is not shown.
const focused = (p) => nav.isFocusedEmployerRoute(p)
for (const p of ['/employer/welcome', '/employer/register', '/employer/register/account', '/employer/register/under-review', '/employer/team/accept']) {
  expect(`no bar on ${p}`, focused(p), true)
}
for (const p of ['/employer', '/employer/team', '/employer/jobs/new', '/employer/registers']) {
  expect(`bar allowed on ${p}`, focused(p), false)
}
expect('focused: null pathname', focused(null), false)

// ── 2. WIRING ───────────────────────────────────────────────────────────────
const bar = read('components/navigation/EmployerBottomNav.tsx')
const shared = read('components/navigation/BottomNavShared.tsx')
const seekerBar = read('components/navigation/SeekerBottomNav.tsx')
const layout = read('app/employer/layout.tsx')
const header = read('components/employer/EmployerHeader.tsx')
const dropdown = read('components/navigation/UserDropdown.tsx')
const ownerHook = read('hooks/useEmployerOwner.ts')
const css = read('styles/globals.css')
const dashboard = read('app/employer/page.tsx')

// Role + route gating. The bar is chrome; ProtectedRoute stays on every page.
const gate = bar.match(/export function EmployerBottomNav\(\)[\s\S]*?\n\}/)?.[0] ?? ''
ok('gate: waits for the session (isLoading)', /isLoading/.test(gate))
ok('gate: requires isAuthenticated', /!isAuthenticated/.test(gate))
ok('gate: employer role only', gate.includes("user?.role?.startsWith('EMPLOYER')"))
ok('gate: hidden while a password change is forced', gate.includes('user?.mustChangePassword'))
ok('gate: hidden on focused routes', gate.includes('isFocusedEmployerRoute(pathname)'))
ok('gate: renders null, not the bar, when any check fails', (gate.match(/return null/g) ?? []).length === 2)
ok('bar: body class + owner lookup live in the inner bar (only run while it is shown)',
  /function EmployerBottomNavBar[\s\S]*useEmployerOwner\(\)[\s\S]*classList\.add\(EMPLOYER_BODY_CLASS\)/.test(bar))
ok('layout mounts the bar once', (layout.match(/<EmployerBottomNav \/>/g) ?? []).length === 1)
ok('layout footer and bar share one excluded-route rule', layout.includes('isFocusedEmployerRoute(pathname)') && !/WITHOUT_FOOTER/.test(layout))
ok('layout does not touch ProtectedRoute', !/ProtectedRoute/.test(layout.replace(/\/\*[\s\S]*?\*\//g, '')))

// Every employer page that is not a focused screen is still behind ProtectedRoute.
function* pagesUnder(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* pagesUnder(full)
    else if (e.name === 'page.tsx') yield full
  }
}
const employerRoot = path.join(SRC, 'app', 'employer')
for (const file of pagesUnder(employerRoot)) {
  const route = '/employer' + path.relative(employerRoot, path.dirname(file)).split(path.sep).join('/').replace(/^(?=.)/, '/').replace(/\/$/, '')
  if (nav.isFocusedEmployerRoute(route)) continue
  ok(`${route}: still behind ProtectedRoute`, fs.readFileSync(file, 'utf8').includes('<ProtectedRoute'))
}

// Tabs + accessibility.
ok('bar: lg:hidden via the shared bar class', bar.includes('className={BOTTOM_NAV_BAR_CLS}') && shared.includes("'lg:hidden fixed bottom-0 inset-x-0"))
ok('bar: safe-area inset on height and padding', shared.includes('env(safe-area-inset-bottom)') && shared.includes('pb-[env(safe-area-inset-bottom)]'))
ok('bar: labelled nav landmark', bar.includes("aria-label={t('nav.mainNavigation')}"))
ok('bar: aria-current on the lit tab', bar.includes("aria-current={isActive ? 'page' : undefined}"))
ok('bar: five items = four tabs + More', /EMPLOYER_NAV_TABS\.map/.test(bar) && bar.includes("t('nav.more')"))
ok('bar: tabs come from employerNav (no hardcoded routes)', !/href="\/employer/.test(bar))
ok('bar: labels wrap instead of clipping (320px)', bar.includes('break-words') && shared.includes('line-clamp-2'))
ok('bar: Post a Job is the filled primary action', /tab\.key === 'postJob'[\s\S]*bg-primary-50 text-primary-100/.test(bar))
ok('bar: active state uses the dark teal (text-primary-90, 9:1)', bar.includes("LIT_CLS = 'text-primary-90"))
ok('bar: no floating Post a Job button', !/fixed[^"']*(right|end)-/.test(bar))

// More sheet: language control, ledger gate, z-index.
ok('sheet: reuses the language preference hook + shared options', shared.includes('useLanguagePreference()') && shared.includes('LANGUAGE_OPTIONS.map'))
ok('sheet: items come from props (employer passes its own list)', /items\.map\(/.test(shared) && bar.includes('items={moreItems}'))
ok('sheet: Ledger filtered by owner flag', bar.includes('EMPLOYER_MORE_ITEMS.filter((item) => !item.ownerOnly || isOwner)'))
ok('ledger: hook starts closed (answer null)', ownerHook.includes('useState<{ userId: string; isOwner: boolean } | null>(null)'))
ok('ledger: hook fails closed (catch sets nothing)', /\.catch\(\(\) => \{\s*\/\/ Leave the answer unset/.test(ownerHook))
ok('ledger: answer is only trusted for the same user', ownerHook.includes('answer.userId === userId'))
ok('ledger: owner means role === OWNER from entitlements', ownerHook.includes("entitlements.role === 'OWNER'") && ownerHook.includes('teamAPI.getEntitlements()'))
ok('ledger: one request per user (cached, failure not cached)', ownerHook.includes('cached?.userId === userId') && ownerHook.includes('cached = null'))
ok('ledger: the account menu uses the same hook (no second request)', dropdown.includes('useEmployerOwner()') && !/teamAPI/.test(dropdown))
ok('ledger: the account menu still shows it to owners only', dropdown.includes('isEmployer && isOwner'))

// Layers (see BottomNavShared): bar z-40 < sticky header z-50 < More sheet + dimmer z-[55] < dialogs z-[100].
// The sheet covers the header (so it cannot be used while the sheet is open) and the dialogs stay
// above the bar and the sheet. The seeker sheet is the same shared component, so it keeps z-[55].
const zOf = (cls) => Number(cls?.match(/z-\[?(\d+)/)?.[1])
// The lowest z-index on a full-screen overlay in each modal (Infinity = none was found).
const modalZs = ['CheckoutModal', 'TopUpModal', 'ScheduleInterviewModal'].map((n) => {
  let lowest = Infinity
  for (const m of read(`components/employer/${n}.tsx`).matchAll(/fixed inset-0[^"'`]*?\bz-\[?(\d+)/g)) {
    lowest = Math.min(lowest, Number(m[1]))
  }
  return lowest
})
let modalFloor = Infinity
for (const z of modalZs) modalFloor = Math.min(modalFloor, z)
const sheetZs = [...shared.matchAll(/fixed (?:inset-0|bottom-0 inset-x-0) z-\[(\d+)\]/g)].map((m) => Number(m[1]))
const headerZ = zOf(header.match(/<header className="[^"]*"/)?.[0])
const barZ = zOf(shared.match(/BOTTOM_NAV_BAR_CLS =\s*'([^']*)'/)?.[1])
ok('z-index: the sheet and its dimmer are both z-[55]', sheetZs.length === 2 && sheetZs.every((z) => z === 55))
ok('z-index: the sticky employer header is z-50', headerZ === 50)
ok('z-index: the bar is z-40', barZ === 40)
ok('z-index: sheet is above the header (covers it) and the bar', 55 > headerZ && 55 > barZ)
ok('z-index: every payment/interview modal has an overlay layer, z-[100]', modalZs.every((z) => z === 100))
ok('z-index: modals are above the sheet and the bar', modalFloor > 55 && modalFloor > barZ)

// Body class + CSS: each area has its own class (no stale spacing after seeker ↔ employer),
// one shared rule below lg.
ok('css: employer class matches the component', bar.includes("'has-employer-bottom-nav'") && css.includes('body.has-employer-bottom-nav'))
ok('css: both classes get the padding rule only below lg', /@media \(max-width: 1023\.98px\)\s*\{\s*body\.has-seeker-bottom-nav,\s*body\.has-employer-bottom-nav \{/.test(css))
ok('css: one 64px definition for both bars', css.split('--bottom-nav-h: calc(64px + env(safe-area-inset-bottom));').length === 2)
ok('css: the min-h-screen give-back covers both', css.includes('body.has-employer-bottom-nav .min-h-screen'))

// Header: logo target, links below lg, desktop untouched.
ok('header: logo goes to /employer', /<Link href="\/employer" className="[^"]*shrink-0/.test(header))
ok('header: no logoHref prop', !/logoHref/.test(header))
for (const file of ['jobs/new/page.tsx', 'jobs/[id]/edit/page.tsx', 'jobs/[id]/page.tsx']) {
  const src = read(`app/employer/${file}`)
  ok(`${file}: plain <EmployerHeader /> (logo → dashboard)`, src.includes('<EmployerHeader />') && !/logoHref/.test(src))
}
ok('no employer page overrides the logo', ![...pagesUnder(employerRoot)].some((f) => /logoHref/.test(fs.readFileSync(f, 'utf8'))))
ok('header: Find workers, Team, Post a Job all hidden below lg', (header.match(/className={`hidden lg:inline-flex /g) ?? []).length === 3)
ok('header: still renders HeaderActions (Mail when chat is on, bell, profile)', header.includes('<HeaderActions compact />'))
ok('Back button is layout-based, not logo-based', layout.includes('rememberEmployerPage') && read('lib/employerBackNav.ts').includes('inSameSection'))

// Dashboard: same data, phone order = DOM order, two columns.
ok('dashboard: still three panels, no new fetch', (dashboard.match(/usePanel\(/g) ?? []).length === 3)
ok('dashboard: stats and list panels share one flex/grid container', dashboard.includes('flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8'))
const at = (needle) => dashboard.indexOf(needle)
const domOrder = [
  at("t('employer:dashboard.jobOverviewTitle')"),
  at('{/* Your Jobs */}'),
  at("t('employer:dashboard.overviewTitle')"),
  at('{/* Recent Applications */}'),
]
ok('dashboard: markup order is Job overview → Your Jobs → Application overview → Recent Applications',
  domOrder.every((i, n) => i > 0 && (n === 0 || i > domOrder[n - 1])))
ok('dashboard: no CSS `order-*` reordering left (visual order = DOM order on a phone)', !/(^|[\s"'`])(lg:)?order-\d/.test(dashboard))
ok('dashboard: one stats spinner/error/Retry (a single PanelBody on statsPanel)', (dashboard.match(/state=\{statsPanel\}/g) ?? []).length === 1)
ok('dashboard: Application overview reads the same loaded stats (no second fetch)', dashboard.includes("const stats = statsPanel.status === 'ready' ? statsPanel.data : null") && dashboard.includes('{stats && ('))
ok('dashboard: lg places Job overview row 1, Application overview row 2, Your Jobs / Recent row 3',
  dashboard.includes('lg:col-span-2 lg:row-start-1') &&
    dashboard.includes('mb-6 sm:mb-8 lg:col-span-2 lg:row-start-2') &&
    dashboard.includes('lg:col-start-1 lg:row-start-3') &&
    dashboard.includes('lg:col-start-2 lg:row-start-3'))
ok('dashboard: stat tiles two columns on a phone', (dashboard.match(/grid grid-cols-2 /g) ?? []).length === 2)
ok('dashboard: no tile grid left at one column', !/grid-cols-1 sm:grid-cols-2/.test(dashboard))
ok('dashboard: empty-state Post a Job button kept', dashboard.includes("t('employer:dashboard.postFirstJob')"))

// Seeker: unchanged behaviour.
ok('seeker: bar still adds its own body class', seekerBar.includes('BOTTOM_NAV_BODY_CLASS'))
ok('seeker: bar still renders the shared sheet with its own list', seekerBar.includes('items={SEEKER_MORE_ITEMS}'))
ok('seeker: header does not import the employer bar', !/^import .*EmployerBottomNav/m.test(read('components/navigation/EmployeeHeader.tsx')))
ok('seeker: employer bar is not imported outside the employer layout',
  [...fs.readdirSync(path.join(SRC, 'components', 'navigation'))].every((f) => f === 'EmployerBottomNav.tsx' || !/^import .*EmployerBottomNav/m.test(read(`components/navigation/${f}`))))

// Locales: every label key resolves in all 10 languages (no new copy was added).
const resolve = (obj, dotted) => dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
const labelKeys = [
  ...nav.EMPLOYER_NAV_TABS.map((t) => t.labelKey),
  ...nav.EMPLOYER_MORE_ITEMS.map((i) => i.labelKey),
  'nav.more',
  'nav.mainNavigation',
  'buttons.close',
  'language.label',
  'language.select',
]
for (const lng of ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']) {
  const files = {}
  const missing = labelKeys.filter((key) => {
    const [ns, dotted] = key.includes(':') ? key.split(':') : ['common', key]
    files[ns] ??= JSON.parse(fs.readFileSync(path.join(SRC, 'locales', lng, `${ns}.json`), 'utf8'))
    return typeof resolve(files[ns], dotted) !== 'string'
  })
  expect(`${lng}: every bar and sheet label resolves`, missing, [])
}

if (failures.length) {
  console.error(`\n${failures.length} of ${checks} checks FAILED:\n`)
  for (const f of failures) console.error(` ✗ ${f}`)
  process.exit(1)
}
console.log(`verify-employer-nav: ${checks} checks passed`)
