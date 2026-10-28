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

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} login-session checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} login-session checks passed`)
