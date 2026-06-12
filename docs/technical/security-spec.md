# Security Specification — Job Portal v1

**Owner:** Nazir Hasan (FE + acting PM). **Sponsor:** Shaik Ishaq.
**Author date:** 2026-05-11. **Target:** QA handover **2026-06-22**.
**Anchors:** [02-scope-locked.md](../_context/02-scope-locked.md) (D2 + Q3 + module inventory) and the live BE code in `prosiddhi-backend/src/` (the authoritative "what is built today").

This is a project-specific security spec for the actual stack: **Express 5 + Prisma 6 + Zod 4 + JWT (HS256) + PBKDF2 + Multer + Winston** on the BE; Next.js 14 / React Native (Expo) on the clients. It is not a generic OWASP checklist — every line is tied to an existing file, an audit finding, or a locked decision.

---

## 1. Scope + non-scope

**In-scope (v1, must land by 2026-06-22):**
- Authentication baseline for web + mobile + BE.
- Authorization model (role + per-resource checks).
- Input validation across every endpoint (Zod).
- File upload allow-lists (profile pics, docs, audio).
- Secrets management (env, .gitignore, required-secret list).
- Logging policy (PII allow/deny list).
- Basic rate limiting on auth + upload endpoints.
- Razorpay webhook signature verification.
- WhatsApp template content rules (Meta-submitted templates only).
- Closing the four audit-found security gaps: `Math.random` OTP (bug c), `JWT_SECRET` default literal (bug d), forgot-password 404 enumeration leak, unauthenticated `POST /api/admin/create`.

**Non-scope (v2 or later):**
- Penetration testing engagement (Q4 2026 candidate).
- Formal security audit (SOC2 / ISO 27001 readiness).
- Bug bounty program.
- WAF in front of API (Nayan to decide hosting first; WAF vendor follows).
- Refresh token rotation (current 7-day JWT + re-login is accepted for v1).
- Multi-factor auth (not even for admin in v1).
- Advanced threat modelling (STRIDE / PASTA).
- Database-level encryption at rest beyond what the managed Postgres provider gives by default.

---

## 2. Authentication baseline

**JWT** (already implemented at [utils/jwt.ts](../../../job-portal-backend-azka/src/utils/jwt.ts)):
- Algorithm: **HS256**.
- Expiry: **7 days**. Refresh token rotation is out of scope; user re-logs in on expiry.
- Payload: `userId`, `role` (SEEKER / EMPLOYER / ADMIN), `iat`, `exp`.
- Secret: **`JWT_SECRET` env var, required at boot**. Per Asrar's response to audit bug d, the default literal `'your-secret-key'` must be removed; the process **must fail-fast** on startup if `JWT_SECRET` is unset or shorter than 32 chars. Add an assertion in [src/index.ts](../../../job-portal-backend-azka/src/index.ts) before route registration.

**Password hashing** (already implemented at [utils/crypto.ts](../../../job-portal-backend-azka/src/utils/crypto.ts)):
- PBKDF2, **310,000 rounds**, sha256, 32-byte key, 16-byte salt, salt-prefixed (`salt:hex`).
- Password policy (already in [validators/auth.validator.ts](../../../job-portal-backend-azka/src/validators/auth.validator.ts)): ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit. Keep as-is for v1.

**Phone OTP** (already implemented; tighten per below):
- 6 digits, 10-minute expiry, max 5 attempts per identifier.
- Generation: **`crypto.randomInt(0, 1000000)`** — must replace `Math.random()` in `generateOTP` (audit bug c). PBKDF2 / JWT are crypto-secure already; OTP must match.
- Delivery: **WhatsApp primary + SMS fallback** once Meta verification + DLT registration both clear. Until then, mock mode (OTP returned in response body) is acceptable for QA but **must be gated behind `NODE_ENV !== 'production'`**. Production builds must never return OTP in any response body.

**Email OTP** (already implemented):
- Same parameters as phone OTP. 30s resend cooldown.
- Composite key `(email, purpose)` — purposes are `FORGOT_PASSWORD`, `CHANGE_EMAIL`, `REGISTRATION`.
- Same mock-mode prod gate as phone OTP.

**No Aadhaar OTP.** Aadhaar is removed entirely per Q3/Q4 revoked 2026-05-09. The `aadhaar.controller.ts`, `aadhaar.service.ts`, `aadhaar.validator.ts`, `aadhaar.routes.ts`, `AadhaarVerification` Prisma model, and `User.aadhaarNumber` field all delete in S1 day 1.

**Soft-delete enforcement (NC-9, already wired):** `authenticate` middleware rejects any token whose User has `isDeleted = true`. This kills pre-deletion JWTs immediately. Login + forgot-password + reset-password all gate on the same flag. Keep this.

**Multi-factor auth:** out of scope for v1, including for admin. Document as v2 candidate.

---

## 3. Alternative login methods (Q3 revised 2026-05-09)

Three login methods, same options for both seeker and employer:

1. **Phone + OTP** — already built. Re-uses the same phone OTP service.
2. **Email + password** — partially built (registration sets password; login endpoint exists). Asrar to review and confirm parity with phone-OTP login behaviour (same JWT shape, same soft-delete gate, same emailVerified gate).
3. **Google OAuth** — net-new. Asrar's call on library (`passport-google-oauth20` or equivalent — must integrate cleanly with Express 5 + the existing `req.user` shape).

**Hard rule for Google OAuth:** the BE callback must verify Google's signed ID token server-side (Google's public keys + token signature + audience check). Do not trust the client-supplied email or profile JSON. The verified email becomes the canonical `User.email`; if no existing User matches, create one with the OAuth provider link recorded.

---

## 4. Authorization model

**Roles** (already in Prisma schema): `SEEKER`, `EMPLOYER` (sub-types Individual / Corporate carried on `Employer.employerType`), `ADMIN`.

**Middleware layer** (already at [middleware/auth.ts](../../../job-portal-backend-azka/src/middleware/auth.ts)):
- `authenticate` — extracts Bearer token, verifies JWT, loads User + role-specific profile, rejects soft-deleted users.
- `authorize(...roles)` — checks `req.user.role` ∈ allowed list.

**Per-resource checks** (must be present on every controller; spot-checked in audit, audit to verify on every endpoint):
- Seeker can only edit their own seeker profile, documents, skills, applications.
- Employer can only edit their own employer profile, jobs, candidate decisions.
- Admin can access verification queues, moderation queues, soft-delete actions, dashboard.
- Public job browse already filters out soft-deleted employers' jobs (NC-9).

**Bootstrap risk to close:** `POST /api/admin/create` is currently unauthenticated ([admin.routes.ts](../../../job-portal-backend-azka/src/routes/admin.routes.ts) — audit §1.8 #5). Acceptable for first-admin bootstrap in dev. Before staging, gate behind a setup token (env var `ADMIN_BOOTSTRAP_TOKEN`) or an email-allowlist env var. S3 hardening at the latest.

**Bug to close:** `updateApplicationStatusSchema` validator omits `BOOKMARKED` (audit §1.8 #7). Add BOOKMARKED to the enum so `PUT /:id/status` and `PUT /:id/bookmark` stay consistent.

---

## 5. Input validation

**Universal rule:** every endpoint uses a Zod schema via `validateBody` / `validateQuery` / `validateParams` from [middleware/validate.ts](../../../job-portal-backend-azka/src/middleware/validate.ts). No controller may access `req.body` / `req.query` / `req.params` without validation first. If a new endpoint needs raw access, it needs a schema.

**Forbidden-keys guard on profile PUT** (T1 #8, already wired in [validators/auth.validator.ts](../../../job-portal-backend-azka/src/validators/auth.validator.ts) + [controllers/jobseeker.controller.ts](../../../job-portal-backend-azka/src/controllers/jobseeker.controller.ts)): the seeker profile update rejects `email`, `phone`, `password`, `aadhaarNumber`. **Remove `aadhaarNumber` from the forbidden list** when the Aadhaar field itself is deleted (otherwise Zod will warn on an unknown key).

**File upload validation** (Multer at [config/multer.ts](../../../job-portal-backend-azka/src/config/multer.ts) — allow-lists, not deny-lists):

| Upload type | MIME allow-list | Max size | Max count |
|---|---|---|---|
| Profile picture | image/jpeg, image/png, image/gif, image/webp | 5 MB | 1 |
| Seeker document | application/pdf, image/jpeg, image/png | 5 MB | 1 per call |
| Employer document | application/pdf, image/jpeg, image/png, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document | 5 MB | 10 total per employer |
| Audio (chat) | audio/webm, audio/mp4, audio/m4a, audio/opus | enforce **60s duration FE-side** + verify duration BE-side via probe (or trust FE for v1 and audit later) | 1 |
| Audio (apply) | same as chat | **2-min duration cap** per Q10 revised 2026-05-09 | 1 |

Audio duration: FE enforces at record time, BE re-verifies on receipt using ffprobe or a similar lightweight check. If duration check isn't possible by code freeze, FE-enforced cap is acceptable for v1; flag for hardening.

---

## 6. OWASP Top 10 v1 mitigations (project-specific, not generic)

**A01 Broken Access Control** — per-resource checks above (§4); soft-delete middleware enforcement (NC-9); admin-only routes guarded by `authorize('ADMIN')`.

**A02 Cryptographic Failures** — fix audit bug c: replace `Math.random()` in `generateOTP` with `crypto.randomInt`. JWT + PBKDF2 already use secure crypto. TLS termination is Nayan's call (hosting decision).

**A03 Injection** — Prisma 6 is parameterized by default; no raw SQL anywhere in the BE today. **Policy:** raw SQL via `$queryRaw` / `$executeRaw` is prohibited without an explicit security review note in the PR. Audit any new use.

**A04 Insecure Design** — [02-scope-locked.md](../_context/02-scope-locked.md) is the design contract. PRs that introduce features not in the locked scope (Aadhaar, escrow, WebSockets, voice transcription, .ics invites) are scope drift and get rejected at review.

**A05 Security Misconfiguration** — fix audit bug d: `JWT_SECRET` default literal removed; boot assertion added. `.env` files never committed (verify `.gitignore`). Production deploys must not use the example secrets in `.env.example`.

**A06 Vulnerable Components** — `npm audit` in CI (Nayan to wire the pipeline). Dependency update cadence: **monthly**, with security advisories triaged within 7 days.

**A07 Identification & Authentication Failures** — fix forgot-password 404 enumeration leak ([auth.controller.ts:22-23](../../../job-portal-backend-azka/src/controllers/auth.controller.ts) — audit §1.8 #4): return a generic 200 always, mirroring how `resend-verification` already behaves. Rate-limit OTP endpoints (§9 below). CAPTCHA on login after N failures is a v2 enhancement.

**A08 Software & Data Integrity Failures** — signed Razorpay webhooks (§10 below). Subresource Integrity (SRI) attributes on any third-party `<script>` tag the FE loads (none today, but document the rule). Lockfiles (`package-lock.json` / `pnpm-lock.yaml`) committed.

**A09 Security Logging & Monitoring Failures** — Winston logs with PII scrubbed (§8 below). Never log JWT tokens, passwords, OTPs, or any Aadhaar number (moot since Aadhaar gone, but keep the rule for general defence-in-depth on any 12-digit-looking field).

**A10 SSRF** — not a major surface. The BE doesn't fetch user-supplied URLs server-side except in the Google OAuth callback (which uses Google's signed, well-known endpoints). No URL-fetching feature today; if one is added, validate against an allow-list of hosts.

---

## 7. Secrets management

**All secrets via env vars.** `.env.example` is committed; `.env` is gitignored. Verify `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` before any new env var lands.

**Required env vars (v1):**
- `JWT_SECRET` — ≥32 chars, fail-fast at boot if missing.
- `DATABASE_URL` — Postgres connection string.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — subscription module.
- `RAZORPAY_WEBHOOK_SECRET` — webhook HMAC verification.
- `MSG91_AUTH_KEY` — SMS sender (DLT-registered templates).
- `MSG91_WHATSAPP_AUTH_KEY` — WhatsApp BSP (separate from SMS auth per MSG91 dashboard structure).
- `SENDGRID_API_KEY` (or equivalent — Asrar to confirm) — transactional email sender.
- `OPENAI_API_KEY` — `omni-moderation-latest` for content scan (Q8).
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — Google OAuth login.
- `FCM_SERVER_KEY` — push notifications.
- `NODE_ENV` — used to gate mock-mode OTP response.
- `BASE_URL` — public URL for file URLs.

**Production secrets:** never committed; injected via the host's secret store (managed by Nayan — Nayan owns secret rotation policy, scheduled to be defined in v2).

---

## 8. Logging policy

**Stack:** Winston (already at [config/logger.ts](../../../job-portal-backend-azka/src/config/logger.ts)) — console + `logs/error.log` + `logs/combined.log` + exception/rejection handlers. Request-logger middleware logs every HTTP request with duration + statusCode (4xx/5xx escalate to warn).

**DO log:**
- Request method, path, duration, statusCode, authenticated `userId` (when present).
- BE errors (with stack in non-production; sanitised in production).
- Business events: registration, login, apply, accept, reject, payment-succeeded, payment-failed, document-uploaded, admin-action.
- Webhook attempts (success + failure — see §10).

**DO NOT log:**
- Passwords (plaintext or hashed).
- JWT tokens (full or truncated — do not log even the first 10 chars; pattern matchers can still reverse).
- OTP values in production (mock-mode logs are OK locally and in dev — production logs must scrub).
- Full payment card details (Razorpay handles card data; we never see it, so this is a guardrail, not a current risk).
- Session cookies if added in v2.
- Anything that looks like a 12-digit Aadhaar number (defence-in-depth despite Aadhaar field removal).

---

## 9. Rate limiting (basic v1, tune post-launch)

Library: **`express-rate-limit`** by default — well-known, lightweight, plays cleanly with Express 5. Asrar to confirm or propose `rate-limiter-flexible` if Redis-backed limits matter post-launch.

| Endpoint group | Limit | Window | Identifier |
|---|---|---|---|
| `POST /api/otp/send` + `/resend` | 5 | 10 min | phoneNumber |
| `POST /api/email-otp/send` + `/resend` | 5 | 10 min | email |
| `POST /api/auth/forgot-password` | 5 | 10 min | email |
| All `*/login` endpoints (seeker, employer, admin) | 10 | 5 min | IP |
| All `*/me/documents` + `*/profile-photo` upload endpoints | 20 | 1 hour | userId |
| Webhook endpoint (Razorpay) | no rate limit (signature is the auth) | — | — |

Per-endpoint identifier matters: rate-limiting OTP per-IP is wrong (NAT'd users collide); rate-limiting login per-userId is wrong (attacker rotates accounts). Default to the strictest meaningful identifier.

---

## 10. Razorpay webhook security

**Endpoint:** `POST /api/webhooks/razorpay` (to be created in subscription module).

**Verification:**
1. Read raw request body **before any JSON parsing**.
2. Compute `HMAC SHA256` of raw body using `RAZORPAY_WEBHOOK_SECRET`.
3. Compare against `X-Razorpay-Signature` header using a constant-time comparison (`crypto.timingSafeEqual`).
4. Reject with **401** if signature missing or invalid. Do not process.
5. Log every webhook attempt (success + failure) with event ID + status; failures get warn-level.

**Idempotency:** Razorpay can retry webhooks. Subscription module must dedupe on Razorpay's event ID before applying state changes.

---

## 11. WhatsApp template content security

Templates are pre-registered with Meta; message bodies are built at send time by substituting template variables. Rules:

- Templates submitted to Meta must **not** contain Aadhaar numbers (moot — Aadhaar gone), full passwords, payment card details, or any PII beyond the seeker's first name and contextual job/employer reference.
- OTP template body: include the 6-digit code and a static "valid for 10 minutes" string. Do not include user phone, email, or other identifying data beyond first name.
- Recruiter-to-seeker templates: variables substituted server-side from validated data (job title, employer display name) — **never concatenate raw seeker input** (e.g., free-text employer message) into the message body without sanitisation. If WhatsApp allows free-text in a template variable, strip control chars + limit to 200 chars before substitution.
- Templates submitted but pending Meta approval do not block the SMS fallback path — keep SMS wired throughout.

---

## 12. Open items — NOT v1, v2+ candidates

- **Penetration test** — recommend Q4 2026 once user volume justifies the spend (~₹1–2L).
- **SOC2 readiness audit** — only if enterprise B2B sales becomes a priority.
- **Bug bounty program** — not until v2 user base.
- **WAF in front of API** — Nayan picks hosting first; WAF choice follows.
- **Refresh token rotation** — replace 7-day JWT-re-login model.
- **Multi-factor auth for admin** — TOTP via authenticator app; gates admin login.
- **Account lockout / CAPTCHA on repeated login failures** — beyond rate limiting.
- **Audit log table** — append-only record of admin actions, for post-incident forensics.
- **Encryption at rest beyond managed Postgres default** — column-level encryption for any future sensitive field.
- **DPDP Act 2023 readiness review** — data export + delete-on-request endpoints already exist in soft-delete + admin tooling, but a privacy-policy and consent-log update is owed.

---

## 13. S1 day-one security action list (handoff)

**For Asrar (BE):**
1. Delete all Aadhaar code paths (model, validator, controller, service, routes, schema field). 1 dev-day.
2. Replace `Math.random()` in `generateOTP` with `crypto.randomInt` (bug c).
3. Add boot-time assertion that `JWT_SECRET` is set and ≥32 chars (bug d).
4. Change `forgotPassword` to return a generic 200 always (mirror `resend-verification`).
5. Gate OTP-in-response behind `NODE_ENV !== 'production'`.
6. Add `BOOKMARKED` to `updateApplicationStatusSchema` enum.
7. Decide whether `POST /api/admin/create` gets a setup token now or in S3.

**For Nayan (infra):**
1. Hosting + region decision (drives WAF and TLS choices).
2. Production secret store setup + injection mechanism.
3. CI wiring for `npm audit` + dependency advisory triage.
4. `.env` files confirmed not committed; `.env.example` reviewed against the required list in §7.

**For Nazir (FE + PM):**
1. Confirm FE doesn't store plaintext passwords in localStorage (audit §2.4 noted one on the employer register flow — must be deleted).
2. Confirm `Authorization: Bearer <token>` interceptor lands in `apps/web/src/lib/api.ts` before any protected-route work begins.
3. Ensure registration screens never include an Aadhaar input field.

---

## 14. Source of authority

If anything here conflicts with [02-scope-locked.md](../_context/02-scope-locked.md), scope-locked wins and this file gets updated. If anything here conflicts with the BE code (`prosiddhi-backend/src/`), the BE code wins for "what is built today" and this file gets updated; this file wins for "what we are committing to build."
