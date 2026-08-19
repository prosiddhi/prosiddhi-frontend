# Termbase — मराठी (`mr`)

Locked vocabulary for Marathi. Every `mr` translation invocation follows this file **exactly**.
Governed by `docs/i18n/GLOSSARY.md`; this file resolves the language-specific calls.

Created 2026-08-17. Audience: a low-literacy blue-collar worker reading slowly on a cheap Android
phone. When torn, the spoken word beats the printed word.

---

## 1. Address form — LOCKED

**तुम्ही** + polite imperative in **-आ** (`करा`, `शोधा`, `पाठवा`, `निवडा`, `भरा`).
Possessive: **तुमचा / तुमची / तुमचे** (agree with the noun).

- ❌ **तू** and `-` imperatives (`कर`, `बघ`) — intimate, never use.
- ❌ **आपण** — in Marathi आपण also means *inclusive "we"*. "आपण नोकरी शोधा" is genuinely ambiguous
  to a slow reader. Banned as a second-person pronoun even though it looks like the polite Hindi आप.
- Hindi's आप → **तुम्ही** (not आपण). Hindi's करें → **करा**.

This is the register of a Marathi bank SMS or a MahaDBT / government service page.

## 2. `OTP` — LOCKED: Latin **OTP**

Stays `OTP` in Latin script, exactly as in Hindi. Reason: the SMS the user is reading at that
moment prints `OTP` in Latin, and every Marathi bank/telecom message does the same. ओटीपी exists
but forces the reader to re-map. Never mix the two.

Example: `OTP पाठवा` · `OTP पडताळा` · `तुमच्या फोनवर पाठवलेला 6-अंकी OTP टाका`

## 3. Marathi orthography — LOCKED (this is what keeps `mr` from being Hindi)

These conventions are mandatory. They are the difference between real Marathi and Devanagari-shaped
Hindi, and a script check cannot catch a violation.

| Rule | Marathi | ❌ Hindi form |
|---|---|---|
| **No nukta**, ever | फोन, जरा, प्रोफाइल | फ़ोन, ज़रा, प्रोफ़ाइल |
| English /v/ → **व्ह** | इनव्हॉइस, ॲक्टिव्ह | इनवॉइस |
| English /æ/ → **ॅ / ॲ** | चॅट, डॅशबोर्ड, ॲप, कॅटेगरी | चैट, डैशबोर्ड, ऐप |
| English /ɒ/ → **ऑ** | लॉगिन, वॉलेट | (same — fine) |
| English plural `-s` → **-ज** | सेटिंग्ज | सेटिंग्स |
| Digits | Latin `1 2 3` (as Hindi) | — |

Plural of नोकरी is **नोकऱ्या** (not नोकरीज / नौकरियाँ). Oblique: नोकरीच्या, नोकऱ्यांचे.

---

## 4. Core termbase (GLOSSARY §5)

| Concept (EN) | Marathi — LOCKED | Why (only where non-obvious) |
|---|---|---|
| Job | **नोकरी** (pl. नोकऱ्या) | Marathi spelling is नो-, not Hindi नौ-. काम = "work" in the abstract, never the listing |
| Job seeker | **नोकरी शोधणारे** | Honorific plural to stay gender-neutral; Marathi marks gender hard (शोधणारा/शोधणारी). For 1st person write "मी नोकरी शोधत आहे" and sidestep gender entirely |
| Employer | **नोकरी देणारे** | नियोक्ता rejected as Sanskritised newspaper register. मालक rejected — collides with Owner below |
| Candidate *(employer screens only)* | **उमेदवार** | Genuine Marathi form (cf. election उमेदवार), not Hindi उम्मीदवार. Never on seeker screens |
| Apply / Application | **अर्ज करा** / **अर्ज** | अर्ज is the universal Marathi word; आवेदन is Hindi and reads as officialese in Marathi |
| Applicant | **अर्जदार** | Follows from अर्ज. Not Hindi आवेदक |
| Post a job | **नोकरी पोस्ट करा** | पोस्ट kept — that is the said word |
| ~~Credit~~ | — | ⛔ **Never user-facing** (MONETIZATION.md §1, 2026-07-28). Do NOT use the loanword in any UI string. The two rows below are what the employer reads |
| Job Post | **नोकरी पोस्ट** | The unit spent to publish a job. Countable: "you have 3 left" |
| Candidate Unlock | **उमेदवार अनलॉक** | The unit spent to reveal a candidate's contact. Never "download" — nothing is downloaded |
| Unlock (verb) | **अनलॉक करा** | |
| Plan | **प्लान** | |
| Subscription | **सबस्क्रिप्शन** | सदस्यत्व is correct Marathi but bookish; people say सबस्क्रिप्शन for anything they pay monthly for |
| Wallet | **वॉलेट** | पाकीट = a physical wallet only |
| Invoice | **इनव्हॉइस** | Marathi व्ह spelling — see §3 |
| Interview | **मुलाखत** | Everyday spoken Marathi, shorter than इंटरव्ह्यू. This is *not* a literary coinage |
| Chat | **चॅट** | |
| Message | **संदेश** | |
| Profile | **प्रोफाइल** | No nukta |
| Resume / CV | **बायोडाटा** | What a blue-collar Marathi speaker actually calls the document. रेझ्युमे is the educated-speaker word |
| Skill | **कौशल्य** (pl. कौशल्ये) | Marathi form takes -य |
| Experience | **अनुभव** | |
| Salary | **पगार** | वेतन is the government payslip word. पगार is what everyone says |
| Location | **ठिकाण** | स्थान is Sanskritic. ठिकाण is everyday Marathi |
| Category | **प्रकार** | 3-level taxonomy, level 1. श्रेणी in Marathi leans "grade/rank" |
| Sector | **क्षेत्र** | Level 2 |
| Job Title | **पद** | Level 3, the taxonomy leaf (Welder, Driver). Keep distinct from the free-text ad headline — see §5 |
| Verify (verb) | **पडताळा** | |
| Verification (noun) | **पडताळणी** | |
| Verified (badge/adj) | **पडताळणी पूर्ण** | पडताळलेले is grammatical but clumsy on a badge |
| Team | **टीम** | |
| Seat | **सीट** | Said word (bus/college सीट). जागा is too generic |
| Owner | **मालक** | Marathi spelling, not Hindi मालिक |
| Member | **सदस्य** | सभासद also correct; सदस्य is shorter and universally read |
| Report (a job) | **तक्रार नोंदवा** / noun **तक्रार** | Marathi speakers complain (तक्रार), they don't "report". Clearer than रिपोर्ट for this audience |
| Save (bookmark) | **जतन करा** | Established Marathi UI verb for Save (Google/Microsoft Marathi). सहेजणे does not exist in Marathi — never carry it over |
| Saved job | **जतन केलेली नोकरी** (pl. जतन केलेल्या नोकऱ्या) | |
| Saved (button state) | **जतन केले** | |

## 5. Collision guards

- **पद (Job Title, taxonomy)** vs **शीर्षक (the free-text ad headline)** — `jobTitleLabel` is the
  headline the employer types: **नोकरीचे शीर्षक**. The taxonomy leaf is **पद**. Never swap them.
- **मालक (Owner, team role)** vs **नोकरी देणारे (Employer)** — मालक is reserved for the team role.
- **कामगार (worker/employee)** vs **उमेदवार (candidate)** vs **अर्जदार (applicant)** — three
  different screens' words, keep them apart. "Find workers" = **कामगार शोधा**.
- **काम (work)** vs **नोकरी (the listing)** — काम never labels a job post.

## 6. High-frequency UI verbs & nouns (locked — these set the register)

| EN | Marathi | EN | Marathi |
|---|---|---|---|
| Search | शोधा | Send | पाठवा |
| Save | जतन करा | Cancel | रद्द करा |
| Submit | सबमिट करा | Continue | पुढे चला |
| Back | मागे | Next | पुढे |
| Edit | बदला | Delete / Remove | हटवा |
| Close | बंद करा | Confirm | खात्री करा |
| Try again | पुन्हा प्रयत्न करा | View / See all | पहा / सर्व पहा |
| Select | निवडा | Loading… | लोड होत आहे… |
| Yes / No | होय / नाही | Optional / Required | ऐच्छिक / आवश्यक |
| Worker / employee | कामगार | Company | कंपनी |
| Settings | सेटिंग्ज | Dashboard | डॅशबोर्ड |
| Notification | सूचना | Language | भाषा |
| Account | खाते | Password | पासवर्ड |
| Email | ईमेल | Mobile / Phone | मोबाइल / फोन |
| Login / Logout | लॉगिन / लॉग आउट | Sign in / Sign up | साइन इन करा / साइन अप करा |

**Statuses:** Pending **प्रलंबित** · Reviewed **तपासले** · Shortlisted **शॉर्टलिस्ट केलेले** ·
Accepted **स्वीकारले** · Rejected **नाकारले** · Withdrawn **मागे घेतले** ·
Active **सक्रिय** · Inactive **निष्क्रिय** · Closed **बंद** · Filled **भरले** · Expired **मुदत संपली**

## 7. Terms where Marathi and Hindi legitimately coincide

Recorded so a reviewer can tell real overlap from copy-paste. Every one of these is either a
tatsama both languages inherited, or a loanword the GLOSSARY tells us to keep.

**Shared tatsama (genuine):** अनुभव · संदेश · सदस्य · सूचना · भाषा · सक्रिय · निष्क्रिय ·
क्षेत्र · प्रकार · पद · आवश्यक

**Shared loanwords (mandated by GLOSSARY §2/§5):** क्रेडिट · प्लान · टीम · सीट · कंपनी · कंपनी ·
ईमेल · मोबाइल · पासवर्ड · लॉगिन · वॉलेट · अनलॉक · पोस्ट · शॉर्टलिस्ट

**Near-identical but spelled differently — do not "correct" toward Hindi:**
नोकरी≠नौकरी · उमेदवार≠उम्मीदवार · मालक≠मालिक · कौशल्य≠कौशल · प्रोफाइल≠प्रोफ़ाइल ·
इनव्हॉइस≠इनवॉइस · चॅट≠चैट · डॅशबोर्ड≠डैशबोर्ड · सेटिंग्ज≠सेटिंग्स · प्रलंबित≠लंबित

Everything else in §4 is a deliberate Marathi word choice and differs from the Hindi reference.
