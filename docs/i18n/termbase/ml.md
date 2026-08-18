# Termbase — Malayalam (`ml`)

Locked vocabulary for ProSiddhi Malayalam. Created **2026-08-17**.
Works under `docs/i18n/GLOSSARY.md` — that file wins on anything not settled here.

**Every later `ml` translation must follow this file exactly.** One concept → one rendering, across
`src/locales/ml/*.json` and `prosiddhi-mobile-app/lib/l10n/app_ml.arb`.

---

## 1. Address form — LOCKED

| | |
|---|---|
| Second person | **നിങ്ങൾ** (possessive **നിങ്ങളുടെ**) |
| Never use | നീ / നിന്റെ (intimate), താങ്കൾ (honorific-literary) |
| Buttons & instructions | **`-ഉക` imperative**: അപേക്ഷിക്കുക, തിരയുക, അയയ്ക്കുക, സേവ് ചെയ്യുക |
| "Please" | **ദയവായി** — only where English says "please" |

`നിങ്ങൾ` is the exact register match for Hindi's आप: the form a bank SMS or a government
service uses. Do **not** switch to താങ്കൾ on employer screens — the plain register applies to both
sides (GLOSSARY §2).

**Failure messages** follow the Hindi shape — plain statement, then the retry:
"…കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക." Never blame the user.

## 2. `OTP` — LOCKED: Latin `OTP`

Written **`OTP`**, Latin letters, inside Malayalam text. Never ഒടിപി, never ഒ.ടി.പി.

Reason: every bank / UPI / delivery SMS this user already receives prints `OTP` in Latin. The app
label matching the SMS on screen beats script consistency. `ഒടിപി` is a spelling nobody writes, so a
slow reader sounds it out and *then* still has to map it back to OTP.

**Not a mixing violation:** where the English source says "verification code" (not "OTP"), translate
it **സ്ഥിരീകരണ കോഡ്**. Two different English concepts, two renderings. Where English says `OTP`,
you write `OTP`.

## 3. Script mechanics — LOCKED

- **No ZWNJ (U+200C) anywhere.** Write പാസ്വേഡ്, സബ്സ്ക്രിപ്ഷൻ — not the ZWNJ-separated spellings.
  ZWNJ is not a Malayalam-script codepoint and risks failing the script-coverage check in
  `scripts/verify-locales.mjs`.
- Use atomic chillu (ൻ ർ ൽ ൾ ൺ), never the consonant+virama+ZWNJ form.
- Sentence end is `.` — Malayalam uses the Latin full stop.
- `₹`, `%`, digits stay as in the English source.

## 4. Brand — note the divergence from Hindi

**`ProSiddhi` stays in Latin**, per GLOSSARY §3. The Hindi files transliterate it (प्रोसिद्धि in
`app.name`, `logoAlt`) — that contradicts §3, and Malayalam does **not** copy it. No പ്രൊസിദ്ധി.

---

## 5. Core termbase — GLOSSARY §5

| Concept (EN) | Malayalam — LOCKED | Why (only where non-obvious) |
|---|---|---|
| Job | **ജോലി** | The word people say. തൊഴിൽ is the government/newspaper register |
| Job seeker | **ജോലി അന്വേഷിക്കുന്നയാൾ** | "ജോലി അന്വേഷിക്കുന്നു" is the standard classified-ad phrase. Never ഉദ്യോഗാർത്ഥി here — that is reserved for Candidate |
| Employer | **തൊഴിലുടമ** | The universal word (തൊഴിലുടമ–തൊഴിലാളി). No loanword needed |
| Candidate *(employer screens only)* | **ഉദ്യോഗാർത്ഥി** | Universally known in Kerala from PSC/recruitment usage; shorter and clearer than കാൻഡിഡേറ്റ്. Keeps the seeker/candidate split that Hindi blurs |
| Applicant | **അപേക്ഷകർ** | The `-കർ` form serves as neutral singular *and* plural; അപേക്ഷകൻ is masculine — do not use it |
| Apply (verb) | **അപേക്ഷിക്കുക** | |
| Application (noun) | **അപേക്ഷ** | |
| Post a job (verb) | **ജോലി പോസ്റ്റ് ചെയ്യുക** | "പോസ്റ്റ് ചെയ്യുക" is what people say online. പ്രസിദ്ധീകരിക്കുക reads as newspaper publishing |
| Job post (noun) | **ജോലി പോസ്റ്റ്** | |
| Credit | **ക്രെഡിറ്റ്** | Loanword per GLOSSARY §5 |
| Post credit | **ജോലി പോസ്റ്റ് ക്രെഡിറ്റ്** | |
| Download credit / Unlock credit | **ഉദ്യോഗാർത്ഥി അൺലോക്ക് ക്രെഡിറ്റ്** (short: **അൺലോക്ക് ക്രെഡിറ്റ്** where context is clear) | Never "ഡൗൺലോഡ് ക്രെഡിറ്റ്" — nothing is downloaded |
| Unlock (verb) | **അൺലോക്ക് ചെയ്യുക** | Phone-lock familiarity. തുറക്കുക ("open") is too vague |
| Plan | **പ്ലാൻ** | പദ്ധതി reads as a government scheme |
| Subscription | **സബ്സ്ക്രിപ്ഷൻ** | |
| Wallet | **വാലറ്റ്** | Established by GPay/Paytm |
| Invoice | **ഇൻവോയ്സ്** | It is a legal GST tax document. ബിൽ is friendlier but wrong for the artefact |
| Interview | **ഇന്റർവ്യൂ** | What people say for a job interview. അഭിമുഖം reads as a press interview. Use this everywhere — Hindi's സാക്ഷാത്കാര-style split (साक्षात्कार vs इंटरव्यू) is a defect, do not copy it |
| Chat | **ചാറ്റ്** | |
| Message | **സന്ദേശം** | Everyday word; already the phone-SMS label |
| Profile | **പ്രൊഫൈൽ** | |
| Resume / CV | **ബയോഡാറ്റ** | ⚠ Judgement call. This is overwhelmingly the word Kerala job applicants use for the document they hand over; റെസ്യൂം is the job-site word, not the worker's word. Flag for native review |
| Skill | **കഴിവ്** (pl. **കഴിവുകൾ**) | Everyday. നൈപുണ്യം is the skill-development-scheme register |
| Experience | **പരിചയം** | |
| Work experience | **ജോലി പരിചയം** | The standard job-ad phrase. **Never അനുഭവം** — that is life/emotional experience |
| Salary | **ശമ്പളം** | (കൂലി = daily wage; not used for the salary field) |
| Location | **സ്ഥലം** | Real Malayalam word everyone knows; no need for ലൊക്കേഷൻ |
| Category | **വിഭാഗം** | Taxonomy L1 |
| Sub-category | **ഉപവിഭാഗം** | |
| Sector | **മേഖല** | Taxonomy L2 — തൊഴിൽ മേഖല is standard |
| Job Title | **ജോലിയുടെ പേര്** | Taxonomy L3, the actual job. Plainest possible; തസ്തിക is government-ese |
| Designation *(profile work history)* | **തസ്തിക** | Kept distinct from Job Title so the taxonomy level stays unambiguous |
| Verify (verb) | **സ്ഥിരീകരിക്കുക** | |
| Verification | **സ്ഥിരീകരണം** | "verification code" → സ്ഥിരീകരണ കോഡ് |
| Verified (badge) | **സ്ഥിരീകരിച്ചു** | |
| Confirm (verb) | **ഉറപ്പാക്കുക** | Deliberately a *different* root from Verify — the two appear on the same screens and must not collapse |
| Team | **ടീം** | സംഘം reads as a group/gang |
| Seat | **സീറ്റ്** | |
| Owner | **ഉടമ** (account owner: **അക്കൗണ്ട് ഉടമ**) | |
| Member | **അംഗം** | |
| Report (a job) | **റിപ്പോർട്ട് ചെയ്യുക** | പരാതിപ്പെടുക = file a complaint, a heavier act |
| Save / Saved job | **സേവ് ചെയ്യുക** / **സേവ് ചെയ്ത ജോലികൾ** | Same word for form-save ("മാറ്റങ്ങൾ സേവ് ചെയ്യുക") — natural in Malayalam, no collision in practice |
| Bookmark *(employer marks a candidate)* | **ബുക്ക്മാർക്ക് ചെയ്യുക** | Held separate from Save because both exist in `employer.json` as different actions |

---

## 6. High-frequency app vocabulary

Locked too — these recur across all nine namespaces and are where drift actually happens.

| EN | ML | EN | ML |
|---|---|---|---|
| Account | അക്കൗണ്ട് | Sign in / Log in | സൈൻ ഇൻ ചെയ്യുക |
| Sign up / Register | രജിസ്റ്റർ ചെയ്യുക | Sign out / Log out | സൈൻ ഔട്ട് ചെയ്യുക |
| Password | പാസ്വേഡ് | Email | ഇമെയിൽ |
| Phone number | ഫോൺ നമ്പർ | Mobile | മൊബൈൽ |
| Photo | ഫോട്ടോ | Document | രേഖ |
| Upload | അപ്ലോഡ് ചെയ്യുക | Download | ഡൗൺലോഡ് ചെയ്യുക |
| Search | തിരയുക | Company | കമ്പനി |
| Notification | അറിയിപ്പ് | Settings | സെറ്റിങ്സ് |
| Home | ഹോം | Dashboard | ഡാഷ്ബോർഡ് |
| Language | ഭാഷ | Help / Support | സഹായം |
| Send | അയയ്ക്കുക | Cancel | റദ്ദാക്കുക |
| Submit | സമർപ്പിക്കുക | Continue | തുടരുക |
| Back | തിരികെ | Next | അടുത്തത് |
| Edit | തിരുത്തുക | Delete / Remove | നീക്കം ചെയ്യുക |
| Close | അടയ്ക്കുക | Try again | വീണ്ടും ശ്രമിക്കുക |
| Loading… | ലോഡ് ചെയ്യുന്നു… | View / View all | കാണുക / എല്ലാം കാണുക |
| Optional | നിർബന്ധമല്ല | Required | നിർബന്ധമാണ് |
| Yes / No | അതെ / അല്ല | Details | വിവരങ്ങൾ |
| Buy | വാങ്ങുക | Pay (verb) | പണം അടയ്ക്കുക |
| Payment | പേയ്മെന്റ് | Price / Pricing | വില |
| Balance | ബാലൻസ് | Top-up | ടോപ്പ്-അപ്പ് |
| Upgrade | അപ്ഗ്രേഡ് ചെയ്യുക | Renew | പുതുക്കുക |
| Free | സൗജന്യം | Trial | ട്രയൽ |
| Expires / Validity | കാലാവധി | Invite / Invitation | ക്ഷണിക്കുക / ക്ഷണം |
| Accept | സ്വീകരിക്കുക | Reject | നിരസിക്കുക |
| Shortlist | ഷോർട്ട്ലിസ്റ്റ് ചെയ്യുക | Schedule (verb) | നിശ്ചയിക്കുക |
| Date / Time | തീയതി / സമയം | Notes | കുറിപ്പുകൾ |

## 7. Enum labels

**Application status** (`common.applicationStatus`)

| PENDING | REVIEWED | SHORTLISTED | ACCEPTED | REJECTED | WITHDRAWN | BOOKMARKED |
|---|---|---|---|---|---|---|
| അപേക്ഷിച്ചു | പരിശോധനയിൽ | ഷോർട്ട്ലിസ്റ്റ് ചെയ്തു | സ്വീകരിച്ചു | നിരസിച്ചു | പിൻവലിച്ചു | ബുക്ക്മാർക്ക് ചെയ്തു |

`PENDING` is "അപേക്ഷിച്ചു" (applied), following Hindi — from the seeker's side the state is
"I applied", not "you are pending".

**Job status** (`common.jobStatus`)

| DRAFT | ACTIVE | INACTIVE | CLOSED | FILLED | CANCELLED |
|---|---|---|---|---|---|
| ഡ്രാഫ്റ്റ് | സജീവം | നിഷ്ക്രിയം | അടച്ചു | ഒഴിവ് നികന്നു | റദ്ദാക്കി |

**Job type** (`common.jobType`)

| FULL_TIME | PART_TIME | CONTRACT | TEMPORARY | INTERNSHIP |
|---|---|---|---|---|
| ഫുൾ ടൈം | പാർട്ട് ടൈം | കരാർ | താൽക്കാലികം | ഇന്റേൺഷിപ്പ് |

`ഫുൾ ടൈം / പാർട്ട് ടൈം` are locked as a **pair** — Kerala job ads print both in English and workers
say both. Splitting the pair (മുഴുവൻ സമയം + പാർട്ട് ടൈം) would look like two different systems.

**Pay period** (`jobForm.paymentType`)

| HOURLY | DAILY | WEEKLY | MONTHLY | FIXED |
|---|---|---|---|---|
| മണിക്കൂറിന് | ദിവസത്തിന് | ആഴ്ചയ്ക്ക് | മാസത്തിന് | നിശ്ചിത തുക |

**Urgency** (`jobForm.urgency`)

| LOW | MEDIUM | HIGH | URGENT |
|---|---|---|---|
| കുറവ് | ഇടത്തരം | കൂടുതൽ | അടിയന്തരം |

**Team/invite state:** Active **സജീവം** · Pending **കാത്തിരിക്കുന്നു** · Suspended **നിർത്തിവച്ചു**

---

## 8. Open for native review

Not blockers — translate with the locked choice, and let a native reviewer overturn these three:

1. **ബയോഡാറ്റ** for Resume/CV — chosen for worker recognition over റെസ്യൂം.
2. **സെറ്റിങ്സ്** for Settings — Android Malayalam ships ക്രമീകരണങ്ങൾ, so a reviewer may prefer it.
3. **ഇൻവോയ്സ്** for Invoice — ബിൽ is what an employer would say out loud.
