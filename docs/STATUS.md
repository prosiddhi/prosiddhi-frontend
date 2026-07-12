# ProSiddhi — Status

**The single source of truth for what is done and what is left.** Updated **2026-07-12**.
Verified by reading the code in all three repos — **not** from tickets. Where this doc and JIRA disagree, **this doc is right** (see §6).

Other docs: [PRODUCT.md](PRODUCT.md) (what we're building) · [MONETIZATION.md](MONETIZATION.md) (pricing rules + billing) · [DEPLOY.md](DEPLOY.md) (deploy + go-live) · [qa/functional-audit-portal.md](qa/functional-audit-portal.md) (portal defect list) · `prosiddhi-admin/docs/qa/functional-audit-admin.md` (admin defect list).

---

## 1. Where we stand — one line per surface

| Surface | Repo | State |
|---|---|---|
| **Backend** | `prosiddhi-backend` | ✅ **Feature-complete.** Everything the apps need is live, incl. the full billing system. |
| **Portal** (seeker + employer) | `prosiddhi-frontend` | ✅ **Feature-complete + QA-defect pass DONE** (2026-07-12). All 2 criticals + 10 majors + minors fixed and verified in the running app; **audio removed**; several deeper defects found while verifying (i18n was silently reverting to English; the registration language picker was inert; an introduced open-redirect) all fixed. → `docs/qa/functional-audit-portal.md`. **GO for handover.** |
| **Admin console** | `prosiddhi-admin` | ✅ **Feature-complete + QA-defect pass DONE** (2026-07-12). The two missing screens (**taxonomy**, **monetization**) are built, the reports queue and content scan are wired, the Revenue-card lie is fixed, and all 5 majors + the minors are done. **10 pages · 55 API functions.** Every fix verified against a live backend. → `prosiddhi-admin/docs/qa/functional-audit-admin.md`. **GO for handover.** *(One BE gap: admin invoice-PDF route — see §3.7.)* |
| **Mobile app** | `prosiddhi-mobile-app` | 🟡 **~60% built** (Flutter). Free product done + **EN/HI localised**; post-credit gate in. Pending: subscription screens, candidate DB, team seats, a few loose ends. *(Only in-app **checkout** is blocked, on the store-policy call — the plans/wallet **screens** are buildable now.)* → **`prosiddhi-mobile-app/docs/STATUS.md`** |

### Hosted backend
**`http://103.225.224.149:5000`** — had monetization, candidate DB, team seats and taxonomy deployed as of 2026-07-12.
⚠️ **Needs a redeploy:** the backend session's newest commits (seat rework + `/entitlements`, admin monetization endpoints, reports queue, content scan, notification channels, audio removal) are **committed locally but not yet on the hosted server.** Deploy before the Admin/Mobile sessions rely on those endpoints — or point those sessions at a local BE.
⚠️ Its **database is empty** (0 jobs — plans + taxonomy seeded only), so create test data before testing flows.

### ⛔ Audio is REMOVED from the product (decided 2026-07-12)
**No audio anywhere** — no application voice message, no chat audio. **Mobile:** audio UI ✅ deleted. **Backend:** accept-paths ✅ removed (backward-tolerant). **Portal:** ✅ **deleted** (2026-07-12) — apply-modal recorder, chat recorder + audio bubbles, `useAudioRecorder`, the test-microphone page, audio params in `api.ts`, and all audio i18n keys are gone; the mic Permissions-Policy was revoked. Revisit in v2.

**Bottom line:** the web product is built end-to-end — backend, portal **and admin console** — **including employer monetization** (credits, Razorpay, GST invoices, paid candidate database, team seats). The **two seat bugs are FIXED**, **audio is removed**, and the backend's newest work (admin monetization endpoints, reports queue, content scan, outbound notification channels) is now **all consumed by the admin console**. What remains is mostly **external config + mobile**: go-live config (MSG91 DLT/WhatsApp templates, FCM, OpenAI key, real Razorpay keys, GSTIN), the mobile app, and a handful of small BE routes the admin console still needs (invoice PDF, taxonomy restore, audit log). See the **backend** and **admin** session summaries at the end of §3.

---

## 2. What is DONE

### Backend
- **Auth** — phone-OTP, email+password, **Google OAuth**; email verification; forgot/reset password; soft-delete.
- **Jobs** — CRUD, **3-level taxonomy** validation, 30-day live window, recommendations, saved jobs, reports.
- **Applications** — apply (+ 2-min audio — *built, but audio is now **descoped from V1**, see §1*), status workflow, interviews.
- **Chat** — polling, text + 60-sec audio (*audio **descoped from V1***), read receipts.
- **Profiles** — seeker + employer, documents, skills.
- **Taxonomy** — Category → Sector → JobTitle (soft-delete), public `GET /api/categories`, **+ 10 admin CRUD endpoints**.
- **Search** — Postgres full-text search for **jobs and candidates** (`tsvector` + trigram typo fallback).
- **Monetization — all of it.** 8 plans, per-lot credit ledger, Razorpay checkout + webhook + client-verify (cannot double-grant), **GST invoices + PDF**, post-credit gate, delete-refund, credit wallet, 14-day trial grant, daily crons (30-day job window + 3-day post-expiry grace).
- **Candidate database** — FTS search, snippet gating (contact hidden), **atomic paid unlock** with dedupe, unlocked history.
- **Team seats** — roster, invite, accept, remove *(see the gaps in §3)*.
- **Admin API** — queues, document verification, moderation, skills CRUD, **real revenue** from `PaymentHistory`.
- Rate limiting, webhook audit log.

### Portal (web)
- **Auth** — register (seeker + employer), all 3 login methods, email verify, forgot/reset, role routing.
- **Seeker** — job feed (search / filters / **category filter** / recommended / nearby), job details, saved jobs, apply (+audio), my applications, contact-recruiter gate, report a job, my interviews, profile.
- **Employer** — dashboard, post/manage jobs (taxonomy triple), candidate management, chat, profile.
- **Monetization** — pricing page, Razorpay checkout, credit wallet + expiry nudge, post-credit gate + upsell, top-up modal, **invoice history + PDF**.
- **Candidate database** — snippet search, explicit "use 1 credit to unlock" confirm, unlocked-candidates history.
- **Team seats** — roster, invite link, accept, remove.
- **i18n** — English + Hindi, complete.
- Offline/error handling.

### Admin console
Login/guard, dashboard (**real revenue + 12-month trend + pending-verifications**), job-seeker management, employer management, document verification, post moderation (manual actions **+ a live content scan**), skills catalog CRUD, **taxonomy management** (Category → Sector → JobTitle CRUD, M:N links, soft-delete tree), **monetization** (payments · GST invoices · employer credits & seats), and a **reports queue** with resolve.

**10 pages · 55 API functions**, all hitting real backend routes. No mock data. No blockers. Every write confirms itself; the header shows the real signed-in admin; no dead chrome. *(Fixed 2026-07-12 — the whole QA-audit backlog: `prosiddhi-admin/docs/qa/functional-audit-admin.md`.)*

---

## 3. What is LEFT — priority order

### 🔴 P0 — blocks launch

**1. Two seat bugs — ✅ DONE, BE **and** FE (2026-07-12)**
- **Seat cap reads the wrong plan** — ✅ fixed. One `getEntitlements()` aggregates `seatCap = MAX(seats)` / `walletExpiry = MAX(expiresAt)`; no controller computes seats inline.
- **Seats are roster-only** — ✅ fixed. New `EmployerUser` membership (1:N, the only authz edge), `Subscription`/`PaymentHistory` re-keyed to `employerId`, one `resolveEmployerContext()` every employer controller routes through. Shared org wallet/jobs/unlocks; OWNER vs MEMBER roles; soft-revoke removal; seat downgrade auto-suspends newest-first at request time + in the cron.
- **Invite flow** — ✅ fixed. Hashed single-use email-bound 7-day token, owner-revocable, cap checked at invite + accept, public peek endpoint so the FE can carry the token through auth and auto-accept.
- **Portal — ✅ DONE 2026-07-12.** The FE is reconciled with the as-built contract and the missing landing page is built:
  - The invite link was **dead**: the FE still read the pre-rework `inviteToken` field, so every link it produced was `?token=undefined`. **No invite could ever be accepted.**
  - The roster **conflated members with invites** — it compared `status === 'ACCEPTED'`, an enum value that no longer exists, so every ACTIVE teammate rendered as "Pending". It now renders `members[]` (ACTIVE / **SUSPENDED**, the seat-downgrade state) and `invites[]` as separate groups, using `me.role` / `me.seatStatus` for the owner-vs-member view.
  - **Remove vs revoke split** — `DELETE /me/team/:membershipId` vs the new `DELETE /me/team/invites/:inviteId`. Different id spaces; crossing them 404s (verified).
  - **NEW public `/invite/<token>` landing page** — peeks the invite, then carries the token through sign-in *or* registration and **auto-accepts on return**, so the link really is clicked once. `/employer/team/accept` is retired to a redirect: **one accept path, not two.** Every BE error (`NO_SEAT_AVAILABLE`, `INVITE_EMAIL_MISMATCH`, `WORKSPACE_CONFLICT`, …) maps to an actionable EN/HI message.
  - Also fixed en route: a **live open redirect** in the post-login `returnUrl` (an origin-passing URL could still yield a protocol-relative `//evil.com` pathname), a render crash on a malformed `/invite/%` param, and a transient-failure path that silently destroyed the invite journey.
- ⚠️ **The cold path needs one BE fix that is NOT yet on `prosiddhi-backend/main` — see item 1a.**
→ Full detail in [MONETIZATION.md](MONETIZATION.md) §6.1–6.3.

**1a. 🔴 BE — a trial credit lot blocks every new invitee** *(BE — needs Asrar coordination, then merge)*
On `prosiddhi-backend`: branch **`fix/invite-trial-lot-blocks-cold-path`**, commit `2b5a3ad`. **Deliberately not merged to `main`** (team rule: coordinate BE commits with Asrar).

`isDisposableShell()` counted **every** `CreditLot` — but registration **auto-grants a TRIAL lot**, so every freshly-registered employer looked like it "already runs its own company workspace". The **cold-start invite path therefore 409'd every single time**: invite a brand-new person → they register → accept fails `WORKSPACE_CONFLICT`, with no way through. That is the flagship path of the rebuilt flow. Counting only `SUBSCRIPTION` + `PACK` lots (money actually spent) fixes it — the same trap the payments check already sidesteps by filtering on `SUCCESS`: *a row the system wrote must not be mistaken for work the user did.*

**Found by running the flow against a live server, not by reading code.** Verified after the fix: accept returns `MEMBER/ACTIVE` and the new member resolves the **org's** wallet (66 post / 657 download) instead of their own trial 1/3 — the entire point of a multi-seat plan. **Until this merges, team invites work only for people who already have an employer account.**

**2. Backend — auth OTP leak + account-enumeration** 🔒 *(BE — found by the mobile session 2026-07-12)*
- `POST /api/auth/forgot-password` returns the reset code in `data.otp`. Worse, the field is **present for a registered email and absent otherwise** → an **account-enumeration oracle**.
- `POST /api/otp/send` and the register endpoints leak their OTP the same way.
- **Fix:** never return OTPs in production responses (gate on `NODE_ENV`); make forgot-password's response **identical** whether or not the email exists. *(The clients deliberately never read these fields, but the server must not send them.)*

**3. Portal — QA-defect pass** *(FE)* — ✅ **DONE 2026-07-12.** Both criticals (fake "Sanjay RK" name + dead `/settings`), all 10 majors and the minors are fixed and verified in the running app, and **audio was deleted** from the portal. Full detail in `docs/qa/functional-audit-portal.md`. Three deeper defects surfaced during verification and were also fixed: i18n was silently reverting to English on every navigation (a `LanguageDetector` cache clobbering the stored choice), the registration language picker was inert (never switched the app; offered 10 unshipped languages), and the new deep-link `returnUrl` initially shipped an open redirect (caught in security review, fixed with origin validation). Also fixed a latent next/image crash and a missing phone-OTP dev banner that blocked QA registration.

**4. Admin — the Revenue card lies** *(Admin)* — ✅ **FIXED 2026-07-12** (`2dc9cc9`).
The card now shows real `PaymentHistory` money (exact rupees, en-IN grouped — the BE's own `formattedRevenue` is lossy above ₹1,00,000), renders the 12-month `monthlyRevenue` trend the client used to throw away, and adds a **Pending Verifications** card from the `pendingVerifications` block (also previously discarded).

**5. Go-live config** *(Infra / PM)*
Real **Razorpay** keys + a real webhook secret (test mode + a `local-dev-*` placeholder today) · **Azkashine GSTIN** on invoices · **MSG91 DLT** registration (SMS) · Meta **WhatsApp** template approval.

### 🟠 P1 — needed for a complete product

**6. Outbound notifications** *(BE ✅ / FE + config left)* — ✅ **backend done (2026-07-12):** channel adapters for MSG91 **SMS + WhatsApp + email** and **FCM push**, fan-out wired into every notification producer, per-channel disable-able, idempotent + retry-safe, no-op safely when unconfigured (in-app keeps working). **Left:** external config (MSG91 keys + DLT/WhatsApp templates, FCM service account) and the notifications dropdown in the portal.

**7. Admin — two missing screens** *(Admin)* — ✅ **BOTH BUILT 2026-07-12**
- **Taxonomy management** (`9dc2e0d`) — `/admin/taxonomy`: full Category → Sector → JobTitle CRUD, Sector↔JobTitle link/unlink, and a soft-delete tree that shows deleted rows flagged. *The gap that mattered most: 10 backend endpoints nobody could reach.*
  - Three traps the UI is built around: a **JobTitle is global and M:N**, so creating one attaches it to nothing (a bare create is invisible in the tree — create-and-link does both); **Delete** removes a title from *every* sector while **Unlink** detaches it from one; **soft-delete is one-way** (the BE has no restore route). Renames **cascade** (`onUpdate: Cascade`) — verified live.
- **Monetization views** (`1ef4cf5`) — `/admin/monetization`: payments (status/date filters, Razorpay order id for reconciliation), GST invoices (base / CGST+SGST vs IGST / total), and per-employer credits + seats + plan state. Read-only by design (no admin grant/revoke or refunds — those are v1.1).
- 🔴 **ONE BE GAP LEFT: admin invoice-PDF route.** The only PDF endpoint is `GET /api/employers/me/invoices/:id/pdf`, guarded by `authorize(EMPLOYER_*)` + `withEmployerContext` — **an ADMIN token gets a 403** (verified against the running BE). The console disables the download and states why rather than shipping a button that always fails. **Needs a small BE ticket:** an admin-reachable `GET /api/admin/monetization/invoices/:id/pdf`.

**8. QA defect pass** — **Portal: ✅ DONE (2026-07-12).** **Admin: ✅ DONE (2026-07-12)** (`ea1325d`, `e017f9b`) — all 5 majors and the minors fixed: the dead header Mail/Bell and the decorative dashboard/documents search are gone (a shared `AdminShell` makes the header search opt-in), the hardcoded "AD/Admin" chip shows the real signed-in admin (sessions predating the change backfill from `GET /admin/profile`), and **every write now confirms itself** — the money-adjacent payment override, all skills CRUD, all moderation actions, document verify/reject, taxonomy and report-resolve. Also: "Employee" → "Job Seekers", ProSiddhi branding, salary thousands separators, and `markViolation` now records **why** (it never sent `violationDetails`/`violationsCount`, though the API always accepted both).

**9. Content moderation + reports** *(BE ✅ / Admin UI ✅)* — ✅ **DONE 2026-07-12.** Backend shipped both; the console now consumes both.
- **Reports queue** (`ba93679`) — `/admin/reports`: Open/Resolved/All, the report reason in full, the post's moderation status, and resolve-with-a-note. Resolve is one-way; a concurrent second resolve gets the BE's 409 and is surfaced as *"another admin resolved this first, their note was kept"* rather than as a failure.
- **Content scan** (`e017f9b`) — the button was shipped **disabled** as "BE pending". That was no longer true: the endpoint **works today even with no OpenAI key**, because the India scam-regex layer needs none. It's live, and the findings panel shows the *offending text*, not just a verdict. With no key the response is a 200 with `openai.configured=false`, and the UI says so explicitly — *"only the scam-rule layer ran; a clean result does not mean OpenAI saw the post"* — because presenting a half-run scan as a clean bill of health on a moderation surface is worse than not scanning.

**10. Portal — delete the audio UI** *(FE)* — ✅ **DONE 2026-07-12.** The 2-min apply recorder, the 60-sec chat recorder + audio bubbles, `useAudioRecorder`, the test-microphone page, the audio params in `api.ts` and all audio i18n keys (incl. the "Voice Message" plan-feature advert) are gone; the mic Permissions-Policy was revoked. Verified in the running app: 0 `<audio>` elements, 0 mic icons, an application still submits end-to-end.

### 🟡 P2 — after launch

**11. Mobile — feature completion.** ~60% built (verified 2026-07-12). The **free product is done and fully EN/HI-localised**; the post-credit **gate is in**. Remaining: **subscription screens** (plans + wallet — *buildable now*), **candidate database**, **team seats**, wire the **dead job edit/close/delete** methods, the i18n **model/display layer**, **Google OAuth**, and chat **Call HR**. → **`prosiddhi-mobile-app/docs/STATUS.md`** is the live tracker.
   - **Only the checkout is parked:** the plans catalog + wallet + "what each plan allows" screens are pure `GET /api/plans` + `/credits` display and can be built now. Only the **"tap Buy → pay"** step waits on the in-app Razorpay + store-policy call. (Interim: the Buy button can stub, or deep-link to the working web checkout.)
   - *(The earlier "mobile revenue leak" framing was wrong — the BE spends the credit before writing the job, so no free post was ever possible; it was a broken funnel, now fixed.)*
**12. Hardening** — Sentry, Playwright smoke tests, low-end-device performance pass.
**13. The other 8 languages** (web EN + HI done; mobile EN + HI done; the other 8 are for later).
**14. Security** — move the JWT from `localStorage` to an httpOnly cookie (both web apps).
**15. v1.1 billing** — bulk/download top-up SKUs, promo codes, chargeback credit-revocation, admin manual credit grant/revoke, auto-renewal.
**16. Audio** — revisit for v2 (removed from V1). The backend **accept-paths are now removed** (2026-07-12): apply + chat are text-only, but backward-tolerant — a stale client that still sends an `audio` field is accepted and the audio silently discarded, never a 400. The DB `audio*` columns remain (dropping them is a destructive migration with no benefit).

---

### 🛠️ Backend session — shipped 2026-07-12 (we now own the backend, D3)

Nine backlog items delivered on `prosiddhi-backend`, each committed per unit, `type-check` green, and **verified end-to-end against a live server on :5000** (not from reading code). Commits: `feat(seats)`, `feat(audio)`, `feat(admin)`, `feat(notifications)`.

| # | What shipped | Verified |
|---|---|---|
| 1 | **Seat-cap bug** — `getEntitlements()` aggregates `seatCap = MAX(seats)`, `walletExpiry = MAX(expiresAt)`; no inline seat math | 2-seat Pro (170d) + 1-seat Starter (180d) → cap 2, expiry 180d |
| 2 | **Real org seats** — `EmployerUser` (1:N, only authz edge), `Subscription`/`PaymentHistory` re-keyed to `employerId`, one `resolveEmployerContext()`; OWNER/MEMBER roles; soft-revoke; request-time + cron seat-downgrade | shared wallet/jobs/unlocks; member manages applicants + chat; suspend-newest-first + restore; owner-protected |
| 3 | **Invite flow** — hashed single-use email-bound 7-day token, owner-revocable, cap at invite+accept, public peek for token-through-auth | wrong account → 403, replay → 400, seeker-email refused |
| 4 | **Audio removed** — apply + chat text-only, backward-tolerant (stray `audio` field discarded, never 400) | bogus audio upload → 201, columns null, temp file discarded |
| 5 | **Admin monetization** — `GET /admin/monetization/{payments,invoices,employers}` + `pendingVerifications` on dashboard stats | real data paginates; overview reuses the credit ledger |
| 6 | **Reports queue** — `GET /admin/reports` + `PATCH /admin/reports/:id/resolve` (guarded) | queue lists, resolve works, double-resolve → 409 |
| 7 | **Content scan** — `POST /admin/posts/:jobId/scan` (OpenAI omni-moderation + India scam-regex), degrades gracefully without a key, persists flagged text | scammy post → 5 regex hits + PENDING_REVIEW; clean post → none; no key → clear message |
| 8 | **Outbound notifications** — MSG91 SMS/WhatsApp/Email + FCM push adapters, fan-out in every producer, per-channel disable-able, idempotent + retry-safe, no-op when unconfigured | accept fires in-app + 4 SKIPPED delivery rows; re-dispatch stays idempotent |
| 9 | **Security/hygiene** — authz on every new route, Zod on every input, rate-limits on new endpoints, no secrets logged; `/code-review` + `/security-review` clean | reviews green, no high-confidence findings |

**Migration:** run `prisma/migrations/2026-07-12_org_seats/up.sql` (data-preserving re-key + backfill; idempotent; reversible via `down.sql`) **before** `prisma db push`. Needs the `pgcrypto` extension (the migration creates it).

**Still needs EXTERNAL config before these light up in prod:**
- **MSG91** — `MSG91_AUTH_KEY` + **DLT-approved SMS template/sender IDs** + **Meta-approved WhatsApp template** + email template/domain. Until set, SMS/WhatsApp/Email deliveries record `SKIPPED`.
- **FCM** — `FCM_SERVICE_ACCOUNT` (service-account JSON). Until set, push records `SKIPPED`. The mobile/portal must register device tokens via `POST /api/notifications/device-token`.
- **OpenAI** — `OPENAI_API_KEY` (optional). Absent → content scan returns "not configured" and runs the scam-regex layer only.
- **Razorpay** — real keys + webhook secret. **GST** — real Azkashine GSTIN.
- All keys are documented (as optional) in `prosiddhi-backend/.env.example`.

**Frontend follow-ups this unblocks:** portal `/invite/:token` landing page (backend ready), ~~the notifications dropdown~~ ✅ **built 2026-07-12 (PJP-111)**, the admin-console monetization + reports + content-scan + taxonomy screens.

---

### 🛠️ Admin session — shipped 2026-07-12

Six units delivered on `prosiddhi-admin`, each committed separately, `type-check` green, and **verified by driving the running app against a live backend on :5000** — not by reading code. All test data (taxonomy rows, a resolved report, a scanned job, a payment-status flip) was **restored afterwards**; the dev DB is back to its baseline.

| # | What shipped | Verified | Commit |
|---|---|---|---|
| 1 | **Shared `AdminShell`** (sidebar+header extracted from 6 inline copies), real admin identity, dead chrome removed, **success toast on every write** | 9 nav links resolve, 0 dead header controls, live payment override toasts | `ea1325d` |
| 2 | **Taxonomy management** — Category/Sector/JobTitle CRUD, M:N link/unlink, soft-delete tree | create → link → unlink (title survived in its 3 other sectors) → soft-delete; 17/17 | `9dc2e0d` |
| 3 | **Revenue card** — real money, 12-month trend, Pending Verifications | rendered figures == `GET /dashboard/stats`; 10/10 | `2dc9cc9` |
| 4 | **Monetization** — payments · GST invoices · credits & seats | 10 payments / 6 invoices / 24 wallets match the API; 20/20 | `1ef4cf5` |
| 5 | **Reports queue + resolve** | resolve persisted the note; concurrent 2nd resolve → 409, first note intact; 14/14 | `ba93679` |
| 6 | **Content scan live** + violation reasons + salary formatting | scan ran and declared its degraded OpenAI state; violation persisted 2 reasons + count 2; 13/13 | `e017f9b` |

**Three things worth knowing** (they cost real debugging time):
1. **A `JobTitle` is global and M:N with `Sector`.** Creating one attaches it to nothing, so a bare create is *invisible* in the tree. And **Delete ≠ Unlink**: delete removes the title from *every* sector.
2. **The content scan works with no OpenAI key** — the India scam-regex layer needs none. It had been shipped disabled as "BE pending" when it was already functional.
3. **Money needs two formatters.** Whole rupees for summaries; **exact to the paisa** for ledgers. A ₹499 pack + 18% GST bills at **₹588.82** — rounding that to "₹589" in a list an admin reconciles against Razorpay is a real error, not cosmetic.

**Left for the backend:** an admin-reachable invoice-PDF route (§3.7).

---

## 4. Known bugs (quick list)

| # | Where | Bug |
|---|---|---|
| 1 | BE | ✅ **FIXED 2026-07-12** — seat cap now `MAX(seats)` across active plans (`getEntitlements`) |
| 2 | BE | ✅ **FIXED 2026-07-12** — real `EmployerUser` membership + org-keyed billing; teammates share the org wallet/jobs/unlocks |
| 3 | BE 🔒 | `forgot-password` returns the OTP in the response **and** is an account-enumeration oracle; `otp/send` + register leak OTP too |
| 4 | Portal | ✅ **FIXED 2026-07-12** — header shows the real signed-in user (was fake "Sanjay RK") |
| 5 | Portal | ✅ **FIXED 2026-07-12** — `/settings` is a real page (was a 404) |
| 6 | Portal | ✅ **FIXED 2026-07-12** — Privacy / Terms / Contact built for real; all other dead footer links removed |
| 7 | Portal | ✅ **FIXED 2026-07-12** — status pills, formatters, dates, job status and the Google-login path all translate now; **also** fixed the i18n cache bug that reverted the whole app to English on navigation |
| 8 | Admin | ✅ **FIXED 2026-07-12** — Revenue card shows real `PaymentHistory` money + the 12-month trend (was captioned "Indicative ₹500/subscription") |
| 9 | Admin | ✅ **FIXED 2026-07-12** — every write confirms itself, incl. the payment override |
| 10 | Admin | ✅ **FIXED 2026-07-12** — dead header Mail/Bell + dashboard search removed; header shows the real signed-in admin |
| 11 | BE 🔒 | **NEW** — no admin-reachable invoice-PDF route; `GET /api/employers/me/invoices/:id/pdf` 403s for an ADMIN token, so the admin console cannot download an invoice |
| — | Mobile | ✅ *All 4 earlier mobile bugs FIXED 2026-07-12 (gate, dead route, dead API URL, dropped filters). The "ungated revenue leak" was a mis-diagnosis — the BE always gated posting.* |

---

## 5. Who owns what

- **Nazir** — portal (FE) + acting PM
- **Asrar** — backend
- **Mobile** — **unowned** (vacancy)
- **Najeeb / Farhana** — QA
- **Nayan** — infra
- **Shaik** — owner / product decisions (pricing signed off)

---

## 6. The plan — how we're working through §3

Work is split into focused sessions, one repo each. **Read this file + `PRODUCT.md` first in any session.**

| # | Session | Scope | Repo |
|---|---|---|---|
| **1** | **Backend — seat bugs + audio removal** 🔴 | Fix the **two seat bugs** ([MONETIZATION.md](MONETIZATION.md) §6): `seatCap = MAX(seats)` across active plans, and make seats real (`EmployerUser` 1:N, org-keyed subscriptions, one `resolveEmployerContext()`). **Remove the audio accept-paths.** *P0 — a multi-seat plan currently delivers no shared wallet.* | `prosiddhi-backend` |
| **2** | **Portal QA fixes + audio removal** | The 2 criticals (both in `UserDropdown.tsx` — one fix clears both), then the 10 majors from `docs/qa/functional-audit-portal.md`. **Delete the audio UI** (2-min apply recorder, 60-sec chat recorder, the recorder hook). | `prosiddhi-frontend` |
| **3** | ~~**Admin: build + fix + docs**~~ ✅ **DONE 2026-07-12** | Taxonomy screen ✅ · monetization views ✅ · Revenue-card lie ✅ · the 5 majors ✅ · reports queue ✅ · content scan ✅. Six commits, each live-verified. Only an admin invoice-PDF **BE route** is left. | `prosiddhi-admin` |
| **4** | **Mobile P0** | The **post-credit gate** (revenue leak), the broken `/forgot-password` route, the dead default API URL, the dropped search filters, and **delete the inert audio UI**. | `prosiddhi-mobile-app` |
| **5** | **Mobile — monetization** | Full **in-app Razorpay** (D2): plans screen → checkout → verify → credit wallet → invoices. *Verify store policy first.* | `prosiddhi-mobile-app` |
| **6+** | **Mobile — completion** | **i18n (EN/HI)** — then My Interviews, contact-recruiter gate, report-job, profile edit, Google OAuth, forgot/reset. | `prosiddhi-mobile-app` |

**Still unowned / not scheduled:** outbound notifications (MSG91 SMS/WhatsApp/email + FCM push) — the BE adapters exist and no-op until keyed, so this is **external config**, not code. *(OpenAI content scan and the reports queue were on this list; both are now built AND consumed by the admin console.)*

> ⚠️ **We now own the backend (D3).** Coordinate with Asrar before touching `prosiddhi-backend` — if you both commit, you will collide.

### Decisions (locked 2026-07-12)

| # | Decision | ✅ Locked |
|---|---|---|
| **D1** | Portal audio — hide or delete? | 🔒 **DELETE. Remove the audio feature entirely** — portal, mobile, and the backend accept-paths. Not hidden, not flagged, **removed**. *(DB columns may remain — dropping them is a destructive migration with no benefit.)* |
| **D2** | Mobile payments — in-app Razorpay or buy-on-web? | 🔒 **In-app Razorpay.** Mobile gets the full checkout (plans → `/api/billing/checkout` → `razorpay_flutter` → `/api/billing/verify-payment` → wallet). ⚠️ **Risk to verify:** Google Play / Apple may treat job-posting credits as *digital goods* and require their own in-app billing (15–30%). B2B services are often exempt — **confirm against store policy before building the checkout.** |
| **D3** | **Who owns the backend?** | 🔒 **We do.** We hold the BE code and will make the backend changes ourselves — this **reverses the old "never edit the backend" rule.** ⚠️ **Coordinate with Asrar** so we don't both commit to `prosiddhi-backend` at once. |
| **D4** | Is English-only acceptable for a mobile launch? | ⏸️ **Open.** Recommendation: **no** — the core users are low-literacy **Hindi** speakers and mobile is English-only while the web has full EN/HI. Treat mobile i18n as a **launch blocker**, not polish. |
| **D5** | Mobile stack: the locked scope says **React Native**; the app is **Flutter** (~19k lines of Dart, not portable). | ⏸️ Formally record **Flutter** as the stack so it stops resurfacing. |

---

## 7. ⚠️ JIRA is stale — don't trust it

JIRA shows **79 open tickets**, but many are **done in code** — the whole monetization set (**PJP-162…175, 180**), **PJP-110** (subscription UI), **PJP-72** (Google OAuth), **PJP-75/76**. The board was never updated when monetization shipped.

**Until someone reconciles the board, treat this file as the truth.**

**Newly closable in code (2026-07-12) — the board still shows these as open:**
- **PJP-94** (OpenAI content scan) — BE shipped **and** the admin console consumes it (`e017f9b`).
- **PJP-102** (reports queue) — BE shipped **and** the admin console consumes it (`ba93679`).

The tickets that *are* genuinely still open map to §3 above: PJP-96/97/98 (notification channels — the BE adapters exist; this is external config), PJP-87 (staging/CI), the mobile stories, and the S3 hardening set. **New, no ticket yet:** an admin-reachable invoice-PDF route, a taxonomy restore route, and PJP-99 (admin audit log) is still unbuilt.
