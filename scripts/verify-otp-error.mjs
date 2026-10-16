#!/usr/bin/env node
/**
 * OTP error-message check — the mechanical gate for src/lib/otpError.ts and the
 * auth:otpErrors.expired_one / expired_other strings in all ten locales.
 *
 *   node scripts/verify-otp-error.mjs
 *
 * Runs the REAL TypeScript source (transpiled in memory with the project's own
 * `typescript`, same approach as verify-email.mjs) and the REAL locale files through
 * the project's own `i18next`. No new dependencies.
 *
 * The expectations are written out by hand for English (exact sentences, singular and
 * plural) and, for the other nine languages, checked structurally: the number appears,
 * no {{token}} is left unfilled, and 1 minute reads differently from 10.
 * It cannot tell whether a translation is good; that needs a native speaker.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import i18next from 'i18next'

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

const { otpErrorMessage } = loadLib('otpError')

const LANGUAGES = ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']

const failures = []
let checks = 0

function expect(label, actual, expected) {
  checks++
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) failures.push(`${label}\n    expected ${e}\n    got      ${a}`)
}

function check(label, condition, detail) {
  checks++
  if (!condition) failures.push(`${label}${detail ? `\n    ${detail}` : ''}`)
}

/** One i18next instance per language, with only that language's auth namespace loaded. */
async function translatorFor(lng) {
  const instance = i18next.createInstance()
  const auth = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', lng, 'auth.json'), 'utf8'))
  await instance.init({
    lng,
    fallbackLng: false,
    ns: ['auth'],
    defaultNS: 'auth',
    resources: { [lng]: { auth } },
    interpolation: { escapeValue: false },
    initImmediate: false,
  })
  return instance.t.bind(instance)
}

const expired = new Error('OTP has expired. Please request a new one')
const FALLBACK = 'fallback.key'

// --- English: exact sentences ---
const en = await translatorFor('en')
const enExpired = (minutes) => `This code has expired (codes last ${minutes}) Please ask for a new code.`.replace(') Please', '). Please')
expect('en: default is 10 minutes', otpErrorMessage(expired, en, FALLBACK), enExpired('10 minutes'))
expect('en: 10', otpErrorMessage(expired, en, FALLBACK, 10), enExpired('10 minutes'))
expect('en: 5', otpErrorMessage(expired, en, FALLBACK, 5), enExpired('5 minutes'))
expect('en: 1 is singular', otpErrorMessage(expired, en, FALLBACK, 1), enExpired('1 minute'))
expect('en: 2 is plural', otpErrorMessage(expired, en, FALLBACK, 2), enExpired('2 minutes'))
// Anything that is not a positive finite number gives the default, never garbage.
expect('en: old string "10 minutes" is not parsed', otpErrorMessage(expired, en, FALLBACK, '10 minutes'), enExpired('10 minutes'))
expect('en: string "5" is not parsed', otpErrorMessage(expired, en, FALLBACK, '5'), enExpired('10 minutes'))
expect('en: zero', otpErrorMessage(expired, en, FALLBACK, 0), enExpired('10 minutes'))
expect('en: negative', otpErrorMessage(expired, en, FALLBACK, -3), enExpired('10 minutes'))
expect('en: NaN', otpErrorMessage(expired, en, FALLBACK, NaN), enExpired('10 minutes'))
expect('en: Infinity', otpErrorMessage(expired, en, FALLBACK, Infinity), enExpired('10 minutes'))
expect('en: undefined', otpErrorMessage(expired, en, FALLBACK, undefined), enExpired('10 minutes'))

// --- Other errors are unaffected by the new argument ---
expect('en: wrong code with attempts', otpErrorMessage(new Error('Invalid OTP. You have 3 attempt(s) left'), en, FALLBACK, 5), 'That code is wrong. Tries left: 3.')
expect('en: too many attempts', otpErrorMessage(new Error('Maximum OTP verification attempts exceeded. Please request a new OTP'), en, FALLBACK, 5), 'Too many wrong tries. Please ask for a new code.')
expect('en: no code requested', otpErrorMessage(new Error('No OTP request found for this phone number'), en, FALLBACK, 5), 'No code was sent yet. Please ask for a new code.')
expect('en: cooldown', otpErrorMessage(new Error('Please wait 12s before requesting another OTP'), en, FALLBACK, 5), 'Please wait 12 seconds before asking for another code.')
expect('en: unknown server message passes through', otpErrorMessage(new Error('This phone number is already registered'), en, FALLBACK, 5), 'This phone number is already registered')
expect('en: non-Error uses the fallback key', otpErrorMessage('boom', en, FALLBACK, 5), FALLBACK)

// --- Every language: the number is filled in and nothing is left unresolved ---
for (const lng of LANGUAGES) {
  const t = await translatorFor(lng)
  const auth = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', lng, 'auth.json'), 'utf8'))
  const { expired_one: one, expired_other: other, expired: legacy } = auth.otpErrors
  check(`${lng}: expired_one and expired_other exist`, typeof one === 'string' && typeof other === 'string')
  check(`${lng}: old single "expired" key is gone`, legacy === undefined)
  check(`${lng}: expired_one has one {{expiresIn}}`, one.split('{{expiresIn}}').length === 2, JSON.stringify(one))
  check(`${lng}: expired_other has one {{expiresIn}}`, other.split('{{expiresIn}}').length === 2, JSON.stringify(other))
  check(`${lng}: no hardcoded 10 left in the sentence`, !/\b10\b/.test(one) && !/\b10\b/.test(other))

  const m10 = otpErrorMessage(expired, t, FALLBACK)
  const m1 = otpErrorMessage(expired, t, FALLBACK, 1)
  const m5 = otpErrorMessage(expired, t, FALLBACK, 5)
  check(`${lng}: default shows 10`, m10.includes('10') && !m10.includes('{{'), m10)
  check(`${lng}: 1 shows 1`, m1.includes('1') && !m1.includes('{{'), m1)
  check(`${lng}: 5 shows 5`, m5.includes('5') && !m5.includes('{{'), m5)
  check(`${lng}: 5 differs from the default`, m5 !== m10)
  check(`${lng}: not the fallback key`, m10 !== FALLBACK && m1 !== FALLBACK)
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} OTP error-message checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} OTP error-message checks passed`)
