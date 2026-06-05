# Product Requirements Document — Azkashine Job Portal v1

**Owner:** Nazir Hasan (Acting PM)
**Date:** 2026-05-11
**Status:** Draft v1 — for FE / BE / Mobile / QA consumption
**Target QA handover:** 2026-06-22
**Source of truth for scope:** [`docs/_context/02-scope-locked.md`](../_context/02-scope-locked.md)
**Pricing basis:** PROVISIONAL Option B per [`03-pricing-decision-provisional.md`](03-pricing-decision-provisional.md), pending Shaik Ishaq confirmation by 2026-05-18

---

## How to read this document

This PRD is the build contract. Each of the 15 modules below carries: a one-line goal, 2–5 user stories, a testable acceptance-criteria checklist, the list of BE endpoints and FE screens (with build-state markers), the mobile scope, an explicit out-of-scope list, and the open questions that genuinely block the module. Do **not** treat this document as overriding `02-scope-locked.md` — when in doubt the locked-scope file wins, and changes route through that file first.

**Status markers used throughout:**

- ✅ **Built** — implemented and verified by the 2026-05-05 audit. Cite `file:line` when calling for a behaviour.
- 🔧 **Needs rework** — exists but must change to meet v1 requirements. Citation explains what changes.
- ❌ **Net-new** — must be built in Sprint 1 or Sprint 2.
- ❌❌ **TO BE DELETED** — exists in the BE today and must be removed (Aadhaar paths, escrow stubs, payment-intent fields). Deletion is part of Sprint 1 Day 1 cleanup.

**Personas referenced:**

- **Seeker** = job seeker / worker (Sanjay RK persona).
- **Employer Individual** = household / solo hirer; auto-approved post email-verify.
- **Employer Corporate** = registered business; queues to admin verification.
- **Admin** = internal Azkashine team; web-only.

**Locked decisions referenced:** D1–D7 and Q1–Q13 from `02-scope-locked.md`. NC-# / T# / T2a # / T3 # tags are BE inline decision tags; meaning table is in `03-codebase-audit.md` §1.6.

---

## Glossary — what every tag in this doc means

The PRD references decisions, risks, and code-audit findings by short tags. If you hit a tag while reading and don't recognise it, look it up here.

### Status markers (used inline next to endpoints / screens)

| Marker | Meaning | What you do |
|---|---|---|
| ✅ **Built** | Implemented and verified by the 2026-05-05 audit | Treat as working; the AC just formalises behaviour. Cite `file:line` if calling out specifics. |
| 🔧 **Needs rework** | Exists but must change to meet v1 requirements | The line tells you what changes. |
| ❌ **Net-new** | Must be built in Sprint 1 or Sprint 2 | Pick it up in the sprint backlog. |
| ❌❌ **TO BE DELETED** | Exists in the BE today and must be removed | Aadhaar paths, escrow stubs, payment-intent fields. Deletion is part of Sprint 1 Day 1 cleanup. Mostly already done as of 2026-05-12. |

### Architecture decisions (D-tags, locked in `02-scope-locked.md`)

| Tag | One-line meaning |
|---|---|
| **D1** | v1 scope — what's in (phone OTP auth, audio messages, content moderation, subscription, mobile parity, WhatsApp) and what's out (Aadhaar, escrow, TTS, real-time chat, transcription) |
| **D2** | Backend stack: Express 5 + TypeScript ESM + Prisma 6 + PostgreSQL + Zod 4 + JWT/PBKDF2 on port 5000 |
| **D3** | Web AND mobile parity for BOTH seeker AND employer (Mobile dev (TBD — Dheeraj off project 2026-05-15; new hire pending) owns mobile); admin is web-only |
| **D4** | Admin app lives in a separate `apps/admin/` workspace; Next.js + Tailwind (not Ant Design) |
| **D5** | Stale docs cleaned up 2026-05-08 (Archive.zip deleted, superseded docs moved to `docs/archive/`) |
| **D6** | FE conforms to BE for paths/port (8080→5000, `/job-seeker/* → /api/jobseekers/*`); BE reworks auth to phone-first for both roles; details locked 2026-05-13 (Google OAuth via `google-auth-library`, employer doc-upload split into two steps) |
| **D7** | Two separate Git repos — FE monorepo and BE; each has its own `.claude/` config |

### Product decisions (Q-tags, locked in `02-scope-locked.md`)

| Tag | One-line meaning |
|---|---|
| **Q1** | Subscriptions in v1 — PROVISIONAL Option B (worker free forever, employer ₹999/month with 14-day trial, manual renewal); awaiting Shaik's confirmation by 2026-05-18 |
| **Q2** | TTS / voice playback deferred to v2 — icons stay visible but click is a no-op tooltip |
| **Q3** | Auth identity = phone OTP only at registration (no Aadhaar). Login also supports email+password and Google OAuth |
| **Q4** | ~~Aadhaar verification~~ **REVOKED** 2026-05-09 — removed entirely from v1 and v2, not coming back |
| **Q5** | Free-tier rules — worker free with unlimited applications; employer free trial 14 days then ₹999/month |
| **Q6** | 10 languages in v1 (EN, HI, TA, KN, ML, MR, GU, OR, TE, BN); EN+HI 100% by code freeze, other 8 may soft-launch |
| **Q7** | WhatsApp Business **in v1** via MSG91 BSP — added 2026-05-09 with conditions (Shaik runs Meta verification in parallel) |
| **Q8** | Content moderation engine = OpenAI `omni-moderation-latest` (free, multilingual) + India scam regex layer + manual admin review |
| **Q9** | Recommendation algorithm — location weight 10→20, exponential decay beyond 10km, recency boost, cold-start fallback for empty profiles |
| **Q10** | Audio caps — 60s for chat messages, 2 min for application audio (revised down from 5 min); store original MIME, no transcoding |
| **Q11** | ~~Aadhaar alternatives~~ **REVOKED** — moot since Aadhaar is gone (Q4) |
| **Q12** | ~~Escrow / platform-handled payments~~ **REVOKED forever** — revenue is subscription-only, platform never touches worker-employer wages |
| **Q13** | Interview scheduling — modal slot picker with Date / Time / Mode / Notes (Mode dropdown deferred for further discussion) + WhatsApp+SMS confirmations + 24h/2h reminders + day-after outcome capture |

### Risks (R-tags, full list in `02-scope-locked.md` §Top risks)

| Tag | One-line meaning |
|---|---|
| **R1** | FE/BE divergence (paths, ports, auth flow) — top integration risk |
| **R2** | Mobile dev hire — ⚠️ **re-opened 2026-05-15** (Dheeraj off project; role vacant, new hire pending) |
| **R3** | Razorpay merchant KYC lead time |
| **R4** | ~~Aadhaar mock acceptable to QA?~~ **REVOKED** |
| **R5** | 10-language translation reviewer availability |
| **R6** | Scope creep from old designs (voice everywhere, AI auto-moderation, etc.) |
| **R7** | ~~Websockets underestimated~~ **REVOKED** — polling is final |
| **R8** | AI content moderation expectations vs reality (manual scan button only in v1) |
| **R9** | No staging environment yet |
| **R10** | Bus factor of 1 per app — single dev per FE / BE / Mobile |
| **R11** | DLT registration timeline for MSG91 SMS (2–3 weeks) — critical-path |
| **R12** | Notification channels are net-new BE work (~5–6 dev-days) |
| **R13** | Audio messaging gap — BE rejects AUDIO types in chat today |
| **R14** | WhatsApp Meta Business verification timeline (1–2 weeks before any template approval) |
| **R15** | Mobile scope expansion — full seeker+employer parity doubles the original mobile estimate |
| **R16** | Pricing model not yet locked — Shaik deadline 2026-05-18 |

### Codebase audit references

`audit §X.Y` references the relevant section of [`docs/_context/03-codebase-audit.md`](../_context/03-codebase-audit.md). `audit §1.8` is the BE security gaps list; `audit §2.X` is the FE per-page audit. When you hit a citation, the audit doc has the actual file:line context.

### BE inline decision tags (NC, T, T2, T2a, T3)

These are tags Asrar uses inside BE source code (`// NC-9 (2026-04-27) — soft delete pattern`). They map to dated decisions in his local decision log (now being migrated to [`docs/technical/decisions-log.md`](../technical/decisions-log.md) per 2026-05-13). The full meaning table is in [`03-codebase-audit.md`](../_context/03-codebase-audit.md) §1.6. Highlights:

- **NC-2** — profile photo update via separate endpoint (with old-file unlink)
- **NC-5 / Q51** — per-job `showEmailToSeekers` / `showPhoneToSeekers` toggles
- **NC-9** — soft-delete pattern using `User.isDeleted` + `deletedAt`
- **T1 #8** — forbidden-keys guard on profile PUT (rejects email/phone/password)
- **T2 #11** — notification producer hooks on apply/accept/reject/etc.
- **T2 #13** — recommendation scoring algorithm (rewrites in Q9 revised)
- **T2 #14** — auto-FILLED status when acceptedCount >= numberOfPositions
- **T2 #15 / T2 #16** — seeker / employer document CRUD
- **T2 #20** — GST/CIN change auto-resets employer verifyStatus to PENDING
- **T2a #34b** — strict ACTIVE↔INACTIVE state transitions on activate/deactivate
- **T2a #38** — global tab-badge counts on admin queues
- **T3 #15** — date-stamped audit log convention
- **T3 #39** — SYSTEM messages auto-posted on apply / accept / reject

### Personas (also defined above)

- **Seeker** = job seeker / worker (Sanjay RK persona, low-literacy mobile-first)
- **Employer Individual** = household / solo hirer; auto-approved on email-verify
- **Employer Corporate** = registered business; queues to admin verification with GST + CIN + ISO docs
- **Admin** = internal Azkashine team; web-only, manages verifications + moderation + payments

---

## M1. Authentication & Identity

**In plain English:** This is how every user gets into the app. A worker enters their phone number, gets a one-time code, sets up a profile, and they're in — no Aadhaar, no government ID, no email-first form. An employer goes through a similar phone-first flow, then either gets approved instantly (if they're an individual / household) or queues for admin review (if they're a registered company that needs to prove who they are). After registration, anyone can log in three different ways — phone OTP, email + password, or Google — so they're not stuck with one method. Admins log in with email and password only.

**Walkthrough — Sanjay registering for the first time:** Sanjay opens the app on his Android phone. He picks "हिन्दी" from a language dropdown. He types his phone number, taps Next, and gets a 6-digit code via WhatsApp (with SMS as backup if WhatsApp doesn't deliver in 30 seconds). He enters the code, fills in his name, email, and date of birth on the next screen, picks the job categories he's interested in (construction, delivery), adds his prior work experience, and sets a password. The app sends a verification email to confirm he gave a real address, and he's done — total time ~3 minutes if he's prepared. Next time he opens the app, he can choose to log in via phone+OTP, email+password, or Google — whichever's easiest at the time.

**Goal:** Allow seekers, employers (Individual + Corporate), and admins to create accounts and authenticate using phone-OTP (seeker + employer) or email/password (admin), with Email and Google OAuth as alternative post-registration login methods (per Q3 revised 2026-05-09 — no Aadhaar of any kind, ever).

**User stories:**
- As a seeker, I want to register using my phone number and an OTP, so that I can sign up without sharing any government ID.
- As a seeker, after registration I want to log in with email + password or Google, so I'm not forced to use phone OTP every time.
- As an Individual employer, I want to register with phone + OTP + password + email verification and start posting same-day, so that I can hire without admin gating.
- As a Corporate employer, I want my registration to enter the admin approval queue with GST / CIN / ISO docs, so that seekers can trust verified businesses.
- As an admin, I want to log in with email + password (no phone OTP needed), so I can access the admin web app from any browser.

**Acceptance criteria:**
- [ ] Seeker registration flow Language → Phone Number → Phone OTP → Profile (incl. email) → Categories → Experience → Password completes in <3 minutes for an experienced user without leaving the flow.
- [ ] Employer registration flow Phone Number → Phone OTP → Password → Email Verify → Company Details (GST + CIN + ISO docs for Corporate) completes; Individual auto-approves on email-verify; Corporate queues to admin in PENDING.
- [ ] Phone OTP is exactly 6 digits, 10-minute expiry, max 5 attempts, with 30s resend cooldown; delivered via WhatsApp primary + SMS fallback (mock-mode returns OTP in response body only when `NODE_ENV !== 'production'`).
- [ ] Email verification OTP is exactly 6 digits, 10-minute expiry, max 5 attempts, with 30s resend cooldown.
- [ ] Login methods wired and tested end-to-end for both seeker and employer: (a) phone + OTP, (b) email + password, (c) Google OAuth.
- [ ] Admin login is email + password only; no phone OTP path is exposed for the admin role.
- [ ] JWT issued on successful login uses HS256, 7-day expiry; rejected for users with `accountStatus = SUSPENDED|REJECTED` or `isDeleted = true`; `lastLogin` and `lastSeenAt` updated on success.
- [ ] Forgot-password flow generates an email OTP scoped to purpose `FORGOT_PASSWORD`, valid 10 minutes, single-use; resets password on success.
- [ ] Change-email / change-phone / change-password endpoints require current-session JWT and a fresh OTP to the new contact channel before mutation.
- [ ] All `aadhaarNumber` references on `User` schema are dropped; `AadhaarVerification` model is removed from Prisma; Verhoeff validator file is deleted; `/api/aadhaar/*` route file and controller deleted; no Aadhaar artefact remains in the FE or BE.
- [ ] `JWT_SECRET` env is asserted at boot; the literal `'your-secret-key'` default in `utils/jwt.ts` is removed and BE refuses to start without it.
- [ ] `forgot-password` returns a generic 200 (no email enumeration) — aligns with `resend-verification`.
- [ ] `POST /api/admin/create` is gated behind a setup token or env-var-allowlisted email before staging deploy.
- [ ] Password policy enforced: ≥8 characters, at least one uppercase, one lowercase, one digit.
- [ ] Google OAuth login persists a linked Google subject (`googleSub`) on the User row and rejects subsequent password-login attempts unless a password is set.

**BE endpoints involved:**
- 🔧 `POST /api/jobseekers/register` (`controllers/jobseeker.controller.ts:286`) — rework from email-first-with-Aadhaar to phone-first; drop `aadhaarNumber` field; profile + categories + experience + documents accumulate client-side, single multipart POST at end.
- 🔧 `POST /api/employers/register/individual` + `/business` (`controllers/employer.controller.ts:576`) — rework to phone-first; Individual auto-approves; Corporate queues PENDING with GST/CIN/ISO multipart.
- ✅ `POST /api/jobseekers/set-password`, `/verify-email`, `/login`; `POST /api/employers/set-password`, `/verify-email`, `/login` (`auth.service.ts:730`).
- ✅ `POST /api/auth/forgot-password`, `/reset-password`, `/change-password`, `/change-email`, `/change-phone`, `/resend-verification` (`controllers/auth.controller.ts:127`) — `forgot-password` 404 → 200 fix per audit §1.8 #4.
- ✅ `POST /api/otp/send`, `/resend`, `/verify`, `/status` (`controllers/otp.controller.ts:88`) — gate OTP-in-response behind `NODE_ENV !== 'production'`.
- ✅ `POST /api/email-otp/send`, `/resend`, `/verify`, `/status` (`controllers/email-otp.controller.ts:76`) — same gating.
- ❌ NEW: `POST /api/auth/google` — Google OAuth login (passport-google-oauth20 or equivalent; vendor pick is Asrar's call per BE sync §5).
- ❌ NEW: boot-time assertion on `JWT_SECRET` and `GOOGLE_OAUTH_CLIENT_ID` envs.
- ✅ `POST /api/admin/create`, `/login` (`controllers/admin.controller.ts:2157`) — gate `/create` behind setup token per audit §1.8 #5.
- ❌❌ DELETE: `controllers/aadhaar.controller.ts`, `services/aadhaar.service.ts`, `validators/aadhaar.validator.ts`, `routes/aadhaar.routes.ts`, `AadhaarVerification` Prisma model, `User.aadhaarNumber` field, any Verhoeff validator file.

**FE screens involved:**
- 🔧 `apps/web/src/app/register/phone` — rework to phone-first; remove Aadhaar field; OTP length is 6 digits (FE currently uses 4 — audit §2.4).
- 🔧 `apps/web/src/app/register/otp` — 6-digit input; switch base URL to BE port `5000` and path `/api/jobseekers/*`.
- 🔧 `apps/web/src/app/register/profile` — capture email + name + DOB + gender + language; submit profile image and password (audit §2.4 — both currently dropped).
- ❌ NEW: `apps/web/src/app/register/categories` — was referenced in code but route did not exist (audit §2.3).
- ❌ NEW: `apps/web/src/app/register/experience` — was referenced but missing.
- 🔧 `apps/web/src/app/login` — add Google OAuth button + email/password tab + phone OTP tab.
- ✅ `apps/web/src/app/forgot-password` (mock today; wire to BE).
- 🔧 `apps/web/src/app/employer/register/{phone,otp,account,company-details,verify-email}` — rework to phone-first; drop Aadhaar; remove the plaintext-password-in-localStorage smell (audit §2.4); single accumulating-state POST at the end.
- ❌ NEW: Google OAuth button on `/employer/login`.
- ✅ `apps/web/src/app/admin/login` — wire to real `/api/admin/login` (currently hardcoded credentials).
- ❌ NEW: `apps/admin/src/app/login` (lifted from `apps/web/src/app/admin/login` per D4).

**Mobile scope:** In v1 mobile (full parity). All seeker AND employer registration + login screens have RN parity per D3 revised 2026-05-09. Bottom nav: 4 tabs for seeker (Home / Job Feed / My List / Profile); 5 tabs for employer (Home / Job Post / Candidates / Messages / Profile). Admin is web-only — no mobile admin app.

**Out-of-scope (this module):**
- **Aadhaar verification of any kind (mock or real) — permanently removed** per Q3/Q4/Q11 revoked 2026-05-09. Not "deferred" — out forever, not even in v2 of this product.
- **Alternative-ID screens** (PAN / Driving Licence / Voter ID) — moot, since the Puttaswamy requirement is moot once Aadhaar is gone.
- Multi-factor authentication beyond phone OTP.
- Biometric login (fingerprint / face unlock).
- Social logins beyond Google (Facebook, Apple Sign-in).
- Auto-renewing subscriptions / RBI e-mandate — see M10.

**Open questions:**
- **Backward-compat for already-registered users on the BE today** — Asrar to confirm whether any real users exist; if yes, plan is either (a) keep working as-is, or (b) one-time phone-link flow on next login. Blocks: cutover plan. Owner: Asrar (BE sync §5).
- **Google OAuth library choice** (`passport-google-oauth20` vs `next-auth` vs DIY) — Asrar to pick; FE will follow whichever shape he ships. Blocks: BE Google OAuth endpoint shape. Owner: Asrar (BE sync §5).
- **Google OAuth client credentials** (web + mobile + admin separately or shared?) — Nazir owns registration. Blocks: end-to-end Google login wiring. Owner: Nazir (BE sync §9).
- **Corporate employer doc-upload step location** — keep in single register multipart, or split out so an employer can be email-verified and start posting (with limits) before doc review? Blocks: registration flow finalisation. Owner: Asrar (BE sync §5).

---

## M2. Profile management

**In plain English:** After registration, users need to be able to edit their stuff. A worker should be able to change their profile photo, update their work history when they get a new job, add or remove skills they want recruiters to see, and upload supporting documents (ID proof, address proof, certificates). An employer should be able to update company details (logo, GST number, website) and replace business documents as they renew. Some of these edits matter for trust — if an employer changes their GST or CIN number, the system automatically re-flags them for admin review, because the previously-approved paperwork no longer matches their current claim.

**Goal:** Let seekers and employers maintain their profile data (name, contact, photo, experience, skills, documents, company details) post-registration, with admin-visible state changes flagged where verification status matters.

**User stories:**
- As a seeker, I want to edit my profile photo, name, sector, job title, languages, and work experience, so that recruiters see accurate information when they review my application.
- As a seeker, I want to upload, replace, and delete documents (ID proof, address proof, certificates), so that admins can verify my identity manually.
- As a seeker, I want to add and remove skills from a catalog, so that the Recommended Jobs algorithm matches me better.
- As an employer, I want to update my company details (logo, description, website, GST, CIN), so that my profile reflects current reality.
- As an employer, I want to upload, replace, and delete business documents (GST cert, company registration, ISO certs), so that admin verification reflects my latest paperwork.

**Acceptance criteria:**
- [ ] Seeker GET `/profile` returns User + JobSeeker + WorkExperience[] + Document[] + JobSeekerSkill[] joined data in a single call.
- [ ] Seeker PUT `/profile` is atomic across User + JobSeeker + WorkExperience tables; partial failure rolls back; `email` / `phone` / `password` (and any other forbidden field) are rejected with 400 per T1 #8.
- [ ] Seeker profile-photo update via separate multipart endpoint (`profilePic` field); old file is unlinked from disk on success (NC-2).
- [ ] Seeker document upload accepts PDF / JPG / PNG up to 5 MB; allowed `type` values: `IDENTITY_PROOF`, `ADDRESS_PROOF`, `EDUCATION_CERTIFICATE`, `SKILL_CERTIFICATE`, `OTHER`; delete is unrestricted on seeker side (no min-doc invariant).
- [ ] Seeker skills add / list / remove operates against the `JobSeekerSkill` link table; `Skill` catalog is admin-managed (Q53).
- [ ] Employer GET `/profile` returns User + Employer + Document[] joined data in a single call.
- [ ] Employer PUT `/profile`: if `gstNumber` or `cin` changes vs current row, `verificationStatus` resets to PENDING and admin notifications fire (T2 #20).
- [ ] Employer document delete refuses (HTTP 400) when active document count would drop to 0 (min-1 invariant); upload supports PDF / JPG / PNG / DOC / DOCX up to 5 MB, max 10 documents per employer.
- [ ] Employer profile-photo update is its own multipart endpoint (NC-2), with old-file unlink.
- [ ] All authenticated profile endpoints update `User.lastSeenAt` fire-and-forget.

**BE endpoints involved:**
- ✅ `GET /api/jobseekers/profile`, `PUT /api/jobseekers/profile` (`controllers/jobseeker.controller.ts:286`).
- ✅ `PUT /api/jobseekers/me/profile-photo` (NC-2).
- ✅ `POST /api/jobseekers/me/documents`, `GET /api/jobseekers/me/documents`, `DELETE /api/jobseekers/me/documents/:id` (T2 #15).
- ✅ `GET /api/jobseekers/me/skills`, `POST /api/jobseekers/me/skills`, `DELETE /api/jobseekers/me/skills/:skillId` (Q53).
- ✅ `GET /api/employers/profile`, `PUT /api/employers/profile` (`controllers/employer.controller.ts:576`) — keep the T2 #20 GST/CIN-change → verifyStatus reset hook.
- ✅ `PUT /api/employers/me/profile-photo` (NC-2).
- ✅ `POST /api/employers/me/documents`, `GET /api/employers/me/documents`, `DELETE /api/employers/me/documents/:id` (T2 #16, with min-1 invariant).
- 🔧 `GET /api/skills` (`controllers/skill.controller.ts:190`) — currently auth-required, intended as the registration dropdown; either drop auth or move catalog fetch to post-login (audit §1.8 #13). PM call: drop auth, since reg flow needs it.
- 🔧 Validator `jobseekerRegisterSchema` and `updateJobSeekerProfileSchema` (`validators/auth.validator.ts`) — drop `aadhaarNumber` field; forbidden-keys guard (T1 #8) is preserved.

**FE screens involved:**
- ❌ NEW: `apps/web/src/app/profile` (seeker profile view + edit). Currently a broken nav target (audit §2.3); no real page exists.
- ❌ NEW: `apps/web/src/app/profile/documents` (seeker document CRUD UI).
- ❌ NEW: `apps/web/src/app/profile/skills` (seeker skill catalog picker).
- 🔧 `apps/web/src/app/employer/profile` (employer profile view + edit; currently a placeholder).
- ❌ NEW: `apps/web/src/app/employer/profile/documents` (employer document CRUD UI with min-1 enforcement).
- ✅ Profile photo upload component (`useAudioRecorder`-like pattern but for image) — already partial via FileReader preview on register.

**Mobile scope:** In v1 mobile (full parity). Seeker profile management mirrors web flows; employer profile management is part of the 5-tab employer mobile app (Profile tab).

**Out-of-scope (this module):**
- Profile completeness gamification / progress bar.
- Profile-view-counter analytics ("X recruiters viewed your profile").
- Resume builder / CV PDF auto-generation.
- Skill verification tests — Flow #9 is v2 per locked scope D1.
- DigiLocker pull for documents — v2 per research Topic 11.

**Open questions:**
- **Bulk document upload UX** on web profile pages — multi-file dropzone or one-at-a-time? Blocks: design polish only, not core wiring. Owner: Nazir.
- **Profile-edit conflict semantics** if a user has two tabs open — last-write-wins, or optimistic-lock with a 409? Default last-write-wins. Owner: Asrar.

---

## M3. Job posting

**In plain English:** Employers need to write job ads. They fill in a form (title, description, salary range, location with GPS, how urgent, payment type) and see a live preview of how the post will look to workers before they hit publish — no typos shipping to the seeker-facing feed. After publishing, they can pause a post temporarily (deactivate), reactivate it later, or see all their old/expired posts on a separate tab in case they want to re-post. There are also two important per-job toggles: "show my phone number to seekers" and "show my email" — these control whether premium seekers see contact details on the job detail page. When the employer has hired everyone they need (accepted candidates equals positions), the system auto-marks the job as FILLED so it stops accepting applications.

**Goal:** Let an employer create, preview, update, expire, activate, deactivate, and (where in moderation state) re-submit a job posting, with the full set of FE-driven fields (salary range, location, GPS coordinates, urgency, payment type, contact visibility toggles) reaching the BE intact.

**User stories:**
- As an employer, I want to compose a job post with a rich field set (title, description, category, salary range, location, GPS, urgency, payment type) and see a live preview before publishing, so that I don't ship a typo'd post.
- As an employer, I want to toggle "show phone to seekers" and "show email to seekers" per job, so I control whether premium seekers can reveal my contact via the Contact Recruiter button.
- As an employer, I want to deactivate a live post temporarily (without deleting it) and reactivate it later, so I can pause hiring without losing the post history.
- As an employer, I want to see all my expired / closed / cancelled / past-`expiresAt` posts on a separate "Expired" tab, so I can re-post if needed.
- As an employer, I want the system to auto-mark a job as FILLED when accepted candidates equal the number of positions, so I'm not still receiving applications for a fully staffed role.

**Acceptance criteria:**
- [ ] Job create / update flow validates: `salaryMax ≥ salaryMin`, `numberOfPositions ≤ 1000`, GPS coordinates optional but if provided both `latitude` and `longitude` must be present, `expiresAt` must be in the future on create.
- [ ] Job post supports the full FE / mobile field set: title, description, category, subcategory, skillsRequired[], salary range, payment type, urgency level, location (text), latitude, longitude, numberOfPositions, expiresAt, `showEmailToSeekers`, `showPhoneToSeekers` (NC-5 / Q51).
- [ ] Live preview screen renders all fields as the seeker will see them; preview does not POST until the employer clicks "Publish".
- [ ] Activate / deactivate is idempotent and enforces ACTIVE ↔ INACTIVE-only state transitions (T2a #34b) — calling activate on FILLED/CANCELLED/CLOSED returns 400.
- [ ] Auto-FILL on accept: when `acceptedCount === numberOfPositions`, BE marks the job FILLED and rejects further apply attempts with 400 (T2 #14).
- [ ] Expired tab returns jobs whose `status ∈ {FILLED, CLOSED, CANCELLED}` OR `expiresAt < now()`.
- [ ] Update-job after moderation `VIOLATION_FOUND`: editing the job text should reset `moderationStatus` to `PENDING_REVIEW` so admin can re-scan (clarify in M12).
- [ ] Per-job view counter increments on detail GET unless requester is the posting employer.

**BE endpoints involved:**
- ✅ `POST /api/jobs` (`controllers/job.controller.ts:323`).
- ✅ `GET /api/jobs/:id` (auto-increments view counter unless self).
- ✅ `PUT /api/jobs/:id`.
- ✅ `DELETE /api/jobs/:id` (soft delete).
- ✅ `GET /api/jobs/employer/:employerId` (public per-employer browse).
- ✅ `GET /api/jobs/me/expired` (employer's own expired list).
- ✅ `POST /api/jobs/:id/activate` + `POST /api/jobs/:id/deactivate` (T2a #34b).
- 🔧 `PUT /api/jobs/:id` — on text-content change while `moderationStatus === VIOLATION_FOUND`, reset to `PENDING_REVIEW` (small server-side hook addition).
- ✅ Validators: `createJobSchema`, `updateJobSchema` (`validators/job.validator.ts`) — already cover the NC-5/Q51 toggle fields.

**FE screens involved:**
- ❌ NEW: `apps/web/src/app/employer/jobs/new` — job creation form with live preview pane.
- ❌ NEW: `apps/web/src/app/employer/jobs/[id]/edit` — same form pre-filled.
- ❌ NEW: `apps/web/src/app/employer/jobs` — list of own jobs (active + expired tabs).
- ❌ NEW: `apps/web/src/app/employer/jobs/[id]` — job detail with activate / deactivate / delete / re-submit actions.

**Mobile scope:** In v1 mobile (employer view — full parity per `Job_Portal_Mobile.pdf`). The "Job Post" tab in the 5-tab employer mobile nav covers create + preview + submit + edit. Mobile-only nicety: optional `Use current location` button to auto-fill GPS from device location.

**Out-of-scope (this module):**
- Bulk job posting / CSV import.
- Job duplication / "post similar job" shortcut.
- A/B testing of multiple title variants.
- Targeted job promotion / paid boost.
- Auto-translation of job description into seeker-preferred language — i18n covers UI strings only (M14); job body is whatever the employer typed.

**Open questions:**
- **Drafts** — does the employer have a "Save as Draft" mode, or is publish-on-create the only path? Default: publish-on-create (no draft state in v1). Confirm: Nazir.
- **Re-submit after rejection** — when admin rejects a post, can the employer edit and re-submit, or do they have to clone? Default: edit-and-resubmit re-uses the existing row; admin sees diff. Confirm: Nazir + Asrar.

---

## M4. Job discovery

**In plain English:** Workers need two different ways to find jobs. The first is **Recommended Jobs** — the system looks at the worker's profile (preferred sector, job title, skills, work experience, location) and scores every active job against that, surfacing the best matches first. The second is **Near By Jobs** — a simple distance-sorted list using the worker's GPS location, regardless of skill match. The reasoning is that blue-collar workers are commute-sensitive, so "close by" matters as much as "good fit" — sometimes more. Workers can also use a keyword search and filters (category, salary range, urgency, etc.) to narrow down. The voice 🔊 icons next to each job card are decorative for v1 — they'll do something in v2 (text-to-speech read-aloud) but for now they show a "Coming soon" tooltip.

**Walkthrough — Sanjay browsing the feed:** Sanjay opens the Job Feed tab. The first section is "Recommended for you" — 5 cards based on his profile (he's marked construction + delivery, has 3 years masonry experience, lives in Hyderabad). The top card is a masonry job 2km away. He scrolls to the next section, "Near By Jobs", which shows everything within 5km regardless of skill, sorted purely by distance. He uses the search bar to type "labour" and adds a filter for daily wages over ₹500. He taps a job to see details. On the detail page he sees the full description and a "Contact Recruiter" button — but the button is greyed out because the employer hasn't turned on "show phone to seekers" for this particular job.

**Goal:** Surface jobs to seekers via two distinct feeds — Recommended (profile-weighted match) and Near By (pure GPS proximity) — plus a search + filter surface, with voice icons visible but non-functional in v1.

**User stories:**
- As a seeker, I want a Recommended feed that shows jobs matching my sector, job title, experience, skills, and location, so I see the best fits without filtering.
- As a seeker, I want a Near By feed sorted purely by distance from my GPS location, so I can find anything in commute range regardless of fit.
- As a seeker, I want to search by keyword and filter by category, sub-category, job type, payment type, urgency, salary range, skills, and distance, so I can narrow down a long list.
- As a seeker with an empty profile, I want to see popular jobs in my city sorted by recency, so the feed isn't empty before I've taken any actions (cold-start fallback per Q9).

**Acceptance criteria:**
- [ ] `GET /api/jobs/recommended` returns a profile-weighted feed using the Q9 revised weights: sector 20, title-exact 30, title-fuzzy 15, experience-token-match up to 15, skills-overlap up to 20 (Q53), location proximity up to 20 with exponential decay beyond 10 km (`score *= exp(-(distance_km - 10) / 15)`, clipped at 0), plus a recency boost (<24 h +10, <7 days +5, otherwise 0).
- [ ] Recommendation filters: ACTIVE-only, exclude already-applied, exclude soft-deleted-employer jobs (NC-9).
- [ ] Cold-start fallback: when the seeker has neither `preferredSector` nor `preferredJobTitle` set, return jobs in the seeker's city sorted by `createdAt` desc.
- [ ] `GET /api/jobs?lat=&lon=&maxDistance=&sort=distance` returns the Near By feed; Haversine distance computed in BE; default radius 5 km, configurable up to 100 km.
- [ ] Search supports keyword across title + description; filters: category, subcategory, jobType (multi), paymentType, urgencyLevel, status (default ACTIVE), salaryMin / salaryMax, skills (`hasSome`), employerId, sort (recency / distance).
- [ ] P95 search response is <500 ms with 50k jobs in the dev environment (load test gate; performance work pushed to S3 if breached).
- [ ] Voice 🔊 icons on feed cards render as no-op buttons with a "Coming soon" tooltip (TTS deferred per Q2).
- [ ] Job detail page increments view counter unless requester is the posting employer.
- [ ] "Contact the Recruiter" button on job detail is double-gated: (a) employer has toggled `showEmailToSeekers` and/or `showPhoneToSeekers`, AND (b) seeker is on the paid tier (M10 — currently `seeker free + employer paid` per provisional Option B; **no seeker premium gate exists in v1 because workers are free**, so the gate degrades to (a)-only until pricing changes).

**BE endpoints involved:**
- ✅ `GET /api/jobs` (`controllers/job.controller.ts:323`) — keep rich filters + Haversine.
- ✅ `GET /api/jobs/:id`.
- ✅ `GET /api/jobs/:id/related` — multi-criteria scoring.
- 🔧 `GET /api/jobs/recommended` (T2 #13) — update weights per Q9 (`services/job.service.ts:761`); add recency boost and exponential location decay; add cold-start fallback.
- ✅ `GET /api/jobs/:id/recruiter-contact` (NC-5 / Q51) — already returns 404 on soft-deleted employer; verify the seeker-paid-tier gate aligns with M10 once finalised.

**FE screens involved:**
- 🔧 `apps/web/src/app/job-feed` — split the single section into two surfaces: Recommended (calls `/api/jobs/recommended`) and Near By (calls `/api/jobs?sort=distance&lat=&lon=`).
- 🔧 `apps/web/src/app/job-details/[id]` — actually consume the `[id]` route param (currently ignored — audit §2.1); render real data; wire Contact Recruiter button to `/api/jobs/:id/recruiter-contact` with the M10 paid-tier check.
- ❌ NEW: `/jobs` route (referenced from registration success but missing — audit §2.3) — alias `/job-feed` or create the route file.
- 🔧 Search + filter UI on `/job-feed` — currently mock; wire to real query params.

**Mobile scope:** In v1 mobile (seeker view — full parity). Job Feed tab is the seeker mobile primary surface. Mobile gets the same Recommended + Near By split.

**Out-of-scope (this module):**
- Saved searches / search history.
- Job alerts via push when new matching jobs are posted.
- Click / apply feedback loops feeding back into recommendation weights — stretch goal at end of Q9; if S3 has slack, ship it; otherwise v2.
- Collaborative-filtering recommendations.
- Map-based job browse.
- Voice playback engine — TTS icons remain visible but non-functional per Q2 (v2).

**Open questions:**
- **Default `maxDistance` for Near By** — locked-scope says BE default is 5 km, but for blue-collar workers without strong commute infra, 10 km feels closer to reality. Confirm 5 vs 10 km default. Owner: Nazir / Shaik.
- **Recommended feed pagination** — keep `limit*3` over-fetch + in-memory score (audit §1.8 #17) for v1, or push to a precomputed score table now? Default: keep over-fetch for v1; flag for v2 perf work. Owner: Asrar.

---

## M5. Job application

**In plain English:** This is the actual "apply" action. A worker taps Apply on a job and gets a modal where they can record a 2-minute audio pitch in their own language (because typing is hard for many of our users) and/or type a short text note (up to 1000 characters). The audio gets uploaded and stored on disk; we don't transcribe it. The system stops them from applying twice to the same job. Once they apply, the employer instantly sees a notification and a SYSTEM message appears in chat ("Sanjay applied to your job") so the conversation thread is ready when the employer wants to follow up. Workers can withdraw an application if they change their mind, and they can see all their applications with their statuses (Pending / Reviewed / Shortlisted / Accepted / Rejected / Withdrawn) on a "My Applications" screen.

**Walkthrough — Sanjay applying with an audio message:** Sanjay finds a job he likes (mason needed near Hitech City). He taps Apply. A modal opens with a big microphone button. He taps it and says in Hindi: "Sir, my name is Sanjay, I have 3 years of brickwork experience, I can start tomorrow." A countdown shows he's used 22 seconds of his 2-minute budget. He taps Stop, listens back, taps Send. The app uploads the audio file (~150 KB), shows a success animation, and now there's a new entry on his "My Applications" tab with status "Pending". The employer simultaneously gets a WhatsApp notification + an in-app notification, and a fresh chat thread appears in the employer's Messages tab with the SYSTEM message "Sanjay applied to your job" so they can listen to the audio and reply.

**Goal:** Let seekers apply to a job with an optional 2-minute audio message and an optional text message, withdraw an application, see all their applications and details, and operate within free / paid metering boundaries (M10).

**User stories:**
- As a seeker, I want to apply to a job with a short text note and an optional 2-minute audio message, so I can pitch myself in my own voice when reading is hard.
- As a seeker, I want to withdraw an application I no longer care about, so the employer doesn't waste time reviewing me.
- As a seeker, I want to see all my applications with status (PENDING / REVIEWED / SHORTLISTED / REJECTED / ACCEPTED / WITHDRAWN / BOOKMARKED), so I know where I stand.
- As a seeker, I want the system to prevent duplicate applications to the same job, so I don't accidentally re-apply.

**Acceptance criteria:**
- [ ] `POST /api/applications` accepts `{ jobId, message?, audio? }` — `message` up to 1000 chars (existing cap), `audio` multipart file capped at 2 minutes (per Q10 revised); MIME types accepted: `audio/webm`, `audio/mp4`, `audio/m4a`, `audio/ogg`, `audio/opus`.
- [ ] BE detects audio container at upload time, stores file on local disk via the presigned-URL abstraction (Q10), persists MIME and duration on the application row.
- [ ] Duplicate apply (same seeker + same job, status not WITHDRAWN) is rejected with 400 and a clear `ALREADY_APPLIED` sentinel error code.
- [ ] Apply to a FILLED, INACTIVE, expired, or soft-deleted-employer job is rejected with 400.
- [ ] Apply triggers: (a) producer hook posts SYSTEM message "Applied the job" to a freshly-created or existing seeker↔employer conversation (T3 #39); (b) in-app + WhatsApp notification fires to employer (T2 #11).
- [ ] Withdraw returns the application to a terminal WITHDRAWN state and does not retroactively delete the SYSTEM message in chat.
- [ ] My-applications list paginates 1–100; supports filter by status; orders by `appliedAt` desc.
- [ ] Application detail returns full job + employer summary, the seeker's audio playback URL (if any), and the full status history.
- [ ] Free vs paid metering: per provisional Option B, the seeker is on the free tier with unlimited applications. **No daily app cap.** Recruiter-contact gate (M4) remains the paid-tier surface, but since there is no seeker paid tier in v1, the gate degrades to per-job-`showPhoneToSeekers` only.

**BE endpoints involved:**
- 🔧 `POST /api/applications` (`controllers/application.controller.ts:391`) — add multer audio upload (cap 2 min), add `audioUrl` + `audioDuration` columns to `JobApplication` (or reuse Document model with `purpose = APPLICATION_AUDIO`), update validator.
- ✅ `POST /api/applications/:id/withdraw`.
- ✅ `GET /api/applications/me` (seeker's own list).
- ✅ `GET /api/applications/me/count` (used for any client-side metering UI).
- ✅ `GET /api/applications/:id`.
- ✅ `GET /api/applications/me/check?jobId=` (duplicate-check helper).
- 🔧 `updateApplicationStatusSchema` (`validators/application.validator.ts`) — add `BOOKMARKED` to the enum (audit §1.8 #7).
- ✅ Producer hook on apply → conversation + SYSTEM message + notification.

**FE screens involved:**
- 🔧 `ApplyModal` (`apps/web/src/components/ApplyModal.tsx`) — currently records audio and `console.log`s the result (audit §2.1). Wire submit to `POST /api/applications` with multipart audio + text; show progress bar; confirm/reject UI; 2-minute hard stop on the recorder.
- 🔧 `apps/web/src/app/my-applications` — wire to real `/api/applications/me`.
- 🔧 `apps/web/src/app/my-applications/[id]` — wire to real detail endpoint; include audio playback.
- ✅ `useAudioRecorder` hook — already produces a webm Blob; cap at 2 min (currently 5 min per old spec); show countdown UI.
- ❌ NEW: audio playback widget (WhatsApp-style waveform + speed control) on `my-applications/[id]` and on the employer's candidate-detail page (M6).

**Mobile scope:** In v1 mobile (seeker view — full parity). Apply flow on mobile uses RN's recorder library; output is `.m4a` (iOS) or `.m4a` / `.opus` (Android); 2-minute cap per Q10 revised; same upload endpoint and contract.

**Out-of-scope (this module):**
- Voice transcription of the application audio — scrubbed per locked scope D1.
- AI-assisted application drafting / cover-letter generator.
- Application withdrawal undo / "I changed my mind" within 5 minutes.
- Apply via WhatsApp without opening the app.
- Audio chat messages on the application — that lives in M8.
- Daily application cap / soft warning at 80% — moot in v1 because workers are free with unlimited applications under provisional Option B.

**Open questions:**
- **Audio file naming on disk** — `{applicationId}.{ext}` vs `{userId}/{applicationId}.{ext}`? Default: `{applicationId}.{ext}` in `uploads/applications/`. Confirm: Asrar.
- **Maximum audio file size in bytes** (separate from duration cap) — Opus at 24 kbps × 2 min = ~360 KB, plus codec overhead; recommend 1 MB hard cap to refuse pathological inputs. Confirm: Asrar.

---

## M6. Candidate management

**In plain English:** The flip side of M5 — employers need a workspace to review the people who applied to their jobs. They see tabs (All / Accepted / Shortlisted / Rejected / Bookmarked) so they can triage. Opening a candidate shows their profile, the audio message they sent, their work experience, their uploaded documents, and three primary actions: **Accept** (which triggers the interview-scheduling modal from M7), **Reject** (which sends them a polite SYSTEM message and a WhatsApp notification), or **Bookmark** (a silent "save for later" — no notification, no SYSTEM message, just for the employer's own tracking). There's also a stats roll-up so the employer can see their hiring pipeline at a glance: how many applications total, how many accepted, how many still pending review.

**Goal:** Give employers the tools to review, filter, bookmark, shortlist, accept, and reject applications across their posted jobs, plus per-job and roll-up stats.

**User stories:**
- As an employer, I want to see a tabbed list of candidates (All / Accepted / Shortlisted / Rejected / Bookmarked) for a given job, so I can triage in batches.
- As an employer, I want to open a candidate's detail (profile, audio message, work experience, documents) and accept, reject, or bookmark them, so I can act on a single decision per candidate.
- As an employer, I want roll-up stats (total applications, accepted, rejected, shortlisted, pending) across all my jobs, so I can size my hiring pipeline at a glance.
- As an employer, I want to filter candidates by status, by job, by date range, so I can find someone I half-remember without scrolling.

**Acceptance criteria:**
- [ ] `GET /api/applications/employer/job/:jobId` returns paginated applications for the employer's own job, with `status` filter; tabs map to specific status values.
- [ ] Bookmark / accept / reject are idempotent and post the right SYSTEM message + notification per status:
  - Accept → "Congratulations…" + interview details from M7 + WhatsApp / in-app notification.
  - Reject → "We regret…" + WhatsApp / in-app notification.
  - Bookmark → no SYSTEM message, no notification (silent organisational tool).
- [ ] Accept enforces the M7 interview pre-condition: the modal slot picker must run before status flips to ACCEPTED (BE accepts a single payload with `{notes?, interview: {...}}`).
- [ ] Reject accepts optional `{reason, notes}`; reason is private to admin if escalated; the seeker only sees the SYSTEM message text, not the reason.
- [ ] Audit §1.8 #6: the commented-out "cannot reject accepted" guard in `application.service.ts:1070-1073` must be either re-enabled or deleted — pick one and document it.
- [ ] `BOOKMARKED` is added to `updateApplicationStatusSchema` enum (audit §1.8 #7) so the generic status PUT can also set it.
- [ ] Employer stats endpoint returns: `totalApplications`, `pending`, `reviewed`, `shortlisted`, `accepted`, `rejected`, `withdrawn`, `bookmarked` — global across employer's jobs.
- [ ] Candidate detail includes audio playback URL, document list, work experience, skills, and `lastSeenAt` for the seeker.

**BE endpoints involved:**
- ✅ `GET /api/applications/employer/jobs` (employer's jobs list with application counts).
- ✅ `GET /api/applications/employer/job/:jobId` (paginated candidates per job).
- ✅ `GET /api/applications/employer/all` (cross-job aggregate).
- ✅ `GET /api/applications/employer/stats`.
- ✅ `GET /api/applications/employer/:applicationId` (candidate detail).
- ✅ `POST /api/applications/:id/accept`.
- ✅ `POST /api/applications/:id/reject`.
- ✅ `POST /api/applications/:id/bookmark` (toggle).
- 🔧 `PUT /api/applications/:id/status` — extend validator enum to include BOOKMARKED (audit §1.8 #7).
- 🔧 `services/application.service.ts:1070-1073` — re-enable or delete the commented "cannot reject accepted" guard (BE sync §4b).

**FE screens involved:**
- 🔧 `apps/web/src/app/employer/workers` (currently a placeholder "Coming soon" — audit §2.1) — rebuild as the candidate management primary surface with tabs (All / Accepted / Shortlisted / Rejected / Bookmarked).
- ❌ NEW: `apps/web/src/app/employer/jobs/[id]/candidates` — per-job candidate list.
- ❌ NEW: `apps/web/src/app/employer/candidates/[applicationId]` — candidate detail with Accept / Reject / Bookmark + Schedule Interview button (M7).
- ❌ NEW: employer dashboard tiles for the stats endpoint.

**Mobile scope:** In v1 mobile (employer view — full parity). The "Candidates" tab in the 5-tab employer mobile nav covers the same surface, with tabs and per-candidate detail per the 55-page mobile design PDF.

**Out-of-scope (this module):**
- Bulk accept / reject across multiple candidates in one click.
- CSV export of candidates (Apna ships this; v2 for us).
- Candidate side-by-side compare view.
- Interviewer assignment / multi-interviewer workflows.
- Automated candidate scoring beyond the apply-time `applicationScore` field.
- Reject reasons published to the seeker beyond the SYSTEM message.

**Open questions:**
- **Reject reason taxonomy** — free text only, or a fixed list (Not qualified / Wrong location / Already filled / Other)? Default: free text + optional structured field (skipped in UI v1 if time-pressed). Owner: Nazir / Najeeb / Farhana.
- **Reject undo** — does the employer get a 5-minute undo window after rejecting? Default: no undo in v1, hard reject. Owner: Nazir.

---

## M7. Interview scheduling

**In plain English:** When an employer clicks Accept on a candidate, a small modal pops up asking when the interview is — date, time, optional notes — and optionally what kind of interview (In-person at this address / Phone call to this number / Video call at this link). After they hit save, the system fires off a WhatsApp confirmation to the worker (with SMS as backup) and posts the interview details into the chat thread. The system also automatically sends reminders 24 hours before and 2 hours before the scheduled time, on both WhatsApp and SMS. Either party can reschedule once if there's a conflict — after that, they have to negotiate in chat. The day after the interview, the employer sees three quick buttons on their dashboard: **Hired** (status stays Accepted), **Did not show up** (status moves to Rejected with note "no-show"), or **Need re-interview** (status goes back to Shortlisted). This keeps outcomes tracked without forcing the employer to write essays.

**Goal:** Let an employer schedule an interview when accepting a candidate via a modal slot picker (Date / Time / Mode / Notes), send WhatsApp + SMS confirmations and reminders, and capture the day-after outcome.

**User stories:**
- As an employer, when I accept a candidate, I want a modal to pick interview date and time (and optionally notes), so I don't have to compose a separate message.
- As an employer, I want to choose interview mode (In-person with address / Phone with number / Video with paste link), so the seeker knows what to expect — **note: locked-scope flags this as a deferred decision; see Open questions**.
- As a seeker, I want a WhatsApp + SMS confirmation when my interview is scheduled and reminders 24 hours and 2 hours before, so I don't forget.
- As either party, I want to reschedule the interview once, so honest scheduling conflicts don't blow up the application.
- As an employer, the day after the interview I want three quick buttons (Hired / Did not show up / Need re-interview), so outcomes are logged without a free-text essay.

**Acceptance criteria:**
- [ ] Accept-with-interview flow: employer clicks Accept on a candidate, a modal opens with Date / Time / Mode / Notes (Mode field gated on the open question — see below); submit issues a single BE call that flips the application to ACCEPTED, creates the Interview row, and triggers all notifications.
- [ ] Date / Time must be in the future; "Notes" is optional, max 1000 chars.
- [ ] Mode dropdown options: `IN_PERSON` (requires address), `PHONE` (requires phone number string), `VIDEO` (requires URL string) — **only ship if the open question resolves to "ship the dropdown".**
- [ ] System auto-creates: (a) SYSTEM chat message with interview details; (b) in-app `INTERVIEW_SCHEDULED` notification; (c) WhatsApp confirmation template "interview_scheduled" + SMS fallback per Q7 revised.
- [ ] Reminder cron sends WhatsApp + SMS at 24 hours before and 2 hours before each scheduled interview; reminders are skipped if interview was rescheduled to >2 h away from the original window.
- [ ] Reschedule: either party can reschedule once; subsequent reschedules fall back to chat negotiation (BE returns 400 with sentinel `RESCHEDULE_LIMIT_REACHED`).
- [ ] Outcome capture screen fires the day after each interview: employer sees three buttons (Hired / Did not show up / Need re-interview); selection drives the next application-status update (Hired stays ACCEPTED; Did not show up moves to REJECTED with note "no-show"; Need re-interview reverts to SHORTLISTED with a flag for a follow-up).
- [ ] All interview timestamps stored UTC, rendered in seeker / employer local timezone with IST default.

**BE endpoints involved:**
- ✅ `POST /api/applications/:id/accept` (already creates Interview row on accept).
- ❌ NEW: `PATCH /api/interviews/:id/reschedule` — reschedule once; reject subsequent attempts with `RESCHEDULE_LIMIT_REACHED`.
- ❌ NEW: `POST /api/interviews/:id/outcome` — body `{outcome: 'HIRED'|'NO_SHOW'|'NEED_REINTERVIEW', notes?}`.
- ❌ NEW: Reminder scheduler (cron / bullmq job) to fire WhatsApp + SMS 24 h / 2 h before each `interviewScheduledAt`.
- ❌ NEW: WhatsApp templates `interview_scheduled`, `interview_reminder_24h`, `interview_reminder_2h` wired into the MSG91 BSP integration (see M9 + BE sync §6).
- ✅ Existing in-app `INTERVIEW_SCHEDULED` notification producer.

**FE screens involved:**
- ❌ NEW: Schedule Interview modal — opens from the candidate detail Accept button; Date / Time / Notes always present, Mode dropdown gated on open question.
- ❌ NEW: Interview detail screen (seeker side) — read-only view, with reschedule button (one-shot).
- ❌ NEW: Outcome capture screen (employer side) — three buttons + optional notes, surfaced D+1 via in-app notification.
- 🔧 Chat surface (M8) — render the SYSTEM message that lands on accept with interview details.

**Mobile scope:** In v1 mobile (both seeker AND employer). Mobile design already includes the mode dropdown — if web ships without it, mobile must mirror that decision (open question below).

**Out-of-scope (this module):**
- Multi-slot proposal (employer proposes 3 slots, candidate picks one) — v1 is single-slot only.
- Calendar sync (Google Calendar, Outlook) — explicitly removed from doc.
- Native video calling inside the platform.
- Free-text outcome capture / long-form interview notes — three buttons + optional short note is the cap.
- 30-minute pre-interview reminder (only 24 h and 2 h per Q13).
- Auto-reschedule on time-zone conflict.

**Open questions:**
- **Interview mode picker** (Q13 partially revised 2026-05-09) — confirm web ships the Mode dropdown to match mobile design, OR mobile drops the mode picker to match web design. Blocks: M7 acceptance criteria + mobile / web parity. Owner: Nazir / Mobile dev (TBD) (joint sync needed).
- **Reschedule attempt counter** — does the one-reschedule budget reset if the other party reschedules first (i.e. is the limit per-party or per-interview)? Default: per-interview (1 reschedule total, by either party). Confirm: Nazir.

---

## M8. Chat / messaging

**In plain English:** Once a worker has applied to a job, they can chat with that employer (and only that employer) — text or 60-second audio notes. The chat is one thread per worker-employer pair, not per-job, so if Sanjay applies to three different jobs from the same company they all share one conversation. Messages are delivered via **polling** — the app asks the server every 10 seconds "any new messages since the last one I saw?" — not WebSockets, because real-time chat is explicitly out of scope. Each message tracks who's read it, and the chat header shows when the other person was last seen on the app, so users can tell if their reply is imminent or not. The chat also automatically posts SYSTEM messages at key moments — "Sanjay applied to your job" on apply, "Congratulations, you're hired! Interview on Friday 10am" on accept, "We regret…" on reject. These can't be edited or deleted by either party.

**Walkthrough — Employer messaging Sanjay:** The mason employer opens the candidate-detail screen for Sanjay, listens to the 22-second audio pitch, and decides to ask a quick question before deciding. They tap the Message button, which takes them to a chat thread (there's already a "Sanjay applied to your job" SYSTEM message at the top). They type "Can you start tomorrow at 8am?" and hit send. Sanjay's app polls every 10 seconds; within 10 seconds he gets a push notification on his Android phone + a WhatsApp message. He opens the chat, hits the microphone button, says "Yes sir, I will reach by 8" in Hindi as a 6-second audio reply, and sends. The employer sees the audio bubble with a play button + speed control + read-receipt tick.

**Goal:** Let seekers and employers exchange text and short audio messages on a per-application conversation, with read-receipts, last-seen presence, and polling-based delivery.

**User stories:**
- As a seeker, after I apply to a job I want to message the employer with text or a 60-second audio note, so I can clarify details or ask a quick question.
- As an employer, I want to message a candidate with text or audio, so I can request information or follow up.
- As either party, I want to see the other party's last-seen timestamp on the conversation, so I know whether a response is imminent.
- As either party, I want unread counts on my conversations list and read receipts per message, so I know what needs attention.

**Acceptance criteria:**
- [ ] Conversation scope rule: a seeker can only start a conversation with an employer to whose job they have applied (existing scope check preserved).
- [ ] Polling endpoint `GET /api/conversations/:id/messages?after=<lastMessageId>` returns messages strictly newer than `lastMessageId`; client polls every ~10 seconds when the chat is open.
- [ ] `POST /api/conversations/:id/messages` accepts `{type, content?, audio?}` — `type ∈ {TEXT, AUDIO}`; TEXT body 1–5000 chars; AUDIO multipart, cap 60s; MIME accepted as per M5 audio handling.
- [ ] `IMAGE` and `SYSTEM` are not user-submittable via this endpoint (SYSTEM is producer-hook only; IMAGE is out-of-scope for v1).
- [ ] Mark-read endpoint updates per-message `readBy` UUID array; conversation-level unread counts derive from messages where `userId NOT IN readBy`.
- [ ] `lastSeenAt` updates fire-and-forget on every authenticated request; the conversations list and chat header surface the other party's `lastSeenAt`.
- [ ] SYSTEM messages auto-posted on apply ("Applied the job"), accept ("Congratulations… [interview details]"), reject ("We regret…") — these are immutable and not editable / deletable.
- [ ] Voice 🔊 icons on chat bubbles remain visible but non-functional in v1 (TTS deferred per Q2).

**BE endpoints involved:**
- ✅ `POST /api/conversations` — start a conversation (scoped to applied jobs).
- ✅ `GET /api/conversations` — list with `otherPartyLastSeenAt` enrichment.
- ✅ `GET /api/conversations/:id/messages?after=<id>&limit=` — polling-friendly.
- 🔧 `POST /api/conversations/:id/messages` (`services/conversation.service.ts:298`) — currently throws on AUDIO; wire multer audio upload (60s cap), store with the same presigned-URL abstraction as M5, persist MIME + duration on Message row (audit §1.8 #10).
- ✅ `PATCH /api/messages/:id/read`.
- ✅ Producer hook `postSystemMessage` (apply / accept / reject).

**FE screens involved:**
- ❌ NEW: `apps/web/src/app/messages` — conversations list with last-seen + unread counts.
- ❌ NEW: `apps/web/src/app/messages/[conversationId]` — chat surface with text input, audio recorder (60s cap), playback widget, polling loop.
- ❌ NEW: Audio recorder component for chat (60s cap, hold-to-record UX per research Topic 8 recommendation).
- 🔧 Notification badge on header dropdown — wire to `/api/notifications/unread-count`.

**Mobile scope:** In v1 mobile (both seeker AND employer). Mobile chat is part of "My List" (seeker, 4-tab nav) and "Messages" (employer, 5-tab nav). RN audio recorder library produces `.m4a` (iOS) or `.m4a` / `.opus` (Android); same upload contract.

**Out-of-scope (this module):**
- WebSocket / real-time chat transport — **scrubbed entirely from doc; polling is final, no upgrade path in v1 or v2.**
- Voice message transcription — scrubbed entirely.
- Image / video attachments.
- Reactions, emoji-only replies, threaded replies.
- Group chats (recruiter + manager + candidate).
- Message edit / delete / unsend.
- End-to-end encryption.
- Typing indicators.

**Open questions:**
- **Read-receipt semantics for audio** — does playing an audio message mark it read, or only opening the chat does? Default: opening the chat (consistent with text). Owner: Nazir.
- **Cross-conversation rate limiting** — should we throttle text-message spam from a single user (e.g. 100 messages / minute cap)? Default: yes, 100/min hard cap with 429 sentinel. Owner: Asrar.

---

## M9. Notifications

**In plain English:** Whenever something important happens — an application is accepted, an interview is scheduled, an employer's registration is approved, a payment goes through — the system needs to tell the right person, via the right channel. We use five channels in v1: **in-app** (the bell icon dropdown), **push** (FCM for mobile, web push for browsers), **WhatsApp** (the most reliable in India — blue-collar workers live in WhatsApp; ~80% open rate vs ~30% for SMS), **SMS** (for OTP and as fallback when WhatsApp fails), and **email** (for password resets and employer approval outcomes). The channel mix per event is in the matrix below. Two non-engineering processes are critical-path here: DLT registration with MSG91 (2-3 week lead time for SMS to deliver) and Meta Business verification (1-2 weeks before any WhatsApp template gets approved). If either slips, we ship with SMS-only fallback and turn on WhatsApp post-handover.

**Goal:** Deliver the 11 BE-defined notification event types to users via the right channel mix — in-app + FCM push + WhatsApp Business (MSG91) + SMS (OTP / payment fallback) + email (password reset / employer approval).

**User stories:**
- As a seeker, I want a WhatsApp message when my application is accepted, rejected, or shortlisted, so I see the update even when the app is closed.
- As a seeker, I want an in-app and push notification when an employer messages me, so I respond quickly.
- As an employer, I want a WhatsApp message when my Corporate registration is approved or rejected, so I can start posting or fix paperwork.
- As either party, I want an in-app notifications dropdown with unread badges and "mark all read", so I can clean my inbox.

**Acceptance criteria:**
- [ ] All 11 `NotificationType` enum values are wired with the producer hook firing on the right BE event:
  - `APPLICATION_SUBMITTED` (employer receives)
  - `APPLICATION_ACCEPTED` (seeker receives)
  - `APPLICATION_REJECTED` (seeker receives)
  - `APPLICATION_SHORTLISTED` (seeker receives)
  - `INTERVIEW_SCHEDULED` (seeker receives — already wired)
  - `EMPLOYER_APPROVED` (employer receives)
  - `EMPLOYER_REJECTED` (employer receives)
  - `DOCUMENT_VERIFIED` (seeker receives)
  - `DOCUMENT_REJECTED` (seeker receives)
  - `JOB_WARNING` (employer receives — already wired as SYSTEM type)
  - `PAYMENT_CONFIRMATION` (employer or seeker receives — wired post-M10 webhook)
- [ ] Channel matrix (default per-event; users can opt out of WhatsApp / SMS / email):

| Event | In-app | FCM Push | WhatsApp | SMS | Email |
|---|---|---|---|---|---|
| OTP (phone / email) | — | — | ✓ primary | ✓ fallback | ✓ (email purposes only) |
| Application submitted | ✓ | ✓ | ✓ | — | — |
| Application accepted | ✓ | ✓ | ✓ | — | — |
| Application rejected | ✓ | ✓ | ✓ | — | — |
| Application shortlisted | ✓ | ✓ | ✓ | — | — |
| Interview scheduled | ✓ | ✓ | ✓ | ✓ fallback | — |
| Interview reminder 24h | — | ✓ | ✓ | ✓ fallback | — |
| Interview reminder 2h | — | ✓ | ✓ | ✓ fallback | — |
| Employer approved | ✓ | ✓ | ✓ | — | ✓ |
| Employer rejected | ✓ | ✓ | ✓ | — | ✓ |
| Document verified / rejected | ✓ | ✓ | ✓ | — | — |
| Job warning (admin → employer) | ✓ | ✓ | — | — | — |
| Payment confirmation | ✓ | ✓ | ✓ | ✓ fallback | — |
| Password reset | — | — | — | — | ✓ |
| Employer message → seeker (gated by paid tier) | ✓ | ✓ | ✓ | — | — |

- [ ] WhatsApp templates submitted to Meta for approval (8–12 templates per BE sync §6): `otp`, `application_accepted`, `application_rejected`, `application_shortlisted`, `interview_scheduled`, `interview_reminder_24h`, `interview_reminder_2h`, `payment_confirmation`, `document_approved`, `document_rejected`, `employer_message_to_seeker`, `password_reset`.
- [ ] FCM push registered per-device on login (web push + iOS APNs + Android FCM); device tokens stored on User row (`User.deviceTokens[]`).
- [ ] In-app dropdown shows last 20 notifications, unread count badge, mark-all-read action.
- [ ] User preference UI: toggle WhatsApp / SMS / email opt-out per category (OTP is mandatory and cannot be opted out of).
- [ ] Producer hooks wrap in try/catch — channel-level failures do not abort the parent BE action (preserve existing fire-and-forget semantics).
- [ ] DLT registration with MSG91 (~2–3 week lead time) **initiated 2026-05-11 — Day 1 of Sprint 1** per R11.
- [ ] Meta Business verification + WhatsApp BSP onboarding **initiated 2026-05-09** by the non-engineering owner per Q7 conditions; acceptable that WhatsApp goes live up to 1 week after handover if Meta slips (SMS fallback covers).

**BE endpoints involved:**
- ✅ `GET /api/notifications` (list).
- ✅ `GET /api/notifications/unread-count`.
- ✅ `PATCH /api/notifications/:id/read`.
- ✅ `PATCH /api/notifications/read-all`.
- ❌ NEW: WhatsApp dispatch service via MSG91 BSP — template registry + per-event send adapter.
- ❌ NEW: SMS dispatch service via MSG91 DLT — per-event send adapter; OTP + payment confirmation + interview reminders.
- ❌ NEW: FCM push dispatch service — Firebase Admin SDK; device-token CRUD endpoints.
- ❌ NEW: Email dispatch service (Sendgrid or alternative — Asrar's pick per BE sync §9) — password reset + employer approval outcomes.
- ❌ NEW: User notification preferences endpoint(s) — `GET/PUT /api/me/notification-prefs`.
- ❌ NEW: Device-token endpoints — `POST /api/me/devices`, `DELETE /api/me/devices/:tokenId`.

**FE screens involved:**
- ❌ NEW: Notifications dropdown in header (web seeker + web employer + admin).
- ❌ NEW: Notification preferences screen (`/settings/notifications` for both roles).
- ❌ NEW: Device-token registration on login (web push permission request; mobile FCM token capture).

**Mobile scope:** In v1 mobile (both seeker AND employer). FCM is mobile-native; APNs cert provisioning is part of the mobile dev's setup (BE sync §9; role vacant 2026-05-15 — Dheeraj off project, new hire pending). Mobile notifications dropdown lives in each role's primary tab.

**Out-of-scope (this module):**
- RCS messaging — not in scope; SMS + WhatsApp cover the bases.
- Voice-call notifications.
- Slack / Teams integrations.
- Notification digest (daily / weekly roll-ups).
- WhatsApp marketing templates (we use OTP / utility templates only; marketing templates are not in scope).
- WhatsApp two-way reply handling beyond what the BSP surfaces by default.
- Notification A/B testing.

**Open questions:**
- **WhatsApp-first vs SMS-first for OTP delivery** (BE sync §6) — Asrar's instinct is SMS first (DLT is already critical-path), WhatsApp added in parallel once templates approved. Confirm. Owner: Asrar.
- **Email sender choice** — Sendgrid vs Resend vs AWS SES. Default: Asrar recommends; Nazir procures account. Owner: Asrar + Nazir (BE sync §9).
- **iOS APNs cert plan** — who owns Apple Developer account + cert generation? Owner: Mobile dev (TBD) + Nazir.
- **Notification language** — do WhatsApp / SMS / email messages get localised to the user's `preferredLanguage` for the 10 languages, or English-only in v1? Default: English-only in v1; Hindi added in v1.1 if templates can be approved in time. Owner: Nazir / Shaik.

---

## M10. Subscription & payments

**In plain English:** This is the only place money flows through the platform. Workers are completely free in v1 — no premium tier, unlimited applications. Employers get a 14-day free trial automatically when they register (during which they can do everything — post jobs, manage candidates, message, etc.), and after that they pay **₹999 per month** via Razorpay to keep posting. Renewal is **manual** — no auto-debit, no surprise charges; the employer gets a reminder 3 days before expiry and decides whether to pay. If they don't renew, their existing jobs auto-deactivate (but aren't deleted) and they can browse but can't post new ones until they pay. During the trial, the system sends two nurture nudges — one on day 3 ("Have you reviewed any applicants yet?") and one on day 7 ("Your trial ends in 7 days"). **Important:** none of this includes the platform handling wages between worker and employer — there's no escrow, no commission, no completed-job payouts. Workers and employers settle their own wages off-platform. **The ₹999 / 14-day / manual-renewal numbers are PROVISIONAL** — they're our working assumption until Shaik confirms by 2026-05-18; if he picks differently the seed file changes in 30 minutes and these acceptance criteria get reworded.

**Walkthrough — Employer's first month:** A construction company registers on day 0. The system creates a Subscription row with tier=TRIAL, expires in 14 days. They post a job, get applicants, accept a candidate, schedule an interview — full feature access. On day 3, they get an in-app banner and a WhatsApp message: "Have you reviewed any applicants? Let us know if you need help." On day 7, another nudge: "Your trial ends in 7 days. Upgrade now to keep posting jobs." On day 14, the trial expires; their existing job auto-deactivates, the dashboard shows an "Upgrade" banner. They click Upgrade, get redirected to Razorpay's checkout widget, pay ₹999 + GST. Razorpay fires a webhook to our BE; we verify the HMAC signature, dedupe on the event ID (so a replay doesn't double-credit), flip the subscription to tier=PRO with expires=now()+30 days, and write a PaymentHistory row. The employer's job is auto-reactivated. 27 days later, they get another in-app + WhatsApp + email reminder: "Your subscription renews in 3 days, click Renew to continue." If they don't click, the job auto-deactivates again at expiry.

**Goal:** Charge employers via Razorpay using the provisional Option B model (₹999 / month, manual renewal, 14-day free trial with structured day-3 + day-7 check-ins), persist subscription state and history, and gate feature access accordingly. **All numbers in this module are PROVISIONAL pending Shaik Ishaq's final confirmation by 2026-05-18.**

**User stories:**
- As a new employer, I want a 14-day free trial automatically when I register, so I can post a job and review applicants before paying.
- As an employer on trial, I want WhatsApp + in-app check-ins on day 3 ("Have you reviewed applicants?") and day 7 ("Trial ends in 7 days"), so I'm nudged to convert.
- As an employer after trial, I want to upgrade to Pro (₹999 / month) via Razorpay, so I can keep posting jobs.
- As an employer, I want to renew manually at month-end via a prompt (no auto-debit), so I retain control.
- As an admin, I want to see a real revenue number on my dashboard (not a hardcoded ₹500/sub placeholder), so I can track the business.

**Acceptance criteria:**
- [ ] On employer registration, a `Subscription` row is created with `tier = TRIAL`, `startedAt = now()`, `expiresAt = now() + 14 days`, `autoRenew = false`.
- [ ] During trial: employer has unlimited posts, candidate management, messaging, advanced filters, voice messages in native language (per Q5 provisional).
- [ ] After trial expires without upgrade: `tier` flips to `EXPIRED`; employer can browse but cannot create new jobs (existing ACTIVE jobs are auto-deactivated to INACTIVE).
- [ ] Razorpay checkout creates an `Order` row, surfaces the Razorpay payment widget, and on `payment.captured` webhook flips the subscription to `tier = PRO`, `expiresAt = now() + 30 days`, and records a `PaymentHistory` entry with provider ID, amount, GST breakdown.
- [ ] At month-end, manual renewal prompt: employer is shown an in-app + WhatsApp + email reminder 3 days before expiry; clicking "Renew" repeats the Razorpay checkout flow.
- [ ] On expiry without renewal, ACTIVE jobs auto-deactivate to INACTIVE (NOT deleted); existing applications, chats, and interviews are preserved.
- [ ] Day-3 in-app + WhatsApp check-in fires for all TRIAL subscriptions; day-7 fires for all TRIAL subscriptions not yet upgraded.
- [ ] Webhook idempotency: Razorpay events are deduped on `provider_event_id`; replays do not double-credit.
- [ ] Admin revenue dashboard reads from `PaymentHistory` (sum of `amount` where `status = SUCCESS`), grouped by month — replaces the hardcoded ₹500/sub × paid-count placeholder.
- [ ] Subscription state on `User.subscriptionTier` (FREE | TRIAL | PRO | EXPIRED), `User.subscriptionExpiresAt`, `User.lastPaymentAt`.
- [ ] Plan names + prices live in seed data (`SubscriptionPlan` table), not hardcoded constants — supports a 30-minute swap if Shaik picks Option A or C on 2026-05-18.
- [ ] Worker side: no premium tier in v1. The `subscriptionTier` field on seeker User rows stays `FREE` permanently. **If Shaik picks Option A on 2026-05-18, this acceptance criterion is reversed — see provisional doc for migration.**
- [ ] GST calculated and recorded per transaction (Razorpay invoicing API handles this; we persist the GST line item for reporting).

**BE endpoints involved:**
- ❌ NEW: `POST /api/subscriptions/checkout` — creates a Razorpay order, returns checkout payload to FE.
- ❌ NEW: `POST /api/webhooks/razorpay` — Razorpay webhook receiver with HMAC signature verification + idempotency dedup.
- ❌ NEW: `GET /api/me/subscription` — current user's subscription state + days remaining + plan details.
- ❌ NEW: `GET /api/me/payments` — payment history list.
- ❌ NEW: `POST /api/subscriptions/cancel` — cancels at end of current period (no refund in v1; defer pro-rata refund to v2).
- ❌ NEW: Cron job for trial day-3 / day-7 check-ins.
- ❌ NEW: Cron job for renewal-due reminders (T-3 days).
- ❌ NEW: Cron job for trial-expiry / sub-expiry auto-deactivation of ACTIVE jobs.
- ❌ NEW: Prisma models — `Subscription`, `SubscriptionPlan`, `PaymentHistory`, `WebhookEvent`.
- 🔧 Admin dashboard revenue endpoint (`controllers/admin.controller.ts:1324`) — replace hardcoded ₹500/sub × paid count with real `PaymentHistory` aggregation.
- ❌❌ DELETE: any escrow / commission / payment-intent / completed-job-settlement code paths or schema fields per Q12 revised — confirm none exist today, otherwise remove.
- ❌❌ DELETE: any auto-renewal / RBI e-mandate scaffolding — Q5 revised: manual renewal only in v1.
- ✅ Existing `User.paymentStatus` enum (NOT_PAID | PAID) is a placeholder; either keep as derived view of Subscription or drop in favour of `subscriptionTier`.

**FE screens involved:**
- ❌ NEW: `apps/web/src/app/employer/subscription` — current state, days remaining, upgrade button.
- ❌ NEW: `apps/web/src/app/employer/subscription/checkout` — Razorpay checkout widget.
- ❌ NEW: `apps/web/src/app/employer/subscription/success` — success page after webhook confirms.
- ❌ NEW: `apps/web/src/app/employer/payments` — payment history.
- 🔧 Employer dashboard tile — "Subscription: PRO, X days remaining".
- ❌ NEW: Trial day-3 / day-7 in-app prompt UI (modal or banner).
- ❌ NEW: Renewal-due prompt UI (banner from T-3 days).
- 🔧 `apps/admin/src/app/dashboard` — wire real revenue via M10 endpoint.

**Mobile scope:** In v1 mobile (employer view — full parity). The Profile tab in the 5-tab employer mobile nav surfaces Free / Pro state per `Job_Portal_Mobile.pdf` page 50ish; checkout uses Razorpay's mobile SDK; webhook lives on BE as usual.

**Out-of-scope (this module):**
- **Auto-renewing subscriptions / RBI e-mandate** — v2 only per Q5 revised. v1 is manual renewal.
- **Pro-rata refunds** — v2.
- **Discount codes / promo codes** — v2.
- **Annual plans** — v1 is monthly only.
- **Team / multi-user employer accounts under one subscription** — v1 is one user = one subscription.
- **Seeker premium tier ("Elite Member")** — moot under provisional Option B; if Shaik picks Option A, this becomes a 30-minute additive change per provisional doc.
- **Per-post pricing / credit packs** — would be enabled only if Shaik picks Option C.
- **Platform-handled payments / escrow / commission / payment intent between worker and employer** — out forever per Q12 revised; not v1, not v2, not ever in this product.

**Open questions:**
- **Final pricing confirmation from Shaik Ishaq** — provisional is Option B (₹999 / month, 14-day trial, manual renewal). **Deadline 2026-05-18.** If Shaik picks Option A, B-with-Starter, or C, the changes per `03-pricing-decision-provisional.md` Section 4 apply (~30 minutes of work on seed data + one paragraph in this module). Blocks: finalising M10 acceptance criteria copy. Owner: Shaik Ishaq.
- **Razorpay merchant KYC** — sandbox keys procurable today; production KYC lead time? Default: Nazir initiates 2026-05-11. Owner: Nazir (R3 + BE sync §9).
- **GST registration for Azkashine** — required once revenue ramps; operations confirms timing. Owner: Shaik Ishaq.
- **Trial-extension policy** — what happens if the employer reports "couldn't get applicants in 14 days, extend my trial"? Default: no extensions in v1 (admin can manually flip `tier` if escalated). Owner: Nazir.

---

## M11. Admin verification

**In plain English:** Admins are the trust gatekeepers. When a Corporate employer registers, they don't get to post jobs immediately — they upload their GST cert, CIN cert, ISO certs etc., and they land in an admin queue. An admin opens the queue, reviews the documents, and either approves (which lets the employer start posting + sends them a WhatsApp + email confirmation) or rejects with a reason. Same pattern for seekers — if a seeker uploads ID proof / address proof / certificates, admins verify each document one by one, and once the last pending document is approved, the seeker's overall `documentVerificationStatus` flips to VERIFIED. There's also a manual "payment status" override for cases where someone paid offline / had a refund / needs a fix — admins can flip PAID / NOT_PAID directly. Tab badges across the admin screens show pending counts globally, so the admin knows their workload at a glance.

**Goal:** Give admins queues to verify Corporate employer registrations, review seeker / employer documents, and update user payment status, with cascade effects on user state and downstream notifications.

**User stories:**
- As an admin, I want a Corporate employer queue (Pending / Rejected / Approved tabs) where I can open a registration, review docs, and approve or reject with a reason, so I gate-keep the trust signal.
- As an admin, I want a seeker queue similar to the employer queue, so I can act on flagged or pending seekers.
- As an admin, I want a document review queue across both seeker and employer documents, so I can batch-verify uploads.
- As an admin, I want to see global tab badges with counts (Pending across all filters), so I know my workload at a glance (T2a #38).
- As an admin, I want to update an employer's payment status manually (PAID / NOT_PAID), so I can override the automated status when needed (e.g. offline payment reconciliation).

**Acceptance criteria:**
- [ ] Admin employer queue endpoints return paginated lists with search + filters; default sort by `createdAt` desc.
- [ ] Approve employer: `verificationStatus = APPROVED`, fire `EMPLOYER_APPROVED` notification (in-app + push + WhatsApp + email).
- [ ] Reject employer: `verificationStatus = REJECTED`, capture `rejectionReason`, fire `EMPLOYER_REJECTED` notification.
- [ ] Approve seeker: similar shape; document `documentVerificationStatus` cascades when documents are verified.
- [ ] Document verify / reject endpoints update both the document row and (if last pending doc) the user's overall `documentVerificationStatus`.
- [ ] Payment status update (admin override) writes to `User.paymentStatus` and appears on the user's profile detail; does **not** create a `PaymentHistory` row (only Razorpay webhook does).
- [ ] Tab badges return global counts (ignore current filter — T2a #38).
- [ ] All admin actions are logged with `adminId`, `action`, `targetUserId`, `timestamp`.
- [ ] Document review SLA target: **48 hours during business days** (per research Topic 11) — exposed as a copy commitment in admin documentation, not enforced in code.
- [ ] All admin routes are gated by `authorize('ADMIN')` middleware and reject non-admin JWTs.

**BE endpoints involved:**
- ✅ `GET /api/admin/employers` + `/pending` + `/rejected`.
- ✅ `GET /api/admin/employers/:id`.
- ✅ `PATCH /api/admin/employers/:id/approve` + `/reject` + `/payment-status`.
- ✅ `GET /api/admin/jobseekers` + `/rejected`.
- ✅ `GET /api/admin/jobseekers/:id`.
- ✅ `PATCH /api/admin/jobseekers/:id/approve` + `/reject` + `/payment-status`.
- ✅ `GET /api/admin/documents` (review queue).
- ✅ `PATCH /api/admin/documents/:id/verify` + `/reject` (with cascade to user `documentVerificationStatus`).
- ✅ Producer hooks fire on every approve / reject / verify / document-rejected event (T2 #11).

**FE screens involved:**
- 🔧 `apps/web/src/app/admin/employee-queue` (seeker queue — currently mock).
- 🔧 `apps/web/src/app/admin/employer-queue` (currently mock).
- ❌ NEW: `apps/admin/src/app/employer/[id]` — Corporate employer detail with docs + Approve / Reject buttons.
- ❌ NEW: `apps/admin/src/app/jobseeker/[id]` — seeker detail with docs + Approve / Reject.
- ❌ NEW: `apps/admin/src/app/documents` — document review queue across roles.
- ❌ NEW: `apps/admin/src/app/employer/[id]/payment-status` — override widget.
- Note: all `/admin/*` pages will be lifted from `apps/web/src/app/admin/*` into the new `apps/admin/` workspace per D4.

**Mobile scope:** Web only. No admin mobile app (locked per D3 + research Topic 4).

**Out-of-scope (this module):**
- AI-driven document OCR + name match (v2 per locked scope D1).
- DigiLocker pull for docs (v2 per research Topic 11).
- Multi-admin assignment / "Claim this verification" workflows.
- Bulk approve / bulk reject.
- Admin-to-admin chat or annotations on user records.
- Restore endpoint for soft-deleted users (audit §1.8 #15 — confirmed v2 or never).
- Police verification certificate handling beyond generic document type.

**Open questions:**
- **Document review SLA enforcement** — surface SLA breach badges on docs older than 48 h, or just publish the SLA in user-facing copy? Default: badge only (no auto-escalation in v1). Owner: Nazir / Najeeb / Farhana.
- **Payment status manual override audit trail** — do we log who flipped a PAID/NOT_PAID and why? Default: yes, log with `adminId` + free-text reason field. Owner: Asrar.

---

## M12. Admin content moderation

**In plain English:** Job ads sometimes contain scams — "pay ₹500 registration fee", "earn ₹50,000 by recruiting 10 friends", "send your Aadhaar to this gmail address". Admins need tools to find and remove this. The workflow is: admin opens a job post in the moderation queue, clicks **Scan Content**, which calls OpenAI's free moderation API (`omni-moderation-latest`) plus a custom regex layer tuned for Indian scam patterns (registration fees, MLM language, free-mail HR contacts pretending to be corporates, upfront payment demands). The result is shown inline with the flagged text highlighted. From there the admin chooses **Send Warning** (creates a record on the job + WhatsApps the employer) or **Delete** (hard removes the job — applications cascade-delete; chats are preserved). Workers can also file reports against jobs they think are scams via a free-text "Report this job" button, and those reports show up in a separate admin queue. Note: this is **manual-triggered** scanning in v1 — admins click Scan, the system doesn't auto-scan every post on creation. That auto-scan is a v2 feature.

**Goal:** Let admins moderate job posts via OpenAI's `omni-moderation-latest` + India scam regex layer, with manual override actions (Send Warning / Delete) and handling of seeker-initiated job reports.

**User stories:**
- As an admin, I want a moderation queue of job posts (Pending review / Warnings sent / Reports received), so I can triage what needs review.
- As an admin, I want a one-click "Scan Content" button on each post that calls OpenAI's moderation API + our India scam regex, with violations highlighted inline, so I can decide quickly.
- As an admin, I want to send a warning to the employer (which appears as a notification + a record on their job), so I can flag soft violations.
- As an admin, I want to delete a job post outright, so I can remove hard violations.
- As an admin, I want to see seeker-initiated job reports with free-text reasons, so I can act on community signals.

**Acceptance criteria:**
- [ ] `POST /api/admin/posts/:id/scan` calls OpenAI `omni-moderation-latest` with the job title + description, returns `{categories: {...}, scores: {...}}`; admin sees a structured violation breakdown inline.
- [ ] India scam regex layer applies on top: detect (a) registration / training / background-check fee mentions, (b) MLM language ("earn lakhs by recruiting"), (c) free-mail HR contacts (gmail / yahoo / outlook on a job claiming to be from a real corporate), (d) upfront-payment demands, (e) urgency-without-formality patterns ("apply immediately, no interview").
- [ ] Scan flips `moderationStatus`: high-confidence violations → `VIOLATION_FOUND`; borderline → `PENDING_REVIEW` (admin to confirm).
- [ ] Send Warning creates a `JobWarning` row, fires in-app + WhatsApp notification (template `job_warning`) to the employer, and auto-flips `moderationStatus` to `VIOLATION_FOUND` if starting from `NO_VIOLATION` or `PENDING_REVIEW`.
- [ ] Delete is hard delete on Job (cascades to applications, conversations are preserved); fires no notification to the employer beyond a SYSTEM action log.
- [ ] Seeker Job Reports queue lists reports with employer + job + reason + timestamp; admin can resolve (no-action / warned / deleted) — resolution is logged on the report row.
- [ ] 36-hour takedown SLA target per research Topic 9 — exposed as copy commitment, not enforced in code.
- [ ] All admin moderation actions are logged with `adminId`, `action`, `jobId`, `timestamp`.

**BE endpoints involved:**
- ❌ NEW: `POST /api/admin/posts/:id/scan` — OpenAI omni-moderation + India scam regex layer; returns structured violations.
- ✅ `GET /api/admin/posts` (with `moderationStatus` filter + summary counts).
- ✅ `GET /api/admin/posts/:id` (post detail with warnings + reports + activity).
- ✅ `POST /api/admin/posts/:id/approve` + `/reject` + `/mark-no-violation` + `/mark-violation`.
- ✅ `POST /api/admin/posts/:id/warning` (creates JobWarning + notification).
- ✅ `DELETE /api/admin/posts/:id` (hard delete).
- ✅ `POST /api/admin/posts/:id/activate` + `/deactivate` (T2a #34b).
- ✅ Seeker-side `POST /api/jobs/:id/report` (T2 #12).

**FE screens involved:**
- 🔧 `apps/web/src/app/admin/post-moderation` (currently mock).
- ❌ NEW: `apps/admin/src/app/posts/[id]` — post moderation detail with Scan button + violation highlights + Send Warning + Delete actions.
- ❌ NEW: `apps/admin/src/app/reports` — seeker-initiated job reports queue.
- 🔧 violations highlighter UI — inline annotation of flagged text inside the job description.

**Mobile scope:** Web only.

**Out-of-scope (this module):**
- AI auto-moderation on every post at creation time (v2 per locked scope D1 — v1 is admin-triggered scan button).
- Custom-trained moderation classifier (v2).
- Profanity-only filter (the OpenAI categories cover this).
- Bulk scan across the entire queue.
- Auto-warn / auto-delete based on score thresholds (everything in v1 requires admin click).
- Multilingual scan beyond what OpenAI handles natively (research Topic 9 — Indic improvements are real per OpenAI release).

**Open questions:**
- **India scam regex source-of-truth** — does the regex list live in seed data, env config, or hardcoded in service? Default: seed data (`ScamPattern` table) so admins can extend it post-launch without a code deploy. Owner: Asrar.
- **OpenAI API budget cap** — per BE sync §9, who owns the org account and budget cap? Default: Nazir procures, sets a monthly cap (e.g. ₹5,000 / month — plenty given the API is free for moderation). Owner: Nazir.

---

## M13. Soft delete

**In plain English:** Sometimes an admin needs to remove a user — for a Terms of Service violation, a user-requested account removal, or a clean-up of test data. We don't actually delete the row from the database (because that would cascade-destroy applications, chats, interview history, etc.). Instead we set `isDeleted = true` and `deletedAt = now()`. The auth middleware checks that flag on every authenticated request, so a deleted user's existing JWT stops working immediately on their next request — no need to wait for token expiry. Their jobs disappear from feeds and recommendations. Their applications stay attached in the database (so other parties can still see the history), but they themselves can't log in. There's no in-app "undelete" button in v1 — if a deletion was a mistake, admins escalate to Asrar to flip the flag directly in the database.

**Goal:** Let admins soft-delete (recoverable) seeker and employer accounts via the NC-9 mechanism, with full downstream filtering on login, queues, public browse, recommendations, and related jobs.

**User stories:**
- As an admin, I want to soft-delete a seeker or employer (e.g. for ToS violation or user request), so the account is removed from public view but recoverable later.
- As an admin, I want a separate "Deleted" list per role, so I can see what's been removed and verify nothing was deleted by mistake.
- As a seeker browsing jobs, I want soft-deleted employers' jobs to not appear in feed / recommendations / related, so I'm not wasting time on unreachable employers.
- As any user, I want a soft-deleted user's JWT to immediately reject on the next request, so the deletion is enforced server-side without waiting for token expiry.

**Acceptance criteria:**
- [ ] `PATCH /api/admin/jobseekers/:id/delete` and `/employers/:id/delete` set `User.isDeleted = true`, `User.deletedAt = now()`.
- [ ] `authenticate` middleware rejects any JWT whose User row is `isDeleted = true` (already in place — NC-9).
- [ ] Login endpoints reject deleted users with sentinel `ACCOUNT_DELETED` error.
- [ ] Forgot-password and reset-password flows reject deleted users.
- [ ] Default queues (admin employer / seeker lists) exclude deleted users.
- [ ] `/api/admin/jobseekers/deleted` and `/api/admin/employers/deleted` return the deleted lists (route ordering preserved — `/deleted` before `/:id` per audit §1.4).
- [ ] Public job browse, recommended, and related endpoints filter out jobs whose employer is soft-deleted (NC-9 already wired in `services/job.service.ts`).
- [ ] **Confirm or fix:** `/jobs/employer/:employerId` (per-employer public browse) — audit §1.8 #14 flags that soft-deleted-employer jobs may still appear; either filter or document as intentional.
- [ ] **Confirm or fix:** admin dashboard `prisma.jobSeeker.count()` and `prisma.employer.count()` may inflate by including deleted users — audit §1.8 #16. Either filter or document.
- [ ] No restore endpoint in v1 (audit §1.8 #15 — locked).

**BE endpoints involved:**
- ✅ `PATCH /api/admin/jobseekers/:id/delete` (NC-9).
- ✅ `PATCH /api/admin/employers/:id/delete` (NC-9).
- ✅ `GET /api/admin/jobseekers/deleted`.
- ✅ `GET /api/admin/employers/deleted`.
- ✅ `authenticate` middleware (`middleware/auth.ts:43`) rejects deleted users.
- 🔧 `/jobs/employer/:employerId` — confirm + add NC-9 filter if missing.
- 🔧 Admin dashboard counts — add `isDeleted = false` filter (audit §1.8 #16).

**FE screens involved:**
- ❌ NEW: `apps/admin/src/app/jobseekers/deleted` and `/employers/deleted` — deleted user lists.
- ❌ NEW: confirmation modal on delete action ("This will hide the account from all surfaces. There is no in-app restore — escalate via Asrar if needed.").

**Mobile scope:** Web only (admin tooling).

**Out-of-scope (this module):**
- Restore endpoint / "undelete" workflow (v2 or never per audit §1.8 #15).
- GDPR-style "right to be forgotten" hard delete (v2 — would require cascade hard-delete of applications, messages, etc.).
- User-initiated account deletion (v1 is admin-only).
- Bulk soft delete.
- Auto-soft-delete on N days of inactivity.

**Open questions:**
- **Restore workflow** — confirmed v2-or-never. Owner: locked (no action).
- **User-initiated deletion path** — does v1 expose a "Delete my account" button for users, which queues an admin action? Default: no, v1 is admin-only. Owner: Nazir.

---

## M14. i18n (10 languages)

**In plain English:** Most of our target users are not comfortable in English. We ship the UI in 10 Indian languages — English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, Bengali — and the user picks their language at registration. They can change it later from the header. The translation pipeline is **AI first-pass + native-speaker review** — we use Claude or GPT to draft each language, then a native speaker reviews. **English and Hindi are P0** — they must be 100% complete and human-reviewed by code freeze (2026-06-21). The other 8 languages can soft-launch at ≥80% coverage; any missing key shows up in the UI as `[needs review] some.key.path` so QA can spot gaps without reading every screen. Note: only UI strings are translated — if an employer types a job description in English, that text stays in English; we don't auto-translate job-post bodies (that's v2). The 🔊 voice icons are also translated (their tooltips say "Listen" / "सुनें" / etc.) but they don't actually play audio in v1.

**Goal:** Translate UI strings into 10 Indian languages (EN, HI, TA, KN, ML, MR, GU, OR, TE, BN), with EN + HI 100% complete and reviewed by code freeze (2026-06-21), and the other 8 soft-launchable with `[needs review]` tagging on missing keys.

**User stories:**
- As a seeker, I want to pick my preferred language at registration (Language → Phone screen) and see all UI in that language thereafter, so I'm not forced to read English.
- As a user of any role, I want to change my language from the header dropdown post-login, so I can switch without re-registering.
- As a translation reviewer, I want missing-key fallback to surface as `[needs review] Key.path` rather than a blank string or placeholder English, so QA can spot gaps without reading every screen.

**Acceptance criteria:**
- [ ] All 10 languages have JSON files under `packages/i18n/locales/{lang}/common.json` (and any additional namespaces).
- [ ] `next-i18next` is wired on web, `i18next` on RN; keys are shared via the `packages/i18n` workspace.
- [ ] EN and HI keys are 100% complete and reviewed before code freeze (2026-06-21).
- [ ] The other 8 languages have ≥80% key coverage by code freeze; missing keys render as `[needs review] {keyPath}` (never as English).
- [ ] User's `preferredLanguage` is persisted on `User` row at registration and changeable from header dropdown.
- [ ] Voice 🔊 icon labels and tooltips ("Listen", "Coming soon") are also translated.
- [ ] Pluralisation rules per language (e.g. Hindi has different plural forms) are handled via `i18next`'s ICU plural format.
- [ ] Date / time / currency formatting uses each language's locale defaults (Intl.NumberFormat, Intl.DateTimeFormat).
- [ ] Indic-script line-length expansion (~30% wider than Latin per research Topic 7) is accommodated in primary CTAs and form labels.
- [ ] `[needs review]` markers do not ship to production for EN / HI — build-time check fails if any EN or HI key carries the marker.

**BE endpoints involved:**
- ❌ NEW (small): `PATCH /api/me/language` — update `User.preferredLanguage`.
- ✅ Existing User schema already has `preferredLanguage` field per audit.
- Note: BE does NOT translate job-post body text; only UI strings are i18n'd (job description is whatever the employer typed).

**FE screens involved:**
- ❌ NEW: Header language switcher dropdown (web seeker + employer + admin + mobile).
- 🔧 Every existing FE screen — wrap strings in `t('key.path')`; current FE has zero `t()` calls.
- ❌ NEW: `packages/i18n` workspace with locale JSONs.
- ❌ NEW: AI-draft + native-reviewer pipeline (offline content workstream, not a code task) — Nazir coordinates.

**Mobile scope:** In v1 mobile (full parity). RN uses `i18next` and `react-i18next`; shares the same `packages/i18n` keys.

**Out-of-scope (this module):**
- Hosted TMS (Crowdin / Lokalise / Tolgee) — v2 per research Topic 7.
- Regional dialect support (we ship standard / formal forms for each language).
- RTL languages — none of the 10 are RTL.
- Voice TTS playback for any language — v2 per Q2.
- Audio recordings of UI strings in regional languages — v2.
- Job description auto-translation between seeker preferred language and employer-typed text.

**Open questions:**
- **Translation reviewer availability for the 8 non-EN/HI languages** — R5 risk. If reviewers slip, soft-launch with `[needs review]` markers per locked scope Q6. Owner: Nazir.
- **Date format default** — DD/MM/YYYY vs locale-driven (e.g. Bengali might want শুক্রবার format)? Default: locale-driven via Intl. Owner: Nazir.
- **Currency display** — always "₹" symbol or "INR" string for some locales? Default: "₹" everywhere. Owner: Nazir.

---

## M15. Cross-cutting

**In plain English:** This module is the "everything else that's important but doesn't fit a single user-facing feature" bucket. It covers things like: switching the FE to talk to the BE on the right port and right path conventions (today the FE expects `localhost:8080` and paths like `/job-seeker/*`, but the BE actually runs on `localhost:5000` with `/api/jobseekers/*`); wiring real Bearer-token auth on the FE (today it's localStorage hackery); closing all the security holes the audit flagged (OTPs no longer returned in production responses, JWT secret asserted at boot, admin-create endpoint locked down, password reset endpoints no longer leak whether the email exists, etc.); ensuring every dev writes inline decision tags so future maintainers can trace why the code is the way it is; making sure the staging environment is up and CI runs on every PR; and a performance gate at code freeze (search responses under 500ms with 50k jobs in the database). Most of these are quick fixes — they got bundled here because they don't belong to any single feature module but they all have to be true before we hand to QA.

**Goal:** Ensure foundational concerns — auth middleware, logging, decision-tag convention, API documentation closure, security hardening, and FE/BE port + path reconciliation — are uniformly applied and don't regress as features ship.

**User stories:**
- As a developer (FE / BE / Mobile), I want a single source of truth for the API surface (auto-generated OpenAPI from BE Zod validators) so I'm not guessing endpoint shapes.
- As a developer, I want inline decision tags (`Q##`, `NC-##`, `T##`, `Q-FE-NN`, `Q-MOB-NN`) on non-obvious code, so future maintainers can trace decisions back to dated context.
- As QA, I want every request logged at HTTP level with duration + statusCode (already in place), so I can diagnose flaky endpoints.
- As security, I want all the audit §1.8 security gaps closed before staging (OTP-in-response gated by env, JWT secret asserted at boot, admin-create gated, forgot-password 200, `crypto.randomInt` for OTP, BOOKMARKED enum fix, reject-accepted guard decision).

**Acceptance criteria:**
- [ ] FE base URL switches from `localhost:8080` to `localhost:5000` (or environment-driven `NEXT_PUBLIC_API_URL`); `.env.example` is committed to the FE repo per D6.
- [ ] FE path naming reconciled: `/job-seeker/* → /api/jobseekers/*`, `/employer/* → /api/employers/*`, etc. (D6).
- [ ] FE wires `Authorization: Bearer <token>` on all authenticated calls; token stored in localStorage + memory; refresh logic + protected route guards in place (audit §2.4).
- [ ] All cross-cutting bugs from audit §1.8 are resolved before staging:
  - #1 OTP-in-response gated behind `NODE_ENV !== 'production'`.
  - #2 `crypto.randomInt` replaces `Math.random()` in `generateOTP`.
  - #3 `JWT_SECRET` fail-fast assertion at boot.
  - #4 `forgot-password` returns generic 200 (no enumeration).
  - #5 `POST /api/admin/create` gated behind setup token or env-allowlist.
  - #6 `acceptApplication` reject-already-accepted guard decision (re-enable or delete) — locked one way.
  - #7 `BOOKMARKED` added to `updateApplicationStatusSchema` enum.
  - #9 Aadhaar code deleted entirely (overlaps M1 ❌❌).
  - #10 + #11 Audio support wired on chat + apply (M5 + M8).
  - #12 Notification channels wired (M9).
  - #13 `/api/skills` public-or-post-login decision implemented (M2 calls drop-auth).
  - #14 `/jobs/employer/:employerId` soft-delete filter confirmed.
  - #16 Admin dashboard counts filter `isDeleted = false`.
- [ ] API documentation: auto-generated OpenAPI from BE Zod validators (preferred per BE sync §10), hosted at `Job_Portal/docs/technical/openapi.yaml` per D7.
- [ ] Decision tag convention: BE keeps `Q##` / `NC-##` / `T##` / `T2a #` / `T3 #`; FE adopts `Q-FE-NN (YYYY-MM-DD) — reason`; mobile adopts `Q-MOB-NN (YYYY-MM-DD) — reason`.
- [ ] Master decision log location confirmed and write-access granted to FE + Mobile (BE sync §7).
- [ ] Staging environment stood up by 2026-05-17 (Sprint 1 mid) per R9.
- [ ] CI runs on every PR: lint + typecheck + smoke test on BE; lint + typecheck + build on FE web + mobile.
- [ ] Performance gate at code freeze: P95 search response <500 ms with 50k jobs; P95 feed response <500 ms; P95 conversation poll <200 ms.
- [ ] Security review checkpoint before code freeze: covers OWASP top 10 spot-check, JWT handling, input validation (Zod is already in place), SQL injection (Prisma parameterised), file upload sandboxing (multer + MIME check), rate-limiting on auth endpoints (newly added in S3).

**BE endpoints involved:**
- 🔧 Boot-time env assertion (`utils/jwt.ts`, plus new envs for Razorpay, Google OAuth, OpenAI, MSG91, Sendgrid, FCM).
- 🔧 `utils/crypto.ts` — `crypto.randomInt` replacement.
- 🔧 OTP controllers (phone + email) — gate OTP-in-response by env.
- 🔧 `controllers/auth.controller.ts:22` — forgot-password 200.
- 🔧 `routes/admin.routes.ts:45` — gate `/admin/create`.
- ❌ NEW: rate-limiter middleware on auth + OTP endpoints (5 requests / minute / IP for `/login`, 3 / minute / IP for OTP send).
- ❌ NEW: OpenAPI auto-generation from Zod validators (e.g. `zod-to-openapi`).
- ❌ NEW: CI workflow files (GitHub Actions).

**FE screens involved:**
- 🔧 `apps/web/src/lib/api.ts` — base URL switch, path reconciliation, Bearer token interceptor, refresh-on-401 logic.
- ❌ NEW: Auth context + protected route guard wrapper.
- ❌ NEW: `.env.example` checked into FE repo.

**Mobile scope:** Mobile inherits the same patterns — auth context + interceptor + protected route guards in RN.

**Out-of-scope (this module):**
- Multi-region deployment (v2 per locked scope D1).
- WebSockets / real-time transport upgrade — scrubbed entirely.
- Multi-tenancy / white-label.
- A full SOC2 / ISO27001 audit (v2+).
- Detailed performance optimisation beyond the P95 gates (v2 per audit §1.8 #17).
- Auto-scaling / load-balancer configuration (handled by infra team per locked scope, not a PRD line).

**Open questions:**
- **OpenAPI vs hand-maintained `API_DOCUMENTATION.md`** — BE sync §10 default is OpenAPI auto-generation. Confirm Asrar can ship it in S1. Owner: Asrar.
- **CI provider** — GitHub Actions vs alternative. Default: GitHub Actions per the existing repo platform. Owner: Nazir + Nayan.
- **Rate-limiter strategy** — in-process (Express middleware) vs Redis-backed for multi-instance. Default: in-process for v1 staging; Redis for prod when scaling. Owner: Asrar.
- **Sentry / observability beyond Winston** — add Sentry now for error tracking, or defer? Default: defer; Winston `logs/error.log` + infra team's log aggregation handle v1. Owner: Nazir / Nayan.

---

## Appendix A — Module → owner map

| Module | Primary owner | Secondary |
|---|---|---|
| M1 Auth | Asrar (BE) + Nazir (FE) + Mobile dev (TBD) (mobile) | Shaik (Google OAuth client) |
| M2 Profile | Nazir (FE) + Mobile dev (TBD) (mobile) | Asrar |
| M3 Job posting | Nazir + Mobile dev (TBD) | Asrar |
| M4 Job discovery | Asrar (algo tweak) + Nazir + Mobile dev (TBD) | — |
| M5 Job application | Asrar (audio + multer) + Nazir + Mobile dev (TBD) | — |
| M6 Candidate management | Nazir + Mobile dev (TBD) | Asrar |
| M7 Interview scheduling | Nazir + Mobile dev (TBD) | Asrar (reminders cron + outcome endpoint) |
| M8 Chat | Asrar (audio chat) + Nazir + Mobile dev (TBD) | — |
| M9 Notifications | Asrar (channel adapters) + Nazir + Mobile dev (TBD) | Shaik (Meta verification + DLT) |
| M10 Subscription | Asrar + Nazir + Mobile dev (TBD) | Shaik (final pricing); Nazir (Razorpay) |
| M11 Admin verification | Nazir (admin web) | Asrar |
| M12 Admin moderation | Asrar (scan endpoint) + Nazir | Nazir (OpenAI key) |
| M13 Soft delete | Nazir + Asrar | — |
| M14 i18n | Nazir (coordination + reviewers) + Mobile dev (TBD) | — |
| M15 Cross-cutting | All | — |

---

## Appendix B — Acceptance-criteria summary count

| Module | AC count | Module | AC count |
|---|---|---|---|
| M1 Auth | 13 | M9 Notifications | 8 |
| M2 Profile | 9 | M10 Subscription | 12 |
| M3 Job posting | 7 | M11 Verification | 9 |
| M4 Job discovery | 8 | M12 Moderation | 8 |
| M5 Application | 8 | M13 Soft delete | 8 |
| M6 Candidate mgmt | 7 | M14 i18n | 9 |
| M7 Interview | 8 | M15 Cross-cutting | 8 |
| M8 Chat | 8 | **Total** | **~130** |

---

## Appendix C — What this PRD intentionally does not say

- It does **not** restate the Charter, the codebase audit, the research doc, or the pricing memo. Those are referenced by file path so the PRD stays a build contract, not a re-litigation.
- It does **not** specify libraries, code snippets, schema field types, or test framework — the dev's call within locked scope.
- It does **not** include sprint-by-sprint task breakdowns — that's the **Sprint Plan** (next session).
- It does **not** include a Requirements Traceability Matrix — that's the **RTM** (next session).
- It does **not** include a test plan — that's the **Test Plan** (next session, after RTM).
- It does **not** include a Definition of Done — that's the **DoD** (next session).
- It does **not** mention Aadhaar verification of any kind outside the M1 Out-of-scope section, where it is recorded as **permanently removed** per Q3/Q4/Q11 revoked 2026-05-09.
- It does **not** mention escrow, commission, payment-intent, payouts, or platform-handled wages anywhere — out forever per Q12 revised 2026-05-09. Revenue is subscription-only.
- It does **not** mention WebSockets, voice transcription, or `.ics` calendar invites anywhere — scrubbed entirely per locked scope.

---

*End of v1 PRD.*
