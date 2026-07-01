# Employer Monetization — Delete & Refund Reference

**Status:** Working document · **Owner:** Nazir (PM) · **Audience:** BE/FE/mobile devs + QA + Shaik
**Companion to:** [employer-monetization-functional-spec.md](./employer-monetization-functional-spec.md), [employer-monetization-technical-design.md](./employer-monetization-technical-design.md)
**Date:** 2026-06-29
**Purpose:** single reference for **every** delete-, refund-, soft-delete-, reversal-, and reactivation-related decision in the monetization v1 plan. Locks, flags, and open questions all in one place.

> **This is a derivative doc.** Source-of-truth is still the functional spec + technical design. This doc consolidates decisions we made during the doubts walkthrough so devs don't have to re-derive them. When the source docs are updated, update this too.

---

## 1. Index of all delete/refund-adjacent topics

| # | Topic | Status |
|---|---|---|
| 1.1 | Employer account soft-delete — what happens to credits | 🔒 Locked |
| 1.2 | Seeker account delete — what happens to employer-held "unlocks" | ⏸️ Phase 2 — pending |
| 2.1 | Taxonomy soft-delete (Category / Sector / JobTitle) | ✅ Shipped (BR-3) — referenced for symmetry |
| 3.1 | Job-delete refund: 24h window + 0 applications | 🔒 Locked (per spec §3) |
| 3.2 | Job-delete refund: "no applications" definition | 🔒 Locked (resolved per tech-design §4) |
| 3.3 | Job FILLED / CLOSED — does it refund? | 🔒 Locked (no — resolved by absence) |
| 3.4 | 30-day job live window expiry | 🔒 Locked (no refresh in v1) |
| 4.1 | Plan: no cancel button | ✅ Spec §3 |
| 4.2 | Plan: no money-back flow in v1 | ✅ Spec §3 |
| 4.3 | Plan expiry → 3-day grace → INACTIVE | ✅ Spec §3 + tech-design §4 |
| 4.4 | Subscription credits at expiry — forfeited | ✅ Spec §3 (per "credit expiry" rule) |
| 4.5 | Pack credits at expiry — persist forever | ✅ Spec §3 |
| 4.6 | Plan reactivation — none | ✅ Spec §3 |
| 5.1 | Chargeback — money handling | ✅ Spec §3 (Razorpay's dispute process) |
| 5.2 | Chargeback — credit revocation | 🚩 Flagged for v1.1 (bundled with chargeback money flow) |
| 6.1 | Admin support: manual credit grant | 🚩 Flagged for product owner |
| 6.2 | Admin support: manual credit revocation | 🚩 Flagged (via negative grant) |
| 7.1 | Razorpay refunds outside chargebacks | ❌ Not built in v1 (per spec §3) |

Legend: 🔒 = decision locked · ✅ = explicitly in source docs · ⏸️ = paused for later · 🚩 = flagged for product owner / external dependency · ❌ = out of scope for v1

---

## 2. Account-level deletes

### 2.1 Employer account soft-delete — what happens to credits

**Decision: 🔒 Locked — Option B (freeze, preserve)**

When an employer's `User.isDeleted` flag is set to `true` (NC-9 soft-delete convention):

- **All `CreditLot` rows for that employer are preserved in DB** — not deleted, not zeroed.
- **The wallet shows balance = 0** because the BE's `spendCredit` and `balance` functions check `User.isDeleted` upstream and reject spends.
- **No `CreditTransaction` rows are written** for the soft-delete event itself (it's not a spend or grant).
- **If the employer is restored** (`isDeleted = false`), credits become accessible again. Expired-during-deletion subscription lots stay expired (normal expiry rules apply). Pack lots survive intact.

**Rationale:** matches NC-9 spirit of "preserve to allow recovery from mistakes." Also aligns with spec §3's "no refunds in v1" — forfeiting credits unilaterally on a soft-delete would be a one-sided action equivalent to a forced refund without paying money back.

**Implementation:**
- `spendCredit()` and `balance()` functions add an upstream check: `if employer.user.isDeleted → throw NoCreditsError` (which the controller surfaces as 402).
- No new DB column needed — uses existing `User.isDeleted` field.

**Edge cases:**
- Soft-deleted employer's posting middleware: 402 fires either way (`accountStatus !== 'ACTIVE'` OR `isDeleted = true`). Both gates active.
- Soft-deleted employer's invoice history is still queryable via admin tooling (important for legal — they paid, the audit trail must persist).
- For genuine fraud cases (admin force-deletes a spammer), admin can use a manual SQL script to also zero the lots. Not worth API surface in v1.

**Source:** Doubt #4 walkthrough, locked 2026-06-29.

---

### 2.2 Seeker account delete — what happens to employer-held "unlocks"

**Decision: ⏸️ Phase 2 — pending**

Phase 2 introduces the "unlock" feature: an employer spends a download credit to view a candidate's full contact information. Once unlocked, that information is permanently available to the employer (spec §3 safeguard).

**The open question:** when the seeker later deletes their own account (soft-delete via NC-9), what does the employer's unlock card show?

Three implementation options, all valid:

| Option | Behavior |
|---|---|
| **A. Hard-delete seeker data on request** | Unlock card displays "User deleted" placeholder — no contact info visible. Honors DPDP "right to be forgotten" most strictly. |
| **B. Snapshot contact info on unlock** | At unlock time, BE copies the seeker's email/phone into the `EmployerCandidateUnlock` row. Even if seeker deletes later, employer retains the snapshot they paid for. |
| **C. Hybrid** | Unlock card shows "User deleted" + a note, no actual contact info shown. Middle ground. |

**Why deferred:**
- Unlock feature itself is **Phase 2** — not built yet
- DPDP-vs-commercial-claim tension benefits from product owner + legal input
- Phase 1 doesn't box us into any option

**Action:**
- This decision is **not blocking Phase 1**.
- Surface to Shaik + (eventually) legal counsel before Phase 2 ticketing begins.

**Source:** Doubt #20 walkthrough.

---

### 2.3 Taxonomy soft-delete (Category / Sector / JobTitle) — already shipped in BR-3

**Decision: ✅ Shipped (referenced here for symmetry)**

BR-3 (commit `f1fe1ff`) added soft-delete to taxonomy rows:
- `DELETE /api/admin/categories/:id` (and same for sectors, job-titles) sets `isDeleted: true` + `deletedAt: now`
- Public tree filters out soft-deleted rows
- Admin tree (`GET /api/admin/taxonomy`) shows them with the flag
- **No restore endpoint** (manual DB intervention if ever needed)

**Why this is here:** the monetization tickets need to treat taxonomy references consistently. Job rows store `category` / `sector` / `jobTitle` as **string names** (snapshots), so historical jobs survive an admin-soft-delete of the taxonomy row they reference. No special handling needed in the monetization layer.

**Source:** BR-3 shipped, locked in BR-3-PLAN.

---

## 3. Job-level deletes

### 3.1 Job-delete refund: 24h window + 0 applications

**Decision: 🔒 Locked (per spec §3 safeguards)**

Deleting a published job returns its **1 POST credit** if and only if **both** conditions are true:
- The job has **0 applications** (see §3.2 for definition)
- The job was deleted **within 24 hours** of being published (`now - postedAt < 24h`)

Otherwise: **no refund**. The credit stays spent.

**Rationale:** prevents abuse pattern of post → harvest applicants → delete → repost-for-free. The 24h window accommodates honest mistakes (typo in the job title, posted in the wrong sector); the 0-apps gate ensures we're not refunding for jobs that actually attracted candidates.

**Implementation (per tech-design §4):**
- In `job.service.ts` deleteJob path
- Refund logic: `if (applicationCount === 0 && (now - postedAt) < 24h) → grantLots(REFUND, post: 1, expiresAt: null, reason: 'REFUND_DELETE')`
- Audit: write a `CreditTransaction` with `delta: +1, reason: 'REFUND_DELETE'`

**Edge case:** the refund creates a NEW lot (rather than restoring the spent one) so the `expiresAt` of the refunded credit matches the lot it came from. To keep this simple in v1, refund credits inherit the source lot's expiresAt (or null if PACK). Tech-design §1 describes the lot ledger pattern.

**Source:** Spec §3 safeguards + tech-design §4. Doubt #11 confirmed "no applications" semantics.

---

### 3.2 "No applications" definition

**Decision: 🔒 Locked = `applicationCount === 0` (per tech-design §4)**

A job has "no applications" when there are **zero `JobApplication` rows** referencing it, **regardless of status**.

This means:
- ✅ Job with no apps ever → eligible for refund
- ❌ Job with 1 applied + 0 withdrawn → NOT eligible
- ❌ Job with 0 applied + 1 withdrawn → NOT eligible (withdrawn rows still count)

**Why withdrawn counts:** the JobApplication row persists in DB after withdrawal. Tech-design §4 explicitly says `applicationCount == 0` — implementation matches the row count.

**FE/mobile UX:** when the delete button is rendered, show eligibility status:
- "Delete + get 1 credit back" (if eligible)
- "Delete (no refund — has applications or > 24h)" (if not)

**Source:** Doubt #11 walkthrough, resolved by tech-design §4.

---

### 3.3 Job FILLED / CLOSED — does it refund credits?

**Decision: 🔒 Locked = NO refund (resolved by absence)**

Spec §3 safeguards lists only one refund trigger: **delete within 24h with 0 applications.**

By absence, no other job state change refunds:
- Marking FILLED (employer found a hire) → no refund
- Marking CLOSED (employer cancelled the search) → no refund
- Auto-INACTIVE at 30-day expiry → no refund
- Auto-INACTIVE at plan-expiry-grace → no refund

**Rationale:** the credit was spent the moment the job was published — the employer got the value of being live for some period. Subsequent state changes are administrative, not credit-bearing events.

**Source:** Resolved by absence in spec §3 safeguards. Doubt #17.

---

### 3.4 30-day job live window expiry — no refresh in v1

**Decision: 🔒 Locked — no refresh feature in v1**

Every job gets a `Job.liveUntil` set to `publishedAt + 30 days`. After this window:
- A daily cron sets `Job.status = INACTIVE`
- No refund of any kind
- No refresh endpoint exists in Phase 1

**Spec §3's parenthetical "(refreshable)" is interpreted as v1.1 paid feature** (per spec §7 deferred list). v1 employers wanting to keep an unfilled role visible must delete + repost (consuming another POST credit).

**Source:** Doubt #3 walkthrough, locked 2026-06-29.

---

## 4. Plan lifecycle: cancel, expiry, reactivation

### 4.1 No cancel button

**Decision: ✅ Spec §3 — "renewal is manual, so a plan simply runs to expiry and lapses; no refund"**

There is no API endpoint for an employer to cancel a subscription mid-cycle. Plans run to their expiry, then lapse.

**Implication for FE:** the employer dashboard doesn't show a "Cancel my plan" button. It shows the plan + expiry date + a renew/upgrade option.

---

### 4.2 No money-back flow in v1

**Decision: ✅ Spec §3 — "No money-back flow in v1"**

The BE does not initiate refunds via the Razorpay refund API for any reason in v1. Customer-driven money reversals go through Razorpay's chargeback / dispute process directly between the customer and their bank.

**Exception:** the 1-credit refund-on-delete (§3.1) is a CREDIT refund, not a money refund. Different mechanism, allowed in v1.

---

### 4.3 Plan expiry → 3-day grace → INACTIVE

**Decision: ✅ Spec §3 grace + tech-design §4**

When a subscription plan reaches its `expiresAt`:

| Day | What happens |
|---|---|
| Day 0 (expiry) | Plan stops being "active." Posting + new unlocks immediately blocked (the subscription lot's `expiresAt` has passed). |
| Days 0 → 3 | Grace period: already-live jobs **stay live**. Already-unlocked candidates **stay viewable**. |
| Day 3 (grace ends) | Daily cron sets all the employer's active jobs to `INACTIVE`. Already-unlocked candidates **remain retained**. |

**Implementation:** cron in PJP-171 checks daily for employers with no active subscription past day 3 → bulk INACTIVE their jobs.

**Source:** Spec §3 + tech-design §4.

---

### 4.4 Subscription credits at expiry — forfeited

**Decision: ✅ Spec §3 — "credit expiry"**

Credits granted by a SUBSCRIPTION plan are tied to the plan's `expiresAt`. When the plan expires:
- The lot's `expiresAt` is in the past
- The lot is excluded from balance reads and spend selections (per tech-design §1: "select non-expired lots")
- The remaining credits effectively vanish from the employer's wallet
- The lot row stays in DB for audit but is functionally gone

**No "use it or lose it" warning required in v1.** Employer sees their wallet expiry date in the wallet UI (PJP-173).

---

### 4.5 Pack credits at expiry — persist forever

**Decision: ✅ Spec §3 — "Credits from the ₹499 Single-post pack never expire"**

PACK lots have `expiresAt = null`. They are always included in balance reads and spend selections, regardless of any subscription state.

**Edge case:** an employer with only PACK lots (no active subscription) can still spend them. The wallet UI should distinguish:
- Subscription credits: shown with expiry date
- Pack credits: shown as "never expires"

This is referenced in tech-design §1: spend draws lots by `expiresAt ASC NULLS LAST` — subscription credits get used first (because they expire), pack credits used last (because they never do).

---

### 4.6 Plan reactivation — none

**Decision: ✅ Spec §3 — "Reactivation: None"**

Once a subscription plan fully lapses (expiry + 3-day grace ends), there is no "reactivate" flow:
- Unused subscription credits from that plan are gone
- The employer must buy a fresh plan to start posting/unlocking again
- Their PACK credits (if any) survive the lapse intact

Phase 1 has no API endpoint for plan reactivation. FE shows "buy a plan" upsell.

---

## 5. Chargebacks

### 5.1 Chargeback — money handling

**Decision: ✅ Spec §3 — Razorpay's dispute process**

If a customer disputes a Razorpay charge:
- The dispute flows through Razorpay's own dashboard / dispute UI
- ProSiddhi (and BE) does NOT initiate the dispute or auto-decide
- If the dispute is decided in the customer's favor, Razorpay reverses the payment from ProSiddhi's settled balance

**BE does not run any money-side logic for chargebacks in v1.**

---

### 5.2 Chargeback — credit revocation

**Decision: 🚩 Flagged for v1.1 — bundled with chargeback money flow**

When a chargeback is decided in the customer's favor:
- Razorpay reverses the money to the customer
- **The credits we granted are not automatically revoked** in v1

**This creates an obvious friendly-fraud vector:** customer buys plan → spends some credits → disputes the charge → wins → keeps both the money AND the credits.

**Why deferred:**
- v1 doesn't have a chargeback handler at all (spec §3 says chargebacks "go through Razorpay's own dispute process")
- Building credit-revocation in isolation is half a feature
- Better to bundle: when v1.1 builds chargeback handling end-to-end, the credit-revoke fires off the same webhook event (`payment.dispute.won`)

**Implementation when v1.1 lands (proposed):**
- Listen for `payment.dispute.won` webhook event
- Find `PaymentHistory` row by `providerOrderId` / `providerEventId`
- Find lots created by that payment via `CreditTransaction` audit (`refType = 'payment'`, `refId = paymentId`)
- Zero `remaining` on all those lots
- Write `CreditTransaction` with `reason: 'REVERSE_CHARGEBACK'`
- Optional: notify admin via internal channel

**Source:** Doubt #14 walkthrough, flagged 2026-06-29.

---

## 6. Admin support operations

### 6.1 Admin support: manual credit grant

**Decision: 🚩 Flagged for product owner**

Neither functional spec nor tech-design mention any admin tooling for granting credits manually. Real production needs that will hit support:
- Customer paid via Razorpay → webhook failed → credits never granted → customer needs them
- Goodwill grant ("sorry for the outage, here's 5 free post credits")
- Account-merge case (customer has two duplicate accounts, want credits combined into one)

**My proposal (waiting for product owner approval):**

```
POST /api/admin/employers/:id/grant-credits
  Auth: ADMIN
  Body: {
    postCredits?: number,
    downloadCredits?: number,
    source: 'COMP' | 'WEBHOOK_RECOVERY' | 'MANUAL',
    reason: string (5–500 chars),
    expiresAt?: ISO8601                  // null = never expires (like PACK)
  }
  Returns: { lots: CreditLot[], transactions: CreditTransaction[] }
```

**Why this 1 endpoint covers 80% of cases:** webhook recovery (most common support issue), comp credits, goodwill, account-merge (grant merger account's wallet).

**Source:** Doubt #7 walkthrough, flagged 2026-06-29.

---

### 6.2 Admin support: manual credit revocation

**Decision: 🚩 Flagged (via negative grant)**

For the rare case where admin needs to REVOKE credits (e.g., customer admits fraud, admin needs to undo their own mistake), the proposed mechanism is:
- **Same endpoint as 6.1** but with negative values:
  - `{ postCredits: -3, reason: "Customer admitted fraud per case CS-1234" }`
- A negative grant creates a lot with negative `remaining`. Balance still can't go below 0 on spend (existing rule).
- Audit trail naturally captures admin actor + reason in `CreditTransaction`.

**Edge case:** if the customer has only 2 credits and admin revokes 3, the math is: lot A (2 credits) + new lot B (-3 credits) → balance = -1. Spend gate already 402s on balance ≤ 0, so functionally they're at 0. Audit shows the discrepancy explicitly.

**Source:** Doubt #7 walkthrough.

---

## 7. Razorpay refunds outside chargebacks

### 7.1 Not built in v1

**Decision: ❌ Not built — per spec §3**

ProSiddhi does NOT issue voluntary refunds via the Razorpay refund API in v1. Customer requests for refunds (outside chargeback disputes) are not supported through any automated path.

**Workaround for v1 if needed:**
- Customer service triages the request manually
- If approved: Nayan runs a manual SQL script to zero the credits + Razorpay refund triggered manually via Razorpay dashboard
- v1.1 candidate: structured refund flow

**Why deferred:** spec §3 explicitly says "No money-back flow in v1." Building voluntary refunds opens a customer-service workflow that needs PM + legal + finance input — bigger than v1 scope.

---

## 8. Open questions / cross-references

This doc captures decisions on delete/refund. Other open monetization questions live in their original threads:

| Doubt | Status | Owner |
|---|---|---|
| #8 GST registration (launch-gate) | 🚩 Flagged for procurement | Shaik / Nazir |
| #18 GSTIN regex validation | ⏸️ Pending pick (A/B/C/D) | Nazir |
| #20 DPDP — seeker delete + employer unlock | ⏸️ Phase 2 | Phase 2 planning |
| #23 Phase 1 pricing page advertises Phase 2 search | ⏸️ Pending pick | Nazir |

See the doubts walkthrough for full context on each.

---

## 9. Update protocol

This is a derivative doc — when the source docs change, this needs an update:

| Source change | Update this doc |
|---|---|
| Functional spec §3 grace/safeguard/refund row changes | §3 + §4 of this doc |
| Tech-design §4 cron / delete-refund logic changes | §3.1 + §4.3 of this doc |
| New ticket adds admin grant endpoint | §6 of this doc + status flip from 🚩 to 🔒 |
| Phase 2 ticketing for unlocks lands | §2.2 of this doc — flip from ⏸️ to 🔒 with the picked option |
| v1.1 chargeback work begins | §5.2 of this doc — flip from 🚩 to 🔒 |

---

## 10. Quick reference — what causes a credit to come back?

| Event | Credit returned? |
|---|---|
| Job deleted within 24h, 0 applications | ✅ Yes (1 POST credit) |
| Job deleted after 24h | ❌ No |
| Job deleted with 1+ application (even if withdrawn) | ❌ No |
| Job marked FILLED / CLOSED | ❌ No |
| Job auto-INACTIVE at 30-day expiry | ❌ No |
| Job auto-INACTIVE at plan-expiry-grace | ❌ No |
| Employer soft-deleted (NC-9) | ⏸️ Credits frozen (not returned, but preserved if restored) |
| Plan expires | ❌ No (subscription credits forfeited; pack credits persist) |
| Plan reactivation | ❌ N/A (no reactivation in v1) |
| Razorpay chargeback wins | 🚩 v1.1 (proposed: zero all lots from that payment) |
| Admin manual grant | ✅ Yes (positive grant via flagged endpoint) |
| Admin manual revoke | ✅ Yes (negative grant — reduces wallet) |
| Customer requests voluntary refund | ❌ Not built in v1 (manual workaround via Nayan + Razorpay dashboard) |
