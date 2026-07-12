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
| **Admin console** | `prosiddhi-admin` | 🟡 **Wired, but two whole screens are missing** (taxonomy, monetization). No mock data, no blockers — and the BE endpoints those screens need **now exist** (unblocked 2026-07-12). |
| **Mobile app** | `prosiddhi-mobile-app` | 🟡 **~60% built** (Flutter). Free product done + **EN/HI localised**; post-credit gate in. Pending: subscription screens, candidate DB, team seats, a few loose ends. *(Only in-app **checkout** is blocked, on the store-policy call — the plans/wallet **screens** are buildable now.)* → **`prosiddhi-mobile-app/docs/STATUS.md`** |

### Hosted backend
**`http://103.225.224.149:5000`** — had monetization, candidate DB, team seats and taxonomy deployed as of 2026-07-12.
⚠️ **Needs a redeploy:** the backend session's newest commits (seat rework + `/entitlements`, admin monetization endpoints, reports queue, content scan, notification channels, audio removal) are **committed locally but not yet on the hosted server.** Deploy before the Admin/Mobile sessions rely on those endpoints — or point those sessions at a local BE.
⚠️ Its **database is empty** (0 jobs — plans + taxonomy seeded only), so create test data before testing flows.

### ⛔ Audio is REMOVED from the product (decided 2026-07-12)
**No audio anywhere** — no application voice message, no chat audio. **Mobile:** audio UI ✅ deleted. **Backend:** accept-paths ✅ removed (backward-tolerant). **Portal:** ✅ **deleted** (2026-07-12) — apply-modal recorder, chat recorder + audio bubbles, `useAudioRecorder`, the test-microphone page, audio params in `api.ts`, and all audio i18n keys are gone; the mic Permissions-Policy was revoked. Revisit in v2.

**Bottom line:** the web product is built end-to-end, **including employer monetization** (credits, Razorpay, GST invoices, paid candidate database, team seats). The **two seat bugs are now FIXED on the backend** (real org membership + shared wallet, correct seat-cap aggregation, rebuilt invite flow), **audio accept-paths removed** (backward-tolerant), and the backend now has **admin monetization endpoints, a reports queue, content scan, and outbound notification channels** (MSG91 + FCM, no-op until keyed). What remains is mostly **frontend + external config**: the admin-console monetization/taxonomy screens, the portal invite-flow landing page, a QA-defect pass, and go-live config (MSG91 DLT/WhatsApp templates, FCM, OpenAI key, real Razorpay keys, GSTIN). See the **backend session summary** at the end of §3.

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
Login, dashboard, job-seeker management, employer management, document verification, post moderation (manual actions), skills catalog CRUD. **33 API functions, all hitting real backend routes. No mock data. No blockers.**

---

## 3. What is LEFT — priority order

### 🔴 P0 — blocks launch

**1. Two seat bugs — ✅ FIXED on the backend (2026-07-12)** *(BE)*
- **Seat cap reads the wrong plan** — ✅ fixed. One `getEntitlements()` aggregates `seatCap = MAX(seats)` / `walletExpiry = MAX(expiresAt)`; no controller computes seats inline.
- **Seats are roster-only** — ✅ fixed. New `EmployerUser` membership (1:N, the only authz edge), `Subscription`/`PaymentHistory` re-keyed to `employerId`, one `resolveEmployerContext()` every employer controller routes through. Shared org wallet/jobs/unlocks; OWNER vs MEMBER roles; soft-revoke removal; seat downgrade auto-suspends newest-first at request time + in the cron.
- **Invite flow** — ✅ fixed. Hashed single-use email-bound 7-day token, owner-revocable, cap checked at invite + accept, public peek endpoint so the FE can carry the token through auth and auto-accept.
- **Still needs the FE:** the portal `/invite/:token` landing page + token-through-auth plumbing (backend is ready).
→ Full detail in [MONETIZATION.md](MONETIZATION.md) §6.1–6.3.

**2. Backend — auth OTP leak + account-enumeration** 🔒 *(BE — found by the mobile session 2026-07-12)*
- `POST /api/auth/forgot-password` returns the reset code in `data.otp`. Worse, the field is **present for a registered email and absent otherwise** → an **account-enumeration oracle**.
- `POST /api/otp/send` and the register endpoints leak their OTP the same way.
- **Fix:** never return OTPs in production responses (gate on `NODE_ENV`); make forgot-password's response **identical** whether or not the email exists. *(The clients deliberately never read these fields, but the server must not send them.)*

**3. Portal — QA-defect pass** *(FE)* — ✅ **DONE 2026-07-12.** Both criticals (fake "Sanjay RK" name + dead `/settings`), all 10 majors and the minors are fixed and verified in the running app, and **audio was deleted** from the portal. Full detail in `docs/qa/functional-audit-portal.md`. Three deeper defects surfaced during verification and were also fixed: i18n was silently reverting to English on every navigation (a `LanguageDetector` cache clobbering the stored choice), the registration language picker was inert (never switched the app; offered 10 unshipped languages), and the new deep-link `returnUrl` initially shipped an open redirect (caught in security review, fixed with origin validation). Also fixed a latent next/image crash and a missing phone-OTP dev banner that blocked QA registration.

**4. Admin — the Revenue card lies** *(Admin)*
Caption still reads *"Indicative (₹500/subscription)"* but the backend now returns **real money** from `PaymentHistory`. Fix the caption and consume the `monthlyRevenue` series the API already returns.

**5. Go-live config** *(Infra / PM)*
Real **Razorpay** keys + a real webhook secret (test mode + a `local-dev-*` placeholder today) · **Azkashine GSTIN** on invoices · **MSG91 DLT** registration (SMS) · Meta **WhatsApp** template approval.

### 🟠 P1 — needed for a complete product

**6. Outbound notifications** *(BE ✅ / FE + config left)* — ✅ **backend done (2026-07-12):** channel adapters for MSG91 **SMS + WhatsApp + email** and **FCM push**, fan-out wired into every notification producer, per-channel disable-able, idempotent + retry-safe, no-op safely when unconfigured (in-app keeps working). **Left:** external config (MSG91 keys + DLT/WhatsApp templates, FCM service account) and the notifications dropdown in the portal.

**7. Admin — two missing screens** *(Admin; BE half ✅)*
- **Taxonomy management** — the backend has **10 admin CRUD endpoints** for Category/Sector/JobTitle and the console has **no page, no nav item, not one API call**. Nobody can manage the taxonomy.
- **Monetization views** — the **admin-namespaced BE endpoints now exist** (✅ 2026-07-12: `GET /api/admin/monetization/{payments,invoices,employers}` + `pendingVerifications` on the dashboard stats). The **admin-console UI** (payments / invoices / credits / plans / team-seat surface) still to build.

**8. QA defect pass** — **Portal: ✅ DONE (2026-07-12)** — all criticals + majors + minors fixed and live-verified (`docs/qa/functional-audit-portal.md`); the notifications dropdown (PJP-111) was built as part of it. **Admin: still open** — 5 major (dead header Mail/Bell + search, hardcoded "AD/Admin" identity, **no success confirmation on any write action** — incl. the money-adjacent payment override); see the admin audit doc.

**9. Content moderation + reports** *(BE ✅ / Admin UI left)* — ✅ **backend done (2026-07-12):** `POST /api/admin/posts/:jobId/scan` (OpenAI omni-moderation + India scam-regex, degrades gracefully with no key, persists the flagged text) and a standalone reports queue `GET /api/admin/reports` + `PATCH /api/admin/reports/:id/resolve`. **Left:** the admin-console UI to consume both.

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
| 8 | Admin | Revenue card captioned "Indicative ₹500/subscription" — it's real money now |
| 9 | Admin | No success confirmation on any write (incl. payment override) |
| 10 | Admin | Dead header Mail/Bell buttons + dead dashboard search; hardcoded "AD/Admin" identity |
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
| **3** | **Admin: build + fix + docs** | **Build** the taxonomy management screen (the BE has 10 CRUD endpoints; there is *no* UI) + the admin-namespaced **monetization endpoints** (ours to build now) and their views. Fix the **Revenue-card lie**. Fix the 5 majors from `docs/qa/functional-audit-admin.md`. | `prosiddhi-admin` (+ BE) |
| **4** | **Mobile P0** | The **post-credit gate** (revenue leak), the broken `/forgot-password` route, the dead default API URL, the dropped search filters, and **delete the inert audio UI**. | `prosiddhi-mobile-app` |
| **5** | **Mobile — monetization** | Full **in-app Razorpay** (D2): plans screen → checkout → verify → credit wallet → invoices. *Verify store policy first.* | `prosiddhi-mobile-app` |
| **6+** | **Mobile — completion** | **i18n (EN/HI)** — then My Interviews, contact-recruiter gate, report-job, profile edit, Google OAuth, forgot/reset. | `prosiddhi-mobile-app` |

**Still unowned / not scheduled:** outbound notifications (MSG91 SMS/WhatsApp/email + FCM push), OpenAI content scan, reports queue.

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

**Until someone reconciles the board, treat this file as the truth.** The tickets that *are* genuinely still open map to §3 above: PJP-94 (content scan), PJP-102 (reports queue), PJP-96/97/98 (notification channels), PJP-111 (notifications dropdown), PJP-87 (staging/CI), the mobile stories, and the S3 hardening set.
