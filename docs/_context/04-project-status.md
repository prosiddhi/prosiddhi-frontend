# Project Status & Operational Bookmarks

**Last updated:** 2026-05-15 (sprint shifted 1 week; Dheeraj off project; Jira board prepped)

> **For new Claude sessions:** This is the operational layer. Read it AFTER the standard primers ([README](README.md), [01-product-summary](01-product-summary.md), [02-scope-locked](02-scope-locked.md)) to know what's done, what's next, and which prompt to fire when. Saves you from re-discovering operational state from chat history.

## ✅ Current phase: PRE-SPRINT-1 — Sprint 1 starts Mon 2026-05-18

**Planning is complete.** All Stage 1 / 2 / 3 artifacts landed. The team executes per [`docs/managerial/06-sprint-plan.md`](../managerial/06-sprint-plan.md), with Jira ([`docs/technical/jira-import.csv`](../technical/jira-import.csv)) as the live tracker.

Sprint 1 day 1 = **2026-05-18** (shifted 1 week from May 11). Code freeze = **2026-06-21**. QA handover = **2026-06-22**.

Future sessions should NOT relitigate scope. If something feels wrong, edit [`02-scope-locked.md`](02-scope-locked.md) and surface the change explicitly — don't drift silently. Use `/check-scope` slash command (Stage 3 output) before committing changes.

## Stage roadmap

| Stage | What it produces | Status |
|---|---|---|
| **0 — Discovery** | Read existing FE/BE/UX/business docs; identify gaps | ✅ done |
| **0.5 — Decision locking** | D1–D7 (architecture) + Q1–Q13 (product) locked; primers written; revised 2026-05-09 + 2026-05-11 | ✅ done |
| **1 — Managerial layer** | Charter ✅, BE sync agenda ✅, Pricing Memo ✅, PRD ✅, RTM ✅, Sprint Plan ✅, DoD ✅, Standup template ✅, Test Plan skeleton ✅ | ✅ done 2026-05-11 |
| **2 — Technical layer** | ~~Aadhaar Research Doc~~ (cancelled — Aadhaar removed), Security spec ✅; OpenAPI contract + DB migrations spec deferred (Asrar to decide approach in S1) | ✅ done (Security); partial deferral noted |
| **3 — Claude operating layer** | Lean root CLAUDE.md ✅, slash commands ✅ (`/check-scope`, `/refresh-pdf`, `/run-kickoff`), scope-drift-checker sub-agent ✅, permissions allowlist ✅. Hooks deferred (not critical for v1) | ✅ done 2026-05-11 |
| **4 — Execution / Sprint backlog** | **CODING starts Mon 2026-05-18.** Sprint 1 = May 18–29; Sprint 2 = Jun 1–12; Sprint 3 = Jun 15–19; code freeze Jun 21; QA handover Jun 22 | 🔄 **pre-S1 (Jira board prep + laptop migration complete)** |

## TL;DR

- **Where we are:** **Pre-Sprint-1 (2026-05-15).** Sprint shifted by 1 week (S1 now May 18–29; QA handover Jun 22). Nazir migrated to new laptop. Memory + Jira board fully prepped. Day-1 cleanup batch from old laptop preserved (Aadhaar deletion + 6 audit bugs landed in BE 2026-05-12 — code in repo, tickets pre-marked Done in fresh Jira import).
- **What's next:** Mon 2026-05-18 — start Sprint 1. Immediate priorities owed by EOD May 18: MSG91 DLT registration (Nazir), Razorpay merchant KYC + sandbox keys (Nazir), Google OAuth client registration (Nazir), `apps/admin` workspace init (Nazir). **Mobile workspace blocked on new mobile dev hire.**
- **Team change (2026-05-15):** **Dheeraj off project** — replacement mobile dev pending. **Farhana joins as QA junior** alongside Najeeb (QA Lead). All mobile Jira stories use `owner-mobile-tbd` label.
- **Locked 2026-05-13 (PM → Asrar):** (1) MSG91 Email for email sending; (2) git-tracked `docs/technical/decisions-log.md` as shared decision log; (3) employer corporate doc-upload split into two-step flow; (4) `accountStatus=PENDING_DOCUMENTS` semantic confirmed.
- **Pending external answers:** (1) Shaik's pricing confirmation by 2026-05-18 (PROVISIONAL Option B in place); (2) Meta WhatsApp owner; (3) **mobile dev hire ETA** (new — added 2026-05-15).
- **For any new session:** Use [`prompts/00-new-session-kickoff.md`](prompts/00-new-session-kickoff.md) if you're not yet sure what to do. For coding tasks, the lean root [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) is the entry point. **Jira is the live task tracker** (sprint plan markdown is the planning snapshot).

---

## Artifact status

| File | Status | Owner / Action |
|---|---|---|
| `docs/_context/README.md` | ✅ Final | — |
| `docs/_context/01-product-summary.md` | ✅ Final | — |
| `docs/_context/02-scope-locked.md` | ✅ Final (revised 2026-05-09 — major scope changes; see session log) | — |
| `docs/_context/03-codebase-audit.md` | ✅ Final (audit session 2026-05-05) — note: parts about Aadhaar OTP / Verhoeff / employer email-first are now historical, scope has changed | — |
| `docs/_context/04-project-status.md` | ✅ This file | — |
| `docs/_context/prompts/*` | ✅ Refreshed 2026-05-09 for new scope. `01-charter-summary.md` deleted. `00-new-session-kickoff.md`, `02-be-sync-agenda.md`, `03-prd-v1.md`, and `README.md` all updated to reflect Aadhaar removed, WhatsApp added, mobile employer parity, pricing → Shaik | — |
| `docs/technical/job-portal-research.md` | ✅ Final (Claude Desktop, 2026-05-06) | — |
| `docs/managerial/01-project-charter.md` | 🔄 **Rewritten 2026-05-09 in plain language for PO sign-off** (replaces the technical version). Trimmed 2026-05-09 to ~200 lines after PM review (5.2/5.3/6.3/8.3/10 deleted; pricing extracted to separate memo); names filled in (Sponsor: Shaik Ishaq, BE: Asrar, Mobile: Dheeraj, QA: Najeeb, Infra: Nayan; WhatsApp owner TBD) | **Nazir** to circulate to Product Owner alongside the pricing memo |
| `docs/managerial/03-pricing-decision-memo.md` | ✅ Sent to Shaik 2026-05-09. Plain English. Verified competitor pricing for Apna (₹699–₹7,099), Naukri (₹400–₹1,650/post), WorkIndia, JobHai (free). Three options (A/B/C) with annual revenue projections at 1k/5k/10k employer scales. Recommends Option B. | — |
| `docs/managerial/03-pricing-decision-provisional.md` | ✅ Created 2026-05-11 — provisional working assumption to unblock Sprint 1. Option B applied (worker free, employer ₹999/mo, 14-day trial with day-3+day-7 check-ins). Reversible if Shaik overrides by 2026-05-18. | — |
| ~~`docs/managerial/01-project-charter-summary.html`~~ | ❌ Deleted 2026-05-09 — Charter is itself user-friendly now | — |
| ~~`docs/managerial/01-project-charter-summary.pdf`~~ | ❌ Deleted 2026-05-09 — Charter is itself user-friendly now | — |
| `docs/managerial/02-be-sync-agenda.md` | ✅ Refreshed 2026-05-09 for the 2026-05-09 scope revisions (Aadhaar code deletion, phone-first auth for both roles, Email/Google OAuth login, WhatsApp Business via MSG91, escrow code prohibited, audio cap 2 min). Deadline for Asrar's response: 2026-05-12 | **Nazir** to send to **Asrar** |
| `docs/managerial/04-prd-v1.md` | ✅ **Landed 2026-05-11** — 969 lines / ~83KB / 15 modules / ~130 acceptance criteria. Built against PROVISIONAL Option B pricing. Honours all 2026-05-09 scope revisions (no Aadhaar, no escrow, no WebSockets — Appendix C confirms). Ready to be consumed by RTM (Prompt 9) and Sprint Plan (Prompt 10). | — |
| `docs/managerial/05-rtm-v1.md` | ✅ **Landed 2026-05-11** (Prompt 9 output) | — |
| `docs/managerial/06-sprint-plan.md` | ✅ **Landed 2026-05-11** (Prompt 10 output) | — |
| `docs/managerial/07-definition-of-done.md` | ✅ **Landed 2026-05-11** (Prompt 6 output) | — |
| `docs/managerial/08-standup-template.md` | ✅ **Landed 2026-05-11** (Prompt 6 output) | — |
| `docs/managerial/09-test-plan.md` | ✅ **Landed 2026-05-11** (Prompt 7 output — skeleton; Najeeb populates full content post-PRD) | — |
| `docs/technical/security-spec.md` | ✅ **Landed 2026-05-11** (Prompt 8 output) | — |
| `.claude/CLAUDE.md` (lean) + `.claude/commands/*` + `.claude/agents/scope-drift-checker.md` + `.claude/settings.local.json` | ✅ **Landed 2026-05-11** (Prompt 5 output, Stage 3) | — |
| `docs/_context/prompts-review.md` | ✅ **Landed 2026-05-11** (Prompt 11 output) — flags fixes for prompts 7, 9, 10 before they fire | — |
| ~~`docs/technical/aadhaar-integration-research.md`~~ | ❌ **Cancelled 2026-05-09** — Aadhaar removed entirely from product per Q4 revised | — |
| `apps/admin/` (separate workspace per D4) | ⏳ Not created yet | Nazir, Sprint 0 task |
| `apps/mobile/` (RN — full seeker + employer per D3 revised 2026-05-09) | ⏳ Not created yet | Dheeraj, S1 |
| FE/BE port + path reconciliation (D6 revised 2026-05-09: includes Aadhaar code removal) | ⏳ Pending | Nazir + Asrar, S1 day 1 |
| Meta Business verification + MSG91 BSP onboarding for WhatsApp (Q7 revised 2026-05-09) | ⏳ Not started | **Non-engineering owner TBD** — must start ~2026-05-09 |
| `Archive.zip` deleted; stale `*.md` + superseded docs archived (D5) | ✅ done 2026-05-08 | — |

Status legend: ✅ final · 🔄 drafted, awaiting external sign-off · ⏳ not started

---

## Session log

### 2026-05-15 (new laptop, sprint shift, Dheeraj off, fresh Jira board)

- **Laptop migration complete.** Memory ported from Mac (`/Users/nazirhasan/...`) to Windows (`c:\dev\Azkashine\Job_Portal_ProSiddhi\job-portal-fe`). Paths in 7 memory files updated; frontmatter converted to current format. Backup zip kept.
- **Sprint shifted 1 week.** S1 starts Mon 2026-05-18 (was May 11); S2 Jun 1–12; S3 Jun 15–19; code freeze Jun 21; QA handover **Jun 22**.
- **Team change:**
  - **Dheeraj off project.** All mobile work (S1-05, S1-MOB-*, S2-MOB-*) now assignee-blank with label `owner-mobile-tbd`. New mobile dev hire pending — major risk if not filled by ~Jun 1 (S2 start). Decision needed from Shaik by 2026-05-22 on fallback (web-only v1 vs slip mobile post-handover).
  - **Farhana joins as QA junior** (Mohamad.farhana@azkashine.com). **Najeeb continues as QA Lead** — to be assigned in Jira when his account is set up.
  - **Nayan's** infra work continues; Jira account pending.
- **Jira board fully prepped.** [`docs/technical/jira-import.csv`](../technical/jira-import.csv) now contains 80 rows (15 Epics + 22 S1 + 33 S2 + 10 S3) with full tech-lead-handoff descriptions, RTM cross-refs, assignees populated from team emails. README at [`jira-import-README.md`](../technical/jira-import-README.md) explains: delete existing 37-ticket import, create 3 sprints with new dates, re-import.
- **Doc cascade complete:** `.claude/CLAUDE.md`, `02-scope-locked.md`, this file, `06-sprint-plan.md`, memory files all updated with new dates + team. Background agent handled Charter / PRD / RTM / DoD / standup / test plan / BE sync / security spec.

### 2026-05-14 (Sprint 1 day 4 — readability pass + Jira setup + laptop handover prep)

- **PRD + RTM readability pass.** [`04-prd-v1.md`](../managerial/04-prd-v1.md) got a full tag glossary (D/Q/R/NC/T tags + status markers + audit refs), a plain-English intro on all 15 modules, and user-journey walkthroughs on M1/M4/M5/M8/M10. [`05-rtm-v1.md`](../managerial/05-rtm-v1.md) got a glossary pointer + plain-English summary line per module. No acceptance criteria changed — narrative added around the existing contract.
- **Task tracker = Jira (free tier).** Created [`docs/technical/jira-import.csv`](../technical/jira-import.csv) (15 module epics + 22 S1 stories, 6 pre-marked Done per Asrar's BE sync) + [`jira-import-README.md`](../technical/jira-import-README.md) with import steps. Once imported, Jira is canonical for task status; `06-sprint-plan.md` becomes the planning snapshot.
- **Pre-execution setup gaps captured.** New "Pre-execution operational setup (SETUP-GAPS)" section added below — 6 gaps, 2 resolved (Jira, Teams), 2 open (CI provider, PR conventions), 2 deferred (BE `.claude/`, secrets).
- **Laptop handover.** Nazir moving to a new laptop. Git repo committed + pushed. Project memory bundled to `~/job-portal-memory.zip` + `.tar.gz` for manual transfer (memory is not git-tracked and not account-synced).

### 2026-05-05 (Stage 0 + 0.5 — first day of planning)

- Discovered FE codebase (`apps/web` — ~30 pages, mock data, no real auth) + BE codebase (`job-portal-backend-azka` — ~70% built, 16+ commits) + UX PDF (64 pages) + business flows (`documents/Job_Portal.md`, flowcharts) + technical architecture docx
- Reconciled FE/BE divergence findings — port mismatch (8080 vs 5000), path mismatch (`/job-seeker/*` vs `/api/jobseekers/*`), auth model mismatch (phone-first vs email-first)
- Locked decisions D1–D7 + Q1–Q6 with Nazir
- Created context primers: [README](README.md), [01-product-summary](01-product-summary.md), [02-scope-locked](02-scope-locked.md)
- Memory system seeded (D1–D7, FE/BE divergence, repos, pacing feedback, session state)
- Spawned **2 parallel sub-sessions:**
  - Charter draft → `docs/managerial/01-project-charter.md`
  - Codebase audit → `docs/_context/03-codebase-audit.md` (with corrections back to `02-scope-locked.md`)
- Audit findings: 5 corrections to primer (recommendations were already built; Verhoeff missing; chat is text-only; apply is text-only; no notif channels), 2 new open questions added (Q7 audio storage, Q8 OTP delivery), 4 BE bugs surfaced (BOOKMARKED validator, reject-accepted guard, Math.random OTP, JWT default secret)

### 2026-05-06 (today — Stage 0.5 finalization + Stage 1 prompt prep)

- Industry research produced via Claude Desktop with web search (12 topics, ~25 pages with citations) → `docs/technical/job-portal-research.md`
- Reviewed research; **locked Q7–Q13** with Nazir:
  - Q7: WhatsApp Business API → v2
  - Q8: Content moderation engine = OpenAI `omni-moderation-latest` (free, multilingual)
  - Q9: Recommendation algo tweaks (location 10→20, exp decay, recency boost, cold-start fallback)
  - Q10: Audio format detection at record time (no transcoding); local disk + S3 abstraction
  - Q11: Aadhaar alternatives mandatory (PAN/DL/voter ID per Puttaswamy)
  - Q12: Escrow → stub for v1, real Razorpay Route in v2
  - Q13: Interview scheduling — modal slot picker + 3 modes + SMS reminders + outcome capture
- Refined locked decisions:
  - Q1: trial 7→14 days; opt-in renewal (RBI e-mandate v2)
  - Q5: free-tier app cap **removed**; gate moved to recruiter-contact reveal
  - Q6: i18n storage approach + cost estimate added; EN+HI must be 100% by code freeze
- Updated risks: **+R11** (DLT registration timeline), **+R12** (notification channels net-new BE work), **+R13** (audio messaging gap)
- Applied Charter diff (8 edits) to align Charter with research-locked scope
- Generated 3 saved session prompts in `prompts/`:
  - 01-charter-summary (stakeholder sign-off doc)
  - 02-be-sync-agenda (BE sync for Asrar)
  - 03-prd-v1 (the big one)
- Created this file (`04-project-status.md`) for operational continuity

### 2026-05-09 (PM scope-revision session — major changes)

PM (Nazir) drove a working session to revise scope based on (a) findings from the mobile design PDF audit and (b) re-evaluation of decisions under research-backed reasoning. **Eight scope changes locked, two cancellations, one decision deferred.**

**Scope changes applied to [`02-scope-locked.md`](02-scope-locked.md):**

1. **Aadhaar verification removed entirely** (Q3 + Q4 revoked). Phone OTP is the only registration identity. Reasons: Apna/WorkIndia don't require Aadhaar; Puttaswamy bars mandatory Aadhaar for private companies; real UIDAI needs 3+ months partner contract; mock Aadhaar adds DPDP burden without verification value; ~5–7 BE dev-days saved. Q11 alternative-ID requirement (PAN/DL/Voter ID) is moot. The previously planned `aadhaar-integration-research.md` sub-agent task is **cancelled**.

2. **Escrow / job-completion payments removed entirely** (Q12 revised). Out of scope forever, not just v2. Platform never handles money between worker and employer in any form (no escrow, no commission, no payment-intent fields, no completed-job marking). Revenue is subscription-only.

3. **Pricing decisions moved to Product Owner** (Q1 + Q5 revised — both PO-pending). Specific numbers (₹50, ₹250, 14-day trial) revoked. Charter presents competitor matrix + 3 option packages for PO to choose from. Decision deadline: 2026-05-18, otherwise BE subscription work blocks.

4. **Application audio cap reduced to 2 minutes** (Q10 revised). Standard across web AND mobile. Earlier 5-minute web cap and 15–20-second mobile cap both revoked.

5. **WhatsApp Business added back to v1** (Q7 reversed) — conditions: non-engineering owner runs Meta verification in parallel; MSG91 as BSP (already in stack); accept that WhatsApp may launch ~1 week after handover if Meta delays; SMS stays as fallback. Charter cites WhatsApp engagement (80%+ vs ~30% for SMS) and per-message cost (₹0.115 vs ₹0.18-0.25) as the rationale.

6. **Mobile expanded to seeker + employer parity** (D3 revised). Mobile design PDF reveals full employer experience (registration, dashboard, posting, candidate mgmt, chat, profile). **Dheeraj** confirmed as the dedicated mobile developer.

7. **Auth flow: phone-first + Email/Google OAuth** (D6 + Q3 revised). Same auth options for both seekers and employers. Aadhaar code, AadhaarVerification model, Verhoeff validator all to be deleted from BE in S1 day 1.

8. **Three features scrubbed entirely from doc** (no "deferred" mention anywhere): WebSockets / real-time chat transport, voice message transcription, .ics calendar invites.

9. **Deferred for further discussion (not yet locked):** Q13 interview Mode picker. Mobile design has it; web design doesn't. Decision: confirm web adds it OR drop from mobile.

**Charter rewritten** ([`01-project-charter.md`](../managerial/01-project-charter.md)) — full plain-language rewrite for PO sign-off. Replaces the technical Charter that the PO found impenetrable. Combines research findings with the build plan. Presents 3 pricing options for PO to choose from. ~22KB, ~370 lines.

**Old summary HTML/PDF deleted** (`01-project-charter-summary.html` and `01-project-charter-summary.pdf`) — Charter itself is now user-friendly, separate summary is redundant.

**Risks updated:** R4 (Aadhaar mock acceptable to QA?) and R7 (websockets) revoked; new R14 (WhatsApp Meta verification timeline), R15 (mobile employer scope expansion), R16 (pricing not yet locked) added.

**Mobile design audit done** — read all 55 pages of `Job_Portal_Mobile.pdf`. Mobile has a complete employer mobile experience (login, registration, dashboard, posting, candidate management, schedule interview with mode picker, messaging with audio, profile, subscription tabs). Mobile bottom nav: 4 tabs for seeker (Home / Job Feed / My List / Profile), 5 tabs for employer (Home / Job Post / Candidates / Messages / Profile). Documented in revised D3.

**Open follow-ups for next session:**
- Refresh BE sync agenda for the new scope; send to Asrar.
- Refresh `prompts/00-new-session-kickoff.md` and `prompts/03-prd-v1.md` to reflect 2026-05-09 changes.
- Identify the non-engineering owner for Meta Business verification.
- Wait for PO pricing decision; if not received by 2026-05-18, default to Option A and proceed.

### 2026-05-09 (evening — comprehensive primer + prompt + memory sweep)

After the morning's scope revision and Charter rewrite, did a full housekeeping pass to bring all dependent docs in line with the new locked state. **Charter + Pricing Memo PDFs sent to Shaik. BE sync agenda sent to Asrar.** Now at a natural pause point — heavy artifacts (PRD, RTM, Sprint Plan) blocked on Shaik (pricing, deadline 2026-05-18) and Asrar (BE sync responses, deadline 2026-05-12).

**Updates applied:**

- **Memory (5 files):** MEMORY.md index + project_decisions_locked + project_team_and_timeline (full named team) + project_session_state + project_context_primers — all rewritten for the 2026-05-09 state.
- **Primer:** `01-product-summary.md` rewritten — Aadhaar references purged, mobile employer parity added, pricing TBD, audio cap 2 min, "permanently out of scope" section added (Aadhaar + escrow), WebSockets/transcription/.ics scrubbed.
- **Prompts:** `01-charter-summary.md` deleted (obsolete); `00-new-session-kickoff.md`, `02-be-sync-agenda.md`, `03-prd-v1.md`, `README.md` all rewritten for 2026-05-09 scope. PRD output path moved from `03-prd-v1.md` to `04-prd-v1.md` (since 03 is now the Pricing Memo).
- **BE sync agenda doc** at `docs/managerial/02-be-sync-agenda.md`: full refresh — new headline-changes section, capacity table updated, Aadhaar deletion + WhatsApp added, scope-confirmation checklist updated. Ready to send to Asrar; response deadline 2026-05-12.
- **PDFs regenerated** for Charter + Pricing Memo (after later edits to names + Owner & Sponsor framing).
- **PDF generation script** moved from `/tmp/md_to_pdf.py` to `docs/_context/tools/md_to_pdf.py` for durability.

### 2026-05-13 (Sprint 1 day 3 — Asrar BE sync response + PM decisions on four bounced items)

**Asrar's BE sync response** ([Downloads/02-be-sync-response-asrar.md], 2026-05-12) landed and was reviewed today.

**Closed by Asrar's response:**
- §3 Capacity overflow stand-down — Asrar commits to full S1+S2 plan; no contractor procurement needed for now (Plan B = defer Razorpay S1-17 to S2 if mid-sprint slip > 1 day)
- §4 audit-bug omnibus done 2026-05-12: BOOKMARKED enum, reject-accepted guard, `crypto.randomInt` OTPs, `JWT_SECRET` fail-fast, OTP omitted in production. Bonus: `POST /api/admin/create` now self-bootstraps then locks
- S1-01 Aadhaar deletion done 2026-05-11; 9/9 verification tests pass; clean `prisma db push`; no orphan FK refs
- §3 #3 Google OAuth library = `google-auth-library` (not Passport)
- §5 OpenAPI = manual `API_DOCUMENTATION.md` for v1; OpenAPI auto-gen is S2 stretch only
- §11 Branch state = clean; `prabhazkashine/asrar-dev` merged to main via PR #4
- Q-FE-NN / Q-MOB-NN tagging convention confirmed (no collision with BE's `Q##`)

**Closed by Nazir's reply to Asrar (same day):**
- §4 Email sender = **MSG91 Email** (single-vendor with SMS + WhatsApp wins for a 6-week MVP). SendGrid rejected.
- §10 Decision log master location = **git, this FE repo, `docs/technical/decisions-log.md`** (Notion rejected; devs already work in git). Asrar to migrate his local `BACKEND_TASK_LIST.md` + `COMPLETED_TASKS.md` over.
- Employer corporate doc-upload = **split into two-step flow** (registration JSON-only, then `POST /api/employers/me/documents` after email-verify). Reduces drop-off in registration funnel.
- `accountStatus=PENDING_DOCUMENTS` semantic = **confirmed**. Browse + edit profile allowed; `POST /api/jobs` returns 403 until admin approves docs and flips to `ACTIVE`.

**Docs updated:**
- [`02-scope-locked.md`](02-scope-locked.md) — D6 expanded with locked auth flow steps for both roles + Google OAuth library + zero-users plan + decision-tag convention + locked-2026-05-13 follow-ups. Header revision block now lists both the 2026-05-12 (Asrar) and 2026-05-13 (PM) updates. BE module inventory: Aadhaar OTP entry flipped from "TO BE REMOVED" to "✅ REMOVED 2026-05-11". All `Sendgrid` references replaced with MSG91 Email.
- [`06-sprint-plan.md`](../managerial/06-sprint-plan.md) §8 — six open assignments closed: #1 (stand-down), #3 (google-auth-library), #4 (MSG91 Email), #5 (manual API docs), #10 (git decisions log), #11 (branch clean). Open: #2 (non-blocking), #6, #7, #8, #9.
- This file — TL;DR + session log updated.

**Still open (track daily):**
- Shaik's pricing confirmation by 2026-05-18 (5 days from today; PROVISIONAL Option B in place)
- Meta WhatsApp owner identification (Charter §8.1 names Shaik but delegate vs Shaik-himself unclear; Nazir to talk to Shaik)
- Workspace inits: `apps/admin/` (Nazir) + `apps/mobile/` (Dheeraj) — still ⏳
- External procurements still ⏳ — MSG91 DLT registration, Razorpay KYC + sandbox keys, Google OAuth client registration, OpenAI API key, FCM project + iOS APNs cert
- `docs/technical/decisions-log.md` skeleton needs to be created so Asrar can start migrating his local logs

### 2026-05-11 (end of day — ALL PLANNING COMPLETE)

**Stage 1, 2, and 3 all done.** The team can now execute against locked, documented scope.

**Artifacts landed today (in firing order):**

| # | Artifact | File | Notes |
|---|---|---|---|
| 1 | PRD v1 | `04-prd-v1.md` | 969 lines, 15 modules, ~130 acceptance criteria; built against PROVISIONAL Option B |
| 2 | Stage 3 / Claude layer | `.claude/CLAUDE.md` (lean) + `commands/*` + `agents/scope-drift-checker.md` + `settings.local.json` | Lean replaces 1M-user enterprise template; 3 slash commands; 1 sub-agent |
| 3 | DoD | `07-definition-of-done.md` | Per-feature checklist, sprint-level DoD, "done done" criteria from Charter §9 |
| 4 | Standup template | `08-standup-template.md` | Async standup format, Friday demo + retro, blocker escalation |
| 5 | Security spec | `docs/technical/security-spec.md` | Project-anchored (Express + Prisma + Zod); OWASP top 10 with our actual mitigations; Fastify ref dropped per review |
| 6 | Prompts review | `prompts-review.md` | Flagged issues in prompts 7/9/10; fixes applied before firing |
| 7 | Test Plan skeleton | `09-test-plan.md` | 15-module test scope; tooling deferred to Najeeb (deadline 2026-05-25) |
| 8 | RTM v1 | `05-rtm-v1.md` | ~130 rows tracing every PRD AC to owner/sprint/status/test |
| 9 | Sprint Plan + S1 Backlog | `06-sprint-plan.md` | S1 stories with ≤7 dev-day budget per dev; S2 + S3 outlines; cross-sprint dependencies |

**Provisional pricing locked:** Option B (worker free, employer ₹999/mo, 14-day trial with day-3 + day-7 check-ins). Documented in `03-pricing-decision-provisional.md`. Shaik's final confirmation due 2026-05-18; reversible.

**The transition from planning to execution is complete.** Tomorrow (May 12) onwards is sprint execution per the Sprint Plan; daily standups start; Asrar's BE sync response is due EOD. Real code begins.

### 2026-05-11 (afternoon — PRD landed)

- **PRD ✅ generated** at `docs/managerial/04-prd-v1.md`. 969 lines, 15 modules, ~130 acceptance criteria. Built against PROVISIONAL Option B pricing. All 2026-05-09 scope revisions honoured. Module-by-module BE endpoint + FE screen status markers (✅/🔧/❌/❌❌) populated. Appendix B shows AC distribution per module; Appendix C explicitly lists what the PRD does NOT say (Aadhaar, escrow, WebSockets — confirms scope discipline).
- **Notable PRD open questions surfaced** (per module — full list in PRD body):
  - OpenAPI vs hand-maintained API docs (Asrar to confirm — M15)
  - CI provider (Nazir + Nayan to confirm — M15)
  - Rate-limiter strategy (Asrar — M15)
  - Sentry / observability beyond Winston (defer or add now — M15)
- **RTM and Sprint Plan are unblocked.** Prompts 9 and 10 can fire next, sequentially.

### 2026-05-11 (Sprint 1 day 1 — prompts batch + provisional pricing)

- **Provisional pricing applied (Option B).** Created `docs/managerial/03-pricing-decision-provisional.md`. Updated `02-scope-locked.md` Q1+Q5, Charter Section 7, regenerated Charter PDF. PRD prompt updated to reference provisional state. Shaik's confirmation still expected by 2026-05-18.
- **7 new prompts drafted in batch** (saved to `docs/_context/prompts/`):
  - `05-stage3-claude-operating-layer.md` — lean CLAUDE.md + slash commands + sub-agent + permissions allowlist
  - `06-dod-and-standup.md` — Definition of Done + Standup Template
  - `07-test-plan-skeleton.md` — Test Plan skeleton (Najeeb populates)
  - `08-security-spec.md` — project-specific security spec
  - `09-rtm-v1.md` — RTM (PRD-consuming)
  - `10-sprint-plan-s1-backlog.md` — Sprint Plan + S1 Backlog (PRD + RTM consuming)
  - `11-prompts-review.md` — review pass on prompts 05–10
- **`prompts/README.md` updated** with the new entries and a suggested firing order for completing all docs today.
- **Goal stated by Nazir:** complete all Stage 1 / 2 / 3 docs today (2026-05-11). Achievable if PRD + Stage 3 + DoD/Standup + Security spec fire in parallel windows, then RTM + Sprint Plan run sequentially after PRD lands. Review prompt (11) runs in parallel to catch issues in 05–10 before they're fired.

**Status of remaining Stage 1 / 2 / 3 work (for the next session to pick up):**

| Tier | Item | Blocked? |
|---|---|---|
| Stage 1 | PRD v1 | Shaik (pricing) + Asrar (BE responses) |
| Stage 1 | RTM, Sprint Plan, S1 Backlog | PRD |
| Stage 1 | DoD, Standup Template, Test Plan skeleton | NOT blocked — can do now |
| Stage 2 | Security spec | NOT blocked — can do now |
| Stage 2 | OpenAPI contract scaffold | Partly Asrar (preference: manual vs Zod-derived) |
| Stage 2 | DB migrations spec | Partly Asrar |
| Stage 3 | Lean root `CLAUDE.md` (replaces 1M-user enterprise template) | NOT blocked — high leverage |
| Stage 3 | Slash commands (`/check-scope`, `/refresh-pdf`, etc.) | NOT blocked |
| Stage 3 | Sub-agents (scope-drift checker etc.) | NOT blocked |
| Stage 3 | Hooks + permissions allowlist | NOT blocked |
| Stage 4 prep | `apps/admin` + `apps/mobile` workspace skeletons | NOT blocked |

**Recommended next-session focus:** Stage 3 (Claude operating layer) — highest ROI because it speeds up every subsequent session during Sprints 1–3. Or knock out the small unblocked Stage 1 templates (DoD, Standup, Test Plan skeleton) for momentum. See `prompts/04-next-session-resume.md` for a copy-paste resume prompt.

### 2026-05-08 (cleanup)

- Executed D5 cleanup. Created `docs/archive/superseded/` and `docs/archive/stale/`.
- **Moved to `docs/archive/superseded/`** (historical reference; resurrect for v2): Job Portal Technical Architecture.docx (53KB), Completed_Job_Portal.docx (132KB), part_1.pdf (1.2MB), flowcharts_all_individual/ folder + zip, INPUT-FILES.zip, job_portal_flows.html.
- **Moved to `docs/archive/stale/`**: AUDIO_RECORDING_DOCUMENTATION.md, REMAINING_CODE_PACKAGE.md, INSTALLATION.md.
- **Deleted** Archive.zip (130MB; Nazir override of original "archive" plan — file was redundant with already-extracted contents).
- Added `.DS_Store` and `Archive.zip` to `.gitignore`.
- **Sync audit (later same day):** compared the original 64-page UX PDF + `documents/Job_Portal.md` (12-flow prose) + `documents/flowcharts_all_combined_design.md` (mermaid) against the locked Charter + primers. PDF is mostly aligned (5 documented design gaps: Q11 alternative-ID path, Q13 interview Mode picker + outcome capture, employer phone-vs-email-first inconsistency, 14-day trial messaging, mobile coverage). Both `.md` docs are pre-Aadhaar-lock and contain v2 features. **Moved both to `docs/archive/superseded/`** with SUPERSEDED banners at top. Updated cross-references in `README.md`, `01-product-summary.md`, and `02-scope-locked.md` D5 entry.
- `documents/` now contains only live spec (1 item): `INPUT-FILES/` (job category seed data for BE migrations).

### Total Stage 0–0.5 footprint

- 5 primer files (`docs/_context/`)
- 1 research doc (`docs/technical/`)
- 1 Charter (`docs/managerial/`)
- 1 BE sync agenda (`docs/managerial/`)
- 3 saved prompts (`docs/_context/prompts/`)
- 6 memory entries (`~/.claude/projects/-Users-nazirhasan-Documents-GitHub-Job-Portal/memory/`)
- ~1,700 lines of decision-rich documentation
- Replaces ~250K tokens of raw discovery (PDF + BE codebase + chat history)

---

## Critical external dependencies (track these daily)

- [x] **Charter circulated to Shaik** (PDF sent 2026-05-09); now provisionally final (working assumption applied 2026-05-11 — Option B pricing). Shaik's confirmation/override still expected by 2026-05-18.
- [ ] **Asrar response to BE sync agenda** — agenda was drafted 2026-05-06; needs refresh for 2026-05-09 scope changes before sending; new target ~2026-05-12.
- [ ] **Mobile dev hire (REOPENED 2026-05-15)** — Dheeraj off project. Replacement TBD. Hire by ~2026-06-01 (S2 start) or descope mobile from v1. **Decision from Shaik by 2026-05-22.**
- [ ] **Meta Business verification + MSG91 WhatsApp BSP onboarding** — non-engineering owner TBD; must be in flight; 1–3 weeks elapsed; **critical-path** for WhatsApp at handover (R14)
- [ ] **DLT registration (MSG91 SMS)** — initiate Mon 2026-05-18 (Sprint 1 day 1, Nazir); 2–3 weeks setup; **critical-path** for SMS at code freeze (R11)
- [ ] **Razorpay merchant KYC** — initiate Mon 2026-05-18 (Sprint 1 day 1, Nazir); similar timeline to DLT
- [ ] **MSG91 Email** procurement (folded into MSG91 master account alongside SMS + WhatsApp) — locked 2026-05-13; Nazir to procure during S1
- [ ] **OpenAI API key** — confirm with Asrar (he may already have one for moderation)
- [ ] **Translation reviewers** — recruit native speakers for the 9 non-English languages; coordinate by Nazir

---

## Pre-execution operational setup (resume keyword: SETUP-GAPS)

Six operational scaffolding gaps surfaced 2026-05-13 — things needed before/around execution that the planning docs glossed over. Status as of 2026-05-14:

| # | Gap | Status | Detail |
|---|---|---|---|
| 1 | Task tracker tool | ✅ **Jira (free tier)** | CSV ready to import at [`docs/technical/jira-import.csv`](../technical/jira-import.csv); steps in [`jira-import-README.md`](../technical/jira-import-README.md). Once imported, Jira is the canonical task tracker — `06-sprint-plan.md` becomes the planning snapshot. |
| 2 | BE repo `.claude/` setup | ⏸ **Deferred** (Nazir's call) | D7 says each repo gets its own `.claude/` config; Asrar's BE repo has none. When resumed: draft a skeleton `.claude/CLAUDE.md` for the BE repo (Express + Prisma + Zod stack-specific). |
| 3 | CI/CD provider | ⏳ **Open** | Recommendation: **GitHub Actions** (free for private repos, code already in GitHub). Needs Nazir + Nayan confirmation. Sprint Plan S1-19 (Nayan) assumes CI is configured. |
| 4 | Secret management policy | ⏸ **Parked** (Nazir's call) | Recommendation: commit `.env.example` to each repo + share real `.env` values via a private channel (1Password vault or password-protected file in Teams). |
| 5 | Team comms channel | ✅ **Microsoft Teams** | Already in place. |
| 6 | PR / branch / commit conventions | ⏳ **Open** | Recommendation: short `CONTRIBUTING.md` at FE repo root — branch naming (`feature/`, `fix/`, `chore/`), Conventional Commits, PR template. ~30 min to write. |

**To resume in a new session:** read this table, then tell the session "continue the SETUP-GAPS work" (or just reference this section). Open items are #3 (CI provider) and #6 (PR conventions); deferred items are #2 and #4 — Nazir reopens those when ready.

---

## Saved session prompts (operational quick reference)

Full prompts live in [`prompts/`](prompts/). Run each in a fresh Claude Code session. Don't chain them in one session.

| # | Prompt | When to run | Estimated time |
|---|---|---|---|
| 1 | ~~`prompts/01-charter-summary.md`~~ | **OBSOLETE 2026-05-09** — Charter itself is now user-friendly; separate sign-off summary is redundant | — |
| 2 | [`prompts/02-be-sync-agenda.md`](prompts/02-be-sync-agenda.md) | Generate BE sync doc for Asrar — **needs refresh** for 2026-05-09 scope changes before re-running | ~30 min |
| 3 | [`prompts/03-prd-v1.md`](prompts/03-prd-v1.md) | Generate v1 PRD (the big one) — **needs refresh** for 2026-05-09 scope changes before running | ~90 min |

**Future prompts** (will be added when their predecessors land):
- RTM scaffold (consumes PRD)
- Sprint Plan + S1 Backlog (consumes PRD + RTM)
- DoD + Standup template (parallelizable sub-agents)
- Test Plan (consumes PRD + RTM)
- ~~Aadhaar Integration Research Doc~~ **CANCELLED 2026-05-09** — Aadhaar removed entirely from product

---

## What goes wrong if you skip the primers + this status file

A new session that does NOT read the primers + this file will:
- Re-read the 64-page UX PDF and ~50+ BE files (cost: 30+ min, ~200K tokens)
- Possibly relitigate decisions Nazir already locked (cost: redoing work + scope drift)
- Miss the saved prompts entirely (cost: re-deriving them from scratch)
- Miss operational state (who owes what by when)

**Always read the primers, then this file, before any task.** ~30K tokens for full context vs ~500K for naive re-discovery.

---

## Update protocol

Whenever a future session makes a non-trivial decision or completes an artifact:

1. **Update this file's "Artifact status" table** — mark artifacts ✅/🔄/⏳ as appropriate
2. **Append to "Session log"** with date + brief summary
3. **If a Q-decision is made, update [`02-scope-locked.md`](02-scope-locked.md)** in the relevant Q-section
4. **Don't leave this file stale** — Nazir trusts it as the operational source of truth
