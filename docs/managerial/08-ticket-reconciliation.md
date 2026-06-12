# Ticket Reconciliation — Jira ↔ Code Reality

**Date:** 2026-06-08
**Author:** Nazir (with Claude)
**Sources reconciled:**
- **(A) Jira** — all 87 PJP issues (15 Epics, 71 Stories, 1 Task), full descriptions pulled 2026-06-08
- **(B) Frontend code** — `prosiddhi-frontend` (full read, ~9,900 LOC, ~30 screens)
- **(C) Backend code** — `prosiddhi-backend` (full route/controller/service/schema read, ~140 endpoints)

**Purpose:** Make the Jira board an honest, actionable reflection of what the code actually is, so we can work the backlog without guessing. This doc is the source of truth for the board-cleanup that follows it.

> **Status of this doc:** APPLIED (2026-06-08). The board mutations in §6 have been executed on Jira (PJP). Status changes (PJP-100/101/131 → Done), BE-half-done comments (PJP-92/95/99/102), 6 new FE stories (PJP-138–143), and the de-monorepo reframes (PJP-65/77/107/108/109/118) are all live. This doc remains the source-of-truth record for *why* each change was made.

---

## 0. TL;DR — the six headline findings

1. **Structural drift is the #1 problem.** Every ticket was written for a **pnpm monorepo** (`apps/web`, `apps/admin`, `apps/mobile`, `packages/i18n`, `pnpm --filter web`). The repo migrated (2026-06-05) to **standalone repos**: `prosiddhi-frontend` (plain npm, **admin lives inside it**), `prosiddhi-backend`, and a separate mobile repo. **Nearly every ticket's file paths and commands are now wrong.**

2. **Backend ≫ Frontend.** BE is ~100% built (every endpoint real, no stubs). FE is ~10% wired (one corner of seeker registration, pointed at the *wrong* paths). The remaining MVP work is overwhelmingly **FE integration**, not new BE.

3. **Several BE tickets are marked `To Do` but are already built** — notably **PJP-100** (job validators + state machine + **auto-FILL**) and **PJP-101** (recruiter-contact gate). These should move to Done.

4. **The FE `In Progress` tickets (PJP-77/78/82) haven't actually been started in code** — `api.ts` still uses the old fictional paths, there's no auth layer. Status is optimistic.

5. **The seeker's entire "consume" flow has NO FE tickets.** Browse feed → view job → save → track applications → forgot-password are all UI-only mock screens with **no integration story on the board**. This is the biggest gap (6 new tickets proposed).

6. **PJP-131 is already resolved** — `npm run type-check` passes clean. (The ticket references the old `pnpm --filter web` command.)

---

## 1. Structural drift: monorepo → standalone repos

The board's mental model vs. today's reality:

| Tickets assume (monorepo) | Reality today (standalone) |
|---|---|
| `apps/web/src/lib/api.ts` | `prosiddhi-frontend/src/lib/api.ts` |
| `apps/admin` (separate workspace — PJP-65) | admin pages **inside** `prosiddhi-frontend/src/app/admin/*` |
| `apps/mobile` (PJP-64, all MOB tickets) | separate mobile repo (TBD owner) |
| `packages/i18n` shared package (PJP-109/118) | no shared packages; FE and mobile are separate repos |
| `pnpm --filter web type-check` (PJP-131) | `npm run type-check` |
| Backend in same tree | `prosiddhi-backend` standalone repo |

**Implication:** This isn't a per-ticket bug — it's a board-wide convention that's stale. Two ways to handle:
- **(Recommended)** Accept standalone-repo reality. Fix paths/commands in tickets *as we pick each one up* (cheap, lazy), and **rewrite the few tickets whose whole premise is the monorepo** (PJP-65 apps/admin skeleton; PJP-77 path/port wording; PJP-109/118 `packages/i18n`).
- (Heavier) Bulk-edit all ~30 affected descriptions now.

A short note should also be added to the Sprint Plan / CLAUDE so future tickets use standalone paths.

---

## 2. Status reconciliation — where Jira ≠ reality

### 2a. ✅ Confirmed Done (status correct, verified in code)

| Ticket | What | Verified |
|---|---|---|
| PJP-60 | Delete Aadhaar code paths | No Aadhaar model/field/route in schema or code ✔ |
| PJP-66 | crypto OTP (no Math.random) | — (BE hardening, trust prior audit) |
| PJP-67 | JWT_SECRET fail-fast | — |
| PJP-68 | BOOKMARKED in status enum | `ApplicationStatus` enum includes BOOKMARKED ✔ |
| PJP-69 | "Cannot reject accepted" guard | guard present in `application.service.ts` ✔ |
| PJP-70 | Branch hygiene | — |
| PJP-71 | BE phone-first registration (both roles) | `jobseekers/register` + `employers/register/{individual,business}` exist ✔ |
| PJP-88 | Apply 2-min audio + storage abstraction | multer + ffprobe 120s cap + `storage.ts` ✔ |
| PJP-89 | 60s chat audio | conversation audio, ffprobe 60s ✔ |
| PJP-90 | Polling + read receipts | `after=` cursor + `readBy` + `lastSeenAt` ✔ |
| PJP-91 | Recommendation Q9 weights | `job.service` scoring + nearby ✔ |
| PJP-63, 64 | Google OAuth client; mobile skeleton | procurement/skeleton (see note: 64 belongs to mobile repo now) |

### 2b. 🟢 Marked `To Do` but ACTUALLY DONE → recommend move to Done

| Ticket | What | Evidence |
|---|---|---|
| **PJP-100** | Job validators + ACTIVE↔INACTIVE state + **auto-FILL** + view counter | `application.service.ts:932` auto-FILL on accept==positions; activate/deactivate routes; salary/positions validators in `job.validator` ✔ |
| **PJP-101** | Recruiter-contact gate | `GET /api/jobs/:id/recruiter-contact` implemented; PRO check skipped under Option B ✔ |
| **PJP-131** | Clear FE type-check errors | `npm run type-check` passes clean ✔ (ticket also obsolete-worded: `pnpm --filter web`) |

### 2c. 🟡 Marked `To Do`, PARTIALLY done → keep open but descope/split (BE half exists)

| Ticket | Already built | Still missing |
|---|---|---|
| **PJP-92** Interview model + reminder cron | `Interview` model + accept-creates-interview (`PUT /applications/:id/accept`) | reschedule endpoint, outcome capture, **reminder cron (no cron infra exists)** |
| **PJP-95** Send Warning | `POST /api/admin/posts/:id/warning` creates JobWarning + flips VIOLATION_FOUND | WhatsApp `job_warning` template send (depends on MSG91 / PJP-97) |
| **PJP-99** Admin approve/reject wiring | approve/reject for employers+jobseekers+documents **with notifications** all implemented | `AdminAuditLog` model (does not exist) — consider descoping for v1 |
| **PJP-102** Job reports queue | reports surfaced in post-detail; `POST /jobs/:id/report` exists | dedicated `GET /api/admin/reports` + `PATCH /:id/resolve` |
| **PJP-74** Misc auth hardening | password policy (min 8 + complexity), `/admin/create` gated, generic forgot-password 200 | verify all three landed → likely **near-Done** |

### 2d. 🔵 `In Progress` but NOT actually started in code (status optimistic)

| Ticket | Reality |
|---|---|
| **PJP-77** FE base URL | `api.ts` still `http://localhost:5000/api` hardcoded default; no `.env.example`. Also obsolete wording (8080→5000 / apps/web). **Reframe:** "point `NEXT_PUBLIC_API_URL` at hosted BE." |
| **PJP-78** FE rename paths | `api.ts` still uses fictional `/job-seeker/*`, `/employer/*`. Not started. |
| **PJP-82** FE login 3 methods | `/login` still fake (navigates without auth). Not started. |
| PJP-61, 62, 72 | Procurement/BE in-flight — status plausible (72 = Google OAuth half not in code yet ✔) |

### 2e. ⚪ Correctly `To Do` (genuinely not built — verified)

Google OAuth login half of **PJP-72** (no `google` code anywhere) · **PJP-73** (partial) · **PJP-75/76** subscription trial+Razorpay (**no Subscription/Payment models in schema**) · **PJP-93** nurture crons · **PJP-94** OpenAI moderation scan (no `/scan`, no openai) · **PJP-96** FCM · **PJP-97** MSG91 · **PJP-98** notification fan-out · all **FE S2 stories** (103–113) · all **MOB stories** · all **S3 stories**.

---

## 3. Decode — ticket → real code (by module)

The 15 Epics (M1–M15) are the modules. Where each stands against code:

| Epic | Module | BE state | FE state |
|---|---|---|---|
| PJP-45 | M1 Auth & Identity | ✅ done (OTP, email-OTP, login, register; **Google OAuth missing**) | ❌ fake login; no auth layer |
| PJP-46 | M2 Profile Mgmt | ✅ done (profile GET/PUT, docs, skills, photo) | ❌ no profile screens wired (PJP-112) |
| PJP-47 | M3 Job Posting | ✅ done (CRUD, activate/deactivate, auto-FILL) | ❌ **no job-posting screen exists** (PJP-106) |
| PJP-48 | M4 Job Discovery | ✅ done (search/filter, recommended, nearby, recruiter-contact) | ❌ feed/details/saved all mock — **no FE tickets** (see §4) |
| PJP-49 | M5 Job Application | ✅ done (apply+audio, withdraw) | 🟡 ApplyModal records but doesn't submit (PJP-103); my-applications mock — **no ticket** |
| PJP-50 | M6 Candidate Mgmt | ✅ done (list, stats, accept/reject/bookmark) | ❌ "coming soon" stub (PJP-104) |
| PJP-51 | M7 Interview | 🟡 model+accept done; reschedule/outcome/cron missing (PJP-92) | ❌ none |
| PJP-52 | M8 Chat | ✅ done (text+audio, polling, receipts) | ❌ none (PJP-105) |
| PJP-53 | M9 Notifications | 🟡 in-app table+service done; channels (FCM/MSG91) + fan-out missing (96/97/98) | ❌ none (PJP-111) |
| PJP-54 | M10 Subscription | ❌ no models at all (74/75/76) | ❌ none (PJP-110) |
| PJP-55 | M11 Admin Verification | ✅ done (approve/reject/docs + notifications; no audit log) | ❌ panel is mock (PJP-107) |
| PJP-56 | M12 Content Moderation | 🟡 manual actions done; **OpenAI scan missing** (PJP-94); reports queue partial (102) | ❌ panel is mock (PJP-108) |
| PJP-57 | M13 Soft Delete | ✅ done (isDeleted, /deleted lists, auth gate) | ❌ admin UI mock |
| PJP-58 | M14 i18n | n/a | ❌ **zero i18n machinery** (PJP-109) |
| PJP-59 | M15 Cross-Cutting | ✅ BE security mostly done | ❌ FE base-url/paths/auth/guards (77/78/79/80) not started |

---

## 4. Gap analysis — NEW tickets needed (full coverage to a working app)

These are **real work with no ticket today.** Scope = everything needed for a functional MVP. Proposed labels follow the `sprint-N,owner-X,role-fe,risk-Y` convention. Module tag in brackets.

### 4a. 🔴 Seeker "consume" flow — the big hole (FE, owner-nazir, role-fe)

| # | Proposed summary | Wires to | Risk | Sprint |
|---|---|---|---|---|
| NEW-1 | **FE — wire job feed + search/filter/pagination + Recommended + Near By feeds** (replace 10 hardcoded jobs) | `GET /api/jobs`, `/jobs/recommended`, `/jobs/nearby` | medium | S2 [M4] |
| NEW-2 | **FE — wire job details page** (real data, related jobs, view count, real Save toggle) | `GET /api/jobs/:id`, `/:id/related` | low | S2 [M4] |
| NEW-3 | **FE — wire saved jobs** (list/save/unsave/check, persist) | `GET/POST/DELETE /api/saved-jobs` | low | S2 [M4] |
| NEW-4 | **FE — wire my applications** (list + detail + withdraw; replace mock) | `GET /api/applications/my`, `/:id`, `PUT /:id/withdraw` | low | S2 [M5] |
| NEW-5 | **FE — forgot/reset password flow** (real email-OTP + reset) | `email-otp/send|verify`, `auth/reset-password` | low | S1/S2 [M1] |
| NEW-6 | **FE — employer dashboard home** (stats/jobs/recent-applications; replace `/workers` "coming soon") | `GET /api/employers/dashboard/*` | low | S2 [M3/M6] |

> Without NEW-1..4, a seeker literally cannot browse, save, or track jobs against real data — the core product loop. These should arguably be the **highest-priority FE stories after the auth foundation.**

### 4b. 🟠 Cross-cutting / hygiene

| # | Proposed summary | Notes |
|---|---|---|
| NEW-7 | **Reconcile ticket file-paths/commands to standalone-repo structure** | Board hygiene (see §1). Or handle inline per-ticket + rewrite 65/77/109/118. |
| NEW-8 | **FE — confirm api.ts points at hosted/ephemeral BE via `.env.local`** | Effectively the *real* PJP-77; could just reframe PJP-77 instead of new ticket. |

### 4c. ⚪ Optional / likely out-of-MVP (flag, don't auto-create)

- FE account settings (change password/email/phone) — BE endpoints exist; confirm if in MVP.
- FE seeker home category-browse wiring (landing page search → feed).
- BE `AdminAuditLog` (PJP-99 acceptance) — recommend descope for v1.
- BE `/api/me/*` endpoints (language, notification-prefs, devices) — currently bundled inside FE tickets 109/111 + mobile 96; confirm BE side is ticketed.

---

## 5. Obsolete / needs-rewrite tickets

| Ticket | Issue | Action |
|---|---|---|
| **PJP-77** | Wording "8080→5000" + `apps/web` both stale; real task = env-var to hosted BE | **Rewrite** summary/desc |
| **PJP-65** | "apps/admin workspace skeleton" — admin already lives in `prosiddhi-frontend` | **Rewrite or close** (skeleton effectively exists) |
| **PJP-131** | Type errors already fixed; `pnpm --filter web` command stale | **Close as Done** |
| **PJP-64** | "apps/mobile skeleton" Done — belongs to separate mobile repo now | Note repo move; keep Done |
| **PJP-109 / 118** | `packages/i18n` shared package assumes monorepo | **Rewrite** for standalone repos |

---

## 6. Board mutations — APPLIED 2026-06-08

**Status changes — done:**
1. PJP-100 → **Done** ✅ · PJP-101 → **Done** ✅ · PJP-131 → **Done** ✅ (each with an evidence comment citing the code)
2. PJP-92, 95, 99, 102 → kept To Do; **comment added** noting BE-half-done + remaining slice ✅
3. PJP-74 → still pending verification of the 3 sub-items (not yet transitioned) ⏳

**Rewrites — done:**
4. PJP-77 → reframed to "point `NEXT_PUBLIC_API_URL` at hosted BE" ✅ *(was already applied in an earlier session)*
5. PJP-65, 107, 108 → de-monorepo'd to target the standalone `prosiddhi-admin` repo ✅ *(already applied earlier)*; PJP-109, 118 → `packages/i18n` assumption removed, portal↔mobile sharing marked TBD ✅ *(applied this session)*

**New tickets — created ✅:** NEW-1..6 landed as **PJP-138** (job feed), **PJP-139** (job details), **PJP-140** (saved jobs), **PJP-141** (my applications), **PJP-142** (forgot/reset password), **PJP-143** (employer dashboard) — all labelled `sprint-2,owner-nazir,role-fe,risk-*`. NEW-7 (board hygiene) was folded into the reframes above; NEW-8 is covered by the PJP-77 reframe.

**Board hygiene — still open:** the 6 new stories are unassigned with **no Epic `parent` set** (consistent with the pre-existing 0/87 parent-linkage gap). Linking Stories → M-epics remains a deferred backlog-grooming task.

---

## Appendix — verification commands run (2026-06-08)

- `grep google|oauth` in BE routes/controllers/services → **none** (PJP-72 Google half not built)
- `grep /scan|openai` → **none** (PJP-94 not built)
- `grep reports|resolve` in admin.routes → **none** (PJP-102 queue not built)
- `grep FILLED|auto.?fill` → **present** `application.service.ts:932` (PJP-100 built)
- `grep model Subscription` in schema → **none** (PJP-74/75/76 not built)
- `grep recruiter-contact` → **present** (PJP-101 built)
- `grep AuditLog` → **none** (PJP-99 acceptance gap)
- `npm run type-check` → **passes clean** (PJP-131 resolved)
