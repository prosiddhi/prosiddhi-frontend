# Employer Monetization — Technical Design

**Status:** **AS-BUILT** — Phases 1–3 shipped on BE + FE (verified 2026-07-07; see §0). Decisions locked 2026-06-29. · **Audience:** FE-Claude, BE-Claude, mobile dev (the *how*)
**Companion:** [functional-spec](./employer-monetization-functional-spec.md) (the *what/why*) · [delete-refund-spec](./employer-monetization-delete-refund-spec.md) (reversal rules) · [decisions-tracker](./employer-monetization-decisions-tracker.md) (23-doubt scoreboard + per-ticket impl notes)
**Repos:** `prosiddhi-backend` (Express 5 + Prisma + PostgreSQL), `prosiddhi-frontend` (Next.js app-router), `prosiddhi-mobile-app` (Flutter)

> Builds **on top of** the partial subscription schema shipped in PJP-74. Every rule cited here (expiry, merge,
> grace, trial, …) is defined in the Functional Spec §3 — this doc only says how to implement them.

---

## 0. Implementation status — AS-BUILT (verified against source, 2026-07-07)

**Phases 1, 2 and 3 have all shipped** on `prosiddhi-backend` and `prosiddhi-frontend` (`main` on both). The
sections below (§1–§8) describe the design; this section records what is *actually in the code*, and the two
gaps that are **not** done.

### Backend — live endpoints
| Concern | Endpoint | Auth |
|---|---|---|
| Plan catalog | `GET /api/plans` | public (300s cache) |
| Checkout (Razorpay order) | `POST /api/billing/checkout` | employer |
| **Client-side payment verify** | `POST /api/billing/verify-payment` | employer |
| Razorpay webhook | `POST /api/webhooks/razorpay` | public + HMAC over raw body |
| Credit wallet | `GET /api/employers/me/credits` | employer |
| Invoices list / PDF | `GET /api/employers/me/invoices` · `…/:id/pdf` | employer |
| Candidate search (FTS) | `GET /api/employers/search/workers` | employer |
| Candidate profile (snippet-gated) | `GET /api/employers/candidates/:jobSeekerId` | employer |
| Candidate unlock | `POST /api/employers/candidates/:jobSeekerId/unlock` | employer |
| Unlocked history | `GET /api/employers/me/unlocked-candidates` | employer |
| Team seats | `GET/POST /api/employers/me/team[/invite]` · `POST /api/employers/team/accept-invite` · `DELETE /api/employers/me/team/:seatId` | employer (owner) |
| Taxonomy tree | `GET /api/categories` | public |

**Gates (all live):** `createJob` spends 1 POST credit *before* create → 402 at zero, sets `liveUntil = now+30d`.
`deleteJob` refunds iff `hoursSincePost ≤ 24 && applications == 0` (idempotent, reverses the exact lot).
`unlockCandidate` spends a DOWNLOAD credit and inserts `EmployerCandidateUnlock` **in one transaction**, with
`@@unique([employerId, jobSeekerId])` dedupe — already-unlocked returns `alreadyUnlocked: true`, no spend.

**Crons:** daily 03:00 IST — (1) 30-day job live-window sweep → INACTIVE; (2) plan-expiry + **3-day grace** sweep → INACTIVE.

**Not previously described in this doc (now built):**
- **Postgres FTS search** — jobs via `GET /api/jobs?search=`, workers via `GET /api/employers/search/workers`
  (`tsvector` + `ts_rank_cd` + `pg_trgm` typo fallback; DB-trigger-maintained `search_vector` columns).
- **`WebhookEvent` audit log** — insert-first, unique `eventId`; records *every* Razorpay delivery (incl. refunds/disputes).
- **Two credit-granting paths** — the webhook **and** `verify-payment`. Both share `processCapturedPayment` with an
  atomic `PaymentHistory` claim (`WHERE providerEventId=''`), so they cannot double-grant.
- **Real admin revenue** — `SUM(amountInr) WHERE status='SUCCESS'` from `PaymentHistory` (the ₹500 placeholder is gone).
- Rate limiting: global 500/15min; `candidateRateLimit` 20/min on candidate endpoints.

### Frontend — live routes
`/employer/plans` (+ pricing on `/employer/welcome`) · `/employer/invoices` (list + PDF) · `/employer/workers`
(snippet search + **explicit "use 1 credit to unlock" confirm** + unlocked history) · `/employer/workers/[jobSeekerId]`
· `/employer/team` (+ `/accept`) · credit wallet + expiry nudge on the dashboard · post-credit gate/upsell + top-up modal.
Shared `useCategories()` + `TaxonomyPicker` in **all four** consumers (registration, JobForm, profile, job-feed filter).
i18n complete in **EN and HI**. Checkout verify is time-boxed (15s) so a lost callback cannot double-charge.
**PJP-176 → 181 are all DONE** (including PJP-180 invoices, previously marked deferred).

### ⚠️ Two known gaps — do NOT treat these as done
1. **Seat cap is computed wrong (bug).** `team.service.ts:63-74` `getSeatsFromPlan()` takes the seats of the
   *latest-expiring* active subscription (`findFirst … orderBy: { expiresAt: 'desc' }`) instead of `MAX(seats)`
   across all active plans. This contradicts §1 of this doc *and* `pricing-rules.md` ("the **higher** seat count
   applies"). **Fix: aggregate, never pick a plan.** `walletExpiry = MAX(expiresAt)` and `seatCap = MAX(seats)`
   are two different aggregates over the same set.
2. **Seats are roster-only — there is no shared workspace yet.** `User↔Employer` is still **1:1**
   (`Employer.userId @unique`), and `Subscription` / `PaymentHistory` are keyed by **`userId`, not `employerId`**.
   Each teammate therefore has their **own Employer row and own wallet**, so a Pro 2/3-seat plan does not yet
   deliver shared credits, jobs or unlocks. Making seats real requires: an `EmployerUser` (1:N) membership table,
   re-keying `Subscription`/`PaymentHistory` to `employerId`, and a single `resolveEmployerContext(userId)` helper
   that every employer-scoped controller routes through. See decisions-tracker **S1–S4**.

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

> **AS-BUILT correction:** the Phase-2/3 paths below are the *real* ones (the earlier drafts of this doc guessed
> `/api/candidates/*` and `/api/employers/me/seats/*` — those do not exist). Candidate, team, credit and invoice
> routes are all mounted **inside `employer.routes.ts` under `/api/employers`**. Also built: `POST /api/billing/verify-payment`
> (client-side verify, a second credit-granting path) and `GET /api/employers/me/invoices/:id/pdf`.

### Phase 2 — candidate database ✅ shipped
| `GET /api/employers/search/workers` | FTS query + filters | snippet results (**email/phone stripped**) | Postgres FTS (`tsvector` + `pg_trgm`); rate-limited |
| `GET /api/employers/candidates/:jobSeekerId` | auth | snippet profile; contact **iff** unlocked | soft-deleted/non-ACTIVE seeker → 404 |
| `POST /api/employers/candidates/:jobSeekerId/unlock` | auth | `{ unlocked, alreadyUnlocked? }` | **spends 1 DOWNLOAD in one transaction**; `@@unique([employerId, jobSeekerId])` dedupe; 402 at zero |
| `GET /api/employers/me/unlocked-candidates` | auth | paid history, **includes contact** | paginated |

### Phase 3 — seats 🟡 roster-only (see §0 gap 2)
| `GET /api/employers/me/team` · `POST /api/employers/me/team/invite` · `POST /api/employers/team/accept-invite` · `DELETE /api/employers/me/team/:seatId` | owner (invitee for accept) | roster mgmt via `EmployerTeamSeat` (`PENDING\|ACCEPTED\|REMOVED`, one-shot `inviteToken`) | cap enforced on invite **and** accept → 402 `NoSeatAvailableError`. **Cap currently reads the wrong plan — see §0.** |

---

## 4. Gates, crons, and touch-points in existing code

> ✅ Everything in this section is **BUILT** (verified 2026-07-07). Line refs are to the live code.

- **Post gate** ✅ — `job.service.ts` `createJob` spends 1 POST credit **before** `job.create` (`job.service.ts:64-70`),
  then patches the `SPEND_POST` audit row's `refId` to the new job id (`:130-139`). Balance 0 → `NoCreditsError` → **402**.
  Sets `job.liveUntil = now + 30d` (`:72`, `JOB_LIVE_DAYS`).
- **Unlock gate** ✅ — `candidate.service.ts` `unlockCandidate` (`:245`) decrements a DOWNLOAD lot **and** inserts
  `EmployerCandidateUnlock` in **one transaction** (`:311-339`). Dedupe via `@@unique([employerId, jobSeekerId])` plus a
  fast-path pre-check and in-transaction re-check; a concurrent P2002 rolls the tx back so **no credit is lost**
  (the M-1 double-spend fix). Already-unlocked → `alreadyUnlocked: true`, no spend.
- **Delete-refund** ✅ — `deleteJob` refunds iff `hoursSincePost <= 24 && _count.applications === 0`
  (`job.service.ts:556-564`); `creditService.refundPostCredit` reverses the **exact** `SPEND_POST` lot (+1) and writes a
  `REFUND_DELETE` audit row, guarded against a prior refund (`credit.service.ts:203-261`). Refund failure is non-fatal.
- **Trial grant** — fires when the employer's `accountStatus → ACTIVE` (individual: end of `verifyEmailOtp`; business: end of `approveEmployer`), once per verified identity (dedupe: phone/email for individual, GSTIN for business), `grantLots(TRIAL, post:1 download:3, expiresAt: now+14d)`. See decisions-tracker #1/#5.
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
