#!/usr/bin/env node
/**
 * Seeker-profile card state — the mechanical gate for the per-card logic in
 * src/lib/profileCards.ts (Phase B1): cardPatch, draftFromProfile, cardDirty, slicesToApply.
 *
 *   node scripts/verify-profile-card-state.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own `typescript`
 * (same approach as verify-profile-cards.mjs). No network, no new dependencies.
 *
 * draftFromProfile is proved against the page itself: the real `hydrate()` is cut out of
 * src/app/profile/page.tsx, run with recording stand-ins for the setters, and its result is
 * compared with draftFromProfile's on a few thousand seeded random server profiles. The same is
 * done for toSelectedCity, which lives in a component the loader cannot import. If hydrate() ever
 * sets a field this script does not know, the "sets exactly" check fails and says so.
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

/** Load src/<rel> (.ts or .tsx) as CommonJS. '@/x', './x' and bare packages resolve as the app does. */
const srcCache = new Map()
function loadSrc(rel) {
  if (srcCache.has(rel)) return srcCache.get(rel).exports
  const file = path.join(ROOT, 'src', rel)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  })
  const mod = new Module(file)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  const baseRequire = createRequire(file)
  const withExt = (p) => ['.ts', '.tsx'].map((e) => p + e).find((c) => fs.existsSync(c))
  mod.require = (id) => {
    const target = id.startsWith('@/') ? path.join(ROOT, 'src', id.slice(2)) : id.startsWith('./') ? path.resolve(path.dirname(file), id) : null
    return target ? loadSrc(path.relative(path.join(ROOT, 'src'), withExt(target))) : baseRequire(id)
  }
  srcCache.set(rel, mod)
  mod._compile(outputText, file)
  return mod.exports
}

const {
  CARD_IDS,
  cardPatch,
  draftFromProfile,
  cardDirty,
  slicesToApply,
  aboutPatch,
  aboutProblem,
  homePatch,
  workCitiesPatch,
  jobPatch,
  experiencePatch,
  profileSavePatch,
  savedIdsOf,
  idleCardUi,
  cardActivity,
  rebaseCards,
  patchIsEmpty,
  bodyLanded,
  isCardLocked,
  sameCardDraft,
  focusTargetAfter,
} = loadLib('profileCards')
const { saveFailureKind } = loadLib('jobPreferences')
const { ApiError, RequestTimeoutError, PROFILE_READ_TIMEOUT_MS, PROFILE_WRITE_TIMEOUT_MS } = loadLib('api')
const { toDateInput } = loadLib('dateInput')

let checks = 0
const failures = []

/** Same value whatever the key order; `undefined` keys are gone, as they are on the wire. */
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
const clone = (v) => structuredClone(v)
const sorted = (xs) => [...xs].sort()

// ------------------------------------------------------------------------ 1. the card ids
expect('the five cards, in page order', [...CARD_IDS], ['about', 'home', 'workCities', 'job', 'experience'])

// ------------------------------------------------------------------------ test data
const cityOf = (id, name = id, state = 'Telangana') => ({ id, name, state: { name: state }, latitude: 1, longitude: 2 })
const profile = (js, extra = {}) => ({ id: 'u1', email: null, role: 'JOB_SEEKER', jobSeeker: js, ...extra })
const FULL = profile(
  {
    id: 's1',
    fullName: 'Asha Rao',
    bio: 'I cook.',
    location: 'Old Town',
    dateOfBirth: '1990-05-05T00:00:00.000Z',
    gender: 'FEMALE',
    city: cityOf('c-a', 'Pune', 'Maharashtra'),
    preferredCities: [{ city: cityOf('c-b', 'Hyderabad') }, { city: cityOf('c-c', 'Chennai', 'Tamil Nadu') }],
    preferredCategory: 'Hospitality',
    preferredSector: 'Kitchen',
    preferredJobTitle: 'Cook',
    workExperience: [
      { position: 'Cook', companyName: 'Hotel Sai', startDate: '2018-01-01T00:00:00.000Z', endDate: '2020-02-02T00:00:00.000Z', currentlyWorking: false, description: 'Made food' },
      { position: 'Chef', companyName: null, startDate: '2020-03-01T00:00:00.000Z', endDate: null, currentlyWorking: true, description: null },
    ],
  },
  { preferredLanguage: 'hi' }
)

// ------------------------------------------------------------------------ 2. cardPatch
// cardPatch is the Phase A builders, judged against the saved baseline it is handed; the page-wide
// Save is the five of them joined, and sends the same body it always did.
let seed = 424242
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 2 ** 32
}
const pick = (xs) => xs[Math.floor(rnd() * xs.length)]
const C = ['c1', 'c2', 'c3', 'c4'].map((id) => ({ id, name: id, stateName: 'S' }))
const subset = () => C.filter(() => rnd() < 0.5).slice(0, 3)
const yearsAgo = (n) => {
  const t = new Date()
  t.setFullYear(t.getFullYear() - n)
  return t.toISOString().slice(0, 10)
}
const randomRow = () => ({
  key: 'k',
  position: pick(['Cook', ' Welder ', '', ' ']),
  companyName: pick(['Hotel', '', undefined, null]),
  startDate: pick(['2019-05-05', '', undefined]),
  endDate: pick(['2022-02-02', '', undefined, null]),
  currentlyWorking: pick([true, false, undefined]),
  description: pick(['d', '', undefined, null]),
})
const randomDraft = () => ({
  fullName: pick(['Asha', ' Asha ', '', 'A']),
  bio: pick(['', ' ', 'x']),
  dateOfBirth: pick(['', yearsAgo(30), yearsAgo(16)]),
  gender: pick(['', 'MALE', 'FEMALE', 'OTHER']),
  homeCity: pick([null, C[0], C[1]]),
  savedHomeCity: pick([null, C[0], C[1]]),
  homeCityRemoved: rnd() < 0.5,
  preferredCities: subset(),
  savedPreferredIds: subset().map((c) => c.id),
  triple: pick([{}, { category: 'x' }, { category: 'x', sector: 'y', jobTitle: 'z' }]),
  language: pick(['', 'en', 'hi']),
  experiences: Array.from({ length: Math.floor(rnd() * 4) }, randomRow),
})
// The page's own saved copies as the baseline: what the page-wide Save has always sent against.
const pageBaseline = (d) => ({ homeCity: d.savedHomeCity, preferredCities: d.savedPreferredIds.map((id) => ({ id })) })
// profileSavePatch as it was before it was built from cardPatch: the five Phase A builders, spread.
const legacyProfileSavePatch = (d) => ({
  ...aboutPatch(d),
  ...homePatch(d),
  ...workCitiesPatch(d.preferredCities, d.savedPreferredIds),
  ...jobPatch(d.triple, d.language),
  ...experiencePatch(d.experiences),
})
for (let i = 0; i < 2000; i++) {
  const d = randomDraft()
  const builders = {
    about: aboutPatch(d),
    home: homePatch(d),
    workCities: workCitiesPatch(d.preferredCities, d.savedPreferredIds),
    job: jobPatch(d.triple, d.language),
    experience: experiencePatch(d.experiences),
  }
  for (const card of CARD_IDS) {
    expect(`cardPatch(${card}) against the page's saved copies is its Phase A builder #${i}`, wire(cardPatch(card, d, pageBaseline(d))), wire(builders[card]))
  }
}
// The page-wide Save is unchanged: the same request body, byte for byte (key order included), not
// just the same fields.
for (let i = 0; i < 3000; i++) {
  const d = randomDraft()
  expect(`profileSavePatch is the old body, byte for byte #${i}`, JSON.stringify(profileSavePatch(d, pageBaseline(d))), JSON.stringify(legacyProfileSavePatch(d)))
}
const sample = randomDraft()
expect('about patch has only about keys', sorted(Object.keys(cardPatch('about', sample, pageBaseline(sample)))), ['bio', 'dateOfBirth', 'fullName', 'gender'])
expect('experience patch has only workExperiences', Object.keys(cardPatch('experience', sample, pageBaseline(sample))), ['workExperiences'])

// ------------------------------------------------------------------------ 3. hydrate() and the server mapping
// The page's hydrate() now calls draftFromProfile. This pins both halves: that the mapping is what
// hydrate() did BEFORE it called it (written out by hand below as legacyHydrate, from be30743), and
// that hydrate() wires every field to the right setter. The real hydrate() is cut out of
// src/app/profile/page.tsx and run with recording setters; toSelectedCity is cut out of the
// component, which the loader cannot import.
const page = fs.readFileSync(path.join(ROOT, 'src', 'app', 'profile', 'page.tsx'), 'utf8').replace(/\r\n/g, '\n')
const component = fs.readFileSync(path.join(ROOT, 'src', 'components', 'location', 'StateCitySelect.tsx'), 'utf8').replace(/\r\n/g, '\n')

function cut(src, from, to, label) {
  const a = src.indexOf(from)
  const b = src.indexOf(to, a + from.length)
  if (a < 0 || b < 0) {
    failures.push(`could not find ${label} in the source; this script needs updating`)
    checks++
    return null
  }
  return src.slice(a, b + to.length)
}
const strip = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText

// hydrate() as it was at be30743, every value written out by hand. What each setter was given.
const makeLegacyHydrate = (toSelectedCity) => (p) => {
  const js = p.jobSeeker
  const city = js?.city ? toSelectedCity(js.city) : null
  const preferred = (js?.preferredCities ?? []).map((saved) => toSelectedCity(saved.city))
  return {
    setJobSeekerId: js?.id ?? null,
    setEmail: p.email ?? '',
    setEmailVerified: p.emailVerified ?? false,
    setPhoneNumber: p.phoneNumber ?? '',
    setPhoneVerified: p.phoneVerified ?? false,
    setDocumentVerificationStatus: js?.documentVerificationStatus ?? null,
    setPhoto: js?.profilePhoto ?? null,
    setFullName: js?.fullName ?? '',
    setBio: js?.bio ?? '',
    setLocation: js?.location ?? '',
    setDateOfBirth: toDateInput(js?.dateOfBirth),
    setGender: js?.gender ?? '',
    setProfileUpdatedAt: js?.updatedAt ?? null,
    setAccountStatus: p.accountStatus ?? null,
    setHomeCity: city,
    setHomeCityRemoved: false,
    setPreferredCities: preferred,
    setTriple: {
      category: js?.preferredCategory || undefined,
      sector: js?.preferredSector || undefined,
      jobTitle: js?.preferredJobTitle || undefined,
    },
    setLanguage: p.preferredLanguage ?? 'en',
    setActivelyLooking: js?.isActivelyLooking ?? false,
    setExperiences: (js?.workExperience ?? []).map((w) => ({
      position: w.position ?? '',
      companyName: w.companyName ?? '',
      startDate: toDateInput(w.startDate),
      endDate: toDateInput(w.endDate),
      currentlyWorking: w.currentlyWorking ?? false,
      description: w.description ?? '',
    })),
  }
}

// A different generator from the other scripts: nulls, gaps and odd dates are the point.
const maybe = (v) => pick([v, null, undefined])
const randomCity = () => cityOf(pick(['c1', 'c2', 'c3']), pick(['Pune', 'Hyd']), pick(['MH', 'TG']))
const randomWork = () => ({
  position: maybe(pick(['Cook', '', ' Chef '])),
  companyName: maybe(pick(['Hotel', ''])),
  startDate: maybe(pick(['2018-01-01T00:00:00.000Z', '2020-12-31', 'garbage', ''])),
  endDate: maybe(pick(['2019-01-01T00:00:00.000Z', '', 'garbage'])),
  currentlyWorking: maybe(pick([true, false])),
  description: maybe(pick(['d', ''])),
})
const randomProfile = () => {
  const js = pick([
    null,
    undefined,
    {
      id: 's',
      fullName: maybe(pick(['Asha', ' Asha ', ''])),
      bio: maybe(pick(['x', ''])),
      location: maybe(pick(['Town', ''])),
      dateOfBirth: maybe(pick(['1990-05-05T00:00:00.000Z', '1990-05-05', 'nope'])),
      gender: maybe(pick(['MALE', 'FEMALE', 'OTHER'])),
      city: maybe(randomCity()),
      preferredCities: maybe(Array.from({ length: Math.floor(rnd() * 4) }, () => ({ city: randomCity() }))),
      preferredCategory: maybe(pick(['cat', ''])),
      preferredSector: maybe(pick(['sec', ''])),
      preferredJobTitle: maybe(pick(['job', ''])),
      workExperience: maybe(Array.from({ length: Math.floor(rnd() * 4) }, randomWork)),
      isActivelyLooking: maybe(pick([true, false])),
      documentVerificationStatus: maybe(pick(['PENDING', 'VERIFIED', 'REJECTED'])),
      profilePhoto: maybe(pick(['https://img.test/a.png', ''])),
      updatedAt: maybe('2026-10-01T10:00:00.000Z'),
    },
  ])
  // The contact and display fields hydrate() also sets: given real values too, so a line that
  // drops or swaps one of them cannot hide behind a default.
  return profile(js, {
    preferredLanguage: maybe(pick(['hi', 'en', 'kn'])),
    email: maybe(pick(['asha@example.com', ''])),
    emailVerified: maybe(pick([true, false])),
    phoneNumber: maybe(pick(['+919876543210', ''])),
    phoneVerified: maybe(pick([true, false])),
    accountStatus: maybe(pick(['ACTIVE', 'SUSPENDED'])),
  })
}

const hydrateSrc = cut(page, '  const hydrateShell = useCallback(', '    [hydrateShell, applyCardValues, commitSaved, resetCards]\n  )\n', 'hydrate()')
const toSelectedSrc = cut(component, 'export function toSelectedCity', '\n}\n', 'toSelectedCity')

if (hydrateSrc && toSelectedSrc) {
  const setterNames = [...new Set([...hydrateSrc.matchAll(/\b(set[A-Z]\w*)\(/g)].map((m) => m[1]))]
  // Set by hydrate() and drafts of the form.
  const FORM = [
    'setFullName', 'setBio', 'setLocation', 'setDateOfBirth', 'setGender', 'setHomeCity',
    'setHomeCityRemoved', 'setPreferredCities', 'setTriple', 'setLanguage', 'setExperiences',
  ]
  // Set by hydrate() but not drafts: contact, display and the independent switch.
  const NOT_DRAFT = [
    'setJobSeekerId', 'setEmail', 'setEmailVerified', 'setPhoneNumber', 'setPhoneVerified',
    'setDocumentVerificationStatus', 'setPhoto', 'setProfileUpdatedAt', 'setAccountStatus', 'setActivelyLooking',
  ]
  expect('hydrate() sets exactly the fields this script knows', sorted(setterNames), sorted([...FORM, ...NOT_DRAFT]))
  expect('hydrate() takes the mapping from draftFromProfile', hydrateSrc.includes('draftFromProfile(p)'), true)
  expect('hydrate() no longer maps dates or cities itself', /toDateInput\(|toSelectedCity\(/.test(hydrateSrc), false)

  const toSelectedCity = new Function(`${strip(toSelectedSrc.replace(/^export /, ''))}\nreturn toSelectedCity`)()
  const legacyHydrate = makeLegacyHydrate(toSelectedCity)
  const scopeNames = [...setterNames, 'useCallback', 'newKey', 'CARD_IDS', 'commitSaved', 'PER_CARD_EDITING', 'resetCards', 'draftFromProfile', 'originalFullName', 'cancelLocate', 'lookingBusyRef']
  const makeParts_ = new Function(
    `${strip(`function make({ ${scopeNames.join(', ')} }) {\n${hydrateSrc}\nreturn { hydrate, hydrateShell, applyCardValues }\n}`)}\nreturn make`
  )()
  const make = (scope) => makeParts_(scope).hydrate
  const runHydrate = (p, switchSaving = false) => {
    const calls = {}
    let cancelled = 0
    const originalFullName = { current: '' }
    const scope = Object.fromEntries(setterNames.map((n) => [n, (v) => { calls[n] = v }]))
    Object.assign(scope, {
      useCallback: (fn) => fn,
      newKey: () => 'row-x',
      CARD_IDS,
      draftFromProfile,
      originalFullName,
      cancelLocate: () => { cancelled++ },
      commitSaved: (v) => { calls.setSavedValues = v },
      PER_CARD_EDITING: false,
      resetCards: () => {},
      lookingBusyRef: { current: switchSaving },
    })
    make(scope)(p)
    return { calls, original: originalFullName.current, cancelled }
  }
  // The setters' arguments as the old hydrate() gave them: no row keys, and without the snapshot,
  // which the old hydrate() kept as two separate copies (checked on its own below).
  const withoutKeys = ({ setSavedValues: _snapshot, ...calls }) => ({
    ...calls,
    setExperiences: calls.setExperiences?.map(({ key: _key, ...row }) => row),
  })

  expect('toSelectedCity as the component has it', toSelectedCity(cityOf('c1', 'Pune', 'Maharashtra')), { id: 'c1', name: 'Pune', stateName: 'Maharashtra' })

  const checkProfile = (label, p) => {
    const want = legacyHydrate(p)
    const run = runHydrate(p)
    // 1. hydrate() hands every setter exactly what it handed it before.
    expect(`${label}: every setter gets what the old hydrate() gave it`, withoutKeys(run.calls), want)
    // The snapshot replaces the old savedHomeCity + savedPreferredIds pair: the same two values,
    // and nothing from the draft that the seeker is editing.
    const snap = run.calls.setSavedValues
    expect(`${label}: the snapshot's home city is the old savedHomeCity`, snap.homeCity, want.setHomeCity)
    expect(
      `${label}: the snapshot's preferred ids are the old savedPreferredIds`,
      snap.preferredCities.map((c) => c.id),
      want.setPreferredCities.map((c) => c.id)
    )
    expect(`${label}: the snapshot is what the form fields were loaded with`, snap, {
      fullName: want.setFullName,
      bio: want.setBio,
      location: want.setLocation,
      dateOfBirth: want.setDateOfBirth,
      gender: want.setGender,
      homeCity: want.setHomeCity,
      preferredCities: want.setPreferredCities,
      triple: want.setTriple,
      language: want.setLanguage,
      experiences: want.setExperiences,
    })
    expect(`${label}: every experience row still gets a key`, (run.calls.setExperiences ?? []).every((r) => r.key === 'row-x'), true)
    expect(`${label}: the original name is the stored name, trimmed`, run.original, (p.jobSeeker?.fullName ?? '').trim())
    expect(`${label}: a loaded record ends a running location lookup, once`, run.cancelled, 1)
    // 2. while the switch's own save runs it owns the value: that setter is left alone.
    const busy = runHydrate(p, true)
    const { setActivelyLooking: _switch, ...everythingElse } = want
    expect(`${label}: the switch is left alone while it saves`, 'setActivelyLooking' in busy.calls, false)
    expect(`${label}: …and nothing else changes`, withoutKeys(busy.calls), everythingElse)
    // 3. draftFromProfile is the same mapping, written independently.
    const d = draftFromProfile(p)
    expect(`${label}: draftFromProfile is the old mapping`, d, {
      fullName: want.setFullName,
      bio: want.setBio,
      location: want.setLocation,
      dateOfBirth: want.setDateOfBirth,
      gender: want.setGender,
      homeCity: want.setHomeCity,
      preferredCities: want.setPreferredCities,
      triple: want.setTriple,
      language: want.setLanguage,
      experiences: want.setExperiences,
    })
  }
  checkProfile('full profile', FULL)
  for (let i = 0; i < 3000; i++) checkProfile(`random profile #${i}`, randomProfile())

  // ---- 3a. The form and the snapshot never share an object or an array ----------------------------
  // hydrate() gives the form copies of the snapshot's city and job values. An in-place edit of one
  // (push into the list, rename a city, set a level) must not show up in the other.
  const checkIsolation = (label, p) => {
    const fresh = () => runHydrate(p).calls
    const same = fresh()
    const snapOf = (c) => c.setSavedValues
    const formOf = (c) => ({ homeCity: c.setHomeCity, preferredCities: c.setPreferredCities, triple: c.setTriple })
    // 1. Equivalent values.
    expect(`${label}: form and snapshot hold equal values`, formOf(same), {
      homeCity: snapOf(same).homeCity,
      preferredCities: snapOf(same).preferredCities,
      triple: snapOf(same).triple,
    })
    // 2. No shared references (a null city has none to share).
    const f = formOf(same)
    const s = snapOf(same)
    expect(`${label}: home city is not the same object`, f.homeCity === null || f.homeCity !== s.homeCity, true)
    expect(`${label}: preferred list is not the same array`, f.preferredCities !== s.preferredCities, true)
    expect(`${label}: no preferred city object is shared`, f.preferredCities.some((c, i) => c === s.preferredCities[i]), false)
    expect(`${label}: triple is not the same object`, f.triple !== s.triple, true)
    // 3. Editing the form in place leaves the snapshot as it was.
    const a = fresh()
    const before = clone(snapOf(a))
    if (a.setHomeCity) { a.setHomeCity.id = 'edited'; a.setHomeCity.name = 'edited' }
    a.setPreferredCities.forEach((c) => { c.id = 'edited' })
    a.setPreferredCities.push({ id: 'added', name: 'added' })
    a.setTriple.category = 'edited'
    a.setTriple.jobTitle = 'edited'
    expect(`${label}: editing the form in place leaves the snapshot alone`, snapOf(a), before)
    // 4. Editing the snapshot in place leaves the form as it was.
    const b = fresh()
    const formBefore = clone(formOf(b))
    const sb = snapOf(b)
    if (sb.homeCity) { sb.homeCity.id = 'edited'; sb.homeCity.name = 'edited' }
    sb.preferredCities.forEach((c) => { c.id = 'edited' })
    sb.preferredCities.push({ id: 'added', name: 'added' })
    sb.triple.category = 'edited'
    sb.triple.jobTitle = 'edited'
    expect(`${label}: editing the snapshot in place leaves the form alone`, formOf(b), formBefore)
    // 5. Replacing a field (what the page's setters do) cannot reach the snapshot either.
    const c = fresh()
    const beforeReplace = clone(snapOf(c))
    c.setHomeCity = { id: 'other', name: 'other', stateName: 'other' }
    c.setPreferredCities = []
    c.setTriple = {}
    expect(`${label}: replacing a form field leaves the snapshot alone`, snapOf(c), beforeReplace)
  }
  checkIsolation('full profile', FULL)
  for (let i = 0; i < 500; i++) checkIsolation(`random profile #${i}`, randomProfile())

  // ---- 3b. The snapshot, as the page runs it: load, edit, Save (page-wide, PER_CARD_EDITING off) ----
  // The REAL hydrate() and the REAL handleSave() are cut out of the page and run against a small
  // stand-in for React state. What each Save sends is compared with request bodies written out BY
  // HAND below (not computed with profileCards.ts), so this does not lean on the code it checks.
  const handleSaveSrc = cut(page, '  const handleSave = async () => {', '\n  }\n', 'handleSave()')
  if (handleSaveSrc) {
    const saveNames = [
      'setSaveError', 'setSaved', 't', 'ABOUT_PROBLEM_KEY', 'aboutProblem', 'setSaving', 'jobSeekerAPI', 'profileSavePatch',
      'savedValues', 'draft', 'originalFullName', 'lastProfileRef', 'hydrate', 'PER_CARD_EDITING', 'acquireWrite', 'releaseWrite', 'anyCardLocked', 'updateUser', 'user', 'setEditing', 'window',
    ]
    const makeSave = new Function(
      `${strip(`function make({ ${saveNames.join(', ')} }) {\n${handleSaveSrc}\nreturn handleSave\n}`)}\nreturn make`
    )()

    // One page: `state` holds what React would hold; `server` is what GET /jobseekers/profile says.
    const newPage = (serverProfile) => {
      const sim = {
        state: {}, server: serverProfile, bodies: [], failPut: false, originalFullName: { current: '' }, lastProfileRef: { current: null },
        savedRef: { current: null }, ui: { current: idleCardUi() }, lock: { current: false }, gen: { current: 0 }, looking: { current: false }, unknown: { current: {} },
      }
      sim.commit = (v) => { sim.savedRef.current = v; sim.state.setSavedValues = v }
      const scope = Object.fromEntries(setterNames.map((n) => [n, (v) => { sim.state[n] = v }]))
      Object.assign(scope, {
        useCallback: (fn) => fn,
        newKey: () => 'row-x',
        CARD_IDS,
        draftFromProfile,
        originalFullName: sim.originalFullName,
        cancelLocate: () => {},
        commitSaved: (v) => sim.commit(v),
        PER_CARD_EDITING: false,
        resetCards: () => {},
        lookingBusyRef: { current: false },
      })
      sim.hydrate = make(scope)
      sim.load = () => sim.hydrate(sim.server)
      // The page re-reads these on every render; here they are read at Save time.
      sim.save = async () => {
        const s = sim.state
        const jobSeekerAPI = {
          updateProfile: async (b) => {
            if (sim.failPut) throw new Error('boom')
            sim.bodies.push(JSON.stringify(b))
          },
          getProfile: async () => sim.server,
        }
        const errors = []
        await makeSave({
          setSaveError: (v) => { if (v) errors.push(v) },
          setSaved: () => {},
          t: (k) => k,
          ABOUT_PROBLEM_KEY: { nameTooShort: 'tooShort', nameNotAName: 'notAName', dobUnder18: 'under18' },
          aboutProblem,
          setSaving: () => {},
          jobSeekerAPI,
          profileSavePatch,
          savedValues: s.setSavedValues ?? null,
          draft: {
            fullName: s.setFullName, bio: s.setBio, dateOfBirth: s.setDateOfBirth, gender: s.setGender,
            homeCity: s.setHomeCity, homeCityRemoved: s.setHomeCityRemoved, preferredCities: s.setPreferredCities,
            triple: s.setTriple, language: s.setLanguage, experiences: s.setExperiences,
          },
          originalFullName: sim.originalFullName,
          lastProfileRef: sim.lastProfileRef,
          hydrate: sim.hydrate,
          PER_CARD_EDITING: sim.flagOn ?? false,
          acquireWrite: () => { if (sim.lock.current) return false; sim.lock.current = true; return true },
          releaseWrite: () => { sim.lock.current = false; sim.gen.current++ },
          anyCardLocked: () => CARD_IDS.some((c) => isCardLocked(sim.ui.current[c].status)),
          updateUser: () => {},
          user: {},
          setEditing: () => {},
          window: { setTimeout: () => 0 },
        })()
        return errors
      }
      return sim
    }

    // Hand-written bodies for FULL (saved city c-a; preferred c-b, c-c; see its definition above).
    const ABOUT = '"fullName":"Asha Rao","bio":"I cook.","dateOfBirth":"1990-05-05","gender":"FEMALE"'
    const JOB = '"preferredCategory":"Hospitality","preferredSector":"Kitchen","preferredJobTitle":"Cook","preferredLanguage":"hi"'
    const EXP =
      '"workExperiences":[{"position":"Cook","companyName":"Hotel Sai","startDate":"2018-01-01","endDate":"2020-02-02","currentlyWorking":false,"description":"Made food"},' +
      '{"position":"Chef","startDate":"2020-03-01","currentlyWorking":true}]'
    const body = (home, work) => `{${ABOUT},${home}${work}${JOB},${EXP}}`
    const MYSURU = { id: 'c-z', name: 'Mysuru', stateName: 'Karnataka' }
    const PUNE = { id: 'c-a', name: 'Pune', stateName: 'Maharashtra' }
    const GOA = { id: 'c-n', name: 'Goa', stateName: 'Goa' }

    const scenario = async (name, edit, wantBody) => {
      const sim = newPage(clone(FULL))
      sim.load()
      edit(sim.state)
      const errors = await sim.save()
      expect(`page Save: ${name}: no validation error`, errors, [])
      expect(`page Save: ${name}: the request body`, sim.bodies, [wantBody])
    }
    await scenario('nothing edited sends no city', () => {}, body('', ''))
    await scenario('another home city', (s) => { s.setHomeCity = MYSURU }, body('"cityId":"c-z",', ''))
    await scenario('the saved home city picked again', (s) => { s.setHomeCity = PUNE }, body('', ''))
    await scenario('picker emptied, no Remove', (s) => { s.setHomeCity = null }, body('', ''))
    await scenario('picker emptied and Remove pressed', (s) => { s.setHomeCity = null; s.setHomeCityRemoved = true }, body('"cityId":null,', ''))
    await scenario('one preferred city dropped', (s) => { s.setPreferredCities = s.setPreferredCities.slice(0, 1) }, body('', '"preferredCityIds":["c-b"],'))
    await scenario('preferred cities in another order', (s) => { s.setPreferredCities = [...s.setPreferredCities].reverse() }, body('', ''))
    await scenario('preferred cities emptied', (s) => { s.setPreferredCities = [] }, body('', '"preferredCityIds":[],'))
    await scenario('a new preferred city', (s) => { s.setPreferredCities = [...s.setPreferredCities, GOA] }, body('', '"preferredCityIds":["c-b","c-c","c-n"],'))

    // In-place edits of the form (a push, a renamed id) are still changes against the snapshot. With a
    // shared reference they would also change the baseline, and nothing would be sent.
    await scenario('a city pushed into the preferred list in place', (s) => { s.setPreferredCities.push(GOA) }, body('', '"preferredCityIds":["c-b","c-c","c-n"],'))
    await scenario('the home city edited in place', (s) => { s.setHomeCity.id = 'c-z' }, body('"cityId":"c-z",', ''))
    await scenario('the triple edited in place', (s) => { s.setTriple.category = 'Retail' }, body('', '').replace('"preferredCategory":"Hospitality"', '"preferredCategory":"Retail"'))

    // A blank profile: nothing saved, so a first pick goes out.
    {
      const sim = newPage(profile(null))
      sim.load()
      sim.state.setHomeCity = GOA
      sim.state.setPreferredCities = [GOA]
      await sim.save()
      expect('page Save: a first home and work city on a blank profile', sim.bodies, ['{"cityId":"c-n","preferredCityIds":["c-n"],"preferredLanguage":"en","workExperiences":[]}'])
    }

    // The snapshot follows the server: after a Save the page re-reads the profile, and the NEXT Save is
    // judged against what the server now holds, not against what it held before.
    {
      const sim = newPage(clone(FULL))
      sim.load()
      sim.state.setHomeCity = MYSURU
      sim.state.setPreferredCities = sim.state.setPreferredCities.slice(0, 1)
      // The server accepts the save: its record now has the new cities.
      sim.server = clone(FULL)
      sim.server.jobSeeker.city = cityOf('c-z', 'Mysuru', 'Karnataka')
      sim.server.jobSeeker.preferredCities = [{ city: cityOf('c-b', 'Hyderabad') }]
      await sim.save()
      expect('snapshot update: Save re-reads the profile into the snapshot (home city)', sim.state.setSavedValues.homeCity, MYSURU)
      expect('snapshot update: …and the preferred cities', sim.state.setSavedValues.preferredCities.map((c) => c.id), ['c-b'])
      expect('snapshot update: …and the form shows the same', [sim.state.setHomeCity.id, sim.state.setPreferredCities.map((c) => c.id)], ['c-z', ['c-b']])
      await sim.save()
      expect(
        'snapshot update: a second Save with nothing edited sends no cities',
        sim.bodies[1].includes('cityId') || sim.bodies[1].includes('preferredCityIds'),
        false
      )
      // Picking the OLD city is now a change against the new snapshot.
      sim.state.setHomeCity = PUNE
      await sim.save()
      expect('snapshot update: the old city is a change against the new snapshot', sim.bodies[2].includes('"cityId":"c-a"'), true)
    }

    // A refused Save leaves the snapshot alone, so a retry is judged against the same baseline.
    {
      const sim = newPage(clone(FULL))
      sim.load()
      const before = clone(sim.state.setSavedValues)
      sim.state.setHomeCity = MYSURU
      sim.failPut = true
      await sim.save()
      expect('a refused Save leaves the snapshot as it was', sim.state.setSavedValues, before)
      sim.failPut = false
      await sim.save()
      expect('…and the retry still sends the change', sim.bodies[0].includes('"cityId":"c-z"'), true)
    }

    // A validation problem sends nothing.
    {
      const sim = newPage(clone(FULL))
      sim.load()
      sim.state.setFullName = '1234'
      const errors = await sim.save()
      expect('page Save: a bad name is reported and nothing is sent', [errors, sim.bodies], [['notAName'], []])
    }

    // Before the first load there is no snapshot, and Save does nothing.
    {
      const sim = newPage(clone(FULL))
      sim.state = { setFullName: 'Asha Rao', setBio: '', setDateOfBirth: '', setGender: '', setHomeCity: null, setHomeCityRemoved: false, setPreferredCities: [], setTriple: {}, setLanguage: 'en', setExperiences: [] }
      await sim.save()
      expect('no snapshot yet: Save sends nothing', sim.bodies, [])
    }

    // ---- 3d. A refreshed profile while cards are being edited (PER_CARD_EDITING) ---------------------
    // The REAL refreshProfile() / refreshCards() / hydrateShell() / applyCardValues() are cut out of the
    // page and run against the same stand-in for React state. Every expected value is written out by
    // hand. What this cannot show: that the page's draftRef (refreshed in an effect after each commit)
    // is current in a real browser; here it is modelled as a live read of the stand-in's state. There
    // is no React renderer in this repo to test that with.
    const refreshSrc = cut(page, '  const refreshCards = (p: SeekerProfile) => {', '\n  }\n', 'refreshCards()')
    const refreshProfileSrc = cut(page, '  const refreshProfile = async () => {', '\n  }\n', 'refreshProfile()')
    if (refreshSrc && refreshProfileSrc) {
      const refreshNames = [
        'draftRef', 'savedRef', 'cardUiRef', 'commitSaved', 'draftFromProfile', 'slicesToApply', 'cardActivity', 'rebaseCards', 'hydrate', 'hydrateShell', 'applyCardValues',
        'PER_CARD_EDITING', 'jobSeekerAPI', 'lastProfileRef', 'writeGenRef',
      ]
      const makeRefresh = new Function(
        `${strip(`function make({ ${refreshNames.join(', ')} }) {\n${refreshSrc}\n${refreshProfileSrc}\nreturn refreshProfile\n}`)}\nreturn make`
      )()
      const partsOf = (sim) => {
        const scope = Object.fromEntries(setterNames.map((n) => [n, (v) => { sim.state[n] = v }]))
        Object.assign(scope, {
          useCallback: (fn) => fn,
          newKey: () => 'row-x',
          CARD_IDS,
          draftFromProfile,
          originalFullName: sim.originalFullName,
          cancelLocate: () => { sim.cancelled++; if (sim.lookup) sim.lookup.cancelled = true },
          commitSaved: (v) => sim.commit(v),
          PER_CARD_EDITING: sim.hydrateFlag ?? false,
          resetCards: () => { sim.ui.current = idleCardUi(); sim.unknown.current = {} },
          lookingBusyRef: sim.looking,
        })
        return makeParts_(scope)
      }
      const draftOf = (s) => ({
        fullName: s.setFullName, bio: s.setBio, dateOfBirth: s.setDateOfBirth, gender: s.setGender,
        homeCity: s.setHomeCity, homeCityRemoved: s.setHomeCityRemoved, preferredCities: s.setPreferredCities,
        triple: s.setTriple, language: s.setLanguage, experiences: s.setExperiences,
      })
      // flag: PER_CARD_EDITING. ui: per-card { editing, status } (default idle). duringFetch: what the
      // seeker does while the request is in flight.
      const refresh = async (sim, newer, { flag = true, ui = {}, uiRef = null, duringFetch = () => {}, reads = null } = {}) => {
        const parts = partsOf(sim)
        sim.lastProfileRef = { current: null }
        sim.reads = 0
        const jobSeekerAPI = { getProfile: async () => { sim.reads++; duringFetch(sim.state); return reads ? reads[Math.min(sim.reads, reads.length) - 1] : newer } }
        // Read when the page reads it, i.e. after the fetch, from what the form holds then. The card
        // state is the page's synchronous ref (uiRef) when the test has one.
        const draftRef = {
          get current() {
            return draftOf(sim.state)
          },
        }
        const cardUiRef = uiRef ?? { current: { ...idleCardUi(), ...ui } }
        const run = makeRefresh({
          draftRef, savedRef: sim.savedRef, cardUiRef, commitSaved: sim.commit,
          draftFromProfile, slicesToApply, cardActivity, rebaseCards, ...parts,
          PER_CARD_EDITING: flag, jobSeekerAPI, lastProfileRef: sim.lastProfileRef, writeGenRef: sim.gen,
        })
        const got = await run()
        sim.fetched = got
        return got
      }

      // What the server held when the page loaded is FULL (see its definition). It now holds NEWER.
      const NEWER = clone(FULL)
      NEWER.email = 'new@example.com'
      NEWER.preferredLanguage = 'ta'
      NEWER.jobSeeker.fullName = 'Asha Rao Sharma'
      NEWER.jobSeeker.bio = 'I bake.'
      NEWER.jobSeeker.gender = 'MALE'
      NEWER.jobSeeker.city = cityOf('c-z', 'Mysuru', 'Karnataka')
      NEWER.jobSeeker.preferredCities = [{ city: cityOf('c-n', 'Goa', 'Goa') }]
      NEWER.jobSeeker.preferredCategory = 'Retail'
      NEWER.jobSeeker.preferredSector = 'Shop'
      NEWER.jobSeeker.preferredJobTitle = 'Clerk'
      NEWER.jobSeeker.workExperience = [
        { position: 'Driver', companyName: 'Om Travels', startDate: '2021-01-01T00:00:00.000Z', endDate: null, currentlyWorking: true, description: null },
      ]
      // The form fields (setter name -> value) each card shows, before and after.
      const NEW_VALUES = {
        about: { setFullName: 'Asha Rao Sharma', setBio: 'I bake.', setDateOfBirth: '1990-05-05', setGender: 'MALE' },
        home: { setHomeCity: MYSURU, setLocation: 'Old Town', setHomeCityRemoved: false },
        workCities: { setPreferredCities: [GOA] },
        job: { setTriple: { category: 'Retail', sector: 'Shop', jobTitle: 'Clerk' }, setLanguage: 'ta' },
        experience: {
          setExperiences: [
            { key: 'row-x', position: 'Driver', companyName: 'Om Travels', startDate: '2021-01-01', endDate: '', currentlyWorking: true, description: '' },
          ],
        },
      }
      const OLD_VALUES = {
        about: { setFullName: 'Asha Rao', setBio: 'I cook.', setDateOfBirth: '1990-05-05', setGender: 'FEMALE' },
        home: { setHomeCity: PUNE, setLocation: 'Old Town', setHomeCityRemoved: false },
        workCities: { setPreferredCities: [{ id: 'c-b', name: 'Hyderabad', stateName: 'Telangana' }, { id: 'c-c', name: 'Chennai', stateName: 'Tamil Nadu' }] },
        job: { setTriple: { category: 'Hospitality', sector: 'Kitchen', jobTitle: 'Cook' }, setLanguage: 'hi' },
        experience: {
          setExperiences: [
            { key: 'row-x', position: 'Cook', companyName: 'Hotel Sai', startDate: '2018-01-01', endDate: '2020-02-02', currentlyWorking: false, description: 'Made food' },
            { key: 'row-x', position: 'Chef', companyName: '', startDate: '2020-03-01', endDate: '', currentlyWorking: true, description: '' },
          ],
        },
      }
      // The snapshot's slice for each card, before and after.
      const SAVED_NEW = {
        about: { fullName: 'Asha Rao Sharma', bio: 'I bake.', dateOfBirth: '1990-05-05', gender: 'MALE' },
        home: { homeCity: MYSURU, location: 'Old Town' },
        workCities: { preferredCities: [GOA] },
        job: { triple: { category: 'Retail', sector: 'Shop', jobTitle: 'Clerk' }, language: 'ta' },
        experience: { experiences: [{ position: 'Driver', companyName: 'Om Travels', startDate: '2021-01-01', endDate: '', currentlyWorking: true, description: '' }] },
      }
      const SAVED_OLD = {
        about: { fullName: 'Asha Rao', bio: 'I cook.', dateOfBirth: '1990-05-05', gender: 'FEMALE' },
        home: { homeCity: PUNE, location: 'Old Town' },
        workCities: { preferredCities: [{ id: 'c-b', name: 'Hyderabad', stateName: 'Telangana' }, { id: 'c-c', name: 'Chennai', stateName: 'Tamil Nadu' }] },
        job: { triple: { category: 'Hospitality', sector: 'Kitchen', jobTitle: 'Cook' }, language: 'hi' },
        experience: { experiences: [
          { position: 'Cook', companyName: 'Hotel Sai', startDate: '2018-01-01', endDate: '2020-02-02', currentlyWorking: false, description: 'Made food' },
          { position: 'Chef', companyName: '', startDate: '2020-03-01', endDate: '', currentlyWorking: true, description: '' },
        ] },
      }
      const savedSlice = (snap, card) => {
        switch (card) {
          case 'about': return { fullName: snap.fullName, bio: snap.bio, dateOfBirth: snap.dateOfBirth, gender: snap.gender }
          case 'home': return { homeCity: snap.homeCity, location: snap.location }
          case 'workCities': return { preferredCities: snap.preferredCities }
          case 'job': return { triple: snap.triple, language: snap.language }
          case 'experience': return { experiences: snap.experiences }
        }
      }
      // `fresh`: the cards that must show / be judged against the NEW values; the rest, the old ones.
      const wantForm = (fresh) => Object.fromEntries(CARD_IDS.map((c) => [c, (fresh.includes(c) ? NEW_VALUES : OLD_VALUES)[c]]))
      const wantSaved = (fresh) => Object.fromEntries(CARD_IDS.map((c) => [c, (fresh.includes(c) ? SAVED_NEW : SAVED_OLD)[c]]))
      const gotForm = (sim) => Object.fromEntries(CARD_IDS.map((c) => [c, Object.fromEntries(Object.keys(NEW_VALUES[c]).map((k) => [k, sim.state[k]]))]))
      const gotSaved = (sim) => Object.fromEntries(CARD_IDS.map((c) => [c, savedSlice(sim.state.setSavedValues, c)]))
      // A loaded page whose form holds the old values.
      const loaded = () => {
        const sim = newPage(clone(FULL))
        sim.cancelled = 0
        sim.load()
        sim.cancelled = 0
        return sim
      }
      const without = (xs, x) => xs.filter((c) => c !== x)

      // 1. Nothing edited: every card takes the new values, and so does the page around them.
      {
        const sim = loaded()
        const got = await refresh(sim, clone(NEWER))
        expect('refresh, all idle: every card shows the new values', gotForm(sim), wantForm(CARD_IDS))
        expect('refresh, all idle: the snapshot is the new values', gotSaved(sim), wantSaved(CARD_IDS))
        expect('refresh, all idle: the page-wide fields are replaced', sim.state.setEmail, 'new@example.com')
        expect('refresh remembers the fetched profile for Cancel', sim.lastProfileRef.current === got, true)
        expect('refresh, all idle: the location lookup was ended once (home applied)', sim.cancelled, 1)
      }

      // 2. A card with changes keeps its draft AND its baseline. The other cards, untouched, are judged
      //    against the OLD snapshot, so they still count as clean and take the new values; judged against
      //    the fresh snapshot they would all look changed and none would refresh.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { duringFetch: (s) => { s.setBio = 'my own bio' } })
        const form = gotForm(sim)
        expect('refresh, about edited: its draft survives', form.about, { setFullName: 'Asha Rao', setBio: 'my own bio', setDateOfBirth: '1990-05-05', setGender: 'FEMALE' })
        expect('refresh, about edited: the other four cards take the new values', { ...form, about: 0 }, { ...wantForm(without(CARD_IDS, 'about')), about: 0 })
        expect('refresh, about edited: its baseline stays the OLD snapshot, the others are new', gotSaved(sim), wantSaved(without(CARD_IDS, 'about')))
        expect('refresh, about edited: the original name (name rule) is still the old stored name', sim.originalFullName.current, 'Asha Rao')
        expect('refresh, about edited: the location lookup is still ended once (home applied)', sim.cancelled, 1)
      }
      // The edit made while the request was in flight is what is protected, not the form as it was
      // when the request started. Without such an edit the card is applied.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER))
        expect('refresh, no edit during the fetch: about is applied', gotForm(sim).about, NEW_VALUES.about)
      }

      // 3. Typed text that equals what the server now holds is still a change against the old snapshot.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { duringFetch: (s) => { s.setBio = 'I bake.' } })
        expect('refresh, the draft equals the NEW server value: still a change, still kept', [sim.state.setBio, gotSaved(sim).about.bio], ['I bake.', 'I cook.'])
      }

      // 4. A card in edit mode keeps its draft although it compares clean; so does its baseline.
      for (const card of CARD_IDS) {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { ui: { [card]: { editing: true, status: 'idle' } } })
        const fresh = without(CARD_IDS, card)
        expect(`refresh, ${card} active but unchanged: it keeps the old values, the rest are new`, gotForm(sim), wantForm(fresh))
        expect(`refresh, ${card} active but unchanged: its baseline stays old`, gotSaved(sim), wantSaved(fresh))
      }

      // 5. A card whose save is in flight keeps its draft and its baseline.
      for (const card of CARD_IDS) {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { ui: { [card]: { editing: false, status: 'saving' } } })
        const fresh = without(CARD_IDS, card)
        expect(`refresh, ${card} saving: it keeps its draft, the rest are new`, gotForm(sim), wantForm(fresh))
        expect(`refresh, ${card} saving: its baseline stays old`, gotSaved(sim), wantSaved(fresh))
      }
      // A card that has finished saving (or failed) and is neither editing nor changed may refresh.
      for (const status of ['saved', 'error', 'idle']) {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { ui: { job: { editing: false, status } } })
        expect(`refresh, job status "${status}", not editing, unchanged: it refreshes`, gotForm(sim).job, NEW_VALUES.job)
      }

      // 6. Two cards with changes: both survive, and refreshing the rest touches neither.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), {
          duringFetch: (s) => {
            s.setLanguage = 'kn'
            s.setPreferredCities = s.setPreferredCities.slice(0, 1)
          },
        })
        expect(
          'refresh, job and work cities edited: both drafts survive',
          [sim.state.setLanguage, sim.state.setPreferredCities.map((c) => c.id), sim.state.setTriple],
          ['kn', ['c-b'], { category: 'Hospitality', sector: 'Kitchen', jobTitle: 'Cook' }]
        )
        const form = gotForm(sim)
        expect(
          'refresh, job and work cities edited: the three others refresh',
          { about: form.about, home: form.home, experience: form.experience },
          { about: NEW_VALUES.about, home: NEW_VALUES.home, experience: NEW_VALUES.experience }
        )
        expect('refresh, job and work cities edited: only those two keep the old baseline', gotSaved(sim), wantSaved(['about', 'home', 'experience']))
      }

      // 7. The home card: Remove pressed is a change, kept with its flag; the lookup is not ended.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { duringFetch: (s) => { s.setHomeCity = null; s.setHomeCityRemoved = true } })
        expect('refresh, home Remove pressed: city and flag survive', [sim.state.setHomeCity, sim.state.setHomeCityRemoved], [null, true])
        expect('refresh, home Remove pressed: the lookup is not ended', sim.cancelled, 0)
        expect('refresh, home Remove pressed: baseline stays the old city', gotSaved(sim).home, SAVED_OLD.home)
      }

      // 8. A kept card is still judged against its OLD baseline by the next Save: a stale draft that the
      //    seeker did not change sends nothing (it cannot overwrite what the server now holds), and a
      //    real change is still sent.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { ui: { workCities: { editing: true, status: 'idle' } } })
        sim.server = clone(NEWER)
        await sim.save()
        expect('after refresh, an active but unchanged card sends nothing for itself', sim.bodies[0].includes('preferredCityIds'), false)
      }
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { duringFetch: (s) => { s.setPreferredCities = s.setPreferredCities.slice(0, 1) } })
        sim.server = clone(NEWER)
        await sim.save()
        expect('after refresh, a changed card still sends its change', sim.bodies[0].includes('"preferredCityIds":["c-b"]'), true)
      }

      // 9. Isolation after a refresh: draft and snapshot share no object or array.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { duringFetch: (s) => { s.setBio = 'my own bio' } })
        const form = () => ({ homeCity: sim.state.setHomeCity, preferredCities: sim.state.setPreferredCities, triple: sim.state.setTriple, experiences: sim.state.setExperiences })
        const snap = sim.state.setSavedValues
        expect('refresh: applied cards share nothing with the snapshot', [
          form().homeCity === snap.homeCity,
          form().preferredCities === snap.preferredCities,
          form().preferredCities.some((c, i) => c === snap.preferredCities[i]),
          form().triple === snap.triple,
          form().experiences.some((r, i) => r === snap.experiences[i]),
        ], [false, false, false, false, false])
        const before = clone(snap)
        form().preferredCities.push({ id: 'x', name: 'x' })
        form().homeCity.id = 'edited'
        form().triple.category = 'edited'
        form().experiences[0].position = 'edited'
        expect('refresh: editing the form in place leaves the snapshot alone', snap, before)
        const formBefore = clone(form())
        snap.preferredCities.push({ id: 'y', name: 'y' })
        snap.homeCity.name = 'edited'
        snap.triple.sector = 'edited'
        snap.experiences[0].position = 'edited'
        expect('refresh: editing the snapshot in place leaves the form alone', form(), formBefore)
      }
      // The kept cards' drafts and baselines are not mixed up either.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), { ui: { job: { editing: true, status: 'idle' } } })
        const kept = sim.state.setTriple
        const snapTriple = sim.state.setSavedValues.triple
        expect('refresh: a kept card\'s draft and baseline are still separate objects', kept !== snapTriple, true)
      }
      // The fetched profile object is not kept by either side.
      {
        const sim = loaded()
        const newer = clone(NEWER)
        await refresh(sim, newer)
        newer.jobSeeker.preferredCities.push({ city: cityOf('c-q') })
        newer.jobSeeker.workExperience[0].position = 'edited'
        expect(
          'refresh: changing the fetched profile afterwards changes neither side',
          [sim.state.setPreferredCities.length, sim.state.setSavedValues.preferredCities.length, sim.state.setExperiences[0].position, sim.state.setSavedValues.experiences[0].position],
          [1, 1, 'Driver', 'Driver']
        )
      }

      // 10. Nothing loaded yet: there is nothing to protect, so the whole form is loaded.
      {
        const sim = newPage(clone(FULL))
        sim.cancelled = 0
        await refresh(sim, clone(NEWER))
        expect('refresh before the first load: loads everything', [gotForm(sim), gotSaved(sim)], [wantForm(CARD_IDS), wantSaved(CARD_IDS)])
      }

      // 11. Flag off: the refreshed profile replaces the whole form, edits and all, as it always did.
      {
        const sim = loaded()
        await refresh(sim, clone(NEWER), {
          flag: false,
          duringFetch: (s) => { s.setBio = 'my own bio' },
          ui: { job: { editing: true, status: 'saving' } },
        })
        expect('flag off: a refresh replaces every card, even one with changes', gotForm(sim), wantForm(CARD_IDS))
        expect('flag off: the snapshot is the new profile', gotSaved(sim), wantSaved(CARD_IDS))
      }

      // ---- 3e. One card's Save and Cancel, the shared write lock, and the actively-looking switch ----
      // The REAL acquireWrite / releaseWrite / setCardState / cancelCard / saveCard and
      // toggleActivelyLooking are cut out of the page. setCardUi (the render) is a recorder that never
      // renders, so reading sim.ui.current right after a call shows what async code would see before
      // React has done anything. Request bodies are written out by hand. NOT covered: the real React
      // render, and the controls (there are none yet).
      const cardSrc = cut(page, '  const acquireWrite = () => {', '      releaseWrite()\n    }\n  }\n', 'saveCard()')
      const toggleSrc = cut(page, '  const toggleActivelyLooking = async (next: boolean) => {', '\n  }\n', 'toggleActivelyLooking()')
      if (cardSrc && toggleSrc) {
        const cardNames = [
          'writeLockRef', 'cardUiRef', 'setCardUi', 'savedRef', 'applyCardValues', 'hydrateShell', 'commitSaved', 'aboutProblem', 'draft',
          'originalFullName', 'ABOUT_PROBLEM_KEY', 't', 'cardPatch', 'patchIsEmpty', 'rebaseCards', 'draftFromProfile', 'saveFailureKind', 'writeGenRef',
          'jobSeekerAPI', 'lastProfileRef', 'updateUser', 'user', 'lookingBusyRef', 'saving', 'activelyLooking', 'setLookingBusy',
          'setActivelyLooking', 'showToast', 'PROFILE_READ_TIMEOUT_MS', 'PROFILE_WRITE_TIMEOUT_MS', 'bodyLanded', 'cardDirty', 'isCardLocked',
          'setWriteBusy', 'unknownBodyRef', 'PER_CARD_EDITING', 'cardUi', 'writeBusy', 'CARD_IDS', 'cancelLocate', 'draftRef', 'sameCardDraft',
          'focusIntentRef', 'focusTokenRef', 'focusTargetAfter',
        ]
        const makeCard = new Function(
          `${strip(`function make({ ${cardNames.join(', ')} }) {\n${cardSrc}\n${toggleSrc}\nreturn { acquireWrite, releaseWrite, setCardState, cardBusy, anyCardLocked, pageSaveBlocked, cancelCard, holdUnknown, settleCard, syncCard, checkCard, saveCard, toggleActivelyLooking }\n}`)}\nreturn make`
        )()
        const deferred = () => {
          let resolve
          const promise = new Promise((r) => { resolve = r })
          return { promise, resolve }
        }
        // The page as it is at the moment of a click: the draft is the render's, the refs are live.
        const cardsOf = (sim, api, { flag = true, updateUserThrows = false } = {}) => {
          const parts = partsOf(sim)
          sim.puts = sim.puts ?? []
          sim.toasts = sim.toasts ?? []
          sim.userUpdates = sim.userUpdates ?? []
          return makeCard({
            writeLockRef: sim.lock, cardUiRef: sim.ui, setCardUi: () => {}, savedRef: sim.savedRef,
            applyCardValues: parts.applyCardValues, hydrateShell: parts.hydrateShell, commitSaved: sim.commit,
            aboutProblem, draft: draftOf(sim.state), originalFullName: sim.originalFullName,
            ABOUT_PROBLEM_KEY: { nameTooShort: 'tooShort', nameNotAName: 'notAName', dobUnder18: 'under18' },
            t: (k) => k, cardPatch, patchIsEmpty, rebaseCards, draftFromProfile, saveFailureKind, writeGenRef: sim.gen,
            jobSeekerAPI: api, lastProfileRef: sim.lastProfileRef, updateUser: (u) => { if (updateUserThrows) throw new Error('header update failed'); sim.userUpdates.push(u) }, user: { profile: {} },
            lookingBusyRef: sim.looking, saving: false, activelyLooking: sim.state.setActivelyLooking ?? false,
            setLookingBusy: () => {}, setActivelyLooking: (v) => { sim.state.setActivelyLooking = v },
            showToast: (_m, kind) => sim.toasts.push(kind),
            PROFILE_READ_TIMEOUT_MS, PROFILE_WRITE_TIMEOUT_MS, bodyLanded, cardDirty, isCardLocked,
            setWriteBusy: () => {}, unknownBodyRef: sim.unknown, PER_CARD_EDITING: flag, cardUi: sim.ui.current,
            writeBusy: sim.lock.current, CARD_IDS, sameCardDraft,
            cancelLocate: () => { sim.cancelled = (sim.cancelled ?? 0) + 1; if (sim.lookup) sim.lookup.cancelled = true },
            draftRef: { get current() { return draftOf(sim.state) } },
            focusIntentRef: (sim.focusIntent = sim.focusIntent ?? { current: null }),
            focusTokenRef: (sim.focusToken = sim.focusToken ?? { current: Object.fromEntries(CARD_IDS.map((c) => [c, 0])) }),
            focusTargetAfter,
          })
        }
        // A fake server. gate: hold the PUT in flight until released. afterPut: what GET returns once saved.
        const fakeApi = (sim, { gate, getGate, putError, getError, afterPut, reply } = {}) => {
          sim.puts = sim.puts ?? []
          sim.putOpts = sim.putOpts ?? []
          sim.gets = sim.gets ?? []
          return {
            updateProfile: async (b, opts) => {
              sim.puts.push(JSON.stringify(b))
              sim.putOpts.push(opts)
              if (gate) await gate.promise
              if (putError) throw putError
            },
            getProfile: async (opts) => {
              sim.gets.push(opts)
              if (getGate) await getGate.promise
              if (getError) throw getError
              if (reply !== undefined) return reply
              return afterPut ?? sim.server
            },
          }
        }
        const stateOf = (sim) => ({ draft: draftOf(sim.state), saved: clone(sim.savedRef.current) })
        const boom = new ApiError('boom', 400) // the server answered: a definite refusal
        const consent = new ApiError('Accept the terms', 403, undefined, undefined, 'CONSENT_REQUIRED')

        // 1. Each card sends exactly its own part of the body, judged against the snapshot.
        const cardBody = async (card, edit) => {
          const sim = loaded()
          edit(sim.state)
          await cardsOf(sim, fakeApi(sim)).saveCard(card)
          return sim.puts
        }
        expect('card Save, about: only about keys', await cardBody('about', (s) => { s.setBio = 'new bio' }),
          ['{"fullName":"Asha Rao","bio":"new bio","dateOfBirth":"1990-05-05","gender":"FEMALE"}'])
        expect('card Save, about: an emptied bio is left out, not sent as empty', await cardBody('about', (s) => { s.setBio = '' }),
          ['{"fullName":"Asha Rao","dateOfBirth":"1990-05-05","gender":"FEMALE"}'])
        expect('card Save, home: another city', await cardBody('home', (s) => { s.setHomeCity = MYSURU }), ['{"cityId":"c-z"}'])
        expect('card Save, home: Remove', await cardBody('home', (s) => { s.setHomeCity = null; s.setHomeCityRemoved = true }), ['{"cityId":null}'])
        expect('card Save, work cities: one dropped', await cardBody('workCities', (s) => { s.setPreferredCities = s.setPreferredCities.slice(0, 1) }),
          ['{"preferredCityIds":["c-b"]}'])
        expect('card Save, work cities: emptied on purpose', await cardBody('workCities', (s) => { s.setPreferredCities = [] }), ['{"preferredCityIds":[]}'])
        expect('card Save, job: all four', await cardBody('job', (s) => { s.setTriple = { category: 'Retail', sector: 'Shop', jobTitle: 'Clerk' }; s.setLanguage = 'ta' }),
          ['{"preferredCategory":"Retail","preferredSector":"Shop","preferredJobTitle":"Clerk","preferredLanguage":"ta"}'])
        expect('card Save, job: an emptied category is left out', await cardBody('job', (s) => { s.setTriple = {} }), ['{"preferredLanguage":"hi"}'])
        expect(
          'card Save, experience: a current job never sends an end date',
          await cardBody('experience', (s) => {
            s.setExperiences = s.setExperiences.map((r, i) => (i === 0 ? { ...r, description: 'Made it' } : { ...r, endDate: '2022-01-01' }))
          }),
          ['{"workExperiences":[{"position":"Cook","companyName":"Hotel Sai","startDate":"2018-01-01","endDate":"2020-02-02","currentlyWorking":false,"description":"Made it"},{"position":"Chef","startDate":"2020-03-01","currentlyWorking":true}]}']
        )

        // 2. Cancel restores one card from the snapshot and leaves the others' drafts alone.
        {
          const sim = loaded()
          sim.state.setBio = 'my bio'
          sim.state.setLanguage = 'kn'
          sim.state.setHomeCity = null
          sim.state.setHomeCityRemoved = true
          sim.state.setExperiences = []
          sim.cancelled = 0
          const snapBefore = clone(sim.savedRef.current)
          sim.ui.current = { ...sim.ui.current, about: { editing: true, status: 'idle', error: '' }, home: { editing: true, status: 'idle', error: '' } }
          const cards = cardsOf(sim, fakeApi(sim))
          cards.cancelCard('about')
          expect('card Cancel, about: its fields are back', gotForm(sim).about, OLD_VALUES.about)
          expect('card Cancel, about: the other cards keep their drafts', [sim.state.setLanguage, sim.state.setHomeCity, sim.state.setHomeCityRemoved, sim.state.setExperiences], ['kn', null, true, []])
          expect('card Cancel, about: it leaves edit mode', sim.ui.current.about, { editing: false, status: 'idle', error: '', note: '' })
          expect('card Cancel, about: home is still editing', sim.ui.current.home.editing, true)
          expect('card Cancel, about: the baseline is untouched', sim.savedRef.current, snapBefore)
          expect('card Cancel, about: the lookup was not ended', sim.cancelled, 0)
          cards.cancelCard('home')
          expect('card Cancel, home: the saved city and the Remove flag are back', [sim.state.setHomeCity, sim.state.setHomeCityRemoved], [PUNE, false])
          expect('card Cancel, home: a running lookup is ended', sim.cancelled, 1)
          expect('card Cancel, home: the job and experience drafts are still the seeker\'s', [sim.state.setLanguage, sim.state.setExperiences], ['kn', []])
          cards.cancelCard('experience')
          expect('card Cancel, experience: rows are back, a current job has no end date', gotForm(sim).experience, OLD_VALUES.experience)
          expect('card Cancel, experience: the job language is still kn', sim.state.setLanguage, 'kn')
          expect('card Cancel: no request was made', sim.puts ?? [], [])
          // The other server profile has nothing to do with it: Cancel reads the snapshot, not lastProfileRef.
          const sim2 = loaded()
          sim2.lastProfileRef.current = clone(NEWER)
          sim2.state.setBio = 'x'
          cardsOf(sim2, fakeApi(sim2)).cancelCard('about')
          expect('card Cancel does not use lastProfileRef', sim2.state.setBio, 'I cook.')
          // A card whose save is in flight is not cancelled.
          const sim3 = loaded()
          sim3.state.setBio = 'x'
          sim3.ui.current = { ...sim3.ui.current, about: { editing: true, status: 'saving', error: '' } }
          cardsOf(sim3, fakeApi(sim3)).cancelCard('about')
          expect('card Cancel: ignored while that card is saving', [sim3.state.setBio, sim3.ui.current.about.status], ['x', 'saving'])
        }

        // 3. A successful save moves only the saved card's baseline and form; it is not a full hydrate.
        {
          const sim = loaded()
          sim.state.setBio = 'mine'
          sim.state.setLanguage = 'kn'
          sim.state.setExperiences = []
          const afterPut = clone(FULL)
          afterPut.jobSeeker.bio = 'mine'
          afterPut.jobSeeker.updatedAt = '2026-10-30T10:00:00.000Z'
          afterPut.preferredLanguage = 'ta' // changed elsewhere meanwhile; the job card is not being saved
          afterPut.jobSeeker.workExperience = [] // likewise for experience
          const cards = cardsOf(sim, fakeApi(sim, { afterPut }))
          await cards.saveCard('about')
          expect('card Save ok: the request was this card\'s body', sim.puts, ['{"fullName":"Asha Rao","bio":"mine","dateOfBirth":"1990-05-05","gender":"FEMALE"}'])
          expect('card Save ok: about shows the server values', gotForm(sim).about, { ...OLD_VALUES.about, setBio: 'mine' })
          expect('card Save ok: only about\'s baseline moved', gotSaved(sim), { ...wantSaved([]), about: { ...SAVED_OLD.about, bio: 'mine' } })
          expect('card Save ok: the job draft survives and keeps its old baseline', [sim.state.setLanguage, gotSaved(sim).job.language], ['kn', 'hi'])
          expect('card Save ok: the experience draft survives', sim.state.setExperiences, [])
          expect('card Save ok: the card leaves edit mode as saved', sim.ui.current.about, { editing: false, status: 'saved', error: '', note: '' })
          expect('card Save ok: the write lock is released', sim.lock.current, false)
          expect('card Save ok: the page-wide "updated at" follows', sim.state.setProfileUpdatedAt, '2026-10-30T10:00:00.000Z')
          expect('card Save ok: the header user is updated for the About card', sim.userUpdates.map((u) => u.profile.fullName), ['Asha Rao'])
          expect('card Save ok: lastProfileRef holds the fetched profile', sim.lastProfileRef.current === afterPut, true)
          // The saved card is clean now; the others are still dirty against their own baselines.
          const live = stateOf(sim)
          expect('card Save ok: the saved card compares clean, the two edited ones stay dirty',
            CARD_IDS.filter((c) => cardDirty(c, live.draft, live.saved)), ['job', 'experience'])
          // Saving the job card afterwards does not touch the about card.
          await cardsOf(sim, fakeApi(sim, { afterPut: clone(afterPut) })).saveCard('job')
          expect('card Save ok: a second card saves the same way', [sim.puts[1], sim.ui.current.job.status], ['{"preferredCategory":"Hospitality","preferredSector":"Kitchen","preferredJobTitle":"Cook","preferredLanguage":"kn"}', 'saved'])
        }

        // 3b. A profile read that was out while a write finished is read again, so it cannot put the old
        //     values back over a card that just saved.
        {
          const sim = loaded()
          const stale = clone(FULL) // what the server said before the save landed
          const current = clone(NEWER)
          await refresh(sim, current, { reads: [stale, current], duringFetch: () => { if (sim.reads === 1) sim.gen.current++ } })
          expect('refresh over a finished write: read twice, the second read is used', [sim.reads, sim.lastProfileRef.current === current], [2, true])
          expect('refresh over a finished write: the form shows the second read', gotForm(sim), wantForm(CARD_IDS))
          const sim2 = loaded()
          await refresh(sim2, clone(NEWER))
          expect('refresh with no write in between: read once', sim2.reads, 1)
          const sim3 = loaded()
          await refresh(sim3, clone(NEWER), { flag: false, reads: [clone(NEWER), clone(FULL)], duringFetch: () => { sim3.gen.current++ } })
          expect('flag off: never read twice', sim3.reads, 1)
          // A card save and the switch each count as a finished write, successful or not.
          const sim4 = loaded()
          sim4.state.setBio = 'mine'
          const before = sim4.gen.current
          await cardsOf(sim4, fakeApi(sim4, { putError: boom })).saveCard('about')
          const afterSave = sim4.gen.current
          await cardsOf(sim4, fakeApi(sim4)).toggleActivelyLooking(true)
          expect('the write counter moves once per card save and once per switch write, even when refused', [before, afterSave, sim4.gen.current], [0, 1, 2])
          const sim7 = loaded()
          sim7.state.setFullName = '1234'
          await cardsOf(sim7, fakeApi(sim7)).saveCard('about')
          expect('a save that was never sent (bad name) does not count', sim7.gen.current, 0)
        }

        // 4. The lock: one write at a time, and the card's state is visible before React renders.
        {
          const sim = loaded()
          const gate = deferred()
          const api = fakeApi(sim, { gate })
          sim.state.setBio = 'mine'
          const cards = cardsOf(sim, api)
          const first = cards.saveCard('about') // runs to its first await
          expect('lock: taken before the request returns', sim.lock.current, true)
          expect('card state: "saving" is visible at once, with no render in between', sim.ui.current.about.status, 'saving')
          // The seeker's draft goes back to the saved value, so the card compares clean and is not in
          // edit mode: only its "saving" status protects it from a refresh that lands now.
          sim.state.setBio = 'I cook.'
          await refresh(sim, clone(NEWER), { uiRef: sim.ui })
          expect('card state: a refresh in that window keeps the saving card', gotForm(sim).about, OLD_VALUES.about)
          expect('card state: …and refreshes the other four', { ...gotForm(sim), about: 0 }, { ...wantForm(without(CARD_IDS, 'about')), about: 0 })
          // Nothing else can write. (Started, not awaited: with a broken lock they would wait on the gate.)
          sim.state.setActivelyLooking = false
          sim.state.setLanguage = 'kn' // the job card has something to send, so only the lock stops it
          const others = [
            cardsOf(sim, api).saveCard('job'),
            cardsOf(sim, api).saveCard('about'),
            cardsOf(sim, api).toggleActivelyLooking(true),
          ]
          await new Promise((r) => setTimeout(r, 0))
          expect('lock: a second card save, a repeat save and the switch send nothing', sim.puts.length, 1)
          expect('lock: …and the other card did not enter "saving"', sim.ui.current.job.status, 'idle')
          expect('lock: …and the switch did not move', sim.state.setActivelyLooking, false)
          gate.resolve()
          await first
          await Promise.all(others)
          expect('lock: released when the save finishes', sim.lock.current, false)
          await cardsOf(sim, fakeApi(sim)).saveCard('job')
          expect('lock: the next write goes through', sim.puts.length, 2)
        }
        {
          // A refused or failed write releases the lock and keeps draft and baseline.
          const sim = loaded()
          sim.state.setBio = 'mine'
          const before = stateOf(sim)
          await cardsOf(sim, fakeApi(sim, { putError: boom })).saveCard('about')
          expect('failed save: the card shows the error', sim.ui.current.about, { editing: false, status: 'error', error: 'boom', note: '' })
          expect('failed save: the lock is released', sim.lock.current, false)
          expect('failed save: draft and baseline are as they were', stateOf(sim), before)
          expect('failed save: no profile was re-read, so lastProfileRef is as it was', sim.lastProfileRef.current === null || sim.lastProfileRef.current === undefined, true)
          const afterPut = clone(FULL)
          afterPut.jobSeeker.bio = 'mine'
          await cardsOf(sim, fakeApi(sim, { afterPut })).saveCard('about')
          expect('failed save: a retry succeeds', [sim.ui.current.about.status, gotSaved(sim).about.bio], ['saved', 'mine'])
        }
        {
          // A name the rule refuses is reported without taking the lock or sending anything.
          const sim = loaded()
          sim.state.setFullName = '1234'
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          expect('card Save, bad name: reported, nothing sent, lock free', [sim.ui.current.about.error, sim.puts, sim.lock.current], ['notAName', [], false])
        }

        // 5. Consent required is not a save.
        {
          const sim = loaded()
          sim.state.setBio = 'mine'
          const before = stateOf(sim)
          const api = fakeApi(sim, { putError: consent, afterPut: Object.assign(clone(FULL), {}) })
          await cardsOf(sim, api).saveCard('about')
          expect('consent required: not "saved", no error shown (ConsentGate takes over)', sim.ui.current.about, { editing: false, status: 'idle', error: '', note: '' })
          expect('consent required: draft and baseline unchanged, nothing re-read', [stateOf(sim), sim.lastProfileRef.current == null], [before, true])
          expect('consent required: the lock is released', sim.lock.current, false)
          // …and the same card saves once it is accepted.
          const afterPut = clone(FULL)
          afterPut.jobSeeker.bio = 'mine'
          await cardsOf(sim, fakeApi(sim, { afterPut })).saveCard('about')
          expect('consent required: after accepting, the retry saves', sim.ui.current.about.status, 'saved')
          // Any other 403 is an ordinary failure.
          const sim2 = loaded()
          sim2.state.setBio = 'mine'
          await cardsOf(sim2, fakeApi(sim2, { putError: new ApiError('Forbidden', 403, undefined, undefined, 'FORBIDDEN') })).saveCard('about')
          expect('other 403s are errors', [sim2.ui.current.about.status, sim2.ui.current.about.error], ['error', 'Forbidden'])
        }

        // 6. The actively-looking switch: its own body, the lock, and a failure that restores it.
        {
          const sim = loaded()
          sim.state.setActivelyLooking = false
          await cardsOf(sim, fakeApi(sim)).toggleActivelyLooking(true)
          expect('switch: only its own key is sent, the switch moves, success toast', [sim.puts, sim.state.setActivelyLooking, sim.toasts], [['{"isActivelyLooking":true}'], true, ['success']])
          expect('switch: lock and busy flag released', [sim.lock.current, sim.looking.current], [false, false])
          const sim2 = loaded()
          sim2.state.setActivelyLooking = false
          await cardsOf(sim2, fakeApi(sim2, { putError: boom })).toggleActivelyLooking(true)
          expect('switch failed: back to what it was, error toast, lock released', [sim2.state.setActivelyLooking, sim2.toasts, sim2.lock.current, sim2.looking.current], [false, ['error'], false, false])
          // A card save holds the lock: the switch is refused; and the reverse.
          const sim3 = loaded()
          sim3.state.setActivelyLooking = false
          const gate = deferred()
          const api3 = fakeApi(sim3, { gate })
          const toggling = cardsOf(sim3, api3).toggleActivelyLooking(true)
          sim3.state.setBio = 'mine'
          const blocked = cardsOf(sim3, api3).saveCard('about')
          await new Promise((r) => setTimeout(r, 0))
          expect('switch in flight: a card save sends nothing and the card stays idle', [sim3.puts, sim3.ui.current.about.status], [['{"isActivelyLooking":true}'], 'idle'])
          gate.resolve()
          await toggling
          await blocked
          expect('switch done: lock released, then the card saves', sim3.lock.current, false)
        }

        // ---- Step 3B -------------------------------------------------------------------------------
        const SENT_BIO = '{"fullName":"Asha Rao","bio":"mine","dateOfBirth":"1990-05-05","gender":"FEMALE"}'
        const serverWithBio = (bio) => {
          const p = clone(FULL)
          p.jobSeeker.bio = bio
          return p
        }
        const bioDraft = () => {
          const sim = loaded()
          sim.state.setBio = 'mine'
          return sim
        }

        // 7. A card with nothing changed sends nothing. It reads the server and shows what it holds, so
        //    a stale copy of the whole card (About fields, the job values, the experience list) cannot be
        //    written over newer data.
        for (const card of ['about', 'job', 'experience']) {
          const sim = loaded()
          sim.server = clone(NEWER) // the server moved on after the page loaded
          sim.ui.current = { ...sim.ui.current, [card]: { editing: true, status: 'idle', error: '', note: '' } }
          await cardsOf(sim, fakeApi(sim)).saveCard(card)
          expect(`unchanged ${card}: nothing is written`, sim.puts, [])
          expect(`unchanged ${card}: the newer server values are shown`, gotForm(sim)[card], NEW_VALUES[card])
          expect(`unchanged ${card}: only its baseline moved`, gotSaved(sim), wantSaved([card]))
          expect(`unchanged ${card}: the other cards keep their drafts`, { ...gotForm(sim), [card]: 0 }, { ...wantForm([card]), [card]: 0 })
          expect(`unchanged ${card}: it leaves edit mode`, sim.ui.current[card], { editing: false, status: 'idle', error: '', note: '' })
          expect(`unchanged ${card}: no write lock was taken or counted`, [sim.lock.current, sim.gen.current], [false, 0])
          expect(`unchanged ${card}: the profile was read with the read time limit`, sim.gets, [{ timeoutMs: PROFILE_READ_TIMEOUT_MS }])
        }
        {
          // If the read fails nothing is lost: the card stays as it was, in an error state, and can be cancelled.
          const sim = loaded()
          sim.ui.current = { ...sim.ui.current, job: { editing: true, status: 'idle', error: '', note: '' } }
          const before = stateOf(sim)
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).saveCard('job')
          expect('unchanged card, read fails: error shown, still editing, nothing written', [sim.ui.current.job, sim.puts, stateOf(sim)], [{ editing: true, status: 'error', error: 'offline', note: '' }, [], before])
          cardsOf(sim, fakeApi(sim)).cancelCard('job')
          expect('unchanged card, read fails: it can then be cancelled', sim.ui.current.job.status, 'idle')
        }
        {
          // The city picker emptied without Remove is "unchanged": the city stays and the seeker is told so.
          const sim = loaded()
          sim.state.setHomeCity = null
          await cardsOf(sim, fakeApi(sim)).saveCard('home')
          expect('home picker emptied, no Remove: nothing written, the saved city is back, with a note',
            [sim.puts, sim.state.setHomeCity, sim.ui.current.home], [[], PUNE, { editing: false, status: 'idle', error: '', note: 'profile:seeker.homeCityKept' }])
          // The same city picked again is also unchanged, but there is nothing to explain.
          const sim2 = loaded()
          sim2.state.setHomeCity = { ...PUNE }
          await cardsOf(sim2, fakeApi(sim2)).saveCard('home')
          expect('home city picked again: no note', [sim2.puts, sim2.ui.current.home.note], [[], ''])
          // Remove IS a change and is written.
          const sim3 = loaded()
          sim3.state.setHomeCity = null
          sim3.state.setHomeCityRemoved = true
          await cardsOf(sim3, fakeApi(sim3)).saveCard('home')
          expect('home Remove pressed: written as cityId null', sim3.puts, ['{"cityId":null}'])
        }

        // 8. A write whose outcome is unknown is held, never repeated, and never reported as a failure.
        const AMBIGUOUS = [
          ['a request timeout', new RequestTimeoutError()],
          ['no answer from the network', new TypeError('Failed to fetch')],
          ['a 502', new ApiError('Bad gateway', 502)],
          ['a 503', new ApiError('Unavailable', 503)],
          ['a 504', new ApiError('Timeout', 504)],
        ]
        for (const [name, err] of AMBIGUOUS) {
          const sim = bioDraft()
          const before = stateOf(sim)
          await cardsOf(sim, fakeApi(sim, { putError: err })).saveCard('about')
          expect(`PUT ${name}: the card is held as unknown`, [sim.ui.current.about.status, sim.ui.current.about.error], ['unknown', 'profile:seeker.saveUnknown'])
          expect(`PUT ${name}: the body that was sent is kept for the read-back`, JSON.stringify(sim.unknown.current.about), SENT_BIO)
          expect(`PUT ${name}: sent once with the write time limit, not repeated, nothing read`, [sim.puts.length, sim.putOpts, sim.gets.length], [1, [{ timeoutMs: PROFILE_WRITE_TIMEOUT_MS }], 0])
          expect(`PUT ${name}: the lock is released and the write counted`, [sim.lock.current, sim.gen.current], [false, 1])
          expect(`PUT ${name}: draft and baseline are untouched`, stateOf(sim), before)
        }
        for (const status of [400, 422, 500]) {
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Refused', status) })).saveCard('about')
          expect(`PUT answered ${status}: a plain failure, not unknown`, [sim.ui.current.about.status, sim.ui.current.about.error, sim.unknown.current.about], ['error', 'Refused', undefined])
        }
        {
          // The PUT was accepted but the read-back fails: held as unknown, the write is not repeated.
          const sim = bioDraft()
          const before = stateOf(sim)
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).saveCard('about')
          expect('PUT ok, read-back fails: held as unknown', [sim.ui.current.about.status, sim.ui.current.about.error], ['unknown', 'profile:seeker.saveUnknown'])
          expect('PUT ok, read-back fails: written once, read once, body kept', [sim.puts, sim.gets.length, JSON.stringify(sim.unknown.current.about)], [[SENT_BIO], 1, SENT_BIO])
          expect('PUT ok, read-back fails: lock released, draft and baseline untouched', [sim.lock.current, sim.gen.current, stateOf(sim)], [false, 1, before])
        }

        // 9. A held card cannot be saved or cancelled, and a refresh leaves it alone.
        {
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          const before = stateOf(sim)
          const writes = sim.puts.length
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          cardsOf(sim, fakeApi(sim)).cancelCard('about')
          expect('unknown card: Save sends nothing and reads nothing', [sim.puts.length, sim.gets.length], [writes, 0])
          expect('unknown card: Cancel changes nothing', [sim.ui.current.about.status, stateOf(sim)], ['unknown', before])
          await refresh(sim, clone(NEWER), { uiRef: sim.ui })
          expect('unknown card: a refresh keeps its draft', gotForm(sim).about, { ...OLD_VALUES.about, setBio: 'mine' })
          expect('unknown card: …and its baseline and state', [gotSaved(sim).about, sim.ui.current.about.status], [SAVED_OLD.about, 'unknown'])
          expect('unknown card: …while the other cards refresh', { ...gotForm(sim), about: 0 }, { ...wantForm(without(CARD_IDS, 'about')), about: 0 })
          // A checking card is held the same way.
          const sim2 = loaded()
          sim2.ui.current = { ...sim2.ui.current, job: { editing: false, status: 'checking', error: '', note: '' } }
          sim2.state.setLanguage = 'kn'
          await cardsOf(sim2, fakeApi(sim2)).saveCard('job')
          cardsOf(sim2, fakeApi(sim2)).cancelCard('job')
          expect('checking card: Save and Cancel do nothing', [sim2.puts ?? [], sim2.state.setLanguage, sim2.ui.current.job.status], [[], 'kn', 'checking'])
        }

        // 10. Check again: a read only. Reconciles that one card from what the server holds.
        {
          // The write had landed.
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          const gen = sim.gen.current
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).checkCard('about')
          expect('Check again, it landed: shown as saved with the server values', [sim.ui.current.about, gotForm(sim).about.setBio], [{ editing: false, status: 'saved', error: '', note: '' }, 'mine'])
          expect('Check again, it landed: the About baseline moved, the others did not', gotSaved(sim), { ...wantSaved([]), about: { ...SAVED_OLD.about, bio: 'mine' } })
          expect('Check again, it landed: a read only (no second write), the held body is gone', [sim.puts.length, sim.gets, sim.unknown.current.about], [1, [{ timeoutMs: PROFILE_READ_TIMEOUT_MS }], undefined])
          expect('Check again takes no write lock', [sim.lock.current, sim.gen.current], [false, gen])
          expect('Check again, it landed: the header user follows for About', sim.userUpdates.length, 1)
        }
        {
          // The write did not land.
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new RequestTimeoutError() })).saveCard('about')
          await cardsOf(sim, fakeApi(sim)).checkCard('about')
          expect('Check again, not applied: an error, the draft kept, the baseline is the server\'s',
            [sim.ui.current.about, sim.state.setBio, gotSaved(sim).about], [{ editing: false, status: 'error', error: 'profile:seeker.saveNotApplied', note: '' }, 'mine', SAVED_OLD.about])
          expect('Check again, not applied: still no second write', sim.puts.length, 1)
          // It can be tried again (a new, deliberate Save).
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).saveCard('about')
          expect('after "not applied", Save sends the change again and it is confirmed', [sim.puts, sim.ui.current.about.status], [[SENT_BIO, SENT_BIO], 'saved'])
        }
        {
          // The server holds something else (changed by someone else): not what was sent, so not applied, and the baseline follows the server.
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('theirs') })).checkCard('about')
          expect('Check again, changed by someone else: not applied, baseline is theirs, draft is still mine',
            [sim.ui.current.about.status, gotSaved(sim).about.bio, sim.state.setBio], ['error', 'theirs', 'mine'])
        }
        {
          // The read fails again: still unknown, the held body is kept, and a later check can settle it.
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).checkCard('about')
          expect('Check again, read fails: still unknown, body kept', [sim.ui.current.about.status, sim.ui.current.about.error, JSON.stringify(sim.unknown.current.about)], ['unknown', 'profile:seeker.saveUnknown', SENT_BIO])
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).checkCard('about')
          expect('Check again: a later check settles it', [sim.ui.current.about.status, sim.puts.length], ['saved', 1])
          // A card that is not held ignores it.
          const sim2 = loaded()
          await cardsOf(sim2, fakeApi(sim2)).checkCard('about')
          expect('Check again on a card that is not held does nothing', [sim2.gets ?? [], sim2.ui.current.about.status], [[], 'idle'])
        }
        {
          // The experience list is compared the way it is sent (current job, trimmed text, no end date).
          const sim = loaded()
          sim.state.setExperiences = sim.state.setExperiences.map((r, i) => (i === 0 ? { ...r, description: 'Made it' } : r))
          await cardsOf(sim, fakeApi(sim, { putError: new TypeError('Failed to fetch') })).saveCard('experience')
          const landed = clone(FULL)
          landed.jobSeeker.workExperience[0].description = 'Made it'
          await cardsOf(sim, fakeApi(sim, { afterPut: landed })).checkCard('experience')
          expect('Check again, experience list landed', [sim.ui.current.experience.status, gotSaved(sim).experience.experiences[0].description], ['saved', 'Made it'])
        }

        // 10b. Keyboard focus. An action never focuses anything; it leaves ONE intent (card + target) for
        //      the page's layout effect, and only if it is still the card's latest action.
        {
          const intentOf = (sim) => sim.focusIntent.current
          const edit = { card: 'about', target: 'edit' }
          const check = { card: 'about', target: 'checkAgain' }
          const save = { card: 'about', target: 'save' }
          let sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).saveCard('about')
          expect('focus: a saved card goes to its Edit button', intentOf(sim), edit)
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: boom })).saveCard('about')
          expect('focus: a refused save goes to Save', intentOf(sim), save)
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: consent })).saveCard('about')
          expect('focus: a consent refusal leaves focus alone (the consent dialog has it)', intentOf(sim), null)
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new RequestTimeoutError() })).saveCard('about')
          expect('focus: an unknown save goes to Check again', intentOf(sim), check)
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).saveCard('about')
          expect('focus: an accepted write that cannot be read back goes to Check again', intentOf(sim), check)
          sim = bioDraft()
          sim.state.setFullName = 'A'
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          expect('focus: an invalid name goes to the name field', intentOf(sim), { card: 'about', target: 'name' })
          sim = bioDraft()
          sim.state.setDateOfBirth = '2020-01-01'
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          expect('focus: an under-age date of birth goes to the date field', intentOf(sim), { card: 'about', target: 'dateOfBirth' })
          sim = loaded()
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          expect('focus: a save with nothing changed (a read) goes to Edit', intentOf(sim), edit)
          sim = loaded()
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).saveCard('about')
          expect('focus: that read failing goes to Save', intentOf(sim), save)
          sim = bioDraft()
          cardsOf(sim, fakeApi(sim)).cancelCard('about')
          expect('focus: Cancel goes to Edit', intentOf(sim), edit)
          sim = loaded()
          sim.ui.current = { ...sim.ui.current, about: { ...sim.ui.current.about, status: 'saving' } }
          cardsOf(sim, fakeApi(sim)).cancelCard('about')
          expect('focus: a Cancel the card refuses leaves nothing', intentOf(sim), null)

          // Check again.
          const held = async (putError = new ApiError('Unavailable', 503)) => {
            const s2 = bioDraft()
            await cardsOf(s2, fakeApi(s2, { putError })).saveCard('about')
            s2.focusIntent.current = null
            return s2
          }
          sim = await held()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).checkCard('about')
          expect('focus: Check again, it landed: Edit', intentOf(sim), edit)
          sim = await held()
          await cardsOf(sim, fakeApi(sim)).checkCard('about')
          expect('focus: Check again, not applied: Save', intentOf(sim), save)
          sim = await held()
          await cardsOf(sim, fakeApi(sim, { getError: new Error('offline') })).checkCard('about')
          expect('focus: Check again, the read failed: Check again', intentOf(sim), check)
          sim = await held()
          const getGate = deferred()
          const checking = cardsOf(sim, fakeApi(sim, { getGate, afterPut: serverWithBio('mine') })).checkCard('about')
          sim.state.setBio = 'mine and more'
          getGate.resolve()
          await checking
          expect('focus: Check again while the seeker kept typing: nothing moves', intentOf(sim), null)

          // Saving while the seeker kept typing, and a stale end.
          sim = bioDraft()
          let gate = deferred()
          let saving = cardsOf(sim, fakeApi(sim, { gate, afterPut: serverWithBio('mine') })).saveCard('about')
          sim.state.setBio = 'mine and more'
          gate.resolve()
          await saving
          expect('focus: Save while the seeker kept typing: nothing moves', intentOf(sim), null)
          sim = bioDraft()
          gate = deferred()
          saving = cardsOf(sim, fakeApi(sim, { gate, afterPut: serverWithBio('mine') })).saveCard('about')
          sim.focusToken.current.about += 1 // a newer action on the card has started
          gate.resolve()
          await saving
          expect('focus: an action that is no longer the latest leaves nothing', intentOf(sim), null)
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).saveCard('home')
          expect('focus: another card\'s save names that card', intentOf(sim), { card: 'home', target: 'edit' })

          // Flag off: nothing is ever asked for.
          sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') }), { flag: false }).saveCard('about')
          cardsOf(sim, fakeApi(sim), { flag: false }).cancelCard('about')
          expect('focus: with the feature off nothing is asked for', intentOf(sim), null)
        }

        // 11. Time limits, and the lock around the other writers.
        {
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).saveCard('about')
          expect('a card save uses the write and read time limits', [sim.putOpts, sim.gets], [[{ timeoutMs: PROFILE_WRITE_TIMEOUT_MS }], [{ timeoutMs: PROFILE_READ_TIMEOUT_MS }]])
          const on = loaded()
          on.state.setActivelyLooking = false
          await cardsOf(on, fakeApi(on)).toggleActivelyLooking(true)
          expect('the switch has a time limit when cards are edited one by one', on.putOpts, [{ timeoutMs: PROFILE_WRITE_TIMEOUT_MS }])
          const off = loaded()
          off.state.setActivelyLooking = false
          await cardsOf(off, fakeApi(off), { flag: false }).toggleActivelyLooking(true)
          expect('…and none with the feature off, as before', off.putOpts, [undefined])
        }
        {
          // A card's inputs are off while it is saving, being read back, or not confirmed; never with the feature off.
          const statuses = { idle: false, saved: false, error: false, saving: true, checking: true, unknown: true }
          for (const [status, locked] of Object.entries(statuses)) {
            const sim = loaded()
            sim.ui.current = { ...sim.ui.current, job: { editing: true, status, error: '', note: '' } }
            const on = cardsOf(sim, fakeApi(sim))
            const off = cardsOf(sim, fakeApi(sim), { flag: false })
            expect(`inputs of a card in "${status}" are ${locked ? 'disabled' : 'enabled'}`, [on.cardBusy('job'), on.cardBusy('about')], [locked, false])
            expect(`with the feature off the card is never busy ("${status}")`, off.cardBusy('job'), undefined)
          }
        }
        {
          // The page-wide Save is one more writer once cards are edited one by one; with the feature off it is as it was.
          const held = loaded()
          held.flagOn = true
          held.lock.current = true // a card save is in flight
          held.state.setBio = 'x'
          await held.save()
          expect('page-wide Save, feature on, lock held: sends nothing', held.bodies, [])
          held.lock.current = false
          await held.save()
          expect('page-wide Save, feature on: runs when free, and releases the lock and counts the write', [held.bodies.length, held.lock.current, held.gen.current], [1, false, 1])
          const legacy = loaded()
          legacy.lock.current = true
          legacy.state.setBio = 'x'
          await legacy.save()
          expect('page-wide Save, feature off: ignores the lock, as before', [legacy.bodies.length, legacy.lock.current, legacy.gen.current], [1, true, 0])
        }

        // 12. The page-wide Save and Cancel leave a card that is being saved, read or held alone.
        {
          for (const status of ['saving', 'checking', 'unknown']) {
            const sim = loaded()
            sim.flagOn = true
            sim.ui.current = { ...sim.ui.current, job: { editing: false, status, error: '', note: '' } }
            sim.state.setBio = 'x'
            await sim.save()
            expect(`page-wide Save, a card is "${status}": refused, the lock stays free`, [sim.bodies, sim.lock.current, sim.gen.current], [[], false, 0])
          }
          const off = loaded()
          off.ui.current = { ...off.ui.current, job: { editing: false, status: 'unknown', error: '', note: '' } }
          off.state.setBio = 'x'
          await off.save()
          expect('page-wide Save, feature off: not affected by card states', off.bodies.length, 1)
          // …and the button follows the same rule.
          const sim = loaded()
          sim.ui.current = { ...sim.ui.current, job: { editing: true, status: 'unknown', error: '', note: '' } }
          expect('page-wide Save is shown disabled while a card is held', [cardsOf(sim, fakeApi(sim)).pageSaveBlocked, cardsOf(sim, fakeApi(sim), { flag: false }).pageSaveBlocked], [true, false])
          const idle = loaded()
          expect('…and enabled when nothing is held', cardsOf(idle, fakeApi(idle)).pageSaveBlocked, false)
        }
        {
          const cancelSrc = cut(page, '  const handleCancel = () => {', '\n  }\n', 'handleCancel()')
          if (cancelSrc) {
            const makeCancel = new Function(
              `${strip(`function make({ PER_CARD_EDITING, anyCardLocked, lastProfileRef, hydrate, setEditing, setSaveError, setSaved }) {\n${cancelSrc}\nreturn handleCancel\n}`)}\nreturn make`
            )()
            const run = (flag, locked) => {
              const calls = []
              makeCancel({
                PER_CARD_EDITING: flag, anyCardLocked: () => locked, lastProfileRef: { current: 'profile' },
                hydrate: (p) => calls.push(['hydrate', p]), setEditing: (v) => calls.push(['editing', v]),
                setSaveError: () => {}, setSaved: () => {},
              })()
              return calls
            }
            expect('page-wide Cancel, feature on, a card is held: does nothing', run(true, true), [])
            expect('page-wide Cancel, feature on, no card held: reverts as before', run(true, false), [['hydrate', 'profile'], ['editing', false]])
            expect('page-wide Cancel, feature off: reverts as before, whatever the card states say', run(false, true), [['hydrate', 'profile'], ['editing', false]])
          }
        }

        // 13. A read taken while another write is in flight must not move the page-wide state.
        {
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          const stale = serverWithBio('mine')
          stale.email = 'stale@example.com'
          const before = sim.state.setEmail
          sim.lock.current = true // another card's PUT is out
          const lastBefore = sim.lastProfileRef.current
          await cardsOf(sim, fakeApi(sim, { afterPut: stale })).checkCard('about')
          expect('Check again while another write is out: the card settles', [sim.ui.current.about.status, gotSaved(sim).about.bio], ['saved', 'mine'])
          expect('…but the page-wide fields and lastProfileRef are left alone', [sim.state.setEmail, sim.lastProfileRef.current === lastBefore], [before, true])
          const sim2 = bioDraft()
          await cardsOf(sim2, fakeApi(sim2, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          const fresh2 = serverWithBio('mine')
          fresh2.email = 'new@example.com'
          await cardsOf(sim2, fakeApi(sim2, { afterPut: fresh2 })).checkCard('about')
          expect('Check again with no write out: the page-wide fields follow', [sim2.state.setEmail, sim2.lastProfileRef.current === fresh2], ['new@example.com', true])
          // The card save that just finished owns the lock and does update them.
          const sim3 = bioDraft()
          const fresh3 = serverWithBio('mine')
          fresh3.email = 'saved@example.com'
          await cardsOf(sim3, fakeApi(sim3, { afterPut: fresh3 })).saveCard('about')
          expect('a card save updates the page-wide fields from its own read', sim3.state.setEmail, 'saved@example.com')
          // An unchanged-card read while another write is out is the same.
          const sim4 = loaded()
          sim4.lock.current = true
          const other = clone(NEWER)
          await cardsOf(sim4, fakeApi(sim4, { afterPut: other })).saveCard('job')
          expect('an unchanged card read while another write is out: card synced, page-wide fields not', [gotForm(sim4).job, sim4.state.setEmail], [NEW_VALUES.job, ''])
        }

        // 14. A full load (hydrate) puts every card back to view mode once cards are edited one by one,
        //     and leaves the card state alone when the feature is off.
        {
          for (const flag of [true, false]) {
            const sim = loaded()
            sim.hydrateFlag = flag
            sim.ui.current = { ...sim.ui.current, job: { editing: true, status: 'error', error: 'old', note: 'n' }, about: { editing: false, status: 'unknown', error: 'u', note: '' } }
            sim.unknown.current = { about: { bio: 'x' } }
            partsOf(sim).hydrate(clone(FULL))
            expect(`full load, feature ${flag ? 'on' : 'off'}: card state ${flag ? 'reset' : 'untouched'}`,
              [sim.ui.current.job.status, sim.ui.current.about.status, Object.keys(sim.unknown.current)],
              flag ? ['idle', 'idle', []] : ['error', 'unknown', ['about']])
          }
        }

        // 15. The switch takes the shared lock only when cards are edited one by one.
        {
          const sim = loaded()
          sim.state.setActivelyLooking = false
          await cardsOf(sim, fakeApi(sim), { flag: false }).toggleActivelyLooking(true)
          expect('switch, feature off: no lock taken or counted, the write goes out as before', [sim.puts, sim.lock.current, sim.gen.current], [['{"isActivelyLooking":true}'], false, 0])
          const held = loaded()
          held.state.setActivelyLooking = false
          held.lock.current = true
          await cardsOf(held, fakeApi(held), { flag: false }).toggleActivelyLooking(true)
          expect('switch, feature off: a held lock is ignored (nothing else takes it)', [held.puts.length, held.lock.current], [1, true])
        }

        // ---- Fixes after the Step 3B audit (F1, F2, F3) ----------------------------------------------
        // F1. An exception after the accepted PUT holds the card; it is never left in "saving".
        {
          // (a) what comes back cannot be read at all
          const sim = bioDraft()
          const before = stateOf(sim)
          await cardsOf(sim, fakeApi(sim, { reply: null })).saveCard('about')
          expect('F1 unreadable reply: held as unknown, not stuck in "saving"', [sim.ui.current.about.status, sim.ui.current.about.error], ['unknown', 'profile:seeker.saveUnknown'])
          expect('F1 unreadable reply: one PUT, one read, the body kept', [sim.puts, sim.gets.length, JSON.stringify(sim.unknown.current.about)], [[SENT_BIO], 1, SENT_BIO])
          expect('F1 unreadable reply: lock released, write counted, draft and baseline untouched', [sim.lock.current, sim.gen.current, stateOf(sim)], [false, 1, before])
          await cardsOf(sim, fakeApi(sim)).saveCard('about')
          cardsOf(sim, fakeApi(sim)).cancelCard('about')
          expect('F1 unreadable reply: Save and Cancel stay blocked, no second PUT', [sim.puts.length, sim.ui.current.about.status, stateOf(sim)], [1, 'unknown', before])
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).checkCard('about')
          expect('F1 unreadable reply: Check again settles it with no second write', [sim.ui.current.about.status, sim.puts.length], ['saved', 1])
        }
        {
          // (b) applying the profile throws after part of it was applied (the header update)
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') }), { updateUserThrows: true }).saveCard('about')
          expect('F1 settle throws: held as unknown, one PUT, lock released',
            [sim.ui.current.about.status, sim.puts.length, sim.lock.current, JSON.stringify(sim.unknown.current.about)], ['unknown', 1, false, SENT_BIO])
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine') })).checkCard('about')
          expect('F1 settle throws: Check again settles it, still one PUT', [sim.ui.current.about.status, gotSaved(sim).about.bio, sim.puts.length], ['saved', 'mine', 1])
        }

        // F2. A draft edited after the request started is the seeker's: it is kept, and the baseline
        //     is what the server confirmed.
        {
          const sim = bioDraft()
          sim.state.setLanguage = 'kn' // another card with its own change
          const gate = deferred()
          const saving = cardsOf(sim, fakeApi(sim, { gate, afterPut: serverWithBio('mine') })).saveCard('about')
          sim.state.setBio = 'mine and more' // typed while the PUT is out
          gate.resolve()
          await saving
          expect('F2 edit during save: the newer draft is kept', sim.state.setBio, 'mine and more')
          expect('F2 edit during save: the baseline is what the server confirmed', gotSaved(sim).about.bio, 'mine')
          expect('F2 edit during save: the card is still being edited, not "saved"', sim.ui.current.about, { editing: true, status: 'idle', error: '', note: '' })
          expect('F2 edit during save: it compares as changed against the new baseline', cardDirty('about', draftOf(sim.state), sim.savedRef.current), true)
          expect('F2 edit during save: the other card keeps its draft and baseline', [sim.state.setLanguage, gotSaved(sim).job.language], ['kn', 'hi'])
          expect('F2 edit during save: the name rule now judges against the saved name', sim.originalFullName.current, 'Asha Rao')
          expect('F2 edit during save: the lock is released and the header follows the saved name', [sim.lock.current, sim.userUpdates.length], [false, 1])
          // …and Save sends the newer text, from the new baseline.
          await cardsOf(sim, fakeApi(sim, { afterPut: serverWithBio('mine and more') })).saveCard('about')
          expect('F2 edit during save: a later Save sends the newer text', [sim.puts[1], sim.ui.current.about.status], ['{"fullName":"Asha Rao","bio":"mine and more","dateOfBirth":"1990-05-05","gender":"FEMALE"}', 'saved'])
        }
        {
          // Typed and undone before the answer: nothing changed, so the server values are shown as usual.
          const sim = bioDraft()
          const gate = deferred()
          const saving = cardsOf(sim, fakeApi(sim, { gate, afterPut: serverWithBio('mine') })).saveCard('about')
          sim.state.setBio = 'mine and more'
          sim.state.setBio = 'mine'
          gate.resolve()
          await saving
          expect('F2 typed and undone: treated as unchanged, card saved', [sim.ui.current.about, sim.state.setBio], [{ editing: false, status: 'saved', error: '', note: '' }, 'mine'])
        }
        {
          // An unchanged card being synced: an edit made while the read is out is kept.
          const sim = loaded()
          sim.ui.current = { ...sim.ui.current, job: { editing: true, status: 'idle', error: '', note: '' } }
          const getGate = deferred()
          const syncing = cardsOf(sim, fakeApi(sim, { getGate, afterPut: clone(NEWER) })).saveCard('job')
          sim.state.setLanguage = 'kn'
          getGate.resolve()
          await syncing
          expect('F2 sync edited during the read: the draft is kept, the baseline is the server\'s',
            [sim.state.setLanguage, gotSaved(sim).job, sim.ui.current.job, sim.puts ?? []], ['kn', SAVED_NEW.job, { editing: true, status: 'idle', error: '', note: '' }, []])
        }
        {
          // Check again: the same.
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          const getGate = deferred()
          const checking = cardsOf(sim, fakeApi(sim, { getGate, afterPut: serverWithBio('mine') })).checkCard('about')
          sim.state.setBio = 'mine and more'
          getGate.resolve()
          await checking
          expect('F2 Check again edited during the read: the newer draft is kept, the baseline confirmed',
            [sim.state.setBio, gotSaved(sim).about.bio, sim.ui.current.about, sim.unknown.current.about, sim.puts.length], ['mine and more', 'mine', { editing: true, status: 'idle', error: '', note: '' }, undefined, 1])
        }
        {
          // The location lookup: ended when a request for the home card starts, and ignored if it is delivered anyway.
          const homeSave = async (how) => {
            const sim = loaded()
            sim.lookup = { cancelled: false }
            const gate = deferred()
            let delivered = 0
            const deliver = () => { if (!sim.lookup.cancelled) delivered++ } // the hook's own contract
            sim.state.setHomeCity = MYSURU
            const api = fakeApi(sim, { gate, afterPut: (() => { const p = clone(FULL); p.jobSeeker.city = cityOf('c-z', 'Mysuru', 'Karnataka'); return p })() })
            const run = how === 'sync' ? (() => { sim.state.setHomeCity = PUNE; return cardsOf(sim, fakeApi(sim, { getGate: gate })).saveCard('home') })() : cardsOf(sim, api).saveCard('home')
            deliver() // the browser answers while the request is out
            gate.resolve()
            await run
            return { sim, delivered }
          }
          const saved = await homeSave('save')
          expect('F2 lookup: a home save ends the lookup, so its answer is never delivered', [saved.sim.lookup.cancelled, saved.delivered], [true, 0])
          expect('F2 lookup: the home card then shows the server city', [saved.sim.state.setHomeCity, saved.sim.ui.current.home.status], [MYSURU, 'saved'])
          const synced = await homeSave('sync')
          expect('F2 lookup: reading an unchanged home card ends the lookup too', [synced.sim.lookup.cancelled, synced.delivered], [true, 0])
          const other = loaded()
          other.lookup = { cancelled: false }
          other.state.setBio = 'mine'
          await cardsOf(other, fakeApi(other, { afterPut: serverWithBio('mine') })).saveCard('about')
          expect('F2 lookup: saving another card leaves the lookup alone', other.lookup.cancelled, false)
          const held = bioDraft()
          held.state.setHomeCity = MYSURU
          held.lookup = { cancelled: false }
          await cardsOf(held, fakeApi(held, { putError: new ApiError('Unavailable', 503) })).saveCard('home')
          held.lookup = { cancelled: false }
          await cardsOf(held, fakeApi(held, { afterPut: clone(FULL) })).checkCard('home')
          expect('F2 lookup: Check again for the home card ends the lookup', held.lookup.cancelled, true)

          // The guard on the lookup's own callback (what the hook calls when it does deliver).
          const lookupSrc = cut(page, '  const onLookupFound = useCallback(', '    [applyHomeCity]\n  )\n', 'onLookupFound()')
          if (lookupSrc) {
            const makeLookup = new Function(
              `${strip(`function make({ useCallback, PER_CARD_EDITING, isCardLocked, cardUiRef, applyHomeCity }) {\n${lookupSrc}\nreturn onLookupFound\n}`)}\nreturn make`
            )()
            const heard = (flag, status) => {
              const got = []
              makeLookup({
                useCallback: (fn) => fn, PER_CARD_EDITING: flag, isCardLocked,
                cardUiRef: { current: { ...idleCardUi(), home: { editing: true, status, error: '', note: '' } } },
                applyHomeCity: (c) => got.push(c.id),
              })({ id: 'c-z' })
              return got
            }
            for (const status of ['saving', 'checking', 'unknown']) {
              expect(`F2 lookup answer, home card "${status}", feature on: ignored`, heard(true, status), [])
              expect(`F2 lookup answer, home card "${status}", feature off: delivered as before`, heard(false, status), ['c-z'])
            }
            for (const status of ['idle', 'saved', 'error']) expect(`F2 lookup answer, home card "${status}": delivered`, heard(true, status), ['c-z'])
          }
        }

        // F3. A read that started before a write finished must not move the page-wide state.
        {
          const sim = loaded()
          sim.state.setActivelyLooking = false
          sim.ui.current = { ...sim.ui.current, job: { editing: true, status: 'idle', error: '', note: '' } }
          const getGate = deferred()
          const stale = clone(NEWER)
          stale.email = 'stale@example.com'
          const syncing = cardsOf(sim, fakeApi(sim, { getGate, afterPut: stale })).saveCard('job') // the read is out
          await cardsOf(sim, fakeApi(sim)).toggleActivelyLooking(true) // the switch is turned on and its write finishes
          getGate.resolve()
          await syncing
          expect('F3 sync: the card takes the server values (valid for it)', gotForm(sim).job, NEW_VALUES.job)
          expect('F3 sync: the stale page-wide fields, the switch and lastProfileRef are not applied', [sim.state.setEmail, sim.state.setActivelyLooking, sim.lastProfileRef.current], ['', true, null])
          expect('F3 sync: the other cards keep their drafts', { ...gotForm(sim), job: 0 }, { ...wantForm(['job']), job: 0 })
        }
        {
          const sim = bioDraft()
          await cardsOf(sim, fakeApi(sim, { putError: new ApiError('Unavailable', 503) })).saveCard('about')
          sim.state.setActivelyLooking = false
          const getGate = deferred()
          const stale = serverWithBio('mine')
          stale.email = 'stale@example.com'
          const checking = cardsOf(sim, fakeApi(sim, { getGate, afterPut: stale })).checkCard('about')
          await cardsOf(sim, fakeApi(sim)).toggleActivelyLooking(true)
          getGate.resolve()
          await checking
          expect('F3 Check again: the card is settled from the read', [sim.ui.current.about.status, gotSaved(sim).about.bio], ['saved', 'mine'])
          expect('F3 Check again: the stale page-wide fields and lastProfileRef are not applied', [sim.state.setEmail, sim.state.setActivelyLooking, sim.lastProfileRef.current], ['', true, null])
        }
      }
    }

    // Source tripwires: the page keeps ONE snapshot, written through commitSaved only.
    expect('page has no separate savedHomeCity state', /\bsetSavedHomeCity\b/.test(page), false)
    expect('page has no separate savedPreferredIds state', /\bsavedPreferredIds\b|\bsetSavedPreferredIds\b/.test(page), false)
    expect('the snapshot state is written in one place, commitSaved', (page.match(/\bsetSavedValues\(/g) ?? []).length, 1)
    expect('commitSaved has three callers: a full load, a card-aware refresh, one card\'s successful save', (page.match(/\bcommitSaved\(/g) ?? []).length, 3)
    expect('the snapshot is set by hydrate()', hydrateSrc.includes('commitSaved(saved)'), true)
    expect('page-wide Save passes the snapshot to profileSavePatch', handleSaveSrc.includes('profileSavePatch(draft, savedValues)'), true)
    expect('the draft carries no saved copies', /savedHomeCity|savedPreferredIds/.test(cut(page, '  const draft: DraftValues = {', '\n  }\n', 'draft') ?? ''), false)
  }

  // ---- 3c. Step 1B scaffolding: the flag is off and the card state starts idle -----------------------
  // The flag is no longer a constant in the page: it is the build-time NEXT_PUBLIC_PER_CARD_EDITING (off unless "true").
  expect('PER_CARD_EDITING comes from lib/features, not from a constant in the page', [/import \{ PER_CARD_EDITING \} from '@\/lib\/features'/.test(page), /\bconst PER_CARD_EDITING\b/.test(page)], [true, false])
  {
    const flagFor = (value) => {
      const before = process.env.NEXT_PUBLIC_PER_CARD_EDITING
      if (value === undefined) delete process.env.NEXT_PUBLIC_PER_CARD_EDITING
      else process.env.NEXT_PUBLIC_PER_CARD_EDITING = value
      srcCache.delete('lib/features.ts')
      try {
        return loadSrc('lib/features.ts').PER_CARD_EDITING
      } finally {
        if (before === undefined) delete process.env.NEXT_PUBLIC_PER_CARD_EDITING
        else process.env.NEXT_PUBLIC_PER_CARD_EDITING = before
        srcCache.delete('lib/features.ts')
      }
    }
    expect('the flag is off when unset, empty or anything but true', [undefined, '', 'false', '0', '1', 'yes', 'truee'].map(flagFor), [false, false, false, false, false, false, false])
    expect('the flag is on for "true" in any casing, trimmed', ['true', 'TRUE', 'True', ' true '].map(flagFor), [true, true, true, true])
    const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8').replace(/\r\n/g, '\n')
    expect('the Dockerfile builds with the flag off unless a build arg turns it on', [dockerfile.includes('ARG NEXT_PUBLIC_PER_CARD_EDITING=false\n'), dockerfile.includes('ENV NEXT_PUBLIC_PER_CARD_EDITING=$NEXT_PUBLIC_PER_CARD_EDITING\n')], [true, true])
    const cloudbuild = fs.readFileSync(path.join(ROOT, 'cloudbuild.ci.yaml'), 'utf8')
    expect('the shared Cloud Build file does not turn the flag on', cloudbuild.includes('PER_CARD_EDITING'), false)
  }
  expect('card UI starts with every card in view mode, idle', idleCardUi(), {
    about: { editing: false, status: 'idle', error: '', note: '' },
    home: { editing: false, status: 'idle', error: '', note: '' },
    workCities: { editing: false, status: 'idle', error: '', note: '' },
    job: { editing: false, status: 'idle', error: '', note: '' },
    experience: { editing: false, status: 'idle', error: '', note: '' },
  })
  expect('idleCardUi has one entry per card id', Object.keys(idleCardUi()), [...CARD_IDS])
  expect('idleCardUi returns a fresh object each time', idleCardUi() !== idleCardUi(), true)
  expect('hydrate() does not touch the per-card state', /setCardUi/.test(hydrateSrc ?? ''), false)
}

// ------------------------------------------------------------------------ 4. cardDirty
// One rule the page will have to respect when it uses these (B2):
//
//  - OLD snapshot first. "Is this card dirty?" must be asked against the snapshot the seeker was
//    editing from, BEFORE a freshly loaded profile replaces it. Asked against the new one, an
//    untouched card reads dirty whenever the server changed, and a clean card is wrongly left
//    stale instead of refreshed. This is the caller's order; nothing below pins it.
//
// One that is now built in: cardPatch and cardDirty take the SAME saved snapshot (section 4c). The
// draft's own `savedHomeCity` / `savedPreferredIds` copies are read only by the page-wide Save,
// through profileSavePatch.
const saved = draftFromProfile(FULL)
const dirtyCards = (draft, baseline = saved) => CARD_IDS.filter((c) => cardDirty(c, draft, baseline))
const fresh = () => clone(saved)
const A = { id: 'c-a', name: 'Pune', stateName: 'Maharashtra' }
const OTHER = { id: 'c-z', name: 'Mysuru', stateName: 'Karnataka' }
const row = (over = {}) => ({ position: 'Cook', companyName: '', startDate: '2018-01-01', endDate: '', currentlyWorking: false, description: '', ...over })

expect('a profile compared with itself is clean on every card', dirtyCards(fresh()), [])

// dirtyCards below reads truthiness, so a card whose `case` was lost from cardDirty (it would return
// undefined) would pass as "clean". Every id must answer true or false. (A lost cardPatch case already
// fails section 2, where its body is compared with the Phase A builder.)
for (const card of CARD_IDS) {
  expect(`${card}: cardDirty answers true or false`, typeof cardDirty(card, fresh(), saved), 'boolean')
}

const cases = [
  // [name, change to the draft, the cards that must say "changed"]
  ['name edited', (d) => { d.fullName = 'Asha R' }, ['about']],
  ['name: trailing space only', (d) => { d.fullName = 'Asha Rao  ' }, []],
  ['bio edited', (d) => { d.bio = 'I cook well.' }, ['about']],
  ['bio emptied (a save could not clear it, but the seeker changed it)', (d) => { d.bio = '' }, ['about']],
  ['bio: spaces only added to empty-looking text', (d) => { d.bio = ' I cook. ' }, []],
  ['date of birth edited', (d) => { d.dateOfBirth = '1991-01-01' }, ['about']],
  ['gender edited', (d) => { d.gender = 'MALE' }, ['about']],
  ['home city: another city picked', (d) => { d.homeCity = OTHER }, ['home']],
  ['home city: the saved city picked again', (d) => { d.homeCity = { ...A } }, []],
  ['home city: picker emptied, no Remove (a State change does this)', (d) => { d.homeCity = null }, []],
  ['home city: picker emptied and Remove pressed', (d) => { d.homeCity = null; d.homeCityRemoved = true }, ['home']],
  ['home city: Remove pressed, then another city picked', (d) => { d.homeCity = OTHER; d.homeCityRemoved = true }, ['home']],
  ['preferred cities: one added', (d) => { d.preferredCities = [...d.preferredCities, OTHER] }, ['workCities']],
  ['preferred cities: one removed', (d) => { d.preferredCities = d.preferredCities.slice(1) }, ['workCities']],
  ['preferred cities: all cleared', (d) => { d.preferredCities = [] }, ['workCities']],
  ['preferred cities: one swapped', (d) => { d.preferredCities = [d.preferredCities[0], OTHER] }, ['workCities']],
  ['preferred cities: same set, other order', (d) => { d.preferredCities = [...d.preferredCities].reverse() }, []],
  ['job: category changed', (d) => { d.triple = { ...d.triple, category: 'Retail' } }, ['job']],
  ['job: job title changed', (d) => { d.triple = { ...d.triple, jobTitle: 'Baker' } }, ['job']],
  ['job: category emptied', (d) => { d.triple = { ...d.triple, category: undefined } }, ['job']],
  ['job: language changed', (d) => { d.language = 'ta' }, ['job']],
  ['experience: a half-filled row added (counts, though a save would drop it)', (d) => { d.experiences = [...d.experiences, row({ position: 'Driver', startDate: '' })] }, ['experience']],
  ['experience: rows swapped', (d) => { d.experiences = [d.experiences[1], d.experiences[0]] }, ['experience']],
  ['experience: row keys do not matter', (d) => { d.experiences = d.experiences.map((r, i) => ({ ...r, key: `row-${i + 40}` })) }, []],
  ['two cards at once', (d) => { d.bio = 'new'; d.language = 'kn' }, ['about', 'job']],
  ['all five at once', (d) => { d.fullName = 'N'; d.homeCity = OTHER; d.preferredCities = []; d.language = 'ta'; d.experiences = [] }, [...CARD_IDS]],
]
for (const [name, change, want] of cases) {
  const d = fresh()
  change(d)
  expect(name, dirtyCards(d), want)
}

// ---- 4b. The job fields and the experience rows, one field at a time ---------------------------
// Every expected answer below is written out by hand from the rule in cardDirty's comment: never
// computed with the `|| ''` / `.trim()` the implementation itself uses, so a slip in one cannot
// quietly agree with the same slip in the other.

// The three job levels. Each is checked alone, so a rule that drops or mangles one cannot hide
// behind the other two.
const FILLED = { category: 'Cat', sector: 'Sec', jobTitle: 'Job' }
for (const level of ['category', 'sector', 'jobTitle']) {
  // `base` is what the server holds; `change` is what the draft does to that one level.
  const jobCase = (name, savedValue, draftValue, want) => {
    const base = fresh()
    base.triple = { ...FILLED, [level]: savedValue }
    const d = clone(base)
    d.triple[level] = draftValue
    expect(`job ${level}: ${name}`, dirtyCards(d, base), want)
  }
  jobCase('changed to another value', 'Cat', 'Other', ['job'])
  jobCase('nothing saved, one typed', undefined, 'Typed', ['job'])
  jobCase('nothing saved ("" held), one typed', '', 'Typed', ['job'])
  jobCase('saved value emptied to undefined', 'Kept', undefined, ['job'])
  jobCase('saved value emptied to ""', 'Kept', '', ['job'])
  // "" and a missing value are the same thing, in both directions.
  jobCase('saved undefined, draft ""', undefined, '', [])
  jobCase('saved "", draft undefined', '', undefined, [])
  jobCase('both "" ', '', '', [])
  jobCase('both undefined', undefined, undefined, [])
  jobCase('same value', 'Same', 'Same', [])
}

// The language is part of the job card. Like the job levels, an emptied value is a change (a save
// cannot clear it, but the seeker did change it); a value is never "the same" as another.
for (const [name, savedLanguage, draftLanguage, want] of [
  ['changed to another language', 'hi', 'ta', ['job']],
  ['same language', 'hi', 'hi', []],
  ['emptied from a language', 'hi', '', ['job']],
  ['emptied from the default', 'en', '', ['job']],
  ['typed over an empty saved value', '', 'hi', ['job']],
  ['empty on both sides', '', '', []],
]) {
  const base = fresh()
  base.language = savedLanguage
  const d = clone(base)
  d.language = draftLanguage
  expect(`job language: ${name}`, dirtyCards(d, base), want)
}

// Experience. The saved baseline is FULL's two rows:
//   row 0  Cook   | Hotel Sai | 2018-01-01 | 2020-02-02 | not current | Made food
//   row 1  Chef   | (none)    | 2020-03-01 | (none)     | current     | (none)
// Row 1 is the LAST row, so a rule that only looks at the first row, or skips the last, shows here.
// One field of one row. Spaces around a value are not a change; spaces inside it are.
const ROW_FIELDS = [
  // [row, field, new value, cards that must say "changed"]
  [0, 'position', 'Head cook', ['experience']],
  [0, 'companyName', 'Hotel Om', ['experience']],
  [0, 'startDate', '2018-02-01', ['experience']],
  [0, 'endDate', '2020-03-03', ['experience']],
  [0, 'currentlyWorking', true, ['experience']],
  [0, 'description', 'Other food', ['experience']],
  [1, 'position', 'Head chef', ['experience']],
  [1, 'companyName', 'Hotel Om', ['experience']],
  [1, 'startDate', '2020-04-01', ['experience']],
  [1, 'endDate', '2021-01-01', []], // row 1 is a current job: a save drops its end date
  [1, 'currentlyWorking', false, ['experience']],
  [1, 'description', 'Now leads', ['experience']],
  [0, 'position', ' Cook ', []],
  [0, 'companyName', '  Hotel Sai ', []],
  [0, 'description', ' Made food  ', []],
  [1, 'position', ' Chef\t', []],
  [1, 'companyName', '   ', []],
  [1, 'description', ' \n ', []],
  [0, 'companyName', 'Hotel  Sai', ['experience']],
  [0, 'description', 'Made  food', ['experience']],
  [0, 'position', 'Co ok', ['experience']],
]
for (const [i, field, value, want] of ROW_FIELDS) {
  const d = fresh()
  d.experiences[i][field] = value
  expect(`experience row ${i}: ${field} set to ${JSON.stringify(value)}`, dirtyCards(d), want)
}

// Rows added and removed, at either end of the list. Blank rows are no change.
const driver = row({ position: 'Driver' })
const blankRow = (over = {}) => ({ position: '', companyName: '', startDate: '', endDate: '', currentlyWorking: false, description: '', ...over })
const LIST_CHANGES = [
  ['the LAST row removed', (rows) => rows.slice(0, -1), ['experience']],
  ['the FIRST row removed', (rows) => rows.slice(1), ['experience']],
  ['a filled row added at the END', (rows) => [...rows, driver], ['experience']],
  ['a filled row added at the START', (rows) => [driver, ...rows], ['experience']],
  ['a blank row added at the END', (rows) => [...rows, blankRow()], []],
  ['a blank row added at the START', (rows) => [blankRow(), ...rows], []],
  ['two blank rows added, one holding only spaces', (rows) => [...rows, blankRow(), blankRow({ position: ' ', description: '  ' })], []],
]
for (const [name, change, want] of LIST_CHANGES) {
  const d = fresh()
  d.experiences = change(d.experiences)
  expect(`experience: ${name}`, dirtyCards(d), want)
}

// A row with just ONE field filled is half-filled, and half-filled counts: a save would drop it,
// but the seeker typed it. A row whose only content is spaces is blank.
for (const [field, value, want] of [
  ['position', 'Driver', ['experience']],
  ['companyName', 'Hotel Om', ['experience']],
  ['startDate', '2019-01-01', ['experience']],
  ['endDate', '2020-01-01', ['experience']],
  ['currentlyWorking', true, ['experience']],
  ['description', 'Notes', ['experience']],
  ['position', '   ', []],
  ['companyName', '   ', []],
  ['description', '   ', []],
]) {
  const d = fresh()
  d.experiences = [...d.experiences, blankRow({ [field]: value })]
  expect(`experience: an added row with only ${field} = ${JSON.stringify(value)}`, dirtyCards(d), want)
}
{
  const one = draftFromProfile(profile({ id: 's3', workExperience: [{ position: 'Cook', startDate: '2018-01-01T00:00:00.000Z' }] }))
  expect('experience (one saved row): unchanged', dirtyCards(clone(one), one), [])
  expect('experience (one saved row): that row removed', dirtyCards({ ...clone(one), experiences: [] }, one), ['experience'])
  expect('experience (one saved row): a second row added', dirtyCards({ ...clone(one), experiences: [...clone(one).experiences, row({ position: 'Driver' })] }, one), ['experience'])
  const none = draftFromProfile(profile({ id: 's4' }))
  expect('experience (none saved): none typed', dirtyCards(clone(none), none), [])
}
// A current job's end date. Its field is disabled while "currently working" is ticked and a save
// drops it, so a difference in that date ALONE is not a change; for a finished job it is. Expected
// answers are written out by hand. Each "not changed" is also checked against the request body: it
// must be the very body the saved row sends, so "clean" is never claimed over a different save.
const CURRENT = draftFromProfile(
  profile({
    id: 's5',
    workExperience: [
      { position: 'Chef', startDate: '2020-03-01T00:00:00.000Z', endDate: null, currentlyWorking: true },
      { position: 'Cook', startDate: '2018-01-01T00:00:00.000Z', endDate: '2019-05-05T00:00:00.000Z', currentlyWorking: false },
      // Older data can be current and still hold a date.
      { position: 'Driver', startDate: '2017-01-01T00:00:00.000Z', endDate: '2017-06-06T00:00:00.000Z', currentlyWorking: true },
    ],
  })
)
// A draft that is exactly the snapshot: nothing touched.
const asDraft = (snap) => ({ ...clone(snap), homeCityRemoved: false })
const experienceBody = (draft, baseline) => JSON.stringify(wire(cardPatch('experience', draft, baseline)))
for (const [name, change, want] of [
  ['current job: an end date typed in', (d) => { d.experiences[0].endDate = '2021-01-01' }, []],
  ['current job: its end date changed', (d) => { d.experiences[2].endDate = '2018-02-02' }, []],
  ['current job: its end date cleared', (d) => { d.experiences[2].endDate = '' }, []],
  ['two current jobs: both end dates edited', (d) => { d.experiences[0].endDate = '2021-01-01'; d.experiences[2].endDate = '' }, []],
  ['finished job: its end date changed', (d) => { d.experiences[1].endDate = '2019-06-06' }, ['experience']],
  ['finished job: its end date cleared', (d) => { d.experiences[1].endDate = '' }, ['experience']],
  ['current job ticked off, its end date kept', (d) => { d.experiences[0].currentlyWorking = false }, ['experience']],
  ['finished job ticked on, its end date kept', (d) => { d.experiences[1].currentlyWorking = true }, ['experience']],
  ['a hidden end date AND another field changed', (d) => { d.experiences[0].endDate = '2021-01-01'; d.experiences[0].position = 'Head chef' }, ['experience']],
]) {
  const d = asDraft(CURRENT)
  change(d)
  expect(`end date: ${name}`, dirtyCards(d, CURRENT), want)
  const sameBody = experienceBody(d, CURRENT) === experienceBody(asDraft(CURRENT), CURRENT)
  expect(`end date: ${name}: the body is ${want.length ? 'a different one' : 'the saved one'}`, sameBody, want.length === 0)
}
// The body never carries an end date for a current job, whatever the field holds.
for (const endDate of ['', '2021-01-01', undefined, null, 'garbage']) {
  const [sent] = experiencePatch([{ position: 'Chef', startDate: '2020-03-01', currentlyWorking: true, endDate }]).workExperiences
  expect(`a current job sends no end date (field holds ${JSON.stringify(endDate)})`, 'endDate' in JSON.parse(JSON.stringify(sent)), false)
}
expect('a finished job sends its end date', experiencePatch([{ position: 'Cook', startDate: '2018-01-01', currentlyWorking: false, endDate: '2019-05-05' }]).workExperiences[0].endDate, '2019-05-05')

// A seeker with nothing saved yet.
const EMPTY = draftFromProfile(profile({ id: 's2' }))
expect('empty profile: clean', dirtyCards(clone(EMPTY), EMPTY), [])
expect('empty profile: a city picked', dirtyCards({ ...clone(EMPTY), homeCity: OTHER }, EMPTY), ['home'])
expect('empty profile: "Remove" with nothing saved is nothing', dirtyCards({ ...clone(EMPTY), homeCityRemoved: true }, EMPTY), [])
expect('empty profile: a first work row typed', dirtyCards({ ...clone(EMPTY), experiences: [row()] }, EMPTY), ['experience'])

// A draft built from a profile is clean against that profile, whatever the profile holds. Each
// iteration is its own check; the loop is fixed, so there is nothing to count afterwards.
for (let i = 0; i < 400; i++) {
  const js = { id: 's', fullName: pick(['A', ' B ', '']), bio: pick(['', 'x']), workExperience: Array.from({ length: Math.floor(rnd() * 3) }, () => ({ position: pick(['Cook', '']), startDate: pick(['2019-01-01T00:00:00.000Z', null]) })) }
  const base = draftFromProfile(profile(js))
  expect(`round trip is clean #${i}`, dirtyCards(clone(base), base), [])
}

// ---- 4c. One baseline: cardPatch and cardDirty read the same snapshot ---------------------------
// A draft can carry the page's own `savedHomeCity` / `savedPreferredIds`, and the page may let those
// go stale. Neither cardDirty nor cardPatch may read them: both go by the snapshot they are given.
const SNAP = draftFromProfile(
  profile({
    id: 's6',
    city: cityOf('c-a', 'Pune', 'Maharashtra'),
    preferredCities: [{ city: cityOf('c-b', 'Hyderabad') }, { city: cityOf('c-c', 'Chennai', 'Tamil Nadu') }],
  })
)
const SNAP_IDS = ['c-b', 'c-c']
for (const [name, over, wantDirty, wantHome, wantWork] of [
  // [name, what the draft holds, cards that must say "changed", home body, work-cities body]
  ['untouched; the copies say a different city and list', { savedHomeCity: OTHER, savedPreferredIds: ['zzz'] }, [], {}, {}],
  ['untouched; the copies say nothing is saved', { savedHomeCity: null, savedPreferredIds: [] }, [], {}, {}],
  ['another city picked; the copy says that city is saved', { homeCity: OTHER, savedHomeCity: OTHER }, ['home'], { cityId: 'c-z' }, {}],
  ['city removed; the copy says nothing is saved', { homeCity: null, homeCityRemoved: true, savedHomeCity: null }, ['home'], { cityId: null }, {}],
  ['picker emptied, no Remove; the copy says nothing is saved', { homeCity: null, savedHomeCity: null }, [], {}, {}],
  ['preferred cities cleared; the copy says the list is empty', { preferredCities: [], savedPreferredIds: [] }, ['workCities'], {}, { preferredCityIds: [] }],
  ['one preferred city added; the copy already lists all three', { preferredCities: [...SNAP.preferredCities, OTHER], savedPreferredIds: [...SNAP_IDS, 'c-z'] }, ['workCities'], {}, { preferredCityIds: [...SNAP_IDS, 'c-z'] }],
  ['preferred cities reordered; the copy says the list is empty', { preferredCities: [...SNAP.preferredCities].reverse(), savedPreferredIds: [] }, [], {}, {}],
]) {
  const d = { ...asDraft(SNAP), ...over }
  expect(`one baseline: ${name}: dirty`, dirtyCards(d, SNAP), wantDirty)
  expect(`one baseline: ${name}: home body`, wire(cardPatch('home', d, SNAP)), wantHome)
  expect(`one baseline: ${name}: work-cities body`, wire(cardPatch('workCities', d, SNAP)), wantWork)
}
{
  const none = draftFromProfile(profile({ id: 's7' }))
  expect('one baseline (nothing saved): a city picked goes out', wire(cardPatch('home', { ...asDraft(none), homeCity: OTHER, savedHomeCity: OTHER }, none)), { cityId: 'c-z' })
  expect('one baseline (nothing saved): Remove sends nothing', wire(cardPatch('home', { ...asDraft(none), homeCityRemoved: true }, none)), {})
  expect('one baseline (nothing saved): a first preferred city goes out', wire(cardPatch('workCities', { ...asDraft(none), preferredCities: [OTHER] }, none)), { preferredCityIds: ['c-z'] })
}

// Random edits of random snapshots. Two properties that hold only if the two functions share one
// baseline (stale copies are mixed in on purpose):
//  - for the two city cards, "changed" and "the body sends something" are the same answer;
//  - for every card, "not changed" means the body is exactly the one the untouched snapshot sends.
const editRows = (rows) => {
  const out = clone(rows)
  const anyRow = () => out[Math.floor(rnd() * out.length)]
  switch (pick(['none', 'edit', 'toggle', 'endDate', 'blank', 'filled', 'removeLast', 'spaces'])) {
    case 'edit': if (out.length) anyRow().position += 'x'; break
    case 'toggle': if (out.length) { const r = anyRow(); r.currentlyWorking = !r.currentlyWorking } break
    case 'endDate': if (out.length) anyRow().endDate = pick(['', '2024-01-01']); break
    case 'blank': out.push(blankRow()); break
    case 'filled': out.push(row({ position: 'New', startDate: '2022-02-02' })); break
    case 'removeLast': out.pop(); break
    case 'spaces': if (out.length) { const r = anyRow(); r.description = ` ${r.description ?? ''} ` } break
  }
  return out
}
const randomEdit = (snap) => {
  const d = asDraft(snap)
  d.savedHomeCity = pick([null, C[0], C[1], d.homeCity])
  d.savedPreferredIds = pick([[], ['zzz'], snap.preferredCities.map((c) => c.id)])
  if (rnd() < 0.3) d.fullName = pick([`${d.fullName} `, ` ${d.fullName}`, 'Other', ''])
  if (rnd() < 0.3) d.bio = pick(['', 'new', `${d.bio}  `])
  if (rnd() < 0.2) d.dateOfBirth = pick(['', '1991-01-01'])
  if (rnd() < 0.2) d.gender = pick(['', 'MALE', 'FEMALE', 'OTHER'])
  if (rnd() < 0.4) { d.homeCity = pick([null, C[0], C[1], snap.homeCity]); d.homeCityRemoved = rnd() < 0.5 }
  if (rnd() < 0.4) d.preferredCities = pick([[], subset(), [...snap.preferredCities].reverse(), snap.preferredCities.slice(1)])
  if (rnd() < 0.3) d.triple = pick([{}, { ...d.triple, sector: undefined }, { ...d.triple, sector: '' }, { category: 'New' }])
  if (rnd() < 0.2) d.language = pick(['', 'en', 'hi', 'ta'])
  if (rnd() < 0.5) d.experiences = editRows(d.experiences)
  return d
}
{
  const outcomes = Object.fromEntries(CARD_IDS.map((c) => [c, { dirty: 0, clean: 0 }]))
  for (let i = 0; i < 3000; i++) {
    const snap = draftFromProfile(randomProfile())
    const d = randomEdit(snap)
    for (const card of CARD_IDS) {
      const dirty = cardDirty(card, d, snap)
      const body = wire(cardPatch(card, d, snap))
      outcomes[card][dirty ? 'dirty' : 'clean']++
      if (card === 'home' || card === 'workCities') expect(`#${i} ${card}: changed exactly when the body sends it`, dirty, Object.keys(body).length > 0)
      if (!dirty) expect(`#${i} ${card}: not changed means the untouched body`, body, wire(cardPatch(card, asDraft(snap), snap)))
    }
  }
  // These properties say nothing if the edits never reach one of the two outcomes on a card.
  expect(
    'the random edits reach both outcomes on every card',
    CARD_IDS.filter((c) => outcomes[c].dirty < 100 || outcomes[c].clean < 100),
    []
  )
}

// ------------------------------------------------------------------------ 4e. statuses, activity and read-back (3B)
{
  const base = draftFromProfile(FULL)
  const lockedBy = { idle: false, saved: false, error: false, saving: true, checking: true, unknown: true }
  for (const [status, want] of Object.entries(lockedBy)) expect(`isCardLocked(${status})`, isCardLocked(status), want)

  const ui = idleCardUi()
  ui.job = { editing: false, status: 'unknown', error: '', note: '' }
  ui.about = { editing: false, status: 'checking', error: '', note: '' }
  ui.home = { editing: true, status: 'saving', error: '', note: '' }
  const activity = cardActivity(ui, { ...clone(base), homeCityRemoved: false }, base)
  expect('cardActivity: a held card is unconfirmed, not saving', [activity.job.saving, activity.job.unconfirmed], [false, true])
  expect('cardActivity: a card being read back is busy', [activity.about.saving, activity.about.unconfirmed], [true, false])
  expect('cardActivity: a card being saved is busy and editing', [activity.home.saving, activity.home.editing, activity.home.unconfirmed], [true, true, false])
  expect('cardActivity: idle cards are none of these', [activity.workCities.saving, activity.workCities.unconfirmed, activity.experience.saving], [false, false, false])
  expect('slicesToApply: a held, a checking and a saving card are all left alone', slicesToApply(activity), ['workCities', 'experience'])

  // bodyLanded: does the server hold what the body asked for? Written out by hand against FULL.
  const landed = (body, server = base) => bodyLanded(body, server)
  expect('bodyLanded: an empty body', landed({}), true)
  expect('bodyLanded: the saved bio', landed({ bio: 'I cook.' }), true)
  expect('bodyLanded: another bio', landed({ bio: 'mine' }), false)
  expect('bodyLanded: the name, trimmed on both sides', landed({ fullName: 'Asha Rao' }), true)
  expect('bodyLanded: another name', landed({ fullName: 'Asha R' }), false)
  expect('bodyLanded: date of birth and gender', [landed({ dateOfBirth: '1990-05-05', gender: 'FEMALE' }), landed({ gender: 'MALE' }), landed({ dateOfBirth: '1991-01-01' })], [true, false, false])
  expect('bodyLanded: the saved city', landed({ cityId: 'c-a' }), true)
  expect('bodyLanded: another city', landed({ cityId: 'c-z' }), false)
  expect('bodyLanded: removing a city that is still there', landed({ cityId: null }), false)
  expect('bodyLanded: removing a city that is gone', landed({ cityId: null }, { ...clone(base), homeCity: null }), true)
  expect('bodyLanded: work cities, any order', landed({ preferredCityIds: ['c-c', 'c-b'] }), true)
  expect('bodyLanded: work cities, one missing', landed({ preferredCityIds: ['c-b'] }), false)
  expect('bodyLanded: work cities, one extra', landed({ preferredCityIds: ['c-b', 'c-c', 'c-n'] }), false)
  expect('bodyLanded: work cities emptied', [landed({ preferredCityIds: [] }), landed({ preferredCityIds: [] }, { ...clone(base), preferredCities: [] })], [false, true])
  expect('bodyLanded: the job fields', [
    landed({ preferredCategory: 'Hospitality', preferredSector: 'Kitchen', preferredJobTitle: 'Cook', preferredLanguage: 'hi' }),
    landed({ preferredCategory: 'Retail' }),
    landed({ preferredLanguage: 'ta' }),
    landed({ preferredJobTitle: 'Baker' }),
  ], [true, false, false, false])
  const rows = experiencePatch(base.experiences).workExperiences
  expect('bodyLanded: the experience list as it is sent', landed({ workExperiences: rows }), true)
  expect('bodyLanded: a changed row', landed({ workExperiences: [{ ...rows[0], description: 'Other' }, rows[1]] }), false)
  expect('bodyLanded: a missing row', landed({ workExperiences: [rows[0]] }), false)
  expect('bodyLanded: the same rows in another order', landed({ workExperiences: [rows[1], rows[0]] }), true)
  expect('bodyLanded: a duplicated row is not the same set', landed({ workExperiences: [rows[0], rows[0]] }), false)
  expect('bodyLanded: undefined values are not compared', landed({ bio: undefined, fullName: 'Asha Rao' }), true)
  expect('bodyLanded: one wrong value among right ones', landed({ fullName: 'Asha Rao', bio: 'mine', gender: 'FEMALE' }), false)
}

// ------------------------------------------------------------------------ 4d. every saved field belongs to exactly one card
// rebaseCards, cardDirty and the page's applyCardValues each list which fields a card owns. A field
// added to the snapshot but forgotten in one list would go stale on a refresh, or be overwritten
// by one. Here every field of the snapshot is changed in turn and must be taken by exactly the card
// below (written out by hand), in rebaseCards and in cardDirty.
{
  const base = draftFromProfile(FULL)
  const other = {
    fullName: 'Other Name', bio: 'Other bio', dateOfBirth: '1980-01-01', gender: 'MALE',
    homeCity: { id: 'o-1', name: 'O', stateName: 'O' }, location: 'Other place',
    preferredCities: [{ id: 'o-2', name: 'O', stateName: 'O' }],
    triple: { category: 'oc', sector: 'os', jobTitle: 'oj' }, language: 'ta',
    experiences: [{ position: 'Other', companyName: '', startDate: '2000-01-01', endDate: '', currentlyWorking: false, description: '' }],
  }
  const OWNER = {
    fullName: 'about', bio: 'about', dateOfBirth: 'about', gender: 'about',
    homeCity: 'home', location: 'home',
    preferredCities: 'workCities',
    triple: 'job', language: 'job',
    experiences: 'experience',
  }
  expect('the test knows every field of the snapshot', sorted(Object.keys(base)), sorted(Object.keys(OWNER)))
  expect('…and so does the other side', sorted(Object.keys(other)), sorted(Object.keys(OWNER)))
  for (const card of CARD_IDS) {
    const rebased = rebaseCards(base, other, [card])
    const taken = Object.keys(OWNER).filter((k) => JSON.stringify(rebased[k]) !== JSON.stringify(base[k]))
    expect(`rebaseCards(${card}) takes exactly this card's fields`, sorted(taken), sorted(Object.keys(OWNER).filter((k) => OWNER[k] === card)))
    // The card is also the only one whose dirty check notices a change to those fields (location is
    // shown, never edited, so the home card does not treat it as a change).
    const draftOther = { ...clone(other), homeCityRemoved: false }
    const changed = CARD_IDS.filter((c) => cardDirty(c, { ...clone(base), homeCityRemoved: false, ...pickOwned(draftOther, card) }, base))
    expect(`changing only ${card}'s fields makes only ${card} dirty`, changed, [card])
  }
  function pickOwned(values, card) {
    const out = {}
    for (const k of Object.keys(OWNER)) if (OWNER[k] === card && k !== 'location') out[k] = values[k]
    return out
  }
  expect('rebaseCards with no cards changes nothing', rebaseCards(base, other, []), base)
  const all = rebaseCards(base, other, CARD_IDS)
  expect('rebaseCards with every card is the fresh snapshot', all, other)
  // Inputs are untouched and the result shares no object with the fresh one.
  const baseBefore = clone(base)
  const otherBefore = clone(other)
  const out = rebaseCards(base, other, CARD_IDS)
  expect('rebaseCards does not change its inputs', [base, other], [baseBefore, otherBefore])
  expect('rebaseCards shares no object with the fresh snapshot', [out.homeCity === other.homeCity, out.preferredCities === other.preferredCities, out.triple === other.triple, out.experiences[0] === other.experiences[0]], [false, false, false, false])
}

// ------------------------------------------------------------------------ 5. slicesToApply
const idle = { editing: false, dirty: false, saving: false }
const activityOf = (over) => Object.fromEntries(CARD_IDS.map((c) => [c, { ...idle, ...(over[c] ?? {}) }]))
expect('nothing going on: every card may refresh, in card order', slicesToApply(activityOf({})), [...CARD_IDS])
expect('a card in edit mode keeps its draft', slicesToApply(activityOf({ about: { editing: true } })), ['home', 'workCities', 'job', 'experience'])
expect('a dirty card keeps its draft', slicesToApply(activityOf({ job: { dirty: true } })), ['about', 'home', 'workCities', 'experience'])
expect('a saving card is left alone', slicesToApply(activityOf({ home: { saving: true } })), ['about', 'workCities', 'job', 'experience'])
expect('everything busy: nothing refreshes', slicesToApply(Object.fromEntries(CARD_IDS.map((c) => [c, { editing: true, dirty: true, saving: true }]))), [])
{
  // Every combination of the three flags on every card: 8 ^ 5 of them. What a card may do in each
  // of its eight states is a table written out by hand (key: editing, dirty, saving as 0/1), not
  // the `!a && !b && !c` that slicesToApply itself uses. A card may be refreshed in ONE state only:
  // the one where nothing is going on with it.
  const MAY_REFRESH = { '000': true, '001': false, '010': false, '011': false, '100': false, '101': false, '110': false, '111': false }
  const keyOf = (a) => `${+a.editing}${+a.dirty}${+a.saving}`
  const combos = Array.from({ length: 8 }, (_, n) => ({ editing: !!(n & 1), dirty: !!(n & 2), saving: !!(n & 4) }))
  expect('the eight states are the eight table rows', combos.map(keyOf).sort(), Object.keys(MAY_REFRESH).sort())
  for (let n = 0; n < 8 ** 5; n++) {
    const activity = {}
    CARD_IDS.forEach((c, i) => { activity[c] = combos[Math.floor(n / 8 ** i) % 8] })
    const want = CARD_IDS.filter((c) => MAY_REFRESH[keyOf(activity[c])])
    const got = slicesToApply(activity)
    if (got.join() !== want.join()) expect(`slicesToApply combination ${n}`, got, want)
  }
}

// ------------------------------------------------------------------------ 5b. sameCardDraft cannot drift from the draft
// sameCardDraft lists, by hand, the fields each card owns. A field added to DraftValues and left
// out of it would let a card look "unchanged while a request was out" when it was not. Every field
// of the draft is changed in turn and must be noticed by exactly the card below (written by hand).
{
  const base = { ...clone(draftFromProfile(FULL)), homeCityRemoved: false }
  delete base.location
  const OWNER = {
    fullName: 'about', bio: 'about', dateOfBirth: 'about', gender: 'about',
    homeCity: 'home', homeCityRemoved: 'home',
    preferredCities: 'workCities',
    triple: 'job', language: 'job',
    experiences: 'experience',
  }
  const changed = {
    fullName: 'Other', bio: 'Other', dateOfBirth: '1980-01-01', gender: 'MALE',
    homeCity: { id: 'o-1', name: 'O' }, homeCityRemoved: true,
    preferredCities: [{ id: 'o-2', name: 'O' }],
    triple: { ...base.triple, jobTitle: 'Other' }, language: 'ta',
    experiences: [...clone(base.experiences), { position: 'X', startDate: '', endDate: '', currentlyWorking: false }],
  }
  expect('the draft has exactly the fields the test knows', sorted(Object.keys(base)), sorted(Object.keys(OWNER)))
  expect('the test has a changed value for each', sorted(Object.keys(changed)), sorted(Object.keys(OWNER)))
  for (const card of CARD_IDS) expect(`sameCardDraft(${card}) of a draft with itself`, sameCardDraft(card, base, clone(base)), true)
  for (const key of Object.keys(OWNER)) {
    const edited = { ...clone(base), [key]: changed[key] }
    const noticedBy = CARD_IDS.filter((c) => !sameCardDraft(c, base, edited))
    expect(`changing ${key} is noticed by ${OWNER[key]} only`, noticedBy, [OWNER[key]])
  }
  // Strict, unlike cardDirty: a trailing space is a change. A row's React key is not.
  expect('a trailing space in the bio is a change', sameCardDraft('about', base, { ...clone(base), bio: base.bio + ' ' }), false)
  const keyed = { ...clone(base), experiences: base.experiences.map((r, i) => ({ ...r, key: `k${i}` })) }
  expect('a row key alone is not a change', sameCardDraft('experience', base, keyed), true)
}

// ------------------------------------------------------------------------ 5c. server-rendered markup (NOT browser testing)
// These render the real ProfileCard / CardControls to a string with react-dom/server. They prove
// the markup: which controls exist, which carry `disabled`, where the fieldset ends. They do NOT
// prove focus, what a screen reader announces, layout, or what a browser does with a disabled
// fieldset. They do not replace a browser pass.
{
  const req = createRequire(import.meta.url)
  const { renderToStaticMarkup } = req('react-dom/server')
  const React = req('react')
  const lucide = req('lucide-react')
  const { ProfileCard, CardControls } = loadSrc('components/profile/ProfileCard.tsx')
  const h = React.createElement
  const buttons = (html) =>
    [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => ({
      attrs: m[1],
      text: m[2].replace(/<[^>]*>/g, '').trim(),
      disabled: /\sdisabled(=|\s|$)/.test(m[1]),
      ariaDisabled: /aria-disabled="true"/.test(m[1]),
      busy: /aria-busy="true"/.test(m[1]),
    }))
  const byText = (html, text) => buttons(html).find((b) => b.text === text)
  const card = (props) => renderToStaticMarkup(h(ProfileCard, { icon: lucide.User, title: 'Where I live', children: h('input', { id: 'f' }), ...props }))

  // The feature off: nothing is added to the markup.
  const plain = card({ legend: 'Where I live' })
  expect('busy undefined: no fieldset', plain.includes('<fieldset'), false)
  expect('busy undefined: no legend', plain.includes('<legend'), false)
  // (useId gives each render its own id, so ids are blanked before the two are compared.)
  const noIds = (html) => html.replace(/ id="[^"]*"| aria-labelledby="[^"]*"/g, '')
  expect('busy undefined: the markup is the same with or without a legend', noIds(plain), noIds(card({})))
  // The feature on.
  const idle = card({ busy: false, legend: 'Where I live' })
  const locked = card({ busy: true, legend: 'Where I live' })
  expect('busy false: a fieldset that is not disabled', [idle.includes('<fieldset'), /<fieldset[^>]*disabled/.test(idle)], [true, false])
  expect('busy true: a disabled fieldset', /<fieldset[^>]*disabled/.test(locked), true)
  expect('the legend is the first child, hidden from sight but not from a screen reader', /<fieldset[^>]*><legend class="sr-only">Where I live<\/legend><input/.test(locked), true)
  expect('no legend text, no legend element', card({ busy: true }).includes('<legend'), false)

  const labels = { save: 'Save', saving: 'Saving…', cancel: 'Cancel', checkAgain: 'Check again', checking: 'Checking…', saved: 'Saved' }
  const ctl = (over) =>
    renderToStaticMarkup(h(CardControls, { editing: true, status: 'idle', error: '', note: '', canCheck: false, saveDisabled: false, labels, onSave() {}, onCancel() {}, onCheck() {}, ...over }))

  // The footer sits after the fieldset closes, so the disabled fieldset cannot switch it off.
  const withFooter = card({ busy: true, legend: 'L', footer: h('div', { dangerouslySetInnerHTML: { __html: ctl({}) } }) })
  expect('the footer is outside the disabled fieldset', withFooter.indexOf('</fieldset>') < withFooter.indexOf('>Save<'), true)
  expect('…and its buttons carry no disabled of their own while editing', buttons(withFooter).map((b) => b.disabled), [false, false])

  const live = (html) => [/role="status"/.test(html), /role="alert"/.test(html)]
  const editing = ctl({})
  expect('editing: Save and Cancel are enabled', [byText(editing, 'Save').disabled, byText(editing, 'Cancel').disabled], [false, false])
  expect('editing: no Check again', byText(editing, 'Check again'), undefined)
  expect('the status region is always there, the alert only with an error', live(editing), [true, false])
  const other = ctl({ saveDisabled: true })
  expect('another write in flight: Save off, Cancel on', [byText(other, 'Save').disabled, byText(other, 'Cancel').disabled], [true, false])

  const saving = ctl({ status: 'saving' })
  const savingSave = byText(saving, 'Saving…')
  expect('saving: Save is aria-disabled (not disabled, so it keeps focus), busy; Cancel is really disabled', [savingSave.disabled, savingSave.ariaDisabled, savingSave.busy, byText(saving, 'Cancel').disabled], [false, true, true, true])
  expect('saving: aria-disabled wins over another write being in flight', byText(ctl({ status: 'saving', saveDisabled: true }), 'Saving…').disabled, false)

  const unknown = ctl({ status: 'unknown', canCheck: true, error: "We couldn't confirm the save result." })
  expect('unknown: Save and Cancel off, Check again on', [byText(unknown, 'Save').disabled, byText(unknown, 'Cancel').disabled, byText(unknown, 'Check again').disabled], [true, true, false])
  expect('unknown: the message is an alert', [live(unknown)[1], unknown.includes('We couldn&#x27;t confirm')], [true, true])
  expect('unknown: Check again is a plain button, not a submit', /type="button"/.test(byText(unknown, 'Check again').attrs), true)

  const checking = ctl({ status: 'checking', canCheck: true })
  expect(
    'checking an unknown save: Check again stays (aria-disabled, busy), Save is aria-disabled, Cancel is disabled',
    [byText(checking, 'Checking…').disabled, byText(checking, 'Checking…').ariaDisabled, byText(checking, 'Checking…').busy, byText(checking, 'Save').ariaDisabled, byText(checking, 'Save').disabled, byText(checking, 'Cancel').disabled],
    [false, true, true, true, false, true]
  )
  expect('…and Checking… is not shown twice', checking.split('Checking…').length - 1, 1)
  const syncing = ctl({ status: 'checking' })
  expect('syncing an unchanged card: Checking… in the status line, no Check again button', [syncing.includes('Checking…'), byText(syncing, 'Check again'), byText(syncing, 'Checking…')], [true, undefined, undefined])

  const saved = ctl({ editing: false, status: 'saved' })
  expect('saved: the word stays and there are no buttons (no timer)', [saved.includes('Saved'), buttons(saved).length], [true, 0])
  expect('saved: a leftover error hides it', ctl({ editing: false, status: 'saved', error: 'x' }).includes('Saved'), false)
  // Clicks: CardControls has no hooks, so it can be called and its buttons' onClick run directly.
  const walk = (node, out = []) => {
    if (Array.isArray(node)) node.forEach((n) => walk(n, out))
    else if (node && typeof node === 'object' && node.props) {
      if (node.type === 'button') out.push(node)
      walk(node.props.children, out)
    }
    return out
  }
  const press = (over, marker) => {
    const calls = []
    const tree = CardControls({ card: 'job', editing: true, status: 'idle', error: '', note: '', canCheck: true, saveDisabled: false, labels, onSave: (c) => calls.push(['save', c]), onCancel: (c) => calls.push(['cancel', c]), onCheck: (c) => calls.push(['check', c]), ...over })
    for (const b of walk(tree)) if (b.props['data-focus'] === marker) b.props.onClick()
    return calls
  }
  expect('click: an idle Save, Cancel and Check again each hand back their card', [press({}, 'save'), press({}, 'cancel'), press({}, 'checkAgain')], [[['save', 'job']], [['cancel', 'job']], [['check', 'job']]])
  expect('click: Save is ignored while saving and while checking (mouse, Enter and Space all arrive as a click)', [press({ status: 'saving' }, 'save'), press({ status: 'checking' }, 'save')], [[], []])
  expect('click: Check again is ignored while checking', press({ status: 'checking' }, 'checkAgain'), [])
  expect('markers: Save, Cancel and Check again can be found by the page', ['save', 'cancel', 'checkAgain'].map((m) => new RegExp('data-focus="' + m + '"').test(unknown + ctl({ status: 'idle', canCheck: true }))), [true, true, true])
  expect('markers: a card section carries its id only when given one', [card({ cardId: 'job' }).includes('data-profile-card="job"'), plain.includes('data-profile-card')], [true, false])
  const noted = ctl({ editing: false, status: 'idle', note: 'Your saved city is kept.' })
  expect('a note is shown in the status region', [noted.includes('Your saved city is kept.'), live(noted)], [true, [true, false]])
  const quiet = ctl({ editing: false, status: 'idle' })
  expect('view mode with nothing to say: an empty status region and no buttons', [buttons(quiet).length, /role="status"[^>]*><\/div>/.test(quiet)], [0, true])
}

// ------------------------------------------------------------------------ 5d. where focus goes (pure) and how the page uses it
{
  const t = (e) => focusTargetAfter(e)
  expect('focus: Edit opens the first control', t({ kind: 'edit' }), 'first')
  expect('focus: Cancel returns to Edit', t({ kind: 'cancel' }), 'edit')
  const save = (outcome, problem) => t({ kind: 'save', outcome, problem })
  expect('focus: saved -> Edit', save('saved'), 'edit')
  expect('focus: refused -> Save', save('error'), 'save')
  expect('focus: unknown -> Check again', save('unknown'), 'checkAgain')
  expect('focus: invalid, by problem', [save('invalid', 'nameTooShort'), save('invalid', 'nameNotAName'), save('invalid', 'dobUnder18'), save('invalid')], ['name', 'name', 'dateOfBirth', 'save'])
  expect('focus: Check again, by outcome', ['landed', 'notApplied', 'readFailed'].map((outcome) => t({ kind: 'check', outcome })), ['edit', 'save', 'checkAgain'])

  // Source tripwires, not proof of behaviour: they catch the page drifting from the design.
  const code = fs.readFileSync(path.join(ROOT, 'src', 'app', 'profile', 'page.tsx'), 'utf8').replace(/\r\n/g, '\n')
  // Comment lines talk about .focus() without calling it, so they are not counted.
  const noComments = code.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  const calls = noComments.split('\n').filter((l) => l.includes('.focus()'))
  expect('focus: the page calls .focus() in exactly one place', calls.length, 1)
  const effectAt = noComments.indexOf('useLayoutEffect(() => {\n    const intent = focusIntentRef.current')
  const focusAt = noComments.indexOf('.focus()')
  expect('focus: ...and that place is the layout effect', effectAt > 0 && focusAt > effectAt && focusAt < noComments.indexOf('[cardUi])', effectAt), true)
  const handlers = noComments.slice(noComments.indexOf('  const settleCard = ('), noComments.indexOf('  useEffect(() => {\n    let ignore = false'))
  expect('focus: no handler (save, check, sync, hold, settle, cancel) calls .focus()', [handlers.length > 1000, handlers.includes('.focus(')], [true, false])
  expect('focus: Experience\'s Edit and Add are distinct keyed elements', [code.includes('key="edit"'), code.includes('key="add"')], [true, true])
  expect('focus: the card marker, the field markers and the date id exist only behind the flag', [
    (code.match(/cardId=\{PER_CARD_EDITING \? '/g) ?? []).length,
    code.includes("data-focus={PER_CARD_EDITING ? 'name' : undefined}"),
    code.includes("id={PER_CARD_EDITING ? 'profile-about-dob' : undefined}"),
    code.includes("data-focus={PER_CARD_EDITING ? 'add' : undefined}"),
  ], [5, true, true, true])
  expect('focus: the intent is dropped when focus is on another card', code.includes('if (!section.contains(active)) return'), true)
}

// ------------------------------------------------------------------------ 6. the helpers change nothing they are given
const deepFreeze = (v) => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(deepFreeze)
    Object.freeze(v)
  }
  return v
}
{
  const d = deepFreeze({ ...randomDraft(), experiences: [randomRow(), randomRow()] })
  const s = deepFreeze(draftFromProfile(deepFreeze(clone(FULL))))
  let threw = null
  try {
    for (const c of CARD_IDS) {
      cardPatch(c, d, pageBaseline(d))
      cardDirty(c, d, s)
    }
    slicesToApply(deepFreeze(activityOf({})))
  } catch (e) {
    threw = String(e)
  }
  expect('none of them writes to its arguments (all inputs frozen)', threw, null)
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks} profile-card-state checks failed:\n`)
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`)
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`)
  process.exit(1)
}
console.log(`✓ all ${checks} profile-card-state checks passed`)
