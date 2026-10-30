// Shared helpers for the scripts/verify-*.mjs checks that run the REAL TypeScript in
// src/lib in memory (transpiled with the project's own `typescript`; no network, no new
// dependencies). Used by verify-pending-return.mjs and verify-public-nav.mjs; the older
// verify scripts each carry their own copy of the same loader.
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIB = path.join(ROOT, 'src', 'lib')

const cache = new Map()

/** Load src/lib/<name>.ts as CommonJS, mapping the '@/lib/x' alias onto the same loader. */
export function loadLib(name) {
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

/** `expect(name, actual, want)` records a failure; `finish(label)` prints and sets the exit code. */
export function createChecker() {
  let checks = 0
  const failures = []
  return {
    expect(name, actual, want) {
      checks++
      const a = JSON.stringify(actual)
      const w = JSON.stringify(want)
      if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
    },
    finish(label) {
      if (failures.length) {
        console.error(`\n${failures.length} of ${checks} checks FAILED:\n`)
        for (const f of failures) console.error('  ✗ ' + f + '\n')
        process.exit(1)
      }
      console.log(`✅ ${label}: ${checks} checks passed`)
    },
  }
}
