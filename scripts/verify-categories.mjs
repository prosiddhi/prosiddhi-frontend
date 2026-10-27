#!/usr/bin/env node
/**
 * Category translation check — the gate for the landing page's category tiles.
 *
 *   node scripts/verify-categories.mjs
 *
 * Checks, for the category list the product intends to ship (EXPECTED below):
 *   1. every name has a `seeker:landing.categories.<key>` entry in all 10 locales;
 *   2. the English entry is the exact English name, and no other locale left it
 *      untranslated or empty;
 *   3. the REAL `categoryLabel` helper resolves each name to that entry, and falls
 *      back to the English name for one it has no key for;
 *   4. every name has exactly one tile icon: a picture in CATEGORY_ICONS that exists
 *      on disk, or a Lucide icon in CATEGORY_LUCIDE_ICONS. The briefcase is only the
 *      runtime fallback for a name the backend adds later — it is never relied on
 *      for one of the 19.
 *
 * ⚠️ What this does NOT do: it does not call the API. GET /categories sends names
 * only — no stable id or code — so this checks the list we EXPECT, not what the
 * backend serves. If the backend list drifts (a rename, an addition), this still
 * passes and the tile quietly shows English. The lasting fix is a backend one: an
 * immutable `code` per category. Keep EXPECTED in step with the backend seed
 * (prosiddhi-backend/prisma/seed.ts) until then.
 *
 * Runs the real TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-job-schema.mjs). No new dependencies.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES = ['en', 'hi', 'ta', 'kn', 'ml', 'mr', 'gu', 'or', 'te', 'bn']

/** The 19 categories the Employee Portal landing page is meant to show (2026-10-27). */
const EXPECTED = [
  'Construction & Infrastructure',
  'Manufacturing, Industrial & MSMEs',
  'Retail, Wholesale & Local Commerce',
  'Logistics, Transport & Supply Chain',
  'Hospitality, Hotels, Restaurants & Catering',
  'Sales, Field Marketing & Business Development',
  'Office Administration, Accounting, Legal & Back-Office Support',
  'Facility Management & Security Services',
  'Automobile Repair & Technical Services',
  'Wellness, Personal Grooming, Salon & Beauty',
  'Healthcare Support, Paramedical & Pharmacy',
  'Educational Institutions (Non-Teaching & Support Staff)',
  'Consumer Electronics & Appliance Servicing',
  'Handicrafts, Handloom & Artisan Crafts',
  'Telecom Operations & Infrastructure (Non-White Collar)',
  'IT & BPO Support Services (Non-White Collar)',
  'Renewable Energy & Clean Tech (Solar & Wind)',
  'Power & Energy Distribution (Conventional Utilities)',
  'Aviation & Aerospace Ground Operations',
]

function loadTs(rel) {
  const file = path.join(ROOT, rel)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const mod = new Module(file)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  mod.require = createRequire(file)
  mod._compile(outputText, file)
  return mod.exports
}

const { categoryLabel, categoryLabelKey } = loadTs('src/lib/categoryLabel.ts')
const { CATEGORY_ICONS, CATEGORY_LUCIDE_ICONS } = loadTs('src/lib/categoryIcons.ts')

const failures = []
const fail = (msg) => failures.push(msg)

// Same shape as i18next's `t` for the one call categoryLabel makes.
const fakeT = (dict) => (key, opts) => dict[key] ?? opts?.defaultValue ?? key

const landing = {}
const tByLocale = {}
for (const lang of LOCALES) {
  const file = path.join(ROOT, 'src', 'locales', lang, 'seeker.json')
  landing[lang] = JSON.parse(fs.readFileSync(file, 'utf8')).landing?.categories ?? {}
  // This locale's `t`, built once and reused for every name below.
  tByLocale[lang] = fakeT(
    Object.fromEntries(Object.entries(landing[lang]).map(([k, v]) => [`seeker:landing.categories.${k}`, v]))
  )
}

// 1. Keys derived from the names must not collide with each other.
const keyOwner = new Map()
for (const name of EXPECTED) {
  const key = categoryLabelKey(name)
  if (keyOwner.has(key)) fail(`key "${key}" is produced by both "${keyOwner.get(key)}" and "${name}"`)
  keyOwner.set(key, name)
}

for (const name of EXPECTED) {
  const key = categoryLabelKey(name)
  for (const lang of LOCALES) {
    const value = landing[lang][key]
    const where = `${lang}/seeker.json landing.categories.${key}`
    if (typeof value !== 'string' || value.trim() === '') {
      fail(`${where} is missing or empty ("${name}")`)
      continue
    }
    if (lang === 'en') {
      if (value !== name) fail(`${where} is "${value}", expected the exact name "${name}"`)
    } else if (value === landing.en[key]) {
      fail(`${where} is still the English text ("${name}")`)
    }
    if (/\{\{|\}\}/.test(value)) fail(`${where} contains a placeholder`)

    // 3. The real helper must resolve the name to this entry.
    const shown = categoryLabel(tByLocale[lang], name)
    if (shown !== value) fail(`${lang}: categoryLabel("${name}") gave "${shown}", expected "${value}"`)
  }

  // 4. A picture that exists on disk, or a Lucide icon — one of the two, not both.
  const image = CATEGORY_ICONS[name]
  const lineIcon = CATEGORY_LUCIDE_ICONS[name]
  if (image && lineIcon) fail(`"${name}" has both an image and a Lucide icon — keep one`)
  else if (!image && !lineIcon) fail(`"${name}" has no image and no Lucide icon`)
  else if (image && !fs.existsSync(path.join(ROOT, 'public', image))) fail(`"${name}" icon file not found: public${image}`)
}

// A name with no key must show the backend's English, never a raw key. The result
// does not depend on the locale, so one call is enough.
const unknown = 'A Category Nobody Added'
const unknownShown = categoryLabel(fakeT({}), unknown)
if (unknownShown !== unknown) fail(`fallback for an unknown name gave "${unknownShown}"`)

// Entries for names outside EXPECTED are the previous seven — still served by the
// backend until it is re-seeded. Not an error; listed so nobody forgets to prune.
const expectedKeys = new Set(EXPECTED.map(categoryLabelKey))
const legacy = Object.keys(landing.en).filter((k) => !expectedKeys.has(k))

if (failures.length) {
  console.error(`verify-categories: ${failures.length} problem(s)`)
  for (const f of failures) console.error('  ✗ ' + f)
  process.exit(1)
}

const imageCount = EXPECTED.filter((name) => CATEGORY_ICONS[name]).length
console.log(
  `verify-categories: OK — ${EXPECTED.length} categories × ${LOCALES.length} locales; ` +
    `${imageCount} with an image, ${EXPECTED.length - imageCount} with a Lucide icon.`
)
if (legacy.length) {
  console.log(`  note: ${legacy.length} legacy key(s) kept for the old category names: ${legacy.join(', ')}`)
}
