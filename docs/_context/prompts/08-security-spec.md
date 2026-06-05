# Prompt 8 — Security Specification

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

This produces the v1 security spec anchored in our actual auth stack (JWT + PBKDF2 + Zod). Not a generic OWASP checklist — project-specific.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md (esp. D2 BE stack + Q3
   auth model + BE module inventory)
4. docs/_context/03-codebase-audit.md (esp. §1.6 inline
   decision tags + auth findings + bug list)
5. docs/managerial/02-be-sync-agenda.md (esp. bugs section c,
   d for crypto + secrets concerns)

Your single task: produce a project-specific security
specification covering auth, authorization, input validation,
file uploads, secrets, logging, and rate-limiting for the
v1 build.

==== OUTPUT ====

CREATE docs/technical/security-spec.md (~250 lines).

Structure:

1. **Scope + non-scope**
   - In-scope: v1 web + mobile + BE security baseline; QA
     handover by 2026-06-15.
   - Non-scope: penetration testing (v2), formal security
     audit (v2), SOC2/ISO compliance (v2+), advanced threat
     modelling.

2. **Authentication baseline**
   - JWT HS256, 7-day expiry (per current BE config).
   - JWT_SECRET must be set via env (fail-fast at boot if
     unset — per Asrar's response to audit bug d).
   - Password hashing: PBKDF2, 310k rounds, sha256, 32-byte
     key, salt-prefixed (current BE setting).
   - Phone OTP: 6 digits, 10-min expiry, max 5 attempts.
     OTP delivered via WhatsApp primary + SMS fallback once
     Meta verification approved; mock mode (returned in
     response) until then.
   - Email OTP: same parameters as phone OTP.
   - **NO Aadhaar OTP** — Aadhaar removed entirely per Q4
     revoked 2026-05-09.
   - Refresh token strategy: out of scope for v1 (7-day
     JWT is acceptable; re-login on expiry).
   - Multi-factor auth: out of scope for v1.
   - Soft-delete: per NC-9, deleted users cannot login;
     auth middleware must reject `isDeleted=true` (BE
     already implements this).

3. **Alternative login methods (per Q3 revised 2026-05-09)**
   - Email + password login wired for both seeker and
     employer after registration.
   - Google OAuth login wired for both seeker and employer.
     OAuth callback must verify Google's signed token
     server-side; do not trust client-supplied email
     without verification.

4. **Authorization model**
   - Roles: SEEKER, EMPLOYER (Individual / Corporate),
     ADMIN. JWT payload carries role.
   - Middleware-level checks: `authenticate` (req.user
     exists), `authorize(roles)` per route.
   - Per-resource checks: seeker can only edit own
     profile; employer can only edit own jobs; admin can
     access verification queues.
   - Soft-deleted-employer filter on public job browse
     (NC-9, already wired).

5. **Input validation**
   - Every endpoint uses a Zod schema. No raw req.body
     access without validation.
   - Forbidden-keys guard on profile PUT (already wired —
     email/phone/password/aadhaarNumber rejected; remove
     aadhaarNumber from this list since the field is being
     deleted).
   - File upload validation: Multer with allow-lists:
     - Profile pics: image/jpeg, png, gif, webp; ≤5MB
     - Seeker docs: pdf, jpg, png; ≤5MB
     - Employer docs: pdf, jpg, png, doc, docx; ≤5MB
     - Audio: webm, mp4, m4a, opus; ≤2 min duration
       (enforce on FE + verify on BE)

6. **OWASP Top 10 v1 mitigations (project-specific)**
   - A01 Broken Access Control → per-resource checks
     above; soft-delete enforcement
   - A02 Cryptographic Failures → fix audit bug c
     (`Math.random()` → `crypto.randomInt` for OTP
     generation)
   - A03 Injection → Prisma is parameterized; no raw SQL
     anywhere. Document this and prohibit raw SQL.
   - A04 Insecure Design → scope-locked.md is the design
     contract; PRs that deviate trigger scope-drift-checker
     (sub-agent from Stage 3).
   - A05 Security Misconfiguration → fix audit bug d
     (JWT_SECRET default literal). Pre-flight boot check.
   - A06 Vulnerable Components → npm audit in CI; document
     dependency update cadence (monthly).
   - A07 Identification & Authentication Failures → fix
     forgot-password 404 enumeration leak; rate-limit OTP
     endpoints; CAPTCHA on login after N failures (v2).
   - A08 Software & Data Integrity → SRI on third-party
     scripts; signed Razorpay webhooks; verify webhook
     signatures before processing.
   - A09 Logging & Monitoring → Winston logs with PII
     scrubbed; never log JWT tokens, passwords, OTPs, or
     full Aadhaar numbers. Document a PII-allowlist.
   - A10 SSRF → not a major surface (no user-supplied
     URLs fetched server-side except for Google OAuth
     callback, which uses Google's signed URLs).

7. **Secrets management**
   - All secrets via env vars (.env files). .env.example
     committed; .env never committed (verify .gitignore).
   - Required secrets list: JWT_SECRET, DATABASE_URL,
     RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
     MSG91_AUTH_KEY, MSG91_WHATSAPP_AUTH_KEY (separate from
     SMS), SENDGRID_API_KEY (or alt), OPENAI_API_KEY,
     GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
     FCM_SERVER_KEY.
   - Production secrets in environment (not in repo).
     Nayan owns secret rotation policy (v2).

8. **Logging policy**
   - Use existing Winston setup (console + logs/error.log
     + logs/combined.log).
   - DO log: request method/path/duration/statusCode/
     userId-if-authenticated, BE errors, business events
     (apply, accept, reject, payment-succeeded,
     payment-failed).
   - DO NOT log: passwords, JWT tokens, OTP values (mock
     mode logs are OK locally; prod logs must scrub),
     full payment card details (Razorpay handles), session
     IDs.

9. **Rate limiting (basic v1, enhanced v2)**
   - OTP endpoints (send/verify): 5 attempts per identifier
     per 10 min, per BE current limits.
   - Login endpoints: 10 attempts per IP per 5 min
     (recommend express-rate-limit by default; consider
     rate-limiter-flexible if Redis-backed limits needed.
     BE stack is Express 5 per D2 — do NOT suggest Fastify
     middleware. Asrar to confirm choice.)
   - File upload endpoints: 20 uploads per user per hour
     (defaults; tune post-launch).

10. **Razorpay webhook security**
    - Webhook endpoint requires Razorpay signature
      verification (HMAC SHA256 with RAZORPAY_WEBHOOK_SECRET).
    - Reject any webhook with invalid signature.
    - Log all webhook attempts (success + failure).

11. **WhatsApp template content security**
    - Templates submitted to Meta must NOT contain
      sensitive data (no full Aadhaar — moot since Aadhaar
      gone; no password reset codes longer than 6 digits;
      no PII beyond first name).
    - WhatsApp message bodies built at send time via
      template variables — never concatenate user input
      into the message body without sanitisation.

12. **Open items (NOT v1 — v2 candidates)**
    - Penetration test (cost ~₹1-2L; recommended Q4)
    - SOC2 readiness audit
    - Bug bounty program
    - WAF in front of API (Cloudflare or AWS WAF)
    - Refresh token rotation
    - Multi-factor auth for admin role

==== CONSTRAINTS ====

- Do NOT mention Aadhaar except in the "removed" context
  (Q3/Q4 revoked).
- Do NOT mention WebSockets, voice transcription, or .ics
  invites — scrubbed entirely.
- Do NOT suggest libraries that conflict with the BE stack
  (Express + Prisma + Zod). All recommendations must match.
- Do NOT prescribe AWS WAF or Cloudflare specifically — Nayan
  (infra) decides hosting and WAF.
- ~250 lines.
- After saving, report 3-line chat summary:
  - File path
  - Top 3 items that require Asrar's confirmation in S1 day 1
    (bug fixes c, d, and others)
  - Top 1 item that requires Nayan's input (secrets +
    hosting setup)

Today's date: use real current date. User: Nazir Hasan.
Owner: Shaik Ishaq.
```

---

## After this session

Send the security spec to Asrar (so he plans audit bug fixes c + d into S1) and Nayan (so he plans secrets + WAF + hosting decisions).
