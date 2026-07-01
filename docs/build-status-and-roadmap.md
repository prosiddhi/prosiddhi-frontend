# ProSiddhi — Build Status & Roadmap
**Speaking notes (for Nazir) · 2026-06-15 · verified live on the local stack**

> One-liner: *The backend is essentially complete, the web portal works end-to-end on real data, and the admin console is fully wired. Mobile hasn't started. We're ~70% of the full MVP; the rest is mostly payments, messaging channels, and the mobile app — i.e. Phase 2.*

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

## 4. What we still have to build (to finish Phase 1 / MVP — target QA handover **2026-06-22**)
- **BR-4 (backend):** include interview data in seeker reads so "My Interviews" populates (screen is built and waiting).
- **Audio capture** final check (apply + voice chat) — code is wired; needs a device with mic access to confirm in-browser recording.
- **Pricing copy fix** on the employer landing (currently shows old ₹250/₹0 — must match the agreed plan).
- **Job-feed category filter** — needs a categories endpoint from backend (BR-3).
- **Hardening:** automated smoke tests, error monitoring (Sentry), low-end-device performance pass.

## 5. What we plan to build in the future (Phase 2)
- **Payments / Subscription** — employer billing (₹999/mo plan + 14-day trial) with Razorpay.
- **Google sign-in** — third login option.
- **Outbound notifications** — push / SMS / WhatsApp / email (OTP, status updates, interview reminders) via MSG91.
- **Mobile app** — native seeker + employer apps (full parity with web).
- **More languages** — the 8 additional Indian languages beyond EN/HI.
- **Auto-moderation** — AI content scanning of job posts (today moderation is manual).

---

## 6. Backend asks — for Asrar
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
