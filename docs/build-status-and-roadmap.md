# ProSiddhi — Build Status & Roadmap
**Speaking notes (for Nazir) · updated 2026-07-07 · verified against source in both repos**

> One-liner: *The backend and web portal are feature-complete, including the full **employer monetization** system —
> credits, Razorpay checkout, GST invoices, a paid **candidate database**, and team seats. The admin console is wired.
> Mobile hasn't started. Remaining before launch: outbound notifications (SMS/WhatsApp/email), the mobile app, two
> known seat gaps, and QA polish.*

> **⚡ What changed since 2026-06-15:** monetization went from *"not built"* to **shipped end-to-end** (Phases 1–3),
> the 3-level **category taxonomy** landed, **Google OAuth** landed, and **Postgres full-text search** was added for
> jobs and candidates. The old "payments are Phase 2 / ~70% of MVP" framing below is superseded — see §2 and §4.

---

## 1. What we're building (the product)
A **mobile-first, multilingual (English/Hindi) job portal** connecting unskilled/blue-collar workers with employers in India. Key ideas: **phone-OTP identity** (no Aadhaar), **in-app voice** (apply with a 2-min audio cover-letter, 60-sec voice chat), and a **subscription model** (employers pay; workers free). Three surfaces share one backend: **Web Portal** (seeker + employer), **Admin Console** (web-only), and a **Mobile app** (planned).

---

## 2. What's built RIGHT NOW

### Backend (`prosiddhi-backend`) — ~100% built
Every endpoint is real (auth, jobs, applications, saved jobs, chat, profiles, documents, skills, admin, dashboards). Runs locally; no external dependency.

### Web Portal (`prosiddhi-frontend`) — built + verified live end-to-end
~30 functional screens, all wired to the real backend (no mock data). Verified working this session:
- **Auth:** register (seeker + employer), email/password **and** phone-OTP login, forgot/reset password, role gating.
- **Seeker:** job feed (search / filters / Recommended / Near By), job details + Save, apply (+2-min audio), my applications + withdraw, contact-recruiter gated reveal, report a job, my interviews.
- **Employer:** dashboard (stats), post/edit/activate/deactivate/delete jobs, candidate management (accept + schedule interview / reject / bookmark).
- **Shared:** real-time-ish chat (polling + read receipts), profile management, EN↔HI language switch, offline handling.

### Admin Console (`prosiddhi-admin`) — fully wired, ~95% complete
6 modules, all hitting the real backend:
1. **Dashboard** — user/revenue stats, recent jobs, subscription breakdown.
2. **Job-seeker management** — approve / reject / verify / soft-delete / payment override.
3. **Employer management** — same set (business employers must be approved before they can post).
4. **Document verification** — approve / reject identity / GST / company docs.
5. **Post moderation** — warn / mark violation / activate / deactivate / delete jobs.
6. **Skills catalog** — full CRUD.

### Mobile app — **not started** (unowned; see risks)

---

## 3. The end-to-end flows (what actually works)

**Seeker journey:** register (phone-OTP → verify email → profile/sector/experience) → browse & search jobs → view details → save → **apply with voice** → track applications → reveal recruiter contact → report a bad listing → chat with the employer.

**Employer journey:** register (individual instantly / **business → admin approval**) → dashboard → **post a job** (live instantly) → receive applications → review candidates → **accept (schedule interview) / reject / bookmark** → chat with the seeker.

**Admin journey:** log in → review queue → **approve/reject** employers & seekers, **verify documents**, **moderate** reported/flagged jobs, manage the **skills catalog**.

**How they connect:** Admin approves employer → employer posts job (goes live, no per-job approval) → seeker applies → employer hires → moderation runs reactively (reports → admin warnings/removal).

---

## 3b. Employer monetization — SHIPPED (new since June)

The whole revenue system is live on BE **and** portal. Model: employers buy **credits** (seekers free forever) —
a **post credit** publishes a job (live 30 days), a **download credit** unlocks a candidate's contact (re-view free).

- **8 plans** (₹499 single-post pack → ₹21,999 Pro 12-month/3-seat), prices **base + 18% GST**.
- **Free trial:** 1 post + 3 unlocks, 14 days, once per employer (granted at account activation).
- **Razorpay checkout** + webhook + a client-side verify path (both share an atomic claim so they can't double-grant).
- **GST invoices** with `INV/YY-YY/NNNNNN` numbering, CGST+SGST vs IGST by place of supply, PDF download.
- **Paid candidate database** — Postgres full-text search, snippet-gated results (contact hidden), explicit
  "use 1 credit to unlock" confirm, unlocked-candidates history.
- **Gates + lifecycle** — post-credit spend on publish (402 at zero), delete-refund (≤24h & 0 applications),
  daily crons for the 30-day job window and the 3-day post-expiry grace.
- **Team seats** — roster, invite, accept, remove (🟡 see gaps below).

Also new: **3-level Category→Sector→JobTitle taxonomy** (seeded; powers registration, job posting, profile and the
job-feed filter), **Google OAuth** sign-in, and **Postgres FTS** search for jobs + candidates.

---

## 4. What still has to be done before launch

**Known gaps (monetization):**
1. **Seat cap reads the wrong plan** — with two active plans it takes the *latest-expiring* plan's seats instead of the
   *highest*. A 2-seat Pro plan can silently collapse to 1 seat. (Fix: aggregate `MAX(seats)`.)
2. **Seats are roster-only** — teammates each still have their own wallet, so a ₹11,999 / ₹21,999 multi-seat plan does
   **not yet deliver shared credits/jobs/unlocks.** Needs the 1:N membership + org-keyed subscriptions.

**Other pre-launch work:**
- **Outbound notifications** — push / SMS / WhatsApp / email via MSG91 (still in-app only).
- **QA fixes** from the functional audit (`docs/qa/functional-audit-portal.md`): fake header name + dead `/settings`
  link (both in `UserDropdown`), dead legal/footer links, and several hardcoded strings that never translate to Hindi.
- **Go-live config:** real Razorpay keys (test mode today) + a real webhook secret; Azkashine GSTIN on invoices.
- **Hardening:** automated smoke tests, error monitoring (Sentry), low-end-device performance pass.

## 5. What we plan to build in the future
- **Mobile app** — native seeker + employer apps (full parity with web). Still unowned.
- **More languages** — the 8 additional Indian languages beyond EN/HI.
- **v1.1 billing:** bulk/download top-up SKUs, promo codes, chargeback credit-revocation, admin manual credit
  grant/revoke, proration, auto-renewal (RBI e-mandate), paid "refresh/boost-to-top", TDS reconciliation.
- **Auto-moderation** — AI content scanning of job posts (today moderation is manual).

---

## 6. Backend asks — for Asrar

> **⚠️ UPDATED 2026-07-07 — most of the list below is DONE.** `BR-1` and `BR-3`…`BR-9` have all **shipped**
> (only **BR-2**, JWT in httpOnly cookie, is still open). Admin #6 (real revenue) also shipped. Treat the
> priority list beneath this banner as **historical**; the *current* asks are:
>
> **🔴 Do first — the seat gaps (a paid feature isn't delivering its value):**
> 1. **Seat cap reads the wrong plan.** `team.service.ts:63-74` takes the seats of the *latest-expiring* active
>    subscription instead of `MAX(seats)` across active plans — contradicts `pricing-rules.md`.
> 2. **Seats are roster-only.** `User↔Employer` is still 1:1 and `Subscription`/`PaymentHistory` are keyed by
>    `userId`, so teammates don't share the org's wallet/jobs/unlocks. Needs `EmployerUser` (1:N), org-keyed
>    subscriptions, and one `resolveEmployerContext()`. See decisions-tracker **§17 (S1–S4)**.
> 3. **Invite flow** must become one guided flow (token survives auth → auto-accept).
>
> **🟠 Next:** outbound notifications (MSG91 SMS/WhatsApp/email + FCM, PJP-96/97/98) · Admin #1 OpenAI scan (PJP-94)
> · Admin #2 reports queue (PJP-102) · Admin #3 WhatsApp warning · Admin #5 `pendingVerifications` stat.
>
> **🟡 Cleanup:** BR-2 · Admin #4 `AdminAuditLog` (descope candidate) · #7 chart type · #8 `/uploads/*` hardening
> · #9 missing `validateParams`.

Consolidated from `prosiddhi-frontend/docs/be-requests.md` (BR-1…9) and `prosiddhi-admin/.claude/BE-DEPENDENCIES.md` (#1…9). Ordered by priority.

**🔴 Do first (blocks a built feature / security):**
- **BR-4 — include `interview` in seeker reads** (`/applications/my`, `/:id`). Seeker "My Interviews" is built but shows nothing until this lands. *(Portal)*
- **BR-8 — stop leaking the password hash** on `GET /jobseekers|employers/profile` (add a `select`/`omit`). Confirmed live; security. *(Portal)*
- **Admin #1 — OpenAI content scan** `POST /admin/posts/:id/scan` (ticket PJP-94). Admin "Scan" ships disabled until then. *(Admin — Phase-2-ish)*

**🟠 Next (enables a feature / channel):**
- **BR-3 — categories endpoint** `GET /api/categories`. Unblocks real sector/title dropdowns **and** the job-feed Category filter (+ accept `?category=` on `/jobs`). *(Portal)*
- **Admin #2 — reports queue + resolve** `GET /admin/reports` + `PATCH /:id/resolve` (PJP-102). Today reports are read-only inside post detail. *(Admin)*
- **Admin #3 — WhatsApp warning send** (MSG91 `job_warning`, PJP-95/97). In-app warning works; outbound channel missing. *(Admin)*
- **Admin #5 — `pendingVerifications` stat** on `/admin/dashboard/stats` (the most actionable admin number). *(Admin)*

**🟡 Cleanup / hygiene (low risk):**
- **BR-1** persist seeker `dateOfBirth`+`gender` · **BR-2** JWT in httpOnly cookie · **BR-5** allow clearing `skillsRequired` on job edit · **BR-6** add `INACTIVE` to the `JobStatus` Zod enum · **BR-7** null-guard `email` in recruiter-contact · **BR-9** generic `PATCH /me/language` (employers can't persist language today). *(Portal)*
- **Admin #4** `AdminAuditLog` (PJP-99 — **descope candidate, needs your PM call**) · **#6** real revenue (waits on subscription module) · **#7** subscription-chart percentage type · **#8** `/uploads/*` download hardening · **#9** missing `validateParams` on the jobseeker payment route. *(Admin)*

> Full detail (contracts, workarounds) lives in those two source docs — point Asrar there per item.

## 7. Risks / decisions to raise
- **Mobile developer vacancy** — Dheeraj is off the project; mobile is unowned and not started. Biggest scope risk for the full vision.
- **Pricing confirmation** — the ₹999/month Option B is still provisional; needs sign-off (it also drives the Phase-2 payments build and the landing-page copy fix).
- **Timeline** — the **web** MVP is on track for the 2026-06-22 QA handover; payments/notifications/mobile are explicitly **out** of that date.

---
*Status legend: backend ~100% built · web portal end-to-end verified · admin ~95% wired · mobile 0%. Overall ≈ 70% of the full locked-scope MVP; remaining ~30% is the Phase-2 list above (mostly BE/procurement/mobile-gated).*
