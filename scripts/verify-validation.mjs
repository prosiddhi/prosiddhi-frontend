#!/usr/bin/env node
/**
 * Golden-table checks for the portal's pure validation rules (Validation Phase 0).
 *
 *   node scripts/verify-validation.mjs
 *
 * Runs the REAL TypeScript source, same loader approach as verify-email.mjs
 * (transpiled in memory with the project's own `typescript`; no new dependencies).
 *
 * Covers: toMobileDigits / toE164 / toMobileInputDigits, GSTIN (both rules),
 * registration number, password policy, nameProblem. Email lives in verify-email.mjs.
 *
 * This is a BASELINE, not a spec. Every expectation records what the code does today.
 * Cases tagged "DIFFERENCE" or "QUIRK" pin behaviour that is known to be surprising or
 * to disagree with another rule; they are here so a later phase changes them on purpose.
 * See docs/qa/validation-differences.md.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

/** Load src/<name>.ts as CommonJS, mapping the '@/' alias onto the same loader. */
const cache = new Map()
function load(name) {
  if (cache.has(name)) return cache.get(name).exports
  const file = path.join(SRC, `${name}.ts`)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const mod = new Module(file)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  const baseRequire = createRequire(file)
  mod.require = (id) => (id.startsWith('@/') ? load(id.slice(2)) : baseRequire(id))
  cache.set(name, mod)
  mod._compile(outputText, file)
  return mod.exports
}

const { toMobileDigits, toE164, toMobileInputDigits } = load('lib/identifier')
const { GSTIN_REGEX } = load('lib/gst')
const { isValidGstNumber, isValidRegistrationNumber, normaliseIdentifier, GST_INPUT_MAX_LENGTH } =
  load('lib/businessIdentifiers')
const {
  isStrongPassword,
  passwordRuleChecks,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} = load('lib/validation/passwordPolicy')
const { nameProblem, isValidPersonName, NAME_MIN_LENGTH } = load('lib/nameValidation')

const failures = []
const counts = {}
let section = ''

function begin(name) {
  section = name
  counts[name] = 0
}

function expect(label, actual, expected) {
  counts[section]++
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) failures.push(`[${section}] ${label}\n    expected ${e}\n    got      ${a}`)
}

// ---------------------------------------------------------------- mobile digits
begin('mobile')
const MOBILE = [
  // [input, 10 digits or null, note]
  ['9876543210', '9876543210', 'bare 10 digits'],
  ['+919876543210', '9876543210', '+91 prefix'],
  ['919876543210', '9876543210', '91 prefix'],
  ['09876543210', '9876543210', '0 prefix'],
  ['6000000000', '6000000000', 'first digit 6 is the lowest allowed'],
  ['7000000000', '7000000000', 'first digit 7'],
  ['8000000000', '8000000000', 'first digit 8'],
  ['9999999999', '9999999999', 'first digit 9, highest'],
  ['5999999999', null, 'first digit 5'],
  ['1234567890', null, 'first digit 1'],
  ['0000000000', null, 'all zeros'],
  ['987654321', null, '9 digits'],
  ['98765432101', null, '11 digits, no known prefix'],
  ['', null, 'empty'],
  ['abc', null, 'letters'],
  ['98765abcde', null, 'letters in the tail'],
  [' 9876543210', null, 'leading space: nothing is trimmed'],
  ['9876543210 ', null, 'trailing space'],
  ['9876543210\n', null, 'trailing newline ($ does not match before it)'],
  ['98765 43210', null, 'inner space'],
  ['98765-43210', null, 'hyphen'],
  ['+91 9876543210', null, 'space after +91'],
  ['(987) 654-3210', null, 'punctuation'],
  ['+9876543210', null, '+ without 91'],
  ['0091 9876543210', null, '00 prefix'],
  ['00919876543210', null, '00 prefix, no space'],
  ['+449876543210', null, 'other country'],
  ['+919876543210 ', null, 'trailing space after +91 number'],
  ['0919876543210', null, '0 followed by 91: not a supported prefix chain'],
  ['+91987654321', null, '+91 then 9 digits'],
  ['+9198765432101', null, '+91 then 11 digits'],
  ['915876543210', null, '91 prefix then first digit 5'],
  ['+915876543210', null, '+91 prefix then first digit 5'],
  ['९८७६५४३२१०', null, 'Devanagari digits'],
  ['٩٨٧٦٥٤٣٢١٠', null, 'Arabic-Indic digits'],
  ['９８７６５４３２１０', null, 'full-width digits'],
  // QUIRK: a 10-digit number that starts with 91 is read as a bare number, never as a prefix.
  ['9198765432', '9198765432', 'QUIRK: 10 digits starting 91 is a bare number'],
]
for (const [input, digits, note] of MOBILE) {
  expect(`toMobileDigits(${JSON.stringify(input)}) - ${note}`, toMobileDigits(input), digits)
  expect(
    `toE164(${JSON.stringify(input)}) - ${note}`,
    toE164(input),
    digits === null ? null : `+91${digits}`,
  )
}

// toMobileInputDigits: what a capped phone input shows after typing/pasting.
const MOBILE_INPUT = [
  ['', '', 'empty is allowed (field cleared)'],
  ['9', '9', 'one digit typed'],
  ['98765', '98765', 'partial'],
  ['9876543210', '9876543210', 'whole number'],
  ['1234567890', '1234567890', 'QUIRK: a 10-digit non-mobile is kept while typing; toE164 rejects it later'],
  ['0987654321', '0987654321', 'QUIRK: 0 + 9 digits is kept as typed digits'],
  ['12345678901', null, '11 digits, not a supported number'],
  ['+919876543210', '9876543210', 'whole +91 number'],
  ['919876543210', '9876543210', 'whole 91 number'],
  ['09876543210', '9876543210', 'whole 0 number'],
  ['98765+919876543210', null, 'paste merged into existing text'],
  ['98765 43210', null, 'space'],
  ['98765abc', null, 'letters'],
  ['abc', null, 'letters only'],
  ['+', null, 'lone plus'],
  ['+91', null, 'prefix alone is refused'],
  ['９８７６', null, 'full-width digits'],
]
for (const [input, shown, note] of MOBILE_INPUT) {
  expect(`toMobileInputDigits(${JSON.stringify(input)}) - ${note}`, toMobileInputDigits(input), shown)
}

// ---------------------------------------------------------------------- GSTIN
begin('gstin')
// Position 13 (1-based) is the 13th character: the "entity number" slot after the PAN letter.
// gst.ts (checkout):            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/  -> position 13 is [1-9A-Z]
// businessIdentifiers.ts (reg): /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/          -> position 13 is [0-9A-Z]
expect(
  'GSTIN_REGEX source is the checkout pattern',
  GSTIN_REGEX.source,
  '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
)
expect('GST_INPUT_MAX_LENGTH', GST_INPUT_MAX_LENGTH, 20)

// [input, registration/profile rule (isValidGstNumber, normalises), checkout rule (GSTIN_REGEX.test on the raw input), note]
const GSTIN = [
  ['29ABCDE1234F1Z5', true, true, 'canonical example'],
  ['29ABCDE1234F1Z9', true, true, 'backend billing example'],
  ['29ABCDE1234F1Z0', true, true, 'checksum position accepts 0'],
  ['29ABCDE1234FAZ5', true, true, 'position 13 is a letter'],
  ['29ABCDE1234F9Z5', true, true, 'position 13 is 9'],
  // DIFFERENCE: the only structural difference between the two patterns.
  ['29ABCDE1234F0Z5', true, false, 'DIFFERENCE: position 13 is 0 (register accepts, checkout rejects)'],
  ['00ABCDE1234F1Z5', true, true, 'state code is not checked against the real list'],
  ['99ABCDE1234F1Z5', true, true, 'state code 99 is not checked'],
  ['29ABCDE1234F1X5', false, false, 'position 14 must be Z'],
  ['29ABCDE1234F1z5', true, false, 'lowercase z: register normalises, checkout regex does not'],
  ['29ABCDE1234F1Z', false, false, '14 characters'],
  ['29ABCDE1234F1Z55', false, false, '16 characters'],
  ['', false, false, 'empty'],
  ['29ABCDE1234F1Z!', false, false, 'symbol in the checksum slot'],
  ['2ABCDE12345F1Z5', false, false, 'only one digit of state code'],
  ['29ABCD11234F1Z5', false, false, 'digit inside the PAN letters'],
  ['29ABCDE12A4F1Z5', false, false, 'letter inside the PAN digits'],
  ['29ABCDE12341AZ5', false, false, 'digit where the PAN check letter belongs'],
  ['7576567FTYR6756', false, false, 'the keyboard-mash value that reached production'],
  // Normalisation: register/profile trims and upper-cases; the checkout regex alone does not
  // (CheckoutModal trims and upper-cases first, so its real behaviour matches the register rule here).
  ['29abcde1234f1z5', true, false, 'lowercase: register normalises, bare checkout regex does not'],
  [' 29ABCDE1234F1Z5', true, false, 'leading space'],
  ['29ABCDE1234F1Z5 ', true, false, 'trailing space'],
  ['\t29ABCDE1234F1Z5\n', true, false, 'tab/newline padding'],
  ['29ABCDE1234F1 Z5', false, false, 'inner space'],
  ['29ABCDE1234F1Z5\n29ABCDE1234F1Z5', false, false, 'two lines'],
  // QUIRK: toUpperCase maps dotless i to I, so this lowercase string normalises into a valid GSTIN.
  ['29abcde1234f\u0131z5', true, false, 'QUIRK: U+0131 dotless i upper-cases to I'],
  // QUIRK: toUpperCase turns ß into SS, changing the length.
  ['29ABCDE1234F1Zß', false, false, 'ß becomes SS (16 characters)'],
  ['２９ABCDE1234F1Z5', false, false, 'full-width digits in the state code'],
]
for (const [input, register, checkout, note] of GSTIN) {
  expect(`isValidGstNumber(${JSON.stringify(input)}) - ${note}`, isValidGstNumber(input), register)
  expect(`GSTIN_REGEX.test(${JSON.stringify(input)}) - ${note}`, GSTIN_REGEX.test(input), checkout)
}
// CONSISTENCY CHECK (relational, not hand-written golden values): the expected value is
// derived from the table above. CheckoutModal trims + upper-cases, then runs GSTIN_REGEX;
// with that step the two rules should differ ONLY on position 13 = '0'.
const checkoutNormalised = (v) => GSTIN_REGEX.test(v.trim().toUpperCase())
for (const [input, register, , note] of GSTIN) {
  const differs = input.trim().toUpperCase().charAt(12) === '0' && register
  expect(
    `[consistency] checkout (normalised) vs register: ${JSON.stringify(input)} - ${note}`,
    checkoutNormalised(input),
    differs ? false : register,
  )
}
expect('normaliseIdentifier trims and upper-cases', normaliseIdentifier('  29abcde1234f1z5\n'), '29ABCDE1234F1Z5')

// -------------------------------------------------------- registration number
begin('registration-number')
const atLen = (n) => 'A'.repeat(n)
const REG = [
  ['12345', true, 'minimum, 5'],
  ['1234', false, '4 is too short'],
  ['', false, 'empty'],
  ['     ', false, 'spaces only'],
  ['  1234  ', false, 'length is measured after trimming'],
  ['  12345  ', true, 'trimmed length 5'],
  [atLen(50), true, 'maximum, 50'],
  [atLen(51), false, '51 is too long'],
  [`  ${atLen(50)}  `, true, '50 after trimming'],
  ['u12345ka2020ptc123456', true, 'CIN, lowercase'],
  ['U12345KA2020PTC123456', true, 'CIN'],
  ['LLP-1234/5678', true, 'no pattern: punctuation is fine'],
  ['!!!!!', true, 'QUIRK: no character-class check, only length'],
  ['abcde', true, 'letters only'],
  ['12 34', true, 'inner space counts toward length (5)'],
  ['ß'.repeat(26), false, 'QUIRK: ß upper-cases to SS, so 26 ß is 52 characters'],
  ['ß'.repeat(25), true, 'QUIRK: 25 ß upper-cases to exactly 50 characters'],
  ['𠀀𠀀𠀀', true, 'QUIRK: length counts UTF-16 units, so 3 astral characters is 6'],
]
for (const [input, valid, note] of REG) {
  expect(`isValidRegistrationNumber(${JSON.stringify(input)}) - ${note}`, isValidRegistrationNumber(input), valid)
}

// -------------------------------------------------------------------- password
begin('password')
const PASSWORD = [
  ['Abcdef1!', true, 'minimum 8, all five classes'],
  ['Abcde1!', false, '7 characters'],
  ['Aa1!' + 'x'.repeat(60), true, 'exactly 64'],
  ['Aa1!' + 'x'.repeat(61), false, '65 characters'],
  ['', false, 'empty'],
  ['abcdef1!', false, 'no uppercase'],
  ['ABCDEF1!', false, 'no lowercase'],
  ['Abcdefg!', false, 'no digit'],
  ['Abcdefg1', false, 'no special character'],
  ['Abcdef 1', true, 'space counts as special'],
  ['Abcdef1£', true, 'non-ASCII symbol is special'],
  ['Abcdef1—', true, 'em dash is special'],
  ['Abcdef1é', true, 'QUIRK: an accented letter is "special" (anything outside A-Za-z0-9)'],
  ['Abcdefgé1', true, 'QUIRK: same, mid-string'],
  ['Abcdefg१!', false, 'Devanagari digit is not a number'],
  ['abcdefg1!É', false, 'non-ASCII uppercase is not an uppercase letter'],
  ['Aa1' + 'x'.repeat(60) + '😀', false, 'QUIRK: length is UTF-16 units: 63 characters but 65 units'],
  ['Aa1' + 'x'.repeat(58) + '😀', true, 'QUIRK: 62 characters, 64 units'],
  ['        ', false, 'only spaces'],
  ['Pass word1', true, 'passphrase with a space'],
]
for (const [input, valid, note] of PASSWORD) {
  expect(`isStrongPassword(${JSON.stringify(input)}) - ${note}`, isStrongPassword(input), valid)
}
expect('PASSWORD_MIN_LENGTH', PASSWORD_MIN_LENGTH, 8)
expect('PASSWORD_MAX_LENGTH', PASSWORD_MAX_LENGTH, 64)
const ruleMap = (pw) => Object.fromEntries(passwordRuleChecks.map((r) => [r.key, r.test(pw)]))
expect('rule keys, in order', passwordRuleChecks.map((r) => r.key), ['length', 'lowercase', 'uppercase', 'number', 'special'])
expect('rules: Abcdef1!', ruleMap('Abcdef1!'), { length: true, lowercase: true, uppercase: true, number: true, special: true })
expect('rules: abc', ruleMap('abc'), { length: false, lowercase: true, uppercase: false, number: false, special: false })
expect('rules: ABC123', ruleMap('ABC123'), { length: false, lowercase: false, uppercase: true, number: true, special: false })
expect('rules: 65 chars fails only the length rule', ruleMap('Aa1!' + 'x'.repeat(61)), { length: false, lowercase: true, uppercase: true, number: true, special: true })
// CONSISTENCY CHECK (relational): the checklist and the schema must agree: strong <=> every rule passes.
for (const [input] of PASSWORD) {
  expect(
    `[consistency] checklist agrees with schema for ${JSON.stringify(input)}`,
    passwordRuleChecks.every((r) => r.test(input)),
    isStrongPassword(input),
  )
}

// ----------------------------------------------------------------- nameProblem
begin('name')
const T = 'tooShort'
const N = 'notAName'
const NAMES = [
  // [input, nameProblem, note]
  ['', T, 'empty'],
  ['   ', T, 'spaces only: empty after trim'],
  ['A', T, 'one letter'],
  ['  A  ', T, 'one letter, padded'],
  ['Ab', null, 'minimum 2'],
  ['  Ab  ', null, 'padded'],
  ['7', N, 'one digit is a digits problem, not a length one'],
  ['77', N, 'two digits'],
  ['1234', N, 'the DEF-030 case'],
  ['Ram2', N, 'digit inside a name'],
  ['2Ram', N, 'leading digit'],
  ['----', N, 'no letter'],
  ['...', N, 'no letter'],
  [',', N, 'comma alone'],
  ["'", N, 'apostrophe alone'],
  ["D'Souza", null, 'ASCII apostrophe'],
  ['O’Brien', null, 'typographic apostrophe U+2019'],
  ['Anne-Marie', null, 'ASCII hyphen'],
  ['Anne‐Marie', null, 'U+2010 hyphen'],
  ['Anne‑Marie', null, 'U+2011 non-breaking hyphen'],
  ['Anne–Marie', null, 'U+2013 en dash'],
  ['Anne—Marie', null, 'U+2014 em dash'],
  ['Anne−Marie', N, 'U+2212 minus sign is a maths operator, rejected'],
  ['M. K. Gandhi', null, 'full stops and spaces'],
  ['Kumar, Ravi', null, 'comma'],
  ['Ravi\tKumar', null, 'tab counts as whitespace'],
  ['Ravi Kumar', null, 'non-breaking space'],
  ['Ravi\nKumar', null, 'QUIRK: a newline is whitespace and is allowed'],
  ['प्रिया', null, 'Hindi, with combining marks'],
  ['தமிழ்', null, 'Tamil'],
  ['ಕನ್ನಡ', null, 'Kannada'],
  ['മലയാളം', null, 'Malayalam'],
  ['বাংলা', null, 'Bengali'],
  ['క్ష', null, 'Telugu conjunct'],
  ['क्‍ष', null, 'Hindi with ZWJ'],
  ['क्‌ष', null, 'Hindi with ZWNJ'],
  ['क', T, 'one Indic letter is one character'],
  ['कि', null, 'two code units'],
  ['१२३', N, 'Devanagari digits'],
  ['राम१', N, 'Devanagari digit inside a name'],
  ['Ravi_Kumar', N, 'underscore'],
  ['Ravi@Kumar', N, 'at sign'],
  ['Ravi/Kumar', N, 'slash'],
  ['Ravi😀', N, 'emoji'],
  ['(Ravi)', N, 'parentheses'],
  ['Ravi (Raj)', N, 'parentheses inside a name'],
  ['José', null, 'precomposed accent'],
  ['José', null, 'combining accent'],
  ['Müller', null, 'umlaut'],
  ['́́', N, 'combining marks only: no letter'],
  ['‌‍', N, 'ZWNJ/ZWJ only: no letter'],
  ['𠀀', null, 'QUIRK: one astral letter is 2 UTF-16 units, so it passes the length check'],
  // DIFFERENCE: no maximum on the portal; the backend rejects more than 100.
  ['a'.repeat(100), null, 'exactly 100'],
  ['a'.repeat(101), null, 'DIFFERENCE: no portal maximum (backend personNameSchema max is 100)'],
  ['a'.repeat(1000), null, 'DIFFERENCE: no portal maximum'],
]
// The isValidPersonName line is a CONSISTENCY CHECK (expected derived from nameProblem's column);
// the nameProblem line is the hand-written golden value.
for (const [input, problem, note] of NAMES) {
  expect(`nameProblem(${JSON.stringify(input)}) - ${note}`, nameProblem(input), problem)
  expect(`[consistency] isValidPersonName(${JSON.stringify(input)}) - ${note}`, isValidPersonName(input), problem === null)
}
expect('NAME_MIN_LENGTH', NAME_MIN_LENGTH, 2)

// ------------------------------------------- backend drift guard (when present)
// Cheap tripwire, not a parity proof: confirm the backend still contains the exact
// patterns this file's tables were written against. It is a substring match on the file,
// so it can also match a comment. A missing file is reported as SKIPPED, never as a pass.
begin('backend-drift')
const BE = path.resolve(ROOT, '..', 'prosiddhi-backend', 'src')
const beHas = (rel, needle) => {
  const file = path.join(BE, rel)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').includes(needle) : null
}
const BE_PATTERNS = [
  ['validators/identifiers.ts', '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/', 'register/profile GSTIN'],
  ['utils/gst.ts', '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', 'checkout GSTIN'],
  ['validators/identifiers.ts', 'v.length >= 5 && v.length <= 50', 'registration number length'],
  ['validators/password.ts', 'PASSWORD_MAX_LENGTH = 64', 'password max'],
  ['validators/password.ts', '/[^A-Za-z0-9]/', 'password special character'],
  ['validators/person-name.ts', "/^[\\p{L}\\p{M}\\s'\\u2019,.\\u200C\\u200D\\p{Pd}]+$/u", 'name allowlist'],
  ['validators/person-name.ts', 'NAME_MAX_LENGTH = 100', 'name max'],
  ['validators/auth.validator.ts', 'const phoneRegex = /^\\+?[1-9]\\d{1,14}$/', 'backend phone regex'],
]
let beSkipped = 0
for (const [rel, needle, label] of BE_PATTERNS) {
  const found = beHas(rel, needle)
  if (found === null) {
    beSkipped++
    continue
  }
  expect(`backend ${rel} still contains: ${label}`, found, true)
}

// ---------------------------------------------------------------------- report
const driftRan = counts['backend-drift']
const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
const driftStatus =
  beSkipped === BE_PATTERNS.length
    ? 'backend drift guard: SKIPPED (backend repo not found - NOT checked)'
    : beSkipped > 0
      ? `backend drift guard: PARTIAL (${driftRan} ran, ${beSkipped} SKIPPED - file missing)`
      : `backend drift guard: ran (${driftRan} checks)`
const summary = Object.entries(counts)
  .map(([name, n]) => `${name}: ${n}`)
  .join(', ')
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${total} validation checks failed:\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ ${total - driftRan} portal checks passed; ${driftStatus}`)
console.log(`  counts: ${summary}`)
