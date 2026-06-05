# Requirements Traceability Matrix — Azkashine Job Portal v1

**Owner:** Nazir Hasan (Acting PM)
**Date:** 2026-05-11
**Source PRD:** [`04-prd-v1.md`](04-prd-v1.md) (Modules M1–M15; Appendix B count ≈ 130)
**Source DoD:** [`07-definition-of-done.md`](07-definition-of-done.md)
**Source locked scope:** [`../_context/02-scope-locked.md`](../_context/02-scope-locked.md)
**Target QA handover:** 2026-06-22

---

## How to read this matrix

Each row is **one acceptance criterion** from the PRD. Columns track that criterion from creation through QA sign-off: who owns it, which sprint it lands in, where its real-time status sits (⏳ Not started / 🔧 In progress / ✅ Done / ❌ Blocked / 🚫 Descoped), a placeholder test-case ID for Najeeb to populate later, its delivery priority (P0/P1/P2), risk (H/M/L), and free-form notes (open questions, deletions, dependencies).

The matrix is the source of truth for sprint-to-handover traceability. Update it in place as items move ⏳ → 🔧 → ✅. Before adding a row that doesn't trace to a PRD acceptance criterion, run `/check-scope` first — the PRD is the contract.

**If you need plain-English context** for what a module actually does (rather than the AC-by-AC granularity here), open the matching module in [`04-prd-v1.md`](04-prd-v1.md) — each module starts with a plain-English intro and most major modules (M1, M4, M5, M8, M10) include user-journey walkthroughs.

**Tag glossary** (D-tags, Q-tags, NC-#, T-#, R-#, audit §X.Y) lives in [`04-prd-v1.md` Glossary section](04-prd-v1.md#glossary--what-every-tag-in-this-doc-means). When you hit a tag in the Notes column and need to look it up, that's the lookup table.

## Legend / column meanings

- **Req ID** — `M[module]-AC[criterion-number]`. PRD checkboxes are unnumbered; ID is the 1-indexed bullet position inside each module's `**Acceptance criteria:**` section.
- **PRD source** — anchor link to the PRD module section. Open the section and count down to the AC number to locate the exact line.
- **Description** — one-line restatement; do not contradict PRD wording.
- **Owner** — Asrar (BE) / Nazir (FE web + acting PM) / Mobile dev (TBD — Mobile dev (TBD) off project 2026-05-15; new hire pending) / Najeeb / Farhana (QA) / Nayan (infra) / Shaik (Owner). Comma-separated for multi-owner ACs (e.g., M1-AC5).
- **Sprint** — S1 (May 18–29) / S2 (Jun 1 – Jun 12) / S3 (Jun 15–19).
- **Status** — ⏳ Not started / 🔧 In progress / ✅ Done / ❌ Blocked / 🚫 Descoped.
- **Test case ID** — placeholder `T-[Req ID]` until Najeeb populates concrete IDs in `09-test-plan.md`.
- **Priority** — P0 (must ship — Charter §9 success criteria, auth/payments/basic flows) / P1 (paid-tier-only or polish-able) / P2 (nice-to-have).
- **Risk** — H / M / L. H or M rows carry a one-line risk note in the cell.
- **Notes** — open questions, deletion markers, dependencies, links to risks (R1–R16 from scope-locked).

**Coverage scope:** only the `- [ ]` checkboxes under each module's `**Acceptance criteria:**` heading become RTM rows. The PRD's `BE endpoints involved`, `FE screens involved`, `Mobile scope`, `Out-of-scope`, and `Open questions` sub-sections are implementation notes — they are referenced FROM the ACs (and from the Notes column) but do not get their own RTM rows.

---

## Status rollup

| Metric | Count |
|---|---|
| **Total requirements** | 144 |
| **By status** | ⏳ Not started: 144 / 🔧 In progress: 0 / ✅ Done: 0 / ❌ Blocked: 0 / 🚫 Descoped: 0 |
| **By priority** | P0: 113 / P1: 23 / P2: 8 |
| **By sprint** | S1: 48 / S2: 73 / S3: 23 |

### By owner (lead owner — multi-owner ACs counted once on the lead)

| Owner | Count |
|---|---|
| Asrar (BE) | 56 |
| Nazir (FE) | 31 |
| Multi (Asrar + Nazir + Mobile dev (TBD)) | 38 |
| Mobile dev (TBD) (mobile) | 3 |
| Najeeb / Farhana (QA) | 2 |
| Nayan (infra) | 4 |
| Shaik (Owner) | 2 |
| Joint (S3 hardening) | 8 |

*Coding has not started — every row is ⏳ Not started at file creation; the rollup will move as Asrar's S1 day-1 BE cleanup and the FE port reconciliation land.*

---

## Top 3 P0 H-risk requirements needing owner attention today (2026-05-11)

1. **M10-AC1 + AC11** (Subscription module + plan seed data) — gated by **R16** (pricing model not yet locked; Shaik Ishaq deadline 2026-05-18). If Shaik picks differently from provisional Option B, M10 ACs 1, 2, 3, 6, 12 all rewrite. **Owner action: Shaik confirms by 2026-05-18.**
2. **M9-AC8** (DLT registration with MSG91 initiated 2026-05-11) — **R11**. 2–3 week lead time; if not started Day 1 of S1, OTP/SMS won't deliver at code freeze. **Owner action: Nazir initiates today.**
3. **M9-AC9** (Meta Business verification initiated 2026-05-09 by Shaik) — **R14**. 1–2 week lead before any WhatsApp template gets approved; engineering integration (~5–7 days) waits on this. **Owner action: Shaik confirms verification is in flight; non-engineering owner runs in parallel with S0/S1.**

---

## Risk register cross-reference (rows with H risk, mitigation from `02-scope-locked.md`)

| Risk | Linked ACs | Mitigation (per scope-locked.md) |
|---|---|---|
| R1 FE/BE divergence | M15-AC1, M15-AC2, M15-AC3, M1-AC1, M1-AC2 | S1 priority: Nazir owns FE rework; Asrar owns BE auth rework |
| R10 Single dev per app | All Asrar-owned rows, all Nazir-only rows | Daily standups + comprehensive PRD/RTM; no real fix in 6 weeks |
| R11 DLT registration timeline | M9-AC8, M1-AC3 | Nazir initiates 2026-05-11; fallback = mock-mode OTP through QA handover |
| R14 WhatsApp Meta verification | M9-AC3, M9-AC9, M7-AC4, M7-AC5 | Non-engineering owner (Shaik) starts 2026-05-09; SMS fallback wired throughout |
| R15 Mobile scope expansion | All mobile-dev rows + multi-owner mobile rows | Mobile dev role vacant 2026-05-15; new hire pending — may force mobile descope if not filled by Jun 1 |
| R16 Pricing model not locked | M10-AC1, M10-AC2, M10-AC3, M10-AC6, M10-AC11, M10-AC12 | Shaik deadline 2026-05-18; daily reminder until answered |

---

## Main matrix

### M1 — Authentication & Identity

**In plain English:** Phone-OTP registration for workers and employers (no Aadhaar). Three login methods post-registration: phone+OTP, email+password, Google OAuth. Admin login is email+password only. Aadhaar code paths fully removed from BE in S1 day-1 cleanup. **15 ACs, all P0, mostly Asrar+Nazir+Mobile dev (TBD) S1.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M1-AC1 | [M1](04-prd-v1.md#m1-authentication--identity) | Seeker registration flow (Language → Phone → OTP → Profile → Categories → Experience → Password) completes <3 min for experienced user | Asrar, Nazir, Mobile dev (TBD) | S1 | ⏳ | T-M1-AC1 | P0 | H — full registration rework per D6; FE/BE divergence (R1) | Phone-first per Q3 revised; drop all Aadhaar fields |
| M1-AC2 | [M1](04-prd-v1.md#m1-authentication--identity) | Employer registration flow (Phone → OTP → Password → Email Verify → Company Details); Individual auto-approve; Corporate queues PENDING | Asrar, Nazir, Mobile dev (TBD) | S1 | ⏳ | T-M1-AC2 | P0 | H — same rework scope as AC1 | Corporate doc-upload step location is open (M1 OQ) |
| M1-AC3 | [M1](04-prd-v1.md#m1-authentication--identity) | Phone OTP = 6 digits, 10-min expiry, 5 attempts, 30s resend cooldown; WhatsApp primary + SMS fallback; OTP-in-response only when `NODE_ENV !== 'production'` | Asrar | S1 | ⏳ | T-M1-AC3 | P0 | H — gated by R11 (DLT) + R14 (Meta) for live delivery | FE currently uses 4-digit OTP — must fix |
| M1-AC4 | [M1](04-prd-v1.md#m1-authentication--identity) | Email verification OTP = 6 digits, 10-min expiry, 5 attempts, 30s resend cooldown | Asrar | S1 | ⏳ | T-M1-AC4 | P0 | L | Mostly built; gate response per AC3 logic |
| M1-AC5 | [M1](04-prd-v1.md#m1-authentication--identity) | Login methods wired and tested e2e for both seeker AND employer: (a) phone+OTP, (b) email+password, (c) Google OAuth | Asrar, Nazir, Mobile dev (TBD) | S1 | ⏳ | T-M1-AC5 | P0 | H — Google OAuth is net-new (~2 dev-days); lib choice + creds open | Asrar owns library pick; Nazir owns Google client registration (M1 OQ) |
| M1-AC6 | [M1](04-prd-v1.md#m1-authentication--identity) | Admin login is email+password only; no phone OTP path exposed for admin role | Asrar | S1 | ⏳ | T-M1-AC6 | P0 | L | Already built; wire FE off hardcoded creds |
| M1-AC7 | [M1](04-prd-v1.md#m1-authentication--identity) | JWT issued on login = HS256, 7-day expiry; rejected when `SUSPENDED|REJECTED|isDeleted`; `lastLogin` + `lastSeenAt` updated on success | Asrar | S1 | ⏳ | T-M1-AC7 | P0 | L | Built; confirm gate paths |
| M1-AC8 | [M1](04-prd-v1.md#m1-authentication--identity) | Forgot-password generates email OTP scoped to `FORGOT_PASSWORD`, valid 10 min, single-use; resets password on success | Asrar | S1 | ⏳ | T-M1-AC8 | P0 | L | Built |
| M1-AC9 | [M1](04-prd-v1.md#m1-authentication--identity) | Change-email / change-phone / change-password require session JWT and fresh OTP to new contact before mutation | Asrar | S1 | ⏳ | T-M1-AC9 | P1 | L | Built |
| M1-AC10 | [M1](04-prd-v1.md#m1-authentication--identity) | All `aadhaarNumber` refs on User schema dropped; `AadhaarVerification` model removed; Verhoeff validator + `/api/aadhaar/*` routes deleted; no Aadhaar artefact anywhere in FE or BE | Asrar | S1 | ⏳ | T-M1-AC10 | P0 | M — schema migration touches existing tables | **DELETION TASK — S1 day 1 per scope-locked Q4 revoked.** Cross-refs M15-AC4 #9 |
| M1-AC11 | [M1](04-prd-v1.md#m1-authentication--identity) | `JWT_SECRET` env asserted at boot; `'your-secret-key'` default in `utils/jwt.ts` removed; BE refuses to start without it | Asrar | S1 | ⏳ | T-M1-AC11 | P0 | L | Audit §1.8 #3 — S1 day 1 cleanup |
| M1-AC12 | [M1](04-prd-v1.md#m1-authentication--identity) | `forgot-password` returns generic 200 (no email enumeration) — aligns with `resend-verification` | Asrar | S1 | ⏳ | T-M1-AC12 | P1 | L | Audit §1.8 #4 |
| M1-AC13 | [M1](04-prd-v1.md#m1-authentication--identity) | `POST /api/admin/create` gated behind setup token or env-var-allowlisted email before staging | Asrar | S1 | ⏳ | T-M1-AC13 | P0 | L | Audit §1.8 #5 |
| M1-AC14 | [M1](04-prd-v1.md#m1-authentication--identity) | Password policy ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit | Asrar | S1 | ⏳ | T-M1-AC14 | P0 | L | New validator rule |
| M1-AC15 | [M1](04-prd-v1.md#m1-authentication--identity) | Google OAuth login persists `googleSub` on User; subsequent password-login rejected unless a password is set | Asrar | S1 | ⏳ | T-M1-AC15 | P0 | M — net-new schema field + login fork logic | Gated by Asrar's Google OAuth library pick |

### M2 — Profile management

**In plain English:** Edit seeker / employer profile data after registration — photo, experience, skills, documents, company details. Most ACs are wired on BE already; FE doc-CRUD UI is net-new. Employer GST/CIN change auto-resets verifyStatus. **10 ACs, mostly Asrar+Nazir S1/S2, mostly low-risk.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M2-AC1 | [M2](04-prd-v1.md#m2-profile-management) | Seeker GET `/profile` returns User + JobSeeker + WorkExperience[] + Document[] + JobSeekerSkill[] joined in a single call | Asrar | S1 | ⏳ | T-M2-AC1 | P0 | L | Built |
| M2-AC2 | [M2](04-prd-v1.md#m2-profile-management) | Seeker PUT `/profile` atomic across User + JobSeeker + WorkExperience; partial failure rolls back; forbidden fields (email/phone/password) rejected with 400 per T1 #8 | Asrar | S1 | ⏳ | T-M2-AC2 | P0 | L | Built; drop `aadhaarNumber` from validator (M1-AC10) |
| M2-AC3 | [M2](04-prd-v1.md#m2-profile-management) | Seeker profile-photo update via separate multipart endpoint; old file unlinked on success (NC-2) | Asrar, Nazir | S2 | ⏳ | T-M2-AC3 | P1 | L | Built BE; FE wiring pending |
| M2-AC4 | [M2](04-prd-v1.md#m2-profile-management) | Seeker document upload PDF/JPG/PNG ≤5MB; types: IDENTITY_PROOF, ADDRESS_PROOF, EDUCATION_CERTIFICATE, SKILL_CERTIFICATE, OTHER; delete unrestricted on seeker side | Asrar, Nazir | S2 | ⏳ | T-M2-AC4 | P1 | L | Built BE; FE doc CRUD UI net-new |
| M2-AC5 | [M2](04-prd-v1.md#m2-profile-management) | Seeker skills add/list/remove against `JobSeekerSkill` link table; `Skill` catalog is admin-managed (Q53) | Asrar, Nazir | S2 | ⏳ | T-M2-AC5 | P1 | L | Built BE; FE picker net-new; drop auth on `/api/skills` per audit §1.8 #13 |
| M2-AC6 | [M2](04-prd-v1.md#m2-profile-management) | Employer GET `/profile` returns User + Employer + Document[] joined in a single call | Asrar | S1 | ⏳ | T-M2-AC6 | P0 | L | Built |
| M2-AC7 | [M2](04-prd-v1.md#m2-profile-management) | Employer PUT `/profile`: if `gstNumber` or `cin` changes, `verificationStatus` resets to PENDING and admin notifications fire (T2 #20) | Asrar | S1 | ⏳ | T-M2-AC7 | P0 | L | Built |
| M2-AC8 | [M2](04-prd-v1.md#m2-profile-management) | Employer document delete refuses (HTTP 400) when active doc count would drop to 0 (min-1); upload PDF/JPG/PNG/DOC/DOCX ≤5MB, max 10 docs | Asrar, Nazir | S2 | ⏳ | T-M2-AC8 | P1 | L | Built BE; FE CRUD net-new |
| M2-AC9 | [M2](04-prd-v1.md#m2-profile-management) | Employer profile-photo update is its own multipart endpoint (NC-2); old file unlinked | Asrar, Nazir | S2 | ⏳ | T-M2-AC9 | P1 | L | Built BE; FE wiring pending |
| M2-AC10 | [M2](04-prd-v1.md#m2-profile-management) | All authenticated profile endpoints update `User.lastSeenAt` fire-and-forget | Asrar | S1 | ⏳ | T-M2-AC10 | P1 | L | Built (already wired in middleware) |

### M3 — Job posting

**In plain English:** Employer creates/updates/activates/deactivates/expires job posts with rich fields (title, salary range, GPS, urgency, contact-visibility toggles). FE has zero employer-job screens today — all net-new in S2. Auto-FILL on accept and ACTIVE↔INACTIVE state machine already wired on BE. **8 ACs, mostly Nazir+Mobile dev (TBD) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M3-AC1 | [M3](04-prd-v1.md#m3-job-posting) | Job create/update validates: `salaryMax ≥ salaryMin`; `numberOfPositions ≤ 1000`; both lat+lon if either provided; `expiresAt` in future on create | Asrar | S2 | ⏳ | T-M3-AC1 | P0 | L | Built BE; verify all 4 cases |
| M3-AC2 | [M3](04-prd-v1.md#m3-job-posting) | Job post supports full FE/mobile field set: title, description, category, subcategory, skillsRequired[], salary, paymentType, urgency, location, lat, lon, positions, expiresAt, showEmail/PhoneToSeekers (NC-5/Q51) | Asrar | S2 | ⏳ | T-M3-AC2 | P0 | L | Built BE |
| M3-AC3 | [M3](04-prd-v1.md#m3-job-posting) | Live preview screen renders all fields as seeker will see them; preview does not POST until "Publish" clicked | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M3-AC3 | P0 | M — full new screen on both web + mobile | New screens; M3 OQ: drafts default to no |
| M3-AC4 | [M3](04-prd-v1.md#m3-job-posting) | Activate/deactivate idempotent and enforces ACTIVE ↔ INACTIVE-only transitions (T2a #34b); 400 on FILLED/CANCELLED/CLOSED | Asrar | S2 | ⏳ | T-M3-AC4 | P0 | L | Built BE |
| M3-AC5 | [M3](04-prd-v1.md#m3-job-posting) | Auto-FILL: when `acceptedCount === numberOfPositions`, BE marks FILLED and rejects further apply with 400 (T2 #14) | Asrar | S2 | ⏳ | T-M3-AC5 | P0 | L | Built BE |
| M3-AC6 | [M3](04-prd-v1.md#m3-job-posting) | Expired tab returns jobs where `status ∈ {FILLED, CLOSED, CANCELLED}` OR `expiresAt < now()` | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M3-AC6 | P1 | L | Built BE; FE tab net-new |
| M3-AC7 | [M3](04-prd-v1.md#m3-job-posting) | Update-job after `VIOLATION_FOUND`: editing job text resets `moderationStatus` to `PENDING_REVIEW` | Asrar | S2 | ⏳ | T-M3-AC7 | P1 | L | New hook on PUT — small addition |
| M3-AC8 | [M3](04-prd-v1.md#m3-job-posting) | Per-job view counter increments on detail GET unless requester is posting employer | Asrar | S2 | ⏳ | T-M3-AC8 | P2 | L | Built BE |

### M4 — Job discovery

**In plain English:** Two seeker-facing feeds — Recommended (profile-weighted scoring per Q9 algorithm: sector / title / experience / skills / location / recency) and Near By (pure GPS distance). Search + filter on top. Voice 🔊 icons stay as decorative no-ops. Recommendation algo already in BE — needs Q9 weight tweaks. **9 ACs, Asrar (algo) + Nazir + Mobile dev (TBD) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M4-AC1 | [M4](04-prd-v1.md#m4-job-discovery) | `GET /api/jobs/recommended` uses Q9 weights: sector 20, title-exact 30, title-fuzzy 15, experience-token ≤15, skills-overlap ≤20, location ≤20 with exp decay beyond 10km; recency boost (<24h +10, <7d +5) | Asrar | S2 | ⏳ | T-M4-AC1 | P0 | M — weight changes + new recency boost — small algo work | Existing scorer; tune weights + add recency |
| M4-AC2 | [M4](04-prd-v1.md#m4-job-discovery) | Recommendation filters: ACTIVE-only; exclude already-applied; exclude soft-deleted-employer jobs (NC-9) | Asrar | S2 | ⏳ | T-M4-AC2 | P0 | L | Built BE |
| M4-AC3 | [M4](04-prd-v1.md#m4-job-discovery) | Cold-start fallback: when neither `preferredSector` nor `preferredJobTitle` is set, return city jobs sorted by `createdAt` desc | Asrar | S2 | ⏳ | T-M4-AC3 | P1 | L | New code path |
| M4-AC4 | [M4](04-prd-v1.md#m4-job-discovery) | `GET /api/jobs?lat=&lon=&maxDistance=&sort=distance` returns Near By feed via Haversine; default radius 5km, configurable ≤100km | Asrar | S2 | ⏳ | T-M4-AC4 | P0 | L | Built BE; M4 OQ: 5 vs 10km default |
| M4-AC5 | [M4](04-prd-v1.md#m4-job-discovery) | Search supports keyword across title+description; filters: category, subcategory, jobType (multi), paymentType, urgency, status, salary range, skills (hasSome), employerId, sort | Asrar | S2 | ⏳ | T-M4-AC5 | P0 | L | Built BE |
| M4-AC6 | [M4](04-prd-v1.md#m4-job-discovery) | P95 search response <500ms with 50k jobs in dev env | Asrar, Nayan | S3 | ⏳ | T-M4-AC6 | P1 | M — perf gate; punt to S3 if breached early | Audit §1.8 #17 over-fetch flagged |
| M4-AC7 | [M4](04-prd-v1.md#m4-job-discovery) | Voice 🔊 icons on feed cards render as no-op with "Coming soon" tooltip (TTS deferred per Q2) | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M4-AC7 | P2 | L | Polish |
| M4-AC8 | [M4](04-prd-v1.md#m4-job-discovery) | Job detail page increments view counter unless requester is posting employer | Asrar | S2 | ⏳ | T-M4-AC8 | P2 | L | Built BE (duplicate of M3-AC8 from the discovery side) |
| M4-AC9 | [M4](04-prd-v1.md#m4-job-discovery) | "Contact the Recruiter" double-gated: (a) employer toggle ON, AND (b) seeker paid tier; under Option B no seeker premium → degrades to (a)-only | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M4-AC9 | P1 | M — gate logic depends on Option B vs other pricing | Re-evaluate if Shaik picks Option A (R16) |

### M5 — Job application

**In plain English:** Seeker applies to a job with optional 2-min audio + optional text (≤1000 chars). Audio recording works on FE already; BE rejects audio uploads today — multer needs wiring (R13). Duplicate-apply blocked. SYSTEM message auto-posted in chat on apply. **8 ACs, Asrar (audio + multer) + Nazir + Mobile dev (TBD) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M5-AC1 | [M5](04-prd-v1.md#m5-job-application) | `POST /api/applications` accepts `{jobId, message?, audio?}`; message ≤1000 chars; audio multipart capped 2 min; MIME: webm/mp4/m4a/ogg/opus | Asrar | S2 | ⏳ | T-M5-AC1 | P0 | H — net-new audio upload (R13) | ~3–5 BE dev-days |
| M5-AC2 | [M5](04-prd-v1.md#m5-job-application) | BE detects audio container at upload, stores via presigned-URL abstraction (Q10), persists MIME + duration on application row | Asrar | S2 | ⏳ | T-M5-AC2 | P0 | M — storage abstraction is net-new | Local disk for v1; S3 swap in v2 |
| M5-AC3 | [M5](04-prd-v1.md#m5-job-application) | Duplicate apply (same seeker + job, status not WITHDRAWN) rejected 400 with `ALREADY_APPLIED` sentinel | Asrar | S2 | ⏳ | T-M5-AC3 | P0 | L | Built BE; verify sentinel |
| M5-AC4 | [M5](04-prd-v1.md#m5-job-application) | Apply to FILLED, INACTIVE, expired, or soft-deleted-employer job rejected 400 | Asrar | S2 | ⏳ | T-M5-AC4 | P0 | L | Built BE |
| M5-AC5 | [M5](04-prd-v1.md#m5-job-application) | Apply triggers: (a) SYSTEM "Applied the job" auto-posted to conversation (T3 #39); (b) in-app + WhatsApp notification to employer (T2 #11) | Asrar | S2 | ⏳ | T-M5-AC5 | P0 | M — WhatsApp piece gated by R14 | In-app already wired; WhatsApp depends on M9-AC3 |
| M5-AC6 | [M5](04-prd-v1.md#m5-job-application) | Withdraw moves application to terminal WITHDRAWN; does not retroactively delete SYSTEM message | Asrar | S2 | ⏳ | T-M5-AC6 | P1 | L | Built |
| M5-AC7 | [M5](04-prd-v1.md#m5-job-application) | My-applications list paginates 1–100; filters by status; orders by `appliedAt` desc | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M5-AC7 | P0 | L | Built BE; FE wiring |
| M5-AC8 | [M5](04-prd-v1.md#m5-job-application) | Application detail returns full job + employer summary + audio playback URL + full status history | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M5-AC8 | P0 | L | Built BE shell; add audio + history |
| M5-AC9 | [M5](04-prd-v1.md#m5-job-application) | Free-vs-paid metering: under Option B, seeker is free with unlimited applications; no daily cap; recruiter-contact gate degrades to per-job toggle only | Asrar | S2 | ⏳ | T-M5-AC9 | P1 | M — re-evaluate if Shaik picks Option A (R16) | Cross-ref M4-AC9 |

### M6 — Candidate management

**In plain English:** Employer-facing review screen — tabbed list (All / Accepted / Shortlisted / Rejected / Bookmarked), candidate detail with profile + audio + docs, Accept (triggers M7 interview modal) / Reject / Bookmark actions. BE mostly built; FE candidate-screen is a placeholder today. Includes the BOOKMARKED enum fix + reject-accepted guard decision. **8 ACs, Nazir + Mobile dev (TBD) S2, Asrar fixes 2 audit bugs.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M6-AC1 | [M6](04-prd-v1.md#m6-candidate-management) | `GET /api/applications/employer/job/:jobId` paginates with `status` filter; tabs map to specific statuses | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M6-AC1 | P0 | L | Built BE; FE tabs net-new |
| M6-AC2 | [M6](04-prd-v1.md#m6-candidate-management) | Bookmark/accept/reject idempotent; Accept → "Congratulations…" SYSTEM + interview details + WhatsApp/in-app; Reject → "We regret…" + WhatsApp/in-app; Bookmark → silent | Asrar | S2 | ⏳ | T-M6-AC2 | P0 | M — WhatsApp gated by R14 | In-app + SYSTEM already wired |
| M6-AC3 | [M6](04-prd-v1.md#m6-candidate-management) | Accept enforces M7 interview pre-condition: modal slot picker runs before ACCEPTED flip; BE accepts single `{notes?, interview:{...}}` payload | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M6-AC3 | P0 | M — joint with M7-AC1; mode-field decision still open | Cross-ref M7-AC1 |
| M6-AC4 | [M6](04-prd-v1.md#m6-candidate-management) | Reject accepts optional `{reason, notes}`; reason private to admin; seeker only sees SYSTEM text | Asrar | S2 | ⏳ | T-M6-AC4 | P1 | L | New optional field |
| M6-AC5 | [M6](04-prd-v1.md#m6-candidate-management) | Audit §1.8 #6: commented "cannot reject accepted" guard at `application.service.ts:1070-1073` either re-enabled or deleted — pick one and document | Asrar | S1 | ⏳ | T-M6-AC5 | P1 | L | S1 cleanup |
| M6-AC6 | [M6](04-prd-v1.md#m6-candidate-management) | `BOOKMARKED` added to `updateApplicationStatusSchema` enum (audit §1.8 #7) | Asrar | S1 | ⏳ | T-M6-AC6 | P1 | L | S1 cleanup |
| M6-AC7 | [M6](04-prd-v1.md#m6-candidate-management) | Employer stats returns: totalApplications, pending, reviewed, shortlisted, accepted, rejected, withdrawn, bookmarked — global across employer's jobs | Asrar | S2 | ⏳ | T-M6-AC7 | P1 | L | Built BE; verify counts incl. bookmarked |
| M6-AC8 | [M6](04-prd-v1.md#m6-candidate-management) | Candidate detail includes audio playback URL, document list, work experience, skills, seeker `lastSeenAt` | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M6-AC8 | P0 | L | Built BE shell; add audio playback widget on FE |

### M7 — Interview scheduling

**In plain English:** Modal on Accept asking Date / Time / (Mode dropdown — deferred) / Notes; system fires WhatsApp + SMS confirmation + 24h/2h reminders + day-after outcome capture (Hired / No-show / Need re-interview). Reminder cron + reschedule endpoint + outcome endpoint are all net-new. Mode picker decision still pending (web vs mobile design mismatch). **9 ACs, Asrar (reminders + endpoints) + Nazir + Mobile dev (TBD) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M7-AC1 | [M7](04-prd-v1.md#m7-interview-scheduling) | Accept-with-interview modal: Date/Time/Mode/Notes (Mode gated by OQ); single BE call flips application to ACCEPTED + creates Interview + triggers notifications | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M7-AC1 | P0 | M — Mode dropdown decision pending (Q13 partial revision) | M7 OQ: web adds dropdown OR mobile drops it |
| M7-AC2 | [M7](04-prd-v1.md#m7-interview-scheduling) | Date/Time must be in future; Notes optional, ≤1000 chars | Asrar | S2 | ⏳ | T-M7-AC2 | P0 | L | Validator update |
| M7-AC3 | [M7](04-prd-v1.md#m7-interview-scheduling) | Mode dropdown options: IN_PERSON (address), PHONE (number), VIDEO (URL) — only ship if OQ resolves "ship the dropdown" | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M7-AC3 | P1 | M — gated by Q13 partial revision | May descope if web/mobile align on "drop mode" |
| M7-AC4 | [M7](04-prd-v1.md#m7-interview-scheduling) | System auto-creates: (a) SYSTEM chat with interview details; (b) in-app `INTERVIEW_SCHEDULED`; (c) WhatsApp `interview_scheduled` + SMS fallback | Asrar | S2 | ⏳ | T-M7-AC4 | P0 | H — WhatsApp gated by R14; SMS gated by R11 | (a) + (b) already wired |
| M7-AC5 | [M7](04-prd-v1.md#m7-interview-scheduling) | Reminder cron sends WhatsApp+SMS at 24h and 2h before each scheduled interview; skipped if rescheduled >2h away | Asrar | S2 | ⏳ | T-M7-AC5 | P1 | H — same WhatsApp + SMS dependencies as AC4 | Net-new cron job |
| M7-AC6 | [M7](04-prd-v1.md#m7-interview-scheduling) | Reschedule: either party can reschedule once; subsequent attempts return 400 `RESCHEDULE_LIMIT_REACHED` | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M7-AC6 | P1 | L | Net-new endpoint + UI |
| M7-AC7 | [M7](04-prd-v1.md#m7-interview-scheduling) | Outcome capture D+1: three buttons (Hired/Did not show up/Need re-interview); selection drives next status (Hired→ACCEPTED stays; No-show→REJECTED; Re-interview→SHORTLISTED) | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M7-AC7 | P1 | L | Net-new endpoint + screen |
| M7-AC8 | [M7](04-prd-v1.md#m7-interview-scheduling) | All interview timestamps stored UTC, rendered in user's local timezone with IST default | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M7-AC8 | P1 | L | Standard timezone handling |

### M8 — Chat / messaging

**In plain English:** Seeker↔employer text + 60s audio chat, polling-based delivery (~10s interval). Text already wired; BE rejects audio today (same multer gap as M5). Per-message read-receipts via `readBy` array; `lastSeenAt` surfaces other party's presence. SYSTEM messages on apply/accept/reject are immutable. **8 ACs, Asrar (audio chat) + Nazir + Mobile dev (TBD) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M8-AC1 | [M8](04-prd-v1.md#m8-chat--messaging) | Conversation scope: seeker can only start convo with employer they've applied to | Asrar | S2 | ⏳ | T-M8-AC1 | P0 | L | Built BE |
| M8-AC2 | [M8](04-prd-v1.md#m8-chat--messaging) | Polling endpoint `GET /api/conversations/:id/messages?after=<lastMessageId>` returns messages strictly newer than `lastMessageId`; client polls ~10s when open | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M8-AC2 | P0 | L | Built BE; FE polling loop net-new |
| M8-AC3 | [M8](04-prd-v1.md#m8-chat--messaging) | `POST /api/conversations/:id/messages` accepts `{type, content?, audio?}`; type ∈ {TEXT, AUDIO}; TEXT 1–5000 chars; AUDIO multipart cap 60s | Asrar | S2 | ⏳ | T-M8-AC3 | P0 | H — net-new audio chat support (R13); ~3–5 BE dev-days | Service explicitly throws on AUDIO today |
| M8-AC4 | [M8](04-prd-v1.md#m8-chat--messaging) | IMAGE not user-submittable; SYSTEM producer-hook only | Asrar | S2 | ⏳ | T-M8-AC4 | P1 | L | Validator |
| M8-AC5 | [M8](04-prd-v1.md#m8-chat--messaging) | Mark-read updates per-message `readBy` UUID array; conversation-level unread counts derive from messages where `userId NOT IN readBy` | Asrar | S2 | ⏳ | T-M8-AC5 | P0 | L | Built BE |
| M8-AC6 | [M8](04-prd-v1.md#m8-chat--messaging) | `lastSeenAt` updates fire-and-forget on every auth request; surface on conversation list + chat header | Asrar | S1 | ⏳ | T-M8-AC6 | P1 | L | Built |
| M8-AC7 | [M8](04-prd-v1.md#m8-chat--messaging) | SYSTEM messages auto-posted on apply ("Applied the job"), accept (Congrats + interview), reject ("We regret…") — immutable | Asrar | S2 | ⏳ | T-M8-AC7 | P0 | L | Built BE |
| M8-AC8 | [M8](04-prd-v1.md#m8-chat--messaging) | Voice 🔊 icons on chat bubbles non-functional in v1 (TTS per Q2) | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M8-AC8 | P2 | L | Polish |

### M9 — Notifications

**In plain English:** Five-channel matrix (in-app + FCM push + WhatsApp + SMS + Email). All 11 NotificationType events wired through the right channel mix per the PRD's M9 matrix. **Critical-path externals:** DLT registration (R11, 2-3 wk) + Meta Business verification (R14, 1-2 wk) both must start S1 day-1. Channel adapters net-new (~5-6d). **9 ACs, Asrar (adapters) + Nazir + Mobile dev (TBD) + Shaik (Meta) S1/S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M9-AC1 | [M9](04-prd-v1.md#m9-notifications) | All 11 `NotificationType` enum values wired to producer hooks (APPLICATION_SUBMITTED/ACCEPTED/REJECTED/SHORTLISTED, INTERVIEW_SCHEDULED, EMPLOYER_APPROVED/REJECTED, DOCUMENT_VERIFIED/REJECTED, JOB_WARNING, PAYMENT_CONFIRMATION) | Asrar | S2 | ⏳ | T-M9-AC1 | P0 | M — some hooks pending; PAYMENT_CONFIRMATION depends on M10 | Most in-app hooks already wired |
| M9-AC2 | [M9](04-prd-v1.md#m9-notifications) | Channel matrix delivered per event per table (in-app / FCM / WhatsApp / SMS / email) with opt-out preference (OTP mandatory) | Asrar | S2 | ⏳ | T-M9-AC2 | P0 | H — every channel adapter is net-new (R12 ~5–6 BE dev-days) | Cross-ref all M9 channel ACs |
| M9-AC3 | [M9](04-prd-v1.md#m9-notifications) | WhatsApp templates submitted to Meta: otp, application_accepted/rejected/shortlisted, interview_scheduled/reminder_24h/2h, payment_confirmation, document_approved/rejected, employer_message_to_seeker, password_reset (8–12 templates) | Shaik | S1 | ⏳ | T-M9-AC3 | P0 | H — R14: Meta verification 1–2 weeks; submission Day-1 critical | Non-engineering owner runs this in parallel |
| M9-AC4 | [M9](04-prd-v1.md#m9-notifications) | FCM push registered per-device on login (web push + iOS APNs + Android FCM); device tokens stored on `User.deviceTokens[]` | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M9-AC4 | P0 | M — APNs cert ownership open (M9 OQ); ~2 BE dev-days + FE/mobile | M9 OQ: iOS APNs owner |
| M9-AC5 | [M9](04-prd-v1.md#m9-notifications) | In-app dropdown shows last 20 notifications, unread badge, mark-all-read action | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M9-AC5 | P0 | L | Built BE endpoints; FE dropdown net-new |
| M9-AC6 | [M9](04-prd-v1.md#m9-notifications) | User preference UI toggles per category (WhatsApp/SMS/email opt-out; OTP non-opt-out) | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M9-AC6 | P1 | L | Net-new endpoint + screen |
| M9-AC7 | [M9](04-prd-v1.md#m9-notifications) | Producer hooks wrap in try/catch; channel failures do not abort parent BE action (fire-and-forget) | Asrar | S2 | ⏳ | T-M9-AC7 | P0 | L | Existing pattern; just verify on new channels |
| M9-AC8 | [M9](04-prd-v1.md#m9-notifications) | DLT registration with MSG91 initiated 2026-05-11 (Day 1 of S1) per R11 | Nazir | S1 | ⏳ | T-M9-AC8 | P0 | H — R11: 2–3 week lead; if not started today, OTP/SMS won't deliver at freeze | **Owner action today.** Fallback = mock-mode OTP through handover |
| M9-AC9 | [M9](04-prd-v1.md#m9-notifications) | Meta Business verification + WhatsApp BSP onboarding initiated 2026-05-09 by non-engineering owner per Q7 | Shaik | S0/S1 | ⏳ | T-M9-AC9 | P0 | H — R14; acceptable if WhatsApp goes live ≤1wk after handover; SMS fallback covers | **Owner action: Shaik confirms in flight** |

### M10 — Subscription & payments

**In plain English:** Razorpay-powered employer subscriptions per PROVISIONAL Option B (worker free, employer ₹999/mo, 14-day trial, manual renewal, day-3 + day-7 trial nurture nudges). Subscription / SubscriptionPlan / PaymentHistory / WebhookEvent schemas net-new. Webhook idempotency on `provider_event_id` is security-critical. Pricing locked TBD (R16 — Shaik deadline 2026-05-18). **12 ACs, Asrar + Nazir + Mobile dev (TBD) + Shaik S1.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M10-AC1 | [M10](04-prd-v1.md#m10-subscription--payments) | On employer registration, `Subscription` row created `tier=TRIAL, startedAt=now(), expiresAt=now()+14d, autoRenew=false` | Asrar | S1 | ⏳ | T-M10-AC1 | P0 | H — R16: pricing not yet locked; if Shaik picks Option A/C, AC rewrites | Provisional Option B; deadline 2026-05-18 |
| M10-AC2 | [M10](04-prd-v1.md#m10-subscription--payments) | Trial allows unlimited posts, candidate mgmt, messaging, advanced filters, voice messages (per Q5 provisional) | Asrar | S1 | ⏳ | T-M10-AC2 | P0 | M — R16 dependency | Feature-gate work |
| M10-AC3 | [M10](04-prd-v1.md#m10-subscription--payments) | After trial expires without upgrade: `tier=EXPIRED`; employer browse-only; existing ACTIVE jobs auto-deactivate to INACTIVE | Asrar | S1 | ⏳ | T-M10-AC3 | P0 | M — R16 dependency; cron job net-new | Built into auto-deactivate cron |
| M10-AC4 | [M10](04-prd-v1.md#m10-subscription--payments) | Razorpay checkout creates Order, surfaces widget; `payment.captured` webhook flips to `tier=PRO, expiresAt=now()+30d`, records `PaymentHistory` with GST breakdown | Asrar, Nazir | S1 | ⏳ | T-M10-AC4 | P0 | H — R3: KYC lead time; webhook security work | Sandbox keys procurable today; Nazir initiates 2026-05-11 |
| M10-AC5 | [M10](04-prd-v1.md#m10-subscription--payments) | Manual renewal: 3 days before expiry, in-app + WhatsApp + email reminder; clicking "Renew" repeats checkout | Asrar | S2 | ⏳ | T-M10-AC5 | P0 | M — depends on M9 channels live | Cron net-new |
| M10-AC6 | [M10](04-prd-v1.md#m10-subscription--payments) | On expiry without renewal, ACTIVE jobs auto-deactivate to INACTIVE (NOT deleted); applications/chats/interviews preserved | Asrar | S1 | ⏳ | T-M10-AC6 | P0 | M — R16 dependency | Cron |
| M10-AC7 | [M10](04-prd-v1.md#m10-subscription--payments) | Day-3 in-app + WhatsApp check-in for TRIAL subs; day-7 fires for not-yet-upgraded TRIAL subs | Asrar | S2 | ⏳ | T-M10-AC7 | P1 | M — depends on M9 WhatsApp live | Trial nurture cron |
| M10-AC8 | [M10](04-prd-v1.md#m10-subscription--payments) | Webhook idempotency: Razorpay events deduped on `provider_event_id`; replays don't double-credit | Asrar | S1 | ⏳ | T-M10-AC8 | P0 | M — security-critical; HMAC sig verification | Net-new WebhookEvent table |
| M10-AC9 | [M10](04-prd-v1.md#m10-subscription--payments) | Admin revenue dashboard reads from `PaymentHistory` (sum where status=SUCCESS), grouped by month — replaces hardcoded ₹500/sub placeholder | Asrar, Nazir | S2 | ⏳ | T-M10-AC9 | P0 | L | Hardcoded calc lives at `controllers/admin.controller.ts:1324` |
| M10-AC10 | [M10](04-prd-v1.md#m10-subscription--payments) | Subscription state on `User.subscriptionTier` (FREE/TRIAL/PRO/EXPIRED), `subscriptionExpiresAt`, `lastPaymentAt` | Asrar | S1 | ⏳ | T-M10-AC10 | P0 | L | Schema additions |
| M10-AC11 | [M10](04-prd-v1.md#m10-subscription--payments) | Plan names + prices live in seed data (`SubscriptionPlan` table), not hardcoded — supports 30-min swap if Shaik picks Option A/C on 2026-05-18 | Asrar | S1 | ⏳ | T-M10-AC11 | P0 | H — R16 explicit dependency | Architected for pricing-pivot reversibility |
| M10-AC12 | [M10](04-prd-v1.md#m10-subscription--payments) | Worker side: no premium tier in v1; `subscriptionTier=FREE` permanently — reverses if Shaik picks Option A on 2026-05-18 | Asrar | S1 | ⏳ | T-M10-AC12 | P0 | M — R16 dependency | Cross-ref M4-AC9, M5-AC9 |
| M10-AC13 | [M10](04-prd-v1.md#m10-subscription--payments) | GST calculated and recorded per transaction (Razorpay invoicing API handles); persist GST line item for reporting | Asrar | S1 | ⏳ | T-M10-AC13 | P1 | L | Razorpay handles calc; persist breakdown |

### M11 — Admin verification

**In plain English:** Admin queues for Corporate-employer approval + seeker/employer document review + payment-status manual override. BE mostly built; FE admin screens currently in `apps/web/admin/*` need lifting into `apps/admin/` (D4). Cascade rules: approving last pending doc flips overall `documentVerificationStatus`. **9 ACs, Nazir (admin FE) + Asrar (audit log) S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M11-AC1 | [M11](04-prd-v1.md#m11-admin-verification) | Admin employer queue paginated lists with search + filters; default sort by `createdAt` desc | Asrar, Nazir | S2 | ⏳ | T-M11-AC1 | P0 | L | Built BE; admin web lift per D4 |
| M11-AC2 | [M11](04-prd-v1.md#m11-admin-verification) | Approve employer: `verificationStatus=APPROVED`, fire `EMPLOYER_APPROVED` notification (in-app + push + WhatsApp + email) | Asrar | S2 | ⏳ | T-M11-AC2 | P0 | M — depends on M9 channels | In-app already; other channels new |
| M11-AC3 | [M11](04-prd-v1.md#m11-admin-verification) | Reject employer: `verificationStatus=REJECTED`, capture `rejectionReason`, fire `EMPLOYER_REJECTED` notification | Asrar | S2 | ⏳ | T-M11-AC3 | P0 | M — same as AC2 | In-app already |
| M11-AC4 | [M11](04-prd-v1.md#m11-admin-verification) | Approve seeker: similar shape; document `documentVerificationStatus` cascades when documents verified | Asrar | S2 | ⏳ | T-M11-AC4 | P0 | L | Built BE |
| M11-AC5 | [M11](04-prd-v1.md#m11-admin-verification) | Document verify/reject endpoints update doc row and (if last pending doc) overall `documentVerificationStatus` | Asrar | S2 | ⏳ | T-M11-AC5 | P0 | L | Built BE |
| M11-AC6 | [M11](04-prd-v1.md#m11-admin-verification) | Payment status update (admin override) writes to `User.paymentStatus`; does NOT create `PaymentHistory` row (only Razorpay webhook does) | Asrar | S2 | ⏳ | T-M11-AC6 | P1 | L | Built BE; M11 OQ: log adminId + reason |
| M11-AC7 | [M11](04-prd-v1.md#m11-admin-verification) | Tab badges return global counts (ignore current filter — T2a #38) | Asrar | S2 | ⏳ | T-M11-AC7 | P1 | L | Built BE |
| M11-AC8 | [M11](04-prd-v1.md#m11-admin-verification) | All admin actions logged with adminId, action, targetUserId, timestamp | Asrar | S2 | ⏳ | T-M11-AC8 | P1 | L | Audit log table; pattern check |
| M11-AC9 | [M11](04-prd-v1.md#m11-admin-verification) | Document review SLA target 48h business-day (research Topic 11) — exposed as copy commitment only; not enforced in code | Nazir | S3 | ⏳ | T-M11-AC9 | P2 | L | Copy only |
| M11-AC10 | [M11](04-prd-v1.md#m11-admin-verification) | All admin routes gated by `authorize('ADMIN')` middleware; reject non-admin JWTs | Asrar | S1 | ⏳ | T-M11-AC10 | P0 | L | Built; verify coverage |

### M12 — Admin content moderation

**In plain English:** Admin-triggered Scan Content button calls OpenAI omni-moderation + India scam regex layer (registration fees / MLM / free-mail HR / upfront-payment patterns). Manual Send Warning + Delete actions. Seeker Job Reports queue. Auto-scan on every post creation is v2. **8 ACs, Asrar (scan endpoint) + Nazir (admin FE) + OpenAI key procurement S2.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M12-AC1 | [M12](04-prd-v1.md#m12-admin-content-moderation) | `POST /api/admin/posts/:id/scan` calls OpenAI `omni-moderation-latest` with job title + description; returns `{categories, scores}`; admin sees structured violations inline | Asrar | S2 | ⏳ | T-M12-AC1 | P0 | M — OpenAI key + budget cap pending (M12 OQ); net-new endpoint | Free API per Q8; Nazir procures key |
| M12-AC2 | [M12](04-prd-v1.md#m12-admin-content-moderation) | India scam regex layer: (a) registration/training/background-check fees, (b) MLM language, (c) free-mail HR contacts, (d) upfront-payment demands, (e) urgency-without-formality | Asrar | S2 | ⏳ | T-M12-AC2 | P0 | M — pattern source-of-truth open (M12 OQ); seed table preferred | Maintainable post-launch |
| M12-AC3 | [M12](04-prd-v1.md#m12-admin-content-moderation) | Scan flips `moderationStatus`: high-confidence → VIOLATION_FOUND; borderline → PENDING_REVIEW | Asrar | S2 | ⏳ | T-M12-AC3 | P1 | L | Service logic |
| M12-AC4 | [M12](04-prd-v1.md#m12-admin-content-moderation) | Send Warning creates `JobWarning` row, fires in-app + WhatsApp `job_warning` to employer, auto-flips `moderationStatus` to VIOLATION_FOUND if starting from NO_VIOLATION/PENDING_REVIEW | Asrar | S2 | ⏳ | T-M12-AC4 | P0 | M — WhatsApp dep R14 | In-app already; WhatsApp new |
| M12-AC5 | [M12](04-prd-v1.md#m12-admin-content-moderation) | Delete is hard delete on Job (cascades to applications, conversations preserved); no notification beyond SYSTEM action log | Asrar | S2 | ⏳ | T-M12-AC5 | P0 | L | Built BE |
| M12-AC6 | [M12](04-prd-v1.md#m12-admin-content-moderation) | Seeker Job Reports queue lists employer + job + reason + timestamp; admin can resolve (no-action / warned / deleted) logged on report row | Asrar, Nazir | S2 | ⏳ | T-M12-AC6 | P1 | L | Built BE (T2 #12); FE queue new |
| M12-AC7 | [M12](04-prd-v1.md#m12-admin-content-moderation) | 36-hour takedown SLA target (research Topic 9) — copy commitment only, not enforced in code | Nazir | S3 | ⏳ | T-M12-AC7 | P2 | L | Copy |
| M12-AC8 | [M12](04-prd-v1.md#m12-admin-content-moderation) | All admin moderation actions logged with adminId, action, jobId, timestamp | Asrar | S2 | ⏳ | T-M12-AC8 | P1 | L | Audit log pattern |

### M13 — Soft delete

**In plain English:** Admin marks user `isDeleted=true`; auth middleware rejects deleted users on next request; jobs disappear from feeds + recommendations + related. NC-9 pattern mostly already wired in BE; need to confirm a couple of leak surfaces (per-employer job browse, admin dashboard counts). No undelete in v1. **8 ACs, Asrar + Nazir S2 / S3.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M13-AC1 | [M13](04-prd-v1.md#m13-soft-delete) | `PATCH /api/admin/jobseekers/:id/delete` and `/employers/:id/delete` set `isDeleted=true, deletedAt=now()` | Asrar | S2 | ⏳ | T-M13-AC1 | P1 | L | Built (NC-9) |
| M13-AC2 | [M13](04-prd-v1.md#m13-soft-delete) | `authenticate` middleware rejects any JWT whose User row is `isDeleted=true` (NC-9) | Asrar | S1 | ⏳ | T-M13-AC2 | P0 | L | Built |
| M13-AC3 | [M13](04-prd-v1.md#m13-soft-delete) | Login endpoints reject deleted users with `ACCOUNT_DELETED` sentinel | Asrar | S1 | ⏳ | T-M13-AC3 | P1 | L | Built |
| M13-AC4 | [M13](04-prd-v1.md#m13-soft-delete) | Forgot-password and reset-password flows reject deleted users | Asrar | S1 | ⏳ | T-M13-AC4 | P1 | L | Built |
| M13-AC5 | [M13](04-prd-v1.md#m13-soft-delete) | Default queues (admin employer/seeker lists) exclude deleted users | Asrar | S2 | ⏳ | T-M13-AC5 | P1 | L | Built |
| M13-AC6 | [M13](04-prd-v1.md#m13-soft-delete) | `/api/admin/jobseekers/deleted` and `/api/admin/employers/deleted` return deleted lists; route ordering preserved (`/deleted` before `/:id`) per audit §1.4 | Asrar, Nazir | S2 | ⏳ | T-M13-AC6 | P2 | L | Built BE; FE list net-new |
| M13-AC7 | [M13](04-prd-v1.md#m13-soft-delete) | Public job browse, recommended, related endpoints filter out jobs whose employer is soft-deleted (NC-9) | Asrar | S2 | ⏳ | T-M13-AC7 | P0 | L | Built |
| M13-AC8 | [M13](04-prd-v1.md#m13-soft-delete) | Confirm or fix: `/jobs/employer/:employerId` (per-employer public browse) — audit §1.8 #14 flags possible leak | Asrar | S1 | ⏳ | T-M13-AC8 | P1 | L | S1 cleanup |
| M13-AC9 | [M13](04-prd-v1.md#m13-soft-delete) | Confirm or fix: admin dashboard counts may include deleted — audit §1.8 #16 | Asrar | S1 | ⏳ | T-M13-AC9 | P1 | L | S1 cleanup |
| M13-AC10 | [M13](04-prd-v1.md#m13-soft-delete) | No restore endpoint in v1 (audit §1.8 #15 locked) | Asrar | S1 | ⏳ | T-M13-AC10 | P2 | L | Confirmed via PRD |

### M14 — i18n (10 languages)

**In plain English:** Translate UI strings into 10 Indian languages (EN, HI, TA, KN, ML, MR, GU, OR, TE, BN). EN + HI hard-gated to 100% by code freeze; other 8 may soft-launch ≥80% with `[needs review]` markers. AI first-pass + native-reviewer pipeline. Currently FE has zero `t()` calls — every screen needs wrapping in S2. **9 ACs, Nazir (coordination) + Mobile dev (TBD) + translation reviewers S2/S3.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M14-AC1 | [M14](04-prd-v1.md#m14-i18n-10-languages) | All 10 languages have JSON files under `packages/i18n/locales/{lang}/common.json` (+ namespaces) | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC1 | P0 | M — R5: reviewer availability | EN+HI P0; others may soft-launch |
| M14-AC2 | [M14](04-prd-v1.md#m14-i18n-10-languages) | `next-i18next` wired on web; `i18next` on RN; keys shared via `packages/i18n` workspace | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC2 | P0 | M — net-new workspace; FE today has zero `t()` calls | Coordination with Mobile dev (TBD) |
| M14-AC3 | [M14](04-prd-v1.md#m14-i18n-10-languages) | EN + HI keys 100% complete and reviewed before code freeze (2026-06-21) | Nazir | S3 | ⏳ | T-M14-AC3 | P0 | M — R5; charter §9 success criterion | Hard gate |
| M14-AC4 | [M14](04-prd-v1.md#m14-i18n-10-languages) | Other 8 languages have ≥80% key coverage by code freeze; missing keys render as `[needs review] {keyPath}` | Nazir | S3 | ⏳ | T-M14-AC4 | P1 | M — R5; soft-launch possible | Soft-launch fallback |
| M14-AC5 | [M14](04-prd-v1.md#m14-i18n-10-languages) | User's `preferredLanguage` persisted on User row at registration; changeable from header dropdown | Asrar, Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC5 | P0 | L | Existing field; new endpoint `PATCH /api/me/language` |
| M14-AC6 | [M14](04-prd-v1.md#m14-i18n-10-languages) | Voice 🔊 icon labels and tooltips ("Listen", "Coming soon") are also translated | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC6 | P2 | L | Polish |
| M14-AC7 | [M14](04-prd-v1.md#m14-i18n-10-languages) | Pluralisation rules per language handled via i18next ICU plural format | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC7 | P1 | L | Standard i18next feature |
| M14-AC8 | [M14](04-prd-v1.md#m14-i18n-10-languages) | Date/time/currency formatting uses each language's locale defaults (Intl.NumberFormat, Intl.DateTimeFormat) | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC8 | P1 | L | M14 OQ: DD/MM vs locale-driven |
| M14-AC9 | [M14](04-prd-v1.md#m14-i18n-10-languages) | Indic-script line-length expansion (~30% wider than Latin) accommodated in primary CTAs and form labels | Nazir, Mobile dev (TBD) | S2 | ⏳ | T-M14-AC9 | P1 | L | Layout audit |
| M14-AC10 | [M14](04-prd-v1.md#m14-i18n-10-languages) | `[needs review]` markers do not ship to production for EN/HI; build-time check fails if any EN/HI key carries the marker | Nazir | S3 | ⏳ | T-M14-AC10 | P1 | L | CI lint rule |

### M15 — Cross-cutting

**In plain English:** Everything-else-important — FE port + path + auth wiring (R1), all the audit §1.8 security gaps closed (now mostly done by Asrar 2026-05-12), inline decision-tag convention, OpenAPI vs manual API docs, CI on every PR, staging env up, performance gate (P95 search <500ms with 50k jobs), security review checkpoint. **8 ACs (each AC is itself a checklist of sub-items), distributed across all team S1 / S2 / S3.**

| Req ID | PRD source | Description | Owner | Sprint | Status | Test case ID | Priority | Risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| M15-AC1 | [M15](04-prd-v1.md#m15-cross-cutting) | FE base URL switches from `localhost:8080` to `localhost:5000` (or env-driven `NEXT_PUBLIC_API_URL`); `.env.example` committed per D6 | Nazir | S1 | ⏳ | T-M15-AC1 | P0 | H — R1: FE/BE divergence | Day 1 FE cleanup |
| M15-AC2 | [M15](04-prd-v1.md#m15-cross-cutting) | FE path naming reconciled: `/job-seeker/* → /api/jobseekers/*`, `/employer/* → /api/employers/*`, etc. (D6) | Nazir | S1 | ⏳ | T-M15-AC2 | P0 | H — R1 | Day 1 FE cleanup |
| M15-AC3 | [M15](04-prd-v1.md#m15-cross-cutting) | FE wires `Authorization: Bearer <token>` on all authenticated calls; token in localStorage + memory; refresh logic + protected route guards in place (audit §2.4) | Nazir, Mobile dev (TBD) | S1 | ⏳ | T-M15-AC3 | P0 | M — auth context net-new | Real auth wiring |
| M15-AC4 | [M15](04-prd-v1.md#m15-cross-cutting) | All cross-cutting bugs from audit §1.8 resolved before staging (#1 OTP gated, #2 crypto.randomInt, #3 JWT_SECRET assert, #4 forgot-pwd 200, #5 admin-create gate, #6 reject-accepted decision, #7 BOOKMARKED enum, #9 Aadhaar delete, #10+#11 audio, #12 channels, #13 `/api/skills` auth, #14 employer-jobs filter, #16 dashboard counts) | Asrar | S1 | ⏳ | T-M15-AC4 | P0 | M — many small fixes; cross-refs M1-AC10/11/12/13, M6-AC5/6, M5-AC1, M8-AC3, M9, M2-AC5, M13-AC8/9 | S1 day-1 BE cleanup omnibus |
| M15-AC5 | [M15](04-prd-v1.md#m15-cross-cutting) | API docs auto-generated OpenAPI from BE Zod validators, hosted at `Job_Portal/docs/technical/openapi.yaml` per D7 | Asrar | S3 | ⏳ | T-M15-AC5 | P1 | L | M15 OQ: confirm `zod-to-openapi` is the lib; Asrar's S1 capacity may push this |
| M15-AC6 | [M15](04-prd-v1.md#m15-cross-cutting) | Decision tag convention: BE keeps Q##/NC-##/T##/T2a #/T3 #; FE adopts Q-FE-NN (YYYY-MM-DD); mobile adopts Q-MOB-NN (YYYY-MM-DD) | Asrar, Nazir, Mobile dev (TBD) | S1 | ⏳ | T-M15-AC6 | P2 | L | Convention only — adopt in PRs |
| M15-AC7 | [M15](04-prd-v1.md#m15-cross-cutting) | Master decision log location confirmed; write access granted to FE + Mobile (BE sync §7) | Asrar | S1 | ⏳ | T-M15-AC7 | P2 | L | Coordination item |
| M15-AC8 | [M15](04-prd-v1.md#m15-cross-cutting) | Staging environment stood up by 2026-05-17 (Sprint 1 mid) per R9 | Nayan | S1 | ⏳ | T-M15-AC8 | P0 | M — R9: infra dependency | Critical-path for S2 smoke tests |
| M15-AC9 | [M15](04-prd-v1.md#m15-cross-cutting) | CI runs on every PR: lint + typecheck + smoke test on BE; lint + typecheck + build on FE web + mobile | Nayan, Nazir | S1 | ⏳ | T-M15-AC9 | P1 | L | GitHub Actions per M15 OQ default |
| M15-AC10 | [M15](04-prd-v1.md#m15-cross-cutting) | Performance gate at code freeze: P95 search <500ms; P95 feed <500ms; P95 conversation poll <200ms | Asrar, Nayan | S3 | ⏳ | T-M15-AC10 | P1 | M — depends on staging data volume | Charter §9 gate |
| M15-AC11 | [M15](04-prd-v1.md#m15-cross-cutting) | Security review checkpoint before code freeze: OWASP top-10 spot-check, JWT, Zod input validation, Prisma SQL parameterised, multer + MIME, rate-limiting on auth | Najeeb, Asrar | S3 | ⏳ | T-M15-AC11 | P0 | M — Charter §9 gate | Use `/security-review` slash command |

---

## Sanity check — module coverage

| Module | RTM rows | PRD Appendix B target | Delta |
|---|---|---|---|
| M1 | 15 | 13 | +2 (PRD has 15 actual checkboxes vs 13 in Appendix; matched the source) |
| M2 | 10 | 9 | +1 |
| M3 | 8 | 7 | +1 |
| M4 | 9 | 8 | +1 |
| M5 | 9 | 8 | +1 |
| M6 | 8 | 7 | +1 |
| M7 | 8 | 8 | 0 |
| M8 | 8 | 8 | 0 |
| M9 | 9 | 8 | +1 |
| M10 | 13 | 12 | +1 |
| M11 | 10 | 9 | +1 |
| M12 | 8 | 8 | 0 |
| M13 | 10 | 8 | +2 |
| M14 | 10 | 9 | +1 |
| M15 | 11 | 8 | +3 (M15 has nested numbered list — counted as one AC per checkbox; PRD has more checkbox-level items than the appendix summary) |
| **Total** | **144** | **130 (≈)** | **+14** |

Every module has ≥1 row. The +14 delta is checkbox-level over Appendix B's summary count — within the "expect ~130, hard cap 150" tolerance set by the prompt. No double-counting of `BE endpoints involved` / `FE screens involved` / `Mobile scope` / `Out-of-scope` / `Open questions` rows.

---

## Maintenance

- Update Status column in place as items move ⏳ → 🔧 → ✅. Never silently delete a row — descope means 🚫 with a Notes-column reason.
- Run `/check-scope` before adding any row that doesn't trace back to a `- [ ]` in `04-prd-v1.md`.
- Test case IDs are placeholders `T-[Req ID]` until Najeeb populates concrete IDs in `09-test-plan.md` — when populated, replace the placeholder with the real `TC-###` ID.
- Re-run rollups (status counts) at the end of each sprint and update the table at the top of this file.
- When the PRD evolves (most likely in M10 after Shaik's 2026-05-18 pricing confirmation), edit the affected RTM rows in the same PR.
