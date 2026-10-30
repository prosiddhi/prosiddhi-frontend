#!/usr/bin/env node
/**
 * Login-entry check — the mechanical gate for src/lib/loginSession.ts: when /login
 * sends someone who arrives already signed in to their home, and when it shows the form.
 * Also covers shouldPushLogin (routes.ts) and destinationAfterAuth's fallbacks.
 *
 *   node scripts/verify-login-session.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-job-preferences.mjs). No network, no new dependencies.
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

const { loginEntryDecision, settleOutcome, classifyEmployerProbeError } = loadLib('loginSession')
const { shouldPushLogin, destinationAfterAuth } = loadLib('routes')
const { ApiError } = loadLib('api')

let checks = 0
const failures = []
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(actual)
  const w = JSON.stringify(want)
  if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
}

const seeker = (extra = {}) => ({ role: 'JOB_SEEKER', ...extra })
const employer = (extra = {}) => ({ role: 'EMPLOYER_BUSINESS', ...extra })

// A signed-in seeker whose profile read has confirmed the session; each case changes one thing.
const base = {
  isLoading: false,
  hadSessionOnEntry: true,
  gaveUp: false,
  hasToken: true,
  user: seeker(),
  profileSync: 'ready',
  resumeBindUser: false,
  employerProbe: 'pending',
}
const decide = (over) => loginEntryDecision({ ...base, ...over })

// --- loginEntryDecision: arrival ---
expect('hydrating: wait', decide({ isLoading: true }), 'wait')
expect('entry not read yet: wait', decide({ hadSessionOnEntry: null }), 'wait')
expect('logged out on entry: form', decide({ hadSessionOnEntry: false, hasToken: false, user: null }), 'show-form')
expect('signed in on this page (not on entry): form', decide({ hadSessionOnEntry: false }), 'show-form')
expect('cap passed: form, even if it could redirect', decide({ gaveUp: true }), 'show-form')
expect('session ended (no token): form', decide({ hasToken: false, user: null }), 'show-form')
expect('token without a user: form', decide({ user: null }), 'show-form')

// --- password change: AuthProvider's gate owns it ---
expect('seeker must change password: form', decide({ user: seeker({ mustChangePassword: true }) }), 'show-form')
expect(
  'employer must change password: form',
  decide({ user: employer({ mustChangePassword: true }), employerProbe: 'ok' }),
  'show-form'
)

// --- seeker ---
expect('seeker, read in flight: wait', decide({ profileSync: 'loading' }), 'wait')
expect('seeker, read confirmed: redirect', decide({}), 'redirect')
expect('seeker, read failed: form', decide({ profileSync: 'failed' }), 'show-form')
expect('seeker, idle: form', decide({ profileSync: 'idle' }), 'show-form')
expect('pending phone, read in flight: wait (not form, not redirect)', decide({ profileSync: 'loading', resumeBindUser: false }), 'wait')
expect('pending phone, read done: form (bind step)', decide({ resumeBindUser: true }), 'show-form')

// --- employer ---
expect('employer, check pending: wait', decide({ user: employer() }), 'wait')
expect('employer, check ok: redirect', decide({ user: employer(), employerProbe: 'ok' }), 'redirect')
expect('employer, check invalid: form', decide({ user: employer(), employerProbe: 'invalid' }), 'show-form')
expect('employer, check unknown: form', decide({ user: employer(), employerProbe: 'unknown' }), 'show-form')
expect(
  'individual employer, check ok: redirect',
  decide({ user: { role: 'EMPLOYER_INDIVIDUAL' }, employerProbe: 'ok' }),
  'redirect'
)
expect('employer ignores profileSync', decide({ user: employer(), employerProbe: 'ok', profileSync: 'idle' }), 'redirect')

// --- settleOutcome: the first answer sticks ---
expect('latch: wait stays open', settleOutcome(null, 'wait'), null)
expect('latch: redirect', settleOutcome(null, 'redirect'), 'redirect')
expect('latch: form', settleOutcome(null, 'show-form'), 'show-form')
expect('latch: a late redirect cannot undo the form', settleOutcome('show-form', 'redirect'), 'show-form')
expect('latch: wait cannot undo the form', settleOutcome('show-form', 'wait'), 'show-form')
expect('latch: a redirect stays a redirect', settleOutcome('redirect', 'show-form'), 'redirect')
// The cap scenario end to end: still waiting, the cap passes, then the read finishes.
{
  let outcome = null
  outcome = settleOutcome(outcome, decide({ profileSync: 'loading' }))
  outcome = settleOutcome(outcome, decide({ profileSync: 'loading', gaveUp: true }))
  outcome = settleOutcome(outcome, decide({ profileSync: 'ready', gaveUp: true }))
  expect('cap, then a late confirmed read: form stays', outcome, 'show-form')
}

// --- classifyEmployerProbeError ---
const apiErr = (status, code) => new ApiError('x', status, undefined, undefined, code)
expect('probe: 401 is invalid', classifyEmployerProbeError(apiErr(401, 'SESSION_REVOKED')), 'invalid')
expect('probe: 401 TOKEN_EXPIRED (refresh refused) is invalid', classifyEmployerProbeError(apiErr(401, 'TOKEN_EXPIRED')), 'invalid')
expect('probe: 403 CONSENT_REQUIRED is ok', classifyEmployerProbeError(apiErr(403, 'CONSENT_REQUIRED')), 'ok')
expect('probe: 403 PASSWORD_CHANGE_REQUIRED is unknown', classifyEmployerProbeError(apiErr(403, 'PASSWORD_CHANGE_REQUIRED')), 'unknown')
expect('probe: 500 is unknown', classifyEmployerProbeError(apiErr(500)), 'unknown')
expect('probe: 503 is unknown', classifyEmployerProbeError(apiErr(503)), 'unknown')
expect('probe: network error is unknown', classifyEmployerProbeError(new Error("Can't reach the server.")), 'unknown')
expect('probe: abort is unknown', classifyEmployerProbeError(new DOMException('x', 'AbortError')), 'unknown')
expect('probe: non-error is unknown', classifyEmployerProbeError(undefined), 'unknown')

// --- shouldPushLogin ---
expect('no reason on /login: no push (keeps returnUrl)', shouldPushLogin(undefined, '/login'), false)
expect('null reason on /login: no push', shouldPushLogin(null, '/login'), false)
expect('reason on /login: push', shouldPushLogin('suspended', '/login'), true)
expect('no reason on /home: push', shouldPushLogin(undefined, '/home'), true)
expect('reason on /home: push', shouldPushLogin('rejected', '/home'), true)

// --- destinationAfterAuth: what the redirect uses ---
// safeInternalPath resolves against the page origin and returns null without a window.
globalThis.window = { location: { origin: 'https://prosiddhi.com' } }
expect('seeker, no returnUrl: /home', destinationAfterAuth('JOB_SEEKER', null), '/home')
expect('employer, no returnUrl: /employer', destinationAfterAuth('EMPLOYER_BUSINESS', null), '/employer')
expect('individual employer, no returnUrl: /employer', destinationAfterAuth('EMPLOYER_INDIVIDUAL', null), '/employer')
expect('seeker keeps a good returnUrl', destinationAfterAuth('JOB_SEEKER', '/saved-jobs'), '/saved-jobs')
expect('employer keeps a good returnUrl', destinationAfterAuth('EMPLOYER_BUSINESS', '/employer/jobs'), '/employer/jobs')
expect('off-site returnUrl falls back', destinationAfterAuth('JOB_SEEKER', '//evil.com'), '/home')
expect('seeker on an employer returnUrl falls back', destinationAfterAuth('JOB_SEEKER', '/employer/jobs'), '/home')
expect('/login as returnUrl falls back', destinationAfterAuth('EMPLOYER_BUSINESS', '/login'), '/employer')

// DEF-012: the two routes the footer's "Post a Job" / "Find Workers" lead to. A logged-out visitor is
// bounced to /login?returnUrl=<that route>; after signing in, an employer must land back on it, with
// its query intact, and a job seeker must not be sent into the employer area.
for (const role of ['EMPLOYER_BUSINESS', 'EMPLOYER_INDIVIDUAL']) {
  expect(`${role}: back to /employer/jobs/new`, destinationAfterAuth(role, '/employer/jobs/new'), '/employer/jobs/new')
  expect(`${role}: back to /employer/workers`, destinationAfterAuth(role, '/employer/workers'), '/employer/workers')
  expect(`${role}: /employer/workers keeps its query`, destinationAfterAuth(role, '/employer/workers?q=welder'), '/employer/workers?q=welder')
}
expect('seeker on /employer/jobs/new falls back', destinationAfterAuth('JOB_SEEKER', '/employer/jobs/new'), '/home')
expect('seeker on /employer/workers falls back', destinationAfterAuth('JOB_SEEKER', '/employer/workers'), '/home')

// --- source: the wiring this logic depends on ---
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8')
const page = read('src', 'app', 'login', 'page.tsx')
const auth = read('src', 'contexts', 'AuthContext.tsx')
expect('page: redirect uses replace, not push', page.includes('router.replace(destinationAfterAuth(redirectRole, returnUrl))'), true)
expect('page: the redirect waits for the latched outcome', page.includes("if (outcome !== 'redirect'"), true)
expect('page: a latched redirect falls back to the form if the session ended first', page.includes("setOutcome('show-form')"), true)
expect('page: the form is not rendered while checking', page.includes("if (decision !== 'show-form') return <PageSpinner />"), true)
expect('page: the check goes through employerAPI.getProfile, not a raw fetch', /employerAPI\s*\.getProfile\(\{ signal/.test(page) && !/\bfetch\(/.test(page), true)
expect('page: the employer check is aborted on cleanup', page.includes('return () => controller.abort()'), true)
expect('AuthContext: the 401 handler guards its push with shouldPushLogin', auth.includes('shouldPushLogin(reason, window.location.pathname)'), true)

// DEF-012 login context: the note that says "Signing in as Employer" on the default password screen.
// Source-level guards for what must NOT change (the browser smoke checks what is rendered).
const protectedRoute = read('src', 'components', 'auth', 'ProtectedRoute.tsx')
expect('login page: the employer note exists', page.includes('data-login-context="employer"'), true)
expect('login page: the note is gated on the role AND on the employer returnUrl', page.includes("role === 'employer' && initialRoleFor(returnUrl) === 'employer'"), true)
expect('login page: the note is one sentence with the existing Employer term as {{role}}', page.includes("t('auth:login.signingInAs', { role: t('auth:login.roleEmployer') })"), true)
expect('login page: no second role toggle (exactly the two Google-arm buttons)', (page.match(/aria-pressed=\{role ===/g) || []).length, 2)
expect('login page: the role toggle is still drawn only on the Google arm', /\{mode === 'login' && tab === 'google' && \(\s*<>\s*<p[^>]*>\{t\('auth:login\.roleQuestion'\)\}/.test(page), true)
expect('login page: the role still comes from the returnUrl via initialRoleFor', page.includes('setRole(initialRoleFor(returnUrl))'), true)
expect('login page: password sign-in still passes the role', page.includes('authAPI.loginAnyRole({ identifier, password }, role)'), true)
expect('ProtectedRoute: the returnUrl is the full path + query, via loginHref', protectedRoute.includes('window.location.pathname + window.location.search') && protectedRoute.includes('loginHref(returnUrl)'), true)

// --- the sentence itself: every locale writes the WHOLE sentence around {{role}} ---
// Rendered with i18next and the portal's own interpolation setting (src/i18n/config.ts: escapeValue
// false), with login.roleEmployer as the value, exactly as the login page calls it. This proves the
// placeholder is wired and the Employer term is reused once; it cannot prove the grammar. The 9
// non-English sentences are PENDING NATIVE REVIEW.
const i18next = createRequire(import.meta.url)('i18next')
for (const lng of ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']) {
  const login = JSON.parse(read('src', 'locales', lng, 'auth.json')).login
  const tpl = login.signingInAs
  expect(`${lng}: signingInAs has exactly one {{role}}`, (tpl.match(/\{\{\s*role\s*\}\}/g) || []).length, 1)
  expect(`${lng}: signingInAs has no other placeholder`, (tpl.match(/\{\{[^}]*\}\}/g) || []).length, 1)
  const inst = i18next.createInstance()
  await inst.init({
    lng,
    ns: ['auth'],
    defaultNS: 'auth',
    resources: { [lng]: { auth: { login: { signingInAs: tpl, roleEmployer: login.roleEmployer } } } },
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  const text = inst.t('auth:login.signingInAs', { role: inst.t('auth:login.roleEmployer') })
  expect(`${lng}: the language's own Employer term appears once`, text.split(login.roleEmployer).length - 1, 1)
  expect(`${lng}: nothing is left unreplaced`, /\{\{|\}\}/.test(text), false)
  expect(`${lng}: the sentence is more than the bare role word`, text.length > login.roleEmployer.length + 3, true)
  if (lng === 'en') expect('en: renders exactly "Signing in as Employer"', text, 'Signing in as Employer')
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} login-session checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} login-session checks passed`)
