# ProSiddhi Termbase — `or` ଓଡ଼ିଆ (Odia)

**Locked 2026-08-17.** Created in TERMBASE mode from `docs/i18n/GLOSSARY.md` §5.
Every later translation into Odia **must** follow this file exactly. One concept → one word.

> ⚠️ **Not yet native-reviewed.** Odia has no fluent reviewer on the team today. The choices below are
> deliberately conservative. Section 6 lists everything that genuinely needs a native speaker's eye —
> read it before treating this file as final.

---

## 1. Address form — LOCKED

**Use ଆପଣ (`āpaṇa`) throughout, with the honorific `-ନ୍ତୁ` imperative.**

| | Form | Example |
|---|---|---|
| Pronoun | **ଆପଣ** | ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି |
| Possessive | **ଆପଣଙ୍କ** | ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ |
| Imperative (buttons) | **-ନ୍ତୁ** | କରନ୍ତୁ · ଦେଖନ୍ତୁ · ଖୋଜନ୍ତୁ · ଦିଅନ୍ତୁ · ପଠାନ୍ତୁ |

This is the polite-but-plain register a bank SMS or a government scheme notice uses — the exact
counterpart of Hindi आप + करें.

- **Never** use ତୁ (intimate/rude) or ତୁମେ (familiar). Not on any screen, seeker or employer.
- **Never** switch to a heavier literary register on employer screens. Same voice everywhere.
- Sentences end with the danda **।** — never a Latin full stop. Button labels and fragments take
  no terminal punctuation (mirrors what the Hindi files do).

## 2. OTP — LOCKED

**Keep the Latin letters `OTP`.** Do not render as ଓଟିପି, and never mix the two.

Reason: the OTP arrives in an SMS that prints `OTP` in Latin; matching the SMS is what makes the
screen readable. Hindi already ships Latin `OTP` (`buttons.sendOtp`: "OTP भेजें"), so this also keeps
the two shipped languages consistent. The surrounding sentence is fully Odia:
`OTP ପଠାନ୍ତୁ`, `OTP ଯାଞ୍ଚ କରନ୍ତୁ`.

## 3. Numerals & brand

- **Digits: Latin `0-9` everywhere.** Never Odia digits ୦-୯. Prices, counts, OTPs, phone numbers and
  dates all appear in Latin digits on the device and in SMS; Odia digits would slow this reader down.
  Hindi ships Latin digits for the same reason.
- **Brand stays Latin: `ProSiddhi`, `Azkashine`** — per GLOSSARY §3. *(Note: the Hindi files diverge
  and transliterate it as प्रोसिद्धि in `app.name` / `logoAlt`. If the team decides Odia should match
  Hindi rather than the glossary, the transliteration is **ପ୍ରୋସିଦ୍ଧି** — but do not make that call
  inside a translation pass. See §6.)*
- Language name in the switcher: **ଓଡ଼ିଆ (Odia)**.
- Spelling care: Odia **ଡ଼ / ଢ଼** carry the nukta. It is ଓଡ଼ିଆ, never ଓଡିଆ.

---

## 4. Core termbase (GLOSSARY §5)

| Concept (EN) | Odia — LOCKED | Reason (only where the call was not obvious) |
|---|---|---|
| Job | **ଚାକିରି** | The spoken word for a job/post. Not କାମ (work in the abstract), not ନିଯୁକ୍ତି (formal "appointment") |
| Job seeker | **ଚାକିରି ଖୋଜୁଥିବା ଲୋକ** | ଲୋକ, not ବ୍ୟକ୍ତି — plainer. In a running sentence prefer the verb: "ମୁଁ ଚାକିରି ଖୋଜୁଛି" |
| Employer | **ଚାକିରିଦାତା** | Transparent — decodes from ଚାକିରି, which the reader already knows. ନିଯୁକ୍ତିଦାତା is correct but Sanskritised; ମାଲିକ is spoken but is reserved below for the team-role "Owner" |
| Candidate *(employer screens only)* | **ପ୍ରାର୍ଥୀ** | Standard Odia for a job/election candidate, short. Never use ପ୍ରାର୍ଥୀ on seeker-facing screens |
| Apply / Application | **ଆବେଦନ** · apply = **ଆବେଦନ କରନ୍ତୁ** | |
| Applicant | **ଆବେଦନକାରୀ** | |
| Post a job | **ଚାକିରି ପୋଷ୍ଟ କରନ୍ତୁ** | ପୋଷ୍ଟ as the loan **verb** only. It can also mean "a position" in Odia — that sense is ପଦବୀ here, never ପୋଷ୍ଟ |
| Credit | **କ୍ରେଡିଟ୍** | Loanword, mandated by GLOSSARY §5 |
| Post credit | **ଚାକିରି-ପୋଷ୍ଟ କ୍ରେଡିଟ୍** | |
| Download credit / Unlock credit | **ପ୍ରାର୍ଥୀ-ଅନଲକ୍ କ୍ରେଡିଟ୍** | Named for what it buys, as Hindi does |
| Unlock (verb) | **ଅନଲକ୍ କରନ୍ତୁ** | Native ଖୋଲନ୍ତୁ ("open") is too vague for a paid reveal |
| Plan | **ପ୍ଲାନ୍** | |
| Subscription | **ସବସ୍କ୍ରିପସନ୍** | ସଦସ୍ୟତା means *membership*, which is a different promise |
| Wallet | **ୱାଲେଟ୍** | Everyone knows it from UPI apps. Not ବଟୁଆ (a physical purse) |
| Invoice | **ଇନଭଏସ୍** | GST legal document. ବିଲ୍ is what people *say* — see §6 |
| Interview | **ଇଣ୍ଟରଭ୍ୟୁ** | The spoken word. **Never ସାକ୍ଷାତକାର**, even though the Hindi `employer.json` slips into साक्षात्कार in places — that is a Hindi inconsistency, do not copy it |
| Chat | **ଚାଟ୍** | |
| Message | **ମେସେଜ୍** | Deliberate divergence from Hindi संदेश: Odia ସନ୍ଦେଶ reads as "news" or as the sweet. ମେସେଜ୍ is unambiguous and is what people say about a phone |
| Profile | **ପ୍ରୋଫାଇଲ୍** | |
| Resume / CV | **ରିଜ୍ୟୁମେ** | Matches Hindi रिज्यूमे. ବାୟୋଡାଟା is more widely spoken — see §6 |
| Skill | **ଦକ୍ଷତା** | The word in ଦକ୍ଷତା ବିକାଶ (skill development), which this exact audience sees on government schemes. କୌଶଳ tilts toward "trick/tactic" in Odia |
| Experience *(work history)* | **ଅଭିଜ୍ଞତା** · work experience = **କାମର ଅଭିଜ୍ଞତା** | Not ଅନୁଭବ — in Odia that is a feeling/sensation, not a work record |
| Salary | **ଦରମା** | The spoken word. ବେତନ is correct but is newspaper register. For explicitly daily/piece wages, **ମଜୁରି** is permitted |
| Location | **ସ୍ଥାନ** | Standard on Odia forms and signage. ଜାଗା is more colloquial but also means "space/room" |
| Category | **ବର୍ଗ** · subcategory = **ଉପ-ବର୍ଗ** | ଶ୍ରେଣୀ reads as a school class or a social class |
| Sector | **କ୍ଷେତ୍ର** | |
| Job Title | **ପଦବୀ** | ପଦ alone also means word/step/verse in Odia; ପଦବୀ is unambiguously a designation |
| Verify / Verification | **ଯାଞ୍ଚ କରନ୍ତୁ** · verified = **ଯାଞ୍ଚ ହୋଇଛି** | One root, ଯାଞ୍ଚ. ସତ୍ୟାପନ is barely spoken in Odia |
| Team | **ଟିମ୍** | ଦଳ is common but reads as a political party |
| Seat | **ସିଟ୍** | Exactly the bus-seat / admission-seat sense we mean |
| Owner *(team role)* | **ମାଲିକ** | Free to use here because Employer is ଚାକିରିଦାତା |
| Member *(team role)* | **ସଦସ୍ୟ** | |
| Report (a job) | **ରିପୋର୍ଟ କରନ୍ତୁ** | ଅଭିଯୋଗ (complaint) was considered but carries a police-station weight |
| Save / Saved job *(bookmark)* | **ସେଭ୍ କରନ୍ତୁ** · saved = **ସେଭ୍ ହୋଇଛି** · saved jobs = **ସେଭ୍ କରିଥିବା ଚାକିରି** | See §6 — the native ସାଇତି ରଖନ୍ତୁ is real and was rejected on button length |
| Save changes *(store data)* | **ପରିବର୍ତ୍ତନ ସେଭ୍ କରନ୍ତୁ** | Same root ସେଭ୍, as Hindi reuses सहेजें for both |
| Bookmark *(a candidate, employer side)* | **ବୁକମାର୍କ** | Kept distinct from ସେଭ୍, exactly as Hindi keeps बुकमार्क vs सहेजें |

---

## 5. High-frequency supporting terms (also locked)

Not in GLOSSARY §5, but they appear on nearly every screen — fixing them now prevents drift.

| EN | Odia |
|---|---|
| Company | **କମ୍ପାନୀ** |
| Worker / Employee | **କର୍ମଚାରୀ** *(not ଶ୍ରମିକ — that narrows to manual labour)* |
| Mobile / Phone number | **ମୋବାଇଲ୍ ନମ୍ବର** |
| Email | **ଇମେଲ୍** |
| Password | **ପାସୱାର୍ଡ** |
| Photo | **ଫଟୋ** |
| Search (verb) | **ଖୋଜନ୍ତୁ** *(native — do not use ସର୍ଚ୍ଚ)* |
| Login / Sign in | **ଲଗଇନ୍** / **ସାଇନ୍ ଇନ୍ କରନ୍ତୁ** |
| Register / Sign up | **ରେଜିଷ୍ଟର କରନ୍ତୁ** / **ସାଇନ୍ ଅପ୍ କରନ୍ତୁ** |
| Log out / Sign out | **ଲଗ୍ ଆଉଟ୍** / **ସାଇନ୍ ଆଉଟ୍** |
| Dashboard | **ଡ୍ୟାସବୋର୍ଡ** |
| Settings | **ସେଟିଂସ୍** |
| Notification | **ସୂଚନା** |
| Payment / pay | **ପେମେଣ୍ଟ** / **ପେମେଣ୍ଟ କରନ୍ତୁ** |
| Free (no cost) | **ମାଗଣା** *(native and universally spoken — preferred over ମୁଫ୍ତ)* |
| Job type | **ଚାକିରି ପ୍ରକାର** *(ପ୍ରକାର is reserved for "type"; never for "category")* |
| Account | **ଖାତା** |
| Document | **ଡକୁମେଣ୍ଟ** |
| Cancel | **ବାତିଲ୍ କରନ୍ତୁ** |
| Try again | **ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ** |
| Loading… | **ଲୋଡ୍ ହେଉଛି…** |

---

## 6. ⚠️ Needs a native Odia reviewer

Flagged honestly. Each is defensible, none is certain. Nothing else in this file should be reopened
without a reason; **these** should be checked the moment an Odia speaker is available.

1. **Employer = ଚାକିରିଦାତା.** Chosen for transparency over the more institutional ନିଯୁକ୍ତିଦାତା.
   A reviewer may prefer ନିଯୁକ୍ତିଦାତା on employer screens — but then it must change *everywhere*.
2. **Save = ସେଭ୍ କରନ୍ତୁ.** This is the one place I knowingly took a loanword over a live native verb
   (ସାଇତିବା / ସାଇତି ରଖନ୍ତୁ). ସାଇତି ରଖନ୍ତୁ is warmer and genuinely Odia; it is also two words and
   longer on a small button, and "save" is what people say about a phone. Low confidence — flip it if
   a reviewer objects.
3. **Message = ମେସେଜ୍**, diverging from Hindi संदेश. Driven by the ସନ୍ଦେଶ ambiguity. Alternative if
   a reviewer wants a native word: ବାର୍ତ୍ତା.
4. **Invoice = ଇନଭଏସ୍.** Kept aligned with Hindi इनवॉइस and with the GST wording, but ବିଲ୍ is what an
   employer would actually say out loud. Worth revisiting with Finance, not just with a linguist.
5. **Resume = ରିଜ୍ୟୁମେ.** ବାୟୋଡାଟା is more widely spoken across India for exactly this document.
   Kept ରିଜ୍ୟୁମେ only for cross-language consistency with the signed-off Hindi.
6. **Candidate = ପ୍ରାର୍ଥୀ.** Correct and short, but the root sense is "one who requests". Confirm it
   does not read oddly next to paid unlock wording.
7. **Brand transliteration.** GLOSSARY §3 says keep `ProSiddhi` in Latin; the Hindi files transliterate
   it anyway. This is a glossary-vs-Hindi contradiction, not an Odia question — **Nazir should settle
   it once for all 8 languages.** Until then Odia follows the glossary and keeps Latin.
