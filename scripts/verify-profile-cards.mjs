#!/usr/bin/env node
/**
 * Seeker-profile card patches — the mechanical gate for src/lib/profileCards.ts: what each card
 * of the profile sends to PUT /jobseekers/profile, and that the five parts joined are still the
 * body the page-wide Save sent before the split.
 *
 *   node scripts/verify-profile-cards.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own `typescript`
 * (same approach as verify-register-city.mjs). No network, no new dependencies.
 *
 * The old Save is kept below as `legacySave`, copied from handleSave in
 * src/app/profile/page.tsx at 195eaf0 (before profileCards.ts existed). It is the oracle: the
 * new code is compared with it structurally, on named cases and on a few thousand seeded random
 * drafts. Bodies are compared as they go over the wire (JSON), with keys in any order, because
 * `undefined` keys never reach the server and key order means nothing to it.
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

const {
  aboutPatch,
  aboutProblem,
  homeCityChanged,
  homePatch,
  workCitiesChanged,
  workCitiesPatch,
  jobPatch,
  experiencePatch,
  profileSavePatch,
} = loadLib('profileCards')
// Only the rules the oracle needs; they are not what is under test here.
const { nameProblem } = loadLib('nameValidation')
const { isAtLeast18 } = loadLib('dateInput')

let checks = 0
const failures = []

/** Same value, whatever the key order. `undefined` keys are gone, as they are on the wire. */
function canon(v) {
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
  return v
}
const wire = (v) => canon(JSON.parse(JSON.stringify(v)))
function expect(name, actual, want) {
  checks++
  const a = JSON.stringify(canon(actual))
  const w = JSON.stringify(canon(want))
  if (a !== w) failures.push(`${name}\n      got:  ${a}\n      want: ${w}`)
}
const keys = (o) => Object.keys(o).sort()

// ------------------------------------------------------------------------ the oracle
// handleSave at 195eaf0, with its state read from `d` and its two setSaveError calls returned.
function legacySave(d, originalFullName) {
  const homeCityChangedOld = d.homeCity
    ? d.homeCity.id !== d.savedHomeCity?.id
    : d.savedHomeCity !== null && d.homeCityRemoved
  const preferredChangedOld =
    d.preferredCities.length !== d.savedPreferredIds.length ||
    d.preferredCities.some((c) => !d.savedPreferredIds.includes(c.id))

  const problem = d.fullName.trim() !== originalFullName ? nameProblem(d.fullName) : null
  if (problem) return { error: problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters' }
  if (d.dateOfBirth && !isAtLeast18(d.dateOfBirth)) return { error: 'profile:seeker.errorDobAge' }

  const workExperiences = d.experiences
    .filter((r) => r.position.trim() && r.startDate)
    .map((r) => ({
      position: r.position.trim(),
      companyName: r.companyName?.trim() || undefined,
      startDate: r.startDate,
      endDate: r.currentlyWorking ? undefined : r.endDate || undefined,
      currentlyWorking: !!r.currentlyWorking,
      description: r.description?.trim() || undefined,
    }))

  const locationPatch = {}
  if (homeCityChangedOld) locationPatch.cityId = d.homeCity?.id ?? null
  if (preferredChangedOld) locationPatch.preferredCityIds = d.preferredCities.map((c) => c.id)

  return {
    body: {
      fullName: d.fullName.trim() || undefined,
      bio: d.bio.trim() || undefined,
      ...locationPatch,
      preferredCategory: d.triple.category || undefined,
      preferredSector: d.triple.sector || undefined,
      preferredJobTitle: d.triple.jobTitle || undefined,
      preferredLanguage: d.language || undefined,
      dateOfBirth: d.dateOfBirth || undefined,
      gender: d.gender || undefined,
      workExperiences,
    },
  }
}

// What the page does with a problem code, as ABOUT_PROBLEM_KEY in page.tsx (checked in section 8).
const PROBLEM_KEY = {
  nameTooShort: 'auth:profile.errorName',
  nameNotAName: 'auth:profile.errorNameLetters',
  dobUnder18: 'profile:seeker.errorDobAge',
}
/** The new Save path as the page runs it: problem first, otherwise the joined body. */
function newSave(d, originalFullName) {
  const problem = aboutProblem(d, originalFullName)
  return problem ? { error: PROBLEM_KEY[problem] } : { body: profileSavePatch(d) }
}

// ------------------------------------------------------------------------ test data
const A = { id: 'city-a', name: 'Pune', stateName: 'Maharashtra' }
const B = { id: 'city-b', name: 'Hyderabad', stateName: 'Telangana' }
const C = { id: 'city-c', name: 'Chennai', stateName: 'Tamil Nadu' }
const D = { id: 'city-d', name: 'Mysuru', stateName: 'Karnataka' }

const yearsAgo = (n) => {
  const t = new Date()
  t.setFullYear(t.getFullYear() - n)
  return t.toISOString().slice(0, 10)
}
const ADULT = yearsAgo(30)
const MINOR = yearsAgo(16)

const draft = (over = {}) => ({
  fullName: 'Asha Rao',
  bio: 'I cook.',
  dateOfBirth: ADULT,
  gender: 'FEMALE',
  homeCity: null,
  savedHomeCity: null,
  homeCityRemoved: false,
  preferredCities: [],
  savedPreferredIds: [],
  triple: { category: 'Hospitality', sector: 'Kitchen', jobTitle: 'Cook' },
  language: 'hi',
  experiences: [],
  ...over,
})
const row = (over = {}) => ({
  key: 'row-0',
  position: 'Cook',
  companyName: 'Hotel Sai',
  startDate: '2020-01-01',
  endDate: '2022-02-02',
  currentlyWorking: false,
  description: 'Made food',
  ...over,
})
const ORIGINAL = 'Asha Rao'

// ------------------------------------------------------------------------ 1. each card sends only its own fields
const full = draft({
  homeCity: B,
  savedHomeCity: A,
  preferredCities: [A, B],
  savedPreferredIds: [C.id],
  experiences: [row()],
})
expect('about: its four fields, nothing else', keys(aboutPatch(full)), ['bio', 'dateOfBirth', 'fullName', 'gender'])
expect('home: cityId alone', keys(homePatch(full)), ['cityId'])
expect('work cities: preferredCityIds alone', keys(workCitiesPatch(full.preferredCities, full.savedPreferredIds)), ['preferredCityIds'])
expect('job: the triple and the language', keys(jobPatch(full.triple, full.language)), [
  'preferredCategory',
  'preferredJobTitle',
  'preferredLanguage',
  'preferredSector',
])
expect('experience: workExperiences alone', keys(experiencePatch(full.experiences)), ['workExperiences'])

const parts = [
  keys(aboutPatch(full)),
  keys(homePatch(full)),
  keys(workCitiesPatch(full.preferredCities, full.savedPreferredIds)),
  keys(jobPatch(full.triple, full.language)),
  keys(experiencePatch(full.experiences)),
]
const flat = parts.flat()
expect('no key belongs to two cards', flat.length, new Set(flat).size)
expect('the five cards together are the keys the body has always had', flat.sort(), keys(legacySave(full, ORIGINAL).body))

const NEVER = ['location', 'latitude', 'longitude', 'email', 'phoneNumber', 'password', 'profilePhoto', 'isActivelyLooking']
expect('the joined body never carries a field another endpoint owns', NEVER.filter((k) => k in profileSavePatch(full)), [])

// ------------------------------------------------------------------------ 2. home city: cityId
expect('picked a new city, none saved', homePatch(draft({ homeCity: A })), { cityId: A.id })
expect('picked another city', homePatch(draft({ homeCity: B, savedHomeCity: A })), { cityId: B.id })
expect('same city as saved: nothing sent', homePatch(draft({ homeCity: A, savedHomeCity: A })), {})
expect('REMOVED saved city: cityId null', homePatch(draft({ homeCity: null, savedHomeCity: A, homeCityRemoved: true })), { cityId: null })
expect('removed: the key is present, with null', 'cityId' in homePatch(draft({ savedHomeCity: A, homeCityRemoved: true })), true)
expect('empty picker without Remove: nothing sent', homePatch(draft({ homeCity: null, savedHomeCity: A, homeCityRemoved: false })), {})
expect('nothing saved, nothing picked: nothing sent', homePatch(draft()), {})
expect('"remove" with nothing saved: nothing sent', homePatch(draft({ homeCityRemoved: true })), {})
expect('picking a city after a remove sends the city', homePatch(draft({ homeCity: B, savedHomeCity: A, homeCityRemoved: true })), { cityId: B.id })
expect('homeCityChanged: picked', homeCityChanged(draft({ homeCity: A })), true)
expect('homeCityChanged: same', homeCityChanged(draft({ homeCity: A, savedHomeCity: A })), false)
expect('homeCityChanged: removed', homeCityChanged(draft({ savedHomeCity: A, homeCityRemoved: true })), true)
expect('homeCityChanged: empty picker, not removed', homeCityChanged(draft({ savedHomeCity: A })), false)

// ------------------------------------------------------------------------ 3. preferred cities
expect('emptied on purpose: [] is sent', workCitiesPatch([], [A.id]), { preferredCityIds: [] })
expect('emptied: the key is present', 'preferredCityIds' in workCitiesPatch([], [A.id, B.id]), true)
expect('both empty: nothing sent', workCitiesPatch([], []), {})
expect('unchanged: nothing sent', workCitiesPatch([A, B], [A.id, B.id]), {})
expect('same set in another order: nothing sent', workCitiesPatch([B, A], [A.id, B.id]), {})
expect('one added: the whole list, in order', workCitiesPatch([A, B, C], [A.id, B.id]), { preferredCityIds: [A.id, B.id, C.id] })
expect('one swapped: the whole list', workCitiesPatch([A, D], [A.id, B.id]), { preferredCityIds: [A.id, D.id] })
expect('one removed', workCitiesPatch([A], [A.id, B.id]), { preferredCityIds: [A.id] })
expect('workCitiesChanged: a first pick', workCitiesChanged([A], []), true)
expect('workCitiesChanged: unchanged', workCitiesChanged([A], [A.id]), false)

// ------------------------------------------------------------------------ 4. empty values keep their old meaning
const blank = draft({
  fullName: '',
  bio: '',
  dateOfBirth: '',
  gender: '',
  triple: {},
  language: '',
})
expect(
  'every emptied field is dropped from the wire (it cannot clear anything)',
  wire(profileSavePatch(blank)),
  { workExperiences: [] }
)
expect('a blank bio is dropped', wire(aboutPatch(draft({ bio: '   ' }))).bio, undefined)
expect('a blank name is dropped', wire(aboutPatch(draft({ fullName: '  ' }))).fullName, undefined)
expect('a blank DOB is dropped, never sent as ""', 'dateOfBirth' in wire(aboutPatch(draft({ dateOfBirth: '' }))), false)
expect('name and bio are trimmed', wire(aboutPatch(draft({ fullName: '  Asha Rao ', bio: ' hi ' }))), {
  bio: 'hi',
  dateOfBirth: ADULT,
  fullName: 'Asha Rao',
  gender: 'FEMALE',
})
expect('a partly filled triple sends only what is there', wire(jobPatch({ category: 'Hospitality' }, '')), {
  preferredCategory: 'Hospitality',
})
expect('language alone', wire(jobPatch({}, 'ta')), { preferredLanguage: 'ta' })
expect('the full triple and language', wire(jobPatch({ category: 'a', sector: 'b', jobTitle: 'c' }, 'kn')), {
  preferredCategory: 'a',
  preferredSector: 'b',
  preferredJobTitle: 'c',
  preferredLanguage: 'kn',
})

// ------------------------------------------------------------------------ 5. work experience
expect('no rows: [] is sent (it replaces the list)', experiencePatch([]), { workExperiences: [] })
expect('a row with no position is dropped', experiencePatch([row({ position: '   ' })]), { workExperiences: [] })
expect('a row with no start date is dropped', experiencePatch([row({ startDate: '' })]), { workExperiences: [] })
expect('a row with no start date (undefined) is dropped', experiencePatch([row({ startDate: undefined })]), { workExperiences: [] })
expect('the list key and id never leak into a row', keys(experiencePatch([row({ id: 'srv-1' })]).workExperiences[0]), [
  'companyName',
  'currentlyWorking',
  'description',
  'endDate',
  'position',
  'startDate',
])
expect('a current job sends no end date', wire(experiencePatch([row({ currentlyWorking: true })]).workExperiences[0]).endDate, undefined)
expect('a current job says so', experiencePatch([row({ currentlyWorking: true })]).workExperiences[0].currentlyWorking, true)
expect('a finished job keeps its end date', experiencePatch([row()]).workExperiences[0].endDate, '2022-02-02')
expect('currentlyWorking undefined is false', experiencePatch([row({ currentlyWorking: undefined })]).workExperiences[0].currentlyWorking, false)
expect(
  'blank company and description are dropped, position trimmed',
  wire(experiencePatch([row({ position: ' Cook ', companyName: '  ', description: '' })]).workExperiences[0]),
  { position: 'Cook', startDate: '2020-01-01', endDate: '2022-02-02', currentlyWorking: false }
)
expect(
  'valid rows keep their order, invalid ones are skipped',
  experiencePatch([row({ position: 'A' }), row({ position: '' }), row({ position: 'B' })]).workExperiences.map((r) => r.position),
  ['A', 'B']
)
expect('a null end date is dropped', wire(experiencePatch([row({ endDate: null })]).workExperiences[0]).endDate, undefined)

// ------------------------------------------------------------------------ 6. validation and dirty-check helpers
expect('a good name and an adult DOB: no problem', aboutProblem(draft(), ORIGINAL), null)
expect('a name that is only letters in another script', aboutProblem(draft({ fullName: 'प्रिया' }), ORIGINAL), null)
expect('Tamil name with combining marks', aboutProblem(draft({ fullName: 'தமிழ்' }), ORIGINAL), null)
expect('changed to digits', aboutProblem(draft({ fullName: '1234' }), ORIGINAL), 'nameNotAName')
expect('changed to a single letter', aboutProblem(draft({ fullName: 'A' }), ORIGINAL), 'nameTooShort')
expect('changed to nothing', aboutProblem(draft({ fullName: '   ' }), ORIGINAL), 'nameTooShort')
expect(
  'a stored name from before the rule is NOT judged when untouched',
  aboutProblem(draft({ fullName: 'Test User 1' }), 'Test User 1'),
  null
)
expect(
  '…even when the trimmed original is compared with an untrimmed field',
  aboutProblem(draft({ fullName: ' Test User 1 ' }), 'Test User 1'),
  null
)
expect('…but it is judged once edited', aboutProblem(draft({ fullName: 'Test User 12' }), 'Test User 1'), 'nameNotAName')
expect('an under-18 date', aboutProblem(draft({ dateOfBirth: MINOR }), ORIGINAL), 'dobUnder18')
expect('an empty date is skipped', aboutProblem(draft({ dateOfBirth: '' }), ORIGINAL), null)
expect('a nonsense date is not 18+', aboutProblem(draft({ dateOfBirth: 'not-a-date' }), ORIGINAL), 'dobUnder18')
expect('the name is reported before the date', aboutProblem(draft({ fullName: '1234', dateOfBirth: MINOR }), ORIGINAL), 'nameNotAName')
expect('an untouched bad name does not hide a bad date', aboutProblem(draft({ fullName: 'Test User 1', dateOfBirth: MINOR }), 'Test User 1'), 'dobUnder18')

// ------------------------------------------------------------------------ 7. old Save v new Save
// Named cases first, then a few thousand seeded random drafts (same seed, same run, every time).
const same = (name, d, original = ORIGINAL) => {
  const old = legacySave(d, original)
  const now = newSave(d, original)
  expect(`${name}: same outcome`, 'error' in old ? { error: old.error } : { body: wire(old.body) }, 'error' in now ? { error: now.error } : { body: wire(now.body) })
}
same('empty profile', blank)
same('everything filled, nothing changed', draft({ homeCity: A, savedHomeCity: A, preferredCities: [A], savedPreferredIds: [A.id], experiences: [row()] }))
same('city picked and work cities changed', full)
same('city removed, work cities emptied', draft({ savedHomeCity: A, homeCityRemoved: true, preferredCities: [], savedPreferredIds: [B.id] }))
same('bio-only edit leaves the cities alone', draft({ bio: 'new bio', homeCity: A, savedHomeCity: A, preferredCities: [B], savedPreferredIds: [B.id] }))
same('bad name', draft({ fullName: '1234' }))
same('bad name and bad date', draft({ fullName: '1234', dateOfBirth: MINOR }))
same('under-18 date', draft({ dateOfBirth: MINOR }))
same('legacy name untouched', draft({ fullName: 'Test User 1' }), 'Test User 1')
same('rows: valid, no position, no start, current', draft({
  experiences: [row(), row({ position: '' }), row({ startDate: '' }), row({ currentlyWorking: true, endDate: '2023-01-01' })],
}))

let seed = 20261028
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 2 ** 32
}
const pick = (xs) => xs[Math.floor(rnd() * xs.length)]
const CITIES = [A, B, C, D]
const subset = () => CITIES.filter(() => rnd() < 0.4).sort(() => rnd() - 0.5).slice(0, 3)
const randomRow = () => ({
  key: `row-${Math.floor(rnd() * 100)}`,
  id: rnd() < 0.3 ? 'srv-1' : undefined,
  position: pick(['Cook', ' Driver ', '', '  ', 'Welder']),
  companyName: pick(['Hotel', '  Co  ', '', undefined, null]),
  startDate: pick(['2019-05-05', '2021-01-01', '', undefined]),
  endDate: pick(['2022-02-02', '', undefined, null]),
  currentlyWorking: pick([true, false, undefined]),
  description: pick(['did things', ' ', '', undefined, null]),
})
const randomDraft = () => {
  const saved = subset()
  return {
    fullName: pick(['Asha Rao', ' Asha Rao ', '1234', 'A', '', '   ', 'प्रिया', 'Test User 1', "D'Souza"]),
    bio: pick(['', '  ', 'hello', ' padded ']),
    dateOfBirth: pick([ADULT, MINOR, '', 'not-a-date', yearsAgo(18 + 5)]),
    gender: pick(['', 'MALE', 'FEMALE', 'OTHER']),
    homeCity: pick([null, A, B]),
    savedHomeCity: pick([null, A, B]),
    homeCityRemoved: rnd() < 0.5,
    preferredCities: subset(),
    savedPreferredIds: saved.map((c) => c.id),
    triple: pick([{}, { category: 'x' }, { category: 'x', sector: 'y' }, { category: 'x', sector: 'y', jobTitle: 'z' }, { jobTitle: '' }]),
    language: pick(['', 'en', 'hi', 'ta']),
    experiences: Array.from({ length: Math.floor(rnd() * 4) }, randomRow),
  }
}
let random = 0
let randomErrors = 0
for (let i = 0; i < 3000; i++) {
  const d = randomDraft()
  const original = pick(['Asha Rao', 'Test User 1', ''])
  const old = legacySave(d, original)
  const now = newSave(d, original)
  random++
  if ('error' in old) randomErrors++
  expect(
    `random draft #${i}`,
    'error' in old ? { error: old.error } : { body: wire(old.body) },
    'error' in now ? { error: now.error } : { body: wire(now.body) }
  )
}
// The random run must have exercised both outcomes, or it proved less than it says.
expect('the random drafts hit both the error path and the body path', randomErrors > 100 && random - randomErrors > 100, true)

// ------------------------------------------------------------------------ 8. the page really uses it
// Source-text tripwires, not proof of behaviour: they catch the page drifting back to its own copy.
const page = fs.readFileSync(path.join(ROOT, 'src', 'app', 'profile', 'page.tsx'), 'utf8')
expect('page imports the helpers', /from '@\/lib\/profileCards'/.test(page), true)
expect('page sends profileSavePatch(draft)', page.includes('jobSeekerAPI.updateProfile(profileSavePatch(draft))'), true)
expect('page asks aboutProblem before saving', page.includes('aboutProblem(draft, originalFullName.current)'), true)
for (const [code, key] of Object.entries(PROBLEM_KEY)) {
  expect(`page maps ${code} to ${key}`, new RegExp(`${code}:\\s*'${key}'`).test(page), true)
}
expect('page no longer keeps its own copy of the body', /preferredCategory:\s*triple\.category/.test(page), false)
expect('page no longer keeps its own changed-flags', /const (homeCityChanged|preferredChanged)\b/.test(page), false)
// The only other body the page sends is the one-key "actively looking" switch.
expect('the page has exactly two updateProfile calls', page.split('jobSeekerAPI.updateProfile(').length - 1, 2)
expect('…one of them is the switch', page.includes('jobSeekerAPI.updateProfile({ isActivelyLooking: next })'), true)

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} profile-card checks failed:\n`)
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`)
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`)
  process.exit(1)
}
console.log(`✓ all ${checks} profile-card checks passed (${random} random drafts, ${randomErrors} of them refused by validation)`)
