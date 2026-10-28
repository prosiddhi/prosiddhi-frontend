#!/usr/bin/env node
/**
 * Analytics address check — the mechanical gate for src/lib/analyticsPath.ts.
 *
 *   node scripts/verify-analytics-path.mjs
 *
 * Google Analytics must never receive a raw URL: no query string, no hash, no
 * record id, and never the /invite/<token> credential. Runs the REAL TypeScript
 * source (transpiled in memory with the project's own `typescript`, same approach
 * as verify-time-format.mjs). No new dependencies.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'analyticsPath.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { cleanPath, cleanReferrer } = mod.exports

const UUID = '3f1c2b7a-9d4e-4c1a-8b2f-0e5d6c7b8a91'
const CUID = 'cklq3x9z80000a1b2c3d4e5f6'
const INVITE = 'Zx9_kQ-2mP7rT4vW8yB1nC5dF0gH3jL6'

const pathCases = [
  // unchanged
  ['/', '/'],
  ['', '/'],
  ['/job-feed', '/job-feed'],
  ['/employer/jobs/new', '/employer/jobs/new'],
  ['/employer/register/company-details', '/employer/register/company-details'],
  ['/register/verify-email', '/register/verify-email'],
  // query string and hash dropped
  ['/job-feed?search=welder&cityId=' + UUID, '/job-feed'],
  ['/employer/plans?plan=ACME_CUSTOM', '/employer/plans'],
  ['/login?returnUrl=%2Finvite%2F' + INVITE, '/login'],
  ['/help#contact', '/help'],
  ['/job-details/' + UUID + '?from=feed#apply', '/job-details/:id'],
  // ids
  ['/job-details/' + UUID, '/job-details/:id'],
  ['/job-details/' + UUID.toUpperCase(), '/job-details/:id'],
  ['/employer/workers/' + UUID, '/employer/workers/:id'],
  ['/employer/candidates/' + CUID, '/employer/candidates/:id'],
  ['/employer/jobs/' + UUID + '/edit', '/employer/jobs/:id/edit'],
  ['/messages/' + CUID, '/messages/:id'],
  // the invite token, whatever its shape
  ['/invite/' + INVITE, '/invite/:id'],
  ['/invite/short', '/invite/:id'],
  ['/Invite/short', '/Invite/:id'],
  ['/INVITE/' + INVITE + '/', '/INVITE/:id/'],
  ['/invite/abc?x=1', '/invite/:id'],
  ['/invite/' + INVITE + '/', '/invite/:id/'],
  ['/invite', '/invite'],
  ['/invite/', '/invite/'],
  // a token-like segment anywhere
  ['/a/' + 'x'.repeat(20), '/a/:id'],
  ['/a/' + 'x'.repeat(19), '/a/' + 'x'.repeat(19)],
]

let total = 0
let failed = 0
function check(label, actual, expected) {
  total++
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}
    expected ${JSON.stringify(expected)}
    got      ${JSON.stringify(actual)}`)
  }
}

for (const [input, expected] of pathCases) check(`cleanPath ${JSON.stringify(input)}`, cleanPath(input), expected)

const ORIGIN = 'https://prosiddhi.com'
const referrerCases = [
  ['', ''],
  ['not a url', ''],
  ['javascript:alert(1)', ''],
  [`${ORIGIN}/invite/${INVITE}`, `${ORIGIN}/invite/:id`],
  [`${ORIGIN}/job-feed?search=cook`, `${ORIGIN}/job-feed`],
  [`${ORIGIN}/job-details/${UUID}#x`, `${ORIGIN}/job-details/:id`],
  ['https://www.google.com/search?q=prosiddhi+jobs', 'https://www.google.com/'],
  ['https://m.facebook.com/some/post/123?fbclid=abc', 'https://m.facebook.com/'],
  ['http://prosiddhi.com/job-feed', 'http://prosiddhi.com/'],
]
for (const [input, expected] of referrerCases) {
  check(`cleanReferrer ${JSON.stringify(input)}`, cleanReferrer(input, ORIGIN), expected)
}

// Nothing that leaves cleanPath may still hold a query, a hash or the invite token.
for (const [input] of pathCases) {
  const out = cleanPath(input)
  check(`no ? or # or token in ${JSON.stringify(input)}`, /[?#]/.test(out) || out.includes(INVITE), false)
}

console.log(`${total - failed}/${total} checks passed`)
process.exit(failed ? 1 : 0)
