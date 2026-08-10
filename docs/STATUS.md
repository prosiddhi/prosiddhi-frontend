# ProSiddhi — Status

**The single source of truth for what is done and what is left.** Updated **2026-08-06**.
Verified by reading the code in all three repos **and running the flows against a live backend** — **not** from tickets. Where this doc and JIRA disagree, **this doc is right** (see §6).

**Latest (2026-08-06): portal registration + login rebuilt for the new auth contract.** Both `/{jobseekers,employers}/set-password` routes are **deleted on the BE (404)** — they were unauthenticated and let anyone who knew an email claim an unfinished signup (25 such rows existed on dev). Both contacts are now verified **before** the account exists and the password ships **with** it. Portal registration was 100% broken against this backend until this pass — nobody could sign up. Also ships **phone-only seeker registration** (PRODUCT.md §2 — many seekers have no email), **phone + password login**, and seven folded-in QA defects. → §3 item 3a.

**Previously (2026-07-27):** admin console gained the **super-admin management, admin-adds-user, and audit-log** screens + SUPER_ADMIN role-gating (only the per-entity "history" tab is left). Backend gained the matching **SUPER_ADMIN role, admin-user CRUD, admin-adds-user, and an append-only audit log**. **Outbound email is now wired** — OTP delivery, team-invite links, and the interview `.ics` all send via MSG91 (committed `e7be075`; needs the server-side email env + MSG91 IP whitelist to go live — see `go-live-config.md`). Docs pruned to the lean source-of-truth set.

Other docs: [PRODUCT.md](PRODUCT.md) (what we're building) · [MONETIZATION.md](MONETIZATION.md) (pricing rules + billing) · [DEPLOY.md](DEPLOY.md) (deploy + go-live) · [go-live-config.md](go-live-config.md) (deploy dependencies) · [manual-testing-walkthrough.md](manual-testing-walkthrough.md) (manual test guide) · [qa/](qa/) (the QA pack — plan, 538 cases, traceability, UAT, **defect log**) · [brand-asset-brief.md](brand-asset-brief.md) (logo spec for the designer) · [store-policy-assessment.md](store-policy-assessment.md) (⚠️ contradicts decision **D2**).

---

## 1. Where we stand — one line per surface

| Surface | Repo | State |
|---|---|---|
| **Backend** | `prosiddhi-backend` | ✅ **Feature-complete.** Everything the apps need is live, incl. the full billing system, the **SUPER_ADMIN role + admin-user CRUD + admin-adds-user + append-only audit log**, and **outbound email delivery** (OTP / invites / interview `.ics`). **Auth rebuilt 2026-08-03** (`2165880`…`09a88fc`, Asrar): password at registration, both contacts verified before the account exists, seeker email optional, `/set-password` deleted. **Current HEAD `09a88fc`.** |
| **Portal** (seeker + employer) | `prosiddhi-frontend` | ✅ **Feature-complete.** QA-defect pass done 2026-07-12 (2 criticals + 10 majors, audio removed, i18n cache bug, two open redirects); team invites + the public `/invite/<token>` page rebuilt the same day. **Registration + login rebuilt 2026-08-06** for the new auth contract — see §3 item 3a. **A second QA run (04-Aug) found 13 more defects: 8 fixed, 5 open** (→ [qa/defect-log.csv](qa/defect-log.csv)). **GO for handover** *(one BE bug blocks cold-start invites — §3 item 1a)*. |
| **Admin console** | `prosiddhi-admin` | ✅ **Feature-complete + QA-defect pass DONE** (2026-07-12). The two missing screens (**taxonomy**, **monetization**) are built, the reports queue and content scan are wired, the Revenue-card lie is fixed, and all 5 majors + the minors are done. **10 pages · 55 API functions.** Every fix verified against a live backend. **Super-admin management, admin-adds-user, and the audit-log feed added (2026-07-27) with SUPER_ADMIN role-gating — only the per-entity "history" tab remains.** → `prosiddhi-admin/docs/qa/functional-audit-admin.md`. **GO for handover.** *(The admin invoice-PDF gap is **CLOSED** — the route exists at `admin.routes.ts:489`; the console's download just needs enabling.)* |
| **Mobile app** | `prosiddhi-mobile-app` | 🟡 **~85% built** (Flutter). Free product, candidate DB, team seats, chat and **EN/HI** all done. Registration reworked + **verified** 2026-08-06 (3 real defects found and fixed). **Missing: checkout** (parked on the store-policy call) and **invoices** (never built). 🔴 **Never run on a device or emulator — no Android SDK on any dev machine.** That is now the biggest single unknown in the project. → **`prosiddhi-mobile-app/docs/STATUS.md`** |

### Hosted backend — ⚠️ read before redeploying
**`http://103.225.224.149:5000`** — last matched the repo around 2026-07-12. It is **well behind `main`**: the seat rework + `/entitlements`, admin monetization endpoints, reports queue, content scan, notification channels, audio removal, and **the whole 2026-08-03 auth rework** are all missing from it.

🔴 **The redeploy is now a coordinated release, not a routine one.** The auth rework is **breaking**: registration payloads changed and `/set-password` is gone. The portal at `:3000` must ship in the **same window** or public sign-up dies. **Mobile is worse** — `app_config.dart` defaults to this server, and there is no shipped build to update, so mobile registration breaks the moment this box moves and stays broken until someone builds the app.

**Order:** deploy BE + portal together → verify sign-up on the live site → only then let mobile point at it.

⚠️ Its **database is empty** (0 jobs — plans + taxonomy seeded only), so create test data before testing flows.
⚠️ Registration is **impossible in production mode until MSG91 is configured** — the BE stops echoing OTPs and nothing delivers them, so there is no way to obtain a code. This directly blocks the QA plan's "run security/UAT against a production-mode server".

### ⛔ Audio is REMOVED from the product (decided 2026-07-12)
**No audio anywhere** — no application voice message, no chat audio. **Mobile:** audio UI ✅ deleted. **Backend:** accept-paths ✅ removed (backward-tolerant). **Portal:** ✅ **deleted** (2026-07-12) — apply-modal recorder, chat recorder + audio bubbles, `useAudioRecorder`, the test-microphone page, audio params in `api.ts`, and all audio i18n keys are gone; the mic Permissions-Policy was revoked. Revisit in v2.

**Bottom line:** the web product is built end-to-end — backend, portal **and admin console** — **including employer monetization** (credits, Razorpay, GST invoices, paid candidate database, team seats). Seat bugs fixed, audio removed, auth rebuilt and both web clients reconciled with it.

**What actually remains is four things, and none of them is portal feature work:**

1. **External config** — real Razorpay keys, Azkashine GSTIN, MSG91 DLT/WhatsApp templates, FCM, and above all **a real HTTPS domain**, which alone blocks Google OAuth, WhatsApp and secure cookies.
2. **Mobile** — the checkout (pending D2 / the store-policy call), invoices, and **getting it onto a device at all**.
3. **One open BE bug** — the trial-lot fix that unblocks cold-start team invites, written and verified but **not merged** (§3 item 1a).
4. **Five portal defects** from the 04-Aug QA run — a small, self-contained pass (§3 item 3b).

See the **backend** and **admin** session summaries at the end of §3.

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
- **Team seats** — roster, invite, accept, remove, revoke, public invite-peek *(one open bug — see §3 item 1a)*.
- **Admin API** — queues, document verification, moderation, skills CRUD, **real revenue** from `PaymentHistory`.
- Rate limiting, webhook audit log.

### Portal (web)
- **Auth** — register (seeker + employer), all 3 login methods, email verify, forgot/reset, role routing.
- **Seeker** — job feed (search / filters / **category filter** / recommended / nearby), job details, saved jobs, apply (+audio), my applications, contact-recruiter gate, report a job, my interviews, profile.
- **Employer** — dashboard, post/manage jobs (taxonomy triple), candidate management, chat, profile.
- **Monetization** — pricing page, Razorpay checkout, credit wallet + expiry nudge, post-credit gate + upsell, top-up modal, **invoice history + PDF**.
- **Candidate database** — snippet search, explicit "use 1 credit to unlock" confirm, unlocked-candidates history.
- **Team seats** — roster (members vs pending invites, ACTIVE/**SUSPENDED** seats, owner-vs-member view), invite by email, revoke an invite, remove a member, and the **public `/invite/<token>` landing page** that carries the token through sign-in *or* registration and auto-accepts. *(Cold start — an invitee with no account — additionally needs the BE fix in §3 item 1a.)*
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

**3. Portal — QA-defect pass** *(FE)* — ✅ **DONE 2026-07-12.** Both criticals (fake "Sanjay RK" name + dead `/settings`), all 10 majors and the minors are fixed and verified in the running app, and **audio was deleted** from the portal. Full detail in the portal QA audit (now resolved; doc pruned). Three deeper defects surfaced during verification and were also fixed: i18n was silently reverting to English on every navigation (a `LanguageDetector` cache clobbering the stored choice), the registration language picker was inert (never switched the app; offered 10 unshipped languages), and the new deep-link `returnUrl` initially shipped an open redirect (caught in security review, fixed with origin validation). Also fixed a latent next/image crash and a missing phone-OTP dev banner that blocked QA registration.

**3a. Portal — auth rework: registration + login** *(FE)* — ✅ **DONE 2026-08-06.**
The BE deleted both `set-password` routes and made register require **both contacts verified up front + the password in the same call**. Until this pass every portal register call 400'd and every `setPassword` call 404'd: **registration was completely broken.** Rebuilt against a contract captured from a live BE at `09a88fc`, re-verified against BE source (routes, both zod register schemas, the 3-arm login union, `sendError`).

- **Seeker** — email is now **optional** (verified before the account exists when given, skipped entirely when not); `/register/password` creates the account and logs straight in, using the **phone** as the login identifier for a seeker with no email.
- **Employer** — new `/contacts` + `/verify`: both contacts on one screen, **both codes on one screen, one button**. A 3+3 split was considered and **rejected** (it would cut each code from 1,000,000 to 1,000 combinations, break SMS autofill, and make "which half was wrong?" unanswerable). Half-verified is not a failure state — each mark is independent and persists.
- **Login** — adds **phone + password** (arm 3), the only password login a phone-only seeker has, plus phone-first recovery ("Forgot password?" is email-based and a dead end for them).
- **Error mapping** — in production these responses carry **no machine-readable code**, only a status + message, so business errors are matched on the known message set with a safe fallback; field errors use `errors[].path`, which does survive prod. **`N-4`/`N-6`/`N-12` are one message for three causes** (never verified / mark already consumed / phone already registered) — the UI sends the user to **re-verify their phone** and never claims "phone already in use", because it cannot tell them apart.
- **Folded-in defects:** 2 (home language picker), 3 (logo on `/register` + `/login`), 5+13 (role choice at step one), 7 (remove an experience row), 8 (refresh no longer restarts the flow), 12 (employer links preselect the Employer tab).
- **Refresh survivability** — non-secret progress mirrors to `sessionStorage` via an explicit allowlist. The **password is never persisted** (nor are the File handles or the dev OTP echoes), and guards wait for hydration — persistence alone would not have fixed the bounce.

⚖️ **Web and mobile registration flows differ, and that is a DECISION, not debt** — mobile (`37dedcb`) shipped a different screen order the same day. Same rules, endpoints and outcomes; only the grouping differs. Locked as **D6** in §6 — read it before re-raising, and do not "fix" it by reworking mobile.

**3b. Portal — 5 defects left from the 04-Aug QA run** *(FE)* — 🟠 **OPEN, small and self-contained.**
QA executed against the hosted portal on 2026-08-04 and filed 13 items; triage confirmed every one against the code and added a 14th we found ourselves. **Eight are fixed** (folded into 3a), **one was closed as by-design** (the admin console has no self-signup — that is deliberate; QA needs credentials, not a fix). Full register with root causes: [qa/defect-log.csv](qa/defect-log.csv).

| Defect | What | Sev |
|---|---|---|
| **DEF-004 + DEF-014** | **The seeker landing search bar is entirely decorative.** "Select location" is a `<button>` with no `onClick`, and Search Jobs is a plain `<Link href="/job-feed">` that drops the typed keyword. Type a job title, press Search, get an unfiltered feed | S2 / P1 |
| **DEF-001** | Home hero + badge stay English in Hindi — `HeroSection.tsx` has no `useTranslation` at all | S2 / P2 |
| **DEF-006** | Seeker landing does not fit the viewport; the search bar sits below the fold (fixed `text-[72px]` + `mb-[111px]`, no responsive variants) | S3 / P3 |
| **DEF-010 + DEF-011** | **The portal is branded with the parent company's logo.** Header and footer both render the **Azkashine** mark; the product is ProSiddhi. 🚧 **Blocked on the designer** → [brand-asset-brief.md](brand-asset-brief.md) | S3 / P2 |

DEF-004 + DEF-014 are the same control and the most user-visible thing left in the portal. The others are one small pass, except the branding, which cannot start until the artwork arrives.

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
- ✅ **The admin invoice-PDF gap is CLOSED (verified 2026-08-06).** `GET /api/admin/monetization/invoices/:id/pdf` exists at `admin.routes.ts:489`, shipped in `c8242ed`. **Remaining work is in the ADMIN console, not the BE:** its download button is still disabled behind a "BE pending" note that is no longer true. Small ticket — enable it and verify a PDF downloads with an ADMIN token.

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

**Left for the backend:** nothing from this session — the admin invoice-PDF route it asked for has since shipped (`c8242ed`). The console still needs to *enable* its download button.

---

### 🛠️ Portal session — team invites, shipped 2026-07-12

Reconciled the portal with the rebuilt seat contract and built the one missing screen. Six commits on `prosiddhi-frontend`, `type-check` green on each, **verified by running the real flow against a live backend on :5000** — not by reading code.

The feature was **completely dead in three independent ways**, and the first hid the other two:

| # | What was broken | Now | Commit |
|---|---|---|---|
| 1 | **Every invite link was `?token=undefined`** — the FE still read the pre-rework `inviteToken` field. **No invite could ever be accepted.** | Real `token` / `inviteId` fields | `99bcecd` |
| 2 | **Roster showed ACTIVE teammates as "Pending"** — compared `status === 'ACCEPTED'`, an enum value the rebuilt BE no longer emits. Pending invites and held seats were one list. | `members[]` (ACTIVE / **SUSPENDED**) and `invites[]` as separate groups; owner-vs-member view off `me.role`/`me.seatStatus` | `46bbd74` |
| 3 | **Remove and revoke were the same control** — but they take ids from different spaces (membership vs invite). | Split: `DELETE /me/team/:membershipId` vs `DELETE /me/team/invites/:inviteId` (crossing them 404s — verified) | `46bbd74` |
| 4 | **No landing page**, and the one accept screen sat behind `ProtectedRoute` — an invitee without an account was bounced to `/login` and **the token was dropped**. | **Public `/invite/<token>`**: peek → carry the token through sign-in *or* registration → **auto-accept on return**. `/employer/team/accept` retired to a redirect: **one accept path, not two.** | `81aef07` |

**Verified end-to-end, not from reading code:** invite → public peek → *fresh* registration → accept → the new member resolves the **org's** wallet (66 post / 657 download) instead of their own trial 1/3 — the entire point of a multi-seat plan. Negatives too: replay → 400, wrong account → 403, member-invites → 403.

**Two things worth knowing** (both cost real debugging time, both are load-bearing):

1. **The BE strips `reason` outside development.** `sendError()` gates the payload on `NODE_ENV === 'development'`, so `{ reason: 'INVITE_EMAIL_MISMATCH' }` **is not sent in production**. Any FE error map keyed on `reason` degrades to "something went wrong" in prod — on exactly the surface where the user most needs telling what to do. `lib/inviteErrors.ts` therefore branches on **HTTP status** and treats `reason` only as a refinement. *Worth fixing on the BE: `reason` is machine-readable, not sensitive, and should ship in prod.*
2. **A trial credit lot made the cold path impossible** — see §3 item 1a. Registration auto-grants a TRIAL lot; `isDisposableShell()` counted every lot; so every new invitee 409'd. **This is the flagship path and it had never worked.**

**Also fixed en route (found by the security + code reviews):** a **live open redirect** in the post-login `returnUrl` — resolving against our origin and then forwarding `url.pathname` accepts `https://ours.com//evil.com`, whose *pathname* is `//evil.com`, which Next hard-navigates off-site. Pre-existing, but the invite flow deliberately routes invitees through `/login?returnUrl=…`, and a sign-in page is where a phishing bounce pays off. Both redirect guards now go through one arbiter (`lib/safeRedirect.ts`), proven against 9 attack strings. Plus a render crash on `/invite/%` and a transient-failure path that silently destroyed the invite journey on a network blip or expired JWT.

---

## 4. Known bugs (quick list)

| # | Where | Bug |
|---|---|---|
| 1 | BE | ✅ **FIXED 2026-07-12** — seat cap now `MAX(seats)` across active plans (`getEntitlements`) |
| 2 | BE | ✅ **FIXED 2026-07-12** — real `EmployerUser` membership + org-keyed billing; teammates share the org wallet/jobs/unlocks |
| 3 | BE 🔒 | ✅ **RECOMMEND CLOSING — not a production bug (verified 2026-08-06).** Captured production-mode responses for a registered and an unregistered email are **byte-identical and carry no `otp`**; `sendError` gates the payload on `NODE_ENV`. The leak and the enumeration oracle are **development-only, deliberately**, so QA can complete a flow with no SMS gateway wired. The flip side is item 17 |
| 4 | Portal | ✅ **FIXED 2026-07-12** — header shows the real signed-in user (was fake "Sanjay RK") |
| 5 | Portal | ✅ **FIXED 2026-07-12** — `/settings` is a real page (was a 404) |
| 6 | Portal | ✅ **FIXED 2026-07-12** — Privacy / Terms / Contact built for real; all other dead footer links removed |
| 7 | Portal | ✅ **FIXED 2026-07-12** — status pills, formatters, dates, job status and the Google-login path all translate now; **also** fixed the i18n cache bug that reverted the whole app to English on navigation |
| 8 | Admin | ✅ **FIXED 2026-07-12** — Revenue card shows real `PaymentHistory` money + the 12-month trend (was captioned "Indicative ₹500/subscription") |
| 9 | Admin | ✅ **FIXED 2026-07-12** — every write confirms itself, incl. the payment override |
| 10 | Admin | ✅ **FIXED 2026-07-12** — dead header Mail/Bell + dashboard search removed; header shows the real signed-in admin |
| 11 | BE 🔒 | ✅ **CLOSE — the route now exists (verified 2026-08-06).** `GET /api/admin/monetization/invoices/:id/pdf` is live at `admin.routes.ts:489`, shipped in `c8242ed`. **Follow-up on the ADMIN console:** its download button is still disabled with a "BE pending" note that is no longer true — enable it |
| 12 | **BE** 🔴 | **NEW — OPEN, blocks the invite feature.** A **TRIAL credit lot** (auto-granted at registration) makes `isDisposableShell()` treat every brand-new account as "already runs its own workspace", so **accepting an invite 409s for anyone who doesn't already have an employer account** — the cold-start path never worked. **Fix is written and verified** on branch `fix/invite-trial-lot-blocks-cold-path` (`2b5a3ad`), **not merged** — needs Asrar coordination. → §3 item 1a |
| 13 | BE | ✅ **CLOSE — fixed since it was raised (verified 2026-08-06).** `sendError()` now always serialises a **plain structured object** (`{reason, seatCap, …}`) in every environment; only raw `Error` instances and stray arrays stay dev-gated. Machine-readable discriminators reach production clients as intended. *(Distinct from item 18: registration business errors carry no discriminator at all, because nothing sets one on them.)* |
| 14 | Portal | ✅ **FIXED 2026-07-12** — the invite flow was dead three ways: every link was `?token=undefined`, the roster rendered ACTIVE teammates as "Pending", and there was no landing page (invitees without an account lost the token at `/login`). → §3 item 1 |
| 15 | Portal 🔒 | ✅ **FIXED 2026-07-12** — **open redirect** in the post-login `returnUrl`: an origin-passing URL could still yield a protocol-relative pathname (`https://ours.com//evil.com` → `//evil.com`) that Next hard-navigates off-site. Both redirect guards now share one validator (`lib/safeRedirect.ts`) |
| 16 | Portal | ✅ **FIXED 2026-08-06** — registration was **100% broken** against the reworked backend: all three register calls 400'd (missing `password`, unverified email) and all three `setPassword` calls 404'd. **Nobody could sign up.** → §3 item 3a |
| 17 | BE 🔴 | **NEW — open, blocks prod-mode testing.** In production the BE stops echoing OTPs (correctly), so with **no MSG91 configured no code is delivered by any channel and registration is impossible** — there is no way to obtain one. This blocks running the security/UAT passes against a production-mode server. Config, not code → `go-live-config.md` |
| 18 | BE | **NEW — open, low.** Registration business errors carry **no machine-readable discriminator in production** — no `code`, no `error`, only `message` + status (field errors do survive via `errors[].path`). The portal branches on status + a known message set, which breaks silently if a message is reworded. A `code` on these responses is a future BE ticket |
| 19 | BE | **NEW — open, low.** `Phone number must be verified before registration` is returned for **three different causes** — never verified, verification already consumed, phone already registered — so the client cannot tell them apart and must always send the user to re-verify |
| 20 | Mobile | ⚖️ **NOT A BUG — accepted divergence, locked as D6 (2026-08-06).** Mobile (`37dedcb`) groups the registration screens differently from the portal. Same rules, endpoints and outcomes; only the screen split differs. Aligning it is deliberately **not** scheduled — see §6 **D6** before re-raising |
| 21 | Portal 🔴 | ✅ **FIXED 2026-08-06** (`206b065`) — **no minimum age was enforced anywhere.** The profile step collected date of birth and gender as *required* and then never sent them, so the BE's `age >= 18` refinement had never run in the product's life. Verified live: born 2010 → 400, born 2000 → 201 with both fields persisted. Client-side age check added on the profile step too, so the rejection lands where the date field is. **Mobile always sent them — this was portal-only** |
| 22 | BE 🔒 | **NEW — open, a decision not a defect.** `POST /api/otp/send` refuses an already-registered number with *"This phone number is already registered"* — a **phone-enumeration oracle**. It is also exactly what makes the error actionable (a returning user is told to sign in instead of re-verifying). Keep it or make it generic: **Asrar's call**, BE change either way |
| 23 | Mobile | ✅ **FIXED 2026-08-06** — three real defects found by *running* `37dedcb`: a register whose response was lost left the user in a **permanent retry loop** (marks burned, every retry 400s — `1adc430`); a `TextEditingController` rebuilt every frame and never disposed (`e2760a8`); a stale server status able to pair with a fresh local error and light the wrong CTA (`e552caf`, found by reviewing the first fix) |
| 24 | Mobile | ✅ **FIXED 2026-08-06** (`b2b6239`) — `ApiResponse` dropped the BE's `errors[{path,message}]`, so every schema rejection read as a bare *"Validation failed"*. Pinned by a 12-case contract test built from captured payloads |
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
| **2** | **Portal QA fixes + audio removal** | The 2 criticals (both in `UserDropdown.tsx` — one fix clears both), then the 10 majors from the portal QA audit (now resolved; doc pruned). **Delete the audio UI** (2-min apply recorder, 60-sec chat recorder, the recorder hook). | `prosiddhi-frontend` |
| **3** | ~~**Admin: build + fix + docs**~~ ✅ **DONE 2026-07-12** | Taxonomy screen ✅ · monetization views ✅ · Revenue-card lie ✅ · the 5 majors ✅ · reports queue ✅ · content scan ✅. Six commits, each live-verified. The invoice-PDF **BE route has since shipped**; enabling the console's download button is the only follow-up. | `prosiddhi-admin` |
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
| **D6** *(2026-08-06)* | Web and mobile registration use **different screen orders**. Align them, or accept it? | 🔒 **Accept it.** Both clients were reworked for the same 2026-08-03 backend change on the same day and grouped the screens differently. **Same rules, same endpoints, same order of operations, same outcomes** — only the screen split differs: mobile gives the seeker's email its own skippable screen and takes 4 screens to verify an employer's 2 contacts, where the portal uses one optional field and 2 screens. The portal's is the better UX, but aligning mobile is roughly the size of its whole rework, the QA pack already has separate web and mobile suites, and a user is on one surface or the other. Decisive factor: **the app cannot currently be launched at all** (no Android SDK, no emulator) — reworking four registration screens you cannot run is risk with no user-visible payoff. **If revisited:** toolchain first, then device-test, then change screens. Detail + the comparison table: `prosiddhi-mobile-app/docs/STATUS.md` §"Registration, as built". |

---

## 7. ⚠️ JIRA is stale — don't trust it

JIRA shows **79 open tickets**, but many are **done in code** — the whole monetization set (**PJP-162…175, 180**), **PJP-110** (subscription UI), **PJP-72** (Google OAuth), **PJP-75/76**. The board was never updated when monetization shipped.

**Until someone reconciles the board, treat this file as the truth.**

**Newly closable in code (2026-07-12) — the board still shows these as open:**
- **PJP-94** (OpenAI content scan) — BE shipped **and** the admin console consumes it (`e017f9b`).
- **PJP-102** (reports queue) — BE shipped **and** the admin console consumes it (`ba93679`).

The tickets that *are* genuinely still open map to §3 above: PJP-96/97/98 (notification channels — the BE adapters exist; this is external config), PJP-87 (staging/CI), the mobile stories, and the S3 hardening set. **New, no ticket yet:** enabling the admin console's invoice-PDF download (the BE route shipped in `c8242ed`), and the five open portal defects from the 04-Aug QA run. *(Taxonomy restore and PJP-99 admin audit log are both BUILT — close them.)*
