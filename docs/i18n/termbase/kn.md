# Termbase — `kn` ಕನ್ನಡ (Kannada)

Locked **2026-08-17**. Follows `docs/i18n/GLOSSARY.md`. Every `kn` translation — portal JSON and
mobile ARB — **must** use these renderings exactly. One concept, one word, both repos.

Audience: a low-literacy blue-collar worker reading slowly on a cheap Android phone. Where a spoken
word and a literary word both work, this file picks the **spoken** one, even where Hindi picked the
literary one.

---

## 1. Address form — LOCKED

**Polite plural `ನೀವು` / `ನಿಮ್ಮ`, with the `-ಿ` imperative.** The register of a bank SMS or a
government service portal.

| Use | Don't use |
|---|---|
| `ನೀವು` (you), `ನಿಮ್ಮ` (your), `ನಿಮಗೆ` (to you) | `ನೀನು` / `ನಿನ್ನ` (intimate), `ತಾವು` / `ತಮ್ಮ` (hyper-formal) |
| `ಮಾಡಿ`, `ನಮೂದಿಸಿ`, `ಆಯ್ಕೆ ಮಾಡಿ`, `ಒತ್ತಿ` | `ಮಾಡು` (intimate), `ಮಾಡಿರಿ` / `ಮಾಡತಕ್ಕದ್ದು` (archaic/legal) |
| `ನಾವು` for the app's own voice ("we sent you a code") | third-person self-reference |

- `ದಯವಿಟ್ಟು` ("please") **only** where the English says "Please". Do not sprinkle it — it lengthens
  every string for no gain.
- Prefer `<noun> + ಮಾಡಿ` compounds over a single Sanskritised verb when the compound is what people
  say (`ರದ್ದು ಮಾಡಿ` over `ರದ್ದುಗೊಳಿಸಿ`).
- Split a long English sentence into two Kannada sentences rather than building one long clause.

## 2. `OTP` — LOCKED as Latin `OTP`

Write **`OTP`** in Latin letters, never `ಒಟಿಪಿ`, never `ಓಟಿಪಿ`.

Reason: every bank, wallet and delivery SMS in Karnataka prints `OTP` in Latin inside otherwise
Kannada text. Even a reader who cannot read English reads those three letters as a **shape** they
already know. `ಒಟಿಪಿ` is not how it is written anywhere the user has seen it, so it would be slower.
This is GLOSSARY.md §3's explicit "keep the letters" branch.

Related, and **not** the same thing:

| English | Kannada |
|---|---|
| OTP | `OTP` |
| verification code / 6-digit code | `ಪರಿಶೀಲನಾ ಕೋಡ್` / `6-ಅಂಕಿಯ ಕೋಡ್` |
| code (bare) | `ಕೋಡ್` |

Where English says "code" (not "OTP"), use `ಕೋಡ್`. Do not upgrade it to `OTP`, and do not downgrade
`OTP` to `ಕೋಡ್` — the English distinction is deliberate (email verification uses "code", phone uses
"OTP").

## 3. Script and digit rules

- **Latin digits `0-9` always.** Never Kannada numerals `೦-೯`. Placeholders inject Latin digits and
  mixing the two inside one string is unreadable.
- **`GST`, `GSTIN`, `CGST`, `SGST`, `IGST`, `UPI` stay Latin** per GLOSSARY.md §3. Do **not** follow
  the Hindi files here — they render these in Devanagari (`जीएसटी`), which §3 does not permit.
- **ZWNJ (U+200C) in loanwords.** Kannada loanwords that would otherwise form a wrong conjunct take a
  zero-width non-joiner: `ಅನ್‌ಲಾಕ್`, `ಇನ್‌ವಾಯ್ಸ್`, `ಇಂಟರ್‌ವ್ಯೂ`, `ಪಾಸ್‌ವರ್ಡ್`, `ಬುಕ್‌ಮಾರ್ಕ್`,
  `ಡ್ಯಾಶ್‌ಬೋರ್ಡ್`, `ಅಪ್‌ಲೋಡ್`, `ಡೌನ್‌ಲೋಡ್`, `ಶಾರ್ಟ್‌ಲಿಸ್ಟ್`. Copy these forms from this file rather
  than retyping them, so the ZWNJ is identical everywhere.

---

## 4. Core termbase (GLOSSARY.md §5)

| Concept (EN) | Kannada — LOCKED | Note (only where the call wasn't obvious) |
|---|---|---|
| Job | `ಕೆಲಸ` | Not `ಉದ್ಯೋಗ` — that is the newspaper/government word. `ಕೆಲಸ` is what a worker actually says ("ಕೆಲಸ ಇದೆಯಾ?") |
| Job seeker | `ಕೆಲಸ ಹುಡುಕುವವರು` | Mirrors "employer" below, so the two roles read as an obvious pair |
| Employer | `ಕೆಲಸ ಕೊಡುವವರು` | Not `ಉದ್ಯೋಗದಾತ` (literary) and not `ಮಾಲೀಕ` — `ಮಾಲೀಕ` is reserved for the team Owner role |
| Candidate | `ಅಭ್ಯರ್ಥಿ` | **Employer-facing screens only.** Never on seeker screens — there the same human is `ಕೆಲಸ ಹುಡುಕುವವರು` |
| Apply (verb) | `ಅರ್ಜಿ ಹಾಕಿ` | Not `ಅರ್ಜಿ ಸಲ್ಲಿಸಿ` — `ಹಾಕಿ` is the spoken form |
| Application (noun) | `ಅರ್ಜಿ` | |
| Applicant | `ಅರ್ಜಿದಾರ` | |
| Post a job | `ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡಿ` | Loanword; people know "post" from social apps. Where English says **Publish**, use `ಪ್ರಕಟಿಸಿ` |
| ~~Credit~~ | — | ⛔ **Never user-facing** (MONETIZATION.md §1, 2026-07-28). Do NOT use the loanword in any UI string. The two rows below are what the employer reads |
| Job Post | `ಕೆಲಸ ಪೋಸ್ಟ್` | The unit spent to publish a job. Countable: "you have 3 left" |
| Candidate Unlock | `ಅಭ್ಯರ್ಥಿ ಅನ್‌ಲಾಕ್` | The unit spent to reveal a candidate's contact. Never "download" — nothing is downloaded |
| Unlock (verb) | `ಅನ್‌ಲಾಕ್ ಮಾಡಿ` | |
| Plan | `ಪ್ಲಾನ್` | Loanword — everyone says "plan" for a mobile recharge |
| Subscription | `ಚಂದಾ` | Real Kannada, known from newspapers. Not `ಸಬ್‌ಸ್ಕ್ರಿಪ್ಷನ್` (long and awkward) |
| Wallet | `ವಾಲೆಟ್` | Loanword — the UPI/Paytm sense, which is exactly this |
| Invoice | `ಇನ್‌ವಾಯ್ಸ್` | Not `ಬಿಲ್` — this is a legal GST document and employer-facing |
| Interview | `ಇಂಟರ್‌ವ್ಯೂ` | Not `ಸಂದರ್ಶನ` — that reads as a press/celebrity interview and is literary |
| Chat | `ಚಾಟ್` | |
| Message | `ಸಂದೇಶ` | Plural `ಸಂದೇಶಗಳು` |
| Profile | `ಪ್ರೊಫೈಲ್` | |
| Resume / CV | `ರೆಸ್ಯೂಮೆ` | `ಬಯೋಡೇಟಾ` is arguably more spoken; `ರೆಸ್ಯೂಮೆ` chosen to match the signed-off Hindi register. Revisit if a native reviewer objects |
| Skill | `ಕೌಶಲ್ಯ` | Plural `ಕೌಶಲ್ಯಗಳು`. Familiar from "Skill India" = `ಕೌಶಲ್ಯ ಭಾರತ` |
| Experience | `ಅನುಭವ` | Work history = `ಕೆಲಸದ ಅನುಭವ` |
| Salary | `ಸಂಬಳ` | Not `ವೇತನ`. Hindi picked the formal word; `ಸಂಬಳ` is what a worker says, so we deviate deliberately |
| Location | `ಸ್ಥಳ` | |
| Category | `ವರ್ಗ` | Taxonomy **level 1** |
| Sector | `ಕ್ಷೇತ್ರ` | Taxonomy **level 2** |
| Job title | `ಹುದ್ದೆ` | Taxonomy **level 3** |
| Subcategory | `ಉಪ ವರ್ಗ` | Used by the job form, which says "Subcategory" not "Sector" |
| Verify (verb) | `ಪರಿಶೀಲಿಸಿ` | |
| Verification (noun) | `ಪರಿಶೀಲನೆ` | |
| Verified (badge) | `ಪರಿಶೀಲಿಸಲಾಗಿದೆ` | |
| Team | `ತಂಡ` | |
| Seat | `ಸೀಟ್` | Loanword — the "college seat"/licence sense, not the furniture `ಆಸನ` |
| Owner | `ಮಾಲೀಕ` | Team role |
| Member | `ಸದಸ್ಯ` | Team role |
| Report (bad content) | `ರಿಪೋರ್ಟ್ ಮಾಡಿ` | Not `ದೂರು` — that means a formal/legal grievance |
| Save (bookmark a job) | `ಉಳಿಸಿ` | Saved job = `ಉಳಿಸಿದ ಕೆಲಸಗಳು` |

## 5. Terms that collide — keep them apart

The English reuses one word for two things. Kannada must not.

| English | Sense | Kannada |
|---|---|---|
| **Apply** | apply for a job | `ಅರ್ಜಿ ಹಾಕಿ` |
| **Apply** | apply filters | `ಅನ್ವಯಿಸಿ` |
| **Save** | bookmark a job (seeker) | `ಉಳಿಸಿ` |
| **Bookmark** | flag a candidate (employer) | `ಬುಕ್‌ಮಾರ್ಕ್ ಮಾಡಿ` |
| **Verify** | check an OTP / a document | `ಪರಿಶೀಲಿಸಿ` |
| **Confirm** | confirm an action | `ದೃಢೀಕರಿಸಿ` |
| **Post** | publish a job (verb) | `ಪೋಸ್ಟ್ ಮಾಡಿ` |
| **Position** | number of openings | `ಹುದ್ದೆಗಳ ಸಂಖ್ಯೆ` |
| **Owner** | team account owner | `ಮಾಲೀಕ` |
| **Employer** | the hiring side | `ಕೆಲಸ ಕೊಡುವವರು` |

## 6. High-frequency UI words

Locked so they don't drift between namespaces.

| EN | KN | | EN | KN |
|---|---|---|---|---|
| Home | `ಹೋಮ್` | | Search | `ಹುಡುಕಿ` |
| Settings | `ಸೆಟ್ಟಿಂಗ್‌ಗಳು` | | Filter | `ಫಿಲ್ಟರ್` |
| Notifications | `ಸೂಚನೆಗಳು` | | Loading… | `ಲೋಡ್ ಆಗುತ್ತಿದೆ…` |
| Dashboard | `ಡ್ಯಾಶ್‌ಬೋರ್ಡ್` | | Cancel | `ರದ್ದು ಮಾಡಿ` |
| Login / Log in | `ಲಾಗಿನ್` | | Submit | `ಸಲ್ಲಿಸಿ` |
| Sign in | `ಸೈನ್ ಇನ್ ಮಾಡಿ` | | Continue | `ಮುಂದುವರಿಸಿ` |
| Sign up | `ಸೈನ್ ಅಪ್ ಮಾಡಿ` | | Back | `ಹಿಂದೆ` |
| Register / Registration | `ನೋಂದಣಿ` | | Next | `ಮುಂದೆ` |
| Logout / Sign out | `ಲಾಗ್ ಔಟ್` | | Close | `ಮುಚ್ಚಿ` |
| Password | `ಪಾಸ್‌ವರ್ಡ್` | | Send | `ಕಳುಹಿಸಿ` |
| Email | `ಇಮೇಲ್` | | Resend | `ಮತ್ತೆ ಕಳುಹಿಸಿ` |
| Phone number | `ಫೋನ್ ನಂಬರ್` | | Edit | `ಸಂಪಾದಿಸಿ` |
| Mobile | `ಮೊಬೈಲ್` | | Delete | `ಅಳಿಸಿ` |
| Company | `ಕಂಪನಿ` | | Remove | `ತೆಗೆದುಹಾಕಿ` |
| Worker | `ಕೆಲಸಗಾರ` | | Try again | `ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ` |
| Document | `ದಾಖಲೆ` | | Upload | `ಅಪ್‌ಲೋಡ್ ಮಾಡಿ` |
| Photo | `ಫೋಟೋ` | | Download | `ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ` |
| Optional | `ಐಚ್ಛಿಕ` | | Required | `ಕಡ್ಡಾಯ` |
| Yes / No | `ಹೌದು` / `ಇಲ್ಲ` | | Payment | `ಪಾವತಿ` |

**Status values** (`common.json`) — these are read at a glance, keep them short:

| EN | KN | | EN | KN |
|---|---|---|---|---|
| Applied | `ಅರ್ಜಿ ಹಾಕಲಾಗಿದೆ` | | Draft | `ಡ್ರಾಫ್ಟ್` |
| Under Review | `ಪರಿಶೀಲನೆಯಲ್ಲಿ` | | Active | `ಸಕ್ರಿಯ` |
| Shortlisted | `ಶಾರ್ಟ್‌ಲಿಸ್ಟ್` | | Inactive | `ನಿಷ್ಕ್ರಿಯ` |
| Accepted | `ಸ್ವೀಕೃತ` | | Closed | `ಮುಚ್ಚಲಾಗಿದೆ` |
| Rejected | `ತಿರಸ್ಕೃತ` | | Filled | `ಭರ್ತಿಯಾಗಿದೆ` |
| Withdrawn | `ಹಿಂಪಡೆಯಲಾಗಿದೆ` | | Cancelled | `ರದ್ದಾಗಿದೆ` |
| Bookmarked | `ಬುಕ್‌ಮಾರ್ಕ್ ಮಾಡಲಾಗಿದೆ` | | Unknown | `ತಿಳಿದಿಲ್ಲ` |
| Full Time | `ಪೂರ್ಣ ಸಮಯ` | | Part Time | `ಅರೆ ಸಮಯ` |
| Contract | `ಗುತ್ತಿಗೆ` | | Temporary | `ತಾತ್ಕಾಲಿಕ` |
| Internship | `ಇಂಟರ್ನ್‌ಶಿಪ್` | | Negotiable | `ಮಾತುಕತೆಗೆ ಅವಕಾಶ` |

## 7. Open questions for the native reviewer

Flagged now so review is cheap later. None of these block translation — the locked choice above is
used until a reviewer says otherwise.

1. **`ಕೆಲಸ ಕೊಡುವವರು` for "employer"** — plain and symmetric with "job seeker", but long for a nav
   label. `ಉದ್ಯೋಗದಾತ` is shorter; it is also the word a worker is least likely to know.
2. **`ರೆಸ್ಯೂಮೆ` vs `ಬಯೋಡೇಟಾ`** — Karnataka job seekers more often say *biodata*. Chose `ರೆಸ್ಯೂಮೆ`
   for consistency with the signed-off Hindi. Cheap to swap if challenged.
3. **`ಸಂಬಳ` for salary** — deliberate deviation from the Hindi register (`वेतन` → `ವೇತನ`). Confirm
   `ಸಂಬಳ` reads correctly on employer screens too, where the audience is more literate.
4. **Latin `OTP` and `GST` inside Kannada strings** — confirm `scripts/verify-locales.mjs` script
   coverage (GLOSSARY.md §7.3) allows these as do-not-translate exceptions, or the `kn` files will
   fail validation on strings that are correct.
