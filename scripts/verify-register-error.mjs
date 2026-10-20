#!/usr/bin/env node
/**
 * Register-error classification check — the mechanical gate for classifyRegisterError
 * in src/lib/api.ts, which the seeker password step and both employer register steps
 * branch on (duplicate email, unverified contacts, field errors).
 *
 *   node scripts/verify-register-error.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-otp-error.mjs). No network, no new dependencies.
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

const { classifyRegisterError, ApiError } = loadLib('api')

let checks = 0
const failures = []
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(actual)
  const w = JSON.stringify(want)
  if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
}

// ApiError(message, status, reason, errors, code)
const api = (message, { status = 400, errors, code } = {}) => new ApiError(message, status, undefined, errors, code)

// --- Duplicate email ---
expect('code: EMAIL_ALREADY_REGISTERED', classifyRegisterError(api('This email is already registered', { code: 'EMAIL_ALREADY_REGISTERED' })), { kind: 'emailTaken' })
expect('code wins over unrelated text', classifyRegisterError(api('Something else entirely', { code: 'EMAIL_ALREADY_REGISTERED' })), { kind: 'emailTaken' })
expect('legacy message, no code', classifyRegisterError(api('User with this email already exists')), { kind: 'emailTaken' })
expect('legacy message inside a longer sentence', classifyRegisterError(new Error('Error: User with this email already exists.')), { kind: 'emailTaken' })

// --- Field errors on the email field are NOT a duplicate: they keep their own text ---
expect(
  'email field error',
  classifyRegisterError(api('Validation failed', { errors: [{ path: 'email', message: 'Invalid email address' }] })),
  { kind: 'fields', fields: { email: ['Invalid email address'] } },
)
expect(
  'field errors win over a duplicate-email code',
  classifyRegisterError(api('Validation failed', { code: 'EMAIL_ALREADY_REGISTERED', errors: [{ path: 'email', message: 'Invalid email address' }] })),
  { kind: 'fields', fields: { email: ['Invalid email address'] } },
)

// --- Unknown codes and plain errors keep the backend message ---
expect('unknown code', classifyRegisterError(api('A message from the future', { code: 'SOMETHING_NEW' })), { kind: 'unknown', message: 'A message from the future' })
expect('plain Error', classifyRegisterError(new Error('Network down')), { kind: 'unknown', message: 'Network down' })
expect('not an Error', classifyRegisterError('boom'), { kind: 'unknown', message: '' })

// --- Neighbouring kinds must not collide with the duplicate email ---
expect('code: EMAIL_NOT_VERIFIED', classifyRegisterError(api('Email must be verified', { code: 'EMAIL_NOT_VERIFIED' })), { kind: 'emailUnverified' })
expect('code: PHONE_ALREADY_REGISTERED is the phone, not the email', classifyRegisterError(api('x', { code: 'PHONE_ALREADY_REGISTERED' })), { kind: 'phoneTaken' })
expect('legacy: phone duplicate', classifyRegisterError(api('User with this phone number already exists')), { kind: 'phoneTaken' })

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} register-error checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} register-error checks passed`)
