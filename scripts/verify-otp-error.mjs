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

const { otpErrorMessage, otpCooldownSeconds, isOtpRejection, hasUnmappedCode, otpFlowErrorMessage } = loadLib('otpError')

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

// --- Code-first mapping (an ApiError-shaped error: message plus code / attemptsLeft) ---
const coded = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra })
const BE_EN = 'English text the backend might reword'
expect('code: OTP_INVALID uses attemptsLeft, not the message', otpErrorMessage(coded('OTP_INVALID', 'Invalid OTP. You have 9 attempt(s) left', { attemptsLeft: 2 }), en, FALLBACK), 'That code is wrong. Tries left: 2.')
expect('code: OTP_INVALID with attemptsLeft 0', otpErrorMessage(coded('OTP_INVALID', BE_EN, { attemptsLeft: 0 }), en, FALLBACK), 'That code is wrong. Tries left: 0.')
expect('code: OTP_INVALID works with reworded text', otpErrorMessage(coded('OTP_INVALID', BE_EN, { attemptsLeft: 4 }), en, FALLBACK), 'That code is wrong. Tries left: 4.')
expect('code: OTP_INVALID without attemptsLeft falls back to the message count', otpErrorMessage(coded('OTP_INVALID', 'Invalid OTP. You have 3 attempt(s) left'), en, FALLBACK), 'That code is wrong. Tries left: 3.')
expect('code: OTP_INVALID with a negative attemptsLeft is not trusted', otpErrorMessage(coded('OTP_INVALID', 'Invalid OTP. You have 3 attempt(s) left', { attemptsLeft: -1 }), en, FALLBACK), 'That code is wrong. Tries left: 3.')
expect('code: OTP_INVALID with NaN attemptsLeft is not trusted', otpErrorMessage(coded('OTP_INVALID', 'Invalid OTP. You have 3 attempt(s) left', { attemptsLeft: NaN }), en, FALLBACK), 'That code is wrong. Tries left: 3.')
expect('code: OTP_INVALID with a string attemptsLeft is not trusted', otpErrorMessage(coded('OTP_INVALID', BE_EN, { attemptsLeft: '2' }), en, FALLBACK), BE_EN)
expect('code: OTP_EXPIRED, reworded text', otpErrorMessage(coded('OTP_EXPIRED', BE_EN), en, FALLBACK, 5), enExpired('5 minutes'))
expect('code: OTP_EXPIRED default expiry', otpErrorMessage(coded('OTP_EXPIRED', BE_EN), en, FALLBACK), enExpired('10 minutes'))
expect('code: OTP_TOO_MANY_ATTEMPTS', otpErrorMessage(coded('OTP_TOO_MANY_ATTEMPTS', BE_EN), en, FALLBACK), 'Too many wrong tries. Please ask for a new code.')
expect('code: OTP_NOT_FOUND', otpErrorMessage(coded('OTP_NOT_FOUND', BE_EN), en, FALLBACK), 'No code was sent yet. Please ask for a new code.')
expect('code: OTP_COOLDOWN with seconds', otpErrorMessage(coded('OTP_COOLDOWN', 'Please wait 12s before requesting another OTP'), en, FALLBACK), 'Please wait 12 seconds before asking for another code.')
expect('code: OTP_COOLDOWN without readable seconds keeps the message', otpErrorMessage(coded('OTP_COOLDOWN', BE_EN), en, FALLBACK), BE_EN)
expect('code: OTP_ALREADY_VERIFIED', otpErrorMessage(coded('OTP_ALREADY_VERIFIED', 'This OTP has already been verified'), en, FALLBACK), 'This code has already been used. If you need to try again, ask for a new code.')
expect('code: OTP_NOT_VERIFIED', otpErrorMessage(coded('OTP_NOT_VERIFIED', 'Please verify the code first'), en, FALLBACK), 'Your code was not verified. Please enter the code again.')
expect('code: PHONE_ALREADY_REGISTERED', otpErrorMessage(coded('PHONE_ALREADY_REGISTERED', 'This phone number is already registered'), en, FALLBACK), 'Another account already uses this phone number.')
expect('code: EMAIL_ALREADY_REGISTERED', otpErrorMessage(coded('EMAIL_ALREADY_REGISTERED', 'This email is already registered'), en, FALLBACK), 'Another account already uses this email address.')
expect('code: RATE_LIMITED', otpErrorMessage(coded('RATE_LIMITED', 'Too many OTP requests, please try again after 15 minutes.'), en, FALLBACK), 'Too many tries. Please wait a while and try again.')

// --- Unknown codes, other errors and the message fallback ---
expect('unknown code keeps the backend message', otpErrorMessage(coded('SOMETHING_NEW', 'A message from the future'), en, FALLBACK), 'A message from the future')
expect('unknown code with a known legacy message still maps', otpErrorMessage(coded('SOMETHING_NEW', 'No OTP request found for this phone number'), en, FALLBACK), 'No code was sent yet. Please ask for a new code.')
expect('unknown code, empty message, uses the fallback key', otpErrorMessage(coded('SOMETHING_NEW', ''), en, FALLBACK), FALLBACK)
expect('login: a password failure with no code is not turned into an OTP message', otpErrorMessage(coded(undefined, 'Invalid credentials'), en, FALLBACK), 'Invalid credentials')
expect('login: a suspended account keeps its message', otpErrorMessage(coded(undefined, 'Your account has been suspended'), en, FALLBACK), 'Your account has been suspended')
expect('login: ADMIN_ACCOUNT is not an OTP code', otpErrorMessage(coded('ADMIN_ACCOUNT', 'Admin accounts sign in through the admin console.'), en, FALLBACK), 'Admin accounts sign in through the admin console.')
expect('non-string code is ignored', otpErrorMessage(coded(42, 'Invalid OTP. You have 1 attempt(s) left'), en, FALLBACK), 'That code is wrong. Tries left: 1.')
expect('plain object (not an Error) uses the fallback key', otpErrorMessage({ code: 'OTP_EXPIRED', message: 'x' }, en, FALLBACK), FALLBACK)

// --- Cooldown seconds: one helper for every resend countdown ---
expect('cooldown: structured', otpCooldownSeconds(coded('OTP_COOLDOWN', 'Please wait 27s before requesting another OTP')), 27)
expect('cooldown: legacy message, no code', otpCooldownSeconds(new Error('Please wait 5s before requesting another OTP')), 5)
expect('cooldown: one second', otpCooldownSeconds(coded('OTP_COOLDOWN', 'Please wait 1s before requesting another OTP')), 1)
expect('cooldown: zero seconds is not a countdown', otpCooldownSeconds(coded('OTP_COOLDOWN', 'Please wait 0s before requesting another OTP')), null)
expect('cooldown: code without readable seconds', otpCooldownSeconds(coded('OTP_COOLDOWN', BE_EN)), null)
expect('cooldown: another code, same words, is not a cooldown', otpCooldownSeconds(coded('RATE_LIMITED', 'Please wait 9s before requesting another OTP')), null)
expect('cooldown: OTP_EXPIRED is not a cooldown', otpCooldownSeconds(coded('OTP_EXPIRED', 'OTP has expired. Please request a new one')), null)
expect('cooldown: unrelated error', otpCooldownSeconds(new Error('Invalid credentials')), null)
expect('cooldown: not an Error', otpCooldownSeconds('Please wait 5s before requesting another OTP'), null)
expect('cooldown: undefined', otpCooldownSeconds(undefined), null)
expect('cooldown: seconds too large for an integer', otpCooldownSeconds(new Error('Please wait 99999999999999999999s before requesting another OTP')), null)

// --- isOtpRejection: when a failed code check should empty the boxes ---
for (const code of ['OTP_INVALID', 'OTP_EXPIRED', 'OTP_TOO_MANY_ATTEMPTS', 'OTP_NOT_FOUND', 'OTP_ALREADY_VERIFIED', 'OTP_NOT_VERIFIED']) {
  expect(`rejection: ${code}`, isOtpRejection(coded(code, BE_EN)), true)
}
// OTP_NOT_VERIFIED is known to the code-first path only: a message alone does not make a rejection.
expect('not a rejection: OTP_NOT_VERIFIED wording without a code', isOtpRejection(new Error('Please verify the code first')), false)
// Not rejections of the code: a send refusal, limits, duplicates, server and account errors.
for (const code of ['OTP_COOLDOWN', 'RATE_LIMITED', 'PHONE_ALREADY_REGISTERED', 'EMAIL_ALREADY_REGISTERED', 'INTERNAL_ERROR', 'ADMIN_ACCOUNT', 'SOMETHING_NEW']) {
  expect(`not a rejection: ${code}`, isOtpRejection(coded(code, 'Invalid OTP. You have 3 attempt(s) left')), false)
}
// A code decides even when the message looks like a rejection; no code falls back to the old wording.
expect('rejection: legacy invalid', isOtpRejection(new Error('Invalid OTP. You have 3 attempt(s) left')), true)
expect('rejection: legacy expired', isOtpRejection(new Error('OTP has expired. Please request a new one')), true)
expect('rejection: legacy too many', isOtpRejection(new Error('Maximum OTP verification attempts exceeded. Please request a new OTP')), true)
expect('rejection: legacy none pending (phone)', isOtpRejection(new Error('No OTP request found for this phone number')), true)
expect('rejection: legacy none pending (email)', isOtpRejection(new Error('No OTP request found for this email and purpose')), true)
expect('rejection: legacy already verified (email)', isOtpRejection(new Error('This OTP has already been verified')), true)
expect('rejection: legacy already verified (phone)', isOtpRejection(new Error('This phone number is already verified')), true)
expect('not a rejection: legacy cooldown', isOtpRejection(new Error('Please wait 12s before requesting another OTP')), false)
expect('not a rejection: duplicate contact', isOtpRejection(new Error('Phone number already in use by another account')), false)
expect('not a rejection: wrong password', isOtpRejection(new Error('Current password is incorrect')), false)
expect('not a rejection: network', isOtpRejection(new Error("Can't reach the server. Check your connection and try again.")), false)
expect('not a rejection: 429 text without a code', isOtpRejection(new Error('Too many OTP requests, please try again after 15 minutes.')), false)
expect('not a rejection: not an Error', isOtpRejection({ code: 'OTP_INVALID' }), false)
expect('not a rejection: undefined', isOtpRejection(undefined), false)

// --- The four new keys, in every language ---
const NEW_KEYS = ['alreadyVerified', 'phoneTaken', 'emailTaken', 'rateLimited', 'notVerified']
const enAuth = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', 'en', 'auth.json'), 'utf8'))
for (const lng of LANGUAGES) {
  const auth = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', lng, 'auth.json'), 'utf8'))
  for (const key of NEW_KEYS) {
    const value = auth.otpErrors[key]
    check(`${lng}: otpErrors.${key} exists`, typeof value === 'string' && value.trim().length > 0)
    check(`${lng}: otpErrors.${key} has no placeholder`, typeof value === 'string' && !value.includes('{{'), JSON.stringify(value))
    if (lng !== 'en') check(`${lng}: otpErrors.${key} is translated`, value !== enAuth.otpErrors[key], JSON.stringify(value))
  }
  const t = await translatorFor(lng)
  const samples = [
    otpErrorMessage(coded('OTP_ALREADY_VERIFIED', BE_EN), t, FALLBACK),
    otpErrorMessage(coded('PHONE_ALREADY_REGISTERED', BE_EN), t, FALLBACK),
    otpErrorMessage(coded('EMAIL_ALREADY_REGISTERED', BE_EN), t, FALLBACK),
    otpErrorMessage(coded('RATE_LIMITED', BE_EN), t, FALLBACK),
    otpErrorMessage(coded('OTP_NOT_VERIFIED', BE_EN), t, FALLBACK),
  ]
  check(`${lng}: the five code messages come from the locale, all different`, samples.every((s) => s !== BE_EN && s !== FALLBACK) && new Set(samples).size === 5, JSON.stringify(samples))
  const wrong = otpErrorMessage(coded('OTP_INVALID', BE_EN, { attemptsLeft: 3 }), t, FALLBACK)
  check(`${lng}: OTP_INVALID shows the structured attemptsLeft`, wrong.includes('3') && !wrong.includes('{{'), wrong)
  const wait = otpErrorMessage(coded('OTP_COOLDOWN', 'Please wait 12s before requesting another OTP'), t, FALLBACK)
  check(`${lng}: OTP_COOLDOWN shows the seconds`, wait.includes('12') && !wait.includes('{{'), wait)
}

// --- hasUnmappedCode: a backend code with no locale string (login screens show their fallback) ---
for (const code of ['OTP_INVALID', 'OTP_EXPIRED', 'OTP_TOO_MANY_ATTEMPTS', 'OTP_NOT_FOUND', 'OTP_ALREADY_VERIFIED', 'OTP_NOT_VERIFIED', 'OTP_COOLDOWN', 'PHONE_ALREADY_REGISTERED', 'EMAIL_ALREADY_REGISTERED', 'RATE_LIMITED']) {
  expect(`mapped code: ${code}`, hasUnmappedCode(coded(code, BE_EN)), false)
}
for (const code of ['INTERNAL_ERROR', 'ACCOUNT_SUSPENDED', 'INVALID_PHONE', 'SOMETHING_NEW']) {
  expect(`unmapped code: ${code}`, hasUnmappedCode(coded(code, BE_EN)), true)
}
expect('unmapped: no code is not a match', hasUnmappedCode(coded(undefined, 'Invalid credentials')), false)
expect('unmapped: network failure (no code) is not a match', hasUnmappedCode(new TypeError('Failed to fetch')), false)
expect('unmapped: non-string code is ignored', hasUnmappedCode(coded(42, BE_EN)), false)
expect('unmapped: not an Error', hasUnmappedCode({ code: 'INTERNAL_ERROR' }), false)
expect('unmapped: ADMIN_ACCOUNT (handled by the login page before this)', hasUnmappedCode(coded('ADMIN_ACCOUNT', BE_EN)), true)

// --- otpFlowErrorMessage: the Change Email / Change Phone modals (an unmapped code gets the stage's fallback) ---
expect('flow: unmapped code uses the fallback key, not the backend text', otpFlowErrorMessage(coded('INTERNAL_ERROR', BE_EN), en, FALLBACK), FALLBACK)
expect('flow: unmapped code uses the key it was given (send vs verify)', otpFlowErrorMessage(coded('SOMETHING_NEW', BE_EN), en, 'other.key'), 'other.key')
expect('flow: OTP_INVALID keeps its message', otpFlowErrorMessage(coded('OTP_INVALID', BE_EN, { attemptsLeft: 2 }), en, FALLBACK), 'That code is wrong. Tries left: 2.')
expect('flow: OTP_EXPIRED keeps its message, with expiresIn', otpFlowErrorMessage(coded('OTP_EXPIRED', BE_EN), en, FALLBACK, 5), enExpired('5 minutes'))
expect('flow: RATE_LIMITED keeps its message', otpFlowErrorMessage(coded('RATE_LIMITED', BE_EN), en, FALLBACK), 'Too many tries. Please wait a while and try again.')
expect('flow: EMAIL_ALREADY_REGISTERED keeps its message', otpFlowErrorMessage(coded('EMAIL_ALREADY_REGISTERED', BE_EN), en, FALLBACK), 'Another account already uses this email address.')
expect('flow: PHONE_ALREADY_REGISTERED keeps its message', otpFlowErrorMessage(coded('PHONE_ALREADY_REGISTERED', BE_EN), en, FALLBACK), 'Another account already uses this phone number.')
expect('flow: OTP_COOLDOWN keeps its seconds', otpFlowErrorMessage(coded('OTP_COOLDOWN', 'Please wait 12s before requesting another OTP'), en, FALLBACK), 'Please wait 12 seconds before asking for another code.')
expect('flow: an uncoded error keeps its message', otpFlowErrorMessage(new Error('Something specific'), en, FALLBACK), 'Something specific')
expect('flow: the network error (uncoded) keeps its message', otpFlowErrorMessage(new Error("Can't reach the server. Check your connection and try again."), en, FALLBACK), "Can't reach the server. Check your connection and try again.")
expect('flow: an uncoded legacy OTP message still maps', otpFlowErrorMessage(new Error('No OTP request found for this phone number'), en, FALLBACK), 'No code was sent yet. Please ask for a new code.')
expect('flow: an uncoded error with an empty message uses the fallback', otpFlowErrorMessage(new Error(''), en, FALLBACK), FALLBACK)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} OTP error-message checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} OTP error-message checks passed`)
