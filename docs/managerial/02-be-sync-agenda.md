# Backend Sync — Job Portal v1 Scope Confirmation

**From:** Nazir Hasan  **To:** Asrar  **Date:** 2026-05-09 (refreshed for 2026-05-09 scope revisions)
**Goal:** confirm S1+S2 capacity, resolve audit findings, align on the revised auth + integration plan before standups start **Mon 2026-05-11**. Written response requested by **Wed 2026-05-12 EOD**.

---

## 1. Context

Charter is locked, FE/BE audit is done, Indian-market research is done. **Major scope revision applied 2026-05-09** — see §3 for the headline changes affecting BE. Acknowledging upfront: you've shipped a substantial BE — ~115 endpoints, full auth lifecycle, recommendation algo, soft-delete, post-moderation. Audit was about understanding state, not critiquing.

Single source of truth going forward: **[docs/_context/02-scope-locked.md](../_context/02-scope-locked.md)** (revised 2026-05-09). Per-file findings: **[docs/_context/03-codebase-audit.md](../_context/03-codebase-audit.md)** (note: parts referencing Aadhaar work are now historical — see §3). Pricing pending Shaik Ishaq's decision: **[docs/managerial/03-pricing-decision-memo.md](03-pricing-decision-memo.md)**.

---

## 2. Headline 2026-05-09 changes affecting BE (read before §4)

Five things changed since the original sync agenda was drafted. They affect what you build, what you delete, and how you estimate.

1. **Aadhaar code paths to be DELETED.** No mock Aadhaar, no real Aadhaar, no Verhoeff validator, no AadhaarVerification model, no aadhaarNumber field on User schema, no send/verify endpoints. Aadhaar is out forever (Q3, Q4, Q11 revoked).
2. **Auth flow rework: phone-first for BOTH seeker AND employer.** Email + Google OAuth as alternative login methods (after registration). Same auth options for both roles.
3. **WhatsApp Business via MSG91 is now in v1** (was v2). Shaik Ishaq is running the Meta Business verification + BSP onboarding + template approval process in parallel; you wire the integration.
4. **Application audio cap: 2 minutes** (was 5 min). Standard across web AND mobile.
5. **Escrow / payment-intent / commission code: do not build.** Q12 revised — out forever, not just v2. Revenue is subscription-only.

Pricing model for the subscription module is still pending Shaik's decision (deadline 2026-05-18). You can build the subscription schema generically; specific tier names and prices are TBD.

---

## 3. Capacity confirmation (highest priority)

| Module | Estimate | Sprint | Notes |
|---|---|---|---|
| **Aadhaar code deletion** (model, validator, endpoints, schema fields) | 1d | S1 day 1 | Cleanup before reworking auth |
| Auth flow rework — phone-first for **both** seeker AND employer | 3–4d | S1 | Drops Aadhaar entirely; new flow per §5 |
| Email + Google OAuth login | 2d | S1 | passport-google-oauth20 or equivalent |
| Subscription module (Razorpay + webhook + plan tiers + metering) | 5–7d | S1 | Schema generic; specific tiers / prices pending Shaik (2026-05-18) |
| Notification channels (FCM + MSG91 SMS + Sendgrid email + WhatsApp Business) | 7–9d | S1/S2 | Extra time for WhatsApp template wiring; SMS DLT day 1 of S1 |
| Audio messaging (chat AUDIO 60s + apply audio 2 min + storage abstraction) | 3–5d | S2 | Local disk + presigned-URL layer (Q10 revised — 2 min cap) |
| Content moderation (`omni-moderation-latest` + scam regex) | 1–2d | S2 | New `POST /api/admin/posts/:id/scan` |
| Recommendation tweaks (location 10→20, decay, recency, cold-start) | 1d | S2 | Q9 in scope-locked |
| **Total** | **~22–30 dev-days** | **S1+S2 (~5 weeks)** | |

**→ Asrar: can you commit? If not, what comes out, or what's the resourcing gap?** Be blunt — easier to know May 12 than May 25.

---

## 4. Bugs from audit — confirm or refute

For each: file:line, what we saw, three-option response.

**a. `BOOKMARKED` missing from `ApplicationStatus` enum** — [validators/application.validator.ts:~4](#) but `toggleBookmark` writes it. `PUT /:id/status` can never set BOOKMARKED.
- [ ] Bug, will fix  [ ] Intentional (notes: _____)  [ ] Needs discussion

**b. "Cannot reject accepted" guard commented out** — [services/application.service.ts:~1070-1073](#).
- [ ] Bug, will re-enable  [ ] Dead code, delete it  [ ] Needs discussion

**c. `Math.random()` in OTP generation** — [utils/crypto.ts:~43](#). Predictable; should be `crypto.randomInt`.
- [ ] Will fix in S1  [ ] Defer to S3 hardening  [ ] Needs discussion

**d. `JWT_SECRET` defaults to literal `'your-secret-key'`** — [utils/jwt.ts:~4](#). Should fail-fast at boot if env unset.
- [ ] Will add boot assertion  [ ] Already handled in deploy config  [ ] Needs discussion

**e. OTP value returned in API response body** (phone + email — Aadhaar OTP is being deleted per §2). Mock-mode artifact.
- [ ] Keep through QA, gate behind `NODE_ENV !== 'production'` before cutover  [ ] Remove now, switch to real WhatsApp/SMS in QA  [ ] Needs discussion

Bonus housekeeping: forgot-password 404 leaks email enumeration ([auth.controller.ts:~22](#)); `POST /api/admin/create` is unauthenticated ([admin.routes.ts:~45](#)). Fix in S3 hardening unless you'd rather take them now.

---

## 5. Auth flow rework specifics (revised 2026-05-09)

New flow per locked decisions. **Same flow for both seeker and employer.**

**Seeker:** Language → Phone Number → Phone OTP → Profile (incl. email) → Categories → Experience → Password → email verification.

**Employer:** Phone Number → Phone OTP → Password → Email Verify → Company Details (with GST + CIN + ISO docs for Corporate). Individual auto-approves on email-verify; Corporate queues to admin.

**Login methods (both roles):** phone+OTP, email+password, OR Google OAuth — pick whatever's easier.

Today's BE accepts a single multipart `POST /api/jobseekers/register` with everything (and similar for employers) — registration shape changes substantially. FE will accumulate state client-side and submit once.

**Open questions for you:**

- Backward-compat: any already-registered users on the BE today? If yes, plan: keep working as-is, or one-time phone-link flow on next login?
- After deleting Aadhaar code, any orphan FK references or migration cleanup needed?
- Google OAuth: any opinion on `passport-google-oauth20` vs `next-auth` vs DIY? (FE side will use whatever you pick.)
- For employer Corporate flow, the GST + CIN + ISO doc upload step — keep as multipart on register, or split into a separate step after email-verify so the employer can be email-verified and start posting (with limits) before the doc review completes?

---

## 6. WhatsApp Business integration (NEW in v1 per Q7 revised)

Shaik Ishaq runs the verification paperwork; you wire the integration once templates are approved. Coordination needed on:

- **MSG91 as BSP** (already in our stack for SMS) — single vendor, single dashboard. Confirm OK?
- **Templates to draft + submit for Meta approval** (~8–12, you'd write them and Shaik would submit):
  - OTP, application accepted, application rejected, application shortlisted
  - Interview scheduled, interview 24h reminder, interview 2h reminder
  - Payment confirmation, document approved, document rejected
  - Employer-message-to-seeker, password reset
- **Engineering integration** ~5–7 dev-days once templates approved
- **Acceptable risk:** if Meta verification slips, WhatsApp launches up to 1 week after handover; SMS stays as fallback throughout

**Open question for you:** Any opinion on whether to wire WhatsApp first (and use it for OTP delivery primary) or SMS first (and add WhatsApp later)? My instinct is wire SMS first since DLT is already on the critical path; WhatsApp slots in as a parallel channel once templates are approved.

---

## 7. Decision log + tagging convention

Audit found inline tags `Q##`, `NC-##`, `T##`, `T2a #`, `T3 #` across BE source.

- Where does the master decision log live? (Notion? shared doc? README?)
- Can FE + Mobile get write access?
- FE + Mobile will adopt **`Q-FE-NN`** / **`Q-MOB-NN`** prefixes to avoid namespace collisions. OK?

---

## 8. In-flight work + branch state

- Anything on `prabhazkashine/asrar-dev` not yet merged to main?
- Anything in flight that conflicts with locked v1 scope (especially Aadhaar code that needs deletion, escrow stubs, payment-intent code)?
- Cleanup plan before standups start **Mon May 11** — branch hygiene, open PRs, stale work?

---

## 9. External dependencies

| Item | Status / question | Owner |
|---|---|---|
| MSG91 SMS DLT registration | Account exists? Header/template approval started? **Critical-path; initiate Mon May 11.** | Nazir to procure / Asrar to integrate |
| MSG91 WhatsApp BSP onboarding | Started? | Shaik Ishaq owns |
| Meta Business verification | Started? | Shaik Ishaq owns |
| Razorpay merchant account | KYC done? Sandbox keys available? | Nazir |
| Email sender (Sendgrid or alt) | Preference? Existing account? | Asrar to recommend |
| OpenAI API key | Existing org or fresh procurement? Budget cap? | Nazir |
| FCM project (Firebase) | Existing? iOS APNs cert plan? | Joint |
| Google OAuth client (for OAuth login) | Need to register; who owns? | Nazir to set up |

---

## 10. API documentation gap

Audit: ~115 endpoints in code, ~68 in `API_DOCUMENTATION.md`. Entire `/api/auth`, `/api/conversations`, `/api/messages`, `/api/notifications`, `/api/email-otp`, most admin moderation, `/me/documents`, `/me/profile-photo` are undocumented. (Plus the `/api/aadhaar/*` endpoints — those will simply disappear with Aadhaar deletion.)

**Plan to close in S1?**

- [ ] Manually update `API_DOCUMENTATION.md`
- [ ] Auto-generate OpenAPI from existing Zod validators (preferred — single source of truth, FE/Mobile codegen later)
- [ ] Other: _____

If OpenAPI route, FE will host the spec in `Job_Portal/docs/technical/openapi.yaml` per D7.

---

## 11. Scope confirmations (one line each, 2026-05-09 revised)

- [ ] **No Aadhaar of any kind** — model, validator, endpoints, schema field all deleted (Q3/Q4/Q11 revoked)
- [ ] Phone-OTP-only registration for **both** seeker and employer (Q3 revised)
- [ ] Email + Google OAuth login as alternative auth methods, same options for both roles
- [ ] OpenAI `omni-moderation-latest` as Scan Content engine (Q8)
- [ ] Local disk for audio v1, presigned-URL abstraction layer for v2 S3/R2 swap (Q10)
- [ ] Application audio cap = 2 minutes; chat audio cap = 60 seconds (Q10 revised)
- [ ] Polling-based chat (`?after=<msgId>`, ~10s interval), **no WebSockets ever** (R7 revoked — scrubbed entirely)
- [ ] Manual subscription renewal (no auto-debit, no e-mandate)
- [ ] WhatsApp Business via MSG91 (Q7 reversed — IN v1 with conditions)
- [ ] **No escrow / no payment-intent / no commission code** — out forever (Q12 revised)
- [ ] Recommendation tweaks per Q9 (location bump, exp decay, recency boost, cold-start)
- [ ] Mobile employer parity (full mobile app for both seeker AND employer, Dheeraj owns) — note BE doesn't change for this (same API serves all clients) but worth confirming you haven't gated anything on `client === 'web'`

---

## 12. Next steps & deadlines

- **Wed May 12 EOD** — Asrar's written response on §3 (capacity), §4 (bugs), §5 (auth), §6 (WhatsApp), §9 (deps), §11 (scope checkboxes).
- **Mon May 11** — daily standups start; DLT registration kickoff; Aadhaar code deletion begins; branch cleanup done.
- Scope changes go through **02-scope-locked.md** (PR or direct edit with date stamp), not Slack/chat.

---

## 13. Sign-off

- [ ] I can deliver §3 in S1+S2 / [ ] I cannot — what changes: _____
- [ ] §4 bugs addressed (per-item notes above)
- [ ] §9 external dependencies on track or escalated
- [ ] §11 scope confirmations agreed

**Signed:** ___________________  **Date:** __________
