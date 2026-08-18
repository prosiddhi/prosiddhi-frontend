# English copy review brief

You are auditing the **English source strings** of ProSiddhi. Not the translations — the English
they are all derived from. Every defect you find is currently reproduced in ten languages.

**You do not edit anything. You produce a findings list.** The copy is product-owned; Nazir decides
what changes.

## Read first

1. `docs/PRODUCT.md` — what the product is and, critically, **the locked rules**. A string that
   contradicts one of those is the most valuable thing you can find.
2. `docs/i18n/GLOSSARY.md` §2 — who reads this copy.
3. `docs/i18n/GLOSSARY.md` §8 — defects already known. **Do not re-report these**; look for new ones.

## Who reads this

An **unskilled or blue-collar worker, often low-literacy, on a basic Android phone**, reading slowly.
Also employers, who are more literate but no more patient. Judge every string against that reader,
not against a style guide.

## What counts as a finding

Ranked by how much it matters:

1. **Contradicts a locked product rule** (PRODUCT.md §4/§5). Example already found: a seeker-facing
   line promising "a small subscription" when job seekers are free forever. These are the ones worth
   finding.
2. **Factually wrong** — a number, a claim, a feature that does not exist.
3. **Broken grammar** — "Create a account", "Company Size of Employee".
4. **Genuinely ambiguous** — a translator (or a user) cannot tell which meaning is intended.
   "Show the tutorial/Welcome" — two nouns, or a greeting?
5. **Wrong copy in the wrong place** — a string duplicated onto a card where it makes no sense.
6. **Internally inconsistent** — the same concept called two different things across screens, or a
   label that disagrees with the page it points at.
7. **Unreadable for this audience** — jargon ("algorithm", "TBC"), developer notation
   (`<country code>`), or an abbreviation this reader will not know.
8. **Untranslatable constructions** — `(s)` pluralisation hacks like "{{count}} seat(s)", which have
   no equivalent in Indic languages. i18next/ICU plural forms exist for this.

**Not findings:** British vs American spelling, Oxford commas, sentence case vs title case, or your
personal preference for a different word. Style opinions dilute the list and make the real defects
harder to see.

## How to report

A markdown table, most severe first:

| Key | Current English | Problem | Suggested fix | Severity |
|---|---|---|---|---|

- **Key** — the exact dotted key (portal) or ARB key (mobile), so it can be found without searching.
- **Problem** — what is wrong, in one line. Not "awkward" — say what breaks.
- **Suggested fix** — concrete replacement text, written for the audience above. If you are unsure
  what the string is *meant* to say, say so instead of inventing a meaning.
- **Severity** — 🔴 rule-contradiction / factually wrong · 🟠 grammar or ambiguity that reaches a
  user · 🟡 inconsistency or jargon.

End with a count and, if you found nothing in some area, say which areas you checked and found clean
— a short honest list beats a padded one.

## Scale

Do not pad. Twelve real defects are worth more than sixty items where fifty are style. If a namespace
is genuinely fine, say so.
