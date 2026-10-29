#!/usr/bin/env node
/**
 * Job-preferences flag check — the mechanical gate for src/lib/jobPreferences.ts: how the
 * BE's `needsJobPreferences` is carried onto the stored user, and when a seeker must still
 * complete their job preferences.
 *
 *   node scripts/verify-job-preferences.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-register-city.mjs). No network, no new dependencies.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIB = path.join(ROOT, 'src', 'lib')

/** Load src/lib/<name>.ts as CommonJS, mapping the '@/lib/x' alias onto the same loader. */
const cache = new Map()
function loadLib(name) {
  if (cache.has(name)) return cache.get(name).exports
  const file = path.join(LIB, `${name}.ts`)
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

const { sessionUserFrom } = loadLib('jobPreferences')

let checks = 0
const failures = []
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(actual)
  const w = JSON.stringify(want)
  if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
}

const seeker = (extra = {}) => ({ id: 'u1', email: null, role: 'JOB_SEEKER', ...extra })

// --- sessionUserFrom: the flag rides beside `user` in the reply and must land on the user ---
const user = seeker({ accountStatus: 'ACTIVE' })
expect('flag true is copied onto the user', sessionUserFrom({ user, needsJobPreferences: true }).needsJobPreferences, true)
expect('flag false is copied onto the user', sessionUserFrom({ user, needsJobPreferences: false }).needsJobPreferences, false)
expect('the rest of the user is kept', sessionUserFrom({ user, needsJobPreferences: true }).accountStatus, 'ACTIVE')
expect('a reply without the flag leaves the user as it was', sessionUserFrom({ user }), user)
expect('a reply without the flag adds no key', 'needsJobPreferences' in sessionUserFrom({ user }), false)
expect('a non-boolean flag is ignored', 'needsJobPreferences' in sessionUserFrom({ user, needsJobPreferences: 'true' }), false)
expect('the reply user is not mutated', 'needsJobPreferences' in user, false)
// (The end-to-end "login reply -> gate" checks sit below, after the gate helper they use.)

// --- seekerSessionPatch: what a fresh GET /jobseekers/profile adds to the stored user ---
const { seekerSessionPatch, profileSyncStatus, syncAfterLogin } = loadLib('jobPreferences')

const stored = seeker({
  accountStatus: 'ACTIVE',
  phoneNumber: '+919876543210',
  mustChangePassword: false,
  needsJobPreferences: true,
  profile: { fullName: 'Old Name', profilePhoto: 'old.png', extra: 1 },
})
const fresh = (over = {}) => ({
  id: 'u1',
  email: null,
  role: 'JOB_SEEKER',
  jobSeeker: { id: 'j1', fullName: 'New Name', profilePhoto: null },
  ...over,
})

expect('flag false from the server clears a stored true', seekerSessionPatch(stored, fresh({ needsJobPreferences: false })).needsJobPreferences, false)
expect('flag true from the server is kept', seekerSessionPatch(stored, fresh({ needsJobPreferences: true })).needsJobPreferences, true)
expect('a reply without the flag never writes one', 'needsJobPreferences' in seekerSessionPatch(stored, fresh()), false)
expect('a non-boolean flag is not written', 'needsJobPreferences' in seekerSessionPatch(stored, fresh({ needsJobPreferences: 'false' })), false)
expect(
  'name and photo are merged into the profile, other profile keys kept',
  seekerSessionPatch(stored, fresh({ needsJobPreferences: false })).profile,
  { fullName: 'New Name', profilePhoto: null, extra: 1 }
)
expect(
  'a profile field the reply omits is left as it was',
  seekerSessionPatch(stored, fresh({ jobSeeker: { id: 'j1', fullName: 'New Name' } })).profile,
  { fullName: 'New Name', profilePhoto: 'old.png', extra: 1 }
)
expect(
  'no jobSeeker in the reply: no profile key at all',
  'profile' in seekerSessionPatch(stored, { id: 'u1', email: null, role: 'JOB_SEEKER', needsJobPreferences: false }),
  false
)
// Everything unrelated stays out of the patch, so updateUser() cannot overwrite it.
expect(
  'the patch touches only the flag, the account status and the profile',
  Object.keys(seekerSessionPatch(stored, fresh({ needsJobPreferences: false, accountStatus: 'ACTIVE', mustChangePassword: true, phoneNumber: '+910' }))).sort(),
  ['accountStatus', 'needsJobPreferences', 'profile']
)
expect(
  'without an account status in the reply, the patch has none',
  Object.keys(seekerSessionPatch(stored, fresh({ needsJobPreferences: false }))).sort(),
  ['needsJobPreferences', 'profile']
)
expect('the stored user is not mutated', stored.profile.fullName, 'Old Name')

// --- profileSyncStatus: loading, failed and who is asked ---
const st = (over = {}) => profileSyncStatus({ isLoading: false, hasToken: true, user: seeker(), sync: null, ...over })
expect('seeker, nothing settled yet: loading', st(), 'loading')
expect('seeker, read succeeded: ready', st({ sync: { id: 'u1', status: 'ready' } }), 'ready')
expect('seeker, read failed: failed (not ready, not "no")', st({ sync: { id: 'u1', status: 'failed' } }), 'failed')
expect("someone else's record says nothing about this seeker", st({ sync: { id: 'u9', status: 'ready' } }), 'loading')
expect('still hydrating from storage: idle', st({ isLoading: true }), 'idle')
expect('no token: idle', st({ hasToken: false }), 'idle')
expect('signed out: idle', st({ user: null }), 'idle')
expect('employer is never read: idle', st({ user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_INDIVIDUAL' } }), 'idle')
expect('business employer is never read: idle', st({ user: { id: 'e2', email: 'a@b.in', role: 'EMPLOYER_BUSINESS' } }), 'idle')
expect('password change pending: idle (the read waits)', st({ user: seeker({ mustChangePassword: true }) }), 'idle')
expect(
  'password change done after a wait: loading again',
  st({ user: seeker({ mustChangePassword: false }) }),
  'loading'
)

// --- profileReadOutcome: a read that succeeded but did not carry the flag confirmed nothing ---
const { profileReadOutcome } = loadLib('jobPreferences')
expect('flag true: ready', profileReadOutcome({ needsJobPreferences: true }), 'ready')
expect('flag false: ready', profileReadOutcome({ needsJobPreferences: false }), 'ready')
expect('flag missing: failed, not ready', profileReadOutcome({}), 'failed')
expect('flag undefined: failed', profileReadOutcome({ needsJobPreferences: undefined }), 'failed')
expect('flag null: failed', profileReadOutcome({ needsJobPreferences: null }), 'failed')
expect('flag "false" (string): failed', profileReadOutcome({ needsJobPreferences: 'false' }), 'failed')
expect('flag 0: failed', profileReadOutcome({ needsJobPreferences: 0 }), 'failed')
// What the provider then stores and shows, for a stored `true` and a reply that lacks the flag.
const settle = (profile) => ({ id: 'u1', status: profileReadOutcome(profile) })
expect(
  'missing flag: the seeker is shown as failed',
  st({ sync: settle({ jobSeeker: { id: 'j1' } }) }),
  'failed'
)
expect(
  'non-boolean flag: the seeker is shown as failed',
  st({ sync: settle({ needsJobPreferences: 'false' }) }),
  'failed'
)
expect('a boolean flag: the seeker is shown as ready', st({ sync: settle({ needsJobPreferences: false }) }), 'ready')
// The provider writes to the user only on 'ready'; the patch itself never carries a bad flag,
// so a stored `true` survives a reply that lacks one.
const bad = { id: 'u1', email: null, role: 'JOB_SEEKER', jobSeeker: { id: 'j1', fullName: 'X' }, needsJobPreferences: 'false' }
expect('a bad flag is never in the patch', 'needsJobPreferences' in seekerSessionPatch(stored, bad), false)
expect('so the stored true is kept', { ...stored, ...seekerSessionPatch(stored, bad) }.needsJobPreferences, true)

// --- syncAfterLogin ---
expect('a login with the flag true is already fresh', syncAfterLogin(seeker({ needsJobPreferences: true })), { id: 'u1', status: 'ready' })
expect('a login with the flag false is already fresh', syncAfterLogin(seeker({ needsJobPreferences: false })), { id: 'u1', status: 'ready' })
expect('a login without the flag still needs the read', syncAfterLogin(seeker()), null)
expect('so a seeker logged in that way is loading', st({ sync: syncAfterLogin(seeker()) }), 'loading')
expect('and one logged in with the flag is not read again', st({ sync: syncAfterLogin(seeker({ needsJobPreferences: false })) }), 'ready')

// --- Tripwire on the provider wiring (a substring check on the source, like the drift guard
// in verify-validation.mjs): there is no DOM here to mount AuthProvider, so this only proves
// the pieces tested above are the ones it uses, and that the failure path writes nothing. ---
const ctx = fs.readFileSync(path.join(ROOT, 'src', 'contexts', 'AuthContext.tsx'), 'utf8')
expect('AuthContext reads the profile through the shared helper', ctx.includes('jobSeekerAPI') && ctx.includes('.getProfile({'), true)
expect('AuthContext decides with profileSyncStatus', ctx.includes('profileSyncStatus('), true)
expect('AuthContext merges with seekerSessionPatch', ctx.includes('seekerSessionPatch(current, profile)'), true)
expect('login() records a fresh flag with syncAfterLogin', ctx.includes('setSync(syncAfterLogin(newUser))'), true)
expect('AuthContext settles a successful read with profileReadOutcome', ctx.includes('profileReadOutcome(profile)'), true)
expect("AuthContext writes the user only when the outcome is 'ready'", /status === 'ready'\)\s*\{\s*updateUser\(/.test(ctx), true)
// 'ready' is written in exactly one place besides login: confirmSeekerProfile, after its guard (checked in the Issue 3 block).
expect('AuthContext no longer marks a read ready unconditionally', ctx.split("setSync({ id: syncUserId, status: 'ready' })").length - 1, 1)
const failureBranch =ctx.slice(ctx.indexOf('.catch(() => {'), ctx.indexOf('return () => {', ctx.indexOf('.catch(() => {')))
expect('the failure branch records failure', failureBranch.includes("status: 'failed'"), true)
expect('the failure branch writes no user, no flag, no logout', /updateUser|needsJobPreferences|logout|setUser/.test(failureBranch), false)

// ======================================================================================
// Issue 3: the route gate, the preferences page, the timeout, retry and the copy
// ======================================================================================
const { preferencesGate, isSeekerGatedPath, SEEKER_GATED_PREFIXES } = loadLib('jobPreferences')
const routes = loadLib('routes')

// --- preferencesGate: what the gate does, from the status and the flag ---
const gate = (over = {}) =>
  preferencesGate({
    isLoading: false,
    hasToken: true,
    user: seeker({ needsJobPreferences: true }),
    profileSync: 'ready',
    pathname: '/home',
    ...over,
  })
const withFlag = (flag, extra = {}) => seeker({ ...(flag === undefined ? {} : { needsJobPreferences: flag }), ...extra })

// --- End to end: a login reply, through the real chain, to the gate's decision ---
// reply -> sessionUserFrom -> syncAfterLogin -> profileSyncStatus -> preferencesGate.
const fromLoginReply = (flag) => {
  const stored = sessionUserFrom({ user: seeker({ accountStatus: 'ACTIVE' }), ...(flag === undefined ? {} : { needsJobPreferences: flag }) })
  return gate({ user: stored, profileSync: st({ user: stored, sync: syncAfterLogin(stored) }) })
}
expect('end to end: a Google seeker reply with the flag true is held for preferences', fromLoginReply(true), 'redirect')
expect('end to end: a reply with the flag false goes straight through', fromLoginReply(false), 'none')
expect('end to end: a reply without the flag is not trusted: it waits for the profile read', fromLoginReply(undefined), 'wait')

expect('confirmed true -> redirect to the preferences page', gate(), 'redirect')
expect('confirmed false -> normal navigation', gate({ user: withFlag(false) }), 'none')
expect('loading -> wait, never a redirect', gate({ profileSync: 'loading' }), 'wait')
expect('loading with a stored true -> still wait (stale flag is not acted on)', gate({ profileSync: 'loading', user: withFlag(true) }), 'wait')
expect('loading with a stored false -> still wait', gate({ profileSync: 'loading', user: withFlag(false) }), 'wait')
expect('storage not read yet -> wait', gate({ isLoading: true, user: null, hasToken: false }), 'wait')
expect('failed + last known true -> stay blocked (redirect)', gate({ profileSync: 'failed', user: withFlag(true) }), 'redirect')
expect('failed + last known false -> allowed in, with a retry notice', gate({ profileSync: 'failed', user: withFlag(false) }), 'notice')
expect('failed + nothing known -> recovery screen, not a pass', gate({ profileSync: 'failed', user: withFlag(undefined) }), 'recover')
expect('ready but no boolean on the user -> recover, not a pass', gate({ profileSync: 'ready', user: withFlag(undefined) }), 'recover')
expect('ready but a non-boolean on the user -> recover', gate({ profileSync: 'ready', user: withFlag('false') }), 'recover')
expect('idle -> nothing', gate({ profileSync: 'idle' }), 'none')
// The retry notice: only for failed + last known false, only where the gate applies
expect('notice: not on a page the gate ignores', gate({ profileSync: 'failed', user: withFlag(false), pathname: '/terms' }), 'none')
expect('notice: not on the preferences page', gate({ profileSync: 'failed', user: withFlag(false), pathname: routes.JOB_PREFERENCES_ROUTE }), 'none')
expect('notice: not once the read is confirmed false', gate({ profileSync: 'ready', user: withFlag(false) }), 'none')
expect('notice: not while the retry is loading (it waits)', gate({ profileSync: 'loading', user: withFlag(false) }), 'wait')
expect('notice: not for an employer', gate({ profileSync: 'failed', user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_INDIVIDUAL', needsJobPreferences: false } }), 'none')
expect('notice: not for a signed-out visitor', gate({ profileSync: 'failed', user: null, hasToken: false }), 'none')
expect('notice: not with a password change pending', gate({ profileSync: 'failed', user: withFlag(false, { mustChangePassword: true }) }), 'none')
expect('notice: not for a pending phone (that is recover: stale cannot be told from real)', gate({ profileSync: 'failed', user: withFlag(false, { accountStatus: 'PENDING_OTP_VERIFICATION' }) }), 'recover')
expect('notice: a failed read with last known true is still a redirect, not a notice', gate({ profileSync: 'failed', user: withFlag(true) }), 'redirect')
expect('notice: nothing known is still recover, not a notice', gate({ profileSync: 'failed', user: withFlag(undefined) }), 'recover')
// Flows that come first
expect('password change pending wins over a true flag', gate({ user: withFlag(true, { mustChangePassword: true }) }), 'none')
expect('password change pending wins over loading', gate({ profileSync: 'loading', user: withFlag(true, { mustChangePassword: true }) }), 'none')
expect('pending phone (PENDING_OTP_VERIFICATION) goes to the phone step, never to the preferences page', gate({ user: withFlag(true, { accountStatus: 'PENDING_OTP_VERIFICATION' }) }), 'phone')
expect('after the bind (ACTIVE) the gate applies', gate({ user: withFlag(true, { accountStatus: 'ACTIVE' }) }), 'redirect')
// Who it applies to
expect('employer with a true flag -> nothing', gate({ user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_INDIVIDUAL', needsJobPreferences: true } }), 'none')
expect('business employer, failed, nothing known -> nothing', gate({ profileSync: 'failed', user: { id: 'e2', email: 'a@b.in', role: 'EMPLOYER_BUSINESS' } }), 'none')
expect('signed out -> nothing', gate({ user: null, hasToken: false }), 'none')
expect('token but no user -> nothing', gate({ user: null }), 'none')
// Where it applies, and no loop
expect('the preferences page itself is never gated (no redirect loop)', gate({ pathname: routes.JOB_PREFERENCES_ROUTE }), 'none')
expect('the preferences page is not gated even while loading', gate({ pathname: routes.JOB_PREFERENCES_ROUTE, profileSync: 'loading' }), 'none')
expect('the preferences page is not gated while storage loads', gate({ pathname: routes.JOB_PREFERENCES_ROUTE, isLoading: true }), 'none')
expect('/login is not gated', gate({ pathname: '/login' }), 'none')
expect('/change-password is not gated', gate({ pathname: '/change-password' }), 'none')
expect('/register/success is not gated (it moves on to /home, which is)', gate({ pathname: '/register/success' }), 'none')
expect('/terms is not gated', gate({ pathname: '/terms' }), 'none')
expect('/delete-account is not gated', gate({ pathname: '/delete-account' }), 'none')
expect('/settings is not gated (sign out, language stay reachable)', gate({ pathname: '/settings' }), 'none')
expect('/home is gated', isSeekerGatedPath('/home'), true)
expect('a sub-route is gated', isSeekerGatedPath('/my-applications/123'), true)
expect('a look-alike prefix is not gated', isSeekerGatedPath('/homepage'), false)
expect('the landing page is not gated', isSeekerGatedPath('/'), false)
expect('a gated page redirects there, not elsewhere', gate({ pathname: '/job-feed' }), 'redirect')
expect('the preferences route is one fixed path', routes.JOB_PREFERENCES_ROUTE, '/complete-profile')
// Coming back from the page must not bounce to a login-ish screen. safeInternalPath is browser-only
// (it resolves against window.location), so give it an origin for these two checks.
globalThis.window = { location: { origin: 'https://prosiddhi.test' } }
expect('returnUrl to the preferences page is refused as a destination', routes.destinationAfterAuth('JOB_SEEKER', '/complete-profile'), '/home')
expect('a real returnUrl survives', routes.destinationAfterAuth('JOB_SEEKER', '/job-feed?x=1'), '/job-feed?x=1')
delete globalThis.window
// Every seeker-only page is either gated or deliberately not
const APP = path.join(ROOT, 'src', 'app')
const EXEMPT_SEEKER_PAGES = new Set(['complete-profile', 'settings'])
const seekerSegments = new Set()
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'page.tsx' && fs.readFileSync(p, 'utf8').includes('requiredRole="seeker"')) {
      seekerSegments.add(path.relative(APP, p).split(path.sep)[0])
    }
  }
}
walk(APP)
const ungated = [...seekerSegments].filter((s) => !EXEMPT_SEEKER_PAGES.has(s) && !isSeekerGatedPath(`/${s}`))
expect('every seeker-only page is gated or deliberately exempt', ungated, [])
expect('every gated prefix is a real route', SEEKER_GATED_PREFIXES.filter((p) => !fs.existsSync(path.join(APP, p.slice(1)))), [])
// Every page under a gated prefix is behind ProtectedRoute (a public page must never be gated).
const pagesUnder = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? pagesUnder(p) : e.name === 'page.tsx' ? [p] : []
  })
// "Uses ProtectedRoute" means the page RENDERS `<ProtectedRoute`: not an import, not a mention. A
// comment must never satisfy it, so comments are stripped first (block comments, which also covers
// `{/* ... */}` in JSX, then `//` line comments that do not follow a `:` as in `https://`).
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const rendersProtectedRoute = (src) => /<ProtectedRoute[\s>]/.test(stripComments(src))
// The detector itself must not be fooled by a comment, an import, or a string.
expect('detector: real JSX counts', rendersProtectedRoute('return <ProtectedRoute requiredRole="seeker"><X /></ProtectedRoute>'), true)
expect('detector: JSX without props counts', rendersProtectedRoute('return (<ProtectedRoute>\n<X />\n</ProtectedRoute>)'), true)
expect('detector: a line comment does not count', rendersProtectedRoute('// wrap it in <ProtectedRoute> later\nreturn null'), false)
expect('detector: a block comment does not count', rendersProtectedRoute('/* <ProtectedRoute requiredRole="seeker"> */\nreturn null'), false)
expect('detector: a JSX comment does not count', rendersProtectedRoute('return <div>{/* <ProtectedRoute> */}</div>'), false)
expect('detector: a multi-line block comment does not count', rendersProtectedRoute('/**\n * Needs <ProtectedRoute>\n */\nexport default function P() { return null }'), false)
expect('detector: an import alone does not count', rendersProtectedRoute("import ProtectedRoute from '@/components/auth/ProtectedRoute'\nexport default function P() { return null }"), false)
expect('detector: a bare mention in code text does not count', rendersProtectedRoute('const note = "ProtectedRoute"'), false)
expect('detector: a similarly named component does not count', rendersProtectedRoute('return <ProtectedRouteLike />'), false)
expect('detector: real JSX after a comment still counts', rendersProtectedRoute('// note\nreturn <ProtectedRoute>x</ProtectedRoute>'), true)

// The ONE page under a gated prefix that does not render ProtectedRoute: a legacy redirect shim.
// /messages/<id> only forwards old links to /messages (or /employer/messages), where the real page
// has its own ProtectedRoute, and renders nothing itself. It is still covered by the gate, which
// matches by prefix. Listed by name, and checked to BE a shim, so it cannot hide a real page.
const REDIRECT_SHIMS = new Map([
  ['messages/[conversationId]/page.tsx', { target: 'messages/page.tsx' }],
])
const relPage = (f) => path.relative(APP, f).split(path.sep).join('/')
const gatedPages = SEEKER_GATED_PREFIXES.flatMap((p) => pagesUnder(path.join(APP, p.slice(1))))
const unprotectedGated = gatedPages
  .filter((f) => !REDIRECT_SHIMS.has(relPage(f)))
  .filter((f) => !rendersProtectedRoute(fs.readFileSync(f, 'utf8')))
  .map(relPage)
expect('every page under a gated prefix renders <ProtectedRoute (apart from the named redirect shim)', unprotectedGated, [])
expect('every redirect shim is a real page under a gated prefix', [...REDIRECT_SHIMS.keys()].filter((s) => !gatedPages.map(relPage).includes(s)), [])
for (const [shim, { target }] of REDIRECT_SHIMS) {
  const code = stripComments(fs.readFileSync(path.join(APP, shim), 'utf8'))
  expect(`shim ${shim} renders nothing`, /return null\b/.test(code) && !/<[A-Za-z]/.test(code.replace(/useParams<[^>]*>|Array<[^>]*>/g, '')), true)
  expect(`shim ${shim} only forwards (router.replace)`, code.includes('router.replace('), true)
  expect(`shim ${shim} does not render ProtectedRoute itself`, rendersProtectedRoute(fs.readFileSync(path.join(APP, shim), 'utf8')), false)
  expect(`shim ${shim} forwards to a page that does render ProtectedRoute`, rendersProtectedRoute(fs.readFileSync(path.join(APP, target), 'utf8')), true)
  expect(`shim ${shim} sits under a gated prefix`, isSeekerGatedPath('/' + shim.split('/')[0]) && gate({ pathname: '/messages/c1' }) === 'redirect', true)
}
expect('/messages itself stays gated', gate({ pathname: '/messages' }), 'redirect')
expect('an unlisted page without ProtectedRoute would be caught (shim list is not a blanket pass)', REDIRECT_SHIMS.size, 1)
expect('every gated prefix has at least one page', SEEKER_GATED_PREFIXES.filter((p) => pagesUnder(path.join(APP, p.slice(1))).length === 0), [])
// /employee is the public landing and job-search page: never gated, whatever the seeker's state.
expect('/employee is not on the gated list', SEEKER_GATED_PREFIXES.includes('/employee'), false)
expect('/employee is not a gated path', isSeekerGatedPath('/employee'), false)
expect('/employee has no ProtectedRoute (it is public)', fs.readFileSync(path.join(APP, 'employee', 'page.tsx'), 'utf8').includes('ProtectedRoute'), false)
for (const [label, over] of [
  ['flag true', { user: withFlag(true) }],
  ['flag true, failed read', { user: withFlag(true), profileSync: 'failed' }],
  ['loading', { profileSync: 'loading', user: withFlag(true) }],
  ['nothing known, failed read', { profileSync: 'failed', user: withFlag(undefined) }],
  ['storage still loading', { isLoading: true, user: null, hasToken: false }],
]) {
  expect(`/employee stays open for a seeker (${label})`, gate({ ...over, pathname: '/employee' }), 'none')
  expect(`/employee/anything stays open too (${label})`, gate({ ...over, pathname: '/employee/search' }), 'none')
}
expect('the protected pages are still gated (home)', gate({ pathname: '/home' }), 'redirect')
expect('the protected pages are still gated (job-feed)', gate({ pathname: '/job-feed' }), 'redirect')

// --- Source-level checks (there is no DOM here to mount the app: these prove wiring, not behaviour) ---
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8')
const api = read('src', 'lib', 'api.ts')
const gateSrc = read('src', 'components', 'auth', 'JobPreferencesGate.tsx')
const pageSrc = read('src', 'app', 'complete-profile', 'page.tsx')
const loginSrc = read('src', 'app', 'login', 'page.tsx')

// Timeout
const timeoutMs = Number(/export const PROFILE_READ_TIMEOUT_MS = ([\d_]+)/.exec(api)?.[1].replace(/_/g, ''))
expect('the profile read has a finite timeout (1s - 60s)', timeoutMs >= 1000 && timeoutMs <= 60000, true)
expect('getProfile takes a timeout and a signal', /getProfile: async \(opts\?: \{ signal\?: AbortSignal; timeoutMs\?: number \}\)/.test(api), true)
expect('the sync read passes the timeout', ctx.includes('.getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })'), true)
expect('the page reads the profile back with the timeout', pageSrc.includes('getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })'), true)
// Retry: only on request, only from 'failed', no timers
expect('retry only clears a failed record', /retryProfileSync = useCallback\(\(\) => \{\s*setSync\(\(prev\) => \(prev\?\.status === 'failed' \? null : prev\)\)/.test(ctx), true)
expect('no timer or interval anywhere in the provider', /setInterval|setTimeout/.test(ctx), false)
expect('no timer or interval in the gate', /setInterval|setTimeout/.test(gateSrc), false)
expect('the gate retries only from the button', /onClick=\{retryProfileSync\}/.test(gateSrc) && !/useEffect[\s\S]*retryProfileSync\(\)/.test(gateSrc), true)
expect('the gate offers Log out on the recovery screen', gateSrc.includes('nav.logout') && gateSrc.includes('logout()'), true)
// confirmSeekerProfile stores nothing for an invalid reply
const confirmFn = ctx.slice(ctx.indexOf('const confirmSeekerProfile'), ctx.indexOf('const logout = useCallback'))
expect("confirmSeekerProfile refuses a reply that is not 'ready' before touching state", /profileReadOutcome\(profile\) !== 'ready'\) return false/.test(confirmFn) && confirmFn.indexOf('return false') < confirmFn.indexOf('updateUser('), true)
// Page: what it sends, how it handles consent, when it moves on
// The first argument of updateProfile (the second is the timeout options).
const putCall = /jobSeekerAPI\.updateProfile\(\s*\{([\s\S]*?)\},\s*\{ timeoutMs/.exec(pageSrc)?.[1] ?? ''
expect(
  'the page saves exactly cityId + the three exact names',
  putCall.split(',').map((s) => s.split(':')[0].trim()).filter(Boolean).sort(),
  ['cityId', 'preferredCategory', 'preferredJobTitle', 'preferredSector']
)
expect('the page uses the existing pickers', ['TaxonomyPicker', 'StateCitySelect', 'UseMyLocation', 'useNearestCity'].every((n) => pageSrc.includes(n)), true)
expect('the page refuses to save without a city and a full triple', pageSrc.includes('homeCityProblem(') && pageSrc.includes('!triple.category || !triple.sector || !triple.jobTitle'), true)
// CONSENT_REQUIRED is classified by saveFailureKind (tested above) and returns before any error is shown.
expect('CONSENT_REQUIRED is not shown as a save error', pageSrc.indexOf("kind === 'consent'") > -1 && pageSrc.indexOf("kind === 'consent'") < pageSrc.indexOf('errorSave'), true)
expect('the page stores the read-back only via confirmSeekerProfile (through settleReadBack)', pageSrc.includes('settleReadBack(fresh, confirmSeekerProfile)') && !/updateUser|setUser|setSync/.test(pageSrc), true)
expect('the page leaves only on a confirmed false', pageSrc.includes("profileSync === 'ready' && user?.needsJobPreferences === false"), true)
expect('the page is seeker-only', pageSrc.includes('requiredRole="seeker"'), true)
// Wiring
expect('the gate is mounted in AuthProvider before ConsentGate', ctx.indexOf('<JobPreferencesGate />') > -1 && ctx.indexOf('<JobPreferencesGate />') < ctx.indexOf('<ConsentGate />'), true)
expect('the gate decides with preferencesGate', gateSrc.includes('preferencesGate('), true)
expect('the gate redirect carries returnUrl', gateSrc.includes('returnUrl=${encodeURIComponent(returnUrl)}'), true)
// Retry notice: visible, user-initiated, non-blocking, no timers
const noticeBranch = gateSrc.slice(gateSrc.indexOf("decision === 'notice'"), gateSrc.indexOf("decision === 'recover'"))
expect('the notice has a Try again button wired to retryProfileSync', /onClick=\{retryProfileSync\}/.test(noticeBranch) && noticeBranch.includes('buttons.tryAgain'), true)
expect('the notice says what failed, in the existing translated words', noticeBranch.includes('auth:completeProfile.recoverTitle'), true)
expect('the notice does not cover the page (no inset-0)', /inset-0/.test(noticeBranch), false)
expect('the notice is announced as a status', noticeBranch.includes('role="status"'), true)
expect('the notice calls nothing on render (retry is only an onClick)', /retryProfileSync\(/.test(gateSrc), false)

// Consent precedence. These read the real ConsentGate source: the dialog must paint above every
// layer the preferences gate adds, and must not be hidden on the preferences page.
const consentSrc = read('src', 'components', 'legal', 'ConsentGate.tsx')
const zOf = (src, re) => [...src.matchAll(re)].map((m) => Number(m[1]))
const consentZ = Math.max(...zOf(consentSrc, /fixed inset-0 z-\[(\d+)\]/g))
const gateZ = zOf(gateSrc, /\bz-(\d+)\b/g)
expect('the consent dialog has a z-index', Number.isFinite(consentZ) && consentZ > 0, true)
expect('the gate has overlays to compare (loading, recovery, notice)', gateZ.length >= 3, true)
expect('the consent dialog paints above every layer of the gate', gateZ.every((z) => z < consentZ), true)
expect('the preferences page adds no layer above the dialog', zOf(pageSrc, /\bz-(?:\[)?(\d+)/g).every((z) => z < consentZ), true)
const openWhilePending = /OPEN_WHILE_PENDING = new Set<string>\(\[([\s\S]*?)\]\)/.exec(consentSrc)?.[1] ?? ''
expect('the consent dialog is NOT hidden on the preferences page', openWhilePending.includes(routes.JOB_PREFERENCES_ROUTE) || openWhilePending.includes('complete-profile'), false)
expect('the consent dialog is not hidden on any page the gate guards', SEEKER_GATED_PREFIXES.filter((p) => openWhilePending.includes(`'${p}'`)), [])
expect('ConsentGate still waits for the password change, as the gate does', /!user\.mustChangePassword/.test(consentSrc), true)
expect('the dialog is modal and not dismissable (no Escape handler)', consentSrc.includes('aria-modal="true"') && !/key === 'Escape'/.test(consentSrc), true)
expect('the page does not unmount the dialog: ConsentGate sits in the provider, not in a page', ctx.includes('<ConsentGate />') && !/ConsentGate/.test(pageSrc + gateSrc.replace(/\/\*[\s\S]*?\*\//g, '')), true)
// What the backend lets through while consent is pending (drift guard: skipped, never passed, if the repo is absent)
const beAuth = path.join(ROOT, '..', 'prosiddhi-backend', 'src', 'middleware', 'auth.ts')
if (fs.existsSync(beAuth)) {
  const allowed = /CONSENT_PENDING_ALLOWED = new Set\(\[([\s\S]*?)\]\)/.exec(fs.readFileSync(beAuth, 'utf8'))?.[1] ?? ''
  expect('BE: GET /jobseekers/profile works while consent is pending (the sync read)', allowed.includes("'GET /jobseekers/profile'"), true)
  expect('BE: PUT /jobseekers/profile does not (the dialog must come first)', allowed.includes("'PUT /jobseekers/profile'"), false)
  expect('BE: the consent endpoints work while pending', allowed.includes("'GET /me/consents'") && allowed.includes("'POST /me/consents'"), true)
} else {
  console.log('  note: backend repo not found - the BE consent allow-list checks were SKIPPED (not passed)')
}
// Existing flows kept
expect('Google bind still ends at home, which the gate guards', loginSrc.includes('router.push(bindTarget ? homeRouteForRole(bindTarget.role)'), true)
expect('the bind still marks the account ACTIVE before moving on', loginSrc.includes("accountStatus: 'ACTIVE'"), true)
expect('PasswordChangeGate is still mounted', ctx.includes('<PasswordChangeGate />'), true)
expect('ConsentGate is still mounted', ctx.includes('<ConsentGate />'), true)

// --- Copy: every new key in every language ---
const LOCALES = ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']
const auth = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(read('src', 'locales', l, 'auth.json'))]))
const common = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(read('src', 'locales', l, 'common.json'))]))
const KEYS = Object.keys(auth.en.completeProfile ?? {})
expect('English has the 11 completeProfile keys', KEYS.length, 11)
const libSrc = read('src', 'lib', 'jobPreferences.ts')
const usedKeys = new Set([...(gateSrc + pageSrc + libSrc).matchAll(/auth:completeProfile\.(\w+)/g)].map((m) => m[1]))
expect('every completeProfile key the code uses exists in English', [...usedKeys].filter((k) => !KEYS.includes(k)), [])
expect('every English key is used by the code', KEYS.filter((k) => !usedKeys.has(k)), [])
for (const l of LOCALES) {
  const block = auth[l].completeProfile ?? {}
  expect(`${l}: has exactly the same keys`, Object.keys(block), KEYS)
  expect(`${l}: no empty string`, KEYS.filter((k) => typeof block[k] !== 'string' || !block[k].trim()), [])
  if (l !== 'en') {
    expect(`${l}: nothing left as the English fallback`, KEYS.filter((k) => block[k] === auth.en.completeProfile[k]), [])
    expect(`${l}: no Latin-only sentence (every string has a native-script letter)`, KEYS.filter((k) => !/[^\u0000-ɏ]/.test(block[k] ?? '')), [])
  }
  // Reused keys exist too
  expect(`${l}: reused keys exist`, [!!common[l].nav?.logout, !!common[l].buttons?.tryAgain, !!auth[l].categories?.errorCategory, !!auth[l].profile?.errorState, !!auth[l].profile?.errorCity], [true, true, true, true, true])
}

// ======================================================================================
// Stale PENDING_OTP_VERIFICATION, and registration (Option A)
// ======================================================================================

// --- accountStatus comes from the server's profile read, only when it is a real string ---
const pendingUser = seeker({ accountStatus: 'PENDING_OTP_VERIFICATION', needsJobPreferences: true })
const apply = (user, patch) => ({ ...user, ...patch })
expect('server ACTIVE replaces a stored pending status', seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 'ACTIVE' })).accountStatus, 'ACTIVE')
expect('server still pending keeps it pending', seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 'PENDING_OTP_VERIFICATION' })).accountStatus, 'PENDING_OTP_VERIFICATION')
expect('a missing status is not written', 'accountStatus' in seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true })), false)
expect('an empty status is not written', 'accountStatus' in seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: '' })), false)
expect('a non-string status is not written (number)', 'accountStatus' in seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 1 })), false)
expect('a non-string status is not written (null)', 'accountStatus' in seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: null })), false)
expect('a non-string status leaves the stored one in place', apply(pendingUser, seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 7 }))).accountStatus, 'PENDING_OTP_VERIFICATION')
expect('merging the status leaves the token-side fields alone', apply(pendingUser, seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 'ACTIVE' }))).id, 'u1')

// --- the gate waits for the read before it honours the pending-phone exemption ---
expect('pending + loading -> wait (a stored pending status may be stale)', gate({ profileSync: 'loading', user: pendingUser }), 'wait')
expect('pending + ready -> the phone step (phone first)', gate({ profileSync: 'ready', user: pendingUser }), 'phone')
expect('pending + failed -> recover, not a pass (stale cannot be told from real)', gate({ profileSync: 'failed', user: pendingUser }), 'recover')
expect('pending + idle -> nothing', gate({ profileSync: 'idle', user: pendingUser }), 'none')
expect('pending, read failed, nothing known: recover', gate({ profileSync: 'failed', user: seeker({ accountStatus: 'PENDING_OTP_VERIFICATION' }) }), 'recover')
expect('pending + loading on a page the gate ignores -> nothing', gate({ profileSync: 'loading', user: pendingUser, pathname: '/login' }), 'none')
expect('password change still wins over pending + loading', gate({ profileSync: 'loading', user: { ...pendingUser, mustChangePassword: true } }), 'none')
expect('the phone-bind page itself (/login) is never gated', gate({ profileSync: 'loading', user: pendingUser, pathname: '/login' }), 'none')
// The case that mattered: the bind was finished on another device, this browser still says pending.
const staleStep1 = gate({ profileSync: 'loading', user: pendingUser })
const afterRead = apply(pendingUser, seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 'ACTIVE' })))
const staleStep2 = gate({ profileSync: 'ready', user: afterRead })
expect('stale pending + server ACTIVE + flag true: waits, then redirects', [staleStep1, staleStep2], ['wait', 'redirect'])
expect('stale pending + server ACTIVE + flag false: waits, then lets in', [staleStep1, gate({ profileSync: 'ready', user: apply(pendingUser, seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: false, accountStatus: 'ACTIVE' }))) })], ['wait', 'none'])
expect('a real pending phone (server still pending) goes to the phone step, not the preferences page', gate({ profileSync: 'ready', user: apply(pendingUser, seekerSessionPatch(pendingUser, fresh({ needsJobPreferences: true, accountStatus: 'PENDING_OTP_VERIFICATION' }))) }), 'phone')
// The read that fails to carry the flag does not write the status either (the provider only patches on 'ready')
expect('a read without the flag is not ready, so nothing is merged', profileReadOutcome({ accountStatus: 'ACTIVE' }), 'failed')

// --- registration, Option A: the register-reply branch only ---
const regUser = { id: 'u7', email: null, role: 'JOB_SEEKER', accountStatus: 'ACTIVE', mustChangePassword: false }
// Before: the register reply has no flag, so the new user is unconfirmed, and a failed read is the recovery screen.
const regBefore = sessionUserFrom({ user: regUser })
expect('before: a register reply stores no flag', 'needsJobPreferences' in regBefore, false)
expect('before: it needs a read (loading)', st({ user: regBefore, sync: syncAfterLogin(regBefore) }), 'loading')
expect('before: a failed read is the recovery screen', gate({ user: regBefore, profileSync: 'failed' }), 'recover')
// After: the register-reply branch stores false.
const regAfter = sessionUserFrom({ user: regUser, needsJobPreferences: false })
expect('after: the register reply stores false', regAfter.needsJobPreferences, false)
expect('after: it is already confirmed (no read needed)', st({ user: regAfter, sync: syncAfterLogin(regAfter) }), 'ready')
expect('after: Home is not gated, and there is no wait', gate({ user: regAfter, profileSync: st({ user: regAfter, sync: syncAfterLogin(regAfter) }) }), 'none')
expect('after: even if a later read failed, they get the retry notice, not the recovery screen', gate({ user: regAfter, profileSync: 'failed' }), 'notice')
expect('after: the rest of the registered user is unchanged', { ...regAfter, needsJobPreferences: undefined }.accountStatus, 'ACTIVE')
// The fallback login branch keeps the server's own flag, whatever it is.
const loginTrue = sessionUserFrom({ user: regUser, needsJobPreferences: true })
const loginFalse = sessionUserFrom({ user: regUser, needsJobPreferences: false })
const loginNone = sessionUserFrom({ user: regUser })
expect('fallback login with server true: the gate redirects', gate({ user: loginTrue, profileSync: st({ user: loginTrue, sync: syncAfterLogin(loginTrue) }) }), 'redirect')
expect('fallback login with server false: the gate lets in', gate({ user: loginFalse, profileSync: st({ user: loginFalse, sync: syncAfterLogin(loginFalse) }) }), 'none')
expect('fallback login with no flag in the reply: still needs the read', st({ user: loginNone, sync: syncAfterLogin(loginNone) }), 'loading')
// Source: the false is in the register-reply branch ONLY
const regSrc = read('src', 'app', 'register', 'password', 'page.tsx')
const branchStart = regSrc.indexOf('created.token && created.user')
const fallbackStart = regSrc.indexOf("authAPI.login('seeker'")
const registerBranch = regSrc.slice(branchStart, fallbackStart)
const fallbackBranch = regSrc.slice(fallbackStart, fallbackStart + 200)
expect('the register-reply branch passes needsJobPreferences: false', registerBranch.includes('needsJobPreferences: false'), true)
expect('the fallback login branch does not set it', fallbackBranch.includes('needsJobPreferences'), false)
// The code form ends in " }" (the comment above it quotes the same words, in backticks).
expect('it is set exactly once in the page code', regSrc.split('needsJobPreferences: false }').length - 1, 1)
expect('the page still hands the session through sessionUserFrom', regSrc.includes('login(session.token, sessionUserFrom(session))'), true)
const regComment = regSrc.slice(regSrc.indexOf('`needsJobPreferences: false` is set ONLY'), branchStart)
expect('the assumption is documented: backend commit, the CITY_REQUIRED rule, the flag rule', ['0faacd3', 'CITY_REQUIRED', 'needsJobPreferences'].every((s) => regComment.includes(s)), true)
expect('the comment says when to revisit it', regComment.includes('REVISIT') && regComment.includes('registration requirements') && regComment.includes("flag's meaning"), true)

// ======================================================================================
// Stalled / ambiguous preferences save (PUT /jobseekers/profile)
// ======================================================================================
const { ApiError, RequestTimeoutError, PROFILE_WRITE_TIMEOUT_MS, PROFILE_READ_TIMEOUT_MS } = loadLib('api')
const { saveFailureKind, readBackResult, afterReadBack } = loadLib('jobPreferences')
const apiErr = (status, code) => new ApiError('x', status, undefined, undefined, code)

// --- which failures are ambiguous (may have been saved) ---
expect('a timeout is ambiguous', saveFailureKind(new RequestTimeoutError()), 'ambiguous')
expect('"Can\'t reach the server" is ambiguous', saveFailureKind(new Error("Can't reach the server. Check your connection and try again.")), 'ambiguous')
expect('an abort is ambiguous', saveFailureKind(Object.assign(new Error('aborted'), { name: 'AbortError' })), 'ambiguous')
expect('a non-Error throw is ambiguous', saveFailureKind('boom'), 'ambiguous')
expect('undefined is ambiguous', saveFailureKind(undefined), 'ambiguous')
expect('502 is ambiguous (a gateway)', saveFailureKind(apiErr(502)), 'ambiguous')
expect('503 is ambiguous', saveFailureKind(apiErr(503)), 'ambiguous')
expect('504 is ambiguous', saveFailureKind(apiErr(504)), 'ambiguous')
expect('500 is a definite failure (the server answered)', saveFailureKind(apiErr(500)), 'definite')
expect('400 is definite', saveFailureKind(apiErr(400)), 'definite')
expect('404 is definite', saveFailureKind(apiErr(404)), 'definite')
expect('401 is definite', saveFailureKind(apiErr(401)), 'definite')
expect('429 is definite', saveFailureKind(apiErr(429)), 'definite')
expect('CONSENT_REQUIRED (403) is the consent case, not a failure', saveFailureKind(apiErr(403, 'CONSENT_REQUIRED')), 'consent')
expect('CONSENT_REQUIRED wins even on a gateway status', saveFailureKind(apiErr(503, 'CONSENT_REQUIRED')), 'consent')
expect('another 403 is definite', saveFailureKind(apiErr(403, 'ROLE_MISMATCH')), 'definite')

// --- the timeout itself ---
expect('the write timeout is finite and bounded (20 s - 60 s)', PROFILE_WRITE_TIMEOUT_MS >= 20000 && PROFILE_WRITE_TIMEOUT_MS <= 60000, true)
expect('the write timeout is the approved 30 s', PROFILE_WRITE_TIMEOUT_MS, 30000)
expect('a write is allowed longer than a read', PROFILE_WRITE_TIMEOUT_MS > PROFILE_READ_TIMEOUT_MS, true)

// --- the read-back: only a boolean is an answer ---
expect('read-back: false -> saved', readBackResult({ needsJobPreferences: false }), 'saved')
expect('read-back: true -> still missing', readBackResult({ needsJobPreferences: true }), 'missing')
expect('read-back: missing flag -> unsure (never saved)', readBackResult({}), 'unsure')
expect('read-back: undefined flag -> unsure', readBackResult({ needsJobPreferences: undefined }), 'unsure')
expect('read-back: null flag -> unsure', readBackResult({ needsJobPreferences: null }), 'unsure')
expect('read-back: "false" string -> unsure', readBackResult({ needsJobPreferences: 'false' }), 'unsure')
expect('read-back: 0 -> unsure', readBackResult({ needsJobPreferences: 0 }), 'unsure')

// --- what the page shows after the read-back ---
expect('saved (PUT landed): no message, no recheck', afterReadBack('saved', false), { recheck: null, errorKey: null })
expect('saved after an ambiguous PUT: it did land, so no message either', afterReadBack('saved', true), { recheck: null, errorKey: null })
expect('still missing after an ambiguous PUT: it did not land, the user decides', afterReadBack('missing', true), { recheck: null, errorKey: 'auth:completeProfile.errorSave' })
expect('still missing after a PUT that landed: something else is missing', afterReadBack('missing', false), { recheck: null, errorKey: 'auth:completeProfile.errorStillMissing' })
expect('no usable answer after an ambiguous PUT: uncertainty + read-only Try again', afterReadBack('unsure', true), { recheck: 'unsure', errorKey: null })
expect('no usable answer after a PUT that landed: confirm message + read-only Try again', afterReadBack('unsure', false), { recheck: 'confirm', errorKey: null })
// A full pass through the ambiguous path, as the page runs it: timeout -> read -> (fail) -> read again -> saved.
const ambiguousPath = [saveFailureKind(new RequestTimeoutError()), afterReadBack('unsure', true), afterReadBack('unsure', true), afterReadBack(readBackResult({ needsJobPreferences: false }), true)]
expect('ambiguous save, two failed reads, then a confirmed false', [ambiguousPath[0], ambiguousPath[1].recheck, ambiguousPath[2].recheck, ambiguousPath[3].recheck], ['ambiguous', 'unsure', 'unsure', null])
expect('only a confirmed false ends the page (stored flag false + ready)', gate({ profileSync: 'ready', user: withFlag(false), pathname: '/home' }), 'none')

// --- source-level: the PUT is sent once, never repeated, and the page only moves on by the confirmed flag ---
const pageNow = read('src', 'app', 'complete-profile', 'page.tsx')
const apiNow = read('src', 'lib', 'api.ts')
expect('updateProfile takes an opt-in timeout', /updateProfile: async \(data: SeekerProfileUpdate, opts\?: \{ timeoutMs\?: number \}\)/.test(apiNow) && apiNow.includes('timeoutMs: opts?.timeoutMs'), true)
// The profile page passes time limits only for the per-card saves and the switch.
const profilePageNow = read('src', 'app', 'profile', 'page.tsx')
expect('the profile page passes a timeout only inside a card save or the switch', profilePageNow.split('\n').filter((l) => l.includes('timeoutMs')).every((l) => /PROFILE_(READ|WRITE)_TIMEOUT_MS/.test(l)), true)
expect('the page passes the write timeout', pageNow.includes('{ timeoutMs: PROFILE_WRITE_TIMEOUT_MS }'), true)
expect('the PUT appears exactly once in the page', pageNow.split('updateProfile(').length - 1, 1)
const saveFn = pageNow.slice(pageNow.indexOf('const handleSave'), pageNow.indexOf('// Reads the profile back'))
const recheckFn = pageNow.slice(pageNow.indexOf('const handleRecheck'), pageNow.indexOf('const selectCls'))
expect('handleSave classifies the failure with saveFailureKind', saveFn.includes('saveFailureKind(err)'), true)
expect('the consent case returns before any error is shown', saveFn.indexOf("kind === 'consent'") > -1 && saveFn.indexOf("kind === 'consent'") < saveFn.indexOf('errorSave'), true)
expect('the ambiguous case only flags it and falls through to the read-back', saveFn.includes('ambiguous = true') && saveFn.indexOf('ambiguous = true') < saveFn.indexOf('applyReadBack(await readBack(), ambiguous)'), true)
expect('the ambiguous branch has no second PUT', saveFn.slice(saveFn.indexOf('ambiguous = true')).includes('updateProfile('), false)
expect('Try again repeats only the read: no PUT in handleRecheck', recheckFn.includes('updateProfile') || recheckFn.includes('handleSave'), false)
expect('handleRecheck uses the same read-back and is guarded against overlap', recheckFn.includes('readBack()') && recheckFn.includes('if (saving || !recheck) return'), true)
expect('the Try again button calls handleRecheck, not handleSave', /onClick=\{handleRecheck\}/.test(pageNow), true)
expect('the uncertainty message is shown from recheck state', pageNow.includes("recheck === 'unsure' ? 'auth:completeProfile.errorUnsure' : 'auth:completeProfile.errorConfirm'"), true)
expect('the read-back is bounded and stored only through confirmSeekerProfile', pageNow.includes('getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })') && pageNow.includes('settleReadBack(fresh, confirmSeekerProfile)'), true)
expect('the page still never navigates itself except the confirmed-false effect', pageNow.split('router.replace(').length - 1 === 1 && !/router\.push\(/.test(pageNow), true)
expect('the page does not write the session itself', /updateUser|setUser|setSync/.test(pageNow), false)

// ======================================================================================
// Pending phone verification: phone first, then preferences, then Home
// ======================================================================================
const { shouldResumePhoneBind } = loadLib('jobPreferences')
const PENDING = 'PENDING_OTP_VERIFICATION'
const pend = (extra = {}) => seeker({ accountStatus: PENDING, needsJobPreferences: true, ...extra })
const PROTECTED_PAGES = ['/home', '/job-feed', '/job-details/abc', '/my-applications', '/my-applications/9', '/my-interviews', '/saved-jobs', '/messages', '/messages/c1', '/profile']
const OPEN_PAGES = ['/', '/employee', '/employee/search', '/login', '/register/phone', '/register/success', '/change-password', '/settings', '/delete-account', '/help', '/terms', '/privacy']

// A pending seeker cannot open a protected page by URL: confirmed pending goes to the phone step.
for (const p of PROTECTED_PAGES) {
  expect(`pending + ready: ${p} -> phone step`, gate({ user: pend(), profileSync: 'ready', pathname: p }), 'phone')
  expect(`pending + loading: ${p} -> wait (a stored status may be stale)`, gate({ user: pend(), profileSync: 'loading', pathname: p }), 'wait')
  expect(`pending + failed: ${p} -> recover (never a pass)`, gate({ user: pend(), profileSync: 'failed', pathname: p }), 'recover')
}
// ...and not the preferences page either.
expect('pending + ready: /complete-profile -> phone step', gate({ user: pend(), profileSync: 'ready', pathname: '/complete-profile' }), 'phone')
expect('pending + loading: /complete-profile -> wait', gate({ user: pend(), profileSync: 'loading', pathname: '/complete-profile' }), 'wait')
expect('pending + failed: /complete-profile -> recover', gate({ user: pend(), profileSync: 'failed', pathname: '/complete-profile' }), 'recover')
expect('pending: /complete-profile while storage loads -> nothing (its own spinner)', gate({ user: null, hasToken: false, isLoading: true, pathname: '/complete-profile' }), 'none')
// The preferences page is untouched for everyone who is not pending.
for (const [label, user, sync] of [
  ['flag true', seeker({ needsJobPreferences: true }), 'ready'],
  ['flag false', seeker({ needsJobPreferences: false }), 'ready'],
  ['nothing known', seeker(), 'failed'],
  ['loading', seeker({ needsJobPreferences: true }), 'loading'],
  ['active', seeker({ accountStatus: 'ACTIVE', needsJobPreferences: true }), 'ready'],
]) {
  expect(`/complete-profile for a non-pending seeker (${label}) is never gated`, gate({ user, profileSync: sync, pathname: '/complete-profile' }), 'none')
}
// Public pages and the recovery flows stay open, whatever the state.
for (const p of OPEN_PAGES) {
  for (const sync of ['loading', 'ready', 'failed', 'idle']) {
    expect(`pending: ${p} stays open (${sync})`, gate({ user: pend(), profileSync: sync, pathname: p }), 'none')
  }
}
// Order: phone, then preferences, then Home.
const stepA = gate({ user: pend({ needsJobPreferences: true }), profileSync: 'ready', pathname: '/home' })
const stepB = gate({ user: { ...pend({ needsJobPreferences: true }), accountStatus: 'ACTIVE' }, profileSync: 'ready', pathname: '/home' })
const stepC = gate({ user: { ...pend({ needsJobPreferences: false }), accountStatus: 'ACTIVE' }, profileSync: 'ready', pathname: '/home' })
expect('order: pending -> phone, after the bind with preferences missing -> preferences, once complete -> Home', [stepA, stepB, stepC], ['phone', 'redirect', 'none'])
expect('order: a pending seeker whose preferences are fine still does the phone first', gate({ user: pend({ needsJobPreferences: false }), profileSync: 'ready' }), 'phone')
expect('order: a pending seeker with NO flag known still does the phone first (not recover)', gate({ user: pend({ needsJobPreferences: undefined }), profileSync: 'ready' }), 'phone')
// Stale status: the bind was finished elsewhere; the read says ACTIVE.
const staleBefore = gate({ user: pend(), profileSync: 'loading' })
const staleAfter = gate({ user: apply(pend(), seekerSessionPatch(pend(), fresh({ needsJobPreferences: true, accountStatus: 'ACTIVE' }))), profileSync: 'ready' })
expect('stale pending + server ACTIVE + flag true: wait, then preferences (not the phone step)', [staleBefore, staleAfter], ['wait', 'redirect'])
// Password change still wins; employers and signed-out visitors are untouched.
expect('password change wins over the phone step', gate({ user: pend({ mustChangePassword: true }), profileSync: 'ready' }), 'none')
expect('password change wins on the preferences page too', gate({ user: pend({ mustChangePassword: true }), profileSync: 'ready', pathname: '/complete-profile' }), 'none')
expect('a pending EMPLOYER is not touched (home)', gate({ user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_INDIVIDUAL', accountStatus: PENDING }, profileSync: 'ready' }), 'none')
expect('a pending EMPLOYER is not touched (preferences page)', gate({ user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_BUSINESS', accountStatus: PENDING }, profileSync: 'ready', pathname: '/complete-profile' }), 'none')
expect('signed out: not touched', gate({ user: null, hasToken: false, pathname: '/complete-profile' }), 'none')

// No redirect loop: wherever the gate sends someone, the gate lets them stay there.
const loops = []
for (const sync of ['idle', 'loading', 'ready', 'failed']) {
  for (const flag of [true, false, undefined]) {
    for (const status of ['ACTIVE', PENDING, undefined]) {
      for (const mustChange of [false, true]) {
        for (const page of [...PROTECTED_PAGES, '/complete-profile']) {
          const u = seeker({ ...(flag === undefined ? {} : { needsJobPreferences: flag }), ...(status ? { accountStatus: status } : {}), mustChangePassword: mustChange })
          const d = gate({ user: u, profileSync: sync, pathname: page })
          const target = d === 'phone' ? '/login' : d === 'redirect' ? routes.JOB_PREFERENCES_ROUTE : null
          if (target && gate({ user: u, profileSync: sync, pathname: target }) !== 'none') loops.push([sync, flag, status, mustChange, page, d])
        }
      }
    }
  }
}
expect('no state sends someone to a page that sends them on again (exhaustive)', loops, [])

// --- the login page's resume step ---
const rb = (over = {}) => shouldResumePhoneBind({ isLoading: false, profileSync: 'ready', user: pend(), ...over })
expect('resume: a signed-in pending seeker (read done)', rb(), true)
expect('resume: also when the read failed (they can still log out)', rb({ profileSync: 'failed' }), true)
expect('resume: not while the profile read is loading (status may be stale)', rb({ profileSync: 'loading' }), false)
expect('resume: not while storage is loading', rb({ isLoading: true }), false)
expect('resume: not for an active seeker', rb({ user: seeker({ accountStatus: 'ACTIVE' }) }), false)
expect('resume: not when the stale status was corrected to ACTIVE', rb({ user: apply(pend(), seekerSessionPatch(pend(), fresh({ needsJobPreferences: false, accountStatus: 'ACTIVE' }))) }), false)
expect('resume: not for an employer', rb({ user: { id: 'e1', email: 'a@b.in', role: 'EMPLOYER_INDIVIDUAL', accountStatus: PENDING } }), false)
expect('resume: not when signed out', rb({ user: null }), false)
// Source: the login page and the gate
const loginNow = read('src', 'app', 'login', 'page.tsx')
const gateNow = read('src', 'components', 'auth', 'JobPreferencesGate.tsx')
expect('the gate sends the phone step to /login', /decision === 'phone'[\s\S]{0,260}router\.replace\('\/login'\)/.test(gateNow), true)
expect('the gate covers the page while it redirects to the phone step', gateNow.includes("'wait', 'redirect' and 'phone'"), true)
expect('the login page resumes through shouldResumePhoneBind', loginNow.includes('shouldResumePhoneBind({ isLoading: sessionLoading, profileSync, user: sessionUser })'), true)
expect('the resume is derived (no effect, no flash of the sign-in form)', loginNow.includes("const mode: Mode = resumeBindUser || modeState === 'bindPhone' ? 'bindPhone' : 'login'"), true)
const logoutBtn = loginNow.slice(loginNow.indexOf("bindTarget?.role === 'JOB_SEEKER' && ("), loginNow.indexOf('{/* Sign Up Link'))
expect('the bind view has a Log out, for seekers only', logoutBtn.includes('nav.logout') && logoutBtn.includes('logout()') && logoutBtn.includes("setMode('login')") && logoutBtn.includes('setBindUser(null)'), true)
expect('Log out clears the local bind state before signing out', logoutBtn.indexOf("setMode('login')") < logoutBtn.indexOf('logout()'), true)
expect('the bind is still finished by completeBind, which marks ACTIVE and pushes Home', loginNow.includes("accountStatus: 'ACTIVE'") && loginNow.includes('router.push(bindTarget ? homeRouteForRole(bindTarget.role)'), true)
expect('completeBind keeps the bind view up until the route changes', loginNow.slice(loginNow.indexOf('const completeBind'), loginNow.indexOf('updateUser({ phoneNumber')).includes("setMode('bindPhone')"), true)
expect('the Google click still enters the bind step itself', loginNow.includes('if (result.needsPhoneVerification) {') && loginNow.includes("setMode('bindPhone')"), true)
expect('the employer bind flow is unchanged (resume is seeker-only)', loginNow.includes("sessionUser?.role === 'JOB_SEEKER'") === false && read('src', 'lib', 'jobPreferences.ts').includes("user.role === 'JOB_SEEKER'"), true)

// ======================================================================================
// Null-safe read-back: an EMPTY profile reply is unusable, not a crash and never a success
// (performRequest resolves a 204, or a body that is `null`, to undefined/null)
// ======================================================================================
const { settleReadBack } = loadLib('jobPreferences')
const noThrow = (fn) => {
  try {
    return fn()
  } catch (e) {
    return `THROWS ${e.constructor.name}`
  }
}
for (const [label, value] of [['null', null], ['undefined', undefined]]) {
  expect(`profileReadOutcome(${label}) is failed, not a throw`, noThrow(() => profileReadOutcome(value)), 'failed')
  expect(`readBackResult(${label}) is unsure, not a throw`, noThrow(() => readBackResult(value)), 'unsure')
}
// Other unusable replies must not throw either.
for (const [label, value] of [['a string', 'oops'], ['a number', 5], ['an array', []], ['an empty object', {}], ['a boolean', false]]) {
  expect(`profileReadOutcome(${label}) does not throw and is failed`, noThrow(() => profileReadOutcome(value)), 'failed')
  expect(`readBackResult(${label}) does not throw and is unsure`, noThrow(() => readBackResult(value)), 'unsure')
}
// The existing valid / invalid flag cases still behave exactly as before.
expect('profileReadOutcome: true -> ready', profileReadOutcome({ needsJobPreferences: true }), 'ready')
expect('profileReadOutcome: false -> ready', profileReadOutcome({ needsJobPreferences: false }), 'ready')
expect('profileReadOutcome: "false" -> failed', profileReadOutcome({ needsJobPreferences: 'false' }), 'failed')
expect('profileReadOutcome: null flag -> failed', profileReadOutcome({ needsJobPreferences: null }), 'failed')
expect('profileReadOutcome: missing flag -> failed', profileReadOutcome({ jobSeeker: {} }), 'failed')
expect('readBackResult: true -> missing', readBackResult({ needsJobPreferences: true }), 'missing')
expect('readBackResult: false -> saved', readBackResult({ needsJobPreferences: false }), 'saved')
expect('readBackResult: 0 -> unsure', readBackResult({ needsJobPreferences: 0 }), 'unsure')
expect('readBackResult: "true" -> unsure', readBackResult({ needsJobPreferences: 'true' }), 'unsure')

// settleReadBack is what the page runs: the session is touched (confirm) only for a usable answer.
const settleWith = (value, confirmResult = true) => {
  let calls = 0
  const answer = noThrow(() =>
    settleReadBack(value, () => {
      calls++
      return confirmResult
    })
  )
  return { answer, calls }
}
expect('settle: null -> unsure, nothing stored', settleWith(null), { answer: 'unsure', calls: 0 })
expect('settle: undefined -> unsure, nothing stored', settleWith(undefined), { answer: 'unsure', calls: 0 })
expect('settle: {} -> unsure, nothing stored', settleWith({}), { answer: 'unsure', calls: 0 })
expect('settle: invalid flag -> unsure, nothing stored', settleWith({ needsJobPreferences: 'false' }), { answer: 'unsure', calls: 0 })
expect('settle: false -> saved, stored once', settleWith({ needsJobPreferences: false }), { answer: 'saved', calls: 1 })
expect('settle: true -> missing, stored once', settleWith({ needsJobPreferences: true }), { answer: 'missing', calls: 1 })
expect('settle: a usable flag the session refuses to store is unsure, not saved', settleWith({ needsJobPreferences: false }, false), { answer: 'unsure', calls: 1 })
// The rule that matters: of every kind of reply, ONLY a boolean false can complete the flow.
const everyReply = [null, undefined, {}, [], 'x', 0, 1, true, false, { needsJobPreferences: true }, { needsJobPreferences: false }, { needsJobPreferences: 'false' }, { needsJobPreferences: null }, { needsJobPreferences: undefined }, { needsJobPreferences: 0 }, { needsJobPreferences: 'true' }, { jobSeeker: null }]
expect(
  'only { needsJobPreferences: false } settles as saved',
  everyReply.filter((v) => settleWith(v).answer === 'saved'),
  [{ needsJobPreferences: false }]
)
expect('no reply makes settleReadBack throw', everyReply.filter((v) => String(settleWith(v).answer).startsWith('THROWS')), [])

// Both paths reach the uncertainty UI when the read-back is empty.
// handleSave: the PUT timed out (ambiguous) or landed, then the read comes back empty.
expect('handleSave, ambiguous PUT + empty read -> uncertainty message + read-only Try again', afterReadBack(settleWith(null).answer, true), { recheck: 'unsure', errorKey: null })
expect('handleSave, PUT landed + empty read -> confirm message + read-only Try again', afterReadBack(settleWith(undefined).answer, false), { recheck: 'confirm', errorKey: null })
// handleRecheck: it is already showing the message; an empty read keeps it, a usable one resolves it.
expect('handleRecheck, still empty -> the message stays', afterReadBack(settleWith(null).answer, true).recheck, 'unsure')
expect('handleRecheck, then a confirmed false -> cleared, the page moves on', afterReadBack(settleWith({ needsJobPreferences: false }).answer, true), { recheck: null, errorKey: null })
expect('handleRecheck, then a true -> "could not save", the user decides', afterReadBack(settleWith({ needsJobPreferences: true }).answer, true), { recheck: null, errorKey: 'auth:completeProfile.errorSave' })
// The AuthContext sync read is safe too: an empty reply is a failed read, which never reads as "no".
expect('sync: an empty reply is failed', profileReadOutcome(null), 'failed')
expect('sync: and a failed read keeps the stored flag out of ready', st({ sync: { id: 'u1', status: profileReadOutcome(undefined) } }), 'failed')

// Source: both handlers go through the same null-safe path; the PUT is still sent once.
const pageFinal = read('src', 'app', 'complete-profile', 'page.tsx')
const readBackSrc = pageFinal.slice(pageFinal.indexOf('const readBack = async'), pageFinal.indexOf('// \'saved\' shows nothing'))
expect('readBack: a failed GET is unsure', /catch \{\s*return 'unsure'\s*\}/.test(readBackSrc), true)
expect('readBack returns settleReadBack(fresh, confirmSeekerProfile)', readBackSrc.includes('return settleReadBack(fresh, confirmSeekerProfile)'), true)
expect('readBack no longer dereferences the reply itself', /fresh\./.test(readBackSrc), false)
expect('handleSave and handleRecheck both use readBack() then applyReadBack', pageFinal.includes('applyReadBack(await readBack(), ambiguous)') && pageFinal.includes('applyReadBack(await readBack(), recheck === \'unsure\')'), true)
expect('the page still sends the PUT exactly once', pageFinal.split('updateProfile(').length - 1, 1)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} job-preferences checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} job-preferences checks passed`)
