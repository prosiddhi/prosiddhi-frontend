# Termbase — Tamil (`ta`)

**Locked 2026-08-17.** Read with `docs/i18n/GLOSSARY.md`. Where the two disagree, this file wins for
Tamil — it is the language-specific call the glossary asks each language to make once.

Every later `ta` translation (portal JSON and mobile ARB) **must** use these renderings exactly.
One concept → one word. If a string needs a word that is not here, pick the simplest spoken Tamil
word and stay consistent; do not re-open a locked row.

---

## 1. Address form — LOCKED

**நீங்கள்** (polite plural), with imperatives in the **-உங்கள்** form.

| | |
|---|---|
| ✅ Use | `நீங்கள்` · `உங்கள்` · `செய்யுங்கள்` · `உள்ளிடுங்கள்` · `அனுப்புங்கள்` · `தேர்ந்தெடுங்கள்` |
| ❌ Never | `நீ` / `உன்` (intimate — reads as talking down to a worker) |
| ❌ Never | `தாங்கள்` / `தங்கள்` (hyper-formal literary — wrong register entirely) |
| ❌ Never | `-வும்` officialese (`செய்யவும்`, `உள்ளிடவும்`) — that is a government form, not a person talking |

This is the Tamil equivalent of Hindi's `आप … करें`: polite, plain, warm, the register of a bank SMS.

**Buttons use the same -உங்கள் form** — `சேமியுங்கள்`, `தேடுங்கள்`, `விண்ணப்பியுங்கள்`. Do **not**
drop to the bare root (`சேமி`, `தேடு`) to save width, even though other Tamil apps do: mixing bare
roots into நீங்கள் prose is exactly the inconsistency this file exists to prevent. Tamil words are
long; that is normal and readers cope.

## 2. Script and numerals — LOCKED

- **Arabic numerals only** — `1`, `2`, `10`, `₹499`. **Never** Tamil numerals (`௧`, `௨`, `௩`): they
  are unreadable to modern readers and would make prices meaningless.
- Modern Tamil script including `ஜ ஷ ஸ ஹ ஃப` for loanwords. Do not avoid these letters.
- **`ProSiddhi` stays in Latin script**, per GLOSSARY §3 — do **not** transliterate it to
  `புரோசித்தி`. (Note: the Hindi files transliterated the brand. §3 governs; do not copy that.)
- Same for every other §3 item: `Razorpay`, `GST`, `GSTIN`, `CGST`, `SGST`, `IGST`, `UPI`,
  `WhatsApp`, `Google`, `Firebase`, `₹`, invoice number formats, URLs, sample emails.

## 3. OTP — LOCKED

**Latin `OTP`.** Not `ஓடிபி`, not `ஒருமுறை கடவுச்சொல்`.

Reason: the user is reading our screen with the SMS open next to it, and that SMS says `OTP`. Visual
match beats script purity here. Every Tamil banking/UPI app does the same, and Hindi already ships
Latin `OTP` (`"OTP भेजें"`). Consistent across every `ta` file, no exceptions.

Surrounding words are Tamil: `OTP அனுப்புங்கள்` · `OTP-ஐ உள்ளிடுங்கள்` · `OTP-ஐ சரிபாருங்கள்`.

---

## 4. Core termbase (GLOSSARY §5)

| Concept (EN) | Tamil — LOCKED | Reason (only where the call was not obvious) |
|---|---|---|
| Job | **வேலை** | The word people say. `பணி` is literary, `வேலைவாய்ப்பு` is Employment-Exchange jargon. Also covers "work" in the abstract — Tamil has no everyday split, and context carries it |
| Job listing / posting (the artifact) | **வேலை விளம்பரம்** | Where the *listing* must be distinguished from the work itself. "விளம்பரம்" = advertisement, instantly clear; it is literally what a Tamil newspaper job ad is called |
| Job seeker | **வேலை தேடுபவர்** | "One who looks for work" — transparent to a slow reader. `தேடுநர்` is literary |
| Employer | **வேலை வழங்குபவர்** | Judgement call. `முதலாளி` is what a worker actually says but carries a boss/capitalist charge that is politically loaded in TN and wrong for a company account. `பணியமர்த்துபவர்` is long and literary. "Work giver" is neutral and decodes on sight |
| Candidate *(employer screens only)* | **விண்ணப்பதாரர்** | ⚠️ `வேட்பாளர்` is the dictionary word for "candidate" and is **banned** here — in Tamil it means an *election* candidate almost exclusively. `விண்ணப்பதாரர்` (applicant) is understood by everyone and carries no collision |
| Worker(s) *(employer "Find Workers")* | **தொழிலாளர்** | Kept distinct from விண்ணப்பதாரர் — these are people who have not applied to you |
| Apply (verb) | **விண்ணப்பியுங்கள்** | |
| Application (noun) | **விண்ணப்பம்** | Everyone has filled a விண்ணப்பம் |
| Applicant | **விண்ணப்பதாரர்** | Same word as Candidate — intentional; they are the same human |
| Post a job (verb) | **வேலை விளம்பரம் இடுங்கள்** | `பதிவிடுங்கள்` (modern "post") was the alternative; `விளம்பரம் இடு` is more transparent to a low-literacy reader |
| Credit | **கிரெடிட்** | Loanword, per GLOSSARY §5. Native `வரவு` means an accounting credit and would confuse |
| Post credit | **வேலை விளம்பர கிரெடிட்** | |
| Download credit / Unlock credit | **விண்ணப்பதாரர் அன்லாக் கிரெடிட்** | |
| Unlock (verb) | **அன்லாக் செய்யுங்கள்** | Judgement call. Anyone with an Android phone unlocks it daily and says "அன்லாக்". Native `திற` (open) is also clear but weaker as a metaphor for revealing paid content |
| Unlocked | **அன்லாக் செய்யப்பட்டது** | |
| Plan | **திட்டம்** | Native, universal — govt schemes and mobile plans are both திட்டம் |
| Subscription | **சந்தா** | Long-established for magazine subscriptions; genuinely spoken |
| Wallet | **வாலட்** | The digital sense. `பணப்பை` reads as a physical purse |
| Invoice | **இன்வாய்ஸ்** | The GST document specifically. `பில்` is more spoken but means the shop receipt; `ரசீது` is a receipt, not an invoice. Employer-facing audience, so the business term is right |
| Interview | **நேர்காணல்** | ⚠️ Deliberate override of GLOSSARY §2's loanword hint — see §6 below |
| Chat | **சாட்** | ⚠️ `அரட்டை` is the dictionary word but means gossip/chit-chat — wrong register for talking to an employer |
| Message | **செய்தி** | Native, universal, spoken |
| Profile | **சுயவிவரம்** | Override of the loanword hint — see §6 |
| Resume / CV | **ரெசூம்** | Weakest row in this file. No settled Tamil word; `பயோடேட்டா` is arguably more spoken but reads as a marriage biodata |
| Skill | **திறமை** | The spoken word. `திறன்` is the technical/policy register ("skill development") |
| Experience | **அனுபவம்** | Work history = **வேலை அனுபவம்** |
| Salary | **சம்பளம்** | Spoken. `ஊதியம்` is formal/official |
| Location | **இடம்** | Simplest correct word. `இருப்பிடம்` is heavier for no gain |
| Category | **பிரிவு** | The 3-level taxonomy — three genuinely distinct words below |
| Sector | **துறை** | |
| Job Title | **பதவி** | |
| *(Job **type** — not taxonomy)* | **வேலை வகை** | `வகை` is reserved for Full-time/Part-time etc., so it never collides with Category |
| Verify (verb) | **சரிபாருங்கள்** | |
| Verification / Verified | **சரிபார்ப்பு** / **சரிபார்க்கப்பட்டது** | |
| Confirm | **உறுதிப்படுத்துங்கள்** | Kept distinct from Verify — different buttons |
| Team | **குழு** | Native, used for work teams, shorter than the loanword |
| Seat | **இருக்கை** | Carries the same metaphor as English. `சீட்` was the alternative |
| Owner | **உரிமையாளர்** | Spoken — "கடை உரிமையாளர்" |
| Member | **உறுப்பினர்** | Team member = **குழு உறுப்பினர்** |
| Report (a job) | **புகார் அளியுங்கள்** | `புகார்` is *the* everyday word for a complaint. Noun form: **புகார்** |
| Save / Saved job | **சேமியுங்கள்** / **சேமித்த வேலைகள்** | Also used for "save changes", exactly as English and Hindi reuse "Save"/"सहेजें" |
| Bookmark *(employer, on a candidate)* | **குறியிடுங்கள்** / **குறியிடப்பட்டது** | Kept distinct from சேமி because the English source distinguishes them |

---

## 5. Additional locked terms

These are not in GLOSSARY §5 but appear in nearly every namespace. Locking them here stops drift
between files.

| EN | Tamil — LOCKED |
|---|---|
| Mobile / phone number | **மொபைல் எண்** |
| Email | **மின்னஞ்சல்** |
| Password | **கடவுச்சொல்** |
| Log in / Sign in | **உள்நுழையுங்கள்** |
| Log out / Sign out | **வெளியேறுங்கள்** |
| Register / Sign up | **பதிவு செய்யுங்கள்** |
| Notification | **அறிவிப்பு** / **அறிவிப்புகள்** |
| Settings | **அமைப்புகள்** |
| Company | **நிறுவனம்** |
| Search | **தேடுங்கள்** (verb) / **தேடல்** (noun) |
| Dashboard | **டாஷ்போர்டு** |
| Payment | **கட்டணம்** |
| Pay (verb) | **செலுத்துங்கள்** |
| Top-up | **டாப்-அப்** |
| Upgrade | **அப்கிரேட் செய்யுங்கள்** |
| Free | **இலவசம்** |
| Free trial | **இலவச சோதனை** |
| Document | **ஆவணம்** |
| Pending | **நிலுவையில்** |
| Active / Inactive | **செயலில்** / **செயலில் இல்லை** |
| Expired | **காலாவதியானது** |
| Shortlisted | **தேர்வுப் பட்டியலில்** |
| Accepted / Rejected | **ஏற்கப்பட்டது** / **நிராகரிக்கப்பட்டது** |
| Withdrawn | **திரும்பப் பெறப்பட்டது** |
| Loading… | **ஏற்றப்படுகிறது…** |
| Please try again | **மீண்டும் முயற்சி செய்யுங்கள்** |

---

## 6. Where this file overrides the glossary's loanword default

GLOSSARY §2 names *interview*, *profile*, *password*, *email* as loanwords to prefer. For Tamil I
lock the native word for four of them: **நேர்காணல்**, **சுயவிவரம்**, **கடவுச்சொல்**, **மின்னஞ்சல்**.

The glossary's actual test is "does an obscure pure coinage make the app harder to read". These four
fail that test in the opposite direction — they are not obscure. **This audience's phone already
shows them these exact words**: WhatsApp, Google and Facebook in Tamil all use சுயவிவரம் and
கடவுச்சொல், every Tamil newspaper uses நேர்காணல், and மின்னஞ்சல் is on every form they have filled.
A transliteration like `புரொஃபைல்` or `இன்டர்வியூ` has to be sounded out letter by letter and then
recognised as English — strictly more work for a slow reader than a Tamil word they have seen before.

The loanword rule is still honoured where the loanword genuinely wins: **கிரெடிட், வாலட், இன்வாய்ஸ்,
சாட், மொபைல், அன்லாக், டாஷ்போர்டு, டாப்-அப், அப்கிரேட், ரெசூம், OTP**.

## 7. Open for native-speaker review

Flag these first when a Tamil speaker reviews the shipped files:

1. **Employer = வேலை வழங்குபவர்** — correct and neutral, but longer than `முதலாளி`. If a reviewer
   finds it stilted in running text, `முதலாளி` is the fallback for *seeker-facing* screens only.
2. **Resume = ரெசூம்** — the weakest row. `பயோடேட்டா` is the live alternative.
3. **Interview = நேர்காணல்** — the deliberate override in §6.
4. **Seat = இருக்கை** — the licensing metaphor may or may not land; `சீட்` is the fallback.
