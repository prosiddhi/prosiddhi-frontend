# Termbase — Gujarati (`gu`) ગુજરાતી

Locked **2026-08-17**. Binding on every `gu` translation in both repos
(`src/locales/gu/*.json`, `prosiddhi-mobile-app/lib/l10n/app_gu.arb`).

Parent contract: `docs/i18n/GLOSSARY.md`. Where this file and your instincts disagree, this file wins.
Where this file is silent, GLOSSARY.md §2 (simplest spoken word) decides.

---

## 1. Address form — LOCKED

**`તમે` + the plain `-ો` imperative.** `અરજી કરો`, `ચકાસો`, `સાચવો`, `ફરી પ્રયાસ કરો`.

This is the register of a bank SMS or a government portal in Gujarat — the exact counterpart of
Hindi's `आप` + `करें`.

- **Never** `તું` / `-જે` forms (intimate — patronising to an adult worker).
- **Never** `આપ`, `આપશ્રી`, or the `-શો` deferential future (`કરશો`) — hyper-formal, literary,
  and slower to read.
- **Never** the bare stem (`કર`) — that is `તું`.
- Same form on employer screens. Do **not** shift register for the employer side.
- Polite softener is `કૃપા કરીને` (use it where the English says "Please", not everywhere).

**Verb-gender note:** Gujarati agrees with the subject's gender/number. Prefer phrasings that avoid
gendering the reader. Use `તમે નોંધણી કરી છે` style over anything that forces માસ્કુલિન agreement.
Where unavoidable, use the neuter/plural-polite agreement.

---

## 2. `OTP` — LOCKED

**Latin `OTP`, unchanged.** Never `ઓટીપી`, never `ઓ.ટી.પી.`, never `એક-વખતનો પાસવર્ડ`.

Reason: Gujarati speakers say the three English letters out loud, every bank/telecom SMS delivered
into Gujarat prints `OTP` in Latin, and the three-glyph Latin block is faster to recognise than a
five-syllable transliteration for someone reading slowly. Matches the shipped Hindi (`OTP ભેજો`).

Surrounding words are still Gujarati: `OTP મોકલો`, `OTP ફરી મોકલો`, `ખોટો OTP`.

**Related, and deliberately different:** English "verification code" / "6-digit code" is *not* OTP —
render it `કોડ` / `ચકાસણી કોડ` / `6-અંકનો કોડ`. Keep the two apart exactly as the English does; the
email-verification and password-reset flows say "code", not "OTP".

---

## 3. Core termbase (GLOSSARY.md §5) — one rendering, no deviation

| Concept (EN) | Gujarati — LOCKED | Reason (only where non-obvious) |
|---|---|---|
| Job | નોકરી | The listing/position. `કામ` = work in the abstract — keep separate |
| Job seeker | નોકરી શોધનાર | |
| Employer | નોકરીદાતા | Chosen over `નિયોક્તા`: transparent compound (નોકરી + દાતા = "job-giver"), decodable on sight. `નિયોક્તા` is a Sanskritic import a low-literacy reader has to be taught |
| Candidate | ઉમેદવાર | **Employer screens only.** Never `કેન્ડિડેટ` — `ઉમેદવાર` is fully naturalised (elections, exams) |
| Apply / Application | અરજી કરો / અરજી | |
| Post a job | નોકરી પોસ્ટ કરો | `પોસ્ટ` loanword — what people say; `પ્રકાશિત કરો` is print-publishing |
| ~~Credit~~ | — | ⛔ **Never user-facing** (MONETIZATION.md §1, 2026-07-28). Do NOT use the loanword in any UI string. The two rows below are what the employer reads |
| Job Post | જોબ પોસ્ટ | The unit spent to publish a job. Countable: "you have 3 left" |
| Candidate Unlock | ઉમેદવાર અનલૉક | The unit spent to reveal a candidate's contact. Never "download" — nothing is downloaded |
| Unlock (verb) | અનલૉક કરો | |
| Plan / Subscription | પ્લાન / સબસ્ક્રિપ્શન | Not `સભ્યપદ` — that reads as "membership status" |
| Wallet | વૉલેટ | |
| Invoice | ઇન્વોઇસ | Not `બિલ` — this is the GST document specifically |
| Interview | ઇન્ટરવ્યૂ | Not `મુલાકાત` — that means "a visit/meeting", ambiguous |
| Chat / Message | ચેટ / સંદેશો | Plural `સંદેશા`. `સંદેશો` (not `સંદેશ`) is the spoken nominative |
| Profile | પ્રોફાઇલ | |
| Resume / CV | રિઝ્યુમે | See §5 — judgement call |
| Skill | કૌશલ્ય | See §5 — judgement call |
| Experience | અનુભવ | Work history → `કામનો અનુભવ` |
| Salary | પગાર | Not `વેતન`. `પગાર` is the word actually spoken about pay in Gujarat |
| Location | સ્થળ | **Not `જગ્યા`** — `જગ્યા` also means "vacancy/opening" and would collide with job listings |
| Category / Sector / Job Title | શ્રેણી / ક્ષેત્ર / પદ | Three distinct words, never interchanged. `હોદ્દો` is reserved for the *Designation* form field so it cannot be confused with taxonomy level 3 |
| Verify / Verification | ચકાસો / ચકાસણી | Everyday native verb (`ચકાસવું` = to check). Chosen over `સત્યાપિત કરો`, which is bureaucratic |
| Team / Seat | ટીમ / સીટ | **Not `બેઠક`** for seat — `બેઠક` means "a sitting/meeting" |
| Owner / Member | માલિક / સભ્ય | `માલિક` over `સ્વામી` — `સ્વામી` reads religious |
| Report (a job) | રિપોર્ટ કરો | Loanword: WhatsApp/Facebook Gujarati UIs use it, so the gesture is already learned. `ફરિયાદ` would mean a formal complaint |
| Save / Saved job | સાચવો / સાચવેલી નોકરીઓ | Native and natural; covers both "store this form" and "bookmark this job", as English and Hindi do |
| Bookmark (employer) | બુકમાર્ક કરો | Deliberately **kept distinct** from `સાચવો` — the employer candidate tab is a separate feature from seeker saved-jobs |

---

## 4. Extended vocabulary — also locked

Not in GLOSSARY §5, but high-frequency across the namespaces. Same one-word-one-concept rule.

**Account & auth**

| EN | GU |
|---|---|
| Account | ખાતું (pl. ખાતાં) |
| Sign in / Login | સાઇન ઇન કરો / લોગિન |
| Sign up / Register | સાઇન અપ કરો / રજિસ્ટર કરો |
| Log out / Sign out | લોગ આઉટ / સાઇન આઉટ |
| Password | પાસવર્ડ |
| Email | ઈમેલ |
| Phone number | ફોન નંબર |
| Mobile | મોબાઇલ |
| Code (verification) | કોડ |
| Full name | પૂરું નામ |
| Date of birth | જન્મ તારીખ |
| Gender — Male / Female / Other | **લિંગ** — પુરુષ / સ્ત્રી / અન્ય ⚠️ see below |

> ⚠️ **Gender is `લિંગ`. Never `જાતિ`.** This row originally locked `જાતિ`, which in ordinary
> Gujarati means **caste**. On an Indian job portal a required field that appears to ask a worker's
> caste is a discrimination-adjacent defect, not a register nuance — and all nine other languages
> had it right, so Gujarati was a lone outlier rather than a stylistic choice.
> Corrected in the locale files and here on **2026-08-17**. Note the possessive agreement changes
> with it: `તમારું લિંગ`, not `તમારી જાતિ` (લિંગ is neuter, જાતિ feminine).

**Work & hiring**

| EN | GU |
|---|---|
| Work (abstract) | કામ |
| Worker | કામદાર |
| Company | કંપની |
| Applicant | અરજદાર |
| Designation | હોદ્દો |
| Requirements | જરૂરિયાતો |
| Description | વર્ણન |
| Document | દસ્તાવેજ |
| Schedule (an interview) | ગોઠવો |
| Shortlist | શૉર્ટલિસ્ટ કરો |
| Accept / Reject | સ્વીકારો / નકારો |

**Money**

| EN | GU |
|---|---|
| Pay (verb) / Payment | ચૂકવો / ચુકવણી |
| Buy | ખરીદો |
| Purchase (noun) | ખરીદી |
| Price / Pricing | કિંમત / કિંમતો |
| Free (no cost) | મફત |
| Top-up | ટૉપ-અપ |
| Checkout | ચેકઆઉટ |
| Balance | બૅલેન્સ |
| Expires / Expired | સમાપ્ત થાય છે / સમાપ્ત |
| Renew | રિન્યુ કરો |
| Trial | ટ્રાયલ |

`₹`, `GST`, `GSTIN`, `CGST`, `SGST`, `IGST`, `UPI`, `Razorpay` stay Latin (GLOSSARY §3).
Spoken-out "GST" in running Gujarati prose also stays Latin `GST` — do **not** write `જીએસટી`.
*(This diverges from the shipped Hindi, which spells out `जीएसटी`. §3 is the contract; follow it.)*

**UI actions**

| EN | GU |
|---|---|
| Search | શોધો |
| Submit | સબમિટ કરો |
| Cancel | રદ કરો |
| Continue | ચાલુ રાખો |
| Back | પાછા |
| Next | આગળ |
| Edit | ફેરફાર કરો |
| Delete | કાઢી નાખો |
| Remove | દૂર કરો |
| Close | બંધ કરો |
| Send | મોકલો |
| Resend | ફરી મોકલો |
| Upload / Download | અપલોડ કરો / ડાઉનલોડ કરો |
| Confirm | ખાતરી કરો |
| View / View all | જુઓ / બધું જુઓ |
| Select / Choose | પસંદ કરો |
| Try again | ફરી પ્રયાસ કરો |
| Copy | કૉપી કરો |
| Invite | આમંત્રણ આપો / આમંત્રણ |

**States & status**

| EN | GU |
|---|---|
| Loading… | લોડ થઈ રહ્યું છે… |
| Failed | નિષ્ફળ |
| Optional / Required | વૈકલ્પિક / જરૂરી |
| Yes / No | હા / ના |
| Active / Inactive | સક્રિય / નિષ્ક્રિય |
| Pending | બાકી |
| Draft | ડ્રાફ્ટ |
| Closed / Filled | બંધ / ભરાઈ ગઈ |
| Verified | ચકાસાયેલ |
| Notification | સૂચના (pl. સૂચનાઓ) |
| Settings | સેટિંગ્સ |
| Dashboard | ડેશબોર્ડ |

**Job type** — loanwords, deliberately. These are the words spoken on an Indian worksite; `પૂર્ણકાલિક`/`અંશકાલિક` are newspaper Gujarati and slow to decode.

| EN | GU |
|---|---|
| Full-time | ફુલ-ટાઇમ |
| Part-time | પાર્ટ-ટાઇમ |
| Contract | કોન્ટ્રાક્ટ |
| Temporary | હંગામી |
| Internship | ઇન્ટર્નશિપ |

**Pay period:** પ્રતિ કલાક / રોજનું / અઠવાડિક / માસિક / નિશ્ચિત
**Urgency:** ઓછી / મધ્યમ / વધુ / તાત્કાલિક

---

## 5. Judgement calls — recorded so they are not re-argued

1. **Employer = `નોકરીદાતા`, not `નિયોક્તા`.** The compound is self-explaining; the Sanskritic form
   is not. Costs two syllables, buys comprehension.
2. **Salary = `પગાર`, not `વેતન`.** Hindi ships the formal `वेतन`; Gujarati does not need to copy
   that. `પગાર` is what a worker says about their own pay.
3. **Resume = `રિઝ્યુમે`.** Runner-up was `બાયોડેટા`, which is arguably *more* spoken in India. Lost
   because the app labels this object "Resume" throughout and `બાયોડેટા` carries a marriage-proposal
   connotation in Gujarati that would read oddly on a job profile.
4. **Skill = `કૌશલ્ય`.** Runner-up was `આવડત` — warmer, purer, easier to read. Lost because
   `આવડત` means an innate knack, and does not work as a listable tag ("વેલ્ડિંગ, લિફ્ટિંગ"), and
   because `કૌશલ્ય` is already carried into the audience by the Skill India / કૌશલ્ય વિકાસ
   programmes. Close call; do not flip it unilaterally.
5. **Location = `સ્થળ`, banning `જગ્યા`.** `જગ્યા` means both "place" and "job vacancy". On a job
   portal that ambiguity is a real defect, not a nuance.
6. **Seat = `સીટ`, banning `બેઠક`.** Same reason — `બેઠક` reads as "a meeting".
7. **Job-type labels stay English loanwords** (`ફુલ-ટાઇમ`, `પાર્ટ-ટાઇમ`, `કોન્ટ્રાક્ટ`) while
   `હંગામી` (temporary) stays native, because `હંગામી` genuinely *is* the spoken word and
   "ટેમ્પરરી" is not. The rule is "what people say", not "be consistently foreign".
8. **`રિપોર્ટ કરો` over `ફરિયાદ કરો`.** Users have already learned this button in other apps.
9. **`સાચવો` (save) and `બુકમાર્ક કરો` (bookmark) are two different words**, matching two different
   product features. Do not collapse them even though English overloads "save".
10. **`GST` stays Latin even in prose**, per GLOSSARY §3, despite the shipped Hindi spelling it out
    as `जीएसटी`. Hindi is reference, not authority, on the do-not-translate list.

---

## 6. Mechanical reminders for `gu` files

- Placeholders survive byte-for-byte: `{{count}}`, `{{name}}`, `{{phone}}` (portal) / `{count}`
  (mobile). Gujarati is SOV — **move the token**, never rename it.
  `"Welcome back, {{name}}"` → `"ફરી સ્વાગત છે, {{name}}"`;
  `"Resend in {{countdown}}s"` → `"{{countdown}} સેકંડમાં ફરી મોકલો"`.
- Pure-format strings (`"{{min}} - {{max}}"`, `"{{current}}/{{max}}"`, `"પેજ {{page}} / {{total}}"`)
  copy through unchanged.
- Digits: use **Latin digits** (`6-અંકનો કોડ`, `₹499`, `18%`), never Gujarati numerals. Every price,
  OTP and phone number in the product is rendered in Latin digits.
- Latin-script items from GLOSSARY §3 (`ProSiddhi`, `Razorpay`, `WhatsApp`, `Google`, `GST`,
  emails, URLs, HTML tags) pass through untouched. `ProSiddhi` in running Gujarati prose may be
  written `પ્રોસિદ્ધિ` **only** where the shipped Hindi does so (the `logoAlt` / `app.name` keys);
  everywhere else keep the Latin brand.
- Emoji stay in place (`🔊`).
- Ellipsis: use `…` where the English does.
