# ProSiddhi — Status

**The single source of truth for what is done and what is left.** Updated **2026-07-12**.
Verified by reading the code in all three repos — **not** from tickets. Where this doc and JIRA disagree, **this doc is right** (see §6).

Other docs: [PRODUCT.md](PRODUCT.md) (what we're building) · [MONETIZATION.md](MONETIZATION.md) (pricing rules + billing) · [DEPLOY.md](DEPLOY.md) (deploy + go-live) · [qa/functional-audit-portal.md](qa/functional-audit-portal.md) (portal defect list) · `prosiddhi-admin/docs/qa/functional-audit-admin.md` (admin defect list).

---

## 1. Where we stand — one line per surface

| Surface | Repo | State |
|---|---|---|
| **Backend** | `prosiddhi-backend` | ✅ **Feature-complete.** Everything the web apps need is live, incl. the full billing system. |
| **Portal** (seeker + employer) | `prosiddhi-frontend` | ✅ **Feature-complete.** All flows wired to real data. Needs a QA-defect pass. |
| **Admin console** | `prosiddhi-admin` | 🟡 **Wired, but two whole screens are missing** (taxonomy, monetization). No mock data, no blockers. |
| **Mobile app** | `prosiddhi-mobile-app` | ❌ **Not started.** Unowned. |

**Bottom line:** the web product is built end-to-end, **including employer monetization** (credits, Razorpay, GST invoices, paid candidate database, team seats). What remains is: **two seat bugs**, **outbound notifications**, **two missing admin screens**, a **QA-defect pass**, and **go-live config**.

---

## 2. What is DONE

### Backend
- **Auth** — phone-OTP, email+password, **Google OAuth**; email verification; forgot/reset password; soft-delete.
- **Jobs** — CRUD, **3-level taxonomy** validation, 30-day live window, recommendations, saved jobs, reports.
- **Applications** — apply with 2-min audio, status workflow, interviews.
- **Chat** — polling, text + 60-sec audio, read receipts.
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

**1. Two seat bugs — a paid feature isn't delivering what customers pay for** *(BE)*
- **Seat cap reads the wrong plan.** With two active plans it takes the *latest-expiring* plan's seats instead of the **highest**. A 2-seat Pro plan can silently collapse to 1 seat. (`team.service.ts:63-74` — fix: `seatCap = MAX(seats)` across active plans.)
- **Seats are roster-only.** `User↔Employer` is still **1:1** and subscriptions are keyed by `userId`, so **each teammate has their own wallet** — a ₹11,999 / ₹21,999 multi-seat plan delivers **no shared credits, jobs or unlocks**. Needs `EmployerUser` (1:N), org-keyed subscriptions, one `resolveEmployerContext()`.
- **Invite flow** must become one guided flow (invite token survives login/registration → auto-accept). Today the invitee must click the link **twice**.
→ Full spec in [MONETIZATION.md](MONETIZATION.md) §6.

**2. Portal — 2 critical defects** *(FE)*
- Fake hardcoded name **"Sanjay RK"** shows in the header on **every** logged-in screen.
- Dead **"Settings"** link → 404 from the account menu on every screen.
- *Both are in one file (`UserDropdown.tsx`) — one fix clears both.*

**3. Admin — the Revenue card lies** *(Admin)*
Caption still reads *"Indicative (₹500/subscription)"* but the backend now returns **real money** from `PaymentHistory`. Fix the caption and consume the `monthlyRevenue` series the API already returns.

**4. Go-live config** *(Infra / PM)*
Real **Razorpay** keys + a real webhook secret (test mode + a `local-dev-*` placeholder today) · **Azkashine GSTIN** on invoices · **MSG91 DLT** registration (SMS) · Meta **WhatsApp** template approval.

### 🟠 P1 — needed for a complete product

**5. Outbound notifications** *(BE)* — everything is **in-app only** today. Needs MSG91 **SMS + WhatsApp + email** and **FCM push**, plus the notifications dropdown in the portal.

**6. Admin — two missing screens** *(Admin)*
- **Taxonomy management** — the backend has **10 admin CRUD endpoints** for Category/Sector/JobTitle and the console has **no page, no nav item, not one API call**. Nobody can manage the taxonomy.
- **Monetization views** — no payments / invoices / credits / plans / team-seat surface at all. (Some of this also needs new admin-namespaced BE endpoints.)

**7. QA defect pass** — portal: 10 major (dead legal/footer links, several strings that never translate to Hindi, dead Mail/Bell + hero CTA). Admin: 5 major (dead header Mail/Bell + search, hardcoded "AD/Admin" identity, **no success confirmation on any write action** — including the money-adjacent payment override). Full lists in the two audit docs.

**8. Content moderation + reports** *(BE + Admin)* — OpenAI "Scan Content" (button is honestly disabled today) and a standalone reports queue + resolve. Neither exists on either side.

### 🟡 P2 — after launch

**9. Mobile app** — 0%, unowned. Biggest scope risk to the full vision.
**10. Hardening** — Sentry, Playwright smoke tests, low-end-device performance pass.
**11. The other 8 languages** (EN + HI are done).
**12. Security** — move the JWT from `localStorage` to an httpOnly cookie.
**13. v1.1 billing** — bulk/download top-up SKUs, promo codes, chargeback credit-revocation, admin manual credit grant/revoke, auto-renewal.

---

## 4. Known bugs (quick list)

| # | Where | Bug |
|---|---|---|
| 1 | BE | Seat cap takes the latest-expiring plan's seats, not the highest |
| 2 | BE | Seats are roster-only — teammates don't share the org wallet/jobs/unlocks |
| 3 | Portal | Fake "Sanjay RK" name in the header on every authed page |
| 4 | Portal | Dead `/settings` link → 404 |
| 5 | Portal | Dead Privacy / Terms / Contact footer links |
| 6 | Portal | Status pills, salary/date formatters and the Google-login path never translate to Hindi |
| 7 | Admin | Revenue card captioned "Indicative ₹500/subscription" — it's real money now |
| 8 | Admin | No success confirmation on any write (incl. payment override) |
| 9 | Admin | Dead header Mail/Bell buttons + dead dashboard search; hardcoded "AD/Admin" identity |

---

## 5. Who owns what

- **Nazir** — portal (FE) + acting PM
- **Asrar** — backend
- **Mobile** — **unowned** (vacancy)
- **Najeeb / Farhana** — QA
- **Nayan** — infra
- **Shaik** — owner / product decisions (pricing signed off)

---

## 6. ⚠️ JIRA is stale — don't trust it

JIRA shows **79 open tickets**, but many are **done in code** — the whole monetization set (**PJP-162…175, 180**), **PJP-110** (subscription UI), **PJP-72** (Google OAuth), **PJP-75/76**. The board was never updated when monetization shipped.

**Until someone reconciles the board, treat this file as the truth.** The tickets that *are* genuinely still open map to §3 above: PJP-94 (content scan), PJP-102 (reports queue), PJP-96/97/98 (notification channels), PJP-111 (notifications dropdown), PJP-87 (staging/CI), the mobile stories, and the S3 hardening set.
