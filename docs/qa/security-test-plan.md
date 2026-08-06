# Security Test Plan & Pen-Test Scope — ProSiddhi
**Owner: QA Lead (+ external pen-tester recommended for payments/PII).** Fed by the `SYS-ABUSE-*` + all `Security`-type cases. This surface handles **auth, payments, and personal data** — treat findings as launch-blocking by default.

---

## 1. Objectives
Confirm no attacker can: steal or double-spend credits, access another org's data (IDOR), bypass auth/roles, forge payments, harvest PII, or take down the service cheaply. Verify the deliberately-secured seams actually hold.

## 2. Scope
**In:** all 4 surfaces + the API. Auth/OTP, employer org isolation, candidate-DB PII, payments (Razorpay HMAC + verify), team invites (token as credential), admin/SUPER_ADMIN privilege boundaries, rate-limiting, input handling, transport security.
**Out:** third-party infra internals (Razorpay, Google, MSG91), DoS volumetric testing beyond rate-limit checks, social engineering.

## 3. Methodology
OWASP ASVS / Top 10 aligned, black-box + grey-box (with test accounts across roles). Manual + assisted (Burp/ZAP). **A scoped external pen-test is recommended for the payments + PII paths** before go-live.

## 4. Test areas (mapped to cases)
| Area | Cases | Focus |
|---|---|---|
| **AuthN / session** | WEB-SEEK-AUTH-005/006/017, API-AUTH-002/007, SYS-ABUSE-004/008 | OTP brute-force + **leak (dev-mode)**, enumeration (timing + oracle), token expiry/replay, forced logout |
| **AuthZ / IDOR** | WEB-EMP-CAND-007/INV-003/JOB-010, API-CROSS-003..005, SYS-ABUSE-006 | Cross-org read/write, role isolation, SUPER_ADMIN boundary, admin-token on employer routes |
| **Payments** | API-BILL-003..005, SYS-IDEM-001/002 | HMAC forgery/flood, amount/plan tampering, replay → no double-grant |
| **Credits / abuse** | SYS-ABUSE-001..003, WEB-EMP-JOB-008 | Trial farming, unlock-and-scrape, post-harvest-delete refund abuse |
| **PII / data** | WEB-EMP-CAND-008, MOB-CAND-001, SYS-DATA-013 | Search never returns contact, DPDP erasure, no PII in logs/storage |
| **Team invite** | MOB-TEAM-003/007, API-TEAM-006/007 | Token as credential (secure storage, never logged), single-use/expiry/email-bind, consent-gated accept |
| **Input** | WEB-*-XSS, API-CROSS-010/013, SYS-ABUSE-009 | XSS (stored/reflected), SQL/NoSQL injection, mass-assignment / strict bodies |
| **Rate-limit** | API-AUTH-003, ADM-MOD-007, SYS-ABUSE-005/010 | OTP/login/scan/invite throttles, header-spoof bypass |
| **Transport** | WEB-SEC-004, API-CROSS-014, MOB-SEC-004 | **HTTPS/TLS** (currently HTTP), mixed content, cleartext on device |
| **Config** | ALL | `NODE_ENV=production` (no dev error/OTP leak), secrets not exposed, security headers/CSP |

## 5. Known items to verify/close (already surfaced)
- 🔴 **OTP leak + account-enumeration** (`otp/send`, register) — must be closed in prod.
- 🔴 **No HTTPS** — everything plaintext today.
- ⚠️ **JWT in localStorage** (XSS blast radius) — `SYS-GAP-003`.
- Validation errors leaking / missing detail in prod (contract consistency).

## 6. Tooling
Burp Suite / OWASP ZAP · manual IDOR/replay via Postman · `prosiddhi-backend/scripts/verify-error-codes.ts` for the error-code contract · secure-storage inspection on device.

## 7. Reporting & severity
Findings rated CVSS-style Critical/High/Medium/Low. **Critical/High block go-live.** Each with repro, impact, and remediation. Re-test after fix + `/security-review`.

## 8. Entry / Exit
- **Entry:** prod-config env (HTTPS + `production` mode), role test accounts, scope signed off.
- **Exit:** no open Critical/High; payment + PII + IDOR paths clean; external pen-test report (if engaged) accepted; config hardening verified.
