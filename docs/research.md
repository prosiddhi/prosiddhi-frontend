# Azkashine Job Portal v1 — Industry & Indian-Market Research

**Author:** Claude (research assistant for Nazir Hasan, Azkashine)
**Date:** 6 May 2026
**Scope:** 12 open product decisions for the 6-week MVP, blue-collar, mobile-first build to QA handover on 15 June 2026.

> Each topic gives a global standard, India-specific notes, 2–3 named competitor data points, an Azkashine-context recommendation, and sources. Where I am inferring rather than citing hard data, I flag it as **[inferred]**. The volatile items you flagged (Aadhaar legality, RBI escrow rules, AUA timelines, competitor pricing) are noted with retrieval dates so you can re-check them yourself before locking decisions.

---

## 1. Executive Summary — what to do, in 12 paragraphs

1. **Notifications.** Ship in-app + FCM push for everything, SMS only for OTP and payment confirmation, email only for password reset and employer approval. Skip WhatsApp Business API in v1 — it's cheaper per message but DLT-equivalent setup time and BSP onboarding will eat into your six weeks. Reserve WhatsApp as v2.
2. **Interview scheduling.** Single modal with a few employer-proposed time slots, candidate picks one; in-app + SMS confirmation; no `.ics` in v1; reminders 24 h and 2 h before. Outcome capture (hired / no-show / re-interview) goes on a single follow-up screen the day after.
3. **Escrow / commission / payouts.** Do **not** ship escrow in v1. The 15 Sept 2025 RBI Payment Aggregator Master Direction explicitly bars marketplaces from running PA-like flows without a Certificate of Authorisation, and Razorpay Route integration alone is roughly 4–6 weeks of work for a competent team. Stub the data model only; settle off-platform.
4. **Mobile employer & admin apps.** Web-only is correct for v1, and almost certainly for v2 as well. Apna's employer flow is heavily web; admin work is universally web. The current charter is right.
5. **Subscriptions.** Keep ₹50 lifetime for seekers (acquisition tool, not P&L line item) and ₹250/mo + 7-day trial for employers. Both numbers are aggressively below market — Apna and Naukri start at ₹400+ per job post — so you are buying market entry, not margin. Plan a price test in Q3.
6. **Aadhaar.** Mock Aadhaar (format + Verhoeff + phone OTP) is **legally fine for v1** because it is not real UIDAI authentication — you are only collecting a number. Real authentication requires either (a) Sub-AUA partnership through a licensed KYC vendor (IDfy / Karza / Signzy / HyperVerge — quote-based, typically ₹3–15 per verification) or (b) a direct application via the Jan 2025 Good Governance portal (multi-month approval). Defer (b) entirely; plan (a) for v2.
7. **i18n at 10 languages.** Use a JSON-based file format (next-i18next on web, i18next on RN) with translations sourced as **AI-drafted + native-reviewer-edited**. A hosted TMS (Crowdin / Lokalise / Tolgee) is overkill for v1 and an easy v2 add. Budget ₹35–60k for 1,000 strings × 9 non-English languages on the AI+review path; commercial agency would be 4–6× that.
8. **Audio messaging.** Record with `MediaRecorder` API on web, format-detect on the client (`audio/webm;codecs=opus` on Chrome/Android, `audio/mp4` on iOS Safari), store on local disk for v1 with a clear S3 migration path. Cap at 60s for chat, 5 min for the application audio. No transcription in v1.
9. **Content moderation.** OpenAI's `omni-moderation-latest` is **free** and now strong on Hindi / Bengali / Marathi / Telugu — wire it as the "Scan Content" backend instead of a regex-only stub. Keep manual admin review as the second gate.
10. **Recommendations.** The current weighted scoring (sector 25 + title-exact 30 + title-fuzzy 15 + experience 15 + skills 20 + location 10) is fine. Add a 7-day recency bonus, exponential location decay, and a cold-start fallback to "popular roles in your city". Click/apply feedback loop is v2.
11. **Document verification.** DigiLocker is a v2 item — private "Requester" approval is its own multi-week MeitY process. For v1, accept Aadhaar/PAN/DL/voter ID as uploads, set a 48-hour manual review SLA, and use a regex pre-check for obvious format mismatches.
12. **Free tier metering & trials.** 3 applications/day reset at IST midnight is reasonable; show a soft warning at 2-of-3 before you hard-cap at 3. 7-day trial is the most common Indian-SaaS choice. Make all renewals **opt-in only** in v1 — the RBI e-mandate framework adds workflow you don't need to ship.

---

## 2. Per-topic deep dive

### Topic 1 — Notification channels

**Global standard.** A multi-channel mix where the channel is picked by the *event* and the *user's reachability*. OTP and payment confirmations go through SMS or app-push because both are time-critical and need ≥99% delivery. Marketing and reminders increasingly move to WhatsApp / RCS in WhatsApp-heavy markets. Email is a fallback in markets where it is the primary identity (US, EU, B2B) but a poor primary in blue-collar India.

**India specifics.** Three regulatory facts shape this:

- All commercial SMS in India must be sent via **DLT (Distributed Ledger Technology)** registered headers and pre-approved templates under the TCCCPR 2018 framework. Senders must register as a Principal Entity, register headers (max 11 alphanumeric characters such as "VD-KOTAKB"), and use only registered headers for commercial communication. Setup is 2–4 weeks for a first-time entity per a unified-CPaaS comparison piece.
- WhatsApp Business API uses a **per-message model since 1 July 2025**, replacing the older 24-hour conversation pricing. Meta charges only when a template message is delivered; non-template messages and utility templates inside an open 24-hour customer service window are free.
- The **RBI is moving away from SMS OTP for digital payments**, per an authentication-vendor analysis. Job platforms are not banking, but the direction of travel is worth knowing.

**Per-message economics in India (May 2026).**

| Channel | Indicative price | Notes |
|---|---|---|
| Transactional / OTP SMS | ₹0.18 – ₹0.25 per delivered SMS | MSG91 lists Rs. 0.25 per SMS as a baseline; aggregators like Mtalkz quote ₹0.20 transactional, ₹0.10 at high volume, ₹0.25 OTP. |
| WhatsApp Authentication template | ~₹0.115 per delivered message | Multiple India 2026 references put this at roughly ₹0.115; AiSensy publishes ₹0.145 for utility/auth and ₹1.09 for marketing. |
| WhatsApp Utility | ~₹0.115–₹0.145 | Free if sent inside a 24-h customer service window. |
| WhatsApp Marketing | ₹0.78 – ₹1.10 | Avoid for transactional flows. |
| Push (FCM) | Effectively zero | Native, no per-message fee. |
| Email (transactional) | ~₹0.02–₹0.05 (SES, Resend, etc.) | **[inferred]** based on standard public US pricing converted. |

**OTP — SMS or WhatsApp?** WhatsApp OTP is cheaper, has 5–15% higher completion rates, and is not subject to TRAI / DLT, per a CPaaS comparison and a 2025 implementation guide. But it requires the user to have WhatsApp installed and internet access, which in blue-collar India is *most* but not *all* users — figure ~10% miss. So the industry-standard pattern is **WhatsApp first → SMS fallback if WhatsApp delivery fails or the user isn't on WhatsApp**, as YourBulkSMS describes. The RBI is moving away from SMS OTP for *banking*; for product login, both are legal.

**What competitors actually do.**
- **Apna**: heavy WhatsApp use for both customer support and recruiter-candidate communication. Their employer help centre lists a WhatsApp number as the primary support channel and they push "WhatsApp alerts" and follow-ups via WhatsApp; the candidate-facing flow uses SMS for OTP.
- **WorkIndia**: app-first with in-app messaging and direct HR phone calls; SMS OTP at registration.
- **Naukri**: SMS + email for everything, with WhatsApp as an opt-in alert channel.
- All three drop emails for OTP-style flows because email penetration in this audience is poor.

**Recommendation for Azkashine v1.**
- **OTP:** SMS via MSG91 (DLT registration ~2–3 weeks — start day 1 of S1 or you will miss code freeze).
- **Push (FCM):** in-app + native push for all 11 event types — registration confirmation, job applied, employer accepted, interview scheduled, interview reminders (24 h / 2 h), payment confirmed, document verified / rejected, admin warning.
- **SMS:** OTP + payment confirmation only. Adding more events to SMS hits cost without much engagement uplift.
- **Email:** password reset + employer-approval outcome only. Same reason.
- **WhatsApp Business API:** Defer to v2 — not because it's expensive (it isn't) but because **BSP onboarding + Meta Business verification + template approval is its own 1–3 week cycle** that conflicts with the 6-week timeline.

**Sources:** TRAI advice to senders [64]; Meta WhatsApp Business pricing [58]; AiSensy India rate card [52]; MSG91 pricing [46]; Tribune India SMS provider list [51]; CPaaS comparison [67]; OTP authentication guide [68]; SMS OTP replacement trends [71].

---

### Topic 2 — Interview scheduling UX

**Global standard.** Three patterns dominate:

1. **Recruiter-availability self-schedule** — the recruiter shares availability, the candidate picks a slot. LinkedIn Recruiter ships this as **Scheduler**, which syncs the recruiter's Microsoft or Google calendar and lets candidates book directly through InMail with a mobile-friendly experience. Calendly is the standalone version of the same idea.
2. **Recruiter-proposed slots** — the recruiter offers 2–4 specific times and the candidate accepts one. This is what Indeed Hiring Events automates: Indeed sends calendar invites, reminder messages, and interview prep automatically once the candidate confirms a time.
3. **Free-form chat scheduling** — what Apna and WorkIndia largely fall back to, because their candidates don't have calendars and many don't have email.

**India specifics for blue-collar.**
- The candidate often does not have email. Calendar invites with `.ics` attachments are useless if you can't open them. SMS or WhatsApp is the *only* reliable confirmation channel in this segment.
- Many candidates use shared phones, so reminders need to be brief and self-contained ("Interview tomorrow 10am at HDFC Andheri, manager Priya 9876543210").
- Recruiters in the SMB segment often skip a structured tool and call the candidate directly. The platform's job is to nudge both sides toward a shared time, not enforce calendar discipline.

**What competitors do.**
- **Apna**: in-app chat handles most coordination; "schedule interview" exists in the employer dashboard and triggers a notification but recruiters frequently fall back to phone calls and WhatsApp once contact is unlocked.
- **LinkedIn**: full self-schedule via Scheduler with calendar sync, plus reschedule/cancel from a confirmation page (candidates can reschedule directly from the meeting confirmation page in LinkedIn Recruiter).
- **Indeed Hiring Events**: full self-schedule + automated reminders + on-platform video for high-volume hiring, per Indeed's hiring events documentation.

**Recommendation for v1.**
- **UI:** Single modal where the *employer* proposes 2–3 time slots when accepting an applicant. Candidate gets a push + SMS, taps one slot in-app.
- **Channels:** In-app + push for the actionable interaction; SMS for the reminder cadence (24 h, 2 h before). Skip the 30-min reminder — too noisy.
- **No `.ics` in v1.** Add it in v2 once email penetration is observed.
- **Mode:** Three options surfaced — **In-person (with address)**, **Phone** (just the number), **Video** (paste a link). Don't ship native video in v1.
- **Reschedule / cancel:** Both parties can reschedule once. After that, the chat is the fallback.
- **Outcome capture:** A single follow-up the day after the interview asking the employer "What happened?" with three buttons: **Hired / Did not show up / Need re-interview**. Skip free-text.

**Sources:** LinkedIn Scheduler [159, 161]; Indeed Hiring Events [156]; Indeed scheduling guide [163].

---

### Topic 3 — Escrow, commission, payouts (and why it's not v1)

**Global standard.** Marketplace escrow has three actors: the buyer, the seller, and the platform. Money sits in a regulated escrow account, the platform deducts its commission, and the seller is paid on a defined trigger (job completion, customer acceptance, time-out). Stripe Connect, Adyen MarketPay, and PayPal Marketplaces are the global reference implementations.

**India regulatory landscape (as of 6 May 2026).** The relevant authority is the **RBI Master Direction on Regulation of Payment Aggregators, dated 15 September 2025**. The headline points that affect a job marketplace are:

- A PA business shall not carry out marketplace business and aggregate funds for merchants with whom it does not have a contractual relationship — i.e. you cannot become a payment aggregator yourself if you also run a marketplace.
- A non-bank PA must maintain merchant funds in a separate escrow account with a Scheduled Commercial Bank in India.
- Non-bank PAs must migrate to the escrow arrangement within two months of receiving RBI authorisation; permitted credits/debits are tightly enumerated and escrow accounts cannot be used for cash-on-delivery.
- Settlement timelines are T+1.

For a marketplace, the practical interpretation is: **don't try to build escrow yourself; use Razorpay Route or RazorpayX Escrow+ where Razorpay already holds the PA license.** Razorpay Route is positioned as a marketplace tool that automates commission payments and refund flows for sellers across India. Razorpay Route also handles GST and TDS compliance for Indian marketplaces.

**Industry-standard commission for blue-collar / gig.** Public data is thin and quote-based. Visible reference points:

- Urban Company is publicly reported around 20–25% commission (varies by category) — **[inferred]**, not in my search results.
- Rideshare globally sits at 20–30%.
- For blue-collar *job placement* (one-time match, not ongoing service), the global online-recruiter norm is **8.33% of annual CTC**, per a Cutshort survey of Indian recruiters in 2025. Apna and WorkIndia don't take a hire commission — they monetise the *employer*, not the placement.

**Implementation effort.** Razorpay Route integration plus split-payouts logic plus refund/dispute UI plus reconciliation reporting is **4–6 weeks for one mid-level engineer who hasn't done it before** — and that assumes Razorpay's KYB on your entity is complete. **[inferred]** from typical fintech integration timelines; volatile, please verify with Razorpay sales.

**The "stub pattern" question.** Yes, it is common and entirely legal. You record a payment-intent on the platform (employer says they will pay seeker ₹X for completing a job), settle the actual money off-platform (cash, GPay, bank transfer), and let users mark the job as completed. You are not handling money, so the PA Master Direction does not apply. Many gig-adjacent platforms — local services apps, peer-to-peer marketplaces — operated this way for years before adding real escrow.

**Recommendation.**
- **v1: stub.** Track *intent to pay* in the data model. Don't move money.
- **v2: Razorpay Route**, with a 5–10% platform fee starting on completed placements only. Document all flows in advance, then build.
- **Bank account verification / IFSC** for v2: penny-drop verification via Razorpay or via dedicated providers like Decentro, Cashfree, or Karza. Pricing is quote-based, expect ₹3–8 per verification **[inferred]**.

**Sources:** RBI PA Master Direction Sept 2025 [82]; Khaitan analysis of the PA Directions [83]; Trilegal on PA escrow rules [91]; AuthBridge summary of the Master Direction [86]; Razorpay Route product page [72]; Cutshort recruiter pricing survey [35].

---

### Topic 4 — Mobile employer & admin apps

**Global standard.** Pure-B2B SaaS, including admin consoles, is web-first by default. Native mobile employer apps exist where the user persona is *field-based* (Workday Manager for approvals, ADP for payroll attestations, Slack/Teams for messaging) — and even then, the bulk of the work happens on web.

**For job marketplaces specifically:**
- **Apna employer app** exists and is heavily used, because their target SMB recruiter is a phone-first user — verifying candidates on the move, calling HR numbers, dropping WhatsApp invites. Apna's employer-side capabilities include lead management with ATS integration, CSV access, dashboard tracking, and WhatsApp alerts. Job-creation, analytics, and payment management still gravitate to web.
- **WorkIndia employer app** is similarly mobile-friendly because their SMB recruiter persona overlaps with blue-collar management.
- **LinkedIn Talent Insights, Indeed dashboards** — pure web. Their recruiter persona is desk-bound.

**Admin specifically.** I cannot find a single mature platform that ships a native admin app. Verification queues, document review, content moderation, payment dashboards — all are dense, multi-window, multi-table interfaces that make zero sense on a 6-inch screen.

**Form-factor reality check for *your* admin needs.**
- Verification queues — list + detail + side-by-side document = web.
- Document review — high-DPI image inspection = web.
- Content moderation — bulk actions, side-by-side comparison = web.
- Payment management — table-heavy, exportable = web.

**Recommendation.**
- **v1, v2, and probably v3: web only for both employer and admin.** The charter is correct.
- If field-based recruiter use cases emerge (e.g. an Azkashine recruiter visiting a hiring location to verify an employer in person), build a *thin* mobile employer view focused on candidate-search-and-call, not an attempt to mirror the full dashboard. That's a v3 question at earliest.

**Sources:** Apna employer features [4]; Apna case study on multilingual mobile-first build [133].

---

### Topic 5 — Subscription model for blue-collar in India

**Global standard.** Two-sided marketplaces typically monetise the *demand* side (employers / brands) and keep the *supply* side (workers / creators) free. LinkedIn Premium for jobseekers exists but is a small revenue line; the bulk comes from Recruiter and Talent Solutions.

**Indian competitor pricing — what I could verify (May 2026).**

| Competitor | Seeker side | Employer side |
|---|---|---|
| **Apna** | Free for seekers; the app store lists no seeker subscription. Per a Flexiple review, Apna.co is free for candidates with no charges to apply. | Base price ₹600 per job post for 15 days; "Apna Coins" purchased separately for unlocking contact details and CSV downloads. Three named plans — Classic / Premium / Super Premium — plus a "Premium Job + AI Calling Agent" plan, per Apna's employer help centre. A user review on the Play Store mentions a ₹650 subscription for 15 days; a Quora review reports paying ₹350 for the Classic plan. Pricing is opaque and changes; the order of magnitude is ₹350–₹650 entry, several thousand for Premium tiers. |
| **WorkIndia** | Free | F6S lists tiered plans by validity period (30, 90, 365 days) with unlimited candidate responses and a fixed quota of database unlocks per plan. A 2024 third-party listing in UpSpike's job-portal cost guide put a one-month plan at around ₹2,118 — verify directly with WorkIndia for current rates. |
| **Naukri** | Premium for jobseekers starts at ₹890/month. | Classified ₹850/post (₹400 for non-metro), Hot Vacancy ₹1,650/post — both for 30 days. Resdex (database access) starts around ₹55,000 for 3 months. |

**Is "₹50 lifetime" a sustainable pattern?** No, it is not the Indian norm. Naukri's blue-collar competitors all charge employers, not seekers, and a lifetime price below ₹100 is *acquisition pricing*, not a sustainable revenue line. That is a defensible product choice for v1 — you are buying market entry — but the financial model has to assume seeker revenue is rounding error, with all real revenue coming from employer subscriptions and (later) commission/escrow.

**Trial duration — 7 / 14 / 30 days.** I could not find a published Indian-blue-collar A/B benchmark in this segment **[inferred from B2B SaaS norms]**: 14-day is the global SaaS median, 7-day works when the value is obvious within the first session (e.g. "post a job, get applicants in 24 hours"), 30-day is for complex products. For your use case — an employer needs to actually receive applicants before deciding to convert — 7 days is borderline tight; **consider 14**. But if you ship 7, it's defensible and means a faster funnel.

**Free tier (3 apps/day).** Apna runs effectively unlimited applications per day on the free seeker tier — restrictions kick in at *unlocking employer contact details* (via Apna Coins). WorkIndia is similar. So 3 apps/day is **tighter than competitors** and will create friction. Two safer alternatives:

- **5–10 apps/day**, with a soft warning at 80% and a hard cap at the limit. Closer to competitor norms.
- **Unlimited apps**, but lock the *recruiter-contact* moment behind Elite — same conversion lever Apna uses.

**"Contact recruiter" as a paid gate.** This is *the* industry norm for the Indian blue-collar segment. Apna's Apna Coins model unlocks contact details; WorkIndia gates database unlocks on plan tier. So gating recruiter contact is fine; gating *applications* is unusual.

**Recommendation.**
- **Seeker:** Keep ₹50 lifetime. Reframe the gating: free = unlimited apps + no recruiter contact, Elite = unlimited + recruiter contact + premium support. Drop the 3-apps/day cap or raise it to 5-10/day with a soft warning. Reset at IST midnight.
- **Employer:** ₹250/mo + 7-day trial. Aggressive — Apna and Naukri both start materially higher per post. Revisit pricing post-launch. **Consider 14-day trial** if engineering effort allows.

**Sources:** Apna pricing data [17, 8, 22, 13]; WorkIndia plans [31, 21]; Naukri pricing [33, 41, 35].

---

### Topic 6 — Aadhaar verification for v1

**This is the highest-risk regulatory question in your charter, so I'm going to be explicit about what's legal.**

**The question, restated.** Is "mock Aadhaar" — collect a 12-digit number, validate the format and Verhoeff checksum, send an OTP to the linked *phone* (not via UIDAI), and treat the user as identity-verified — legally acceptable for a v1 job platform?

**Short answer: yes, because what you are doing is *collecting an Aadhaar number*, not *authenticating it against UIDAI*.** Those are two different things. UIDAI authentication is the regulated activity; collection alone is not — though it does pull you under DPDP Act 2023 obligations regardless.

**The legal layers that matter.**

1. **Aadhaar Act 2016, Section 7** — narrows mandatory Aadhaar to government subsidies/benefits/services drawn from the Consolidated Fund. Section 7 allows the Central or State Government to require Aadhaar authentication or proof of possession for receipt of a subsidy, benefit, or service for which expenditure comes from the Consolidated Fund. Job platforms are not Section 7 use cases.
2. **Puttaswamy II (2018 Supreme Court ruling).** Private companies were largely barred from making Aadhaar a *mandatory* requirement, per the post-2018 reading by privacy commentators.
3. **2019 Aadhaar Amendment + 2025 Good Governance Rules.** The MeitY Good Governance portal launched at swik.meity.gov.in in early 2025 lets non-government entities apply for Aadhaar authentication for purposes including ease of living and aggregator services, on a voluntary basis. The amendment opens this for e-commerce, healthcare, education, and aggregator platforms — explicitly including gig and delivery players.
4. **Sub-AUA route.** Even after approval, you connect to UIDAI through an existing AUA/KUA partner, e.g. a licensed KYC vendor. Sub-AUAs must complete UIDAI audits, sign agreements, get a license key, and pass pre-production testing before go-live.

**KYC vendor pricing.** None of IDfy, Karza, Signzy, HyperVerge publish Aadhaar verification rates publicly — all are quote-based. IDfy directs you to contact sales for pricing. **[inferred]** real-world rates are typically ₹3–₹10 per Aadhaar OTP authentication, ₹5–₹15 for OCR + name match against an uploaded Aadhaar image, and ₹15–₹25 for face-match liveness — but you must validate with sales quotes; rates move quarterly.

**AUA / Sub-AUA timeline.** UIDAI's published process has 5+ steps including an STQC / CERT-IN-empanelled audit. In practice the round trip is 8–16 weeks once your parent AUA is engaged — incompatible with a 6-week MVP.

**KYC document mix in India.** Industry norm for a blue-collar marketplace is Aadhaar (primary identity) + PAN (only if payments/income > ₹50k threshold) + DL or voter ID as alternatives where available. Skill certificates are a nice-to-have, not a verification anchor.

**What competitors actually do.**
- **Apna** displays "verified" badges; details of their pipeline aren't public, but the candidate flow is Aadhaar/phone-OTP at signup with document review behind the scenes.
- **WorkIndia** ships verification language ("verified employers") but the actual mechanism for the candidate is mostly phone verification.
- **Public information on either company's exact KYC stack is not available.** I'm flagging this as **unknowable from public sources.**

**DigiLocker as alternative.** DigiLocker as a Requester gives you free API access for an approved use case via a multi-week MeitY/NeGD approval; the platform has 300M+ users and 6.8B+ documents as of March 2025. Bridge providers (Surepass, Karza, IDfy) wrap this with paid SDKs. For blue-collar — where most candidates do not yet have DigiLocker accounts — this is best as a *v2* convenience, not a v1 path.

**Recommendation for v1.**
- **Keep mock Aadhaar.** Format check + Verhoeff + phone OTP. Make it crystal-clear in your privacy notice that Azkashine is *not* performing UIDAI authentication and that the Aadhaar number is collected only for identity binding under DPDP Act 2023 obligations.
- **Offer alternatives.** If a user does not want to share Aadhaar, accept PAN, DL, or voter ID as alternative ID. This is required to be safe under Puttaswamy.
- **Plan v2 properly.** Engage one KYC vendor (IDfy, Karza, or HyperVerge are the safe shortlist) for a real Aadhaar OTP integration. Their compliance shoulder, their AUA agreement; you pay per verification.
- **Defer DigiLocker** to v2 unless you specifically want to be able to pull issued PAN / DL.

**Sources:** Aadhaar Act §7 [111]; Good Governance Rules 2025 [120, 121, 123]; UIDAI AUA/Sub-AUA process [92, 99]; KYC vendor landscape [102, 110]; DigiLocker partner model [174].

---

### Topic 7 — i18n / multi-language for 10 Indian languages

**Languages requested:** EN, HI, TA, KN, ML, MR, GU, OR, TE, BN.

**Global standard.**
- **File format:** JSON keys per language is the dominant pattern (`next-i18next` on Next.js, `i18next` on RN). Hosted alternatives — **Crowdin, Lokalise, Tolgee** — manage translations via a TMS web UI, push/pull keys via CLI/SDK, and integrate with CI.
- **Translation production:** the modern stack is **AI draft → native reviewer edit → publish**. Pure agency translation is 4–6× the cost; pure AI without review produces unusable output for Indic languages where idiom, formal/informal tone, and gender agreement matter.

**India-specific pitfalls.**
- **Font rendering:** Most Indic scripts need the right system font + correct `lang` attribute on the page; otherwise Android default fonts may fall back to a hollow box (Tofu). React Native + Expo handles this correctly out of the box for the 10 scripts you listed. **[inferred]** from typical RN/Expo behaviour.
- **Character width / line breaks:** Some Indic scripts (Tamil, Bengali) are 1.3–1.6× wider per glyph than Latin equivalents — design must accommodate ~30% line-length expansion in long strings. Plan for it in mockups, not after rollout.
- **Right-to-left:** None of your 10 languages are RTL, so this is not a v1 concern.
- **No regional dialect issue at MVP scale.** Standard Hindi (Devanagari) is fine for 99% of the audience.

**What competitors do.**
- **Apna**: 11 languages — English plus Hindi, Kannada, Bengali, Assamese, Gujarati, Malayalam, Marathi, Oriya, Tamil, Telugu. After English, Hindi was the most popular, followed by Kannada and Tamil. They built it in-house via their app team, per a public Apna case study reporting "support for 11 Indian languages".
- **WorkIndia**: app store listing says "Available in Hindi & English". They are deliberately narrower and lean on Hindi.
- **Naukri**: English-primary with Hindi support added in recent years.

**Cost estimate for 10-language translation of ~1,000 strings.**

| Path | Estimated INR cost (one-time) | Trade-offs |
|---|---|---|
| Commercial agency, all 9 non-English languages | ₹1.5–2.5 lakh | Highest quality, slowest, hardest to iterate. **[inferred from typical agency rates]** |
| Hosted TMS (Crowdin / Lokalise) + AI draft + freelance reviewers | ₹50k–80k + TMS subscription | Easy iteration, ~2–3 week setup, recurring cost. |
| **AI draft (GPT-4 / Claude) + paid native reviewer per language** | **₹35k–60k** | Fastest, easiest to control, no TMS lock-in. **[inferred]** based on freelance Indic reviewer rates of ₹2,000–5,000 per language for ~1,000 strings. |
| All AI, no review | ~₹2k API cost | Unusable. Don't ship. |

**Recommendation.**
- **JSON in repo** (`next-i18next` + RN i18next, sharing the same keys via a `packages/i18n` workspace).
- **AI draft + native reviewer**, two-pass: a vocabulary pass first (key UI nouns, error labels, CTA verbs), then a sentence pass (microcopy and onboarding).
- **English + Hindi must be 100% complete and reviewed before code freeze**, per the charter. The other 8 can soft-launch with minor gaps if reviewers slip — flag those keys with a `[needs review]` suffix on the build, never with placeholder English strings.
- **Defer Crowdin/Lokalise to v2** — once you cross 5,000 strings or have a steady release cadence, the TMS earns its keep.

**Sources:** Apna's 11-language coverage [128, 133]; WorkIndia 2-language coverage [134].

---

### Topic 8 — Audio messaging implementation

**Format / encoding standard for 2025–2026 mobile-web.**
- **Opus codec** is universally adopted for voice — it's the codec WhatsApp uses, and is the industry default for low-bitrate voice [167]. Container varies:
  - **Chrome / Android web:** `audio/webm; codecs=opus` is the default `MediaRecorder` output, per a public MediaRecorder API summary describing Chrome's mono Opus in WebM containers.
  - **iOS Safari:** historically a problem, now improving. macOS Sonoma added support for Opus inside MPEG-4 and WebM containers in Safari; Safari 18.4 added Opus and Vorbis with Ogg containers under macOS Sequoia 15.4 / iOS 18.4 and later. But in practice iOS Safari `MediaRecorder` will produce `audio/mp4` containers. If iPhone Safari produces WebM/Opus output, the file must be saved with a .webm extension and downstream services must be told the encoding explicitly.
  - **React Native:** the recording library output depends on platform — iOS produces `.m4a` (AAC), Android produces `.m4a` or `.opus` depending on library config.

**The pragmatic approach** is to **detect what the recorder produces** and store it in the original container, with the codec recorded as metadata. Don't try to force a single format — transcoding on the server is expensive and unnecessary for voice messages that are only consumed in-app.

**File-size targets for low-bandwidth.** Opus at 24 kbps mono is plenty for voice. That's roughly **180 KB per minute** — a 5-minute application audio is ~900 KB, a 60-second chat audio is ~180 KB. On 3G/4G, both are fine; on 2G (rare in 2026 but still some pockets), 180 KB is acceptable, 900 KB is borderline. So **cap chat audio at 60s** and the application audio at 5 minutes per the charter.

**Storage backend — local disk vs S3.**
- **Local disk for v1** is fine for the first ~10k DAU. Single-server, single-region, no migration complexity.
- **S3 (or Cloudflare R2 / DigitalOcean Spaces) from day 1** is safer if you expect to scale fast. Cost in INR terms is ~₹1.6/GB-month for S3 standard and ~₹6.5/GB egress to internet. **[inferred]** based on AWS Mumbai public pricing.
- For 10k users sending 5 audio messages/day at 180 KB each = ~270 GB/month accumulated. ~₹430/month at S3 standard prices. Negligible compared to engineering complexity savings.

**Recommendation:** start with **local disk + a presigned-URL abstraction** that you can swap to S3 in v2 with a single config change. Don't ship S3 day-one if you have one engineer.

**Transcription.** Skip in v1. AssemblyAI, Deepgram, and Sarvam AI all do Hindi and Indic — pricing is roughly ₹1–₹3 per audio-minute **[inferred]** — but adding it on the application audio doubles the application's cost-per-applicant for marginal product value. v2 feature, gated by user demand.

**WhatsApp's UX as the reference.** WhatsApp voice notes are the gold standard for blue-collar India: hold-to-record, swipe-to-cancel, 1.5×/2× playback speed, waveform visualisation. Match those affordances; don't invent a new audio UX.

**Recommendation summary.**
- **Codec:** Opus where supported, AAC fallback on iOS native.
- **Container:** detect at record time, store as-is, mark MIME type in DB.
- **Limits:** chat 60s, application 5 min.
- **Storage:** local disk with abstraction, plan S3 for v2.
- **Transcription:** v2.
- **UX:** WhatsApp-style hold-to-record + waveform.

**Sources:** Opus / WebM Safari support [167]; iPhone Safari MediaRecorder behaviour [164]; MediaRecorder cross-browser behaviour [168].

---

### Topic 9 — Content moderation for job posts

**Regulatory bar in India.** Job platforms are intermediaries under the Information Technology Act, 2000 and Intermediary Guidelines 2021. The standard you must meet is *due diligence* — you remove content within 36 hours of being notified, you have a published grievance officer, and you act in good faith on user reports. Discriminatory job ads (e.g. "men only", "fair-skinned only") risk consumer-protection complaints under the CPA 2019. Job-fraud postings can trigger IT Act §66C/D and IPC §419/420 actions against the *poster*, not directly against the platform if you have done due diligence — per a public guide to online job-fraud sections under IPC and IT Act. The platform's risk is reputational and via 36-hour notice-and-takedown.

**AI moderation services landscape.**

| Service | Approach | India / Indic support | Pricing |
|---|---|---|---|
| **OpenAI Moderation API** (`omni-moderation-latest`) | Multimodal classifier across hate / violence / self-harm / sexual / harassment / illicit | Strong. OpenAI's published numbers show 4.6× improvement on Marathi, 5.6× on Bengali, 6.4× on Telugu over the previous version, with 42% multilingual improvement overall. | Free for OpenAI API users; usage doesn't count toward monthly limits. |
| **Google Perspective API** | Toxicity scoring | Decent English; Indic support limited. **[inferred]** | Free at low volume |
| **Hive AI** | Classifier tower for moderation | Strong English; uneven Indic. **[inferred]** | Quote-based |
| Custom regex blocklist | Pattern matching | What you have today | Free |

**Indian job-scam patterns to filter explicitly.** Across the consolidated public guidance on Indian job scams, the recurring red flags are:
- "Registration fee" / "training fee" / "background-check fee" demanded upfront
- Free-mail-domain "HR" contact (gmail/yahoo/outlook) on a job claiming to be from a real corporate
- MLM / "earn lakhs by recruiting others" structure
- Contact-only-via-WhatsApp or Telegram, no company website
- Vague job description with high salary
- Pressure tactics ("apply immediately") with no formal interview

**What competitors actually use.** Apna, WorkIndia, and Naukri have published warnings about scams but **none publicly disclose their moderation engine**. Apna employs human review on flagged posts and machine classifiers under the hood — that's documented at the level of "we screen employers" but not at architecture level. **Public information not available — I'm flagging this as unknowable.**

**Recommendation for v1.**
- **Wire OpenAI's `omni-moderation-latest` as the "Scan Content" backend.** It's free and the Indic improvement is real. Two-tier output: hard block on high-confidence violations (sexual / self-harm / violence categories), flag-for-admin on borderline (harassment / hate).
- **Layer regex blocklist on top** for the India-specific scam patterns above (fees, MLM language, free-mail HR contacts, urgent payment demands).
- **Manual admin review of all employer-first posts** until the employer has 3+ approved posts and no reports.
- **User reports** create a queue item; respond within 36 hours per IT Rules.
- **Defer Hive/custom moderation** to v2.

**Sources:** OpenAI omni-moderation Indic improvements [150]; OpenAI Moderation API free [149]; Indian job-scam patterns [138, 139]; legal sections for scam reporting [144].

---

### Topic 10 — Recommendation algorithm

**Industry standards.** The major platforms' recommendation signals are well-documented at a high level:

- **Indeed** uses a mix of role match, location, recency, and salary expectations.
- **LinkedIn** uses skills, role match, network signals, and engagement features.
- **Apna** runs a proprietary scoring layer on top of Elasticsearch for matching, per an Elastic case study referencing Apna's custom scoring on top of Elasticsearch.

**Common signals for blue-collar specifically:**
- Role / sector exact match (highest weight)
- Location proximity (very high — blue-collar workers are commute-sensitive)
- Recency (jobs >7 days old should decay quickly — staleness is a major UX problem)
- Experience match (capped — over-qualification reduces fit)
- Skills match (smaller weight at this collar)
- Salary band fit (when salary is shown)

**Your current weighting (sector 25 + title-exact 30 + title-fuzzy 15 + experience 15 + skills 20 + location 10).** Reasonable. Two suggestions:

- **Bump location.** 10 is low for blue-collar. Most workers won't take a job >10 km away. I'd push location to 20–25 and trim sector to 20 or skills to 15. Make distance use **exponential decay** beyond 10 km (e.g. `score = base * exp(-(distance_km - 10) / 15)` clipped at 0).
- **Add a recency boost.** Jobs <24 h old get +10, <7 days +5, otherwise 0. Critical for engagement and freshness.

**Cold-start problem.** New seeker, empty profile — the weighted formula breaks down. Standard pattern: fall back to **city + popular categories**, sorted by recency. After the user takes 1–2 explicit actions (sets a category, opens a job detail), use those as a soft profile.

**Click/apply feedback loops.** Possible to ship cheaply. Each apply event for category C nudges the seeker's "interest weight" for C by +0.05; each "Reject" / "Hide" decays it by -0.10. This is a 1-day implementation. **For v1, this is a stretch goal — it works but it's not critical-path.**

**Diversity / freshness.** Add a 7-day recency boost as above. Don't randomise — workers want stability of search results. Don't dedupe by employer in v1 (let popular employers dominate).

**Content-based vs collaborative.** For blue-collar, **content-based** wins clearly. Collaborative filtering needs density of shared apply patterns, which you won't have at MVP scale. Revisit in v2 once you have 100k+ MAUs.

**Recommendation:**
- Ship the weighted formula with the location/recency tweaks above.
- Cold-start fallback: `city + popular categories + sort by recency`.
- Click/apply nudges: stretch goal, can ship in S3 if time allows.
- No collaborative filtering in v1.

**Sources:** Apna's Elasticsearch-based scoring [11].

---

### Topic 11 — Document verification

**DigiLocker for v1 vs v2.** Verdict: **v2.**

- DigiLocker API access is free for government-approved Requesters; private-sector startups must go through MeitY/NeSL approval.
- The approval process plus integration is multi-week.
- Bridge providers (Surepass, Karza, IDfy) wrap this with paid SDKs but you still need an underlying use-case fit.
- Most blue-collar candidates **don't yet have DigiLocker accounts** with their key documents seeded. So the conversion lift in v1 is small.

**Manual review SLAs.** Industry standard is **24–72 hours** for document review. Fastest competitors (high-end fintech onboarding) hit minutes via fully-AI'd flows. For blue-collar with manual review by an Azkashine admin, **48 hours during business days** is reasonable and what I'd publish in your Terms.

**OCR services.**
- **Google Vision OCR** — strong on English + Hindi, decent on Tamil/Bengali. Pricing roughly ₹0.13 per page **[inferred from public AWS Mumbai-equivalent rates]**.
- **AWS Textract** — premium, strong on tables/forms; ~₹0.13–0.40 per page **[inferred]**.
- **Tesseract** — free, open-source, weak on Indic scripts.
- **Indian-specific** — Sarvam AI, AI4Bharat IndicOCR. Free / open weights. Worth a look in v2 for cost optimisation.

For Aadhaar/PAN format detection, you don't need full OCR — a regex pass on user-typed text plus filename/MIME validation is enough for v1. The OCR-and-name-match is a v2 quality-of-life feature.

**Document types to support.**
- **Aadhaar** — primary identity, mandatory.
- **PAN** — required for any payment > ₹50k threshold and good practice for Pro employers.
- **Driving Licence** — alternative ID for delivery-driver roles.
- **Voter ID** — alternative ID for users without DL.
- **Skill certificates** — optional, ITI / NSDC certs for skilled trades.
- **Police verification certificate** — useful for security/domestic roles, often the *only* doc that matters in those segments.

**Recommendation.**
- **v1:** accept uploads for the 6 doc types above; manual admin review with 48h SLA; format pre-check via regex.
- **v2:** add OCR + name-match via Google Vision; add DigiLocker as an optional "fast path" for verified PAN/DL.

**Sources:** DigiLocker integration model and free Requester access for approved use cases [174].

---

### Topic 12 — Free tier metering & trial patterns

**3 apps/day metering.** Already covered in Topic 5 — your cap is tighter than Apna and WorkIndia, who don't cap applications and instead gate the *contact-recruiter* step. Suggest moving the gate.

**Soft caps.** Industry standard is to warn at 80% of the cap (so warn at 2/3 in your model) with friendly copy ("Last application today — upgrade for unlimited"). Hard-cap at 3/3 with a clear upgrade prompt. Don't silently fail.

**Daily reset timezone.** **IST midnight (00:00 +05:30).** UTC midnight feels arbitrary to Indian users (it's 5:30am IST). Rolling 24h is harder to communicate ("you can apply in 14 hours" is worse UX than "you can apply tomorrow"). IST midnight wins for clarity.

**Trial duration.** No published Indian-blue-collar SaaS A/B benchmark I could find — flagging this as **[inferred]**:
- 7 days: faster funnel, lower friction signup, lower trial conversion.
- 14 days: more chances to receive applicants and convert; SaaS median.
- 30 days: only for products where the value takes time to manifest (analytics, etc.).

For a job-posting product where applicants arrive within hours, **7 days is defensible** but tight. **Recommend 14 days** if engineering effort allows the change in copy, payments, and email cadence — otherwise ship 7 and revisit.

**Auto-renewal vs opt-in — the RBI e-mandate angle.** Important: the RBI has tightened recurring-payment rules considerably.

- The Digital Payments – E-mandate Framework requires issuers to send a pre-transaction notification at least 24 hours before any auto-debit.
- E-mandate transactions are capped at ₹15,000 (raised from ₹5,000); transactions above the cap need Additional Factor Authentication.
- RBI's recurring-card rules from October 2021 mandate one-time AFA registration of the e-mandate (typically via OTP) with subsequent recurring debits processed against that mandate.
- Pre-transaction alerts at least 24 h before debit, post-transaction notifications, opt-out facility on individual transactions, and free customer access to all of this are required.

**Practical impact for ₹250/month employer Pro.** ₹250 is well under the ₹15k AFA threshold, so e-mandate works without OTP-per-transaction. But you must still:
- Register the e-mandate with AFA at signup (Razorpay handles this).
- Send pre-debit notification 24h before each renewal.
- Honour opt-out instantly.

**Recommendation.**
- **v1: opt-in renewal only.** At end of trial, prompt the user to pay; at end of paid month, prompt again. No auto-debit. This is much simpler and removes the 24h-pre-notification cron.
- **v2: e-mandate auto-renewal** via Razorpay Subscriptions, once you have a steady cohort and are willing to invest in the dunning/notification surface.

**Sources:** RBI e-mandate framework and pre-debit rules [180, 184, 186].

---

## 3. Decision matrix

| # | Topic | Recommended for v1 | Recommended for v2 | Notes |
|---|---|---|---|---|
| 1 | Notifications | In-app + FCM push (all events); SMS (OTP, payment); Email (password reset, employer approval) | + WhatsApp Business API for non-OTP events | DLT registration is critical-path — start day 1. |
| 2 | Interview scheduling | Modal slot-picker (employer proposes 2–3 slots); in-app + SMS reminders 24h/2h | + `.ics`, calendar sync, video call native | No `.ics` in v1; outcome capture single-screen. |
| 3 | Escrow / payouts | Stub only — record payment intent, settle off-platform | Razorpay Route + 5–10% commission on completed placements | RBI PA Master Direction Sept 2025: marketplaces cannot self-process funds. |
| 4 | Mobile employer / admin | Web only | Web only (probably forever) | Charter is correct. |
| 5 | Subscriptions | ₹50 lifetime (seeker), ₹250/mo + 7-day trial (employer); recruiter-contact gate | Re-price employer; consider 14-day trial; tier expansion | Drop or raise the 3-apps/day cap (move gate to recruiter contact). |
| 6 | Aadhaar | Mock Aadhaar (format + Verhoeff + phone OTP); offer alternatives | Real UIDAI authentication via Sub-AUA partner (IDfy/Karza) | Section 7 doesn't cover job platforms; mock collection is legal under DPDP. |
| 7 | i18n (10 languages) | JSON in repo, `next-i18next` + RN i18next; AI draft + native review | Hosted TMS (Crowdin / Lokalise) | EN+HI must be 100% before code freeze. |
| 8 | Audio messaging | Opus where supported, AAC on iOS; local disk; 60s chat / 5min application | S3 storage; transcription | WhatsApp-style UX. |
| 9 | Moderation | OpenAI `omni-moderation-latest` (free) + India scam regex + manual review | Custom classifier; auto-reject thresholds | Free tier is enough; Indic accuracy is solid. |
| 10 | Recommendation | Current weights with location bumped, exp distance decay, 7-day recency boost | Click/apply feedback loops; collaborative filtering at scale | Cold start = city + popular categories + recency. |
| 11 | Documents | Manual review 48h SLA; regex format pre-check; 6 doc types | DigiLocker bridge + OCR + name match | Most blue-collar users don't yet have populated DigiLocker. |
| 12 | Free tier / trials | 3–5/day cap (or remove cap, gate recruiter contact); IST-midnight reset; 7-day trial; opt-in renewal | E-mandate auto-renewal via Razorpay Subscriptions | RBI e-mandate framework adds 24h pre-notification + AFA. |

---

## 4. Cost estimate annex (per-transaction / monthly minimums)

All figures are **indicative for May 2026, INR-denominated**, paraphrased from public references; verify with the vendor before locking. Items marked **[inferred]** are derived from typical industry rates, not from an explicit search hit.

### 4.1 Notifications

| Item | Per-unit cost | Monthly minimum / setup |
|---|---|---|
| MSG91 transactional / OTP SMS | ₹0.18 – ₹0.25 per delivered SMS | DLT registration ~₹5,000 one-time + ~3 weeks setup |
| WhatsApp Authentication template (India) | ~₹0.115 per message | BSP onboarding fee ₹1,000 – ₹3,000 one-time per a 2026 India BSP guide |
| WhatsApp Utility template (India) | ~₹0.115 – ₹0.145 (free in customer service window) | Same as above |
| WhatsApp Marketing template (India) | ~₹0.78 – ₹1.10 | Avoid — not relevant to v1 |
| FCM push | Free | Firebase project (free tier sufficient at MVP scale) |
| Transactional email (SES/Resend) | ~₹0.02 – ₹0.05 **[inferred]** | Domain SPF/DKIM setup |

**v1 estimated monthly notification spend at 10k DAU:** ~₹15,000–₹25,000 **[inferred]**. Dominant line item: SMS for OTP (assume 2 OTPs per user per month × 10k = 20k SMS × ₹0.20 = ₹4,000) + payment confirmations + new-user signups.

### 4.2 Payments

| Item | Cost |
|---|---|
| Razorpay subscription transactions | ~2% + GST per successful charge **[inferred from Razorpay published rates]** |
| Razorpay Route (v2) | Quote-based; typically same as PG MDR + small marketplace fee |
| Refunds | Free on most plans **[inferred]** |

### 4.3 Aadhaar / KYC verification (v2 estimates only)

| Item | Cost |
|---|---|
| Aadhaar OTP authentication via KYC vendor | ₹3 – ₹10 per success **[inferred from typical vendor rate cards; pricing is quote-based per IDfy's published policy]** |
| Aadhaar OCR + name match | ₹5 – ₹15 per page **[inferred]** |
| Face match + liveness | ₹15 – ₹25 per check **[inferred]** |
| PAN validation (NSDC API) | ₹2 – ₹5 per call **[inferred]** |
| DigiLocker bridge (Surepass / Karza) | ₹3 – ₹8 per fetch **[inferred]**; underlying API itself is free for approved Requesters |
| Bank account verification (penny drop / IFSC) | ₹3 – ₹8 per attempt **[inferred]** |

### 4.4 Content moderation

| Item | Cost |
|---|---|
| OpenAI `omni-moderation-latest` | Free for OpenAI API users |
| Custom classifier (v2) | Variable — model hosting + tuning |

### 4.5 Storage (audio)

| Item | Cost |
|---|---|
| AWS S3 standard (Mumbai) | ~₹1.6/GB-month + ₹6.5/GB egress **[inferred]** |
| Cloudflare R2 (no egress fees) | ~₹1.5/GB-month, no egress charge **[inferred]** |
| Local disk + DO Volume | ~₹8.50/GB-month **[inferred from typical DigitalOcean rates]** |

### 4.6 Translation (one-time)

| Path | Cost (1,000 strings × 9 non-English languages) |
|---|---|
| AI draft + native reviewer | ₹35,000 – ₹60,000 **[inferred]** |
| Hosted TMS + AI + freelancers | ₹50,000 – ₹80,000 + TMS subscription **[inferred]** |
| Commercial agency | ₹1.5L – ₹2.5L **[inferred]** |

---

## 5. Caveats and what to verify before locking decisions

You flagged regulatory questions, competitor pricing, and AUA timelines as the volatile items. After this research, the items I am **most** confident about:

- ✅ RBI Master Direction on Payment Aggregators bars marketplaces from PA flows — primary source verified [82, 83].
- ✅ OpenAI Moderation API is free and Indic-capable — verified [149, 150].
- ✅ Aadhaar Section 7 doesn't cover job platforms; private-entity authentication needs the Good Governance approval — verified [111, 121].
- ✅ DLT registration is mandatory for transactional SMS in India — verified [64].

Items I'd **double-check** with vendor sales / your legal counsel before locking:

- ⚠️ Apna and WorkIndia exact pricing — I only have public references and user-reported prices. Pricing pages are typically gated behind a sales contact form and pricing changes quarterly. Apna officially lists "four plans"; specific INR figures are user-reported.
- ⚠️ KYC vendor pricing — IDfy / Karza / Signzy / HyperVerge are all quote-based. Get sales quotes before committing.
- ⚠️ AUA / Sub-AUA timeline — public sources indicate weeks-to-months, but the actual UIDAI process is opaque and depends on parent AUA cooperation. Plan for v2 conservatively.
- ⚠️ Razorpay Route integration timeline — my 4–6 week estimate is a typical fintech-integration gut number, not a hard data point.

Items that are **genuinely unknowable from public sources** and where I avoided fabrication:

- ❌ Apna's and WorkIndia's actual moderation engines.
- ❌ Apna's exact KYC pipeline (mock vs real Aadhaar at signup, vendor used for document review).
- ❌ Apna's free-to-paid conversion rates.
- ❌ Apna's exact application-cap policy (varies by version of the app).

For these I recommend a competitive analysis pass post-launch — install the apps and test the flows yourself.

---

*End of document. Generated 6 May 2026 by Claude (web search agent) for Nazir Hasan, Azkashine. Total length: ~25 pages at standard print formatting.*
