#!/usr/bin/env node
/**
 * OTP send-response timing check — the mechanical gate for src/lib/otpSend.ts.
 *
 *   node scripts/verify-otp-send.mjs
 *
 * Runs the REAL TypeScript source (transpiled in memory with the project's own
 * `typescript`, same approach as verify-email.mjs). No new dependencies.
 *
 * The expectations are the rule written out by hand: a field is used only when it
 * is a finite number above zero; anything else gives the default (30 seconds for
 * the cooldown, 10 minutes for the expiry). Strings are never parsed.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'otpSend.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { readOtpSendTiming, parseRetryAfter, DEFAULT_RESEND_COOLDOWN_SECONDS, DEFAULT_OTP_EXPIRES_IN_MINUTES } = mod.exports

const failures = []
let checks = 0

function expect(label, actual, expected) {
  checks++
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) failures.push(`${label}\n    expected ${e}\n    got      ${a}`)
}

const timing = (cooldownSeconds, expiresIn) => ({ cooldownSeconds, expiresIn })

expect('default cooldown is 30 seconds', DEFAULT_RESEND_COOLDOWN_SECONDS, 30)
expect('default expiry is 10 minutes', DEFAULT_OTP_EXPIRES_IN_MINUTES, 10)

// --- the new contract: both numbers present ---
expect('both numbers', readOtpSendTiming({ expiresIn: 10, resendCooldownSeconds: 30 }), timing(30, 10))
expect('non-default numbers', readOtpSendTiming({ expiresIn: 5, resendCooldownSeconds: 60 }), timing(60, 5))
expect('small numbers', readOtpSendTiming({ expiresIn: 1, resendCooldownSeconds: 1 }), timing(1, 1))
expect('large numbers are accepted', readOtpSendTiming({ expiresIn: 1440, resendCooldownSeconds: 3600 }), timing(3600, 1440))
expect('fractions are accepted', readOtpSendTiming({ expiresIn: 0.5, resendCooldownSeconds: 12.5 }), timing(12.5, 0.5))
expect('other response fields are ignored', readOtpSendTiming({ phoneNumber: '+919876543210', otp: '123456', expiresIn: 7, resendCooldownSeconds: 45 }), timing(45, 7))

// --- fields missing ---
expect('empty object', readOtpSendTiming({}), timing(30, 10))
expect('cooldown missing', readOtpSendTiming({ expiresIn: 5 }), timing(30, 5))
expect('expiry missing', readOtpSendTiming({ resendCooldownSeconds: 60 }), timing(60, 10))
expect('undefined fields', readOtpSendTiming({ expiresIn: undefined, resendCooldownSeconds: undefined }), timing(30, 10))
expect('null fields', readOtpSendTiming({ expiresIn: null, resendCooldownSeconds: null }), timing(30, 10))

// --- the response itself missing or not an object ---
expect('undefined response', readOtpSendTiming(undefined), timing(30, 10))
expect('null response', readOtpSendTiming(null), timing(30, 10))
expect('string response', readOtpSendTiming('10 minutes'), timing(30, 10))
expect('number response', readOtpSendTiming(10), timing(30, 10))
expect('boolean response', readOtpSendTiming(true), timing(30, 10))
expect('array response', readOtpSendTiming([10, 30]), timing(30, 10))

// --- the old backend: expiry as a string, no cooldown ---
expect('old backend: "10 minutes"', readOtpSendTiming({ expiresIn: '10 minutes' }), timing(30, 10))
expect('old backend: "5 minutes" is not parsed', readOtpSendTiming({ expiresIn: '5 minutes' }), timing(30, 10))
expect('numeric string is not parsed', readOtpSendTiming({ expiresIn: '5' }), timing(30, 10))
expect('numeric string cooldown is not parsed', readOtpSendTiming({ resendCooldownSeconds: '60' }), timing(30, 10))
expect('old backend with a real number elsewhere', readOtpSendTiming({ expiresIn: '10 minutes', resendCooldownSeconds: 20 }), timing(20, 10))

// --- numbers that are not usable ---
expect('zero', readOtpSendTiming({ expiresIn: 0, resendCooldownSeconds: 0 }), timing(30, 10))
expect('negative', readOtpSendTiming({ expiresIn: -5, resendCooldownSeconds: -30 }), timing(30, 10))
expect('negative zero', readOtpSendTiming({ expiresIn: -0, resendCooldownSeconds: -0 }), timing(30, 10))
expect('NaN', readOtpSendTiming({ expiresIn: NaN, resendCooldownSeconds: NaN }), timing(30, 10))
expect('Infinity', readOtpSendTiming({ expiresIn: Infinity, resendCooldownSeconds: Infinity }), timing(30, 10))
expect('-Infinity', readOtpSendTiming({ expiresIn: -Infinity, resendCooldownSeconds: -Infinity }), timing(30, 10))
expect('one bad, one good', readOtpSendTiming({ expiresIn: NaN, resendCooldownSeconds: 45 }), timing(45, 10))
expect('other good, other bad', readOtpSendTiming({ expiresIn: 8, resendCooldownSeconds: -1 }), timing(30, 8))

// --- non-number types ---
expect('booleans', readOtpSendTiming({ expiresIn: true, resendCooldownSeconds: true }), timing(30, 10))
expect('objects', readOtpSendTiming({ expiresIn: { minutes: 5 }, resendCooldownSeconds: { seconds: 60 } }), timing(30, 10))
expect('arrays', readOtpSendTiming({ expiresIn: [5], resendCooldownSeconds: [60] }), timing(30, 10))
expect('bigint', readOtpSendTiming({ expiresIn: 5n, resendCooldownSeconds: 60n }), timing(30, 10))
expect('empty string', readOtpSendTiming({ expiresIn: '', resendCooldownSeconds: '' }), timing(30, 10))

// --- the two fields are not mixed up ---
expect('units are not swapped', readOtpSendTiming({ expiresIn: 10, resendCooldownSeconds: 30 }).cooldownSeconds, 30)
expect('expiry is the minutes field', readOtpSendTiming({ expiresIn: 3, resendCooldownSeconds: 90 }).expiresIn, 3)

// --- Retry-After: whole seconds, or an HTTP-date, and nothing else ---
const NOW = Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')
expect('retry-after: seconds', parseRetryAfter('120', NOW), 120)
expect('retry-after: padded seconds', parseRetryAfter(' 30 ', NOW), 30)
expect('retry-after: date 90 s ahead', parseRetryAfter('Wed, 21 Oct 2026 07:29:30 GMT', NOW), 90)
expect('retry-after: date rounds up', parseRetryAfter('Wed, 21 Oct 2026 07:28:01 GMT', NOW + 500), 1)
expect('retry-after: date in the past', parseRetryAfter('Wed, 21 Oct 2026 07:27:00 GMT', NOW), undefined)
expect('retry-after: date equal to now', parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', NOW), undefined)
expect('retry-after: zero', parseRetryAfter('0', NOW), undefined)
expect('retry-after: negative', parseRetryAfter('-5', NOW), undefined)
expect('retry-after: fraction', parseRetryAfter('1.5', NOW), undefined)
expect('retry-after: exponent', parseRetryAfter('1e3', NOW), undefined)
expect('retry-after: words', parseRetryAfter('soon', NOW), undefined)
expect('retry-after: empty', parseRetryAfter('', NOW), undefined)
expect('retry-after: null', parseRetryAfter(null, NOW), undefined)
expect('retry-after: undefined', parseRetryAfter(undefined, NOW), undefined)
expect('retry-after: over a day', parseRetryAfter('86401', NOW), undefined)
expect('retry-after: exactly a day', parseRetryAfter('86400', NOW), 86400)
expect('retry-after: huge digits', parseRetryAfter('99999999999999999999', NOW), undefined)
expect('retry-after: non-GMT date', parseRetryAfter('Wed, 21 Oct 2026 07:29:30 PST', NOW), undefined)
expect('retry-after: impossible date', parseRetryAfter('Wed, 99 Oct 2026 07:29:30 GMT', NOW), undefined)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} OTP send timing checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} OTP send timing checks passed`)
