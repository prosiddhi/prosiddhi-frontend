# Jira CSV Import — How to use `jira-import.csv` (v2)

**File:** [`jira-import.csv`](jira-import.csv)
**Contents:** 15 module Epics + 65 Stories across 3 sprints (22 S1 + 33 S2 + 10 S3). 6 S1 stories pre-marked `Done` (Asrar's 2026-05-12 BE cleanup batch — code in the BE repo, not Jira-recoverable).

This file maps [`06-sprint-plan.md`](../managerial/06-sprint-plan.md) §3, §4, §5 backlogs into a Jira-compatible CSV. Every story uses a tech-lead handoff description format (Context / Scope / AC checklist / Dependencies / DoD / Risk).

**Shifted from the original CSV (2026-05-15):**
- Sprint dates shifted by 1 week — S1 now starts Mon 2026-05-18 (was May 11)
- QA handover moved to **2026-06-22** (was Jun 15)
- Sprint 2 + Sprint 3 stories now included (originally S1-only)
- Assignees populated from team emails
- `Sprint` column added (assign during import)
- Mobile dev removed (Dheeraj off project; placeholder `owner-mobile-tbd` label until new hire)
- QA: Najeeb (team lead) + Farhana (junior); Najeeb gets `owner-najeeb` label for future assignment

---

## Team accounts to invite into Jira before import

| Role | Name | Email | Status |
|---|---|---|---|
| FE + PM | Nazir Hasan | `nazir.hasan@azkashine.com` | Invite |
| BE | Syed Asrar | `syed.asrar9@azkashine.com` | Invite |
| QA junior | Mohamad Farhana | `Mohamad.farhana@azkashine.com` | Invite |
| QA Lead | Najeeb | — | Pending email; assign via `owner-najeeb` label until ready |
| Mobile | TBD (new hire) | — | Pending; assign via `owner-mobile-tbd` label until hire onboards |
| Infra | Nayan Kumar | `nayankumar@azkashine.com` | Invite |
| Owner / PO | Shaik Ishaq | — | Observer only — no Jira account |

---

## Step 1 — Create the Jira project (one-time, if not already done)

If you already have a project from the original v1 import, skip to **Step 2**.

1. Sign in to your Jira Cloud workspace.
2. **Projects → Create project → Scrum template.**
3. Project name: **Azkashine Job Portal**.
4. Project key: pick something durable (e.g. `JOB`). Every ticket becomes `JOB-1`, `JOB-2`, etc.
5. Access: **company-managed** (gives more flexibility than team-managed).
6. **Enable Story Points** in Project settings → Features.

## Step 2 — Delete the old tickets (since we're doing a full re-import)

Per the 2026-05-15 plan:

1. Go to project Issues → search filter.
2. Filter by all the JOB-* tickets from the previous import (likely JOB-1 through JOB-37 if it was the original 15 Epics + 22 Stories).
3. **Bulk select → Bulk edit → Delete.** Confirm.
4. Result: empty backlog. Note that issue keys will continue numbering forward (next imported ticket will be JOB-38 etc.) — that's fine.

Why this is safe: the 6 stories marked `Done` in the old CSV were code-level work that landed in the BE repo (Asrar's 2026-05-12 audit fixes). Deleting the Jira tickets doesn't undo the code. The new CSV re-imports those 6 stories with `Status=Done` so the Jira history is preserved.

## Step 3 — Create the 3 Sprints in the backlog FIRST

Before importing, manually create the 3 sprint containers:

1. **Board → Backlog → Create sprint.**
2. Sprint 1:
   - Name: **`Sprint 1 — Auth + Subscription`**
   - Start date: **2026-05-18** (Mon)
   - End date: **2026-05-29** (Fri)
   - Sprint goal (paste from `06-sprint-plan.md` §2): *Ship phone-OTP registration + Email/password + Google OAuth login working e2e on web AND mobile for BOTH seeker AND employer; ship the subscription module schema + Razorpay sandbox checkout + webhook on BE; FE port/path/auth reconciliation done; Aadhaar code paths fully deleted from BE.*
3. Sprint 2:
   - Name: **`Sprint 2 — Core flows`**
   - Start: **2026-06-01** · End: **2026-06-12**
   - Goal: *Ship the core seeker+employer interaction loop e2e: apply with 2-min audio, candidate management, polling chat with 60s audio, admin moderation, notification channel matrix, i18n EN/HI wired.*
4. Sprint 3:
   - Name: **`Sprint 3 — Hardening + QA prep`**
   - Start: **2026-06-15** · End: **2026-06-19**
   - Goal: *Hardening: bug bash, performance gate, /security-review checkpoint, seed-data load, EN+HI 100% review, 8 other languages ≥80%, QA pack handover.*

**Sprint name must match the CSV's `Sprint` column exactly** — otherwise the importer won't auto-attach tickets to the sprint.

## Step 4 — Verify project field availability

In project settings → Features, confirm enabled:

- **Components** (used for `M1`–`M15` module tagging)
- **Story Points**
- **Labels** (always on)
- **Sprint** (Scrum default)

Pre-create components M1 through M15 (Project settings → Components) **or** let the importer create them on the fly.

## Step 5 — Run the importer

1. **Settings (cog) → System → External system import → CSV.**
2. Upload `jira-import.csv`.
3. **Project:** select Azkashine Job Portal.
4. Click **Next**.

### Field mapping

| CSV column | Jira field |
|---|---|
| Issue Type | Issue Type |
| Summary | Summary |
| Description | Description |
| Status | Status |
| Priority | Priority |
| Story Points | Story Points |
| Components | Components |
| Labels | Labels |
| Epic Name | Epic Name |
| Epic Link | Epic Link |
| Assignee | Assignee |
| Sprint | Sprint |

Most map by name automatically. Confirm Sprint maps correctly — if Jira doesn't see your pre-created sprints by name, the importer may offer to create them; reject that and verify the names match exactly.

### Status mapping

CSV uses `To Do` and `Done`. If your Jira workflow uses different status names (`Backlog` vs `To Do`), map accordingly during the import wizard.

### Assignee mapping

Importer matches by email. If a user isn't yet invited to the workspace, that row will fail — invite the team members **before** the import (Step 0 prerequisite).

For `owner-mobile-tbd`, `owner-najeeb`, `owner-nayan` placeholder labels — those have **no Assignee** in the CSV (intentionally blank). Apply assignees later via bulk-edit when the people are available.

## Step 6 — Post-import housekeeping (~10 minutes)

1. Verify all 80 rows imported (15 Epics + 65 Stories).
2. Verify the 6 stories show as `Done` (S1-01, S1-07, S1-08, S1-09, S1-10, S1-11).
3. Spot-check a few stories — descriptions should render with the tech-lead format intact (Context / Scope / AC checklist).
4. Verify Story Points are populated.
5. Verify all stories are attached to the correct Sprint (filter by `Sprint = Sprint 1` should show 22 rows; Sprint 2 → 33; Sprint 3 → 10).
6. Verify Epics are linked: open M1 Authentication & Identity and confirm all M1 stories are listed under it.

## Step 7 — Start Sprint 1

When ready Mon 2026-05-18:

1. **Board → Backlog → Sprint 1 → Start sprint.**
2. Confirm start/end dates (2026-05-18 → 2026-05-29).
3. Move ⏳ → 🔧 on stories as work begins.

---

## What's in the CSV vs what's not

**Included:**
- All 15 module Epics with rich descriptions referencing PRD module sections
- All Sprint 1 stories (22; 6 pre-Done, 16 To Do)
- All Sprint 2 stories (33) — broken down from `06-sprint-plan.md` §4 outline
- All Sprint 3 stories (10) — hardening tickets from §5

**Not included (intentional):**
- **Bugs found during sprints** — file as new Jira tickets as they arise; don't pre-fabricate.
- **Subtasks** — every story is a single Issue Type=Story. If a team member wants to break down further inside Jira, that's their call.
- **Sprint Goals / retro notes** — those live in `06-sprint-plan.md` §2 + Jira's Sprint description field.

## Sprint 2 / Sprint 3 expectations

**S2 / S3 stories are best-effort breakdowns from a planning-phase outline.** They'll need re-planning at Sprint 1 close (Fri 2026-05-29):

- Some S2 stories may merge or split based on what S1 actually shipped
- S3 hardening list will tighten once we know real bug count + perf reality
- Mobile stories may shift dramatically depending on when the new mobile dev onboards

**At Sprint 1 retro:** review S2 backlog story-by-story, adjust sizes/owners, re-confirm before starting Sprint 2 on Mon 2026-06-01.

## Connecting GitHub to Jira (recommended)

1. In Jira: **Apps → Find new apps → search "GitHub for Jira" → install** (Atlassian's official, free).
2. Connect both repos: `job-portal-fe` and `job-portal-be`.
3. From then on:
   - Commits like `JOB-12 fix audio cap` auto-link to the ticket.
   - Branch names like `feature/JOB-12-audio-cap` auto-link.
   - PR titles like `JOB-12: cap audio at 2 min` show up under the ticket's Development panel.
4. Smart Commit syntax:
   - `JOB-12 #close` — closes ticket on merge.
   - `JOB-12 #time 2h` — logs time.
   - `JOB-12 #comment Fixed off-by-one` — adds a comment.

## Open assignments now living in Jira

After import, the canonical source for **task status** is Jira, not the Sprint Plan markdown:

- **`06-sprint-plan.md`** is the **planning snapshot** that led to the tickets. Jira is the live tracker. Daily standups reference Jira.
- **`05-rtm-v1.md`** stays the source of truth for AC-level traceability — each Jira story references RTM rows in its description.
- **`02-scope-locked.md`** stays the source of truth for locked decisions — if a Jira story conflicts, scope-locked wins; update the Jira description.

---

## Maintenance protocol

- Sprint mid-point + Sprint close: review Jira board, update RTM (`05-rtm-v1.md`) statuses to match.
- New stories found during a sprint: create in Jira directly (don't re-export CSV).
- Re-import only if you need to add a large net-new batch (e.g., post-S1 retro decides to add 10 new stories).
- Update this README if the import workflow changes.

---

## If you change your mind on Jira

The same CSV imports cleanly into:
- **Linear** — File → Import → CSV (auto-detects most columns)
- **ClickUp** — Settings → Imports → CSV (supports the same column set)
- **Asana** — paid feature on most tiers
- **GitHub Issues** — no native CSV import; would need a `gh issue create` script (~30 min)

But Jira is the right pick for a 5-dev / 5-week build with a dedicated QA — don't overthink it.
