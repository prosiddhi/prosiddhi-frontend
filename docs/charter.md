# Project Charter — Azkashine Job Portal v1

**Owner:** Nazir Hasan (Acting Project Manager)
**Date:** 2026-05-09
**Status:** Draft — for Product Owner review and sign-off
**Target QA handover:** 2026-06-22

---

## A note on this document

This Charter is written in plain language so the Product Owner, Sponsor, and any non-technical stakeholder can read it end-to-end and make informed decisions without needing a developer to translate. Where we cite numbers, prices, or competitor practices, the source is our [industry research document](research.md). The technical contract for the build team lives separately in [`02-scope-locked.md`](_context/02-scope-locked.md) and is not intended for non-technical reading.

---

## 1. What we are building, in one paragraph

Azkashine Job Portal connects **Potential workers & Domain Specialists In India** with **employers** through a mobile-first, multilingual platform. Workers sign up with just a phone number, browse jobs in their language, and *also* can apply with a voice message. Employers post jobs, review candidates, and schedule interviews. A small Azkashine admin team verifies corporate employers and moderates job posts. The platform works on the web and as a mobile app, supports 10 Indian languages, and uses WhatsApp to keep workers updated. We make money from **subscriptions only**; we never handle the wages between workers and employers.

---

## 2. Why this product, why now

**The market is large and underserved.** Apna alone has tens of millions of users; WorkIndia has tens of millions; Naukri owns the white-collar segment. The blue-collar and domain-specialist segments — construction, food delivery, factory work, domestic help, retail, repair services, and the long tail of skilled-but-fragmented trades — remain fragmented. *Indian workers who possess alternative skills across different job domains require a stable platform for their employment.*

**Where existing platforms fall short:**

- **Language reach.** Apna offers 11 languages, but WorkIndia is only Hindi and English. Workers from Tamil Nadu, Karnataka, Kerala, Odisha, West Bengal, and Gujarat are partly excluded by the Hindi-English-only platforms.
- **Voice-first communication.** Most platforms are text-heavy. Workers who can't read fluently struggle.
- **WhatsApp gap.** Workers live in WhatsApp, but most platforms send notifications by SMS, which often goes to spam or shows up as "unknown sender." WhatsApp open rates are 80%+ versus around 30% for SMS.

**Our angle:** 10 Indian languages from day one, voice messages on chat and applications, phone-only signup, WhatsApp-native notifications, and a low-friction premium tier (model TBD with your input — see Section 7).

---

## 3. Who uses this product

### 3.1 Job Seeker — primary user
Workers like Sanjay RK — unskilled, mobile-first, low literacy, owns a basic Android phone, speaks one of 10 Indian languages: English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, or Bengali. Uses both the mobile app (primary) and the website (secondary).

### 3.2 Employer — secondary user
Two types:

- **Individual** (e.g., a household hiring domestic help) — instantly approved after signup
- **Corporate** (a company) — submits business documents (GST, CIN, ISO certificates) and waits for our admin team to approve

Uses both web and mobile.

### 3.3 Admin — internal Azkashine team
A small team that verifies corporate employer documents, moderates job posts using an AI-assisted "Scan Content" feature, manages payments and user complaints, and views revenue dashboards. Uses a separate web app (no admin mobile app).

---

## 4. What we are building in v1

### 4.1 For job seekers (workers)

- **Phone-only signup.** Enter phone number, get a 6-digit code via SMS or WhatsApp, set up profile (name, email, sector, job title, work experience, optional documents), set a password.
- **Login three ways.** Phone + OTP, email + password, or "Sign in with Google" — whichever is easiest.
- **10 Indian languages.** English and Hindi will be 100% complete at launch; the other 8 may have minor gaps if our language reviewers are still finishing.
- **Two job feeds.** "Recommended for you" (sorted by best match to your profile and location) and "Jobs Nearby" (sorted by distance only).
- **Apply with voice.** Record up to a 2-minute voice message about why you're a fit, optionally add text. The same 2-minute cap applies on web and mobile.
- **Save jobs for later. See your applications.**
- **Chat with employers.** Text and voice messages up to 60 seconds. Refreshes automatically when chat is open.
- **Free vs paid.** Free users browse jobs; paid users get extra premium features (exact mechanics for you to decide — see Section 7).
- **Notifications.** In-app, phone push, SMS for OTP and payment, WhatsApp for application status, interview reminders, and recruiter messages. Email only for password reset.

### 4.2 For employers

- **Two registration paths.** Individual (instant approval) and Corporate (waits for our admin team's review of business documents).
- **Phone-only signup** plus alternative login methods (email + password or Google).
- **Free trial + paid plan.** Exact pricing decision is yours (Section 7).
- **Post jobs** with rich descriptions, salary ranges, location, urgency, and a live preview before publishing.
- **Manage candidates.** See applicants, mark them as Accepted / Rejected / Bookmarked / Shortlisted; view their profile, resume, and voice introduction.
- **Schedule interviews.** Pick date, time, optional notes. (Adding the interview *mode* — in-person, phone, video — is a small confirmation we want from you in our next sync.)
- **Send interview reminders.** Workers get a WhatsApp message, with SMS as backup, 24 hours and 2 hours before the interview.
- **Day-after the interview.** Three quick buttons for the employer: Hired / Did not show up / Need re-interview.
- **Toggle visibility** of phone or email per job post — controls whether seekers can use "Contact Recruiter" once they've upgraded.
- **Available on web AND mobile** — same features on both. Mobile lets recruiters review candidates while travelling or between meetings.

### 4.3 For our admin team

- **Verification queues.** Review and approve / reject corporate employer registrations. Manually verify uploaded documents (no AI auto-verification in v1).
- **Job post moderation.** Every post gets a one-click **"Scan Content"** button that uses OpenAI's free moderation tool plus our own checks for Indian scam patterns (registration fees, MLM language, "earn lakhs by recruiting", free-mail HR contacts pretending to be from real corporates). Admin still has the final word.
- **Send warnings or delete** posts that violate rules.
- **Revenue and subscription dashboards.**
- **Soft-delete users** — recoverable, not gone forever.
- **Web only.** No mobile admin app.

### 4.4 Behind the scenes (the technical layer)

- **Notifications** flow through five channels:
  - In-app messages
  - Phone push notifications (FCM)
  - **WhatsApp Business** for application status updates, interview scheduling and reminders, recruiter contact, payment confirmations
  - SMS for OTP and payment confirmation (and as a fallback when WhatsApp delivery fails)
  - Email for password reset and corporate-approval outcomes
- **Voice messages** stored on our server; a one-line config change moves storage to cloud (S3) when we scale.
- **Razorpay** for all payments (UPI, cards, net banking).
- **One backend** serves web, mobile, and admin.

---

## 5. What we are NOT building in v1 — and why

### 5.1 Things deferred to a later version (v2+)

| Feature | Why it's deferred |
|---|---|
| Voice playback engine for the whole interface (the 🔊 icons stay as design placeholders, not functional yet) | The audio engine is its own project — pre-recorded voice vs cloud TTS vs device TTS is a separate research and build effort. |
| AI auto-verification of documents (OCR, photo matching) | Admin verifies manually in v1. Building OCR + photo-match + name-match is a separate AI project. |
| Skill testing (online tests, field assessments) | Workers self-declare skills in v1. Skill testing is a separate product line with field operations. |
| Job ratings and reviews after work is done | Adds complexity. Not core to the hiring loop — workers want jobs, employers want applicants. |
| Auto-renewing subscriptions | RBI requires a 24-hour pre-debit notification surface for auto-debit — adds workflow we don't need to ship in v1. Manual renewal is fine. |

---

## 6. Research-backed decisions

Two decisions worth explaining because they're driven by research rather than instinct.

### 6.1 Aadhaar — we removed it entirely

**Original plan:** collect a 12-digit Aadhaar number at signup, validate the format, send an OTP to the phone (mock verification, not a real UIDAI lookup).

**What research told us:**

- **Apna and WorkIndia don't require Aadhaar.** They use phone OTP only at signup. We were on track to be the *only* platform requiring an extra ID number — adding friction at the wrong moment of the funnel.
- **The Supreme Court (Puttaswamy 2018) bars private companies from making Aadhaar mandatory.** So we'd have had to build PAN, Driving Licence, and Voter ID alternative paths anyway — extra screens, extra admin verification work.
- **Real Aadhaar verification needs an AUA-licensed partner** (IDfy, Signzy, HyperVerge, or Karza) — 3+ months of contract setup. Not realistic in 6 weeks.

**Decision:** removed entirely. Phone OTP only at signup. About a week of engineering effort saved, and the registration flow is now closer to what Indian workers expect from competitors.

### 6.2 WhatsApp Business is in v1

**Why we use WhatsApp Business for notifications:**

- **Indian workers live in WhatsApp.** Open rates run 80%+ for transactional WhatsApp messages versus around 30% for SMS in the same population.
- **WhatsApp utility templates cost ~₹0.115 per message** versus ₹0.18–0.25 for DLT-registered SMS. At our notification volume — application updates, interview reminders, payment confirmations — the cost difference adds up.
- **Workers can reply** to recruiter messages right inside WhatsApp without switching apps.

We use **MSG91** as our WhatsApp provider (already in our stack for SMS). Engineering integration takes 5–7 days. The supporting work — Meta Business verification, BSP onboarding, template approval — runs in parallel as a non-engineering workstream and takes 1–3 weeks elapsed.

**One acceptable risk:** if Meta verification slips, WhatsApp launches up to a week *after* QA handover (June 22) instead of at handover. SMS stays as fallback throughout, so no critical notification is ever undelivered.

---

## 7. Pricing — provisional Option B; awaiting your confirmation

> **CONFIRMED & SUPERSEDED 2026-06-29.** Pricing is now locked as an **8-tier metered credits model** (employer
> buys post + candidate-unlock credits; free trial; seekers free) — **not** the flat ₹999 Option B below. Canonical:
> [`docs/pricing/employer-monetization-functional-spec.md`](pricing/employer-monetization-functional-spec.md)
> (+ technical-design.md). This section and the Pricing appendix are historical.

Pricing is the single most important decision for this product. The current working assumption (provisional Option B) is recorded in the **Pricing appendix** at the end of this document.

The full A/B/C options analysis (the Pricing Decision Memo) was removed in the 2026-06-13 doc purge — recoverable from git history if the analysis is needed again.

**To unblock Sprint 1, we are proceeding with Option B as the working assumption** (worker free; employer ₹999/month with 14-day trial), documented in the **Pricing appendix** below. If you want different numbers or a different option (A / C / a variant), please confirm by **2026-05-18** — anything you say will override the provisional state. If we don't hear back by then, Option B ships as v1 default and can still be revised in v1.1 based on first-launch month learnings.

---

## 8. How we'll deliver

### 8.1 Team

| Role | Person | What they own |
|---|---|---|
| Frontend developer + acting Project Manager | **Nazir Hasan** | Public website, admin website, FE/BE alignment, all PM artefacts |
| Backend developer | **Asrar** | Backend API, Razorpay integration, Aadhaar code removal, WhatsApp integration |
| Mobile developer | **Mobile dev (TBD — Dheeraj off project 2026-05-15; new hire pending)** | Mobile app for both workers and employers (React Native + Expo) |
| WhatsApp / Meta verification + operations | **TBD (non-engineering)** | Owns Meta Business verification, BSP onboarding with MSG91, template drafting and approval — runs in parallel with engineering |
| Translation reviewers (10 languages) | Coordinated by Nazir | Native-speaker review of AI-translated UI text |
| Infrastructure | Separate team | Hosting, deployment, staging environment by mid-May |
| Quality Assurance | **Najeeb (QA Lead) + Farhana (QA junior, Mohamad.farhana@azkashine.com)** | UAT begins 2026-06-22 |

### 8.2 Sprint plan in plain English

| Sprint | Dates | What we'll have at the end |
|---|---|---|
| **Sprint 0 — Foundation** | May 5–10 | This Charter signed off; PRD, RTM, sprint backlog written; Dheeraj onboarded; Meta verification process begun |
| **Sprint 1 — Authentication + Subscription + Plumbing** | May 18–29 | Workers and employers can sign up with phone OTP, log in via email or Google, on both web and mobile; subscriptions wired up using your chosen pricing model; WhatsApp + SMS infrastructure in flight |
| **Sprint 2 — Core flows + integrations** | Jun 1 – Jun 12 | Apply with voice, candidate management, chat, admin moderation, English + Hindi UI complete and reviewed |
| **Sprint 3 — Polish + QA prep** | Jun 15–19 | Bug fixes, performance check, security review, seed data loaded, deployed to staging. **Code freeze June 21**, **handover June 22**. |
| **QA UAT** | June 22 onwards | QA team runs scenarios; we fix only blockers. WhatsApp goes live in week 1 of UAT if Meta approval came through during the build. |

---

## 9. Success criteria for QA handover (June 22, 2026)

By June 22, we must have:

- **Three apps deployed to staging** — the public website, the admin website, the mobile app — all using real authentication (no mock data on critical paths).
- **A worker can:** sign up via phone OTP, complete profile, browse Recommended + Nearby jobs, apply with a voice message, chat with an employer, pay (whatever pricing model you chose), receive notifications.
- **An employer (Individual or Corporate) can:** sign up, get verified or instantly approved, post a job, review applicants, schedule an interview, pay, message a worker.
- **An admin can:** process verification queues, scan content with OpenAI moderation, send warnings, delete violating posts, see revenue dashboard.
- **English + Hindi UI:** 100% complete and reviewed. Other 8 languages: at minimum present, with `[needs review]` markers if anything is missing.
- **The backend has:** Razorpay subscription module, phone-OTP auth + Email + Google login, content moderation via OpenAI + India scam regex, all 11 notification types delivered through the channel matrix (in-app + push + SMS for critical + email for sensitive + WhatsApp where templates are approved).
- **Seed data loaded** — job categories from our 11 spreadsheets, an admin user, sample employers.
- **API contract published** in `docs/`; **QA pack delivered** — test accounts, environment URLs, known limitations, regression scenarios.
- **Code freeze** holds from June 21; only blocker fixes during UAT.

---

## 10. Sign-off

By signing below, the named parties confirm scope, timeline, and ownership as defined above. Scope changes after sign-off require explicit override of [`02-scope-locked.md`](_context/02-scope-locked.md) and a Charter revision.

| Role | Name | Date | Signature |
|---|---|---|---|
| **Owner & Sponsor** (approval authority) | Shaik Ishaq | | |
| Product Owner (operational) | Nazir Hasan | 2026-05-09 | |
| Acting PM / Frontend Lead | Nazir Hasan | 2026-05-09 | |
| Backend Lead | Asrar | | |
| Mobile Lead | Mobile dev (TBD) | | |
| WhatsApp / Operations Owner | TBD | | |
| QA Lead | Najeeb / Farhana | | |
| Infrastructure Lead | Nayan | | |


---

# Appendix — Pricing (Provisional Option B)

> Folded in from the former `03-pricing-decision-provisional.md` (2026-06-13).

# Pricing Decision — Provisional Working Assumption

**Status:** PROVISIONAL — awaiting Shaik Ishaq's final confirmation
**Decided (provisionally):** 2026-05-11
**Confirmation deadline:** 2026-05-18
**Recorded by:** Nazir Hasan

---

## What we're building against (until Shaik confirms or changes it)

We are proceeding with **Option B from the Pricing Memo** as the working assumption. This unblocks the PRD, the subscription module build, and Sprint 1 work without waiting until 2026-05-18.

| Side | Working assumption |
|---|---|
| **Worker (Job Seeker)** | Free forever. No premium tier in v1. |
| **Employer** | ₹999 / month, paid manually each month (no auto-debit). |
| **Free trial** | 14 days. In-app + WhatsApp check-ins on day 3 and day 7 to drive conversion (research showed 14-day with structured check-ins converts at 44%). |
| **Renewal** | Manual — at month-end, employer is prompted to pay again. No RBI e-mandate flow in v1. |

(The detailed Pricing Memo with the full A/B/C options analysis was removed in the 2026-06-13 doc purge — recoverable from git history; this summary is now the live record.)

---

## Why we're going provisional rather than waiting

- **PRD is blocked on pricing** — without concrete numbers in M10 (Subscription), the PRD's acceptance criteria are vague and engineering can't size the work.
- **Asrar starts the subscription module today** (Sprint 1 day 1) — better to give him concrete numbers and seed data than placeholders.
- **Reversibility is cheap.** Plan names and prices live in BE seed data, not hardcoded. If Shaik picks a different option on or before 2026-05-18, the change is: update Q1/Q5 in `02-scope-locked.md`, update the PRD's M10 paragraph, update one seed file. ~30 minutes of work.
- **Shaik has been notified.** Working assumption + 2026-05-18 confirmation deadline communicated to him.

---

## What changes if Shaik picks differently

| If Shaik picks... | What we change |
|---|---|
| **Option A** (₹50 seeker lifetime + ₹250 employer/mo) | Add seeker premium tier ("Elite Member"); change employer price to ₹250; FE adds the seeker upgrade screen; BE adds the lifetime-flag column on User |
| **Option B with Starter tier** (₹499 Starter + ₹999 Pro) | Add a "Starter" plan tier in seed data; FE shows two paid tiers on upgrade screen; no schema change |
| **Option C** (per-post pricing) | Larger change — BE schema gets a `JobPostCredit` table; subscription module repurposes to credit pack logic; FE upgrade screen becomes a credit pack picker |
| **His own variation** | Case-by-case |

The build is designed to be flexible — the subscription module supports configurable plans. Numbers and tier names are seed data, not constants.

---

## Communication to Shaik

A short WhatsApp / email is going to Shaik today (2026-05-11), summarising:

> "We've taken Option B (your recommendation) as the working assumption to unblock Sprint 1, so engineering can start building today. If you want different numbers or a different option, please confirm by Mon 2026-05-18 — anything you say will override this provisional state. If we don't hear back, Option B ships as v1 default. Thank you."

---

## Anchor links

- Locked scope reflecting provisional state: [`_context/02-scope-locked.md`](_context/02-scope-locked.md) (Q1 + Q5)
- Charter Section 7 reflects this provisional state (this document).
