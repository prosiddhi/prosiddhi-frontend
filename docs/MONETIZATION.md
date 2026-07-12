# ProSiddhi — Monetization

**The employer billing system: the rules, what's built, and what's still broken.** Updated **2026-07-12**.
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
| Team seats | `GET/POST /api/employers/me/team[/invite]` · `POST /api/employers/team/accept-invite` · `DELETE /api/employers/me/team/:seatId` |

**Mechanics**
- **Credit ledger** — every purchase creates a *lot* (kind, source, amount, expiry); spending draws lots soonest-expiring-first. Every grant/spend is written to an append-only audit table. This one model gives us merging, mixed expiries and the never-expiring pack for free.
- **Gates** — publishing spends a post credit *before* the job is created (402 at zero); unlocking spends a download credit **and** records the unlock **in one transaction**, so a concurrent double-click cannot lose a credit.
- **Payments** — the webhook **and** the client-verify path both grant credits, but they share an atomic claim, so they **cannot double-grant**. Every Razorpay delivery is recorded in an audit log.
- **Crons** (daily, 03:00 IST) — expire jobs past their 30-day window; INACTIVATE jobs of employers past the 3-day grace.

**Portal screens** — pricing page, Razorpay checkout, credit wallet + expiry nudge, post-credit gate + upsell, top-up modal, invoice history + PDF, candidate search + unlock confirm + unlocked history, team roster/invite/accept/remove.

---

## 6. What's BROKEN / LEFT 🔴

### 6.1 Seat cap reads the wrong plan *(bug)*
With two active plans, the code takes the seats of the **latest-expiring** plan instead of the **highest**. So a 2-seat Pro plan (170 days left) + a freshly-bought 1-seat Starter (180 days) resolves to **1 seat** — silently taking away a seat the customer paid for.

`team.service.ts:63-74` uses `findFirst(orderBy: { expiresAt: 'desc' })`. The fix is to **aggregate, never pick a plan** — these are two different aggregates over the same set:
```
walletExpiry = MAX(expiresAt) across active plans   ← already correct
seatCap      = MAX(seats)     across active plans   ← currently wrong
```
Packs contribute **zero** seats. No active plan → 1 seat. **Do not block buying a plan while one is active** — stacking is intended; show an informational note instead.

### 6.2 Seats are roster-only — there is no shared workspace *(scope gap)*
`User↔Employer` is still **1:1**, and subscriptions/payments are keyed by **`userId`**. So every teammate has **their own Employer row and their own wallet** — a ₹11,999 / ₹21,999 multi-seat plan currently delivers **no shared credits, jobs or unlocks.** The feature doesn't yet do what the customer is paying for.

**Decisions (locked 2026-07-07):**
- **Shared company workspace**, not private lists. The org owns credits, jobs and unlocks; a seat only answers *"may this user act for this employer?"* (This isn't really a choice: the unlock dedupe key is `(employerId, candidateId)`, so private lists would re-charge a second teammate for a candidate the company already unlocked — contradicting "re-view is free".)
- **A removed teammate's work stays with the company, permanently.** Removal revokes **access only** — their jobs stay live, their unlocked candidates stay unlocked. Nothing deleted, nothing refunded. The owner can't be removed.
- **Attribution, not authorization** — store `createdByUserId` / `unlockedByUserId` and show "posted by X", but never gate on it. Roles stay simple: **OWNER** (invite/remove, buy plans) vs **MEMBER** (post, unlock, manage).

**To implement:** an `EmployerUser` membership table (`User↔Employer` → **1:N**), re-key `Subscription`/`PaymentHistory` to **`employerId`**, and route every employer-scoped controller through one `resolveEmployerContext(userId) → { employerId, role, seatStatus }`.

**Seat downgrade** (when a bigger plan expires and the cap drops): auto-suspend over-cap members **newest-invited first**, owner always protected; show a banner to both the member and the owner, and 402 their actions; auto-restore in invite order when the cap rises.

### 6.3 The invite flow is broken UX
Today an invited teammate is bounced to login, has to register separately, then **click the invite link a second time**. Note the irony: seats only exist on the **₹11,999 / ₹21,999** plans, so the roughest flow in the product hits the **highest-paying customers**.

**Fix (it's redirect/state plumbing, not new screens):** the invite link carries a signed token; `/invite/:token` → if there's no account, register **inline with the email pre-filled and locked**; if there is, log in inline. **Carry the token through auth and auto-accept on return** — the link is clicked exactly once.
**Guards:** bind the invite to the invited email and reject a mismatch (otherwise anyone with the link steals a seat); single-use, 7-day expiry, owner-revocable; check the seat cap at **both** invite time and accept time (the cap can drop in between); store the token hashed.

### 6.4 Go-live configuration
- **Razorpay** — test keys today, and the webhook secret is a `local-dev-*` placeholder. Both must be replaced.
- **GST** — Azkashine's real GSTIN must be on the invoices.
- No admin surface for payments/invoices/credits yet (see [STATUS.md](STATUS.md) §3).

---

## 7. Deferred to v1.1

Bulk post-packs · download-only top-up SKU · promo/coupon codes · enterprise/custom deals · **chargeback credit-revocation** *(today a customer could dispute a charge and keep the credits)* · **admin manual credit grant/revoke** *(support has no way to fix a failed webhook)* · proration · auto-renewal (RBI e-mandate) · paid "refresh/boost-to-top" · TDS reconciliation.
