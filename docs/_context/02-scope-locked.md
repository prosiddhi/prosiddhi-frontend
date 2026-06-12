# Scope Locked — Job Portal v1

**Hard deadline:** QA handover **2026-06-22**. Code freeze **2026-06-21**.
**Today:** 2026-05-15.
**Time available:** ~5 weeks (Sprint 1 starts Mon 2026-05-18).

> **TIMELINE SHIFT — 2026-05-15.** Sprint 1 start moved from 2026-05-11 to 2026-05-18 (Monday). All sprints shift by 1 week: S1 May 18–29, S2 Jun 1–12, S3 Jun 15–19. Code freeze Jun 21, QA handover Jun 22. **Dheeraj is off the project** (replacement mobile dev pending — major scope risk if not filled by ~2026-06-01). **Farhana joins as QA junior** alongside Najeeb (QA Lead).

> **MAJOR REVISION — 2026-05-09 (PM override session).** Aadhaar removed entirely (Q3, Q4 revoked); escrow / platform-handled payments removed entirely (Q12 — out forever, not deferred); pricing decisions moved to Product Owner (Q1, Q5 PO-pending); mobile expanded to full seeker + employer parity (D3 revised); WhatsApp Business added to v1 with conditions (Q7 reversed); application audio cap reduced 5 min → 2 min (Q10); Q11 alternative-ID requirement moot (no Aadhaar). **Removed from doc entirely (do not mention as "deferred"):** WebSockets / real-time chat transport, voice message transcription, .ics calendar invites for interviews. See revised entries below for canonical state.

> **UPDATE — 2026-05-13 (Asrar BE sync response).** D6 expanded with locked auth flow steps for both roles, Google OAuth library choice (`google-auth-library`, not Passport), and zero-users backward-compat plan. Asrar confirmed S1+S2 capacity (no contractor needed for now). Sprint 1 day-1 audit batch closed: Aadhaar deletion + all 6 audit bugs fixed + admin-create endpoint gated. Q-FE-NN / Q-MOB-NN tagging convention confirmed.

> **UPDATE — 2026-05-13 (PM decisions on Asrar's four bounced items, communicated to Asrar same day).** All four open follow-ups from earlier today now locked: (1) **Email sender = MSG91 Email** (keeps SMS + WhatsApp + Email on one vendor); (2) **Decision-log master location = git, this FE repo, [`docs/technical/decisions-log.md`](../technical/decisions-log.md)** (Asrar to migrate his local `BACKEND_TASK_LIST.md` / `COMPLETED_TASKS.md` content over); (3) **Employer corporate doc-upload = split into a separate step** after email-verify — registration becomes JSON-only, docs go to `POST /api/employers/me/documents`; (4) **`accountStatus=PENDING_DOCUMENTS` semantic = confirmed** — Corporate employers can browse + edit profile but `POST /api/jobs` returns 403 until admin approves docs and flips to `ACTIVE`. Open items now reduce to Shaik pricing (2026-05-18) and Meta WhatsApp owner reconciliation.

> **For new sessions:** Don't reopen any of the locked decisions below without explicit user override. If you find yourself reasoning toward a different choice, push back on the user before changing scope.

---

## Team

| Role | Person | App ownership |
|---|---|---|
| Frontend dev + acting Project Manager | **Nazir Hasan** (the user) | `apps/web`, `apps/admin` |
| Backend dev | **Asrar** | `job-portal-be` (formerly `job-portal-backend-azka` / `prabhazkashine/asrar-dev` branch — merged 2026-05-12) |
| Mobile dev | **TBD — replacement hire pending** (Dheeraj off project 2026-05-15) | `apps/mobile` (not yet created — full seeker + employer parity per D3 update 2026-05-09) |
| Infra | **Nayan** (separate team) | Hosting, deployment, env setup |
| QA Lead | **Najeeb** | UAT begins 2026-06-22 |
| QA junior | **Farhana** (Mohamad.farhana@azkashine.com) | Test execution, regression scenarios |

---

## Sprint shape (4 sprints)

| Sprint | Dates | Goal |
|---|---|---|
| **S0 — Foundation** | May 5–10 | Claude operating layer, FE/BE alignment plan, locked PRD/RTM/Sprint backlog (✅ done) |
| **S0.5 — Pre-sprint setup** | May 11–17 | Asrar's BE day-1 cleanup batch landed (Aadhaar deletion + 6 audit bugs); Jira board prepped; sprint shift agreed | 
| **S1 — Auth + Subscription + Spine** | May 18–29 (2w) | Phone-OTP auth + Email/Google OAuth alternative login working e2e (web + mobile, both seeker AND employer); subscription module shipped (specific pricing pending PO sign-off — see Q1); FE/BE port + paths reconciled; Aadhaar code path fully removed from BE. **DLT registration with MSG91 + Meta Business verification for WhatsApp must start day 1 of S1** — both 1–3 week processes are critical-path for OTP / SMS / WhatsApp delivery at code freeze. |
| **S2 — Core flows + integration** | Jun 1 – Jun 12 (2w) | Apply flow + candidate mgmt + chat (text+audio) + admin moderation + i18n EN/HI working end-to-end on web + mobile |
| **S3 — Hardening + QA prep** | Jun 15–19 (1w) | Bug bash, perf, security review, seed data, deploy to staging, **code freeze Jun 21**, **handover Jun 22** |

---

## Locked decisions

### D1 — v1 scope (locked 2026-05-05; revised 2026-05-09)
**IN v1:** phone-OTP registration (no Aadhaar), Email + Google OAuth alternative login methods, audio messages on chat (60s) AND on application (2 min), content moderation workflow with AI scan button, admin job warnings, job reports from seekers, subscription/payment integration (specific pricing PO-pending — see Q1/Q5), full mobile parity (seeker + employer — see D3), WhatsApp Business notifications (see Q7).

**OUT v1 (deferred to v2):** voice-everywhere TTS playback (icons stay as no-op), AI auto-moderation engine on every post (manual "Scan Content" button only), skill assessment tests / online tests / field assessments, regional languages beyond the 10 selectable + Hindi/English fully translated, job ratings/reviews, multi-region infra.

**OUT entirely (will not be built — not even in v2 of this product):**
- **Aadhaar verification of any kind** (mock or real). Reasons documented in revised Q4.
- **Platform-handled payments** between worker and employer — escrow, commission on completion, payouts, payment-intent tracking, settlement marking. Revenue is subscription-only; the platform never touches money flowing between the two parties.

**Removed from documentation (do not mention as "deferred" anywhere):** WebSockets / real-time chat transport (polling is final), voice message transcription, .ics calendar invites for interviews.

### D2 — Backend stack (settled — do not relitigate)
Express 5 + TypeScript ESM + Prisma 6 + PostgreSQL + Zod 4 + JWT + PBKDF2 + Winston + Multer.
Repo: `/Users/nazirhasan/Documents/GitHub/job-portal-backend-azka`.
Port: **5000** (not 8080 as FE currently expects — see D6).

### D3 — Web AND mobile parity for BOTH seeker and employer (revised 2026-05-09; mobile-owner change 2026-05-15)
Both seeker and employer roles ship on web AND mobile. Same BE API serves all clients. Web pages stay; mobile (originally Dheeraj — **vacant as of 2026-05-15**, replacement hire pending) builds React Native parity to all seeker AND employer flows. Admin remains web-only. **Open risk:** if mobile vacancy isn't filled by ~2026-06-01, D3 may revert to web-only v1 (decision: Shaik by 2026-05-22).

**Mobile employer scope confirmed by `Job_Portal_Mobile.pdf` (55 pages):** full registration, dashboard with profile-summary stats (Job Posted / Accepted / Rejected counts), job posting + preview + submit, candidate management with All / Accepted / Shortlist / Rejected tabs, candidate detail with Accept / Reject / Bookmark + Schedule Interview modal (with mode dropdown — see Q13), messaging with Call HR + audio + text, profile management, Free / Pro subscription tabs. Bottom nav for employer mobile: Home / Job Post / Candidates / Messages / Profile (5 tabs). Bottom nav for seeker mobile: Home / Job Feed / My List / Profile (4 tabs); My List consolidates Messages + Saved Jobs + My Application under one entry.

### D4 — Admin app: SEPARATE workspace
`apps/admin/` to be created. **Stack: Next.js + Tailwind + lucide** (NOT Ant Design from old tech doc — that's a 1–2 week rewrite the timeline can't absorb). Lift existing admin pages from `apps/web/src/app/admin/*` into the new workspace.

### D5 — Cleanup ✅ executed 2026-05-08
- `Archive.zip` (130MB at repo root) → **deleted** (Nazir override 2026-05-08; was previously slated for archive)
- `REMAINING_CODE_PACKAGE.md`, `AUDIO_RECORDING_DOCUMENTATION.md` → moved to `docs/archive/stale/`
- `COMPLETE_DELIVERY_SUMMARY.md`, `PROJECT_STATUS_COMPLETE.md` → already deleted in earlier git history
- Superseded docs (Tech Architecture docx, Completed_Job_Portal docx, part_1.pdf, flowcharts_all_individual folder + zip, INPUT-FILES.zip, job_portal_flows.html) → moved to `docs/archive/superseded/` for historical reference (resurrect when starting v2)
- `documents/INSTALLATION.md` → moved to `docs/archive/stale/`
- `.DS_Store` + `Archive.zip` added to `.gitignore`
- **2026-05-08 (extension):** `documents/Job_Portal.md` (12-flow prose) and `documents/flowcharts_all_combined_design.md` (mermaid charts) → moved to `docs/archive/superseded/`. Both were pre-Aadhaar-lock spec containing v2 features (escrow + commission, AI document verification, skill assessment tests, WhatsApp, auto-moderation) and a 9-month phased plan conflicting with the locked 6-week v1. Each file has a SUPERSEDED banner at top pointing back here.
- **2026-06-13 (purge):** `docs/archive/` plus all rendered PDFs, the marketing docs, and the Stage-1 managerial artifacts (PRD, RTM, sprint-plan, etc.) were **removed entirely** — recoverable from git history. The `docs/archive/...` paths referenced above no longer exist on disk; current status truth is `docs/managerial/08-ticket-reconciliation.md`.

`documents/` now contains only **live spec**: `INPUT-FILES/` (job category seed data — needed by BE migrations).

### D6 — FE/BE reconciliation strategy (revised 2026-05-09, expanded 2026-05-13 per Asrar BE sync response)
**Option A — FE conforms to BE** for path/port; BE reworks auth flow for the new phone-first model (no Aadhaar) per revised Q3.

**FE work:**
- Change port `8080 → 5000`, change paths `/job-seeker/* → /api/jobseekers/*`, etc.
- Accumulate multi-step registration state client-side; submit once at the end (BE will no longer accept a single multipart bundle).

**BE auth flow — locked steps (Asrar, 2026-05-13):**

- **Seeker registration:** Language → Phone Number → Phone OTP → Profile (incl. email) → Categories → Experience → Password → email verification fires at the end.
- **Employer registration (two steps, split locked 2026-05-13):**
  - **Step 1 — Register (JSON-only, no docs):** Phone Number → Phone OTP → Password → Email Verify → Company Details (basic: name, GST, CIN, industry, etc.).
  - **Step 2 — Documents (separate, multipart):** Corporate employers land in `accountStatus=PENDING_DOCUMENTS` after Step 1; upload docs (GST cert + CIN cert + ISO certs etc.) via `POST /api/employers/me/documents` whenever ready.
  - **Individual** employers auto-approve on email-verify (no doc step) → straight to `ACTIVE`.
  - **Corporate** employers stay in `PENDING_DOCUMENTS` until admin approves docs → flipped to `ACTIVE`.
  - **Posting gate:** `POST /api/jobs` returns **403** while `accountStatus=PENDING_DOCUMENTS`. Browse + profile edit still allowed (so the employer isn't fully locked out while admin reviews).

**BE login methods (both roles):**
- Phone + OTP, **OR** Email + Password, **OR** Google OAuth — pick whichever's easiest at the screen.
- **Google OAuth library: `google-auth-library`** (official Google package, not Passport). Stateless JWT pattern: FE emits Google `id_token` → BE `POST /api/auth/google/login { idToken, role }` calls `verifyIdToken` → BE returns our own JWT. FE pairs: `@react-oauth/google` (web), `@react-native-google-signin/google-signin` (mobile).

**BE cleanup (done 2026-05-11/12):**
- All Aadhaar code paths removed — `aadhaarNumber` field on User, `AadhaarVerification` model, send/verify endpoints, Verhoeff validator. None of this is coming back.
- Six audit bugs fixed (BOOKMARKED enum, reject-accepted guard, `crypto.randomInt` OTPs, `JWT_SECRET` fail-fast at boot, OTP omitted from response when `NODE_ENV=production`, `POST /api/admin/create` now self-bootstraps then locks).
- `prabhazkashine/asrar-dev` branch merged into main; clean.

**Backward-compat / data migration:**
- **Zero real users in BE production today** — only `@test.local` test fixtures from Asrar's test scripts.
- `scripts/cleanup-tests.ts` wipes all test data before new-auth deploy.
- **No migration needed.** Clean break.
- *Caveat:* Nazir to confirm nobody (Shaik, Najeeb, demo accounts) registered against the deployed BE; if anyone has, this assumption breaks.

**Decision-tag convention (locked 2026-05-13):**
- BE uses `Q##`, `NC-##`, `T##`, `T2a #`, `T3 #` inline in code (per existing Asrar convention).
- **FE adopts `Q-FE-NN`**, **Mobile adopts `Q-MOB-NN`** — no collision with BE's pure-numeric `Q##`. Pattern: `// Q-FE-12 (2026-05-13) — reason`.

**Follow-ups locked 2026-05-13 (PM, communicated to Asrar):**
- **Email sender = MSG91 Email** — keeps SMS + WhatsApp + Email on one vendor (single dashboard, single bill, single support channel). SendGrid considered and rejected — single-vendor simplicity beats SendGrid's deliverability edge for a 6-week MVP.
- **Shared decision-log master location = git, this FE repo at [`docs/technical/decisions-log.md`](../technical/decisions-log.md).** Asrar to migrate `BACKEND_TASK_LIST.md` + `COMPLETED_TASKS.md` content over. FE + Mobile PR into it. Notion considered and rejected — devs already work in git all day; one fewer tool to manage.
- **Employer corporate doc-upload = split confirmed.** Two-step flow above is canonical.
- **`accountStatus=PENDING_DOCUMENTS` semantic = confirmed.** Browse + profile edit allowed, `POST /api/jobs` returns 403, transition to `ACTIVE` after admin doc approval.

### D7 — Repo strategy
**Two separate Git repos** (FE monorepo + BE). Do NOT merge BE into FE monorepo. Each has its own `.claude/` configuration. The shared API contract (OpenAPI) lives in FE repo's `docs/technical/` and is referenced from BE.

### Q1 — Subscriptions in v1 (revised 2026-05-09: PO-pending → 2026-05-11: PROVISIONAL Option B)
**Provisional working assumption (locked 2026-05-11 to unblock Sprint 1):** Option B from the Pricing Memo.
- **Worker:** Free forever. No premium tier in v1.
- **Employer:** ₹999 / month, manual renewal (no auto-debit), 14-day free trial with day-3 + day-7 in-app + WhatsApp check-ins.

**Status:** PROVISIONAL — awaiting Shaik Ishaq's final confirmation by 2026-05-18. If he picks differently, we update this section + the PRD's M10 paragraph + one seed file. See [`docs/managerial/03-pricing-decision-provisional.md`](../managerial/03-pricing-decision-provisional.md) for the working assumption rationale and reversibility analysis.

**BE work that proceeds regardless:** Razorpay integration, subscription state on User schema, payment history records, free-vs-paid feature gates. Plan names and prices live in seed data, not hardcoded constants. Auto-renewal stays opt-in only in v1 (RBI e-mandate Subscriptions deferred to v2).

### Q2 — TTS / voice playback
**Deferred to v2 backlog.** Voice 🔊 icons stay visible in the FE but click is a no-op or "Coming soon" tooltip. The 10-language UI itself is in v1 (translated strings). Research item to spike post-handover: device TTS vs cloud TTS (Google/Sarvam/Azure) vs pre-recorded audio.

### Q3 — Auth identity model (revised 2026-05-09)
**Phone OTP for both seekers and employers at registration.** No Aadhaar number, no government ID required at signup. Email is collected at the Profile step. **Login (after registration) supports three methods: phone+OTP, Email+password, Google OAuth** — same options for both roles. Reasoning: closest Indian competitors (Apna, WorkIndia) use phone OTP only at signup; requiring Aadhaar would force Puttaswamy alternative-ID paths and DPDP-compliant data handling for marginal trust gain (full reasoning in revised Q4).

### Q4 — Aadhaar verification (revoked 2026-05-09)
**Aadhaar verification is removed from v1 entirely and will not be reintroduced in v2 of this product** unless a future business decision overrides this. Reasons:

1. **Indian market behaviour** — closest competitors (Apna, WorkIndia) don't require Aadhaar at signup; phone OTP only. Forcing Aadhaar adds friction at the wrong moment of the funnel.
2. **Puttaswamy 2018 Supreme Court ruling** bars private companies from making Aadhaar mandatory. We'd have to build alternative-ID pathways (PAN / Driving Licence / Voter ID) anyway — extra screens, schema, admin verification work for marginal trust gain.
3. **Real UIDAI verification needs an AUA / sub-AUA licensed partner** (IDfy / Signzy / HyperVerge / Karza) — 3+ months of contractual setup that doesn't fit a 6-week build.
4. **Mock Aadhaar collection (no UIDAI lookup) creates DPDP Act 2023 compliance burden** — storing 12-digit Aadhaar numbers without performing actual verification.
5. **Engineering time saved:** ~5–7 BE dev-days (OTP flow, Verhoeff validator, alternative-ID schema and screens) plus FE rework on registration screens for both web AND mobile.

**Implication:** the previously planned `docs/technical/aadhaar-integration-research.md` sub-agent task is **cancelled**.

### Q5 — Free tier rules (revised 2026-05-09 → 2026-05-11: PROVISIONAL per Option B)
**Provisional working assumption (locked 2026-05-11 with Q1):**
- **Worker free tier:** unlimited applications; can browse all jobs; can chat with employers who've accepted the application. No premium tier in v1.
- **Employer free tier (after 14-day trial expires):** 0 job posts. Browse-only mode until paid.
- **Employer paid (₹999/month):** unlimited posts, candidate management, messaging, advanced filters, voice messages in native language.

**Status:** PROVISIONAL pending Shaik's confirmation by 2026-05-18 (linked to Q1). If he changes the model, gate boundaries change accordingly. See [`docs/managerial/03-pricing-decision-provisional.md`](../managerial/03-pricing-decision-provisional.md).

### Q6 — Translations: 10 languages in v1
**All 10 in v1.** Parallel content workstream. Practical approach: AI first-pass (Claude/GPT) → native-speaker review per language → load into i18n JSON files. Nazir coordinates reviewers. Risk-registered: if reviewers don't materialize, ship Hindi+English only and rest as soft-launch.

**Storage:** JSON in repo (`next-i18next` on web, `i18next` on RN, sharing keys via a `packages/i18n` workspace). Hosted TMS (Crowdin/Lokalise) deferred to v2. **EN + HI must be 100% complete and reviewed before code freeze (2026-06-14);** the other 8 may soft-launch with `[needs review]` tagging on missing keys (never placeholder English strings).

**Indicative cost (one-time):** ₹35–60k for 1,000 strings × 9 non-English with AI draft + native reviewer; commercial agency would be ₹1.5–2.5L (4-6× more). Source: `docs/technical/job-portal-research.md` Topic 7.

---

## Research-driven decisions (locked 2026-05-06)

> **Source:** [`docs/technical/job-portal-research.md`](../technical/job-portal-research.md) — full industry/Indian-market research with citations. Read it before reopening any of these. The research validates Q1–Q6 and adds Q7–Q13 below.

### Q7 — WhatsApp Business (revised 2026-05-09: IN v1 with conditions)
**Reversed from earlier "v2 only" stance. WhatsApp Business is now in v1** because Azkashine has a non-engineering owner who can run the Meta Business verification + BSP onboarding + template approval process in parallel with the engineering build.

**Why this matters for our users (rationale to put in the Charter):**
- **Indian market reality** — blue-collar workers live in WhatsApp. SMS often goes to spam, gets ignored, or shows as "unknown sender." WhatsApp gets read.
- **Engagement** — WhatsApp open rates for transactional messages run 80%+ in India vs ~30% for SMS.
- **Cost** — WhatsApp utility templates cost ~₹0.10–0.15 per message vs DLT-registered SMS at ~₹0.18–0.25 per message. At our notification volume, this materially affects unit economics.
- **Two-way capability** — seekers can reply to recruiter messages right inside WhatsApp without switching apps.

**Use cases in v1:**
- OTP delivery (WhatsApp + SMS fallback — both wired so neither single point fails)
- Application status updates (accepted / rejected / shortlisted)
- Interview scheduled / 24h reminder / 2h reminder (replaces the SMS-only plan in revised Q13)
- Payment confirmations
- Recruiter messages from employers to shortlisted seekers (gated by paid tier per Q5 once PO decides)

**Conditions accepted by PM (2026-05-09):**
- A non-engineering owner runs Meta Business verification + BSP onboarding + template approval, **starting 2026-05-09** in parallel with S0/S1.
- BSP = **MSG91** (already in our SMS stack — single vendor, single contract, single dashboard).
- Acceptable that WhatsApp goes live up to ~1 week **after** QA handover (2026-06-15) if Meta verification slips. Engineering integration (~5–7 dev-days) plugs in once templates approved. SMS path remains as fallback throughout.

**Templates to draft and submit (8–12):** OTP, application accepted, application rejected, application shortlisted, interview scheduled, interview 24h reminder, interview 2h reminder, payment confirmation, document approved, document rejected, employer-message-to-seeker, password reset.

### Q8 — Content moderation engine
**Wire OpenAI's `omni-moderation-latest` as the "Scan Content" backend.** Free for OpenAI API users, multilingual (4–6× improvement on Marathi/Bengali/Telugu in late 2024 per OpenAI release). Layer India-specific scam regex on top: registration fees, training fees, MLM language, free-mail HR contacts (gmail/yahoo/outlook on a job claiming to be from a real corporate), upfront-payment demands, "earn lakhs by recruiting others" patterns. Manual admin review remains the second gate.

### Q9 — Recommendation algorithm tweaks
The BE already implements profile-based weighted scoring (T2 #13 in `getRecommendedForSeeker`). Update weights for v1:
- **Bump location 10 → 20** (blue-collar workers are commute-sensitive).
- **Trim sector 25 → 20** to compensate.
- **Exponential location decay** beyond 10km: `score *= exp(-(distance_km - 10) / 15)`, clipped at 0.
- **Recency boost:** <24h +10pts, <7 days +5pts, otherwise 0.
- **Cold-start fallback** for empty profiles: `city + popular categories sorted by recency` until the seeker takes 1–2 explicit actions (sets a category, opens a job detail).
- Existing weights unchanged: title-exact 30 / title-fuzzy 15 / experience 15 / skills 20.
- **Click/apply feedback loops** stay v2 (1-day implementation but not critical-path; ship in S3 only if time allows).

### Q10 — Audio format strategy
**Detect at record time, store original, mark MIME in DB. No transcoding.** Encoders produce different containers per platform:
- Chrome / Android web: `audio/webm; codecs=opus`
- iOS Safari: `audio/mp4` (AAC)
- React Native iOS: `.m4a` (AAC)
- React Native Android: `.m4a` or `.opus` depending on library config

All are playable across consumers via a standard `<audio>` element. **Caps (revised 2026-05-09):** chat 60s; **application audio 2 min, standard across web AND mobile.** Earlier 5-minute web cap and 15–20 second mobile cap are both revoked. **Storage backend:** local disk for v1 with a presigned-URL abstraction layer; S3 (or Cloudflare R2 for no-egress) is a one-config-change swap in v2.

### Q11 — Aadhaar alternatives (revoked 2026-05-09 — moot)
With Aadhaar removed entirely (Q4 revised), the Puttaswamy alternative-ID requirement (PAN / Driving Licence / Voter ID) is moot. No alternative-ID screens, no alternative-ID schema, no privacy notice about UIDAI authentication.

### Q12 — Escrow / job-completion payments (revised 2026-05-09: out entirely)
**Out of scope, period — v1, v2, never.** Azkashine's role is to connect seekers with employers; revenue comes from subscriptions, not from the jobs themselves. The platform does not handle money flowing between worker and employer in any form: no escrow, no commission on completion, no payment-intent fields on the data model, no completed-job marking in BE, no settlement workflow. Workers and employers settle directly off-platform (cash, GPay, bank transfer, however they choose). The earlier "stub only" plan that tracked payment intent is also revoked — even the data model fields go away.

### Q13 — Interview scheduling (partially revised 2026-05-09: mode picker deferred for further discussion)
**Modal-based slot picker** triggered by employer's Accept action. Fields: Date / Time / Notes (optional). **The Mode field (In-person with address / Phone with number / Video with paste-link) is being discussed separately — to be locked in a follow-up session.** Mobile design already includes the mode dropdown; web design currently does not. The deferred decision: confirm web adds the dropdown, OR drop mode from mobile too.

**What auto-fires (already wired in BE):** Application status → ACCEPTED; SYSTEM message in chat with interview details; in-app `INTERVIEW_SCHEDULED` notification.

**What's net-new for v1:**
- WhatsApp + SMS confirmation to seeker (per revised Q7 — WhatsApp primary, SMS fallback)
- WhatsApp + SMS reminder 24h before
- WhatsApp + SMS reminder 2h before
- Reschedule button (either party can reschedule once; after that, fall back to chat negotiation)
- Day-after outcome capture screen for the employer: three buttons (**Hired** / **Did not show up** / **Need re-interview**) — drives any subsequent application status update.

---

## Backend module inventory (as of 2026-05-05, post-audit)

> **Audit cross-reference:** detailed per-controller / per-service notes and decision tags are in `03-codebase-audit.md`. This section is the leadership-level inventory; consult 03 when wiring a specific endpoint.

### Built (✅ — verified by reading code)
- **Auth — primary flows:** seeker register/set-password/verify-email/login (email-first today; **Q3 Aadhaar-first rework still pending**); employer-individual + employer-business register/set-password/verify-email/login; admin create/login. JWT (HS256, 7d, secret in `JWT_SECRET`) + PBKDF2 (310k rounds, sha256, 32-byte key, salt-prefixed).
- **Auth — account-management endpoints:** `forgot-password` (email-OTP via `FORGOT_PASSWORD` purpose), `reset-password`, `change-password` (verifies current), `change-email` (OTP to NEW email via `CHANGE_EMAIL` purpose), `change-phone` (OTP to NEW phone), `resend-verification` (returns generic 200 to avoid email enumeration).
- **OTP (phone):** send/verify/resend/status + `PhoneVerification` model + `consumeVerifiedOTP` for cleanup. 6-digit, 10-min expiry, 5 attempts. **OTP value is returned in response body** — mock mode; must be removed before prod.
- **Email OTP:** generic by `(email, purpose)` pair. Purposes: `FORGOT_PASSWORD`, `CHANGE_EMAIL`, `REGISTRATION`. 30s resend cooldown, 10-min expiry, 5 attempts. OTP also returned in response (mock).
- ~~**Aadhaar OTP:**~~ ✅ **REMOVED 2026-05-11** (Asrar, S1-01). Previously had send/verify endpoints + `AadhaarVerification` model + 12-digit regex validator. All Aadhaar-related code, schema, validators, endpoints, and the `aadhaarNumber` field on User are deleted. 9/9 verification tests pass; `prisma db push` clean; no orphan FK references (Aadhaar table had no relations).
- **Job Seeker profile:** GET/PUT `/profile` (with workExperience replace-on-update); `profile-photo` separate endpoint with old-file unlink (NC-2); document CRUD (T2 #15); skills add/list/remove via JobSeekerSkill link rows (Q53). Forbidden-keys guard on PUT (email/phone/password/aadhaarNumber rejected — T1 #8). Email-first registration with profile pic + single document via multipart.
- **Employer profile:** GET/PUT `/profile` for both individual + business; multipart registration with up to 10 docs + optional profilePic; document CRUD (T2 #16) **with min-1-doc invariant enforced on delete**; profile photo update (NC-2); GST/CIN change auto-resets `verificationStatus` to PENDING and notifies admins (T2 #20). Verification queue (`verificationStatus` PENDING/APPROVED/REJECTED). Individual employers auto-approved at register; business gated.
- **Employer dashboard:** `/dashboard/stats`, `/dashboard/jobs`, `/dashboard/recent-applications` — all built and aggregated by employerId.
- **Admin:** create/login; user/jobseeker/employer queues with search + global tab-badge counts (T2a #38); approve/reject/payment-status updates for both jobseeker + employer; document review queue with verify/reject + cascade to jobseeker `documentVerificationStatus`; soft-delete user (NC-9) with separate `/deleted` listing routes.
- **Admin dashboard:** stats (totalUsers, employers, jobseekers, paid counts, formatted ₹revenue at hardcoded ₹500/sub), recent jobs feed, subscription chart with percentages.
- **Admin post moderation:** posts list with moderationStatus filter + summary counts; post detail with warnings + reports + activity stats; approve/reject/no-violation/violation/warning endpoints; activate/deactivate (T2a #34b); hard delete; AI scan engine is **not** wired (admin manually marks NO_VIOLATION or VIOLATION_FOUND — primer was right that it's a stub).
- **Admin Skills CRUD (Q53):** create/update/delete/activate/deactivate skills in catalog (separate from JobSeekerSkill seeker-side links).
- **Jobs:** CRUD with rich filters (search, category, subcategory, jobType list, paymentType, urgencyLevel, status, salary range, **lat/lon + maxDistance via Haversine**, skills `hasSome`, sort, employerId); soft-deleted-employer filter on public browse (NC-9); per-job `showEmailToSeekers`/`showPhoneToSeekers` toggles (NC-5/Q51); `/recruiter-contact` reveal endpoint (404 when employer soft-deleted); related jobs with multi-criteria scoring; `/expired` (FILLED/CLOSED/CANCELLED/past expiresAt) for employer's own; activate/deactivate with strict ACTIVE↔INACTIVE-only state transitions (T2a #34b); auto-mark FILLED when acceptedCount ≥ numberOfPositions (T2 #14).
- **Job Recommendations (T2 #13):** **Already built — primer was wrong to list this as Missing.** Profile-based scoring against `JobSeeker.preferredSector`/`preferredJobTitle`/`workExperience`/`skills`/lat-lon. Excludes already-applied + ACTIVE-only + soft-deleted-employer-filter. Fixed weights: 25 sector / 30 title-exact / 15 title-fuzzy / up to 15 work-experience-token-match / up to 20 skills-overlap (Q53) / up to 10 location-proximity. Tiebreak: createdAt desc. `recommendationScore` not exposed in response.
- **Saved Jobs:** add/remove/list/clear/check/count + auto-filter ACTIVE-only on list.
- **Applications:** apply (text-only message, max 1000 chars), status workflow `PENDING/REVIEWED/SHORTLISTED/REJECTED/ACCEPTED/WITHDRAWN/BOOKMARKED`; withdraw/check/count/my for seeker; getJobApplications/getEmployerAllApplications/stats/jobs-list/candidate-details/accept/reject/bookmark-toggle for employer; Interview model attached on accept.
- **Conversations + messaging:** start/list/get-messages (with `?after=<messageId>` for polling) / send / mark-read. **Scope rule:** seeker must have applied to ≥1 of the employer's jobs to start a conversation. `lastSeenAt` updated on every authenticated request. Per-message `readBy` UUID array. **TEXT messages only** — service explicitly rejects AUDIO/IMAGE. SYSTEM messages auto-posted on apply ("Applied the job"), accept ("Congratulations…"/interview details), reject ("We regret…").
- **Notifications:** `NotificationService.create` + 4 endpoints (list, unread-count, mark-all-read, mark-one-read). 11 types per `NotificationType` enum. Producer hooks fire on apply/accept/reject/admin-approve/admin-reject/document-verified/document-rejected/admin-warning/employer-reverify-needed (`SYSTEM` type). **All notifications are in-app rows only** — no push/SMS/email channels wired anywhere.
- **Skills (public):** `GET /api/skills` for seeker dropdown (auth-required, ACTIVE-only filter). Pagination 1–100.
- **Job Reports (T2 #12):** seeker reports any job with free-text reason (5–1000 chars); duplicates allowed; no notification hook yet; visible in admin post-detail.
- **Job Warnings:** admin → employer about a specific job; auto-flips moderationStatus to VIOLATION_FOUND when starting from NO_VIOLATION/PENDING_REVIEW; in-app notification only.
- **Soft delete (NC-9 — 2026-04-27):** `User.isDeleted` + `deletedAt`. Login/forgot-password/reset-password all gate. `authenticate` middleware rejects deleted users (kills any pre-deletion JWT). Admin-only delete endpoints. Default queues exclude deleted; `/deleted` lists them.
- **Last seen tracking:** `User.lastSeenAt` updated fire-and-forget on every authenticated request; surfaced on conversations list + chat header.
- **Logging + observability:** Winston (console + `logs/error.log` + `logs/combined.log` + exception/rejection handlers). Request-logger middleware logs every HTTP request with duration + statusCode. Prisma query/error/warn/info events wired (currently only warn/error/info logged — query log is commented out).
- **Multer uploads:** profile-pics (image/jpeg|png|gif|webp), seeker docs (pdf+jpg+png), employer docs (broadened 2026-04-24 to pdf+jpg+png+doc+docx), 5 MB cap, multi-file caps (10 docs max). Static-served from `/uploads/*`.

### Missing (❌ — must be built in S1)
- **Subscription module:** Razorpay integration, webhooks, subscription state on User (`subscriptionTier`, `subscriptionExpiresAt`, `lifetimeAccess`, etc.), payment history records, **free-tier metering** (per-day application counter, contact-recruiter gate). The current `paymentStatus` enum (NOT_PAID|PAID) on JobSeeker + Employer is a stand-in only — there is no payment record table, no plan tier, no expiry. **Admin dashboard's revenue is computed from a hardcoded ₹500/sub × paid-user count** — must be replaced.
- **Auth flow rework (Q3 revised 2026-05-09):** today's flow is email+phone-first with an Aadhaar field. Need new flow for both seeker AND employer: Phone Number → Phone OTP → Profile (incl. email) → Categories / Company Details → Experience / Documents → Password → email verification fires at the end. BE registration endpoint must be re-shaped accordingly. Drop the `aadhaarNumber` field, the `AadhaarVerification` model, and all Aadhaar OTP endpoints entirely.
- **Email/Password login + Google OAuth login (NEW, 2026-05-09 lock):** in addition to phone+OTP login, BE must support email+password login (already partially built — review and confirm) AND Google OAuth login (net-new — wire passport-google-oauth20 or similar; ~2 dev-days). Same auth options for both seekers and employers.
- **WhatsApp Business integration (Q7 revised — NEW in v1):** wire MSG91 WhatsApp API for OTP delivery + transactional notifications. Templates submitted via Meta-approved template registry. Engineering work ~5–7 dev-days; gated by Meta Business verification (non-engineering owner runs verification in parallel starting 2026-05-09).
- **AUDIO message type — apply flow (D1):** `applyToJobSchema` accepts only `{jobId, message}` (text). No multer wired on `POST /api/applications`. The audio recorder + `ApplyModal` on FE produce a webm Blob that has nowhere to go. BE must add: multer audio upload (cap = 2 minutes per Q10 revised 2026-05-09), local-disk storage, `JobApplication.audioUrl`/`audioDuration` columns or reuse Document model, validator update.
- **AUDIO/IMAGE messages — chat (D1):** `MessageType` enum already has TEXT/AUDIO/IMAGE/SYSTEM in schema, but `conversation.service.sendMessage` is text-only — service explicitly throws "AUDIO / IMAGE types are not yet supported (needs cloud storage)". Needs storage backend + endpoint shape (multipart? presigned URL?) decision.
- **Polling-based chat delivery (final for this product):** REST polling already supported via `GET /:id/messages?after=<lastId>`. This is sufficient for v1 and is not being upgraded to anything else.
- **AI content moderation engine:** `markPostNoViolation` / `markPostViolation` flip flags but there is no scan engine. Stub OK for v1 (regex blocklist + manual review) per primer; the "Scan Content" UI button needs a corresponding `POST /api/admin/posts/:id/scan` that returns mock violations. Currently FE would have to call the manual mark endpoints directly.
- **i18n strings:** no translation API and no string export. FE consumes static JSON per language (TBD).
- **Notification delivery channels:** only in-app rows persist today. **No FCM / push, no SMS sender, no email sender.** Q5 free-tier defaults need to be redrawn — see `Open product questions` below.
- **OTP delivery:** phone OTP and email OTP services log the OTP and return it in the response (now gated `NODE_ENV !== 'production'` per 2026-05-12 fix). **No real SMS gateway (MSG91) or email sender (MSG91 Email) is wired yet.** This is acceptable for v1 dev/QA but blocks any external user testing.

### Built but undocumented surface
The BE has ~115 endpoints; `API_DOCUMENTATION.md` documents ~68. Roughly 40% of the API surface is silent in the docs (entire `/api/auth`, `/api/conversations`, `/api/messages`, `/api/notifications`, `/api/email-otp`, plus most of admin moderation/dashboard/skills, plus `/me/documents` and `/me/profile-photo` for both seeker + employer, plus `/jobs/recommended`, `/jobs/:id/recruiter-contact`, `/jobs/:id/report`, `/jobs/:id/activate`/deactivate). This is a documentation gap to close in S1 — see `03-codebase-audit.md` for the full delta.

### Decision log convention to adopt
BE code uses inline tags: `Q##`, `NC-##`, `T##`, `T2a #`, `T3 #` referencing dated decisions. **FE should adopt the same convention.** When making non-obvious decisions, tag the code with `// Q-FE-NN (YYYY-MM-DD) — reason` for future-proof traceability. Ask Asrar where the master log lives (likely Notion or shared doc). The full list of tags found in BE source today is in `03-codebase-audit.md`.

---

## Frontend state (`apps/web`)

### Built screens (~30 pages, all mock data, no real auth)
**Job seeker:** register flow (phone/otp/profile/experience/success), login, forgot-password, employee dashboard, job-feed, job-details/[id], my-applications + detail, saved-jobs, test-microphone (audio recording works via `useAudioRecorder` hook + `ApplyModal`).

**Employer:** 5-step register flow (phone/otp/account/company-details/verify-email), dashboard, workers (candidate management).

**Admin:** login, dashboard, employer queue, employee queue, post-moderation (currently inside `apps/web/src/app/admin/*` — to be lifted into `apps/admin` per D4).

### What needs work
- **Reconcile to BE:** port 8080→5000, paths `/job-seeker/* → /api/jobseekers/*`, registration flow restructured to phone-first (no Aadhaar field anywhere); add Email/Google OAuth login paths
- **Wire real auth:** localStorage-only today; needs JWT refresh, auth context, protected route guards
- **Add subscription UI:** payment modals, Free/Elite/Pro/Trial state pills, upgrade flows
- **Add i18n:** wrap strings in `t()`, load JSON per language, persist user choice
- **Voice icons:** keep visible, make no-op tooltips
- **Real chat UI:** the messaging screens are designed but not built yet
- **Notifications dropdown:** designed, not built
- **Recommendation surface:** "Recommended Jobs" + "Near By Jobs" split on feed (currently single section)

### Mobile state
**Zero.** `apps/mobile` does not exist. Mobile dev role is **vacant** as of 2026-05-15 (Dheeraj off project). Once a replacement is hired, they'll build React Native parity to **both** seeker AND employer screens (per the 55-page `Job_Portal_Mobile.pdf`) against the same BE API. No admin mobile app.

---

## Top risks (live as of 2026-05-05)

| # | Risk | Likelihood | Impact | Mitigation owner |
|---|---|---|---|---|
| R1 | **FE/BE divergence** delays integration | High | High | Sprint 1 priority — Nazir owns FE rework, Asrar owns BE auth rework |
| R2 | **Mobile dev vacancy (REOPENED 2026-05-15)** — Dheeraj off project; replacement TBD | High | High | Hire by ~Jun 1 (S2 start); if not filled, mobile slips post-handover; potential descope from D3 (mobile parity) to web-only v1 |
| R3 | **Razorpay integration credentials lead time** | Medium | Medium | Procure sandbox + KYC by May 11 (Nazir to initiate) |
| R4 | ~~Aadhaar mock acceptable to QA?~~ **REVOKED 2026-05-09** — Aadhaar removed entirely (Q4 revised). | — | — | — |
| R5 | **10-language translation reviewer availability** | Medium | Medium | Hindi+English are P0, others can ship soft if reviewers slip |
| R6 | **Scope creep from designs (voice, AI moderation, recommendations)** | High | Medium | Locked v1 here; PRD will repeat the IN/OUT split per feature |
| R7 | ~~Real-time chat (websockets) underestimated~~ **REVOKED 2026-05-09** — websockets scrubbed; polling is final, no upgrade path. | — | — | — |
| R8 | **AI content moderation expectations vs reality** | Medium | Low | v1 = regex blocklist + manual; communicate this to admin team clearly |
| R9 | **No CI yet, no staging env** | Medium | Medium | Infra team to stand up staging by May 17 (Sprint 1 mid) |
| R10 | **Single dev per app = bus factor of 1** | High | High | Daily standups + comprehensive PRD/RTM mitigate; no real fix in 6 weeks |
| R11 | **DLT registration timeline** for transactional SMS (MSG91) — 2–3 weeks from initiation. If we don't start day 1 of S1, OTP via SMS won't be live by code freeze. | High | High | Nazir initiates MSG91 DLT registration on May 11 (S1 day 1); fallback plan = continue mock-mode OTP through QA handover, real SMS goes live in week 1 of UAT. See Q9 in Open product questions. |
| R12 | **Notification channels — net-new BE work** (FCM + MSG91 SMS + MSG91 Email + MSG91 WhatsApp SDKs not wired today) — ~5–6 BE dev-days that weren't in original plan | Medium | Medium | Asrar confirmed 7–9d capacity for all four channels in BE sync (2026-05-12). If capacity insufficient, narrow channels: in-app + SMS-OTP-only as fallback; FCM and email shift to S3. |
| R13 | **Audio messaging gap** — BE rejects AUDIO message types in chat; no multer wired on apply (audit C2/C3) — net-new ~3-5 BE dev-days | Medium | Medium | S1 priority right after auth rework. If slip, audio chat ships in S2; audio-on-application ships in S3. |
| R14 | **WhatsApp Meta Business verification timeline** — 1–2 weeks elapsed before any WhatsApp template approval; failure or delay shifts WhatsApp into post-handover soft launch. | Medium | Medium | Non-engineering owner runs verification starting 2026-05-09; MSG91 BSP (already in stack) reduces vendor risk; SMS fallback wired in case Meta delays. |
| R15 | **Mobile scope expansion — seeker + employer parity** + **vacancy** (Dheeraj off 2026-05-15) | High | High | Mobile work scope is full seeker + employer parity per D3 revised 2026-05-09; but role is vacant as of 2026-05-15. Need replacement hire by ~Jun 1 (S2 start). If not filled: descope to web-only v1 (D3 reversal) OR slip mobile to post-handover phase. Decision required from Shaik by 2026-05-22. |
| R16 | **Pricing model not yet locked** — PO must answer Q1+Q5 by ~2026-05-18 (1 week into S1) or BE subscription work blocks. | Medium | High | Charter circulated to PO 2026-05-09 with competitor matrix and 2–3 concrete option packages. Daily reminder until answered. |

---

## Open product questions (to default in PRD with explicit callouts unless user clarifies)

> **Note 2026-05-06:** Q1, Q2, Q3, Q5, Q6, Q7, Q8 below are all **resolved by Q7–Q13 in the Research-driven decisions section above**. Kept here for reading-history; new sessions should treat the Q7–Q13 entries as canonical.

> **Note 2026-05-09:** The 2026-05-09 PM revision has further changed several previously "resolved" items:
> - Item 1 (mobile parity) — **flipped from "seeker-only" to "seeker + employer" per D3 revised.**
> - Item 2 (websockets) — **scrubbed from doc entirely; polling is final.**
> - Item 5 (notification channels) — **WhatsApp moved from v2 to v1 per Q7 revised.**
> - Items 7, 8 (free-tier app counter; audio storage) — pricing details revoked pending PO; 2-min app audio cap is final.
> - Always defer to the revised Q-section above for canonical state.

1. ~~Mobile feature parity — does mobile have employer screens? admin?~~ **RESOLVED: seeker-only** (research-validated; see "Mobile employer/admin" decision).
2. ~~Real-time chat transport — websockets or polling?~~ **RESOLVED: polling every 10s in v1.** BE already exposes `GET /api/conversations/:id/messages?after=<lastMessageId>`. Websocket upgrade is v2.
3. ~~AI content moderation engine — real or stub?~~ **RESOLVED via Q8 above:** OpenAI `omni-moderation-latest` (free, multilingual) + India scam regex layer + manual admin review. New endpoint `POST /api/admin/posts/:id/scan` to be added.
4. Job category seed data — load from `documents/INPUT-FILES/*.xlsx`? **Default: yes, write a Prisma seed script.** Confirmed schema after audit:
   - `Non_IT_Sectors_Categorized.xlsx` (121 rows): Category → Sector (~12 categories, 121 sectors)
   - `Statewise_Opportunity_Matrix.xlsx` (100 rows): Sector × {Telangana, AP, Karnataka, TN, Kerala} availability matrix (south India only — confirm with Nazir whether to seed all-India or this subset)
   - `non_it_sector_job_designations.xlsx` + `_More.xlsx` (86 rows each, **likely duplicates**): Sector / Employment Type / Designation
   - `Group_1..10_Job_Designations.xlsx` (200 rows × 10 = 2,000 rows): Sector / Employment Type / Job Title — significant repetition of generic titles per sector; expect ~few hundred unique pairs after dedup
   - All `Employment Type` samples seen are "Skilled" — confirm whether SEMI_SKILLED / UNSKILLED also exist
   - **Open:** confirm 5-state vs all-India scope; confirm `_More.xlsx` is or is not a duplicate.
5. ~~Notification channels per event — push only, or also SMS/email?~~ **RESOLVED 2026-05-06; FURTHER REVISED 2026-05-09:** ship in-app + FCM + SMS (OTP + payment confirmation) + email (password reset + employer approval) + **WhatsApp Business** (per Q7 revised — flipped from v2 to v1 with conditions). DLT registration with MSG91 + Meta Business verification both critical-path — see R11 and new R14.
6. Recommendation algorithm details — weights for sector/title/location/recency? **RESOLVED 2026-05-06 via Q9 above** (location 10→20, exp decay, recency boost, cold-start fallback). The original BE weights below are kept for reference:
   - Sector match (`category` === `preferredSector`): 25 pts
   - JobTitle exact match (`subcategory` === `preferredJobTitle`): 30 pts
   - JobTitle fuzzy (`title.contains(preferredJobTitle)`): 15 pts bonus
   - Past work-experience tokens matching title/subcategory: 5 pts each, capped at 15
   - Skills overlap (Q53, JobSeekerSkill ∩ job.skillsRequired): up to 20 pts
   - Location proximity: 10 pts within 10km, sliding to 0 at 100km
   - **No recency boost.** Tiebreak: createdAt desc.
   - Filters: ACTIVE-only, exclude already-applied, exclude soft-deleted-employer jobs (NC-9).
   - **Default:** keep these weights for v1; tune post-launch. Add recency boost if PM wants it.
7. ~~Free-tier seeker — daily app counter reset at midnight IST or 24h rolling?~~ **RESOLVED via Q5 update 2026-05-06: app cap removed entirely** — gate moved to recruiter-contact reveal. Reset timezone is no longer relevant.
8. ~~Audio message storage backend~~ **RESOLVED 2026-05-06 via Q10 above:** local disk + presigned-URL abstraction in v1; S3/R2 migration is one config change in v2. Format detection at record time (webm/mp4/m4a per platform) — no transcoding.
9. **OTP delivery for v1 staging — STILL OPEN:** keep mock-mode (OTP returned in API response, now gated `NODE_ENV !== 'production'`) through code freeze, or switch to real MSG91 SMS during S2/S3? **Default: mock-mode through QA handover (2026-06-15) AS LONG AS DLT registration completes by then;** procure MSG91 sandbox (SMS + Email + WhatsApp all under one account) in parallel with S1. Real OTP delivery goes live in week 1 of UAT (post-handover). See R11.
10. **Job category seed data — STILL OPEN sub-questions:**
    - **5-state vs all-India?** The `Statewise_Opportunity_Matrix.xlsx` only covers 5 south-India states (Telangana, AP, Karnataka, TN, Kerala). Confirm v1 launch scope before BE seed script lands. Default: **all-India** (don't restrict the seeker base by state in v1; use the matrix as reference data, not a launch geography).
    - **Employment Type values?** All audit samples were "Skilled". Default: **single value** in v1 (no SEMI_SKILLED/UNSKILLED) — confirm with stakeholders. Add later if product demand emerges.
    - **`_More.xlsx` is a duplicate?** Audit suggests yes. Default: **dedup on import**, log unique-after-merge count.

---

## How to use this file

When you (a future Claude session) make a decision that affects scope, **edit this file** to add/change the entry. Don't leave it stale. The user trusts this as the source of truth.

When the user asks "what's in v1?" or "did we decide X?" — **read this file first**, then answer.
