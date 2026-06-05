# Product Summary — Azkashine Job Portal

**One-line pitch:** A mobile-first, multilingual job portal that connects unskilled workers in India with employers, with phone-based identity, in-app audio messaging, and a low-cost subscription model designed for low-literacy users.

**Brand:** Azkashine Software & Services Pvt. Ltd.
**Target market:** India.
**Domain:** Unskilled labour (construction, manufacturing, food products, automobile, renewable energy, medical assistance, common works, repair services, domestic help, delivery, retail).

---

## Personas (3)

### 1. Job Seeker — primary user, "Sanjay RK"
- Unskilled worker, low literacy, mobile-first, owns a basic Android phone
- Speaks one of 10 Indian languages (English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, Bengali)
- Needs voice assistance to read screens (TTS — deferred to v2 backlog, but icons stay in UI)
- Uses both **mobile app** (React Native, primary) and **web** (Next.js, secondary — same screens, mobile-friendly)
- **Identity: phone number + OTP only** (no Aadhaar, no government ID at signup; revised 2026-05-09 per Q3/Q4 revoked)
- **Login:** phone+OTP, email+password, or Google OAuth — three options
- **Free vs paid tier mechanics PO-pending** (Q1/Q5 — see `02-scope-locked.md`)

### 2. Employer — secondary user, two sub-types
- **Individual** (e.g., household hiring a maid): instant approval after phone+OTP+password+email verification
- **Corporate** (registered company): wait for **admin approval** after submitting business details (GST, CIN, ISO certs, etc.)
- Uses **web AND mobile** (full parity per D3 revised 2026-05-09 — Dheeraj is mobile dev)
- **Free trial + paid plan PO-pending** (Q1/Q5 — Pricing Memo at `docs/managerial/03-pricing-decision-memo.md` presents 3 options)

### 3. Admin — internal team, "ABC CO"
- Verifies seeker documents (uploaded ID, certificates) and employer registration (corporate approval queue)
- Moderates job posts (AI-assisted "Scan Content" flow with violation highlighting via OpenAI omni-moderation, plus manual Send Warning / Delete)
- Manages payments, sends payment reminders, views revenue analytics
- Uses **separate web app** (`apps/admin`, Next.js + Tailwind — same stack as web for v1 to avoid rewrite). **Web only — no admin mobile app.**

---

## Core value loop

```
Seeker registers → completes profile → browses recommended/nearby jobs → applies (with optional 2-min audio msg)
                                                                              ↓
Employer posts job → reviews applicants → shortlists / messages → schedules interview → hires (status: ACCEPTED)
```

**Revenue is subscription-only.** Platform-handled payments / escrow / commission on completion are **out of scope entirely** (not v1, not v2 either) — Q12 revised 2026-05-09. Workers and employers settle wages directly off-platform.

---

## The 12 business flows (short form)

Source: locked v1 scope in [`02-scope-locked.md`](02-scope-locked.md). The pre-Aadhaar-lock prose + mermaid docs that originally described these flows are archived at [`docs/archive/superseded/`](../archive/superseded/).

1. **Job Seeker Registration & Onboarding** — v1, **phone OTP only** (no Aadhaar), multi-step, 10-language support
2. **Job Discovery & Application** — v1, filtered feed + Recommended + Near By + Apply (with up to 2-min audio)
3. **Job Provider Registration** — v1, Individual instant / Corporate admin-approval; phone-first + Email/Google OAuth login
4. **Job Posting Process** — v1, rich form with live preview
5. **Candidate Management** — v1, list + detail + Bookmark/Reject/Accept + Schedule Interview
6. **Admin User Management** — v1, employee + employer queues with verification + payment status
7. **Content Moderation** — v1, OpenAI `omni-moderation-latest` "Scan Content" button + India scam regex layer + admin Send Warning / Delete + Job Reports from seekers
8. **Document Verification** — v1 (manual by admin); automated OCR/photo-match → v2
9. **Skill Verification** — **v2** (skills are self-declared in v1)
10. **Communication & Messaging** — v1, polling-based text + audio messages between seeker and employer (60s chat / 2 min apply)
11. **Payment & Transaction** — v1 means **subscription payment** only (Razorpay). Platform never handles wages between worker and employer.
12. **System Integration Points** — v1 needs SMS gateway (MSG91), FCM push, **WhatsApp Business via MSG91**, email sender, Razorpay; **out forever:** Aadhaar UIDAI, escrow.

---

## Key UX decisions (non-obvious things future sessions will trip on)

1. **Phone OTP is the only registration identity.** No Aadhaar field anywhere. Login supports phone+OTP, email+password, or Google OAuth — same options for both seekers and employers.

2. **Voice icons are present everywhere but not yet wired.** Every input field, label, button has a 🔊. **The audio playback is v2 backlog** — leave the icons in the UI but make them no-ops or "Coming soon" tooltips for v1.

3. **10 languages are in v1.** UI strings translated at app load; user picks language at registration (and can change later via header). Translation work is a parallel content workstream — Nazir is coordinating. EN + HI 100% by code freeze; other 8 may soft-launch.

4. **Audio messages are v1 in two places:**
   - **Apply modal:** seeker can attach a **2-minute** audio message to a job application (revised 2026-05-09 from earlier 5 min web / 15-20s mobile — now standard across both)
   - **Chat:** AUDIO message type in conversations between seeker and employer (60s cap)

5. **Job feed has two surfaces:**
   - **Recommended Jobs** — algorithm-based (sector match + job title match + experience match + location proximity weighted, with research-tuned weights per Q9)
   - **Near By Jobs** — pure GPS proximity sort

6. **"Contact the Recruiter" button on job details is double-gated:**
   - Employer must have toggled `showEmailToSeekers` and/or `showPhoneToSeekers` on the job
   - Seeker must be on the **paid tier** (specific tier name + price are PO-pending — see Pricing Memo)
   - If either is false, button is hidden

7. **Content moderation has an AI scan step.** Admin clicks "Scan Content" → OpenAI `omni-moderation-latest` (free, multilingual; 4–6× improvement on Marathi/Bengali/Telugu) returns violations + India scam regex layer (registration fees, MLM language, free-mail HR contacts, upfront-payment demands) → UI highlights flagged text → admin chooses Send Warning (creates `JobWarning`) or Delete.

8. **Notifications cover 11 event types** (per BE `NotificationType` enum) — application status changes, document verification outcomes, profile approval/rejection, admin warnings, payment reminders, interview scheduled, etc. v1 channels: in-app + push (FCM) + **WhatsApp Business** (MSG91 BSP) for application status / interview reminders / recruiter messages / payment confirmation; SMS for OTP + payment confirmation as fallback; email for password reset + employer approval outcome.

9. **Mobile is full seeker + employer parity.** Web has admin too. No admin mobile app. Bottom nav: 4 tabs for seeker (Home / Job Feed / My List / Profile), 5 tabs for employer (Home / Job Post / Candidates / Messages / Profile). Mobile employer can post jobs, manage candidates, schedule interviews, message — full parity with employer web.

---

## Apps and their codebases

| App | Repo / path | Stack | Status today |
|---|---|---|---|
| **Web (seeker + employer + admin currently mixed)** | `Job_Portal/apps/web/` | Next.js 14 App Router, TypeScript, Tailwind, lucide | ~30 pages built, mock data, no real auth wired |
| **Admin (planned separate)** | `Job_Portal/apps/admin/` (TBD) | Next.js + Tailwind (NOT Ant Design — see D4) | Not started — will lift admin pages from `apps/web` |
| **Mobile** | `Job_Portal/apps/mobile/` (TBD) | React Native + Expo, RTK Query, NativeBase, MMKV | Not started — 0%; **Dheeraj** owns; full seeker + employer parity per D3 revised 2026-05-09 |
| **Backend** | `/Users/nazirhasan/Documents/GitHub/job-portal-backend-azka/` (separate repo) | Express 5 ESM + Prisma 6 + PostgreSQL + Zod 4 + JWT/PBKDF2 + Winston + Multer | ~70% built — see `02-scope-locked.md` for inventory; **Asrar** owns |

---

## Branding & visual

- Primary blue: `#5cc2ed` (called `primary-50` in code)
- Secondary teal: `#164e65` (heading text)
- Logo: `apps/web/public/assets/logo.png` (Azkashine wordmark)
- Hero illustration on registration screens: "Your Next Opportunity Is Just a Click Away"
- Footer split: For Candidates / For Employers / Company / Support
- Marketing pages: separate landing pages for seekers (homepage at `/`) and employers (at `/employer`)

---

## What's NOT a priority (v2 backlog)

**Deferred to v2:**
- Voice/TTS playback engine (icons stay, audio deferred)
- Real AI content moderation engine on every post (manual scan-button stub OK; OpenAI moderation IS wired)
- Skill verification tests / practical assessments
- Job-completion ratings + reviews
- Multi-region deployment
- Regional language audio recordings
- Offline mode for mobile
- Auto-renewing subscriptions (RBI e-mandate; v1 = manual renewal)

**Permanently out of scope (not even in v2 of this product):**
- **Aadhaar verification of any kind** (mock or real) — Q3, Q4, Q11 revoked 2026-05-09
- **Platform-handled payments / escrow** between worker and employer — Q12 revised 2026-05-09; revenue is subscription-only forever

**Removed from doc entirely (do not mention as "deferred"):**
- WebSocket / real-time chat transport (polling is final)
- Voice message transcription
- `.ics` calendar invites for interviews
