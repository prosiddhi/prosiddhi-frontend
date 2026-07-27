# Technical Documentation — ProSiddhi
### For engineers & solution architects · how the system is built and integrated

> **Framing:** grounded in the documented architecture (STATUS.md / MONETIZATION.md). Items marked **[VERIFY IN CODE]** should be confirmed against the live repos before publishing externally, since this is the doc where inaccuracy is most costly. *(roadmap)* = planned.

---

## 1. System Architecture
**Takeaway:** Three clients, one backend, one database.

- **Portal** (`prosiddhi-frontend`) — seeker + employer web app · **Next.js (App Router) + TypeScript**.
- **Admin console** (`prosiddhi-admin`) — internal web app · **Next.js + TypeScript** · 10 pages / 55 API functions.
- **Mobile app** (`prosiddhi-mobile-app`) — seeker + employer · **Flutter / Dart** *(≈60% built)*.
- **Backend** (`prosiddhi-backend`) — **Express 5 + TypeScript + Prisma ORM + PostgreSQL**; feature-complete.
- **Shape:** Clients → REST API (`api.ts` client on web) → Express services → Prisma → PostgreSQL. External: Razorpay, MSG91, FCM, OpenAI.

*Designer/architect note: draw as a 3-client → API → DB diagram with external services hanging off the backend.*

---

## 2. Frontend
**Takeaway:** Two Next.js web apps + one Flutter app, all on one API contract.

- **Stack:** Next.js App Router, TypeScript, **react-i18next** (EN/HI).
- **API access:** always through the shared **`api.ts` client** (never raw `fetch`); Bearer-token interceptor; 401 → logout.
- **i18n:** English + Hindi complete, client provider + localStorage switch, JSON in-repo.
- **Auth on client:** JWT stored in `localStorage` *(migration to httpOnly cookie is roadmap/security)*.
- **Mobile:** Flutter, Riverpod/Material 3, EN/HI; free product done, monetization screens in progress. [VERIFY IN CODE]

---

## 3. Backend
**Takeaway:** Express 5 + Prisma, service-oriented, org-scoped.

- **Auth** — phone-OTP, email+password, Google OAuth; email verify; forgot/reset; soft-delete.
- **Core domains** — Jobs (CRUD, taxonomy, 30-day window, recommendations, saved, reports), Applications (apply, status workflow, interviews), Chat (polling, text-only, read receipts), Profiles (seeker/employer, documents, skills).
- **Org model** — `EmployerUser` membership (User ↔ Employer 1:N) is the **only authorization edge**; `resolveEmployerContext()` runs in every employer controller; Subscription/PaymentHistory keyed to `employerId`. [VERIFY IN CODE]
- **Search** — Postgres full-text (`tsvector` + trigram fallback) for jobs and candidates.
- **Safeguards** — rate limiting, webhook audit log, atomic credit spend, idempotent payment grant.

---

## 4. Data Model & Taxonomy
**Takeaway:** A validated 3-level job taxonomy anchors matching.

- **Taxonomy:** **Category → Sector → Job Title**, validated as a triple. Job Title is **global and M:N with Sector**; marked `PORTABLE` or `SECTOR_LOCKED`; soft-delete (one-way).
- **Credit ledger:** every purchase = a *lot* (kind, source, amount, expiry); spend draws soonest-expiring first; append-only audit table.
- **Key entities:** User, Employer, EmployerUser, Job, Application, Interview, Subscription, PaymentHistory, CreditLot/CreditTransaction, EmployerInvite, EmployerCandidateUnlock. [VERIFY IN CODE]

---

## 5. API & Integrations Catalog
**Takeaway:** REST endpoints; branch on machine-readable error `code`.

**Representative endpoints** (from MONETIZATION.md — [VERIFY IN CODE for the full list]):
- Plans — `GET /api/plans`
- Checkout — `POST /api/billing/checkout` · `POST /api/billing/verify-payment` · `POST /api/webhooks/razorpay`
- Credits/invoices — `GET /api/employers/me/credits` · `…/me/invoices` · `…/:id/pdf`
- Candidate DB — `GET /api/employers/search/workers` · `GET /api/employers/candidates/:id` · `POST …/unlock`
- Team — `GET /api/employers/me/team` · `…/entitlements` · `POST …/team/invite` · `GET /api/employers/team/invites/:token` · `POST …/accept-invite`
- Admin — `GET /api/admin/monetization/{payments,invoices,employers}` · `GET /api/admin/reports` · `POST /api/admin/posts/:jobId/scan`

**Error contract:** every error can carry a stable top-level `code` (UPPER_SNAKE_CASE) — **clients branch on `code`, never the message**. The nested `error` detail object is **dev-only**.

**Integrations:** Razorpay (payments), MSG91 (SMS/WhatsApp/email), FCM (push), OpenAI (content scan), Google OAuth. HRMS/Payroll/ATS/LinkedIn *(roadmap)*.

---

## 6. Auth & Security
**Takeaway:** Token-based, role-aware, payment-safe.

- **Identity:** phone OTP (only registration identity), + email/password + Google login.
- **Roles:** OWNER / MEMBER (employer org) · ADMIN (console).
- **Payments:** Razorpay HMAC webhook + client-verify share an atomic claim (no double-grant).
- **Hardening (roadmap):** JWT → httpOnly cookie; production OTP-leak fix; admin invoice-PDF route.
- **Never:** Aadhaar. **Always:** GST-compliant invoicing, audit logs.

---

## 7. Notifications
**Takeaway:** Channel adapters built; light up on config.

- **Channels:** MSG91 **SMS / WhatsApp / Email** + **FCM push**, fanned out from every notification producer; per-channel disable-able; idempotent + retry-safe.
- **State:** **no-op safely until configured** — in-app notifications always work; external channels record `SKIPPED` until keys/templates are set.
- **Config needed:** MSG91 auth + DLT/WhatsApp templates, FCM service account, device-token registration.

---

## 8. Deployment & Infrastructure
**Takeaway:** Hosted backend + web deploys.

- **Backend:** hosted at **`http://<host>:5000`** [TO CONFIRM host]; Prisma migrations (`prisma migrate` + `db push`).
- **Web:** Next.js builds for portal + admin. [VERIFY IN CODE: hosting target]
- **Mobile:** Flutter build; gate = `flutter analyze`.
- **CI/pre-commit:** `npm run type-check` must exit 0; `/code-review` + `/security-review` gates.

---

## 9. Environments & Config
**Takeaway:** External keys are optional-until-set; app degrades gracefully.

- **Required for go-live:** real **Razorpay** keys + webhook secret · Azkashine **GSTIN** · **MSG91** keys + DLT/WhatsApp templates · **FCM** service account · optional **OpenAI** key.
- All documented (as optional) in `prosiddhi-backend/.env.example`. [VERIFY IN CODE]

---

## 🎨 Designer Notes for Fayaz
- **Doc type:** technical reference — precise, diagram-heavy, low on marketing gloss.
- **Hero diagram (§1):** the **3-clients → API → DB** architecture diagram with external services (Razorpay, MSG91, FCM, OpenAI) as side boxes. This is the single most useful visual — make it clean and accurate.
- **A second diagram** for the taxonomy (Category → Sector → Job Title, M:N) and one for the credit-lot ledger flow.
- **API tables:** monospace font, grouped by domain; consistent method-colour coding (GET/POST).
- **Use code-style formatting** for endpoints, entities, env vars.
- **Keep [VERIFY IN CODE] markers visible** in the working copy; strip them only after engineering confirms.
