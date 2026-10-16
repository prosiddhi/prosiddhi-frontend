# ProSiddhi — Legal & Data-Protection Compliance Plan

**Date:** 16 Oct 2026 · **Owner:** Nazir · **Grievance Officer:** Rambabu Gorantla
**Status:** DRAFT for decisions + lawyer review. Nothing here is legal advice.

This plan comes from four research tracks done on 16 Oct 2026: (1) DPDP Act + Rules,
(2) IT Act / Intermediary Rules / Consumer e-commerce Rules, (3) Razorpay (RBI) + Google Play,
(4) an audit of our own code (backend, portal, admin, mobile). Sources are listed at the end.
Items marked ⚠️ are not yet confirmed against the official gazette text.

---

## 1. Which laws apply, and when

| Law | Applies to us? | In force? |
|---|---|---|
| **IT Act s.43A + SPDI Rules 2011** | Yes (passwords, payment data) | **Yes, now** — until DPDP replaces it on ~13 May 2027 |
| **IT Intermediary Rules 2021** (amended Feb 2026) | Yes — we host jobs, profiles, documents, chat | **Yes, now** |
| **Consumer Protection (E-Commerce) Rules 2020** | Probably yes — we sell plans online. Treat as applying | **Yes, now** |
| **CCPA Dark Patterns Guidelines 2023** | Yes — checkout | **Yes, now** |
| **CERT-In directions 2022** | Yes | **Yes, now** — report incidents within 6 h ⚠️ |
| **RBI Payment Aggregator Directions 2025** (via Razorpay) | Yes | **Yes, now** |
| **Google Play User Data / Account deletion / UGC policies** | Yes (Android app) | **Yes, now** |
| **DPDP Act 2023 + DPDP Rules 2025** | Yes — we are a Data Fiduciary | Our duties start **~13 May 2027** (notice, consent, rights, breach, retention). ⚠️ A proposal to bring it to ~13 Nov 2026 was not notified as of Sep 2026 — re-check |
| **Emigration Act 1983** | Only if overseas jobs are posted | Yes, now |
| **Code on Social Security 2020 (aggregators)** | Likely not (we are not a gig platform) ⚠️ | — |

**Decision: build to DPDP standard now.** It is the strictest, and retrofitting consent and rights later is painful.

---

## 2. What our code does today (audit, 16 Oct)

### 2.1 Real problems in the code (not just wording)

| # | Problem | Where | Risk |
|---|---|---|---|
| C1 | **Applying to a job hands the employer the seeker's phone, email, DOB, gender, exact GPS (≈110 m) and verified ID/address-proof documents** — no unlock needed | `application.service.ts:606-613, 735-756, 1043-1048, 1103-1108` | Over-sharing; data minimisation; fraud/stalking risk for blue-collar workers |
| C2 | **Unlock reveals DOB, gender and GPS** on top of phone/email | `candidate.service.ts:68-73, 248-253` | Over-sharing |
| C3 | **Full Razorpay webhook payloads stored** (payer email, phone, UPI id, card fields) until purge | `schema.prisma:1036-1043` (WebhookEvent.payload) | SPDI "financial information"; policy says we keep only ids |
| C4 | **Profile photos in a PUBLIC bucket**, cached 1 year, reachable without login | `storage.service.ts:24-29, 330` | Photo + name of workers exposed |
| C5 | **No Terms / Privacy acceptance recorded anywhere** (only WhatsApp consent) | all repos | No proof of contract or consent |
| C6 | Chat list shows the other party's **email** | `conversation.service.ts:227, 235` | Over-sharing |
| C7 | Trial-dedupe keeps email / phone / GSTIN **forever** after deletion | `user-deletion.service.ts:106-111` | Retention without stated period |
| C8 | Log retention not set (Cloud Logging default); deleted data survives in **DB backups + bucket versions** | `logger.ts`, infra plan | Must be disclosed + bounded |

### 2.2 Good things already in place
PBKDF2-SHA256 (310k) passwords · OTPs stored as HMAC with pepper · signed, short-lived document links ·
private document bucket · rate limits · admin audit log · phone/email masked in logs · role-based access ·
HttpOnly refresh cookie · mobile GPS foreground-only and rounded · no analytics/crash SDKs · no card numbers stored ·
in-app + web account deletion with 30-day restore and nightly purge · 18+ check on DOB · data hosted in India (asia-south1).

### 2.3 Where our current Privacy / Terms text is wrong
1. Says GPS only "in your browser" — the app and job posts also collect it.
2. Says contact details stay hidden until unlock — false for anyone who applied (C1).
3. Omits Firebase/FCM (push, incl. chat previews), OpenAI (job-post text, admin-triggered), Google Cloud, WhatsApp via MSG91/Meta, the SALES staff role, and transfer abroad (OpenAI).
4. Says only payment ids reach us — false today (C3).
5. Nothing about public profile photos (C4).
6. Deletion section omits what is kept: closed job posts, audit logs, trial-dedupe ids, backups.
7. No Grievance Officer, no registered office, no retention periods, no Board complaint route.
8. "Withdraw your consent" has nothing behind it.
9. Terms: "You register with your phone number" (employers also use email/Google); jurisdiction "courts of India" (no city).
10. Help: says phone password reset is "not available yet" — the backend supports it (check the portal).

---

## 3. What the law and platforms require (the checklist)

### 3.1 Pages on prosiddhi.com (all linked in the footer on every page)
1. **About us** — legal name, CIN, "ProSiddhi is a brand of AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED", what we do.
2. **Contact us** — registered office, phone, support email, support hours, **Grievance Officer name + designation + email + phone**, response times.
3. **Pricing** — every plan, ₹, what it includes, duration, "+18% GST" and the final total; must match checkout.
4. **Terms of Use** — see 3.3.
5. **Privacy Policy** — standalone, plain language, see 3.2.
6. **Refund & Cancellation** — see 3.4.
7. **Delivery** (instead of "Shipping") — digital service, activates on payment confirmation, invoice emailed, nothing shipped.
8. **Account deletion** — named "ProSiddhi"; steps (app + web, no reinstall needed); what is deleted, what is kept, why, for how long.
9. **Grievance redressal** (can be a section of Contact) — how to complain, timelines, appeal to the Grievance Appellate Committee (gac.gov.in) within 30 days.

Link inside the **app**: Privacy, Terms, Account deletion, Contact/Grievance. **Not** Pricing or Refund (Google Play payments policy).

### 3.2 Privacy Policy must contain
Who we are (fiduciary, legal name, address) · contact person for data questions (Rambabu Gorantla) ·
**itemised data list** per role · purpose of each · what each purpose enables · legal basis (consent / voluntary provision / legal duty) ·
who receives what (employers — exactly what on apply and on unlock; processors: Google Cloud, MSG91, Firebase, Razorpay, OpenAI, Google sign-in) ·
transfer outside India (OpenAI) · retention period per data type · security measures · rights (access summary, correction, erasure, nomination, grievance) and how to use them, response time ·
how to withdraw consent (as easy as giving it) · complaint to the Data Protection Board · 18+ only · cookies/browser storage incl. the refresh cookie · public profile photo (or fix C4) ·
breach notification promise · version number + effective date · available in our 10 languages.

### 3.3 Terms of Use must contain
Eligibility 18+ · account rules · we are a platform, not an employer, don't handle wages · **seekers never pay; report anyone who asks for money** ·
employer duties (genuine jobs, lawful pay, no deposits/fees from seekers, overseas jobs only with eMigrate licence — or banned) ·
**prohibited content list per IT Rules 3(1)(b)** ⚠️ copy wording from the gazette · moderation, report and block · user content licence ·
payments via Razorpay, we don't store card data · plans, expiry, grace · refund policy link · liability cap · indemnity ·
suspension/termination (both sides) and what happens to data · **governing law India; courts at Bengaluru** (for employer/B2B; consumers keep their statutory forum ⚠️) ·
optional arbitration seated in Bengaluru for B2B only · Grievance Officer and GAC · changes and re-acceptance · version + date.

### 3.4 Refund & Cancellation (proposed wording basis)
Plans are digital services that activate immediately and are **non-refundable once activated**; no mid-term cancellation; plans run to expiry.
**We always refund in full:** (a) payment debited but failed / not confirmed; (b) duplicate or excess charge; (c) plan not activated within 24 h of payment.
Request within 7 days at the support email; refunds to the **original payment method** (RBI PA Directions 2025 para 10(f)) within 5–7 working days ⚠️ (our choice — confirm with Razorpay).
Existing rule kept: post credit refunded if a job is deleted within 24 h with no applications.

### 3.5 Grievance timelines (use the strictest)
| Source | Acknowledge | Resolve |
|---|---|---|
| IT Rules 2021 as amended Feb 2026 ⚠️ | 24 hours | **7 days** (prohibited-content complaints **36 hours**; intimate images **2 hours**) |
| Consumer E-Commerce Rules 2020 | 48 hours | 1 month |
| DPDP Rules (from May 2027) | — | max 90 days |
**Publish: acknowledge within 24 hours, resolve within 7 days.**

### 3.6 Consent (product)
- Unticked checkbox at sign-up: "I agree to the Terms of Use and have read the Privacy Policy" — all flows, web + app.
- Record: user, document (TERMS / PRIVACY), version, timestamp, source (web/app/flow), IP, user agent. Never overwrite — append.
- **Re-consent gate** after login when the user's accepted version is older than current (all existing users on launch).
- Optional consents separate and withdrawable in Settings: WhatsApp messages (exists), push (OS permission), marketing (if ever).
- **Mobile prominent disclosure** before the location permission ("ProSiddhi uses your location to show jobs near you…").
- Rules reminder to users **every 3 months** (IT Rules 2026 amendment ⚠️).

### 3.7 Retention (needs a decision — see §4 D2)
- IT Rules 3(1)(h) ⚠️: keep a user's information **180 days** after account cancellation.
- DPDP Rule 8(3) (from May 2027): keep personal data, traffic data and logs **≥1 year** for government purposes.
- Our decision D-6: account restorable 30 days, then erased.
- GST law: invoices kept (period to confirm with CA — commonly 8 years ⚠️).

### 3.8 Operations
Grievance log · rights-request log · consent log · breach runbook (CERT-In 6 h ⚠️, DPDP Board + affected users, 72-h report) ·
processor contracts / DPAs (Google Cloud, MSG91, Firebase, Razorpay, OpenAI) · log retention 1 year, in India ·
dark-pattern self-audit of checkout · decide overseas jobs · Razorpay needs a sample invoice + test employer login.

---

## 4. Decisions needed (Nazir)

| # | Decision | Recommendation |
|---|---|---|
| D1 | What an employer sees when a seeker **applies** / when they **unlock** | Apply: name, photo, age (not DOB), skills, experience, town/area, message, **phone** (so they can call). **Never**: exact GPS, gender unless the job needs it, ID/address-proof documents (show a "Verified" badge instead), email (chat exists). Unlock: same + phone + email. Say exactly this in the policy |
| D2 | Retention after deletion | User-visible account erased at 30 days (keeps D-6). Keep a **locked, access-restricted legal record** (ids, logs, minimal identifiers) for **180 days / 1 year** as the law needs, then purge. Lawyer to confirm periods |
| D3 | Refund policy | §3.4 — non-refundable with the three carve-outs |
| D4 | Published grievance timelines | 24 h acknowledge / 7 days resolve |
| D5 | Public profile photos | Make them **private** (signed links, like documents) |
| D6 | Razorpay webhook payloads | Store only the fields we use; strip contact + card fields on receipt |
| D7 | Overseas jobs | **Ban** in Terms + job form for now |
| D8 | Support / grievance mailboxes | `support@prosiddhi.com`, `grievance@prosiddhi.com` (create in Hostinger) |
| D9 | Lawyer review | Who reviews the final Privacy, Terms and Refund text before publishing |
| D10 | Rambabu Gorantla's designation + phone | Needed on Contact and Privacy |

---

## 5. Build plan (we do all code: FE, BE, mobile)

**Phase 1 — Pages (unblocks Razorpay review; this week)**
`legal.ts` values (office, GSTIN, phone, emails, grievance officer) · Contact (+ grievance section) · About · Refund & Cancellation · Delivery · Account-deletion page update · footer on every page incl. employer dashboard · "seekers never pay" notice · 10 languages.

**Phase 2 — Policy rewrite (draft → lawyer)**
New Privacy Policy and Terms per §3.2 / §3.3, matching the code *after* Phase 3. Version + effective date. 10 languages.

**Phase 3 — Data minimisation (BE + FE + mobile)**
D1 payload trimming (apply, unlock, chat) · D5 private photos · D6 webhook trimming · C7 bounded trial-dedupe (hash instead of raw) · overseas-job rule.

**Phase 4 — Consent (BE + FE + mobile)**
Consent table + endpoint · sign-up checkbox in every flow · post-login re-consent gate · Settings: view accepted versions, withdraw optional consents · mobile location prominent disclosure · 3-monthly rules reminder.

**Phase 5 — Rights & operations**
"Download my data" summary · grievance form + log with timers · D2 retention implementation · log retention config · breach runbook · processor DPAs · dark-pattern audit.

**Ordering note:** Phase 2 text must describe the system *after* Phase 3, or the policy will be wrong again. Publish Phase 1 pages immediately; publish the new Privacy/Terms together with Phase 3 + 4.

---

## 6. Sources (from the research, 16 Oct 2026)
- DPDP Rules 2025, G.S.R. 846(E): https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2190014 · https://ssrana.in/articles/meity-notifies-final-digital-personal-data-protection-rules-2025/ · https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified
- Commencement G.S.R. 843(E): https://acuitylaw.co.in/notification-of-digital-personal-data-protection-law-in-india-certain-key-timelines/
- Timeline status (Sep 2026): https://www.mirvolegal.com/insights/dpdp-rules-2025-compliance-timeline/ · https://ksandk.com/data-protection-and-data-privacy/dpdp-act-rules-2026-compliance-deadline/
- Penalties: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655
- Breach rule: https://dpdp.myndsolution.com/wiki/rules/rule-7-intimation-of-personal-data-breach/
- IT Rules 2026 amendment: https://www.argus-p.com/updates/updates/update-overview-of-the-it-intermediary-amendment-rules-2026/ · https://khaitanco.com/thought-leadership/MeitY-notifies-the-IT-Amendment-Rules-2026
- GAC: https://nishithdesai.com/research-and-articles/hotline/technology-law-analysis/additional-compliances-for-intermediaries-under-recently-amended-intermediary-guidelines-8335
- E-Commerce Rules: https://hsalegal.com/wp-content/uploads/2020/09/HSA-Corp-Comm-Law-Policy-The-Consumer-Protection-E-commerce-Rules-2020.pdf
- Dark patterns: https://www.jsalaw.com/newsletters-and-updates/ccpa-issues-guidelines-for-prevention-and-regulation-of-dark-patterns-2023/
- Clickwrap: https://blog.ipleaders.in/enforceability-of-clickwrap-agreements-in-india-all-you-need-to-know/
- Consumer arbitration (Emaar v Aftab Singh): https://api.sci.gov.in/supremecourt/2018/26696/26696_2018_Judgement_10-Dec-2018.pdf
- Emigration / overseas recruitment: https://www.eoibaghdad.gov.in/docs/1703165439Advisory%20circular.pdf
- RBI PA Directions 2025: https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896
- Razorpay website requirements: https://razorpay.com/docs/payments/dashboard/account-settings/business-website-details/
- Google Play privacy policy: https://support.google.com/googleplay/android-developer/answer/10144311 · account deletion: https://support.google.com/googleplay/android-developer/answer/13327111 · UGC: https://support.google.com/googleplay/android-developer/answer/9876937 · payments: https://support.google.com/googleplay/android-developer/answer/9858738
