# Termbase — `bn` বাংলা (Bengali)

**Locked 2026-08-17.** Every later `bn` translation invocation follows this file exactly.
Contract above it: `docs/i18n/GLOSSARY.md`. Register reference: `src/locales/hi/*.json`.

---

## 1. Address form — **আপনি** (locked)

Bengali has a genuine three-way second person. We use the **middle-polite `আপনি`** form throughout,
for seekers and employers alike.

| Form | Use |
|---|---|
| তুই | ❌ Never. Intimate/inferior — reads as an insult to an adult stranger |
| তুমি | ❌ Never. Familiar/equal — too casual for a service talking to a worker |
| **আপনি** | ✅ **Always.** The bank-SMS / government-service form. Matches Hindi's आप |

Concretely, this fixes the verb endings:

- Imperative → **-ন / -উন**: করুন, দিন, দেখুন, লিখুন, পাঠান, বেছে নিন, চেষ্টা করুন
- Future/polite → **-বেন**: করবেন, পাবেন, দেখবেন
- Possessive → **আপনার** (আপনার প্রোফাইল, আপনার ওয়ালেট)
- Plural of people → **আপনারা / আপনাদের**

Never mix. A single তুমি form in a string is a defect.

---

## 2. Register — cholito (চলিত), never sadhu (সাধু)

Modern spoken written Bengali only. The literary sadhubhasha forms are banned.

| ❌ Sadhu / literary | ✅ Cholito (use this) |
|---|---|
| করিবেন, করিয়া, হইয়াছে | করবেন, করে, হয়েছে |
| তাহার, তাহাদের, ইহা | তার, তাদের, এটা |
| অতঃপর, তৎপর | তারপর |
| প্রদান করুন, প্রেরণ করুন | দিন, পাঠান |
| -সমূহ, -গুলি (plural) | **-গুলো** (চাকরিগুলো, প্রার্থীরা) |

Other register rules:

- **Short sentences.** Split a long English sentence into two rather than chaining clauses with যেহেতু/তথাপি.
- Prefer **আর** over এবং in plain lists; keep এবং only where it reads more naturally.
- Say **দাম** not মূল্য, **জায়গা** not স্থান, **কাগজপত্র** not নথিপত্র — the spoken word wins every time.

---

## 3. `OTP` — stays **Latin `OTP`** (locked)

Write `OTP` in Latin capitals, never ওটিপি, in every `bn` string.

Reason: the user reads the actual code in an incoming SMS where the label is Latin `OTP`. Matching that
string on screen is what lets them connect the two. The signed-off Hindi does the same
(`"sendOtp": "OTP भेजें"`). Runner-up **ওটিপি** was rejected only on that SMS-matching argument — it is
otherwise a fine rendering, so this is the one lock in this file worth revisiting if a native reviewer
pushes back.

Surrounding words are Bengali: `OTP পাঠান`, `OTP লিখুন`, `OTP আবার পাঠান`, `ভুল OTP`.

Everything in GLOSSARY §3 (ProSiddhi, Razorpay, GST/GSTIN/CGST/SGST/IGST, UPI, WhatsApp, Google,
Firebase, ₹, URLs, sample emails) stays Latin and verbatim — no exceptions for Bengali.
`ProSiddhi` is **not** transliterated to প্রোসিদ্ধি in UI strings (Hindi transliterates in `app.name`
only; for `bn` keep Latin everywhere so the brand matches the logo).

---

## 4. Core termbase — GLOSSARY §5

One concept → one word, across both repos. Reason column filled only where the call was not obvious.

| Concept (EN) | `bn` lock | Reason |
|---|---|---|
| Job (the listing/position) | **চাকরি** | The everyday spoken word. Not কাজ — that is "work/task" in the abstract |
| Job seeker | **চাকরিপ্রার্থী** | Parses as চাকরি + প্রার্থী (known from elections). In running sentences prefer the verbal form: "আপনি চাকরি খুঁজছেন" |
| Employer | **চাকরিদাতা** | Reuses the locked root চাকরি, so a slow reader meets one root not two. নিয়োগকর্তা is the administrative register; মালিক is reserved for the team role below |
| Candidate (employer screens) | **প্রার্থী** | Two syllables, universally known. Do **not** mix in ক্যান্ডিডেট — Hindi drifts between उम्मीदवार and कैंडिडेट, we do not copy that |
| Apply / Application | **আবেদন করুন / আবেদন** | |
| Post a job | **চাকরি পোস্ট করুন** | পোস্ট is the live loanword (social media). The listing itself is just **চাকরি** — no separate noun |
| Credit | **ক্রেডিট** | Loanword per GLOSSARY. Native ঋণ = "debt", কৃতিত্ব = "praise" — both actively wrong |
| Post credit | **চাকরি-পোস্ট ক্রেডিট** (short: পোস্ট ক্রেডিট) | |
| Download credit / Unlock | **প্রার্থী-আনলক ক্রেডিট** | Never "ডাউনলোড ক্রেডিট" — the user-facing act is unlocking a contact, matching Hindi's normalisation |
| Unlock (verb) | **আনলক করুন** | Phone-unlock loanword, universal. Native খুলুন = "open", too vague |
| Plan / Subscription | **প্ল্যান** / **সাবস্ক্রিপশন** | প্ল্যান carries the mobile-recharge mental model exactly. Native পরিকল্পনা means "a scheme/intention" and would confuse |
| Wallet | **ওয়ালেট** | Paytm/PhonePe wallet. Native মানিব্যাগ = a physical leather wallet — wrong model for a balance |
| Invoice | **ইনভয়েস** | চালান reads as a transport/government challan or a traffic fine; বিল is a shop bill, not a GST document |
| Interview | **ইন্টারভিউ** | Everywhere, including the scheduling flow. সাক্ষাৎকার is journalistic ("a press interview"). Hindi mixes the two — do not follow |
| Chat / Message | **চ্যাট** / **মেসেজ** | মেসেজ over বার্তা: বার্তা is newsprint register |
| Profile | **প্রোফাইল** | |
| Resume / CV | **সিভি** | Bengali speakers overwhelmingly say "সিভি", not "resume". জীবনবৃত্তান্ত is five literary syllables. **Deliberate divergence from Hindi's रिज्यूमे** |
| Skill | **দক্ষতা** | ⚠️ Never **কৌশল** — in Bengali that means "tactic/trick", a false friend with Hindi कौशल |
| Experience | **অভিজ্ঞতা** ("work experience" → **কাজের অভিজ্ঞতা**) | ⚠️ Never **অনুভব** — in Bengali that means "feeling/sensation", false friend with Hindi अनुभव |
| Salary | **বেতন** | Use বেতন for every pay period including daily. Do not switch to মজুরি for daily-wage jobs — consistency beats nuance here |
| Location | **জায়গা** | The plainest word a slow reader knows. স্থান is literary; লোকেশন is an unnecessary loanword when a natural native word exists |
| Category | **ক্যাটাগরি** | শ্রেণি means "school grade" to most readers; বিভাগ means "department/division"; ধরন is reserved for Job Type |
| Sector | **সেক্টর** | Kept distinct from ক্যাটাগরি. ক্ষেত্র is literary and also means a crop field |
| Job Title (taxonomy) | **পদ** | ⚠️ Distinct from the free-text ad headline `jobTitleLabel`, which is **চাকরির বিজ্ঞাপনের শিরোনাম** |
| Verify / Verification | **যাচাই করুন / যাচাই** ("verified" → **যাচাই করা**) | যাচাই is native, short and genuinely spoken; সত্যায়ন is officialese |
| Team / Seat | **টিম** / **সিট** | সিট carries the bus/train-seat model, which is exactly the plan-seat concept. আসন is literary |
| Owner / Member | **মালিক** / **সদস্য** | মালিক = the account owner/boss, spoken and correct for an employer account. Hindi's employer.json drifts to स्वामी — we use মালিক everywhere |
| Report (a job) | **রিপোর্ট করুন** | Matches the social-media "report" everyone already knows. অভিযোগ = "lodge a complaint", heavier than intended |
| Save / Saved job | **সেভ করুন / সেভ করা চাকরি** | Bookmarking sense. ⚠️ Employer-side "Bookmark" (candidate tabs) stays **বুকমার্ক করুন** — keep the two distinct as Hindi does. "Save changes" also uses সেভ |

---

## 5. High-frequency locks (outside §5, but every file hits them)

| EN | `bn` | Note |
|---|---|---|
| Mobile / phone number | **মোবাইল নম্বর** | |
| Email | **ইমেইল** | |
| Password | **পাসওয়ার্ড** | |
| Register | **রেজিস্টার করুন** | |
| Sign up / Sign in / Login / Logout | **সাইন আপ করুন** / **সাইন ইন করুন** / **লগইন** / **লগ আউট** | |
| Search / Find | **খুঁজুন** | "Find jobs" → চাকরি খুঁজুন |
| Notification | **নোটিফিকেশন** | বিজ্ঞপ্তি is a formal public notice |
| Settings | **সেটিংস** | |
| Dashboard | **ড্যাশবোর্ড** | |
| Company | **কোম্পানি** | |
| Worker / employee | **কর্মী** | "Find workers" → কর্মী খুঁজুন |
| Teammate / colleague | **সহকর্মী** | |
| Free (no cost) | **ফ্রি** | বিনামূল্যে is literary |
| Photo | **ছবি** | Native and universal — beats ফটো |
| Document(s) | **কাগজপত্র** | What a worker calls their papers. Use ডকুমেন্ট only where the English means a specific uploaded file |
| Upload | **আপলোড করুন** | |
| Payment / Pay | **পেমেন্ট** / **পেমেন্ট করুন** | |
| Buy | **কিনুন** | |
| Price | **দাম** | Not মূল্য |
| Balance | **ব্যালেন্স** | Recharge-balance model |
| Validity / Expires | **মেয়াদ** / **মেয়াদ শেষ** | মেয়াদ is understood from medicine strips and recharges |
| Loading… | **লোড হচ্ছে…** | |
| Please try again | **আবার চেষ্টা করুন** | Not পুনরায় প্রচেষ্টা করুন |

---

## 6. Mechanical rules

- **Digits: Western `0-9` only.** Never Bengali ০-৯. Prices, counts and dates arrive from the API in
  Western digits; mixing the two inside one screen is worse than either alone.
- **Sentence-final punctuation: the দাঁড়ি `।`**, not a full stop. `,` `?` `!` `…` `%` stay as-is.
  A sentence ending in a Latin token or a number may end with `।` too (`... 1 ক্রেডিট লাগে।`).
- **Placeholders** `{{token}}` / `{token}` survive byte-for-byte; reorder the Bengali around them freely
  — Bengali is verb-final, so a token that is sentence-final in English usually moves left.
- Pure-format strings (`"{{min}} - {{max}}"`, `"{{current}}/{{max}}"`, `"পেজ {{page}} / {{total}}"`)
  copy across unchanged.
- No `ZWNJ`/`ZWJ` characters. Use ordinary conjuncts.
- Emoji stay in place (`🔊`).

## 7. Traps checklist

Before returning any `bn` file, grep your own output for these:

1. `তুমি` / `তোমার` / `করিবেন` → wrong address form or sadhu register.
2. `কৌশল` (should be দক্ষতা) · `অনুভব` (should be অভিজ্ঞতা) — the two Hindi false friends.
3. `ওটিপি` → must be Latin `OTP`.
4. Bengali digits ০১২৩৪৫৬৭৮৯ → must be Western.
5. `ক্যান্ডিডেট` → must be প্রার্থী.
6. `সাক্ষাৎকার` → must be ইন্টারভিউ.
7. `-গুলি` / `-সমূহ` → must be `-গুলো`.
