#!/usr/bin/env node
/**
 * Email validation check — the mechanical gate for src/lib/email.ts.
 *
 *   node scripts/verify-email.mjs
 *
 * Runs the REAL TypeScript source (not a copy): it is transpiled in memory with
 * the project's own `typescript` and loaded so `zod` resolves from node_modules.
 * No new dependencies, and it works on Node 20 (which cannot import .ts directly).
 *
 * Covers the pure validator (`checkEmail`) and the `toIdentifier` wrapper only.
 * It says nothing about the forms that call them — those need the manual checks.
 *
 * The expectations mirror the backend's zod `.email()` (zod 4.1.12) as audited
 * on 2026-10-16. If a future zod upgrade changes an answer, this fails on purpose.
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

const { checkEmail, EMAIL_MAX_LENGTH } = loadLib('email')
const { toIdentifier } = loadLib('identifier')

const failures = []
let checks = 0

function expect(label, actual, expected) {
  checks++
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) failures.push(`${label}\n    expected ${e}\n    got      ${a}`)
}

const ok = (value) => ({ ok: true, value })
const bad = (reason) => ({ ok: false, reason })

// --- constant ---
expect('EMAIL_MAX_LENGTH', EMAIL_MAX_LENGTH, 254)

// --- valid, and normalised ---
for (const e of ['user@example.com', 'first.last@example.co.in', 'user+jobs@example.com', 'user123@sub.example.org', "o'brien@example.com", 'a@b.co']) {
  expect(`valid ${e}`, checkEmail(e), ok(e))
}
expect('trims spaces', checkEmail('  user@example.com  '), ok('user@example.com'))
expect('trims tab/newline', checkEmail('\tUser@Example.Com\n'), ok('user@example.com'))
expect('lowercases', checkEmail('USER@EXAMPLE.COM'), ok('user@example.com'))
expect('punycode domain is accepted', checkEmail('user@xn--bcher-kva.de'), ok('user@xn--bcher-kva.de'))

// --- blank ---
expect('empty', checkEmail(''), bad('empty'))
expect('whitespace only', checkEmail('   '), bad('empty'))

// --- malformed ---
const invalid = [
  'userexample.com',         // no @
  'user@',                   // no domain
  '@example.com',            // no local part
  'user@@example.com',       // repeated @
  'a@b@example.com',
  'user..name@example.com',  // consecutive dots
  '.user@example.com',
  'user.@example.com',
  'user@example..com',
  'user@.com',
  'user@example.com.',       // trailing dot
  'user@example',            // no TLD
  'user@example.c',          // one-letter TLD
  'user@example.123',        // numeric TLD
  'user@-example.com',       // leading hyphen
  'user@exa_mple.com',       // underscore in domain
  'user@exa mple.com',       // space in domain
  'a b@example.com',         // space in local part
  'a%b@example.com',
  'a!b@example.com',
]
for (const e of invalid) expect(`invalid ${JSON.stringify(e)}`, checkEmail(e), bad('invalid'))

// --- non-ASCII: the backend's zod rejects it, so the portal does too ---
expect('non-ASCII local part', checkEmail('üser@example.com'), bad('invalid'))
expect('non-ASCII domain', checkEmail('user@bücher.de'), bad('invalid'))

// --- length boundary: 254 passes, 255 does not (zod has no cap of its own) ---
const atLength = (n) => 'x'.repeat(n - '@example.com'.length) + '@example.com'
expect('254 characters', checkEmail(atLength(254)), ok(atLength(254)))
expect('255 characters', checkEmail(atLength(255)), bad('tooLong'))
expect('custom max: 200 passes', checkEmail(atLength(200), 200), ok(atLength(200)))
expect('custom max: 201 fails', checkEmail(atLength(201), 200), bad('tooLong'))
expect('length is measured after trimming', checkEmail(`  ${atLength(254)}  `), ok(atLength(254)))

// --- toIdentifier: email branch uses the shared rule ---
expect('identifier: email', toIdentifier('  A@B.com '), 'a@b.com')
expect('identifier: email, upper', toIdentifier('Boss@Acme.IN'), 'boss@acme.in')
expect('identifier: half-typed email', toIdentifier('boss@acme'), null)
expect('identifier: consecutive dots', toIdentifier('a..b@acme.com'), null)
expect('identifier: 255 chars', toIdentifier(atLength(255)), null)

// --- toIdentifier: phone path unchanged ---
expect('identifier: 10-digit mobile', toIdentifier('9876543210'), '+919876543210')
expect('identifier: +91 mobile', toIdentifier('+919876543210'), '+919876543210')
expect('identifier: 0-prefixed mobile', toIdentifier('09876543210'), '+919876543210')
expect('identifier: too short', toIdentifier('98765'), null)
expect('identifier: wrong first digit', toIdentifier('1234567890'), null)
expect('identifier: spaces are not stripped', toIdentifier('98765 43210'), null)
expect('identifier: letters', toIdentifier('abc'), null)
expect('identifier: empty', toIdentifier(''), null)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} email checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} email checks passed`)
