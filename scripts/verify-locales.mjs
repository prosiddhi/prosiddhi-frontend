#!/usr/bin/env node
/**
 * Locale verification — the mechanical gate for the 10-language build.
 *
 *   node scripts/verify-locales.mjs            # verify every locale
 *   node scripts/verify-locales.mjs ta kn      # verify only these
 *
 * Checks, for the portal (src/locales) AND the mobile app (../prosiddhi-mobile-app/lib/l10n):
 *
 *   1. KEY PARITY       identical key set to English — nothing added, dropped or renamed
 *   2. PLACEHOLDERS     same {{token}} / {token} set and count in every single string
 *   3. SCRIPT           values are written in the language's own script (catches an untranslated
 *                       English string, and catches Tamil accidentally written into the Odia file)
 *   4. STRUCTURE        parses, and every value is a string
 *
 * What this CANNOT do is tell you a translation is *wrong*. It proves the files are structurally
 * sound and plausibly in the right language. Meaning needs a native speaker — see docs/i18n/GLOSSARY.md §7.
 *
 * Exit code 0 = clean, 1 = at least one error.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORTAL_LOCALES = path.join(ROOT, 'src', 'locales')
const MOBILE_L10N = path.resolve(ROOT, '..', 'prosiddhi-mobile-app', 'lib', 'l10n')

/** The final 10. Source of truth: src/lib/jobCategories.ts (locked 2026-08-17). */
const LANGUAGES = {
  en: { name: 'English', script: null },
  hi: { name: 'Hindi', script: [0x0900, 0x097f] },
  ta: { name: 'Tamil', script: [0x0b80, 0x0bff] },
  kn: { name: 'Kannada', script: [0x0c80, 0x0cff] },
  ml: { name: 'Malayalam', script: [0x0d00, 0x0d7f] },
  mr: { name: 'Marathi', script: [0x0900, 0x097f] },
  gu: { name: 'Gujarati', script: [0x0a80, 0x0aff] },
  or: { name: 'Odia', script: [0x0b00, 0x0b7f] },
  // Telugu ends at 0x0c7f — 0x0c80 onward is Kannada. Getting this wrong makes every
  // Kannada string look like it contains Telugu.
  te: { name: 'Telugu', script: [0x0c00, 0x0c7f] },
  bn: { name: 'Bengali', script: [0x0980, 0x09ff] },
}

/** Strings that legitimately stay in Latin script — see GLOSSARY.md §3. */
const DNT = [
  /^ProSiddhi/i, /Azkashine/i, /Razorpay/i, /WhatsApp/i, /^Google$/i,
  /^GSTIN?$/i, /^[CIS]GST$/i, /^UPI$/i, /^OTP$/i, /^English$/,
  /@[a-z0-9.-]+\.[a-z]{2,}/i,          // email samples
  /^https?:\/\//i,                      // URLs
  /^[\s\d\p{P}\p{S}]*$/u,               // pure punctuation / digits / symbols / emoji
]

const errors = []
const warnings = []
let filesChecked = 0
let stringsChecked = 0

const err = (f, msg) => errors.push(`${f}: ${msg}`)
const warn = (f, msg) => warnings.push(`${f}: ${msg}`)

/**
 * Flatten nested JSON to dotted keys.
 *
 * Arrays are flattened by index (`items.0`, `items.1`) rather than kept as leaves — legal.json uses
 * arrays for bullet lists, and indexing them means a translated list with a dropped or added bullet
 * shows up as a missing/extra key instead of slipping through as "one value that differs".
 */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

/** i18next {{token}} and ICU {token}; ICU plural bodies reduce to their identifiers. */
function placeholders(str, style) {
  if (typeof str !== 'string') return []
  const re = style === 'icu' ? /\{\s*([A-Za-z0-9_]+)\s*[,}]/g : /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g
  return [...str.matchAll(re)].map((m) => m[1]).sort()
}

/**
 * Terms that stay Latin *inside* an otherwise-translated string (GLOSSARY.md §3).
 * Distinct from the DNT list above, which matches a whole value.
 */
// `Google Play` / `App Store` are store-badge product names and must stay Latin — they are
// listed BEFORE the bare vendor names so the two-word form is stripped as a unit. Without them
// a translator is pushed into splitting the badge ("Google प्ले") just to satisfy the script
// check below, which is worse than leaving it alone.
const DNT_TOKENS =
  /\b(Google Play|Play Store|App Store|ProSiddhi|Azkashine|Razorpay|WhatsApp|Google|Firebase|GSTIN|CGST|SGST|IGST|GST|UPI|OTP|PDF|SMS|INV)\b/gi

/**
 * What is left of an English string once everything that must NOT be translated is
 * removed — brand and payment terms, placeholders, URLs, emails.
 *
 * This is what decides whether a string is genuinely translatable. Without it,
 * `"GST (18%)"` looks like untranslated English in every locale and the validator
 * cries wolf on correct files — and a validator with false positives is one people
 * learn to ignore.
 */
function translatableRemainder(en) {
  return en
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ')
    .replace(DNT_TOKENS, ' ')
}

function isDNT(en) {
  const trimmed = en.trim()
  if (DNT.some((re) => re.test(trimmed))) return true
  // Nothing translatable left once brand/payment terms and tokens are stripped.
  return !/[A-Za-z]{2}/.test(translatableRemainder(trimmed))
}

/**
 * Punctuation that lives in the Devanagari block but is **script-neutral** — shared by Bengali,
 * Odia, Marathi, Telugu and others as ordinary sentence-final punctuation.
 *
 * U+0964 danda `।` and U+0965 double danda `॥`. Counting these as "Devanagari" makes every correct
 * Bengali or Odia sentence look like it contains Hindi, which is a false positive severe enough to
 * bury the real ones.
 */
const NEUTRAL_INDIC_PUNCT = new Set([0x0964, 0x0965])

/** Does `str` contain at least one character in [lo, hi]? */
function hasScript(str, range) {
  if (!range) return true
  for (const ch of str) {
    const c = ch.codePointAt(0)
    if (NEUTRAL_INDIC_PUNCT.has(c)) continue
    if (c >= range[0] && c <= range[1]) return true
  }
  return false
}

/** Which OTHER Indic script does this string contain? Catches a misfiled translation. */
function foreignScript(str, lang) {
  const own = LANGUAGES[lang].script
  for (const [code, meta] of Object.entries(LANGUAGES)) {
    if (!meta.script || code === lang) continue
    // Devanagari is shared by hi + mr — never a conflict between those two.
    if (own && meta.script[0] === own[0]) continue
    if (hasScript(str, meta.script)) return meta.name
  }
  return null
}

/** Core comparison, shared by portal JSON and mobile ARB. */
function compare(label, lang, enFlat, tgtFlat, style) {
  filesChecked++
  const enKeys = Object.keys(enFlat)
  const tgtKeys = Object.keys(tgtFlat)

  const missing = enKeys.filter((k) => !(k in tgtFlat))
  const extra = tgtKeys.filter((k) => !(k in enFlat))
  if (missing.length) err(label, `${missing.length} MISSING key(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`)
  if (extra.length) err(label, `${extra.length} EXTRA key(s): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' …' : ''}`)

  let untranslated = 0
  for (const k of enKeys) {
    if (!(k in tgtFlat)) continue
    const en = enFlat[k]
    const tgt = tgtFlat[k]
    stringsChecked++

    if (typeof tgt !== 'string') {
      err(label, `${k}: value is ${typeof tgt}, expected string`)
      continue
    }

    // 2. placeholder parity
    //
    // i18next strings are flat, so the exact multiset must match — a dropped or duplicated
    // {{token}} is a real defect.
    //
    // ICU is different: `{count, plural, one{…} other{…}}` repeats `count` once per branch, and
    // languages legitimately have different branch counts (Arabic has six, Tamil merges some).
    // Comparing multisets there would fail correct translations, so ICU compares the SET of
    // identifiers — still catching a renamed, dropped or invented placeholder.
    const ep = placeholders(en, style)
    const tp = placeholders(tgt, style)
    const cmp = (arr) => (style === 'icu' ? [...new Set(arr)].sort() : arr)
    const epc = cmp(ep)
    const tpc = cmp(tp)
    if (epc.join('|') !== tpc.join('|')) {
      err(label, `${k}: placeholder mismatch — EN [${epc.join(', ')}] vs ${lang} [${tpc.join(', ')}]`)
    }

    // 3. script coverage
    if (typeof en === 'string' && !isDNT(en)) {
      const enHasWords = /[A-Za-z]{2}/.test(en)
      if (enHasWords) {
        if (tgt.trim() === en.trim()) {
          untranslated++
        } else if (!hasScript(tgt, LANGUAGES[lang].script)) {
          err(label, `${k}: no ${LANGUAGES[lang].name} script in value → "${tgt.slice(0, 45)}"`)
        }
        const foreign = foreignScript(tgt, lang)
        if (foreign) err(label, `${k}: contains ${foreign} script in a ${LANGUAGES[lang].name} file → "${tgt.slice(0, 45)}"`)
      }
    }
  }

  if (untranslated > 0) {
    const pct = ((untranslated / enKeys.length) * 100).toFixed(0)
    const msg = `${untranslated}/${enKeys.length} value(s) identical to English (${pct}%)`
    // A handful is normal (brand, format strings). A lot means the file was not really translated.
    if (untranslated > Math.max(8, enKeys.length * 0.05)) err(label, `${msg} — looks untranslated`)
    else warn(label, msg)
  }
}

function checkPortal(langs) {
  const enDir = path.join(PORTAL_LOCALES, 'en')
  if (!fs.existsSync(enDir)) return
  const namespaces = fs.readdirSync(enDir).filter((f) => f.endsWith('.json'))

  for (const lang of langs) {
    if (lang === 'en') continue
    const dir = path.join(PORTAL_LOCALES, lang)
    if (!fs.existsSync(dir)) {
      err(`portal/${lang}`, 'locale directory does not exist')
      continue
    }
    for (const ns of namespaces) {
      const tgtPath = path.join(dir, ns)
      const label = `portal/${lang}/${ns}`
      if (!fs.existsSync(tgtPath)) {
        err(label, 'file missing')
        continue
      }
      let en, tgt
      try {
        en = JSON.parse(fs.readFileSync(path.join(enDir, ns), 'utf8'))
        tgt = JSON.parse(fs.readFileSync(tgtPath, 'utf8'))
      } catch (e) {
        err(label, `invalid JSON — ${e.message}`)
        continue
      }
      compare(label, lang, flatten(en), flatten(tgt), 'i18next')
    }
  }
}

function checkMobile(langs) {
  const enPath = path.join(MOBILE_L10N, 'app_en.arb')
  if (!fs.existsSync(enPath)) {
    warn('mobile', `app_en.arb not found at ${MOBILE_L10N} — skipping mobile`)
    return
  }
  const stripMeta = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('@')))
  const en = stripMeta(JSON.parse(fs.readFileSync(enPath, 'utf8')))

  for (const lang of langs) {
    if (lang === 'en') continue
    const tgtPath = path.join(MOBILE_L10N, `app_${lang}.arb`)
    const label = `mobile/app_${lang}.arb`
    if (!fs.existsSync(tgtPath)) {
      err(label, 'file missing')
      continue
    }
    let raw
    try {
      raw = JSON.parse(fs.readFileSync(tgtPath, 'utf8'))
    } catch (e) {
      err(label, `invalid ARB/JSON — ${e.message}`)
      continue
    }
    if (raw['@@locale'] !== lang) {
      err(label, `@@locale is "${raw['@@locale']}", expected "${lang}"`)
    }
    compare(label, lang, en, stripMeta(raw), 'icu')
  }
}

// ---- run ----
const requested = process.argv.slice(2)
const langs = requested.length ? requested : Object.keys(LANGUAGES)
const unknown = langs.filter((l) => !(l in LANGUAGES))
if (unknown.length) {
  console.error(`Unknown language code(s): ${unknown.join(', ')}`)
  process.exit(1)
}

checkPortal(langs)
checkMobile(langs)

console.log(`\nverify-locales — ${filesChecked} file(s), ${stringsChecked} string(s) checked`)
console.log(`languages: ${langs.filter((l) => l !== 'en').join(', ') || '(none)'}\n`)

if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warning(s):`)
  warnings.forEach((w) => console.log(`   ${w}`))
  console.log('')
}

if (errors.length) {
  console.log(`❌ ${errors.length} error(s):`)
  errors.forEach((e) => console.log(`   ${e}`))
  console.log('')
  process.exit(1)
}

console.log('✅ All checked locales are structurally sound.\n')
