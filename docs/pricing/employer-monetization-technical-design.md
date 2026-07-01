# Employer Monetization — Technical Design

**Status:** Design (decisions locked 2026-06-29) · **Audience:** FE-Claude, BE-Claude, mobile dev (the *how*)
**Companion:** [employer-monetization-functional-spec.md](./employer-monetization-functional-spec.md) (the *what/why* — rules & journeys)
**Repos:** `prosiddhi-backend` (Express 5 + Prisma + PostgreSQL), `prosiddhi-frontend` (Next.js app-router), `prosiddhi-mobile-app` (Flutter)

> Builds **on top of** the partial subscription schema shipped in PJP-74. Every rule cited here (expiry, merge,
> grace, trial, …) is defined in the Functional Spec §3 — this doc only says how to implement them.

---

## 1. Architecture — the per-lot credit ledger (the spine)

Do **not** model credits as two integers on the employer. Model each grant as a **lot** with its own kind, source
and expiry; spend draws from lots in expiry order. This makes FSD rules #1/#4/#5/#6/#10/#12 + the trial all the
*same* mechanism instead of special cases.

```
CreditLot {
  id            uuid
  employerId    uuid            // owning employer (org), not the seat user
  kind          POST | DOWNLOAD
  source        TRIAL | SUBSCRIPTION | PACK
  granted       int             // original amount
  remaining     int             // decremented on spend; never < 0
  expiresAt     DateTime?       // null = never expires (PACK). SUBSCRIPTION/TRIAL = set.
  planCode      string?         // SKU that granted it (for audit/merge)
  createdAt     DateTime
  @@index([employerId, kind, expiresAt])
}

CreditTransaction {           // append-only audit of every grant & spend
  id          uuid
  employerId  uuid
  lotId       uuid?           // which lot was drawn (spend) or created (grant)
  kind        POST | DOWNLOAD
  delta       int             // +granted / -1 spent / +1 refund
  reason      GRANT_TRIAL | GRANT_PURCHASE | SPEND_POST | SPEND_UNLOCK | REFUND_DELETE | EXPIRE
  refType     string?  refId  string?   // e.g. jobId, candidateId, paymentId
  createdAt   DateTime
}
```

**Balance(kind)** = `sum(remaining)` over the employer's lots where `expiresAt is null OR expiresAt > now`.
**Wallet expiry** (shown to user) = `max(expiresAt)` over non-null SUBSCRIPTION/TRIAL lots (the "single expiry"
of the merge rule); PACK lots display as non-expiring.
**Spend(kind):** select non-expired lots with `remaining > 0` ordered by `expiresAt ASC NULLS LAST`, decrement the
first, write a `CreditTransaction`. Reject (and the gate 402s) if total balance is 0.

### Merge rule (FSD #10) — no proration
Buying a plan never mutates existing lots' amounts. The "single expiry" is **derived** at read time as the max
across active subscription lots — so two plans automatically present as one wallet with one (latest) date. Nothing
to reconcile, no proration code. Seat cap = `max(plan.seats)` across active subscription lots.

---

## 2. Schema deltas (Prisma) — reuse what PJP-74 shipped

**Reuse as-is:** `SubscriptionPlan`, `Subscription`, `PaymentHistory` (has `amountInr`, `gstInr`,
`providerOrderId`, `providerEventId`, status), `WebhookEvent` (idempotency), `User.subscriptionTier`.

**Add / change:**
- **`SubscriptionPlan`** — extend with `postCredits int`, `downloadCredits int`, `seats int`, `durationDays int?`
  (null = pack/one-shot), `group` (PACK|STARTER|PRO), `baseInr` (rename/confirm vs `priceInr`; GST computed, not stored on the plan). Re-seed the **8 SKUs** (replace the 2 placeholder rows in `prisma/seed.ts`).
- **`CreditLot`**, **`CreditTransaction`** — §1.
- **`Invoice`** — `{ id, employerId, paymentId, number (sequential series), gstin?, placeOfSupply, baseInr, cgstInr, sgstInr, igstInr, totalInr, pdfPath, createdAt }`.
- **`Job`** — add `liveUntil DateTime` (publish + 30d) so the per-job window is independent of plan duration.
- **Phase 2:** `EmployerCandidateUnlock { employerId, candidateId, unlockedAt, @@unique([employerId, candidateId]) }` (dedupe so re-view is free).
- **Phase 3:** `EmployerUser { id, employerId, userId, role (OWNER|MEMBER), invitedAt, acceptedAt? }`; migrate `User↔Employer` 1:1 → **1:N** (backfill each existing employer's user as the OWNER seat); `Employer.brandingEnabled boolean @default(false)` (no-op flag, forward-compat).

Migration: additive; the 1:N seat change (P3) needs the owner-backfill data migration — gate behind Phase 3.

---

## 3. API contracts

### Phase 1 — posting monetization
| Method · Path | Body / Query | Returns | Notes |
|---|---|---|---|
| `GET /api/plans` | — | `[{ code, group, name, baseInr, gstPct:18, postCredits, downloadCredits, seats, durationDays }]` | public; powers pricing page |
| `GET /api/employers/me/credits` | auth(employer) | `{ post:{balance,expiresAt}, download:{balance,expiresAt}, packNeverExpires:bool, seats }` | the wallet |
| `POST /api/billing/checkout` | `{ planCode, gstin? }` | `{ razorpayOrderId, keyId, amountInr (base+GST), invoicePreview }` | creates Razorpay order; persists pending `PaymentHistory` |
| `POST /api/webhooks/razorpay` | Razorpay event | `200` | **verify signature**; idempotent via `WebhookEvent.eventId`; on `payment.captured` → grant lots, mark `PaymentHistory` SUCCESS, generate `Invoice` |
| `GET /api/employers/me/invoices` | auth | `[Invoice]` + PDF links | purchase history |

### Phase 2 — candidate database
| `GET /api/candidates` | filters (trade, location, experience, skills, page) | snippet results (no contact) | free tier allowed; snippets only |
| `POST /api/candidates/:id/unlock` | auth | `{ unlocked:true }` | **spend 1 download** (dedupe via `EmployerCandidateUnlock`); explicit-confirm on FE |
| `GET /api/candidates/:id` | auth | full profile + contact **iff** unlocked | 402 if locked & no credits |

### Phase 3 — seats
| `POST /api/employers/me/seats` (invite) · `GET/DELETE /api/employers/me/seats/:id` | OWNER only | roster mgmt | cap = active plan seats |

---

## 4. Gates, crons, and touch-points in existing code

- **Post gate** — in `job.service.ts` `createJob` (currently gates only `accountStatus !== 'ACTIVE'`,
  `job.service.ts:21-23`): after that check, `spendCredit('POST')`; if balance 0 → throw a typed `NoCreditsError`
  → controller returns **402**. Set `job.liveUntil = now + 30d`.
- **Unlock gate** — candidate full-profile/unlock path: `spendCredit('DOWNLOAD')` with dedupe.
- **Delete-refund** — in delete-job path: refund 1 POST lot (`+1`, `REFUND_DELETE`) **only if** `applicationCount == 0 && now - postedAt < 24h`.
- **Trial grant** — in `auth.service.ts` employer registration (`registerEmployerIndividual` / `registerEmployerBusiness`): once per verified identity, `grantLots(TRIAL, post:1 download:3, expiresAt: now+14d)`.
- **Expiry/grace cron** — daily: lots past `expiresAt` stop counting (read-time, automatic); jobs whose owning
  employer has no active plan **and** is past the **3-day grace** → set `status=INACTIVE`; jobs past `liveUntil` → INACTIVE.
- **Admin revenue** — replace the hardcoded `subscriptionPrice = 500` (`admin.controller.ts:1419`) with a sum over `PaymentHistory` (status SUCCESS).

---

## 5. Razorpay + GST

- Add `razorpay` SDK + `RAZORPAY_KEY_ID/SECRET` env (BE) and the checkout SDK (FE/mobile). **Test mode** for dev/demo.
- **Order:** `POST /billing/checkout` computes `total = base + round(base*0.18)`, creates a Razorpay order, stores a pending `PaymentHistory{ providerOrderId, amountInr, gstInr }`.
- **Webhook is the source of truth** (not the client callback): verify `X-Razorpay-Signature`; idempotent via `WebhookEvent.eventId`; on capture → grant lots + flip `PaymentHistory` + generate `Invoice`.
- **GST invoice:** sequential `number`; **place of supply** decides CGST+SGST (intra-state) vs IGST (inter-state); optional buyer `gstin`; render PDF, email it. Requires ProSiddhi GST registration (launch-gate).

---

## 6. Frontend (web) — `prosiddhi-frontend`

- **`subscriptionAPI`** in `src/lib/api.ts`: `getPlans`, `getCredits`, `checkout`, `getInvoices` (+ P2 `searchCandidates`, `unlockCandidate`).
- **Pricing page** *(demo carve-out)* — replace the ₹250/₹0 cards in `src/app/employer/welcome/page.tsx` with the 8
  tiers grouped Pack/Starter/Pro, base price **+ "18% GST"**, free-tier + "workers free forever". i18n via the
  existing `employer.json` `pricing` namespace (extend it). Buy buttons stub ("Coming soon") until checkout lands.
- **Checkout** — Razorpay web SDK; optional GSTIN field; success → wallet refresh.
- **Credit wallet** — post/download balances + expiry on `src/app/employer/page.tsx` (dashboard).
- **Post-flow gate** — in `JobForm` / `src/app/employer/jobs/new`: block at 0 post credits with an upsell to `/employer/welcome` (pricing).
- **Invoices** view; **P2** candidate search + profile + **explicit unlock confirm** (reuse `ContactRecruiterModal` pattern); **P3** seat management.

## 7. Mobile (Flutter) — parity, same phasing
P1 pricing view + Razorpay checkout + wallet + post-gate · P2 candidate search + unlock · P3 seats. Unowned today
(mobile-dev vacancy — **risk**); tickets created for tracking.

---

## 8. Phasing → JIRA mapping

- **EPIC A · Phase 1 (Posting Credits + Checkout)** — BE: plan-catalog+`/plans` · lot-ledger+txns · Razorpay order · webhook(idempotent) · GST-invoice+GSTIN · post-gate · per-job 30d window · expiry/grace cron · delete-refund(guarded) · wallet endpoint · trial grant · free-tier · admin-revenue-from-ledger. FE-web: pricing page **[DEMO]** · checkout · wallet UI · post-gate/upsell · invoices · i18n. MOB: pricing · checkout · wallet · post-gate.
- **EPIC B · Phase 2 (Candidate DB + Unlocks)** — BE: candidate search+snippets · unlock+dedupe · DPDP review. FE-web: search UI · profile+explicit-unlock+contact. MOB: parity.
- **EPIC C · Phase 3 (Seats + Polish)** — BE: `EmployerUser` + 1:N migration + invites/roles. FE-web: seat mgmt. MOB: parity. v1.1 backlog: bulk packs · download-only top-up · proration · promo codes · TDS.

Labels: `monetization`, `role-be|role-fe|role-mobile`, `phase-1|2|3`. Each story → its FSD rule + this doc's section.

---

## 9. Verification / test plan

- **Ledger unit tests:** grant/spend/expiry-order (NULLS LAST), merge (two plans → one derived expiry), zero-block, refund window, expire-at-read.
- **Razorpay:** test-mode order + **webhook replay** (same `eventId` twice → granted once); signature-fail → no grant.
- **Gates (integration):** publish decrements 1; 0 → 402; delete <24h/no-apps → refund; unlock dedupe (2nd view free).
- **Revenue:** admin total reconciles to `sum(PaymentHistory SUCCESS)`.
- **E2E:** trial (1 post/3 unlock) → buy Starter-1M → publish 3 → 4th blocked → buy ₹499 pack → publish → delete <24h → credit back → let plan expire → 3-day grace → jobs INACTIVE → pack credit still usable.
