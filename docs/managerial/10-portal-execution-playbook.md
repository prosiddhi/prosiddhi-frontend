# Portal Execution Playbook — `prosiddhi-frontend`

**Owner:** Nazir (FE) · **Created:** 2026-06-13 · **Repo:** `prosiddhi-frontend` (Portal app — seeker + employer)
**Derived from:** [`08-ticket-reconciliation.md`](08-ticket-reconciliation.md) + verified status report (2026-06-12)
**Companion:** Admin has its own playbook in `prosiddhi-admin/docs/admin-execution-playbook.md`

> **How to use this doc:** This is the single source you follow to ship the Portal **one ticket at a time**.
> Do not start a ticket until the previous one is **pushed + its Jira moved**. Work top-to-bottom.
> This doc IS the live tracker — update the checkbox and the "Done" stamp as you close each ticket.

---

## The per-ticket loop (follow every time)

For **each** ticket below, in order:

1. **READ** — Open the ticket in Jira (`PJP-xxx`). Read the description + acceptance criteria. Re-read the
   "Wires to" endpoint here. If the ticket wording still assumes the old monorepo (`apps/web`, `pnpm --filter`),
   ignore that — use standalone-repo paths (`src/...`, `npm`).
2. **PLAN** — Write a short plan (3–8 bullets): files to touch, the `api.ts` function(s) to add/use, the screens
   affected, and the acceptance check. Paste it as a Jira comment so there's a record. Pause here if scope is unclear.
3. **IMPLEMENT** — Code it. Use the `api.ts` client (never raw `fetch`). Match existing conventions
   (app-router, `useAuth`, `ProtectedRoute`). Keep scope locked — no v2 features, no drift.
4. **GATE** — before committing, run the review agents (per [`.claude/AGENT-WORKFLOW.md`](../../.claude/AGENT-WORKFLOW.md)):
   - **`code-reviewer`** — gates `npm run type-check` + hygiene + correctness + **FE↔BE contract** (every `api.ts` path checked against `../prosiddhi-backend/src/routes/`) + **wired-vs-mock**. Must be **GREEN** (or YELLOW with written justification).
   - **`security-reviewer`** if the ticket touched auth / token / role (Stage 1 especially).
   - **`scope-drift-checker`** if it moved a feature boundary.
   Then **smoke-test** the screen against the hosted BE (`NEXT_PUBLIC_API_URL` in `.env.local` — confirm the tunnel is alive first; re-ask Asrar if dead). A pre-commit hook also blocks the commit if `type-check` fails.
5. **PUSH** — Commit on a branch (`git checkout -b pjp-xxx-short-name`), reference the ticket in the message,
   push. Open a PR if that's the flow, else push to `main` per current practice.
6. **UPDATE JIRA** — Transition the ticket → **Done**. Add a closing comment citing the commit SHA + what was verified.
7. **TICK HERE** — Flip `[ ]` → `[x]`, add the date + commit SHA in the Done column. Move to the next ticket.

**Definition of Done (per ticket):** `code-reviewer` GREEN · `type-check` clean · acceptance criteria met against real BE ·
code pushed · Jira transitioned to Done with evidence comment · checkbox flipped here. "Looks done" ≠ done.

---

## Legend

- `[ ]` to do · `[x]` done · `[~]` in progress · `[B]` blocked (can't finish — see blocker)
- **Now** = BE endpoint exists & is built; pure FE work, nothing stops you.
- **Blocked** = needs BE / procurement / another ticket first. Don't start the blocked half.

---

## STAGE 0 — Board cleanup (do this first, ~30 min, no code)

The board lags reality. Fix it before coding so the tracker is honest.

| ✓ | Action | Detail | Done |
|---|---|---|---|
| [ ] | **Move auth foundation → Done (with caveat)** | PJP-77, 78, 79, 80, 82 are **code-complete** (commit `69be6b0`): Bearer interceptor + 401 logout in `api.ts`, `AuthContext`, `ProtectedRoute`, 3-method `/login`. Transition each → Done; comment: *"code-complete; integration-unverified vs live BE."* | |
| [ ] | **Close 6 duplicate tickets** | PJP-132–137 and PJP-138–143 are identical sets. Keep **138–143**, close **132–137** as duplicates (link to the survivor). | |
| [ ] | **Confirm `.env.local` BE URL is live** | This is the real PJP-77. Verify the trycloudflare tunnel responds; if dead, get a fresh URL from Asrar. Without a live BE you cannot verify any ticket below. | |

> After Stage 0, PJP-81 (registration screens) is the only auth-chain ticket left genuinely open.

---

## STAGE 1 — Auth chain finish (the foundation everything else assumes)

| ✓ | Ticket | Delivers | Wires to | Done |
|---|---|---|---|---|
| [ ] | **PJP-81** | Rework registration screens onto corrected auth/paths (seeker + employer). *api paths already fixed; screens unconfirmed.* | `/jobseekers/register`, `/employers/register/{individual,business}`, `/auth/login-phone-send` | |
| [ ] | **PJP-142** | Forgot / reset password (real email-OTP + reset) | `email-otp/send|verify`, `auth/reset-password` | |

---

## STAGE 2 — Seeker "consume" loop (the core product, all BE-ready)

Do these in order — each builds on the last. Without these a seeker can't browse/save/track on real data.

| ✓ | Ticket | Delivers | Wires to | Done |
|---|---|---|---|---|
| [ ] | **PJP-138** | Job feed + search/filter/pagination + Recommended + Near By (replace 10 hardcoded jobs) | `GET /jobs`, `/jobs/recommended`, `/jobs/nearby` | |
| [ ] | **PJP-139** | Job details page — real data, related jobs, view count, real Save toggle | `GET /jobs/:id`, `/jobs/:id/related` | |
| [ ] | **PJP-140** | Saved jobs — list / save / unsave / check, persisted | `GET/POST/DELETE /saved-jobs` | |
| [ ] | **PJP-141** | My applications — list + detail + withdraw (replace mock) | `GET /applications/my`, `/applications/:id`, `PUT /applications/:id/withdraw` | |
| [ ] | **PJP-103** | Apply modal with 2-min audio recorder (currently records but doesn't submit) | `POST /applications` (multipart: `audio` file + `jobId` in body; ≤3 MB) | |
| [ ] | **PJP-113** | Contact-recruiter gated reveal | `GET /jobs/:id/recruiter-contact` | |

---

## STAGE 3 — Employer loop (all BE-ready)

| ✓ | Ticket | Delivers | Wires to | Done |
|---|---|---|---|---|
| [ ] | **PJP-143** | Employer dashboard home — stats / jobs / recent applications (replace `/workers` "coming soon") | `GET /employers/dashboard/{stats,jobs,recent-applications}` | |
| [ ] | **PJP-106** | Job posting + live preview (no posting screen exists yet) | `POST /jobs`, activate/deactivate routes | |
| [ ] | **PJP-104** | Candidate list + detail + accept/reject/bookmark ("coming soon" stub today) | `GET /applications/employer/all` + `/applications/job/:jobId`; `PUT /applications/:id/{accept,reject,bookmark}` | |

---

## STAGE 4 — Shared features (BE-ready)

| ✓ | Ticket | Delivers | Wires to | Done |
|---|---|---|---|---|
| [ ] | **PJP-105** | Chat UI — polling + text + 60s audio (both roles) | conversation endpoints, `after=` polling, audio | |
| [ ] | **PJP-112** | Profile management screens (none wired today) | `GET/PUT /jobseekers/profile`, docs, skills, photo | |
| [ ] | **PJP-109** | i18n wiring (next-i18next + EN + HI JSON) — pure FE, no BE dep | n/a | |

---

## STAGE 5 — Blocked (UI can be scaffolded; do NOT try to finish until blocker clears)

| ✓ | Ticket | Delivers | BLOCKER | Done |
|---|---|---|---|---|
| [B] | **PJP-111** | Notifications dropdown + preferences | In-app list is doable; **preferences/channels blocked** on BE PJP-96/97/98 | |
| [B] | **PJP-110** | Subscription upgrade + renewal UI | **Blocked**: BE has no Subscription/Payment models (PJP-74/75/76) + Razorpay (PJP-62/76) | |
| [B] | **PJP-72 (Google login tab)** | 3rd login method | UI present but `disabled`; **blocked** on BE Google OAuth (PJP-72) + client (PJP-63) | |

---

## Out of FE scope (tracked elsewhere — do not pick up here)

- **BE (Asrar):** PJP-72/73/74/75/76, 92, 93, 94, 95, 96, 97, 98, 99, 102, 86, 127.
- **Procurement/infra:** PJP-61 (MSG91 DLT), PJP-62 (Razorpay KYC), PJP-87 (staging + CI).
- **Mobile (UNOWNED, not started):** PJP-83/84/85, 114–120.
- **Admin:** PJP-65/107/108 → see the admin playbook in `prosiddhi-admin`.

---

## What "done" looks like for the Portal

When every **Now** ticket above (Stages 1–4) is closed, the web Portal **fully works end-to-end** on real BE data:
register/login (email + phone-OTP), browse/search/recommended/nearby feed, job details + save, apply with
2-min audio, track + withdraw applications, employer posts & manages jobs, candidate accept/reject/bookmark,
chat with audio + polling, contact-gate reveal, profile, employer dashboard, in-app notifications, EN + HI.

**Still missing after this (not FE-fixable):** Google sign-in (BE 72), payments/subscription (BE 74/75/76 + Razorpay),
outbound notifications — push/SMS/WhatsApp/email (BE 96/97/98 + MSG91), auto-moderation (BE 94), interview
reminder cron (BE 92), the 8 other languages, mobile app (unowned). Roughly **~70% of full locked-scope MVP**.
