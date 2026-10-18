#!/usr/bin/env node
/**
 * Interview time display check — the mechanical gate for src/lib/timeFormat.ts.
 *
 *   node scripts/verify-time-format.mjs
 *
 * Runs the REAL TypeScript source (transpiled in memory with the project's own
 * `typescript`, same approach as verify-otp-send.mjs). No new dependencies.
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, 'src', 'lib', 'timeFormat.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const mod = new Module(file)
mod.filename = file
mod.paths = Module._nodeModulePaths(path.dirname(file))
mod.require = createRequire(file)
mod._compile(outputText, file)
const { formatInterviewTime, parse24Hour, to24Hour } = mod.exports

const cases = [
  // 24-hour HH:mm, what <input type="time"> submits
  ['15:00', '3:00 PM'],
  ['00:00', '12:00 AM'],
  ['12:00', '12:00 PM'],
  ['09:05', '9:05 AM'],
  ['23:59', '11:59 PM'],
  ['00:30', '12:30 AM'],
  ['12:45', '12:45 PM'],
  ['9:05', '9:05 AM'],
  // legacy free text
  ['10:30 AM', '10:30 AM'],
  ['2:30 PM', '2:30 PM'],
  ['10:30 am', '10:30 AM'],
  ['2:30pm', '2:30 PM'],
  ['2:30 p.m.', '2:30 PM'],
  ['12:00 AM', '12:00 AM'],
  ['12:00 PM', '12:00 PM'],
  ['  3:15 PM  ', '3:15 PM'],
  // not a time: shown exactly as stored
  ['cgarhtehsed 11:49', 'cgarhtehsed 11:49'],
  ['24:00', '24:00'],
  ['10:75', '10:75'],
  ['13:00 PM', '13:00 PM'],
  ['0:30 AM', '0:30 AM'],
  ['morning', 'morning'],
  // empty
  ['', ''],
  [undefined, ''],
  [null, ''],
]

const failures = cases.filter(([input, expected]) => formatInterviewTime(input) !== expected)
for (const [input, expected] of failures) {
  console.error(`FAIL ${JSON.stringify(input)}
    expected ${JSON.stringify(expected)}
    got      ${JSON.stringify(formatInterviewTime(input))}`)
}
let total = cases.length
let failed = failures.length

function check(label, actual, expected) {
  total++
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failed++
    console.error(`FAIL ${label}
    expected ${JSON.stringify(expected)}
    got      ${JSON.stringify(actual)}`)
  }
}

// 12-hour parts -> the 24-hour "HH:mm" the API takes
const t = (hour12, minute, period) => to24Hour({ hour12, minute, period })
check('12:00 AM is midnight', t(12, 0, 'AM'), '00:00')
check('12:30 AM', t(12, 30, 'AM'), '00:30')
check('12:00 PM is noon', t(12, 0, 'PM'), '12:00')
check('12:59 PM', t(12, 59, 'PM'), '12:59')
check('3:30 PM', t(3, 30, 'PM'), '15:30')
check('9:05 AM keeps the leading zero', t(9, 5, 'AM'), '09:05')
check('1:00 AM', t(1, 0, 'AM'), '01:00')
check('11:59 PM', t(11, 59, 'PM'), '23:59')

// "HH:mm" -> 12-hour parts
check('parse 00:00', parse24Hour('00:00'), { hour12: 12, minute: 0, period: 'AM' })
check('parse 12:00', parse24Hour('12:00'), { hour12: 12, minute: 0, period: 'PM' })
check('parse 15:30', parse24Hour('15:30'), { hour12: 3, minute: 30, period: 'PM' })
check('parse 09:05', parse24Hour('09:05'), { hour12: 9, minute: 5, period: 'AM' })
check('parse 23:59', parse24Hour('23:59'), { hour12: 11, minute: 59, period: 'PM' })

// cleared or unusable values are null, never a made-up time
for (const bad of ['', undefined, null, '24:00', '10:60', '9:05', '10:30 AM', 'abc', '15:30:00']) {
  check(`parse ${JSON.stringify(bad)} is null`, parse24Hour(bad), null)
}

// every minute of the day survives the round trip, and the picker's output is what the BE regex takes
const BE_TIME = /^(?:([01]?\d|2[0-3]):[0-5]\d)$/
let roundTripBad = 0
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m++) {
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const parts = parse24Hour(value)
    if (!parts || to24Hour(parts) !== value || !BE_TIME.test(value)) roundTripBad++
  }
}
check('all 1440 minutes round-trip and match the BE pattern', roundTripBad, 0)

console.log(`${total - failed}/${total} checks passed`)
process.exit(failed ? 1 : 0)
