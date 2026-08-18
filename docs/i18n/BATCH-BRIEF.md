# Translation batch brief

**Every translation agent reads this.** Your prompt tells you only the target language and the files;
everything else is here.

## Read before you start

1. `.claude/agents/i18n-translator.md` — your role and hard rules.
2. `docs/i18n/GLOSSARY.md` — audience, register, do-not-translate list, placeholder rules.
3. **`docs/i18n/termbase/<lang>.md`** — the LOCKED vocabulary for your language. Follow it exactly.
   It is not a suggestion; it is what keeps nine namespaces reading as one product.
4. Each English source file you were given, and its `src/locales/hi/` counterpart — Hindi is your
   **register** reference (tone, sentence length, formality), not your wording reference.
5. If `src/locales/<lang>/common.json` already exists, read it and match its established style.

## What you write

Target files go to `src/locales/<lang>/<namespace>.json`. Create the directory if needed.
Use the Write tool. Never print file contents as your response.

## Hard rules — all mechanically verified

- **Identical key set and nesting** to the English source. You translate **values only**. No key
  added, dropped, renamed or reordered.
- **Arrays keep their exact length and order.** `legal.json` uses arrays for bullet lists; translate
  each element in place. A dropped bullet fails validation as a missing key.
- **Every `{{token}}` preserved byte-for-byte**, same count per string. Never translate a token name.
  Reorder the sentence around tokens as your grammar requires — that is expected and fine.
- **Pure-format strings are copied unchanged**: `"{{min}} - {{max}}"`, `"{{current}}/{{max}}"`.
- **Stay Latin** (GLOSSARY §3): `ProSiddhi`, `Azkashine`, `OTP`, `GST`, `GSTIN`, `CGST`, `SGST`,
  `IGST`, `UPI`, `Razorpay`, `WhatsApp`, `Google`, `Firebase`, and any URL or email sample.
- **i18next plural-suffix keys** (`_one` / `_other`) stay as separate keys with their exact names,
  even if your language pluralises identically. Never merge them.
- Emoji stay, in place. 2-space indent, UTF-8, valid JSON.

## Namespace notes

| Namespace | Watch out for |
|---|---|
| `auth`, `employerRegister` | **The highest-stakes screens in the product.** Error messages must tell a low-literacy user what to **DO next**, not merely what went wrong. Where the English is vague, prefer the actionable phrasing. |
| `employer` | Covers **money**. Keep *post credit* vs *download credit* consistently distinct — an employer must always know which one they are spending. And seat errors (`SEAT_SUSPENDED`, `NO_SEAT_AVAILABLE`) must **never** read as "buy credits": a suspended member cannot buy anything, only the OWNER can free a seat or upgrade. |
| `legal` | Privacy / Terms / Contact. Keep it plain and readable rather than legalistic — the reader is the same low-literacy worker, and an unreadable privacy policy protects nobody. |
| `seeker` | Job feed, applications, interviews. The most-used screens; favour short labels that fit a small phone. |
| `taxonomy` | Category ▸ Sector ▸ Job Title must stay three visibly distinct words, per your termbase. |

## Verify before you finish

Run `node scripts/verify-locales.mjs <lang>` and fix every error **for the files you were given**.

Errors reading `file missing` for namespaces you were **not** given are expected at this stage —
ignore those. Do not create empty files to silence them.

## Your final message

A SHORT report, not data:
- files written + key count each
- validator status for your files
- **anything you were unsure about** — an ambiguous English source, a term with no good equivalent,
  a placeholder that forced awkward grammar.

Flag, never silently guess. A flagged uncertainty is cheap; a confidently wrong string in a language
nobody on the team reads is not.
