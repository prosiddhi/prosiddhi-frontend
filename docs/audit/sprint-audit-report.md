# Sprint 1 â†’ 2 Status Readout (2026-05-29)

## TL;DR
- **5 of 20 S1 tickets can be flipped today** with status-only or 1-3 hour pushes; **8 will carry over** (4 of them are large net-new builds, 4 are auth/admin foundation work still upstream-blocked).
- **Biggest carry-over risk: the FE auth foundation chain is unbuilt.** [PJP-77](https://prosiddhi.atlassian.net/browse/PJP-77) (env port), [PJP-78](https://prosiddhi.atlassian.net/browse/PJP-78) (path renames), [PJP-79](https://prosiddhi.atlassian.net/browse/PJP-79) (AuthContext), [PJP-82](https://prosiddhi.atlassian.net/browse/PJP-82) (login wiring), [PJP-80](https://prosiddhi.atlassian.net/browse/PJP-80) (ProtectedRoute), and [PJP-65](https://prosiddhi.atlassian.net/browse/PJP-65) (admin workspace lift) all interlock â€” none done, and every S2 FE story depends on them.
- **S2 head-start is real:** 4 BE tickets ([PJP-99](https://prosiddhi.atlassian.net/browse/PJP-99), [PJP-100](https://prosiddhi.atlassian.net/browse/PJP-100), [PJP-101](https://prosiddhi.atlassian.net/browse/PJP-101), [PJP-95](https://prosiddhi.atlassian.net/browse/PJP-95)) are already mostly-built and can be closed in the first 2-3 days of S2 instead of starting from scratch.

## Sprint 1 â€” Closeable Today
Tickets where code is fully/mostly built and only Jira hygiene or a tiny push remains.

**Status-only flips (no code work, just update Jira):**
- [PJP-67](https://prosiddhi.atlassian.net/browse/PJP-67) â€” JWT_SECRET fail-fast â€” already Done in code; status correct. No action.
- [PJP-60](https://prosiddhi.atlassian.net/browse/PJP-60) â€” Aadhaar removal â€” already Done in code; status correct. No action.
- [PJP-70](https://prosiddhi.atlassian.net/browse/PJP-70) â€” asrar-dev branch hygiene â€” already Done; verified via git log. No action.
- [PJP-68](https://prosiddhi.atlassian.net/browse/PJP-68) â€” BOOKMARKED enum â€” already Done in `prisma/schema.prisma:106-114` and validators; status correct. No action.
- [PJP-66](https://prosiddhi.atlassian.net/browse/PJP-66) â€” crypto.randomInt for OTP â€” already Done in `job-portal-be/src/utils/crypto.ts:36-38`; status correct. No action.
- [PJP-69](https://prosiddhi.atlassian.net/browse/PJP-69) â€” "Cannot reject accepted" guard â€” already Done in `application.service.ts:1097-1100`; status correct. No action.

**Closeable with 1-3 hour focused push (FE/owner needed):**
- [PJP-77](https://prosiddhi.atlassian.net/browse/PJP-77) â€” Fix FE env port (5000) + `.env.example` + apps/web README â€” **30 min** mechanical fix. Owner: FE. Blocks PJP-78 and PJP-79.
- [PJP-78](https://prosiddhi.atlassian.net/browse/PJP-78) â€” Rename FE API paths to `/api/jobseekers/*` etc. across `lib/api.ts` + 7 employer pages â€” **1-3 hr** find-and-replace (~32 sites). Owner: FE. Do after PJP-77.
- [PJP-86](https://prosiddhi.atlassian.net/browse/PJP-86) â€” Draft `docs/technical/whatsapp-templates.md` (8-12 templates EN+HI + Meta categories) â€” **1-2 hr** drafting. Owner: Nazir/PM. Pure docs, zero blockers.

**Caveats on already-Done tickets with test-gap drift (recommend leaving Done but logging tech debt):**
- [PJP-71](https://prosiddhi.atlassian.net/browse/PJP-71), [PJP-66](https://prosiddhi.atlassian.net/browse/PJP-66), [PJP-69](https://prosiddhi.atlassian.net/browse/PJP-69) all claim tests were added; **no test files exist anywhere in `job-portal-be`** (no `tests/` dir, no jest/vitest config). Either reopen for test work or log a single "BE test infra" tech-debt ticket for S2.

## Sprint 1 â€” Won't Make It (Carry-over)

| Ticket | Code state | Missing | Recommendation |
|---|---|---|---|
| [PJP-72](https://prosiddhi.atlassian.net/browse/PJP-72) BE Google OAuth | partial (email login done) | `/api/auth/google/login`, `googleSub` schema field, `google-auth-library`, password-login guard | **Carry to S2.** ~2 dev-days + S1-04 dep. |
| [PJP-82](https://prosiddhi.atlassian.net/browse/PJP-82) FE login page | stub-only (static form, hardcoded admin creds shown as "Demo") | OTP tab, Google tab, role toggle, real BE wiring, AuthContext integration | **Carry to S2.** Blocked on PJP-79 + PJP-72 + PJP-65. |
| [PJP-79](https://prosiddhi.atlassian.net/browse/PJP-79) FE AuthContext | not-started | Context, Provider, Bearer interceptor, 401 handler | **Carry to S2 day 1.** 2-3 hrs once PJP-78 lands; critical path for all S2 FE. |
| [PJP-80](https://prosiddhi.atlassian.net/browse/PJP-80) ProtectedRoute | not-started | Guard component, role-redirects, middleware.ts | **Carry to S2 day 1.** Blocked on PJP-79 + PJP-65. |
| [PJP-81](https://prosiddhi.atlassian.net/browse/PJP-81) FE register flow rework | partial (old scaffolding) | 6-digit OTP (still 4), Categories step, separate Password step, single multipart, **plaintext password in localStorage at `employer/register/account/page.tsx:28`**, individual vs corporate branching | **Carry to S2 â€” split.** The localStorage password leak is a security issue; bump that out as a hotfix sub-ticket. |
| [PJP-65](https://prosiddhi.atlassian.net/browse/PJP-65) apps/admin workspace | not-started | New workspace, page relocation, admin layout, real login wiring | **Carry to S2.** Foundation for PJP-80 and any admin S2 work. |
| [PJP-73](https://prosiddhi.atlassian.net/browse/PJP-73) Admin password security | partial (2/4 ACs met) | `ADMIN_SETUP_TOKEN` gate on `/api/admin/create` (bootstrap is wide open), policy-rule tests | **Carry â€” but actionable.** Setup-token gate is 1-3 hrs; the bootstrap-open vector is a real security gap. Consider a same-week hotfix even if it slips Sprint 1. |
| [PJP-74](https://prosiddhi.atlassian.net/browse/PJP-74) Subscription schema | not-started | Subscription, SubscriptionPlan, PaymentHistory, WebhookEvent models; User columns; seed; migration | **Carry to S2 day 1.** 2-3 hr pure schema work, but a hard blocker for PJP-75, PJP-76, PJP-93, PJP-110. |
| [PJP-75](https://prosiddhi.atlassian.net/browse/PJP-75) Trial lifecycle | not-started | Everything (depends on PJP-74) | **Carry to S2.** |
| [PJP-76](https://prosiddhi.atlassian.net/browse/PJP-76) Razorpay checkout + webhook | not-started | All endpoints, SDK, idempotency, env vars | **Carry to S2.** Ticket itself flagged "Plan B defer" â€” confirmed. |

## Sprint 2 â€” Head-Start Wins
Significant code already exists; pull these in on S2 day 1 for quick momentum.

- **[PJP-101](https://prosiddhi.atlassian.net/browse/PJP-101)** Recruiter contact reveal â€” **mostly-built** (endpoint, gating, auth all in `job.service.ts:406`). Needs 403-on-toggle-off + masked response shape + tracking column. **1-2 hr to close.**
- **[PJP-99](https://prosiddhi.atlassian.net/browse/PJP-99)** Admin verify/approve/reject â€” **mostly-built** (full cascade in `admin.controller.ts`). Add `AdminAuditLog` model + write hooks. **1-3 hr (multi-channel piece deferred to M9 wiring).**
- **[PJP-95](https://prosiddhi.atlassian.net/browse/PJP-95)** Admin job warnings â€” **mostly-built** (endpoint + JobWarning row + in-app notif done). Only WhatsApp template send missing, gated by S2-BE-CHANNEL-WHATSAPP. **Close once WhatsApp lands.**
- **[PJP-100](https://prosiddhi.atlassian.net/browse/PJP-100)** Job posting validations + state machine â€” **mostly-built** (validators, ACTIVEâ†”INACTIVE machine, auto-FILL all done). Missing: AC7 moderation reset on edit + 2 validator tightenings. **1-3 hr to close.**
- **[PJP-91](https://prosiddhi.atlassian.net/browse/PJP-91)** Job ranking algo â€” **mostly-built and already Done** (all weights, exp location decay, cold-start in `job.service.ts:875-1156`). Only gap is missing snapshot/per-weight tests. **Leave Done; log test tech-debt.**
- **[PJP-90](https://prosiddhi.atlassian.net/browse/PJP-90)** Chat polling + mark-read â€” **mostly-built and already Done**. Missing per-conversation `unreadCount` on list endpoint (1-2 hr fix). **Either reopen or open a follow-up ticket.**
- **[PJP-89](https://prosiddhi.atlassian.net/browse/PJP-89)**, **[PJP-88](https://prosiddhi.atlassian.net/browse/PJP-88)** Chat audio + Apply audio BE â€” **fully-built and already Done**. Note [PJP-88](https://prosiddhi.atlassian.net/browse/PJP-88) ships with 3MB cap vs spec's 1MB â€” get PM sign-off.

## Jira â†” Code Mismatches (Need Attention)

**Done tickets with gaps (consider reopening or logging follow-up):**
- [PJP-71](https://prosiddhi.atlassian.net/browse/PJP-71) â€” Done, but AC required test coverage and no BE tests exist.
- [PJP-91](https://prosiddhi.atlassian.net/browse/PJP-91) â€” Done, but AC required snapshot test + per-weight tests; none exist.
- [PJP-90](https://prosiddhi.atlassian.net/browse/PJP-90) â€” Done, but per-conversation `unreadCount` AC is not implemented in list endpoint.
- [PJP-88](https://prosiddhi.atlassian.net/browse/PJP-88) â€” Done, minor drift: 3MB file cap vs 1MB spec. Needs PM sign-off, not necessarily reopen.

**To Do / In Progress tickets that are actually further along (close or advance status):**
- [PJP-78](https://prosiddhi.atlassian.net/browse/PJP-78) â€” In Progress but **zero** path renames have happened. Status is misleading â€” either close today with the fix or reset to To Do.
- [PJP-77](https://prosiddhi.atlassian.net/browse/PJP-77) â€” In Progress but no ACs met. Trivial fix; close today.
- [PJP-73](https://prosiddhi.atlassian.net/browse/PJP-73) â€” To Do but 2/4 ACs already met in code. Move to In Progress.
- [PJP-101](https://prosiddhi.atlassian.net/browse/PJP-101) â€” To Do but core endpoint already exists. Move to In Progress.
- [PJP-100](https://prosiddhi.atlassian.net/browse/PJP-100) â€” To Do but most validators + state machine done. Move to In Progress.
- [PJP-99](https://prosiddhi.atlassian.net/browse/PJP-99) â€” To Do but full approve/reject/verify pipeline implemented. Move to In Progress.
- [PJP-95](https://prosiddhi.atlassian.net/browse/PJP-95) â€” To Do but endpoint + JobWarning + notification all done. Move to In Progress.

## Out-of-Scope Quick Note
**29 out-of-scope tickets pending** (no code in repo). **Mobile:** 11 tickets (PJP-64, -83, -84, -85, -114 through -120) â€” entire mobile workstream not started; depends on apps/mobile workspace skeleton ([PJP-64](https://prosiddhi.atlassian.net/browse/PJP-64)) which has no scaffolding. **QA:** 4 tickets (PJP-121, -123, -128, -130) â€” all S3-phase, expected. **Procurement:** 3 tickets ([PJP-61](https://prosiddhi.atlassian.net/browse/PJP-61) MSG91 DLT, [PJP-62](https://prosiddhi.atlassian.net/browse/PJP-62) Razorpay KYC In Progress; [PJP-63](https://prosiddhi.atlassian.net/browse/PJP-63) Google OAuth Done) â€” these gate multiple BE channel/payment tickets, so any slippage cascades into S2. **Infra:** 1 ticket ([PJP-87](https://prosiddhi.atlassian.net/browse/PJP-87) staging+CI) â€” required before S3 QA can begin. **Epics & milestones:** 10 parent tickets (M1-M15) â€” track via children, not separately.

## Recommended Actions for End-of-Day Today

1. **FE owner: ship [PJP-77](https://prosiddhi.atlassian.net/browse/PJP-77)** (30 min: fix `apps/web/src/lib/api.ts:2` fallback to `:5000`, fix `.env.example`, add apps/web README note).
2. **FE owner: ship [PJP-78](https://prosiddhi.atlassian.net/browse/PJP-78)** immediately after (1-3 hr: rename `/job-seeker/*` â†’ `/api/jobseekers/*` and `/employer/*` â†’ `/api/employers/*` across `api.ts` + 7 employer pages).
3. **Nazir/PM: draft [PJP-86](https://prosiddhi.atlassian.net/browse/PJP-86)** `docs/technical/whatsapp-templates.md` (1-2 hr). Send to Shaik.
4. **Jira hygiene sweep:** move [PJP-73](https://prosiddhi.atlassian.net/browse/PJP-73), [PJP-99](https://prosiddhi.atlassian.net/browse/PJP-99), [PJP-100](https://prosiddhi.atlassian.net/browse/PJP-100), [PJP-101](https://prosiddhi.atlassian.net/browse/PJP-101), [PJP-95](https://prosiddhi.atlassian.net/browse/PJP-95) from To Do â†’ In Progress so S2 burndown reflects reality.
5. **Reopen or follow-up for [PJP-90](https://prosiddhi.atlassian.net/browse/PJP-90)** â€” per-conversation `unreadCount` is an AC and is genuinely missing from `conversation.service.ts` list endpoint. Decide: reopen vs new ticket.
6. **Security hotfix decision: [PJP-73](https://prosiddhi.atlassian.net/browse/PJP-73)** â€” `POST /api/admin/create` has no `ADMIN_SETUP_TOKEN` gate; bootstrap is wide open. Even if Sprint 1 ships without it, schedule a hotfix this week.
7. **Security hotfix decision: [PJP-81](https://prosiddhi.atlassian.net/browse/PJP-81)** â€” plaintext password in localStorage at `apps/web/src/app/employer/register/account/page.tsx:28`. Split into its own ticket and patch this week regardless of the broader register-flow carry-over.
8. **S2 day-1 prep:** confirm assignee for [PJP-74](https://prosiddhi.atlassian.net/browse/PJP-74) (Subscription schema) â€” it's the gating dependency for PJP-75, PJP-76, PJP-93, PJP-110. Land it Monday morning of S2.
