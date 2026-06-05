# Prompt 10 — Sprint Plan + S1 Backlog

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

**PREREQUISITES:**
- PRD at `docs/managerial/04-prd-v1.md` must exist
- RTM at `docs/managerial/05-rtm-v1.md` must exist

This consumes PRD + RTM and produces a concrete sprint plan with story-level breakdown for Sprint 1.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md (esp. sprint shape +
   risks)
4. docs/managerial/04-prd-v1.md  (REQUIRED)
5. docs/managerial/05-rtm-v1.md  (REQUIRED)
6. docs/managerial/02-be-sync-agenda.md (Asrar's capacity
   table + responses if available)
7. docs/managerial/07-definition-of-done.md (if exists)
8. docs/managerial/03-pricing-decision-provisional.md (for
   M10 sizing)

Your single task: produce a Sprint Plan with concrete story
breakdown for S1 (and high-level outlines for S2 and S3).

==== OUTPUT ====

CREATE docs/managerial/06-sprint-plan.md (~300–400 lines).

Structure:

## Section 1 — Sprint shape recap

Pull from scope-locked.md "Sprint shape" table. Add today's
status (S0 done / S1 starting / etc.).

## Section 2 — Sprint goals

For each sprint (S1, S2, S3), one paragraph stating the
exit gate. Use the goals already in scope-locked.md as the
baseline; refine if PRD revealed something.

## Section 3 — Sprint 1 detailed backlog (PRIMARY OUTPUT)

A table of stories, each with:

- **Story ID** — `S1-[NN]` (S1-01, S1-02, ...)
- **Title** — short imperative ("Delete Aadhaar code from
  BE", "Wire phone-OTP register on web FE", etc.)
- **Module** — which PRD module it implements (M1, M5,
  etc.)
- **Owner** — Asrar / Nazir / Dheeraj
- **Size** — S (≤1 day) / M (1–3 days) / L (3–5 days) /
  XL (≥5 days, split if possible)
- **RTM rows covered** — comma-separated Req IDs (M1-AC1,
  M1-AC2, ...)
- **Dependencies** — other story IDs that must complete first
- **Definition of Done** — link to the DoD doc + any
  story-specific extras
- **Risk** — L / M / H + one-line note

### Sprint 1 must include:

Day 1 (May 11):
- **S1-01 (Asrar, S):** Delete Aadhaar code paths
  (AadhaarVerification model, Verhoeff validator, send/verify
  endpoints, aadhaarNumber field on User schema, related
  routes)
- **S1-02 (Nazir, S):** Initiate MSG91 SMS DLT registration
  paperwork
- **S1-03 (Nazir, S):** Initiate Razorpay merchant KYC
- **(Non-engineering, ongoing — tracked OUTSIDE sprint backlog):**
  Meta Business verification + WhatsApp BSP onboarding with
  MSG91. Owner per BE sync §6 is Shaik Ishaq; Charter §8.1
  still lists this as "TBD (non-engineering)". Nazir to
  reconcile with Shaik day 1 of S1 and update the Charter
  to name Shaik (or the actual owner) explicitly. This is
  NOT a story in the engineering sprint backlog because it
  consumes zero engineering capacity.
- **S1-05 (Dheeraj, S):** apps/mobile workspace skeleton
  (Expo init, basic nav)
- **S1-06 (Nazir, S):** apps/admin workspace skeleton (lift
  admin pages from apps/web)
- **S1-07 (Asrar, S):** Fix audit bug c (Math.random → 
  crypto.randomInt for OTP)
- **S1-08 (Asrar, S):** Fix audit bug d (JWT_SECRET fail-fast
  boot check)
- **S1-09 (Asrar, S):** Fix audit bug a (BOOKMARKED in
  validator)
- **S1-10 (Asrar, S):** Fix audit bug b ("Cannot reject
  accepted" guard)
- **S1-11 (Asrar, S):** Merge `prabhazkashine/asrar-dev`
  branch into main (or document why not yet); resolve any
  conflicts. Per BE sync §8 this is an open question that
  must close before further BE work.

Rest of S1 (May 12–24):
- Phone-OTP auth rework (Asrar BE + Nazir FE + Dheeraj
  mobile — three parallel stories)
- Email + Google OAuth login (Asrar BE + Nazir/Dheeraj
  consumer)
- Subscription module schema + Razorpay integration (Asrar)
  with PROVISIONAL Option B pricing in seed data
- Subscription UI (Nazir + Dheeraj)
- Notification channel integrations (FCM, SMS, WhatsApp,
  email — Asrar)
- WhatsApp template drafting + submission (Asrar + Shaik
  coordinate)
- FE/BE port + path reconciliation (Nazir) — break into
  4 sub-stories:
  - **S1-FE-PORT (Nazir, S):** Port switch 8080→5000 in
    FE config + .env.example update
  - **S1-FE-PATHS (Nazir, M):** Path renames across all
    FE API calls (`/job-seeker/*` → `/api/jobseekers/*`,
    etc.)
  - **S1-FE-AUTH (Nazir, M):** Bearer token interceptor
    + auth context (replaces localStorage-only auth)
  - **S1-FE-GUARDS (Nazir, S):** Protected route guards
    + 401 redirect logic

**Capacity planning (REVISED — read carefully):**

Each dev has 10 dev-days of raw availability per 2-week
sprint, but you must plan against **≤7 committed
dev-days per dev** to leave a 30% buffer for code review,
blockers, unblocking other devs, and unexpected scope.

**Critical context:** the BE sync agenda §3 sizes Asrar's
S1 work at roughly 15–18 dev-days (Aadhaar deletion 1d +
auth rework 3–4d + Email/Google OAuth 2d + subscription
5–7d + audit bug fixes ~4d + start of notifications). This
**exceeds** the 7-day committed budget. You MUST do one of:

1. **Defer scope** — explicitly move work from S1 to S2.
   Authorized cuts (in priority order):
   - Audio-on-application → S2 (chat audio still S2)
   - Admin Scan Content UI → S3 (keep manual moderation)
   - 8 non-English/Hindi languages → soft-launch
   - Recommendation tweaks (Q9) → S3 if time-pressed
   - Recruiter-contact-gate metering → S2 (subscription
     module schema still S1)
2. **Flag a resourcing gap** — if even after authorized
   cuts the math doesn't fit, name it in Section 8 ("Open
   assignments / decisions") and propose what changes:
   contract help for Asrar, push some BE work to a 0.5-FTE
   third dev, or extend S1 by 3 days at the cost of S3.

Do NOT silently overflow. Make every cut explicit. Update
this prompt's Section 6 (cross-sprint dependencies) if a
cut creates a new critical-path item.

## Section 4 — Sprint 2 high-level outline

Bullet list of stories, no detail. Cover: apply flow with
audio, candidate management, chat with audio, admin
moderation, i18n EN/HI implementation, mobile parity catch-up
if S1 mobile is behind.

## Section 5 — Sprint 3 high-level outline

Bullet list. Cover: bug bash, performance pass, security
audit per security-spec.md, seed data load, staging deploy,
code freeze prep.

## Section 6 — Cross-sprint dependencies + critical-path
items

Diagram or short list of items that block multiple stories:
- DLT registration approval (gates real SMS)
- Meta Business verification (gates real WhatsApp)
- Razorpay KYC approval (gates real subscription testing)
- Translation reviewer recruitment (gates 8 non-EN/HI
  languages)
- Pricing confirmation from Shaik (gates final M10 values;
  currently PROVISIONAL Option B)

## Section 7 — Risks specific to S1 execution

Pull from scope-locked.md R1–R16. Highlight which risks are
acute in S1 (typically R1, R11, R14, R16). Add a S1-specific
mitigation note for each.

## Section 8 — Open assignments / decisions

Items where ownership or sequence is still ambiguous. Each
should name who decides and by when. Examples might include:
- Google OAuth client setup — Nazir owns; needs done by
  May 13 to unblock S1-XX
- Sendgrid vs alt email sender — Asrar to confirm by May 12
- OpenAPI vs manual API docs — Asrar to confirm by May 14

==== STORY-SIZING GUIDANCE ====

S (small) = ≤1 dev-day. Example: bug fix with clear
location.
M (medium) = 1–3 dev-days. Example: a single endpoint with
DB schema + validator + tests.
L (large) = 3–5 dev-days. Example: phone-OTP auth rework
on the BE.
XL (extra large) = ≥5 dev-days. Try to split. If unsplittable
(rare), flag it as a risk.

Each dev has 10 dev-days of raw availability per 2-week
sprint, but **plan against ≤7 committed dev-days per dev**
to leave a 30% buffer for code review, blockers, and
unexpected work. If summing committed sizes exceeds 7 per
dev, apply the authorized cuts above (move work to S2 or
flag a resourcing gap).

==== CONSTRAINTS ====

- Do NOT introduce stories outside the PRD. Every story
  must map to ≥1 RTM row.
- Do NOT assign Shaik or Najeeb to engineering stories —
  Shaik runs Meta verification (non-engineering); Najeeb
  starts at UAT 2026-06-15.
- Do NOT exceed each dev's ~10 dev-day capacity in S1. If
  the math doesn't work, explicitly cut scope and flag it.
- Do NOT include Aadhaar work (Q3/Q4 revoked).
- Do NOT include escrow / payment-intent work (Q12 revoked).
- After saving, report 7-line chat summary:
  - File path
  - S1 story count
  - S1 capacity utilisation per dev (Asrar X/10, Nazir Y/10,
    Dheeraj Z/10 — should all be ≤10)
  - Top 3 critical-path risks for S1
  - Items moved to S2 because S1 was full
  - Open assignments still needing a decision
  - One sanity-check anomaly

Today's date: use real current date. User: Nazir Hasan.
Owner: Shaik Ishaq.
```

---

## After this session

The Sprint Plan is the day-to-day operational doc for Sprints 1–3. Update it weekly: mark stories Done, re-plan as needed, add new stories that emerge.

If S1 capacity overflows, the cuts are: defer 8 non-English/Hindi languages to soft-launch, defer audio-on-apply to S2, defer admin Scan Content UI to S3 (keep manual moderation). Always cut polish before cutting critical-path.
