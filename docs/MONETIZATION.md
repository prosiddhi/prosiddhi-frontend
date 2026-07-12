# ProSiddhi — Monetization

**The employer billing system: the rules, what's built, and what's still broken.** Updated **2026-07-12** (seat bugs §6.1–6.3 fixed on the backend; admin monetization endpoints shipped).
Consolidates the former five `docs/pricing/*` files. Verified against the code in both repos.

**Model in one line:** ProSiddhi monetizes the **employer** side only — **job seekers are free forever.** Employers buy **credits** and spend them to **post jobs** and **unlock candidates**, inside time-boxed plans.

---

## 1. The two credit types

- **Post credit** — spent when an employer **publishes a job** (1 per job). The job is live **30 days** (independent of plan length).
- **Download credit** (candidate unlock) — spent the **first time** an employer opens a candidate's **full profile/contact**. Re-viewing or contacting that same candidate again is **free, forever**.

## 2. The 8 plans

Prices are **base — GST (18%) is added on top at checkout**.

| Group | Plan | Code | ₹ base | Posts | Unlocks | Seats | Duration |
|---|---|---|---|---|---|---|---|
| **Pack** | Single post | `PACK_SINGLE_POST` | 499 | 1 | 3 | — | one-shot, **never expires** |
| **Starter** | 1 Month | `STARTER_1M` | 1,299 | 3 | 5 | 1 | 30 days |
| **Starter** | 3 Months | `STARTER_3M` | 2,400 | 6 | 7 | 1 | 90 days |
| **Starter** | 6 Months | `STARTER_6M` | 4,499 | 13 | 10 | 1 | 180 days |
| **Pro** | 6 Months · 1 seat | `PRO_6M_1S` | 8,999 | 20 | 200 | 1 | 180 days |
| **Pro** | 6 Months · 2 seats | `PRO_6M_2S` | 11,999 | 20 | 200 | 2 | 180 days |
| **Pro** | 12 Months · 1 seat | `PRO_12M_1S` | 16,499 | 40 | 400 | 1 | 360 days |
| **Pro** | 12 Months · 3 seats | `PRO_12M_3S` | 21,999 | 45 | 450 | 3 | 360 days |

## 3. Free tier + trial

- **Free tier (always):** a registered employer who hasn't bought anything can register and **search the candidate database, seeing snippets only** (contact hidden). They **cannot post or unlock** until they have credits.
- **Free trial (once):** on account **activation**, an employer gets **1 post + 3 unlock credits, valid 14 days.** Granted **once per employer** — deduped on verified phone/email (individual) or **verified GSTIN** (business), so it can't be farmed by re-registering.
  - *Activation* = email-verify for an individual; **admin approval** for a business (so a business gets its full 14 days from the moment it can actually use the product).

## 4. The rules

**Credits & expiry**
- Credits bundled with a **subscription plan forfeit when that plan expires.** Credits from the **₹499 pack never expire.**
- Credits are spent **soonest-expiring first** (so pack credits are used last).
- **Buy anything, anytime** — any of the 8 plans/packs. There are no separate top-up SKUs.
- **Multiple plans merge into one wallet**, with a **single expiry = the latest active plan's expiry**. No proration. **If seat counts differ, the higher one applies.** *(This last rule is currently broken — see §6.)*

**Money & tax**
- Prices are shown **base + "18% GST"** (exclusive). GST is a separate line at checkout.
- **GSTIN is optional.** Place of supply decides the tax: buyer's state == our state → **CGST + SGST**; otherwise → **IGST**.
- A **GST invoice PDF is always generated** (`INV/YY-YY/NNNNNN`, resets each April) and is downloadable anytime.
- **No refunds in v1.** No cancel button — a plan simply runs to expiry and lapses (renewal = buy again). Chargebacks go through Razorpay's dispute process.

**Lifecycle**
- **Grace period = 3 days.** At expiry, posting and new unlocks are blocked, but **already-live jobs stay live** and **already-unlocked contacts stay visible**. On day 3, active jobs go INACTIVE. Unlocked contacts are **never** clawed back.
- **No reactivation** — once a plan lapses its unused subscription credits are gone. Pack credits survive.

**Safeguards**
- **Delete-refund:** deleting a job returns its post credit **only if** it has **no applications AND is deleted within 24h** of publishing. (Stops post → harvest applicants → delete → repost.)
- **Unlock confirm:** unlocking is an **explicit confirm** ("Use 1 credit to unlock?") — never charged on an accidental view.
- **Editing a published job is always free.**
- **Employer soft-delete:** credits are **frozen, not destroyed** — a restore brings them back.
- **Seeker deletes their account (DPDP):** the unlock row **persists** (the employer really did spend a credit), but we **stop serving the contact** — the card reads *"This candidate is no longer available."* **No refund.** *(We deliberately do NOT snapshot-and-keep serving their contact: that would mean supplying personal data after an erasure request.)*

---

## 5. What's BUILT ✅

Everything below is live on **both** the backend and the portal.

**Backend endpoints**
| Purpose | Endpoint |
|---|---|
| Plan catalog | `GET /api/plans` *(public)* |
| Checkout (Razorpay order) | `POST /api/billing/checkout` |
| Client-side payment verify | `POST /api/billing/verify-payment` |
| Razorpay webhook | `POST /api/webhooks/razorpay` *(HMAC)* |
| Credit wallet | `GET /api/employers/me/credits` |
| Invoices + PDF | `GET /api/employers/me/invoices` · `…/:id/pdf` |
| Candidate search (FTS) | `GET /api/employers/search/workers` |
| Candidate profile (snippet-gated) | `GET /api/employers/candidates/:jobSeekerId` |
| Candidate unlock | `POST /api/employers/candidates/:jobSeekerId/unlock` |
| Unlocked history | `GET /api/employers/me/unlocked-candidates` |
| Team seats *(real org membership — 2026-07-12)* | `GET /api/employers/me/team` · `GET /api/employers/me/entitlements` · `POST /api/employers/me/team/invite` · `GET /api/employers/team/invites/:token` *(public peek)* · `POST /api/employers/team/accept-invite` · `DELETE /api/employers/me/team/invites/:inviteId` · `DELETE /api/employers/me/team/:membershipId` |
| Admin monetization *(2026-07-12)* | `GET /api/admin/monetization/{payments,invoices,employers}` · `pendingVerifications` on `GET /api/admin/dashboard/stats` |

**Mechanics**
- **Credit ledger** — every purchase creates a *lot* (kind, source, amount, expiry); spending draws lots soonest-expiring-first. Every grant/spend is written to an append-only audit table. This one model gives us merging, mixed expiries and the never-expiring pack for free.
- **Gates** — publishing spends a post credit *before* the job is created (402 at zero); unlocking spends a download credit **and** records the unlock **in one transaction**, so a concurrent double-click cannot lose a credit.
- **Payments** — the webhook **and** the client-verify path both grant credits, but they share an atomic claim, so they **cannot double-grant**. Every Razorpay delivery is recorded in an audit log.
- **Crons** (daily, 03:00 IST) — expire jobs past their 30-day window; INACTIVATE jobs of employers past the 3-day grace.

**Portal screens** — pricing page, Razorpay checkout, credit wallet + expiry nudge, post-credit gate + upsell, top-up modal, invoice history + PDF, candidate search + unlock confirm + unlocked history, team roster/invite/accept/remove.

---

## 6. What's BROKEN / LEFT

### 6.1 Seat cap reads the wrong plan — ✅ FIXED (2026-07-12, BE)
Was: with two active plans the code took the seats of the **latest-expiring** plan instead of the **highest**, so a 2-seat Pro (170d) + a fresh 1-seat Starter (180d) collapsed to **1 seat**.

Now: one `getEntitlements(employerId)` (`services/employer-context.service.ts`) **aggregates, never picks a plan** — `seatCap = MAX(seats)` and `planExpiresAt = MAX(expiresAt)` over the active non-PACK plans. Packs contribute 0; no active plan → 1 seat. No controller computes seats inline. Buying while a plan is active is not blocked (stacking is intended). *Verified end-to-end: a 2-seat Pro (170d) + 1-seat Starter (180d) now resolves to seatCap 2, walletExpiry 180d.*

### 6.2 Seats are roster-only — ✅ FIXED (2026-07-12, BE)
Was: `User↔Employer` was **1:1** and subscriptions/payments were keyed by **`userId`**, so every teammate had their own Employer row and wallet — a multi-seat plan delivered no shared credits/jobs/unlocks.

Now: a real **shared company workspace**, exactly as the decisions below required.
- **`EmployerUser` membership table** makes `User↔Employer` **1:N** and is the **only** authorization edge. **`Subscription` + `PaymentHistory` re-keyed to `employerId`**, so a plan funds one org wallet.
- **One `resolveEmployerContext(userId) → { employerId, role, seatStatus }`** that every employer-scoped controller routes through (employer, credit, candidate, job, application, chat, billing, documents). No `userId` in any scoping/authz predicate. A data-preserving, reversible migration re-keys the tables and backfills each employer's user as the OWNER seat.
- **Roles: OWNER** (invite/remove, buy plans) vs **MEMBER** (post, unlock, manage). Exactly one OWNER per employer; the OWNER can't be removed. Enforced by partial unique indexes (one OWNER per employer, one live membership per user).
- **Attribution, not authorization** — `Job.createdByUserId` and `EmployerCandidateUnlock.unlockedByUserId` record "posted/unlocked by X"; nothing gates on them. Removal is a **soft revoke**: their jobs stay live, their unlocked candidates stay unlocked, nothing refunded, **no `CreditTransaction` written**; re-invite reactivates the same row.
- **Seat downgrade**: when a bigger plan expires and the cap drops, over-cap members auto-suspend **newest-invited first** (OWNER always protected); a suspended member keeps read access but 402s on post/unlock/buy; auto-restore in invite order when the cap rises. Enforced at **request time** (resolveEmployerContext ranks seats live, so it's correct the instant a plan lapses) **and** in the daily cron (materializes the status column). *Verified: expiring the 2-seat plan with no cron run suspends the member on their next request; the owner is untouched; the cap rising restores them.*

### 6.3 The invite flow — ✅ FIXED (2026-07-12, BE)
Was: an invited teammate was bounced to login, registered separately, then had to click the invite link a **second** time.

Now: `EmployerInvite` with a **signed token returned once and stored only as a SHA-256 hash** (timing-safe compare), **7-day expiry, single-use** (guarded claim), **owner-revocable**, and **bound to `invitedEmail`** — accepting from a different account is a **403**, so the link can't be used to steal a seat. Seat cap is checked at **both** invite and accept. An email already registered as a `JOB_SEEKER` is refused with a clear message; invite creation + token lookup are rate-limited. The public `GET /api/employers/team/invites/:token` peek returns just the bound email + company name so the frontend can register/sign-in inline, **carry the token through auth, and auto-accept** — the link is clicked once. *Verified: wrong-account accept → 403, replay → 400, the whole invite→accept→shared-wallet flow works.*

**FE work remaining:** the portal's `/invite/:token` landing page + carry-token-through-auth plumbing (the backend endpoints are ready).

### 6.4 Go-live configuration *(still needs external config)*
- **Razorpay** — real keys + a real webhook secret (test keys + a `local-dev-*` placeholder today).
- **GST** — Azkashine's real GSTIN on invoices.
- **Admin monetization surface** — ✅ backend endpoints **now exist** (`GET /api/admin/monetization/{payments,invoices,employers}` + `pendingVerifications` on the dashboard stats); admin-console UI still to build.
- **Outbound notification config** — MSG91 keys + DLT/WhatsApp template approval, FCM service account (the BE adapters are built and no-op safely until configured).
- **OpenAI key** — optional; content-scan degrades gracefully without it.

---

## 7. Deferred to v1.1

Bulk post-packs · download-only top-up SKU · promo/coupon codes · enterprise/custom deals · **chargeback credit-revocation** *(today a customer could dispute a charge and keep the credits)* · **admin manual credit grant/revoke** *(support has no way to fix a failed webhook)* · proration · auto-renewal (RBI e-mandate) · paid "refresh/boost-to-top" · TDS reconciliation.
