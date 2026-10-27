#!/usr/bin/env node
/**
 * Seeker-registration home city check — the mechanical gate for
 * src/lib/homeCityValidation.ts (State + City both required on the profile step) and
 * for how classifyRegisterError reads the BE's two city answers.
 *
 *   node scripts/verify-register-city.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-register-error.mjs). No network, no new dependencies.
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

const { homeCityProblem } = loadLib('homeCityValidation')
const { classifyRegisterError, ApiError } = loadLib('api')

let checks = 0
const failures = []
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(actual)
  const w = JSON.stringify(want)
  if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
}

const CITY = '5b0f6f0e-8c1e-4b6e-9f0a-2d6f6f6f6f6f'

// --- Both missing, and each one missing on its own ---
expect('nothing chosen', homeCityProblem(null, null), 'stateRequired')
expect('undefined state, undefined city', homeCityProblem(undefined, undefined), 'stateRequired')
expect('state chosen, no city', homeCityProblem(29, null), 'cityRequired')
expect('state 0 is a state, not "none"', homeCityProblem(0, null), 'cityRequired')
expect('empty city id counts as no city', homeCityProblem(29, ''), 'cityRequired')
expect('empty city id and no state', homeCityProblem(null, ''), 'stateRequired')

// --- A city is enough: it sits in a state, and "Use my location" gives no state code ---
expect('state and city', homeCityProblem(29, CITY), null)
expect('city from "Use my location" (no state code)', homeCityProblem(null, CITY), null)

// --- The BE's two city answers lead the user back to the field, not to a raw message ---
const api = (message, code) => new ApiError(message, 400, undefined, undefined, code)
expect('code: CITY_REQUIRED', classifyRegisterError(api('Select your city, or use your location', 'CITY_REQUIRED')), { kind: 'cityInvalid', message: 'Select your city, or use your location' })
expect('code: INVALID_CITY', classifyRegisterError(api('Unknown city', 'INVALID_CITY')), { kind: 'cityInvalid', message: 'Unknown city' })
// A schema refusal of the city arrives as a FIELD error keyed `cityId`, not as a code: the
// password step reads that key (handleRegisterFailure) to clear the city and link back.
const schemaErr = new ApiError('Validation failed', 400, undefined, [{ path: 'cityId', message: 'cityId must be an id from GET /locations/cities' }], undefined)
expect(
  'schema refusal of cityId stays a field error under `cityId`',
  classifyRegisterError(schemaErr),
  { kind: 'fields', fields: { cityId: ['cityId must be an id from GET /locations/cities'] } },
)
expect('unrelated code is unaffected', classifyRegisterError(api('x', 'PHONE_NOT_VERIFIED')), { kind: 'phoneUnverified' })

// --- The register call carries the chosen city as `cityId`, and no state field ---
const { jobSeekerAPI } = loadLib('api')
let sent = null
globalThis.fetch = async (_url, init) => {
  sent = init.body
  return new Response(JSON.stringify({ success: true, data: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
}
const base = {
  fullName: 'Asha Rao',
  password: 'x',
  phoneNumber: '+919876543210',
  preferredSector: 's',
  preferredJobTitle: 't',
  whatsappConsent: false,
  acceptTerms: true,
}
await jobSeekerAPI.register({ ...base, cityId: CITY })
expect('register sends cityId', sent?.get('cityId'), CITY)
expect('register sends no state field', [...sent.keys()].filter((k) => /state/i.test(k)), [])
await jobSeekerAPI.register({ ...base })
expect('register omits cityId when there is none', sent?.has('cityId'), false)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} register-city checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} register-city checks passed`)
