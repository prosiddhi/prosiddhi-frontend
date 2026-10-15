#!/usr/bin/env node
/**
 * Job form validation check — the boundary gate for src/lib/validation/jobSchema.ts.
 *
 *   node scripts/verify-job-schema.mjs
 *
 * Runs the REAL TypeScript source (transpiled in memory with the project's own
 * `typescript`, same approach as verify-email.mjs). No new dependencies.
 *
 * The limits asserted here are the ones in prosiddhi-backend/src/validators/job.validator.ts
 * (audited 2026-10-16). If the backend changes a limit, this should be updated with it.
 * It covers the schema only - not the form that uses it.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'validation', 'jobSchema.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { jobFormSchema, parseSkills } = mod.exports

const V = 'employer:jobForm.validation.'
const VALID = {
  title: 'Cook needed',
  companyName: '',
  category: 'Hospitality',
  sector: '',
  jobTitle: '',
  description: 'x'.repeat(50),
  requirements: '',
  skills: '',
  location: 'Pune',
  salaryMin: '',
  salaryMax: '',
  paymentType: 'MONTHLY',
  jobType: 'FULL_TIME',
  urgencyLevel: 'MEDIUM',
  numberOfPositions: '1',
}

const failures = []
let checks = 0

/** The first message the schema reports for `field` when `over` is applied to a valid form. */
function messageFor(field, over) {
  const r = jobFormSchema.safeParse({ ...VALID, ...over })
  if (r.success) return null
  return r.error.issues.find((i) => i.path[0] === field)?.message ?? null
}

function expect(label, actual, expected) {
  checks++
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}\n    expected ${JSON.stringify(expected)}\n    got      ${JSON.stringify(actual)}`)
  }
}

expect('a valid form passes', jobFormSchema.safeParse(VALID).success, true)
expect('a fully filled form passes', jobFormSchema.safeParse({
  ...VALID, companyName: 'Acme', sector: 'S', jobTitle: 'J', requirements: 'r', skills: 'a, b',
  salaryMin: '10000', salaryMax: '20000', numberOfPositions: '5',
}).success, true)

// title 5..200
expect('title 4', messageFor('title', { title: 'abcd' }), V + 'titleMin')
expect('title 5', messageFor('title', { title: 'abcde' }), null)
expect('title 200', messageFor('title', { title: 'x'.repeat(200) }), null)
expect('title 201', messageFor('title', { title: 'x'.repeat(201) }), V + 'titleMax')
expect('title is measured trimmed', messageFor('title', { title: '  abcd  ' }), V + 'titleMin')

// category 2..100
expect('category empty', messageFor('category', { category: '' }), V + 'categoryRequired')
expect('category 1', messageFor('category', { category: 'x' }), V + 'categoryRequired')
expect('category 100', messageFor('category', { category: 'x'.repeat(100) }), null)
expect('category 101', messageFor('category', { category: 'x'.repeat(101) }), V + 'categoryMax')

// description 50..5000
expect('description 49', messageFor('description', { description: 'x'.repeat(49) }), V + 'descriptionMin')
expect('description 50', messageFor('description', { description: 'x'.repeat(50) }), null)
expect('description 5000', messageFor('description', { description: 'x'.repeat(5000) }), null)
expect('description 5001', messageFor('description', { description: 'x'.repeat(5001) }), V + 'descriptionMax')

// location 3..255
expect('location 2', messageFor('location', { location: 'ab' }), V + 'locationRequired')
expect('location 3', messageFor('location', { location: 'abc' }), null)
expect('location 255', messageFor('location', { location: 'x'.repeat(255) }), null)
expect('location 256', messageFor('location', { location: 'x'.repeat(256) }), V + 'locationMax')

// optional text
expect('company 200', messageFor('companyName', { companyName: 'x'.repeat(200) }), null)
expect('company 201', messageFor('companyName', { companyName: 'x'.repeat(201) }), V + 'companyMax')
expect('requirements 3000', messageFor('requirements', { requirements: 'x'.repeat(3000) }), null)
expect('requirements 3001', messageFor('requirements', { requirements: 'x'.repeat(3001) }), V + 'requirementsMax')

// skills <= 20 items
const skills = (n) => Array.from({ length: n }, (_, i) => `s${i}`).join(', ')
expect('skills 20', messageFor('skills', { skills: skills(20) }), null)
expect('skills 21', messageFor('skills', { skills: skills(21) }), V + 'skillsMax')
expect('skills ignore blanks', messageFor('skills', { skills: skills(20) + ', , ,' }), null)
expect('parseSkills', parseSkills(' a, ,b ,'), ['a', 'b'])

// job type
expect('job type empty', messageFor('jobType', { jobType: '' }), V + 'jobTypeRequired')
expect('job type unknown', messageFor('jobType', { jobType: 'FREELANCE' }), V + 'jobTypeRequired')
expect('job type ok', messageFor('jobType', { jobType: 'INTERNSHIP' }), null)

// salary: blank ok, >= 0, max >= min
expect('salary blank', messageFor('salaryMin', { salaryMin: '' }), null)
expect('salary 0', messageFor('salaryMin', { salaryMin: '0' }), null)
expect('salary -1', messageFor('salaryMin', { salaryMin: '-1' }), V + 'salaryInvalid')
expect('salary max -1', messageFor('salaryMax', { salaryMax: '-1' }), V + 'salaryInvalid')
expect('salary not a number', messageFor('salaryMin', { salaryMin: 'abc' }), V + 'salaryInvalid')
expect('salary decimal', messageFor('salaryMin', { salaryMin: '1500.50' }), null)
expect('range: max < min is on salaryMax', messageFor('salaryMax', { salaryMin: '200', salaryMax: '100' }), V + 'salaryRange')
expect('range: nothing on salaryMin', messageFor('salaryMin', { salaryMin: '200', salaryMax: '100' }), null)
expect('range: equal ok', messageFor('salaryMax', { salaryMin: '100', salaryMax: '100' }), null)
expect('range: only min', messageFor('salaryMax', { salaryMin: '100' }), null)
expect('range: only max', messageFor('salaryMax', { salaryMax: '100' }), null)
expect('range: min 0', messageFor('salaryMax', { salaryMin: '0', salaryMax: '5' }), null)

// positions: blank ok, integer 1..1000
expect('positions blank', messageFor('numberOfPositions', { numberOfPositions: '' }), null)
expect('positions 0', messageFor('numberOfPositions', { numberOfPositions: '0' }), V + 'positionsRange')
expect('positions 1', messageFor('numberOfPositions', { numberOfPositions: '1' }), null)
expect('positions 1000', messageFor('numberOfPositions', { numberOfPositions: '1000' }), null)
expect('positions 1001', messageFor('numberOfPositions', { numberOfPositions: '1001' }), V + 'positionsRange')
expect('positions 1.5', messageFor('numberOfPositions', { numberOfPositions: '1.5' }), V + 'positionsRange')
expect('positions -2', messageFor('numberOfPositions', { numberOfPositions: '-2' }), V + 'positionsRange')

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} job schema checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${checks} job schema checks passed`)
