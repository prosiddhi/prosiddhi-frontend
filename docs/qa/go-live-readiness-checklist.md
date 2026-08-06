# Go-Live Readiness Checklist — ProSiddhi
**The single sign-off gate before launch.** Every item must be ✅ (or an explicit, signed-off accepted-risk). Consolidates the gaps surfaced during testing + config review.

Legend: ☐ open · ✅ done · ⚠️ accepted risk (needs Product sign-off)

---

## 1. Environment & Infrastructure
- ☐ **HTTPS/TLS** on `prosiddhi.com` (cert, HTTP→HTTPS redirect) — *currently HTTP only*
- ☐ Frontends repointed to `https://prosiddhi.com/api` (no mixed content) — *currently the HTTP IP*
- ☐ Backend **`NODE_ENV=production`** — *currently `development` (leaks dev error detail + OTPs)*
- ☐ Backend CORS/allowed-origins set to the production domain
- ☐ Reverse proxy hardened; `/health` reachable; rate-limits active
- ☐ Backups + monitoring (Sentry/uptime) in place

## 2. Integrations & Config (external, some with lead time)
- ☐ **Razorpay** live keys + real webhook secret (replace test mode)
- ☐ **Azkashine GSTIN** on invoices
- ☐ **MSG91** auth + **DLT-approved SMS** templates/sender IDs *(weeks of approval lead time)*
- ☐ **Meta WhatsApp** template approved *(weeks of lead time)*
- ☐ **FCM** service account (push) + device-token registration
- ☐ **Google OAuth** client IDs — web (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) + mobile (Android SHA-1 / iOS) — *currently unconfigured/off*
- ☐ OpenAI key (optional — scan degrades gracefully without)
- ☐ Mobile `WEB_BASE_URL` (https) if using web-checkout handoff

## 3. Security (must be clean)
- ☐ **OTP-leak fix** verified in prod (`otp/send` + register don't return OTP; forgot-password already safe)
- ☐ Account-enumeration closed (identical responses)
- ☐ Security test pass — **no open High/Critical** (IDOR, authz, injection, HMAC, rate-limit)
- ☐ Payments/auth/PII defects all closed + `/security-review` on fixes
- ⚠️ JWT-in-localStorage — accept for v1 or move to httpOnly cookie (Product decision)

## 4. Product / Policy decisions
- ☐ **Store-policy call** on in-app credits (Play/Apple digital-goods) — unblocks mobile checkout
- ☐ Legal: T&Cs, Privacy, contracting entity, data-processing terms published
- ☐ Real customer content: success stories, contact details in catalogs

## 5. QA Exit (from the Test Plan)
- ☐ 100% P1 cases executed; ≥95% P2 executed (all 6 suites)
- ☐ **Zero open S1/P1 defects**; open S2/P2 triaged + accepted by Product
- ☐ 2 regression cycles clean on impacted areas
- ☐ Performance targets met (see Performance plan)
- ☐ **Mobile device smoke test done** on Android + iOS *(never run on a device yet)*
- ☐ UAT signed off by Product

## 6. Backend defects to close (found this program)
- ☐ Admin-reachable invoice-PDF route (admin currently 403s)
- ☐ Invite trial-lot cold-path fix merged to `main` (coordinate w/ Asrar)
- ☐ Validation errors carry field detail in prod (currently bare "Validation failed")
- ☐ Error `reason`/detail contract consistent in prod

## 7. Per-surface build health
- ☐ Portal: `npm run type-check` green · `/code-review` + `/security-review` green
- ☐ Admin: same gates green
- ☐ Backend: migrations run (`2026-07-12_org_seats`), redeploy current code *(verified deployed)*
- ☐ Mobile: `flutter analyze` 0 · device-tested · store listing assets ready

---

## Sign-off
| Gate | Owner | Signed | Date |
|---|---|---|---|
| QA complete (exit criteria) | Najeeb | ☐ | |
| Security clean | Lead / Security | ☐ | |
| Performance acceptable | Lead / Infra (Nayan) | ☐ | |
| UAT accepted | Product (Shaik/Nazir) | ☐ | |
| Infra & config ready | Nayan | ☐ | |
| **GO / NO-GO** | **Nazir (PM)** | ☐ | |
