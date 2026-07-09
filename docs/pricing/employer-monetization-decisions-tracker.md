# Employer Monetization — Decisions Tracker

**Status:** Working scoreboard · **Owner:** Nazir (PM) · **Audience:** BE/FE/mobile/QA/Shaik
**Companion docs (source of truth):**
- [employer-monetization-functional-spec.md](./employer-monetization-functional-spec.md) — what & why
- [employer-monetization-technical-design.md](./employer-monetization-technical-design.md) — how (schema, APIs)
- [employer-monetization-delete-refund-spec.md](./employer-monetization-delete-refund-spec.md) — deeper dive on every delete/refund rule

**Date:** 2026-06-29

> **Why this doc exists:** the 2 source docs left ~17 things unspecified or ambiguous. We walked through each in a "doubts" session and locked decisions. This is the single tracker so devs / Shaik can scan everything at once instead of digging through chat logs.

---

## 0. Status legend

| Symbol | Meaning |
|---|---|
| 🔒 | **Locked** — decision made during the doubts walkthrough, ready to code against |
| ✅ | **In source docs** — already explicitly written in the functional spec or tech design |
| ⏸️ | **Pending** — waiting on a decision (mine to recommend, yours/Shaik's to approve) |
| 🚩 | **Flagged** — external dependency or deferred to v1.1; not blocking Phase 1 BE |
| ❌ | **Out of scope** — explicitly not in v1 per the source docs |

---

## 1. Scoreboard — every decision at a glance

| # | Topic | Status | One-line decision |
|---|---|---|---|
| 1 | Trial keying for business employer | 🔒 | Trial granted at `accountStatus → ACTIVE`. Dedupe key = verified phone/email for individual, verified GSTIN for business (per spec §2.4's "GST for business"). |
| 2 | Seat downgrade behavior (Pro→Starter) | 🔒 | Auto-suspend over-cap members deterministically (owner protected, newest-first), with mandatory 3-surfacing (member banner + owner banner + specific 402) — **Phase 3** |
| 3 | Refresh of 30-day job window in v1 | 🔒 | NO refresh feature in v1; (refreshable) parenthetical is v1.1 paid feature |
| 4 | Credit fate on employer soft-delete (NC-9) | 🔒 | FREEZE credits (preserved, not spendable). Restore brings them back. |
| 5 | Trial 14-day clock start | 🔒 | Starts when `accountStatus → ACTIVE`. Individual: at email-verify. Business: at admin-approval. Both get a full 14 days from the moment they can actually use the product. |
| 6 | Individual vs business pricing | 🔒 | SAME 8-tier pricing for both |
| 7 | Admin customer-service powers (grant/revoke credits) | 🚩 | Flagged for product owner — not in docs. Proposal: 1 endpoint `POST /api/admin/employers/:id/grant-credits` covering 80% of cases (webhook recovery, comp, account-merge) |
| 8 | GST registration ownership / status | 🔒 | Azkashine (the legal entity) is GST-registered. ProSiddhi is the product brand. Invoices issue from Azkashine using its GSTIN. BE reads `COMPANY_GSTIN` / `COMPANY_GST_STATE` / `COMPANY_NAME` from env vars — actual values plugged in at deploy time. |
| 9 | Concurrency on credit spend (race condition) | 🔒 | Atomic `updateMany` with `where: { remaining: { gt: 0 } }` + retry loop on `count === 0`. Pure Prisma, no raw SQL, no SERIALIZABLE. |
| 10 | Plan-expiry vs 30d job window — which fires first? | ✅ | Whichever fires first INACTIVATEs the job (tech-design §4) |
| 11 | "No applications" definition for delete-refund | ✅ | `applicationCount === 0` — withdrawn rows still count (tech-design §4) |
| 12 | Webhook event handling | ✅ | `payment.captured` is the trigger event (tech-design §5) |
| 13 | Place of supply for GST calculation | 🔒 | Derived from buyer's GSTIN first 2 digits if provided; fallback state dropdown at checkout for non-GSTIN buyers. Stored on `Invoice.placeOfSupply`. Env var `COMPANY_GST_STATE` (Azkashine's home state, derived from `COMPANY_GSTIN`) for comparison anchor. |
| 14 | Chargeback credit revocation | 🚩 | Flagged for v1.1 — bundle with chargeback money flow. Proposal: zero all lots from charged-back payment via `payment.dispute.won` webhook. |
| 15 | Invoice number format | 🔒 | `INV/YY-YY/NNNNNN` Indian FY convention (resets each April). 6-digit sequence via `InvoiceSeq` counter table for concurrency. |
| 16 | `priceInr` vs `baseInr` on SubscriptionPlan | 🔒 | RENAME `priceInr` → `baseInr`. Apply during Phase 1 build, not now. Blast radius: 6 hits in 3 BE files, 0 in FE/mobile. |
| 17 | Job FILLED/CLOSED — refund credits? | ✅ | NO. Only `delete-within-24h-with-0-apps` refunds (spec §3 by absence) |
| 18 | GSTIN format validation at checkout | 🔒 | Regex-validate (Option C) — 15-char Indian format, auto-uppercase, reject 400 on bad format |
| 19 | Pack credits retention (forever) | ✅ | Spec §3 confirms PACK lots never expire. No archival policy in v1. Not a doubt — flagged earlier mistakenly. |
| 20 | DPDP — seeker deletes account, employer's unlock behavior | 🚩 | Deferred to Phase 2 implementation. Options A/B/C documented for when Phase 2 ticketing begins. |
| 21 | Mobile dev owner for Phase 1 Flutter parity | 🚩 | Org issue — flagged in tech-design §7 already. Not a BE concern. |
| 22 | Existing PJP-74 Subscription rows backfill | ✅ | Safe — no real Subscription rows exist (PJP-75/76 paused). Schema additive migration is enough. |
| 23 | Phase 1 pricing page advertises Phase 2 search | 🚩 | Being handled by product owner — out of BE scope. |

**Net (FINAL, all 23 doubts resolved):** 11 🔒 locked · 6 ✅ already-in-docs · 0 ⏸️ pending · 5 🚩 flagged for product owner / external · 1 org-issue

---

## 2. Trial & onboarding (#1, #5, #6)

### 2.1 Trial 14-day clock starts at account activation
🔒 **Locked**
- Individual employer: clock starts when `accountStatus → ACTIVE` (at email-verify)
- Business employer: clock starts when `accountStatus → ACTIVE` (at admin approval of documents)
- Both employer types get a full 14 days from the moment they can actually use the product

**Source:** Doubt #5 (revised).

### 2.2 Trial dedupe key
🔒 **Locked**
- Dedupe key at grant time uses the VERIFIED identity (since grant happens at activation, verification has occurred by then)
- Individual: verified phone/email (per spec §2.4)
- Business: verified GSTIN (per spec §2.4's "GST for business")

**Implementation note for PJP-174:** *Trial grant hook lives in (a) `verifyEmailOtp` flow end for individual, (b) `approveEmployer` flow end for business. Dedupe by verified phone/email or GSTIN at grant time.*

**Source:** Doubt #1 + #5 reconciled.

### 2.3 Individual vs business employers — same 8-tier pricing
🔒 **Locked**
- Both employer types pay the same 8 plan SKUs
- Both get the same trial (1 post + 3 unlocks, 14 days)
- No special pricing tier for individuals

**Source:** Doubt #6.

---

## 3. Seat management — Phase 3 only (#2)

### 3.1 Seat downgrade — auto-suspend over-cap members
🔒 **Locked** (for Phase 3 implementation)

When `EmployerUser` rows exceed the new seat cap (e.g., 3-seat plan expires, employer buys 1-seat plan):
- Owner is ALWAYS protected (seat #1)
- Newest-invited members are auto-suspended first
- Suspended members keep login + dashboard read access; cannot post jobs / unlock candidates

**Mandatory surfacing (must ship together — without these the rule is "invisible"):**
1. Banner on suspended member's dashboard: *"Your seat is suspended because your org's current plan doesn't include enough seats. Contact your org owner to upgrade."*
2. Banner on owner's dashboard when org has ≥1 suspended member: *"You have N suspended team member(s). Upgrade to give them access back."*
3. 402 error on suspended member's POST/unlock attempts: *"Your seat is suspended. Ask your org owner to upgrade the plan."*

**Auto-restore on upgrade:** if owner buys a higher-seat plan, suspended members in invite-order are restored until cap is met.

**Implementation timing:** **Phase 3** (per tech-design §8 EPIC C — `EmployerUser` table doesn't exist until Phase 3 anyway).

**Source:** Doubt #2.

---

## 4. Credit ledger (#9, #16)

### 4.1 Concurrency on credit spend — atomic updateMany + retry
🔒 **Locked**

```ts
async function spendCredit(employerId, kind) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = await prisma.creditLot.findFirst({
      where: { employerId, kind, remaining: { gt: 0 }, /* not expired */ },
      orderBy: { expiresAt: 'asc' },
    });
    if (!candidate) throw new NoCreditsError();

    const result = await prisma.creditLot.updateMany({
      where: { id: candidate.id, remaining: { gt: 0 } },  // ← atomic lock
      data: { remaining: { decrement: 1 } },
    });

    if (result.count === 1) {
      // Wrap in transaction so audit log is atomic with the spend
      await prisma.creditTransaction.create({ /* ... */ });
      return;
    }
    // Retry — someone else took it
  }
  throw new Error('Could not spend credit after retries');
}
```

**Why:** prevents the "balance=1, two simultaneous posts both succeed" race. The `where: { remaining: { gt: 0 } }` clause IS the atomicity guarantee — PostgreSQL row-level locking handles it. No raw SQL needed. No SERIALIZABLE isolation overhead.

**Implementation note for PJP-166:** *Use the atomic `updateMany` pattern above. Do NOT use `findFirst` + `update` (race condition).*

**Source:** Doubt #9.

### 4.2 `priceInr` → `baseInr` rename
🔒 **Locked** (apply during Phase 1 build)

- Rename `SubscriptionPlan.priceInr` to `SubscriptionPlan.baseInr` to match the new semantic (base price, GST-exclusive)
- GST computed at checkout, never stored on the plan
- Blast radius (verified by grep): 6 hits in 3 BE files (`schema.prisma`, `seed.ts`, `scripts/PJP-74-verify.ts`). Zero FE/mobile/API_DOC hits.

**Implementation note for PJP-165:** *The `base price` field mentioned in the ticket is the rename of `priceInr` to `baseInr`. Do NOT add a new column alongside the old one.*

**Source:** Doubt #16.

---

## 5. Plan lifecycle (✅ all in source docs)

| Item | Decision | Source |
|---|---|---|
| Cancel button | ❌ No cancel — plans run to expiry | Spec §3 |
| Money refunds | ❌ None in v1 (Razorpay disputes only) | Spec §3 |
| Expiry → 3-day grace → INACTIVE | ✅ Cron at day 3 marks jobs INACTIVE; unlocked candidates retained | Spec §3 + tech-design §4 |
| Subscription credits at expiry | ❌ Forfeit (lots' `expiresAt` passes, excluded from balance reads) | Spec §3 |
| Pack credits | ✅ Persist forever (`expiresAt: null`) | Spec §3 |
| Plan reactivation | ❌ None — must buy fresh | Spec §3 |

For deeper details: [employer-monetization-delete-refund-spec.md §4](./employer-monetization-delete-refund-spec.md).

---

## 6. Job operations (#3, #10, #11, #17)

| Item | Decision | Source |
|---|---|---|
| 30-day live window expiry | 🔒 Auto-INACTIVE at day 30, no refresh in v1 | Doubt #3 |
| Plan-expiry vs 30d window | ✅ Whichever fires first INACTIVATEs | Tech-design §4 |
| Delete-refund eligibility | ✅ Within 24h + `applicationCount === 0` → 1 POST credit back | Spec §3 + tech-design §4 |
| "No applications" semantics | ✅ Zero rows (withdrawn still counts) | Tech-design §4 |
| FILLED / CLOSED refund | ✅ NO — only delete triggers refund | Spec §3 (by absence) |

For deeper details: [employer-monetization-delete-refund-spec.md §3](./employer-monetization-delete-refund-spec.md).

---

## 7. Account-level deletes (#4, #20)

### 7.1 Employer soft-delete (NC-9) — freeze credits
🔒 **Locked** — Option B (freeze, preserve)

- Credits preserved in DB on soft-delete
- Balance reads as 0, spend functions reject
- Restore brings credits back
- PACK lots survive intact

Full detail: [employer-monetization-delete-refund-spec.md §2.1](./employer-monetization-delete-refund-spec.md).

### 7.2 Seeker delete — does employer's unlock survive?
⏸️ **Pending — Phase 2 concern**

Three options (A: hard-delete data → unlock card blank · B: snapshot contact at unlock time · C: hybrid "User deleted" + no contact). Not blocking Phase 1.

**Action:** surface to product owner + legal before Phase 2 ticketing.

**Source:** Doubt #20.

---

## 8. GST & invoicing (#8, #13, #15, #18)

### 8.1 GST registration ownership
🚩 **Flagged — launch gate for procurement**

Phase 1 can build everything EXCEPT actual invoice issuance (which legally requires GSTIN) until this lands. Three operational options once status is known:
- ProSiddhi GST-registered → ship invoicing on-rails
- Not yet → ship Phase 1 with `GST_ENABLED=false` env var; flip on when registration lands
- Hold Phase 1 launch entirely until registered

**Source:** Doubt #8.

### 8.2 Place of supply for GST calculation
🔒 **Locked** — Option B

- Buyer's GSTIN provided → state derived from first 2 digits (e.g., `29` = Karnataka)
- Buyer's GSTIN NOT provided → state dropdown at checkout
- Both paths store the resolved state on `Invoice.placeOfSupply`
- Env var `PROSIDDHI_GST_STATE` = comparison anchor for intra-state (CGST+SGST) vs inter-state (IGST)

**Implementation note for PJP-169:** *Place of supply derivation: parse first 2 digits of GSTIN if provided; otherwise read from `checkoutBody.placeOfSupply` (dropdown). Compare to `process.env.PROSIDDHI_GST_STATE` to decide CGST+SGST vs IGST.*

**Source:** Doubt #13.

### 8.3 Invoice number format
🔒 **Locked** — Indian GST convention

Format: `INV/YY-YY/NNNNNN`
- Examples: `INV/26-27/000001`, `INV/27-28/000001` (sequence resets at April 1)
- Exactly 16 chars (legal max for GST invoice numbers)
- 6-digit sequence per Indian financial year (April-March)
- Concurrency: `InvoiceSeq { fy String @id, lastUsed Int }` table with atomic updateMany increment (same pattern as #9)

**Implementation note for PJP-169:** *Use `InvoiceSeq` counter table with atomic updateMany increment. Compute current FY via `month >= 3 ? year : year - 1`. Format with `padStart(6, '0')`.*

**Source:** Doubt #15.

### 8.4 GSTIN format validation
⏸️ **Pending — recommended Option C (regex)**

Indian GSTIN format:
```
^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
```
15 chars, fixed structure. State code in first 2 digits.

**Recommendation: Option C** — regex-validate in Zod with `.toUpperCase()` normalization. Reject 400 on invalid format with friendly message. Couples cleanly with #13 (place of supply derivation needs valid GSTIN format).

**Implementation note for PJP-167 + PJP-169 (if locked):** *Add `gstin` field to checkout Zod schema with regex validation + auto-uppercase. Reject 400 on invalid format.*

**Awaits your call:** A (no validation) / B (length only) / C (regex — recommended) / D (regex + GSTN API).

**Source:** Doubt #18.

---

## 9. Chargebacks & refunds (#14)

### 9.1 Chargeback money handling
✅ **In spec §3** — handled by Razorpay's dispute process. BE does not initiate or auto-decide.

### 9.2 Chargeback credit revocation
🚩 **Flagged for v1.1** — bundle with chargeback money flow.

Without this, friendly-fraud vector exists: customer buys plan → spends credits → wins dispute → keeps money + credits.

**Proposed implementation for v1.1:**
- Listen for `payment.dispute.won` webhook event
- Find lots from that `paymentId` via `CreditTransaction` audit chain
- Zero `remaining` on those lots
- Write `CreditTransaction` with `reason: 'REVERSE_CHARGEBACK'`

Full detail: [employer-monetization-delete-refund-spec.md §5.2](./employer-monetization-delete-refund-spec.md).

**Source:** Doubt #14.

### 9.3 Voluntary refunds (not chargebacks)
❌ **Not built in v1** — spec §3 explicitly. Workaround: customer service triages manually; Nayan runs SQL + Razorpay dashboard refund.

---

## 10. Admin support (#7)

🚩 **Flagged for product owner**

Real production needs neither doc addresses:
- Failed Razorpay webhook → customer paid but didn't get credits → support needs to grant manually
- Goodwill credit grants
- Account-merge cases

**Proposed: 1 endpoint** `POST /api/admin/employers/:id/grant-credits` with body `{ postCredits?, downloadCredits?, source, reason, expiresAt? }`. Covers ~80% of cases. Negative values revoke (for fraud/correction).

Full detail: [employer-monetization-delete-refund-spec.md §6](./employer-monetization-delete-refund-spec.md).

**Source:** Doubt #7.

---

## 11. Phase coordination (#23)

### 11.1 Phase 1 pricing page advertises Phase 2 search
⏸️ **Pending — recommended Option A**

Functional spec §2.3 describes a free-tier benefit: *"search the candidate database, see snippet results."* But candidate search is **Phase 2**, not Phase 1.

If Phase 1 pricing page advertises search → bad first impression when employer can't actually search.

**Recommendation: Option A** — Phase 1 pricing page omits the search claim. Add it when Phase 2 ships. Tech-design §6 marks the pricing page as `[DEMO]` anyway, so this is consistent.

**Awaits your call:** A (omit search claim) / B (coming-soon stub) / C (delay Phase 1 with Phase 2).

**Source:** Doubt #23.

---

## 12. Other items (#19, #21, #22 — non-doubts)

| # | Item | Why not a real doubt |
|---|---|---|
| 19 | Pack credits never expire | Spec §3 explicit. No archival policy in v1, accepted. |
| 21 | Mobile dev owner for Phase 1 | Org/staffing issue, not a BE design concern. Already flagged in tech-design §7. |
| 22 | Existing PJP-74 Subscription rows backfill | No real subscriptions exist (PJP-75/76 paused). Schema migration is purely additive. Safe. |

---

## 13. Open items needing your input

**All 23 original doubts resolved 2026-06-29.** Two re-opens have since been **closed** (2026-07-07), and four new
seat decisions locked — see **§17**.

- **#20 (DPDP — seeker deletes account, employer's paid unlock) — 🔒 NOW LOCKED.** Phase 2 shipped, so this came due.
  **Decision: Option C (hybrid).** The `EmployerCandidateUnlock` row **persists** (audit + credit history — the
  employer did spend a credit), but the platform **stops serving the contact fields**; the card reads *"This candidate
  is no longer available."* **No refund** (consistent with no-refunds-in-v1). Because seeker delete is **soft-delete
  (NC-9)**, a restore brings the candidate back — symmetric with the "freeze, preserve" rule for employer soft-delete (#4).
  *Rejected Option B (snapshot the contact and keep serving it): weakest DPDP posture — we'd keep supplying personal
  data after an erasure request. Commercial fairness is already covered by not clawing back the credit.*
- **#23 (pricing page advertising Phase-2 search) — ✅ CLOSED.** Phase 2 shipped; candidate search exists, so the
  pricing page may advertise it.
- **#7, #8, #14** remain 🚩 flagged for the product owner (admin credit tooling · GST registration/launch gate · chargeback credit-revocation).

---

## 14. Implementation notes to add to specific Jira tickets

When Phase 1 dev starts, these notes should land as Jira comments on the matching tickets:

| Ticket | Implementation note |
|---|---|
| **PJP-165** | "Base price" = RENAME `priceInr` → `baseInr`. Do NOT add a new column alongside. Per Doubt #16. |
| **PJP-166** | Use atomic `updateMany` + retry pattern for `spendCredit`. NO raw SQL, NO SERIALIZABLE. Per Doubt #9. |
| **PJP-167** | GSTIN field validates via regex (15-char Indian format, auto-uppercase). Reject 400 on bad format. Per Doubt #18 (assuming C locked). |
| **PJP-169** | Place of supply derivation: GSTIN first-2-digits if provided; checkout dropdown otherwise. Stored on `Invoice.placeOfSupply`. Env var `PROSIDDHI_GST_STATE` for comparison anchor. Per Doubt #13. |
| **PJP-169** | Invoice number format: `INV/YY-YY/NNNNNN` Indian FY-based, sequence resets each April. Use `InvoiceSeq` counter table for concurrency. Per Doubt #15. |
| **PJP-174** | Trial granted when `accountStatus → ACTIVE`. Individual: hook into `verifyEmailOtp` flow. Business: hook into `approveEmployer` flow. Dedupe by VERIFIED phone/email (individual) or VERIFIED GSTIN (business). Per Doubt #5 + #1. |

---

## 15. Cross-references

| For deeper detail on... | See |
|---|---|
| What the customer experiences | [employer-monetization-functional-spec.md](./employer-monetization-functional-spec.md) |
| Schema + endpoint + service shape | [employer-monetization-technical-design.md](./employer-monetization-technical-design.md) |
| Every delete/refund/soft-delete rule end-to-end | [employer-monetization-delete-refund-spec.md](./employer-monetization-delete-refund-spec.md) |
| BR-3 mobile changes (if mobile needs to consume new taxonomy) | [BR-3-mobile-handoff.md](./BR-3-mobile-handoff.md) |

---

## 16. Update protocol

When a pending doubt is locked → update §1 scoreboard + the relevant topic section + §13 + §14 (if a ticket note is needed).
When a source doc changes → re-check ✅ rows in §1 to ensure they still match.
When v1.1 work starts on chargebacks / admin tools → flip 🚩 rows to 🔒 with proposed implementation.
When Phase 2 ticketing begins → resolve ⏸️ Phase 2 items.

---

## 17. Seats (Phase 3) — decisions locked 2026-07-07

Raised by Asrar while building seats. **Context:** as built, seats are **roster-only** — `User↔Employer` is still
1:1, `Subscription`/`PaymentHistory` are keyed by `userId`, so each teammate has their own Employer row and **own
wallet**. A Pro 2/3-seat plan therefore delivers no shared value today. S1/S2 below make seats real.

| # | Topic | Status | Decision |
|---|---|---|---|
| S1 | Seat scope: shared workspace vs private lists | 🔒 Locked | **Shared company workspace** |
| S2 | Removed teammate's jobs + unlocks | 🔒 Locked | Stay with the company, permanently |
| S3 | Stacking plans + seat-cap computation | 🔒 Locked | Stacking **is** supported; seat cap = `MAX(seats)` — current code is a **bug** |
| S4 | Invite flow | 🔒 Locked | Must become one guided flow (token survives auth, auto-accept) |

### S1 — Shared company workspace (not private lists)
The **org** owns jobs, unlocks and credits; a seat only answers *"may this user act for this employerId?"*
Not really a choice: the unlock dedupe key is `@@unique([employerId, jobSeekerId])`, so private lists would charge a
second teammate for a candidate the company already unlocked — contradicting the locked *"re-view is free"* rule.

**Implementation:** never put `userId` into an authorization/scoping predicate. Add an `EmployerUser` membership
table (`User↔Employer` → **1:N**), re-key `Subscription` + `PaymentHistory` to **`employerId`**, and route every
employer-scoped controller through one `resolveEmployerContext(userId) → { employerId, role, seatStatus }`.
Attribution is **additive, not authorization**: `Job.createdByUserId`, `EmployerCandidateUnlock.unlockedByUserId`
(display "posted by X"; never gate on it). Roles: **OWNER** (invite/remove, buy plans) vs **MEMBER** (post, unlock,
manage). Exactly one OWNER per employer.

### S2 — A removed teammate's work stays with the company
Removal revokes **access only**. Jobs stay live under the org; unlocked candidates stay unlocked for the org.
Nothing deleted, reassigned, or refunded (credits came from the company's pool; "no refunds in v1").
Implement as a **soft-revoke** (`status: ACTIVE|SUSPENDED|REMOVED` + `removedAt`) so attribution and audit don't
dangle. Never cascade from user → `Job` / `EmployerCandidateUnlock` / `CreditTransaction`. No `CreditTransaction` is
written on removal. OWNER cannot be removed. Re-invite reactivates the existing row. Removal frees a seat.

### S3 — Stacking is supported; the seat cap is a bug
Stacking is locked (Point 4/10, and `pricing-rules.md`: *"If seat counts differ, the **higher** seat count applies"*).
The bug: `team.service.ts:63-74` `getSeatsFromPlan()` uses `findFirst(… orderBy: { expiresAt: 'desc' })` and returns
**that** plan's seats — i.e. the *latest-expiring* plan, not the *best* one. **Never pick a plan; aggregate:**

```
activePlans = subscriptions for this EMPLOYER, non-PACK, expiresAt > now()
walletExpiry = MAX(expiresAt)  over activePlans   // correct today
seatCap      = MAX(p.seats)    over activePlans   // BUG: currently seats OF argmax(expiresAt)
               ?? 1                                // no active plan → 1 (owner only)
```
These are two different aggregates over the same set; they coincide only by accident. PACK SKUs contribute **zero
seats**. Free tier/trial → `seatCap = 1` (trial grants credits, not seats). Seat cap follows `expiresAt` strictly
(the 3-day grace governs job visibility, not seats). Put this in one `getEntitlements(employerId)` — no controller
computes seats inline (this is why `Subscription` must be keyed by `employerId`).
**Do NOT block or 4xx a purchase while a plan is active** — that breaks the locked "buy anytime, it stacks" model.
Return an informational `notice` on the checkout response instead. Downgrade aftermath is already locked (#2:
auto-suspend newest-first, OWNER protected, 3 surfacings, auto-restore on upgrade) — enforce at request time **and**
via the daily cron (a plan can expire between runs).

### S4 — Invite must be one guided flow
Today: invitee is bounced to login → registers separately → must click the invite link **again**. Note the irony —
seats exist only on the ₹11,999 / ₹21,999 SKUs, so the roughest flow hits the highest-paying customers.

The fix is redirect/state plumbing, not new screens: the invite token must **survive the auth step**.
`/invite/:token` → if no account, register inline with the email **pre-filled and read-only**; if an account exists,
login inline. Carry the token through auth and **auto-accept on return** — the link is clicked exactly once.
**Guards:** bind the invite to `invitedEmail` (reject a mismatch, 403 — otherwise anyone with the link steals a seat);
single-use + 7-day expiry + owner-revocable; enforce the seat cap at **both invite time and accept time** (the cap can
drop in between); rate-limit invite creation; store the token **hashed**, compare timing-safe.
**Edge to decide:** invitee's email already exists as a `JOB_SEEKER` → reject with *"This email is registered as a job seeker."*
**Minimum stopgap** if time-boxed: pre-fill+lock the email and auto-redirect back to accept after register/login —
that alone removes the double-click.
