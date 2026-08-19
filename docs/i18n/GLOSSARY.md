# ProSiddhi — Translation Glossary & Style Guide

**The contract every translation agent works to.** Applies to the portal (`src/locales/<lang>/*.json`)
and the mobile app (`prosiddhi-mobile-app/lib/l10n/app_<lang>.arb`).

Created **2026-08-17** for the 8-language localisation pass. English and Hindi already ship and are
**reference, not targets** — the Hindi files encode the register that was signed off, so match their
tone, not just their meaning.

---

## 1. The 10 shipped languages

`en` English · `hi` हिन्दी · `ta` தமிழ் · `kn` ಕನ್ನಡ · `ml` മലയാളം · `mr` मराठी ·
`gu` ગુજરાતી · `or` ଓଡ଼ିଆ · `te` తెలుగు · `bn` বাংলা

This list is **final** (locked 2026-08-17). Odia is in; Punjabi is not. Source of truth:
`src/lib/jobCategories.ts`.

---

## 2. Who we are writing for

Read this before translating a single string. It decides almost every judgement call.

The job seeker is an **unskilled or blue-collar worker, often low-literacy, on a basic Android
phone**. They may be reading their own language slowly, letter by letter. This means:

- **Use the simplest word that is correct**, never the most formal or literary one. If a
  Sanskritised/Persianised register and a colloquial one both work, choose the colloquial one — the
  word people actually say out loud.
- **Short sentences.** Split a long English sentence into two if the target language needs it.
- **Prefer the widely-understood English loanword** when that is genuinely what people say. Across
  urban and semi-urban India, words like *mobile*, *OTP*, *email*, *password*, *profile*, *photo*,
  *interview*, *company* are commonly spoken in the local language. Writing an obscure "pure" native
  coinage for these makes the app *harder* to read, not more respectful. Render the loanword in the
  **native script** (e.g. Tamil `மொபைல்`), not in Latin.
- **Never invent terminology.** If no natural word exists, use the loanword in native script.
- The employer audience is more literate, but the same plain register still applies — do not switch
  to a formal register for employer screens.

**Politeness / address form:** use the **polite-but-plain** second person of each language — the
form a bank SMS or a government service uses. Match what Hindi already does (आप, not तू/तुम).
Never use an intimate or a hyper-formal literary form.

---

## 3. Do NOT translate (leave exactly as-is, Latin script)

These stay verbatim in every language:

| | |
|---|---|
| **Brand** | `ProSiddhi`, `Azkashine` |
| **Payments** | `Razorpay`, `GST`, `GSTIN`, `CGST`, `SGST`, `IGST`, `UPI` |
| **Third-party** | `WhatsApp`, `Google`, `Firebase` |
| **Codes/format** | `INV/YY-YY/NNNNNN`, currency symbol `₹`, any HTML tag, any URL, any email address |
| **Placeholder samples** | `teammate@company.com`, `company@example.com` |

`OTP` is a special case: keep the letters `OTP` where the language commonly uses them, or render as
the natural native equivalent if that is what people actually say. Be consistent within a language —
decide once in the termbase and never mix.

---

## 4. Placeholders — the hard rule

**Every placeholder token must survive translation byte-for-byte, and the count must match exactly.**
This is mechanically validated; a mismatch fails the build.

| Surface | Form | Example |
|---|---|---|
| Portal (i18next) | `{{name}}` | `"Welcome back, {{name}}"` |
| Mobile (ARB/ICU) | `{name}` | `"Resend in {seconds}s"` |

- Do **not** translate the token name. `{{count}}` stays `{{count}}`, never `{{गिनती}}`.
- Do **not** add or drop tokens.
- **Word order may change** — that is the point of translating. Move the token wherever the target
  grammar needs it.
- Formatting strings with no words (`"{{min}} - {{max}}"`, `"{{current}}/{{max}}"`) are copied
  **unchanged**.
- Keep leading/trailing spaces and punctuation that sit outside the token.
- Emoji in a string (e.g. `🔊`) are kept in place.

---

## 5. Core termbase

Translate these **consistently everywhere**. The English column is the concept; the Hindi column is
the approved reference rendering. Each language locks its own choice **once** in
`docs/i18n/termbase/<lang>.md` and then never deviates.

| Concept (EN) | Hindi reference | Note |
|---|---|---|
| Job | नौकरी | The listing/position. Not "work" in the abstract |
| Job seeker | नौकरी खोजने वाला | The worker. Never "candidate" on seeker-facing screens |
| Employer | नियोक्ता | The hiring side |
| Candidate | उम्मीदवार | Only on **employer-facing** screens (the same human as "job seeker") |
| Apply / Application | आवेदन | |
| Post a job | नौकरी पोस्ट करें | The employer publishing a listing |
| ~~Credit~~ | — | ⛔ **Never user-facing.** Internal model word only (MONETIZATION.md §1, 2026-07-28). It must not appear in any UI string, in English or in translation — including as the loanword क्रेडिट / கிரெடிட் / ಕ್ರೆಡಿಟ್ etc. The rows below are what the employer actually reads |
| Job Post | जॉब पोस्ट | The unit spent to publish a job (internally a "post credit"). Countable: "you have 3 left" |
| Candidate Unlock | उम्मीदवार अनलॉक | The unit spent to reveal a candidate's contact (internally a "download credit") |
| Unlock (verb) | अनलॉक करें | Revealing contact details |
| Plan / Subscription | प्लान / सदस्यता | |
| Balance | — | What the employer has left. Replaced "Wallet" on screen 2026-08-19; the heading now reads "What you have left" |
| Invoice | इनवॉइस | The GST document |
| Interview | इंटरव्यू | |
| Chat / Message | चैट / संदेश | |
| Profile | प्रोफ़ाइल | |
| Resume / CV | रिज्यूमे | |
| Skill | कौशल | |
| Experience | अनुभव | Work history |
| Salary | वेतन | |
| Location | स्थान | |
| Category / Sector / Job Title | श्रेणी / क्षेत्र / पद | The 3-level taxonomy. Keep the three distinct |
| Verify / Verification | सत्यापित करें | |
| Team / Seat | टीम / सीट | Multi-user employer accounts |
| Owner / Member | मालिक / सदस्य | Team roles |
| Report (a job) | रिपोर्ट करें | Flagging bad content |
| Save / Saved job | सहेजें | Bookmarking |

**Consistency rule:** one concept → one word, for the whole language, across both repos. If
`employer` is rendered one way in `auth.json` and another way in `employer.json`, that is a defect.

---

## 6. Output format rules

- **Return only the translated file content** — no prose, no markdown fences, no commentary.
- **JSON (portal):** UTF-8, 2-space indent, identical nesting and key order to the English source.
  Every key present. No key renamed, added or removed.
- **ARB (mobile):** translate only the message values. `@@locale` must be set to the target code.
  `@key` metadata blocks (descriptions, placeholder definitions) are **omitted** from non-template
  ARB files — Flutter reads them from `app_en.arb` only.
- Never leave an English value in a target file unless it is on the do-not-translate list in §3.

---

## 7. Validation

`node scripts/verify-locales.mjs` checks every locale mechanically:

1. **Key parity** — identical key set to English, no extras, no omissions.
2. **Placeholder parity** — same tokens, same count, per string.
3. **Script coverage** — values are in the expected script for the language (catches an untranslated
   English string, or the wrong language pasted into the wrong file).
4. **Structural validity** — parses as JSON/ARB, correct nesting.

This catches *mechanical* failure only. It cannot tell you a translation is **wrong** — that needs a
native speaker. See STATUS.md for the review status of each language.

---

## 8. Gaps found during the 2026-08-17 pass

> **Status, 2026-08-18:** the *source-copy* defects listed further down were audited in full the
> next day and are now tracked — with fix status — in **`docs/i18n/COPY-DEFECTS.md`**, which
> supersedes the "Source-copy defects" and "Breadcrumb ↔ page-title" tables below. Most are fixed.
> The **termbase gaps** in the first table are still open and still worth locking.
>
> One correction to this section: the Gujarati gender entry was not merely a gap. `જાતિ` means
> **caste**, and it shipped in two files. Both are fixed and `termbase/gu.md` now carries the
> reasoning so it cannot be reintroduced.

Concepts the translators hit that §5 does **not** lock. Each language resolved them independently, so
they are internally consistent per language but were never agreed across the product. Recorded here
so a reviewer knows where to look and a future pass can lock them.

| Concept | Why it needs a lock |
|---|---|
| **Admin** | Loanword or native word? Tamil chose the loanword; nothing constrained the others. |
| **Register** (verb) | Two defensible renderings in most languages (loanword vs native "enrol"). Marathi's two agents picked differently and had to reconcile mid-run. |
| **Create account** | Not locked; Telugu picked "create" where "open an account" was equally natural. |
| **Employee (company size)** | ⚠️ The sharpest one. §5 locks *Worker*, but `profile.employer.size_*` counts **staff headcount**, and the worker word renders "1–10 labourers" on an employer form. Marathi and Kannada both hit this independently. **Worker ≠ employee** in this context. |
| **Designation** vs **Job Title** | The taxonomy's level-3 term and the free-text work-history field collide in several languages. Marathi, Kannada, Telugu, Tamil and Malayalam each solved it differently. |
| **Logout / Sign out** | English uses both for one action; Hindi renders them as two different words. Malayalam deliberately collapsed them. |
| **Conversation** vs **Chat** | Same object in the product, two English words. Some languages kept them distinct, some collapsed them. |
| **Retry** vs **Try again** | No natural distinction in most Indic languages; both keys exist and render identically (Hindi does the same). Consider dropping one key. |

### Source-copy defects found while translating

These are **English** problems, surfaced because a translator had to decide what the string meant.
The translations render the evident intent, so the target languages currently read *better* than the
source:

| Key | Problem | Severity |
|---|---|---|
| `seeker.landing.feature3Title` | **"Find jobs with a small subscription that fits your budget."** — tells **job seekers** they pay a subscription, contradicting PRODUCT.md §3 *"Revenue is employer-side only. Job seekers are free forever."* | 🔴 contradicts a locked product rule |
| `employer.landing.pricing.enterpriseSubtitle` | Verbatim copy of `freeSubtitle` — the **Enterprise** card reads *"Just for browsers and limited plan"* | 🔴 wrong copy on a pricing tier |
| `employer.landing.offers.card1Desc` | Same sentence printed twice, no space | ✅ **fixed 2026-08-17** |
| `employerRegister.subtitle` | "Create **a account** for the Hiring People" | 🟠 grammar, on employer signup |
| `employerRegister.companyDetails.companySize` | "Company Size of Employee" | 🟠 grammar |
| `employerRegister.companyDetails.companyAddressPlaceholder` | Label says *Address*, placeholder says *location* | 🟡 |
| `auth.success.showTutorial` | "Show the tutorial/Welcome" — two nouns, or a greeting? | 🟡 ambiguous |
| `auth.phone.errorInvalid` | Uses `<country code><number>`; angle brackets are developer notation, meaningless to a low-literacy reader | 🟡 |
| `auth.register.individualDesc` / `corporateDesc` | "Owned by personally" / "Owned by Shareholder" | 🟡 grammar |
| `seeker.landing.feature1Title` | **"…jobs translating more than 12+ languages."** — "more than 12+" is redundant, **12 is factually wrong** (the locked list is 10), and the grammar is garbled. A false public claim on the seeker landing page | 🔴 false claim |
| `seeker.landing.downloadApp` | "Download our App platform" — not grammatical. Also advertises store listings while `legal.footer.mobileBody` says the app is still in development | 🟠 |
| `employer.plans.free.f6` | "No Standard matching algorithm" — odd copy, and "algorithm" is unreadable for this audience | 🟡 |

### Translation defects found and fixed during the pass

| Locale | Was | Now | Why |
|---|---|---|---|
| `gu` | Gender field labelled **જાતિ** (`genderLabel`, `genderSelect`, `errorGender`) | **લિંગ** | જાતિ means **caste** in common Gujarati. On an Indian job portal a field that appears to ask for caste is a discrimination-adjacent defect, not a nuance. All nine other languages already used the correct word — Gujarati was the sole outlier. The possessive was adjusted too (તમારી → તમારું), since લિંગ is neuter where જાતિ is feminine. `gu.md` should be amended so this cannot recur |

**Breadcrumb ↔ page-title mismatches in the English** (flagged independently by the Marathi and
Kannada agents; every language faithfully reproduces the mismatch):

| Breadcrumb says | The page it points at says |
|---|---|
| `breadcrumbs.candidates` = "Applicants" | `employer.candidates.title` = "Candidates" |
| `breadcrumbs.terms` = "Terms of Service" | `legal.terms.title` = "Terms & Conditions" |
| `breadcrumbs.workers` = "Candidate Database" | `employer.workers.title` = "Find workers" |

### Layout risk

Indic translations run **20–30% longer than English** (Hindi files are already ~1.9× the English by
byte count). Several agents flagged specific controls likely to overflow: the login role tabs,
`otp.resendIn` countdown buttons, and `notifications.markAllRead`. Worth a pass on narrow viewports
before these languages are switched on.
