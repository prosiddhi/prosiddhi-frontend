# Prompt 3 — v1 PRD Generator

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

This is the largest single artifact in Stage 1. Expect ~90 minutes of careful work.

**Pricing status (2026-05-11):** We are proceeding with **Option B** from the Pricing Memo as a **PROVISIONAL** working assumption — worker free, employer ₹999/month, 14-day trial with day-3 + day-7 check-ins. Documented in [`docs/managerial/03-pricing-decision-provisional.md`](../../managerial/03-pricing-decision-provisional.md). Shaik Ishaq's final confirmation is due 2026-05-18; if he overrides, we'll update M10. Build the PRD's M10 (Subscription) with the Option B numbers but flag them as PROVISIONAL pending Shaik's final word.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/03-codebase-audit.md
5. docs/technical/job-portal-research.md
6. docs/managerial/01-project-charter.md
7. docs/managerial/02-be-sync-agenda.md (and Asrar's responses
   if available — typically inline in that file or saved as
   docs/managerial/02-be-sync-responses.md)
8. docs/managerial/03-pricing-decision-memo.md (full analysis)
9. docs/managerial/03-pricing-decision-provisional.md (the
   PROVISIONAL working assumption — Option B — that the PRD's
   M10 should build against). If a final decision file exists
   at docs/managerial/03-pricing-decision.md, that overrides
   the provisional one.

Your single task: produce the v1 Product Requirements Document.
This is the largest artifact in Stage 1. Module-based, with
embedded user stories and acceptance criteria. Used by FE / BE /
Mobile devs and QA. Sliced into Sprint backlog after.

==== OUTPUT ====

CREATE docs/managerial/04-prd-v1.md (~30–40 pages markdown).

Cover these 15 modules, in this order:

M1 — Authentication & Identity (phone-OTP for both seeker and
     employer; Email + Google OAuth alternative login; admin
     email-first; NO Aadhaar of any kind per Q3/Q4 revoked
     2026-05-09)
M2 — Profile management (seeker + employer; photos, experience,
     skills, documents)
M3 — Job posting (employer create/edit/expire/activate/deactivate
     with preview)
M4 — Job discovery (feed with Recommended + Near By; search;
     filters; voice icons stay as no-op)
M5 — Job application (apply with audio + text; 2-min cap on
     audio; withdraw; track; free vs paid metering per pricing
     decision)
M6 — Candidate management (employer review, bookmark, accept/
     reject, stats, filters)
M7 — Interview scheduling (modal slot picker; in-person/phone/
     video mode dropdown; WhatsApp + SMS reminders 24h+2h;
     outcome capture)
M8 — Chat / messaging (text + audio 60s; polling-based; scoped
     to applied-jobs only)
M9 — Notifications (in-app + FCM + WhatsApp Business + SMS for
     OTP/payment + email for password-reset/employer-approval;
     11 event types; channel matrix)
M10 — Subscription & payments (Razorpay; specific tier names
      and prices per Shaik's pricing decision — see Pricing
      Memo; manual renewal; no auto-debit)
M11 — Admin verification (employee + employer + document queues;
      approve/reject/payment-status with cascade)
M12 — Admin content moderation (Scan Content via OpenAI omni-
      moderation + India scam regex; Send Warning; Delete; Job
      Reports queue)
M13 — Soft delete (NC-9 admin tool for both seeker + employer)
M14 — i18n (10 languages; EN+HI 100% by code freeze; others
      soft-launch with [needs review] markers)
M15 — Cross-cutting (auth middleware; logging; decision-tag
      convention adoption; API doc closure plan)

==== STRUCTURE PER MODULE ====

### M[N]. [Name]

**Goal** — 1 sentence.

**User stories** — 2–5 in "As a [persona], I want [capability],
so that [outcome]" form.

**Acceptance criteria** — testable bullet checklist that QA can
verify. NO "system is performant" — say "P95 search response
<200ms with 50k jobs." NO "user can register easily" — say
"Registration completes in <3 minutes for an experienced user
without leaving the flow."

**BE endpoints involved** — list with status markers:
   ✅ Built (cite file:line from audit)
   🔧 Needs rework (cite what changes)
   ❌ Net-new (must be built in S1/S2)
   ❌❌ TO BE DELETED (Aadhaar code paths, escrow stubs, etc.)

**FE screens involved** — same status markers, with
apps/web/src/app/... paths.

**Mobile scope** — 1 line: "In v1 mobile (full parity)" / "In
v1 mobile (seeker view)" / "In v1 mobile (employer view)" /
"Web only".

**Out-of-scope (this module)** — explicitly list deferrals,
referencing 02-scope-locked.md Q1–Q13 where relevant. Do NOT
mention WebSockets, voice transcription, or .ics calendar
invites — these are scrubbed entirely from the doc, not
"deferred".

**Open questions** — only items GENUINELY unresolved (not
locked decisions). Each open question must say what it
blocks and who needs to answer (Nazir / Asrar / Dheeraj /
Najeeb / Nayan / Shaik).

==== EXAMPLE — USE THIS STYLE ====

### M1. Authentication & Identity

**Goal:** Allow seekers, employers (Individual + Corporate),
and admins to create accounts and authenticate using phone-OTP
(seekers + employers) or email/password (admin), with Email
and Google OAuth as alternative login methods after registration
(per Q3 revised 2026-05-09 — no Aadhaar of any kind).

**User stories:**
- As a seeker, I want to register using my phone number and
  an OTP, so that I can sign up without sharing any government
  ID.
- As a seeker, after registration I want to log in with email
  + password OR Google, so that I'm not forced to use phone
  OTP every time.
- As an Individual employer, I want to register with phone +
  OTP + company details + email and be active immediately, so
  that I can post jobs same-day.
- As a Corporate employer, my registration enters admin
  approval queue with GST/CIN documents, so that seekers can
  trust verified businesses.

**Acceptance criteria:**
- [ ] Seeker flow Phone → OTP → Profile (incl. email) →
      Categories → Experience → Password → email verify
      completes in <3 min for experienced user.
- [ ] Employer flow Phone → OTP → Password → Email Verify →
      Company Details (with GST + CIN + ISO docs for Corporate)
      completes; Individual auto-approves on email-verify;
      Corporate queues to admin.
- [ ] Phone OTP: 6 digits, 10-min expiry, max 5 attempts;
      delivered via WhatsApp primary + SMS fallback (or mock-
      mode returns OTP in response until DLT/Meta verification
      complete).
- [ ] Email + Google OAuth login wired and tested for both
      seeker and employer.
- [ ] JWT login (HS256, 7d): rejected for SUSPENDED, REJECTED,
      isDeleted=true; lastLogin + lastSeenAt updated on
      success.
- [ ] All `aadhaarNumber` references on User schema deleted;
      AadhaarVerification model dropped from Prisma; Verhoeff
      validator file deleted.

**BE endpoints involved:**
- 🔧 `POST /api/jobseekers/register` (jobseeker.controller.ts)
   — rework from email-first-with-Aadhaar-field to phone-first
- 🔧 `POST /api/employers/register/individual` + `/business`
   — rework to phone-first
- ✅ `POST /api/auth/{forgot-password, reset-password,
   change-password, change-email, change-phone}`
- ❌ NEW: `POST /api/auth/google` (Google OAuth login)
- ❌❌ DELETE: AadhaarVerification model, send/verify endpoints,
   aadhaarNumber field, Verhoeff validator

**FE screens involved:**
- 🔧 apps/web/src/app/register/* (rework to phone-first; remove
  Aadhaar field)
- ❌ NEW: Google OAuth button on login screens
- 🔧 apps/web/src/app/employer/register/* (rework to phone-first)
- ✅ apps/web/src/app/admin/login

**Mobile scope:** In v1 mobile (full parity). All seeker AND
employer registration screens have RN parity per D3 revised
2026-05-09.

**Out-of-scope:** Aadhaar of any kind (Q3, Q4, Q11 revoked —
permanently out, not "deferred"). Multi-factor authentication
beyond OTP. Biometric login.

**Open questions:** Backward-compat for already-registered
users (any) — Asrar to confirm migration approach. Google OAuth
client setup — Nazir owns.

==== END EXAMPLE ====

==== CONSTRAINTS ====

- Do NOT relitigate Q1–Q13 or D1–D7 (revised 2026-05-09).
  They are locked.
- Do NOT speculate beyond source docs. If genuinely
  unspecified, write "Open question: [...]" — don't fabricate.
- Do NOT include implementation details (libraries, code
  snippets). The dev's call within locked scope.
- Do NOT mention WebSockets, voice transcription, or .ics
  calendar invites anywhere — they are scrubbed.
- Do NOT mention Aadhaar verification anywhere except in the
  Out-of-scope section as "permanently removed".
- Do NOT mention escrow, commission, payment-intent, or
  platform-handled wages — out forever per Q12 revised.
- Do NOT re-state Charter / audit / research / pricing memo.
  Reference by file path.
- Status markers (✅/🔧/❌/❌❌) on every BE endpoint and FE
  screen — devs plan from this doc.
- ~30–40 pages markdown. If a module exceeds 3 pages,
  acceptance criteria are too granular — pull back.
- Use Opus 4.7 1M context model. Expect ~90 min of careful
  work.
- AFTER saving, report 5-line chat summary:
  - File path
  - Total page count
  - Modules completed (15/15 expected)
  - Modules with "open question" walls that need someone's
    input before PRD is final
  - One sanity-check anomaly (anything in source docs that
    surprised you)
- Do NOT also produce the RTM, Sprint Plan, DoD, Standup
  template, or Test Plan in this session. Each is a separate
  session — they consume the PRD as input.

Use the real current date. The user is Nazir Hasan. The
Owner & Sponsor is Shaik Ishaq.
```

---

## Practical setup notes

| Item | Action |
|---|---|
| Asrar's responses | Response deadline 2026-05-12. If back by then, save as `docs/managerial/02-be-sync-responses.md` BEFORE running this prompt — the PRD session will pick them up |
| If Asrar hasn't responded yet | The PRD session will produce open questions per module that depend on his answers — that's fine, the PRD becomes "locked except where Asrar pushes back" |
| Pricing | Provisionally Option B per `03-pricing-decision-provisional.md`. If Shaik confirms with different numbers before 2026-05-18, save as `docs/managerial/03-pricing-decision.md` — the PRD session prefers the final file over the provisional one if both exist |
| Expected runtime | ~90 minutes of model work; budget 2 hours including your review |
| Expected length | 30–40 pages of markdown; ~12-15 KB |

## What to do AFTER the PRD lands

1. Read the chat summary the new session reports — pay attention to "modules with open-question walls". Those need answers before PRD is final.
2. Skim the PRD end-to-end. Don't read every acceptance criterion — focus on Out-of-scope and Open questions sections. Errors hide there.
3. If something's wrong, edit `02-scope-locked.md` first (source of truth), then ask a fresh session to update affected PRD modules. Don't edit PRD directly without updating its source.
4. Once PRD is locked, request next prompts: RTM, Sprint plan + S1 backlog, DoD + Standup, Test plan.
