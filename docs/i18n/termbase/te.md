# Telugu (`te`) — Locked Termbase

**Status:** locked 2026-08-17 · **not yet native-reviewed**
**Authority:** `docs/i18n/GLOSSARY.md` is the contract; this file resolves it for Telugu.
Every `te` translation — portal JSON and mobile ARB — follows this file **exactly**. One concept →
one word, both repos, no exceptions. If a string cannot be written with these terms, flag it; do not
improvise a synonym.

---

## 1. Address form — LOCKED

**Use మీరు + the polite imperative ending `-ండి`.**

- Buttons/instructions: `చేయండి`, `నమోదు చేయండి`, `వెతకండి`, `పంపండి`.
- Possessive/subject: `మీ` / `మీరు` — "మీ ప్రొఫైల్", "మీరు దరఖాస్తు చేశారు".
- This is the bank-SMS / government-service register. It matches what Hindi does with आप.

**Never use:**
- `నువ్వు` / `-ు`, `-వు` intimate imperatives (`చెయ్`, `వెతుకు`) — too familiar.
- `తాము`, `వారు` as address, or the honorific `గారు` attached to the user — hyper-formal, and it
  reads as addressing a third party.
- Passive literary constructions (`చేయబడును`, `వేయనగును`). Address the user directly.

---

## 2. OTP — LOCKED

**Keep the Latin letters `OTP`.** Uppercase, unchanged, in every string.

Telugu speakers say "OTP" and the SMS itself arrives with `OTP` in Latin. The native renderings
(`ఓటీపీ` transliterated, or `వన్ టైమ్ పాస్‌వర్డ్`) are slower to read and nobody says them. This
also matches the signed-off Hindi, which kept `OTP`.

- ✅ `OTP పంపండి` · `OTP ధృవీకరించండి` · `మీ OTP ని నమోదు చేయండి`
- ❌ `ఓటీపీ` · `వన్ టైమ్ పాస్‌వర్డ్` · mixing the two

**Validator caveat:** a value may be Latin-only *only* when the English source is exactly `OTP`.
Any longer string must carry Telugu words around it, or `verify-locales.mjs` fails it on script
coverage.

---

## 3. Script & typography rules

| Rule | Decision |
|---|---|
| **Digits** | **Latin `0-9` always.** Never Telugu numerals `౦-౯` — they are effectively unread today. `8 అక్షరాలు`, `14 రోజులు`, `18% GST`. |
| **ZWNJ in loanwords** | Loanwords with a coda consonant take a **ZWNJ (U+200C)** so no false conjunct forms: `అన్‌లాక్`, `ఇన్‌వాయిస్`, `బుక్‌మార్క్`, `పాస్‌వర్డ్`, `సబ్‌స్క్రిప్షన్`, `సెట్టింగ్‌లు`. Spell these **exactly** as written in this file — copy, don't retype. |
| **Naturalised loans take `-ు`** | `సీటు`, `బిల్లు` — not bare `సీట్`. |
| **Compounds** | Avoid long Sanskrit compounds. Two short words beat one learned one. |
| **Sentence length** | Split any English sentence over ~12 words into two. Telugu verb-final order makes long sentences unreadable at low literacy. |
| **`₹`, `GST`, `GSTIN`, `UPI`, `Razorpay`, `WhatsApp`, `ProSiddhi`** | Latin, verbatim — GLOSSARY §3. |

---

## 4. Core termbase (GLOSSARY §5) — LOCKED

| Concept (EN) | Telugu — LOCKED | Reason (only where non-obvious) |
|---|---|---|
| Job (the listing) | **ఉద్యోగం** (pl. ఉద్యోగాలు) | `పని` is reserved for "work" in the abstract — never use it for a listing |
| Job seeker | **ఉద్యోగం వెతుకుతున్న వారు** | Rejected `ఉద్యోగార్థి`: a Sanskrit compound our reader will not decode. Mirrors Hindi's descriptive नौकरी खोजने वाला |
| Employer | **యజమాని** | The word people actually say. Rejected `నియోక్త` (the literal Hindi नियोक्ता equivalent) — near-unknown in spoken Telugu |
| Candidate | **అభ్యర్థి** (pl. అభ్యర్థులు) | **Employer-facing screens only.** Never on seeker screens |
| Application (noun) | **దరఖాస్తు** | Everyday form-filling word, understood everywhere |
| Apply (verb) | **దరఖాస్తు చేయండి** | |
| Applicant | **దరఖాస్తుదారు** | |
| Post a job / Publish job | **ఉద్యోగం పోస్ట్ చేయండి** | One rendering for both EN phrasings — a second verb for the same act confuses. Rejected `ప్రచురించండి` (literary) |
| ~~Credit~~ | — | ⛔ **Never user-facing** (MONETIZATION.md §1, 2026-07-28). Do NOT use the loanword in any UI string. The two rows below are what the employer reads |
| Job Post | **ఉద్యోగ పోస్ట్** | The unit spent to publish a job. Countable: "you have 3 left" |
| Candidate Unlock | **అభ్యర్థి అన్‌లాక్** | The unit spent to reveal a candidate's contact. Never "download" — nothing is downloaded |
| Unlock (verb) | **అన్‌లాక్ చేయండి** | Rejected `తెరవండి` — means opening a door/page, loses the paid-reveal sense |
| Plan | **ప్లాన్** | |
| Subscription | **సబ్‌స్క్రిప్షన్** | Rejected `చందా` (= a periodical subscription; wrong register for SaaS billing) |
| Wallet | **వాలెట్** | Rejected `పర్సు` — a physical purse |
| Invoice | **ఇన్‌వాయిస్** | Rejected `బిల్లు` — this is a formal GST document, not a shop bill |
| Interview | **ఇంటర్వ్యూ** | Rejected `ముఖాముఖి`, `సమావేశం` — literary. Use the loanword in **every** namespace |
| Schedule an interview | **ఇంటర్వ్యూ ఏర్పాటు చేయండి** | |
| Chat | **చాట్** | |
| Message | **సందేశం** (pl. సందేశాలు) | Native and standard — Android's Telugu UI uses సందేశాలు, so our reader has already seen it |
| Profile | **ప్రొఫైల్** | |
| Resume / CV | **రెజ్యూమే** | See §7 — flagged for native review against `బయోడేటా` |
| Skill | **నైపుణ్యం** (pl. నైపుణ్యాలు) | Native, and familiar from నైపుణ్య శిక్షణ / Skill India |
| Experience | **అనుభవం**; work experience = **పని అనుభవం** | |
| Salary | **జీతం** | Rejected `వేతనం` (the literal Hindi वेतन match) — formal/written. Everyone *says* జీతం |
| Location | **ప్రాంతం** | Rejected `లొకేషన్` — the loanword earns nothing here; ప్రాంతం is genuinely everyday |
| **Category** | **వర్గం** (subcategory = ఉప వర్గం) | Matches Play Store Telugu (వర్గాలు) |
| **Sector** | **రంగం** | Standard Telugu for a sector — వ్యవసాయ రంగం, నిర్మాణ రంగం |
| **Job Title** | **ఉద్యోగ హోదా** (short: హోదా) | Rejected `పదవి` — reads as a political/official office. The three taxonomy levels stay distinct: వర్గం ▸ రంగం ▸ హోదా |
| Verify (verb) | **ధృవీకరించండి** | |
| Verification (noun) | **ధృవీకరణ** | |
| Verified (badge) | **ధృవీకరించబడింది** | |
| Team | **టీమ్** | Rejected `బృందం` — literary |
| Seat | **సీటు** (pl. సీట్లు) | Rejected `స్థానం` — collides with Location |
| Owner (team role) | **యజమాని**; where ambiguity is possible → **ఖాతా యజమాని** | Shares the word with Employer — see §7 |
| Member (team role) | **సభ్యులు** | Use the honorific plural as the default; it avoids the masculine `సభ్యుడు` |
| Report (flag content) | **రిపోర్ట్ చేయండి** | Rejected `ఫిర్యాదు` — reads as a formal/police complaint |
| Save / Saved job (bookmark) | **సేవ్ చేయండి** / **సేవ్ చేసిన ఉద్యోగాలు** | Rejected `భద్రపరచండి` (literary) and `దాచుకోండి` (also means *hide* — dangerous on a job card) |
| Bookmark (employer→candidate) | **బుక్‌మార్క్ చేయండి** | Kept distinct from seeker "Save", exactly as Hindi splits सहेजें / बुकमार्क |

---

## 5. Additional locked terms (high-frequency, drift-prone)

| EN | Telugu | EN | Telugu |
|---|---|---|---|
| Account | ఖాతా | Search (verb) | వెతకండి |
| Mobile number | మొబైల్ నంబర్ | Cancel | రద్దు చేయండి |
| Phone number | ఫోన్ నంబర్ | Submit | సబ్మిట్ చేయండి |
| Email | ఇమెయిల్ | Send | పంపండి |
| Password | పాస్‌వర్డ్ | Confirm | నిర్ధారించండి |
| Login / Sign in | లాగిన్ / సైన్ ఇన్ చేయండి | Continue | కొనసాగించండి |
| Sign up / Register | సైన్ అప్ చేయండి / రిజిస్టర్ చేయండి | Back / Next | వెనక్కి / తర్వాత |
| Logout / Sign out | లాగ్ అవుట్ / సైన్ అవుట్ | Edit | సవరించండి |
| Company | కంపెనీ | Delete / Remove | తొలగించండి |
| Dashboard | డాష్‌బోర్డ్ | Retry / Try again | మళ్లీ ప్రయత్నించండి |
| Settings | సెట్టింగ్‌లు | Loading… | లోడ్ అవుతోంది… |
| Notifications | నోటిఫికేషన్లు | Optional / Required | ఐచ్ఛికం / తప్పనిసరి |
| Language | భాష | Free | ఉచితం |
| Documents | పత్రాలు | Payment / Pay | చెల్లింపు / చెల్లించండి |
| Date / Time | తేదీ / సమయం | Expires | గడువు ముగుస్తుంది |
| Invite (n/v) | ఆహ్వానం / ఆహ్వానించండి | Upgrade | అప్‌గ్రేడ్ చేయండి |

`Notifications` — deliberately the loanword. The obvious native candidate `సూచనలు` means
*instructions/suggestions* in Telugu, so it does **not** carry Hindi सूचनाएँ across.

**Application statuses** (recur in `common`, `seeker`, `employer` — keep identical everywhere):
`PENDING` దరఖాస్తు చేశారు · `REVIEWED` పరిశీలనలో · `SHORTLISTED` షార్ట్‌లిస్ట్ ·
`ACCEPTED` ఆమోదించారు · `REJECTED` తిరస్కరించారు · `WITHDRAWN` వెనక్కి తీసుకున్నారు ·
`BOOKMARKED` బుక్‌మార్క్ చేశారు

---

## 6. Open calls for the native reviewer

Three places where a Telugu speaker should confirm the choice — everything else is settled.

1. **`ఉద్యోగం` for Job.** Correct for a *listing*, but to a daily-wage reader it can lean
   "salaried/white-collar". GLOSSARY forbids using `పని` (= work in the abstract) for the listing, so
   `ఉద్యోగం` stands. Confirm it doesn't feel exclusionary on seeker screens.
2. **`రెజ్యూమే` for Resume.** Locked to stay parallel with the signed-off Hindi `रिज्यूमे`. But many
   semi-urban Indian workers say **`బయోడేటా`**, which may be the more recognisable word for our
   actual audience. Swap to `బయోడేటా` if the reviewer agrees — it is a one-line change here plus a
   re-run of the `te` files.
3. **`యజమాని` serving both Employer and team Owner.** Accepted, because the surfaces never overlap:
   seeker screens only ever mean *employer*, and the team roster only ever means *owner*. Where a
   sentence could read either way, the rule is to write **`ఖాతా యజమాని`** ("account owner").
