#!/usr/bin/env node
/**
 * Check for src/lib/contactChange.ts: what the Change Email / Change Phone modals run after the
 * server has CONFIRMED the change.
 *
 *   node scripts/verify-contact-change.mjs
 *
 * ⚠️ Covers the helper only, NOT the React modals. That the modals call it after the change
 * request, outside the catch that reports a failed verification, is checked by reading
 * EmailVerifyModal.tsx / PhoneVerifyModal.tsx, not by this script.
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own `typescript`.
 * Exit code 0 = clean, 1 = at least one failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'contactChange.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { refreshAfterContactChange } = mod.exports

let checks = 0
const failures = []
async function expect(name, run, want) {
  checks++
  let got
  try {
    got = { resolved: await run() }
  } catch (err) {
    got = { threw: String(err) }
  }
  if (JSON.stringify(got) !== JSON.stringify({ resolved: want })) failures.push(`${name}\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify({ resolved: want })}`)
}

let calls = 0
await expect('a refresh that works returns true and runs once', async () => refreshAfterContactChange(async () => { calls++ }), true)
checks++
if (calls !== 1) failures.push(`the refresh should run exactly once, ran ${calls}`)

await expect('a sync refresh works', async () => refreshAfterContactChange(() => {}), true)
await expect('an async refresh that rejects does not throw', async () => refreshAfterContactChange(async () => { throw new Error('Failed to fetch') }), false)
await expect('a sync refresh that throws does not throw', async () => refreshAfterContactChange(() => { throw new Error('boom') }), false)
await expect('a rejection with a non-Error value does not throw', async () => refreshAfterContactChange(() => Promise.reject('x')), false)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} contact-change checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} contact-change checks passed`)
