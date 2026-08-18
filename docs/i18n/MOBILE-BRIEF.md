# Mobile ARB translation brief

For the Flutter app at `../prosiddhi-mobile-app`. The portal brief is `BATCH-BRIEF.md`; this one
replaces it for ARB work.

## Read before you start

1. `.claude/agents/i18n-translator.md` — your role and hard rules (Mode 3 applies).
2. `docs/i18n/GLOSSARY.md` — audience, register, do-not-translate list.
3. **`docs/i18n/termbase/<lang>.md`** — the LOCKED vocabulary for your language.
4. `../prosiddhi-mobile-app/lib/l10n/app_en.arb` — the source.
5. `../prosiddhi-mobile-app/lib/l10n/app_hi.arb` — register reference.
6. ⭐ **`src/locales/<lang>/*.json` — the portal translations in YOUR language, if they exist.**
   Same product, same users, same terminology. A worker who uses the website and then installs the
   app must meet the same words. Reuse the portal's renderings wherever the concept matches; only
   diverge where the mobile string genuinely differs.

## What you write

`../prosiddhi-mobile-app/lib/l10n/app_<lang>.arb` — one file, all message keys.

## Hard rules

- **Identical key set** to `app_en.arb`, minus the metadata (see below). Values only.
- **`"@@locale"` must be your language code**, as the first entry.
- **Omit every `@key` metadata block.** Flutter reads descriptions and placeholder types from the
  template `app_en.arb` only; repeating them in a translated ARB is noise that drifts out of date.
  So if `app_en.arb` has `"authOtpSentToPhone"` and `"@authOtpSentToPhone"`, your file has only the
  former.
- **Placeholders are single-brace ICU**: `{name}`, `{seconds}`, `{count}`. Preserve byte-for-byte,
  same count per string. Never translate a placeholder name.
- If a string uses ICU plural/select syntax (`{count, plural, ...}`), **keep the ICU structure
  intact** and translate only the human-readable branches.
- Do-not-translate stays Latin: `ProSiddhi`, `OTP`, `GST`, `GSTIN`, `Razorpay`, `WhatsApp`, `Google`,
  `Google Play`, `App Store`, `UPI`.
- Valid JSON, 2-space indent, UTF-8.

## Verify before you finish

```
node scripts/verify-locales.mjs <lang>
```
Run it from the **portal** directory (`c:\dev\Azkashine\Prosiddhi\prosiddhi-frontend`). It checks the
mobile ARB too — look for the `mobile/app_<lang>.arb` lines. Fix everything it reports for your file.

## Your final message

SHORT report: key count written, validator status for your ARB, how many terms you were able to
reuse from the portal locale (and any place you deliberately diverged), and anything ambiguous.
