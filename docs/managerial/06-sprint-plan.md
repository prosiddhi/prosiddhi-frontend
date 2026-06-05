# Sprint Plan & Sprint 1 Backlog — Azkashine Job Portal v1

**Owner:** Nazir Hasan (Acting PM)
**Date:** 2026-05-11 (drafted); **revised 2026-05-15 — sprint shifted 1 week**
**Source PRD:** [`04-prd-v1.md`](04-prd-v1.md)
**Source RTM:** [`05-rtm-v1.md`](05-rtm-v1.md)
**Source DoD:** [`07-definition-of-done.md`](07-definition-of-done.md)
**Source scope:** [`../_context/02-scope-locked.md`](../_context/02-scope-locked.md)
**Source pricing (PROVISIONAL):** [`03-pricing-decision-provisional.md`](03-pricing-decision-provisional.md)
**Target QA handover:** 2026-06-22 · Code freeze: 2026-06-21

> **Note:** This file is the planning snapshot. **Jira is the live tracker** post-import — see [`../technical/jira-import-README.md`](../technical/jira-import-README.md). Story IDs here match Jira summaries.

---

## Section 1 — Sprint shape recap

| Sprint | Dates | Working days | Status (2026-05-15) |
|---|---|---|---|
| **S0 — Foundation** | May 5–10 | 5 elapsed | ✅ Done (Charter, primers, audit, BE sync, PRD, RTM, DoD, Standup, Test Plan skeleton, security spec, prompts review all landed) |
| **S0.5 — Pre-sprint setup** | May 11–17 | 5 elapsed | ✅ BE day-1 batch done (Aadhaar deletion, 6 audit bugs); laptop migration; Jira board prepped; sprint shifted |
| **S1 — Auth + Subscription + Spine** | May 18–29 | 10 working / 10 raw dev-days per dev | 🔧 **Starting Mon 2026-05-18** |
| **S2 — Core flows + integration** | Jun 1 – Jun 12 | 10 working | ⏳ Not started |
| **S3 — Hardening + QA prep** | Jun 15–19 | 5 working | ⏳ Not started |
| **UAT** | Jun 22 onward | — | Najeeb (QA Lead) + Farhana (QA junior) own; code freeze holds (P0 fixes only) |

Working agreement on capacity (this plan):
- **Each dev has 10 raw dev-days per 2-week sprint.** Plan against **≤7 committed** to reserve ~30% for code review, blockers, unblocking peers, and unexpected scope.
- "Committed dev-days" = sum of story sizes (S=1, M=2, L=4, XL=≥5).
- Multi-owner stories count proportionally on each owner (e.g., an L story with two owners co-implementing = ~2d per owner, not 4d each).

---

## Section 2 — Sprint goals

### Sprint 1 goal (May 18–29)
Ship phone-OTP registration + Email/password + Google OAuth login working e2e on web AND mobile for BOTH seeker AND employer; ship the subscription module schema + Razorpay sandbox checkout + webhook on BE; FE port/path/auth reconciliation done; Aadhaar code paths fully deleted from BE. **Exit gate:** a fresh seeker and a fresh employer can register via phone OTP on web AND mobile, log in via any of the three methods, and Asrar can demo a Razorpay sandbox order → webhook → `tier=PRO` flip. DLT registration + Meta Business verification + Razorpay merchant KYC all initiated day 1.

### Sprint 2 goal (Jun 1 – Jun 12)
Ship the core seeker+employer interaction loop e2e: apply with 2-min audio, candidate management with bookmark/accept/reject + interview modal, polling chat with 60s audio messages, admin moderation (OpenAI scan + scam regex + Send Warning + Delete), notification channel matrix (FCM + SMS + email + WhatsApp where templates approved), i18n EN/HI wired with `t()` calls on critical screens. **Exit gate:** a seeker can apply to a job (with audio), receive accept notification on WhatsApp (or SMS fallback), open the interview details, message the employer, get a reply — all in the EN UI and again in the HI UI.

### Sprint 3 goal (Jun 15–19)
Hardening: bug bash, performance gate (P95 search/feed <500ms, poll <200ms), `/security-review` checkpoint, seed-data load from INPUT-FILES spreadsheets, staging deploy verified by someone other than implementer, EN+HI 100% review pass, the other 8 languages at ≥80% coverage with `[needs review]` markers. **Exit gate:** every Section 4 "Done done for QA handover" item in [`07-definition-of-done.md`](07-definition-of-done.md) is true; code freeze at EOD Jun 14; QA pack delivered to Najeeb morning of Jun 15.

---

## Section 3 — Sprint 1 detailed backlog (PRIMARY OUTPUT)

**Working dates:** Monday 2026-05-18 → Friday 2026-05-29 (10 working days). Buffer Sat-Sun 2026-05-30/31 for S1 demo + retro before S2 kicks off Mon 2026-06-01.

Sizing: S = ≤1 dev-day · M = 1–3 dev-days · L = 3–5 dev-days · XL = ≥5 dev-days. DoD reference is [`07-definition-of-done.md`](07-definition-of-done.md) for every story unless overridden in story notes.

### Day-1 cleanup batch (originally planned for EOD Mon 2026-05-11 — **landed 2026-05-12 on old laptop, code in BE repo, tickets pre-marked Done in Jira import**)

| Story ID | Title | Module | Owner | Size | RTM rows | Dependencies | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| **S1-01** | Delete Aadhaar code paths (model, validator, send/verify endpoints, `aadhaarNumber` on User, route registrations) | M1 | Asrar | S (1d) | M1-AC10, M15-AC4 (#9) | — | M | Schema migration touches existing tables. Standalone PR. Day 1 unblock for auth rework |
| **S1-02** | Initiate MSG91 SMS DLT registration paperwork (account, header/template approval) | M9 | Nazir | S (0.5d) | M9-AC8 | — | H | **R11:** 2–3 week lead. Day 1 is the latest start that still hits code freeze |
| **S1-03** | Initiate Razorpay merchant KYC + procure sandbox keys | M10 | Nazir | S (0.5d) | M10-AC4 | — | M | **R3:** KYC ~1–2 weeks. Sandbox keys usable from day 1 for BE wiring |
| **S1-04** | Register Google OAuth client (Cloud Console project + OAuth consent screen + web + mobile client IDs) | M1 | Nazir | S (0.5d) | M1-AC5, M1-AC15 | — | L | Net-new; needed before BE Google OAuth code lands |
| **S1-05** | `apps/mobile` workspace skeleton: Expo init, TypeScript, RTK Query setup, NativeBase shell, basic stack nav | infra | Mobile dev (TBD) | S (1d) | — (scaffolding) | — | L | Not an AC; scaffolding precondition for every mobile story |
| **S1-06** | `apps/admin` workspace skeleton: Next.js + Tailwind + lucide; lift admin pages from `apps/web/src/app/admin/*` | infra | Nazir | S (1d) | — (scaffolding, supports D4) | — | L | Not an AC; scaffolding precondition for every admin story in S2 |
| **S1-07** | Fix audit bug c: `Math.random()` → `crypto.randomInt` in OTP generation | M1 | Asrar | XS (0.25d) | M15-AC4 (#2) | — | L | utils/crypto.ts; trivial fix |
| **S1-08** | Fix audit bug d: assert `JWT_SECRET` env at boot (fail-fast); remove `'your-secret-key'` default | M1 | Asrar | XS (0.25d) | M1-AC11, M15-AC4 (#3) | — | L | utils/jwt.ts |
| **S1-09** | Fix audit bug a: add `BOOKMARKED` to `updateApplicationStatusSchema` enum | M6 | Asrar | XS (0.25d) | M6-AC6, M15-AC4 (#7) | — | L | validators/application.validator.ts |
| **S1-10** | Fix audit bug b: decide on "Cannot reject accepted" guard — either re-enable or delete the commented block (and document either way) | M6 | Asrar | XS (0.25d) | M6-AC5, M15-AC4 (#6) | — | L | services/application.service.ts:~1070-1073 |
| **S1-11** | Merge `prabhazkashine/asrar-dev` into main (or document why not yet); resolve conflicts; clean branch hygiene | infra | Asrar | XS (0.25d) | — (BE sync §8) | — | M | BE sync §8 open question — must close before further BE work |

**Day-1 subtotal — Asrar: 2.25d, Nazir: 2.5d, Mobile dev (TBD): 1d (blocked on hire)**

**Non-engineering, ongoing (tracked OUTSIDE engineering sprint backlog — consumes zero engineering capacity):**
- **Meta Business verification + MSG91 WhatsApp BSP onboarding** — Charter §8.1 currently lists this as "TBD (non-engineering)". BE sync §6 names Shaik Ishaq as owner. **Nazir action day 1:** reconcile with Shaik and update Charter §8.1 to name Shaik (or whoever Shaik delegates) explicitly. Process is 1–2 weeks elapsed; **R14**.

### Rest of S1 (Mon 2026-05-18 → Fri 2026-05-29)

| Story ID | Title | Module | Owner | Size | RTM rows | Dependencies | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| **S1-12** | BE: rework registration to phone-first multi-step for BOTH seeker AND employer (Language→Phone→OTP→Profile w/ email→Categories→Experience→Password for seeker; Phone→OTP→Password→EmailVerify→CompanyDetails for employer) | M1 | Asrar | L (4d) | M1-AC1, M1-AC2, M1-AC3, M1-AC4 | S1-01 | H — full registration rework, schema + flow changes | OTP must be gated `NODE_ENV !== 'production'` per M1-AC3 |
| **S1-13** | BE: Email+password login (review/finish existing) + Google OAuth login (`passport-google-oauth20` or equivalent); `googleSub` on User; both auth options for both roles | M1 | Asrar | M (2d) | M1-AC5, M1-AC15 | S1-04 (client IDs) | M — net-new lib + schema | Email/pwd partially built per scope-locked; Google OAuth net-new |
| **S1-14** | BE: misc audit hardening — admin-create gate (setup token / env allowlist), forgot-password generic 200, password policy validator (≥8 / ≥1 upper / ≥1 lower / ≥1 digit) | M1 | Asrar | S (1d) | M1-AC12, M1-AC13, M1-AC14, M15-AC4 (#4 #5) | — | L | Quick wins; bundle into one PR |
| **S1-15** | BE: subscription schema — `Subscription` table, `SubscriptionPlan` seed table, `PaymentHistory` table, `WebhookEvent` table; add `subscriptionTier`/`subscriptionExpiresAt`/`lastPaymentAt` columns on User | M10 | Asrar | M (1.5d) | M10-AC10, M10-AC11, M10-AC12 | S1-01 (schema migration ordering) | M — schema-heavy; seed file lives PROVISIONAL Option B values | Seed values: Worker FREE / Employer ₹999/mo Pro / 14-day TRIAL |
| **S1-16** | BE: trial lifecycle — create `Subscription` row on employer register (`tier=TRIAL, expiresAt=now()+14d`); trial-feature gate middleware; expiry cron flips `tier=EXPIRED` + auto-deactivates ACTIVE jobs | M10 | Asrar | M (1.5d) | M10-AC1, M10-AC2, M10-AC3, M10-AC6 | S1-15 | M — cron job net-new; auto-deactivate is destructive (test thoroughly) | Manual renewal cron + day-3/day-7 nurture cron → S2 |
| **S1-17** | BE: Razorpay sandbox checkout — `POST /api/subscriptions/checkout` creates Order, returns widget config; webhook handler at `POST /api/webhooks/razorpay` with HMAC sig verification + idempotency on `provider_event_id` flipping `tier=PRO, expiresAt=now()+30d`, writing PaymentHistory + GST breakdown | M10 | Asrar | M (2d) | M10-AC4, M10-AC8, M10-AC13 | S1-15, S1-03 (sandbox keys) | H — webhook security-critical; HMAC + idempotency must be correct | Production keys later; sandbox is fine for S1 demo |
| **S1-FE-PORT** | FE web: switch base URL `localhost:8080` → `localhost:5000` (or env-driven `NEXT_PUBLIC_API_URL`); commit `.env.example` | M15 | Nazir | S (0.5d) | M15-AC1 | — | M — R1 | Day-2 task; can land before BE auth rework |
| **S1-FE-PATHS** | FE web: rename all API paths (`/job-seeker/* → /api/jobseekers/*`, `/employer/* → /api/employers/*`, etc.); update lib/api.ts | M15 | Nazir | M (2d) | M15-AC2 | S1-FE-PORT | M — R1; touches every page that calls API | Coordinate with Asrar on final path list (cross-ref BE routes) |
| **S1-FE-AUTH** | FE web: Bearer-token interceptor + AuthContext (localStorage + memory); login/logout flows; replace localStorage-only hacky auth | M15 | Nazir | M (2d) | M15-AC3 | S1-FE-PATHS, S1-12 | M | Audit §2.4 — net-new auth wiring |
| **S1-FE-GUARDS** | FE web: protected route guards + 401 → redirect-to-login; role-based route gating (seeker vs employer vs admin) | M15 | Nazir | S (1d) | M15-AC3 | S1-FE-AUTH | L | Standard pattern |
| **S1-FE-REG** | FE web: rework registration screens for both seeker AND employer to phone-first multi-step (no Aadhaar field anywhere); fix OTP widget 4-digit → 6-digit; wire to new BE endpoints | M1 | Nazir | M (2d) | M1-AC1, M1-AC2, M1-AC3 (FE half) | S1-12 (BE shape) | M — full screen rework | Lift design from `Job Portal.pdf` |
| **S1-FE-LOGIN** | FE web: login screens for all 3 methods (phone+OTP, email+pwd, Google OAuth); shared for seeker AND employer; admin login email+pwd only | M1 | Nazir | S (1d) | M1-AC5, M1-AC6 (FE half) | S1-13, S1-04 | L | Replaces hardcoded admin creds path |
| **S1-MOB-AUTH** | Mobile: phone-first registration flow for BOTH seeker AND employer (5-step seeker, 5-step employer per `Job_Portal_Mobile.pdf`); 6-digit OTP widget; wire to BE | M1 | Mobile dev (TBD) | L (4d) | M1-AC1, M1-AC2, M1-AC3 (mobile half) | S1-05, S1-12 | M — large new build but follows web pattern | Reuse RN screens for both roles where possible |
| **S1-MOB-LOGIN** | Mobile: login screens for all 3 methods; Google sign-in via `@react-native-google-signin/google-signin`; store JWT in MMKV | M1 | Mobile dev (TBD) | M (2d) | M1-AC5 (mobile half) | S1-13, S1-04 | M | Google sign-in mobile cert ID needed |
| **S1-MOB-SHELL** | Mobile: bottom nav shells — 4 tabs seeker (Home / Job Feed / My List / Profile), 5 tabs employer (Home / Job Post / Candidates / Messages / Profile); role-based shell selection on login | infra | Mobile dev (TBD) | S (1d) | — (precondition for S2 mobile features) | S1-05 | L | Empty screens with nav skeleton |
| **S1-18** | Coordination: draft 8–12 WhatsApp templates for Meta submission (OTP, application_accepted/rejected/shortlisted, interview_scheduled, interview_reminder_24h/2h, payment_confirmation, document_approved/rejected, employer_message_to_seeker, password_reset); hand to Shaik for submission | M9 | Asrar | S (0.5d) | M9-AC3 (engineering side) | — | M — gated by R14 for approval, not submission | Draft only — Shaik submits |
| **S1-19** | Infra: stand up staging environment (BE + DB + FE web + mobile build), get accessible URLs to team; CI on every PR (lint + typecheck + smoke on BE; lint + typecheck + build on FE web + mobile) | infra | Nayan | M (2d) | M15-AC8, M15-AC9 | — | M — R9 dependency | Target: staging up by Fri 2026-05-17 (S1 mid) |

### Capacity summary (S1)

> **Capacity rule:** plan against ≤7 committed dev-days per dev (30% buffer for review/blockers/unblocking). Raw cap is 10 dev-days per dev per 2-week sprint. Multi-owner stories split proportionally.

| Dev | Committed dev-days | Raw cap | Vs 7d target | Vs 10d raw |
|---|---|---|---|---|
| **Asrar** | 2.25 (day-1 batch: S1-01, S1-07–11) + 4 (S1-12) + 2 (S1-13) + 1 (S1-14) + 1.5 (S1-15) + 1.5 (S1-16) + 2 (S1-17) + 0.5 (S1-18) = **14.75d** | 10 | **+7.75d OVER** | **+4.75d OVER** |
| **Nazir** | 2.5 (day-1 batch: S1-02, S1-03, S1-04, S1-06) + 0.5 (S1-FE-PORT) + 2 (S1-FE-PATHS) + 2 (S1-FE-AUTH) + 1 (S1-FE-GUARDS) + 2 (S1-FE-REG) + 1 (S1-FE-LOGIN) = **11d** | 10 | **+4d OVER** | **+1d OVER** |
| **Mobile dev (TBD — Dheeraj off 2026-05-15)** | 1 (S1-05) + 4 (S1-MOB-AUTH) + 2 (S1-MOB-LOGIN) + 1 (S1-MOB-SHELL) = **8d** | 10 | — | **VACANT — capacity unrealised until hire onboards; all 8d at risk of slipping to S2 or post-handover** |
| **Nayan** | 2 (S1-19) = **2d** | 10 | within | infra has more S1 work pending (staging hardening, env vars) — Nazir to confirm |

**Asrar and Nazir are over the 7-committed budget. Asrar is also over the 10-raw cap.** See Section 8 for the resourcing-gap call and authorized cuts already applied.

### Authorized cuts already applied to keep S1 small enough to demo

Per prompt's authorized-cuts list (in priority order), the following have been moved to S2 OR are already there in the RTM:
1. **Recruiter-contact-gate metering (M4-AC9, M5-AC9)** — RTM already places these in S2. Subscription module *schema* (S1-15) stays in S1.
2. **Audio-on-application (M5-AC1, M5-AC2)** — RTM already places these in S2 (was prompt's cut #1).
3. **Notification channel adapters (FCM/SMS-send/email-send/WhatsApp-send code)** — RTM places M9-AC2/AC4/AC6 in S2. Day-1 of S1 only initiates external dependencies (DLT, Meta verification, Razorpay KYC).
4. **Manual-renewal cron + day-3/day-7 trial nurture cron (M10-AC5, M10-AC7)** — moved to S2 (RTM had them in S2 already).
5. **Admin Scan Content UI (M12)** — RTM places in S2 with manual moderation as fallback; backstop is "punt to S3 if S2 blows up". Prompt's cut #2 endorses this.
6. **8 non-English/Hindi languages** — RTM (M14-AC4) explicitly allows soft-launch at ≥80% coverage. EN+HI is P0 (M14-AC3).
7. **Recommendation tweaks Q9 (M4-AC1)** — RTM places in S2; prompt's cut #4 allows pushing to S3 if S2 is tight.

All seven prompt-listed cuts are either already in S2 per RTM or moved to S2 explicitly here. **None of this resolves Asrar's overflow** because his S1 work (Aadhaar deletion + auth rework + OAuth + subscription) is core sprint-goal scope that *cannot* be deferred without breaking S1's exit gate. See Section 8.

---

## Section 4 — Sprint 2 high-level outline (Jun 1 – Jun 12)

Stories listed at title level; full backlog generated at S1 close. Module → AC mapping comes from RTM rows currently tagged S2 (≈73 ACs).

**BE (Asrar):**
- Apply with 2-min audio + storage abstraction (M5-AC1, M5-AC2)
- AUDIO+SYSTEM message types in chat with 60s cap (M8-AC3, M8-AC4)
- Polling chat finalize + last-seen + read-by surface (M8-AC2, M8-AC5, M8-AC6)
- Recommendation Q9 tweaks: location 10→20, exp decay, recency boost, cold-start (M4-AC1, M4-AC3)
- Near By Jobs Haversine endpoint default radius decision (M4-AC4)
- Recruiter-contact-gate metering (M4-AC9, M5-AC9)
- Interview model + reminder cron 24h/2h + reschedule + outcome capture (M7-AC4–AC8)
- Manual-renewal cron + day-3/day-7 trial nurture (M10-AC5, M10-AC7)
- Admin Scan Content endpoint via OpenAI omni-moderation + India scam regex layer (M12-AC1, M12-AC2, M12-AC3)
- Send Warning + WhatsApp warning template (M12-AC4)
- Admin moderation actions audit log (M12-AC8)
- Admin verification + approve/reject endpoints wiring on channels (M11-AC2, M11-AC3, M11-AC4)
- Audit log table + adminId/action/target/timestamp pattern (M11-AC8, M12-AC8)
- Notification channel adapters: FCM + MSG91 SMS + MSG91 Email + MSG91 WhatsApp send (M9-AC2, M9-AC4, M9-AC6) — single-vendor MSG91 locked 2026-05-13
- WhatsApp template wiring once Meta approves (gated by R14)
- Application accept/reject SYSTEM + WhatsApp+SMS triggers (M5-AC5, M6-AC2)
- Job posting validators + activate/deactivate verification + auto-FILL (M3-AC1–AC8)
- Job Reports queue + admin resolve (M12-AC6)

**FE (Nazir):**
- Apply modal with audio recorder wired to BE (already designed)
- Candidate management screens (list + detail + bookmark/accept/reject + Schedule Interview modal)
- Chat UI (polling at ~10s when open, audio record/play)
- Admin moderation UI (lift to `apps/admin`)
- i18n wiring: `next-i18next`, `packages/i18n` workspace, EN + HI JSON files, `t()` calls on critical screens
- Subscription upgrade modal + tier-state pills + Renew flow (sandbox-mode)
- Notifications dropdown + preferences screen
- Job posting + live preview + activate/deactivate
- "Contact the Recruiter" gated reveal (per-job toggle only under Option B)

**Mobile (TBD — vacancy as of 2026-05-15):**
- Apply flow with 2-min audio (RN audio recorder)
- Candidate management mobile (5-tab employer nav)
- Chat with audio (60s)
- Job posting + preview on mobile (employer parity)
- i18n via `i18next` on RN, shared keys from `packages/i18n`
- Subscription Free/Pro tabs + manual renewal
- Push notifications: FCM Android, APNs iOS (cert TBD per M9 OQ)
- Voice 🔊 icons render as no-op + "Coming soon" tooltip

**Joint:**
- WhatsApp template wiring once Meta approves (R14)
- Mobile parity catch-up if any S1 mobile slipped

---

## Section 5 — Sprint 3 high-level outline (Jun 15–19, 5 days)

Hardening week. No new features.

- **Bug bash** — full team, day 1 (Mon Jun 15): clear P0/P1 board
- **Performance gate** — P95 search/feed <500ms, poll <200ms (M15-AC10); Asrar+Nayan; profile staging w/ seed data load
- **Security review checkpoint** (M15-AC11) — run `/security-review` slash command; OWASP top-10 spot-check; JWT review; Zod input validation; Prisma parameterised confirmation; multer + MIME audit; rate-limiting on auth endpoints
- **Seed data load** — job categories from `documents/INPUT-FILES/*.xlsx` (11 spreadsheets); admin user; sample employers + jobs
- **EN+HI translation final review** (M14-AC3); CI lint rule for `[needs review]` markers in EN/HI (M14-AC10)
- **Other 8 languages** at ≥80% with `[needs review]` markers (M14-AC4)
- **Document review SLA + 36h takedown SLA copy** (M11-AC9, M12-AC7) — copy only
- **OpenAPI contract publish** at `docs/technical/openapi.yaml` (M15-AC5)
- **Staging deploy verified** end-to-end by someone other than implementer (DoD §3)
- **QA pack handover** to Najeeb + Farhana morning of Jun 22 — test accounts, env URLs, known limitations, regression scenarios (DoD §4)
- **Code freeze EOD Sun 2026-06-21**

**S3 capacity is tight (5 working days). If S2 spills, S3 contracts:** the prompt's authorized cut #4 (recommendation tweaks Q9 → S3) reverses to "if S2 is tight, ship base recommendation only; defer Q9 weight tweaks to post-handover hotfix." Document if that happens.

---

## Section 6 — Cross-sprint dependencies + critical-path items

| Item | Started | Approval ETA | Blocks | Owner | Mitigation |
|---|---|---|---|---|---|
| **DLT registration (MSG91 SMS)** | 2026-05-18 (S1-02) | ~2026-06-01 to 2026-06-08 | Real SMS at code freeze (M9-AC8) | Nazir | Mock-mode OTP through handover; real SMS live week 1 of UAT |
| **Meta Business verification + WhatsApp BSP onboarding** | ~2026-05-09 (Shaik or delegate) | ~2026-05-23 to 2026-06-06 | Real WhatsApp delivery (M9-AC3, M5-AC5, M6-AC2, M7-AC4) | Shaik (non-engineering) | SMS fallback wired throughout; acceptable WhatsApp goes live ≤1wk post-handover |
| **Razorpay merchant KYC approval** | 2026-05-18 (S1-03) | ~2026-06-01 | Real subscription payments (M10-AC4); sandbox unblocks BE day 1 | Nazir | Sandbox keys procurable same-day |
| **Razorpay sandbox keys** | 2026-05-18 | Same day | S1-17 (webhook wiring) | Nazir | — |
| **Translation reviewers** (9 non-English) | Nazir coordinates pre-S2 | Rolling through S3 | M14-AC1, M14-AC3, M14-AC4 | Nazir | Soft-launch ≥80% with `[needs review]` markers; EN+HI hard gate (M14-AC3) |
| **Pricing confirmation from Shaik** | 2026-05-11 (provisional Option B applied) | **2026-05-18 hard deadline** | M10 final seed values + UI copy; if Shaik picks Option A/C, rewrite M10-AC1/2/3/6/11/12 | Shaik | Working assumption in seed data (~30 min swap if changes per `03-pricing-decision-provisional.md`) |
| **WhatsApp templates submitted to Meta** | After S1-18 drafting (S1) | Meta-dependent | Real WhatsApp delivery | Shaik submits, Asrar drafts | Submission is owner's task, not engineering's |
| **Staging environment up** | 2026-05-18 (S1-19) | 2026-05-22 (S1 mid) | S2 smoke tests, every "Done" item per DoD §2.5 | Nayan | Charter §9 / DoD §4 gate |
| **OpenAI API key + budget cap** | TBD | Pre-S2 start | M12-AC1 admin scan | Nazir | Asrar may already have one (M12 OQ) |
| **iOS APNs cert** | TBD | Pre-S2 start | M9-AC4 iOS push | Joint (M9 OQ) | Defer to S2 if blocked; Android FCM still ships |
| **CI configured** | 2026-05-18 (S1-19) | 2026-05-22 | Every PR gates (DoD §2.4) | Nayan + Nazir | M15 OQ: GitHub Actions default |

---

## Section 7 — Risks specific to S1 execution

Pulling from `02-scope-locked.md` R1–R16. Highlighted: risks acute in S1 (R1, R3, R10, R11, R14, R16) plus newly acute capacity gap from this plan's Section 8.

| Risk | Why acute in S1 | S1-specific mitigation |
|---|---|---|
| **R1 FE/BE divergence** | Port + path + auth rework all land in S1; if integration breaks, S2 starts with a dead spine | Asrar (S1-12, S1-13) + Nazir (S1-FE-PORT, PATHS, AUTH, GUARDS, REG, LOGIN) sync on path list day 2; integration smoke test on staging by 2026-05-17 |
| **R3 Razorpay KYC lead time** | S1-17 needs sandbox keys; production keys gated by KYC | Sandbox usable day 1 (S1-03); production keys not needed until S2 demo |
| **R10 Bus factor of 1 per app** | Asrar is solo on BE during S1's largest module (subscription) | Daily standup; PR review by Nazir on every BE PR; comprehensive PRD + RTM mitigate; **no real fix in 6 weeks short of resourcing — see Section 8 #1** |
| **R11 DLT registration timeline** | Must start day 1 of S1 or SMS won't deliver at code freeze | S1-02 is day-1 must-close; fallback plan = mock-mode OTP through handover, real SMS week 1 of UAT |
| **R14 WhatsApp Meta verification timeline** | Must be in flight by 2026-05-09; engineering integration (~5–7 dev-days) waits on templates | S1-18 drafts templates; Shaik submits; engineering integration moves to S2 once templates approved; SMS fallback covers if Meta delays |
| **R15 Mobile scope expansion + vacancy (2026-05-15)** | Dheeraj off project; mobile role vacant. S1 mobile plan (S1-05, S1-MOB-AUTH, S1-MOB-LOGIN, S1-MOB-SHELL) totals 8d — none of it executable until a new mobile dev onboards. | Decision by Shaik by 2026-05-22: hire by ~Jun 1 OR descope mobile from v1 (revert D3 to web-only). If hire onboards mid-S1, S1 mobile work compresses to S2 + S3; S3 hardening absorbs the slip. |
| **R16 Pricing model not locked** | If Shaik picks Option A/C on 2026-05-18, M10 ACs rewrite mid-sprint; subscription seed file + UI copy churn | Provisional Option B + seed-data architecture means ~30-min swap. Daily reminder to Shaik until answered. See `03-pricing-decision-provisional.md` |
| **NEW S1 — Asrar capacity overflow** | This plan sizes Asrar at 14.75 committed dev-days vs 10 raw / 7 committed cap | **See Section 8 #1.** Three options proposed; need decision by Wed 2026-05-13 EOD |

---

## Section 8 — Open assignments / decisions

### #1 — Asrar S1 capacity overflow ✅ STAND-DOWN 2026-05-13

**Resolution:** Asrar's 2026-05-12 BE sync response §3 explicitly commits to the full S1+S2 plan: *"Yes — I can commit to the full S1+S2 plan as listed. Nothing comes out, no resourcing gap."* No contractor procurement needed for now.

**Caveat — keep Option 2 as Plan B:** the original 14.75d-vs-10d-cap math was real. If Asrar slips by >1 day mid-sprint, fall back to **Option 2 (defer Razorpay checkout S1-17 to early S2)**, which is the cleanest non-destructive cut. Daily standups + PR-review cadence will surface slip early.

**Original three options preserved below for reference if Plan B fires:**

1. ~~Contract help for Asrar (originally recommended).~~ Stood down.
2. **Plan B — Defer Razorpay checkout + webhook (S1-17, 2d) to early S2.** Keeps subscription schema + trial lifecycle in S1.
3. ~~Extend S1 by 3 working days.~~ Not recommended; would cascade into freeze.

### #2 — Nazir S1 capacity overflow (1d over raw)

Nazir is at 11d committed vs 10d raw. Not a resourcing crisis — fine to overflow by 1d on the PM/FE role since some of the 2.5d day-1 batch (DLT paperwork, Razorpay KYC, Google OAuth client) is procurement and runs in parallel with code work, not blocking-sequential. Treat as ~9.5d effective. **No action needed.**

### #3 — Google OAuth library pick ✅ CLOSED 2026-05-12

**Decision: `google-auth-library`** (official Google package, not Passport). Asrar's BE sync §5 rationale: single `verifyIdToken` call does everything for our stateless JWT pattern; no Passport middleware/strategy/serializer overhead; smaller dep tree. FE pairs: `@react-oauth/google` (web), `@react-native-google-signin/google-signin` (mobile). BE endpoint shape: `POST /api/auth/google/login { idToken, role }`.

### #4 — Email sender ✅ CLOSED 2026-05-13

**Decision: MSG91 Email** (locked by Nazir 2026-05-13, communicated to Asrar same day). Keeps SMS + WhatsApp + Email on one vendor. SendGrid considered and rejected — single-vendor simplicity beats deliverability edge for a 6-week MVP. **Nazir to procure during S1.**

### #5 — OpenAPI vs hand-maintained API docs ✅ CLOSED 2026-05-12

**Decision: keep manual `API_DOCUMENTATION.md` for v1; OpenAPI auto-gen is an S2 stretch goal only if Asrar has slack.** Asrar's BE sync §10 noted `API_DOCUMENTATION 5.md` (root-level, ~115 endpoints) is already maintained per his Phase 5 rule — gap was a sync issue, not a documentation gap. He'll push that file so FE + Mobile have visibility. Zod-derived OpenAPI + Swagger playground deferred to S2 only if S1 closes on schedule.

### #6 — Meta WhatsApp owner reconciliation (Nazir + Shaik)

Charter §8.1 lists this as "TBD (non-engineering)"; BE sync §6 names Shaik. **Nazir to talk to Shaik day 1 of S1** and update Charter §8.1 to name Shaik (or whoever Shaik delegates) explicitly.

### #7 — Pricing confirmation (Shaik)

**Hard deadline 2026-05-18.** Daily reminder until answered. If silent past deadline, provisional Option B ships as v1 default per `03-pricing-decision-provisional.md`.

### #8 — iOS APNs cert ownership (joint, M9 OQ)

Push notifications iOS side. Not blocking until S2 mobile work. **Resolve by Mon 2026-05-25** (start of S2). If unresolved, ship Android FCM only in S2; iOS push slides to S3.

### #9 — Interview Mode dropdown (M7-AC3) — design alignment (Nazir + new mobile dev)

Q13 partial revision: mobile design has it; web design doesn't. Three options: (a) web adds dropdown to match mobile, (b) mobile drops it to match web, (c) ship both as-is. **Decide by Mon 2026-05-25** (start of S2 when M7 work begins). Recommendation: (a) — keep mode dropdown on both since the data model already supports it.

### #10 — Decision-log master location ✅ CLOSED 2026-05-13

**Decision: git, in FE repo at [`docs/technical/decisions-log.md`](../technical/decisions-log.md)** (locked by Nazir 2026-05-13, communicated to Asrar same day). FE + Mobile + BE all PR into it. Notion considered and rejected — devs already work in git all day. **Asrar to migrate his local `BACKEND_TASK_LIST.md` + `COMPLETED_TASKS.md` content into the new shared file.** FE adopts `Q-FE-NN`, mobile `Q-MOB-NN`, BE keeps `Q##` (no collision).

### #11 — Branch-merge confirmation ✅ CLOSED 2026-05-12

**Status: clean.** Asrar's BE sync §8 confirmed `prabhazkashine/asrar-dev` last pushed 2026-05-05, rebased on top of main, fully merged via PR #4. Aadhaar deletion + §4 audit fixes coming as a focused PR shortly. No stale branch debt.

---

## Maintenance protocol

- **Daily standup** updates this plan: mark story status (⏳/🔧/✅/❌); add slip notes; bump dates if a critical-path item moves.
- **Story status in the tables above is implicit ⏳ at file creation.** Update inline when work begins.
- **Mid-sprint replan** if a P0 story slips by >1 day: re-baseline the dev's remaining stories; defer to S2 with a written reason (DoD §3 rule — no half-done items carry forward silently).
- **Sprint close (Fri 2026-05-29):** mark every story ✅ or 🚫-with-reason; update RTM Status column in lockstep; hold 15-min async retro on standup channel; summarise into `../_context/04-project-status.md` session log.
- **S2 backlog generation** happens at S1 close, not before. The S2 outline in Section 4 is title-level guidance, not a committed backlog.
