# Pricing Decision — Provisional Working Assumption

**Status:** PROVISIONAL — awaiting Shaik Ishaq's final confirmation
**Decided (provisionally):** 2026-05-11
**Confirmation deadline:** 2026-05-18
**Recorded by:** Nazir Hasan

---

## What we're building against (until Shaik confirms or changes it)

We are proceeding with **Option B from the Pricing Memo** as the working assumption. This unblocks the PRD, the subscription module build, and Sprint 1 work without waiting until 2026-05-18.

| Side | Working assumption |
|---|---|
| **Worker (Job Seeker)** | Free forever. No premium tier in v1. |
| **Employer** | ₹999 / month, paid manually each month (no auto-debit). |
| **Free trial** | 14 days. In-app + WhatsApp check-ins on day 3 and day 7 to drive conversion (research showed 14-day with structured check-ins converts at 44%). |
| **Renewal** | Manual — at month-end, employer is prompted to pay again. No RBI e-mandate flow in v1. |

The full reasoning for Option B is in [`03-pricing-decision-memo.md`](03-pricing-decision-memo.md) Section 5.

---

## Why we're going provisional rather than waiting

- **PRD is blocked on pricing** — without concrete numbers in M10 (Subscription), the PRD's acceptance criteria are vague and engineering can't size the work.
- **Asrar starts the subscription module today** (Sprint 1 day 1) — better to give him concrete numbers and seed data than placeholders.
- **Reversibility is cheap.** Plan names and prices live in BE seed data, not hardcoded. If Shaik picks a different option on or before 2026-05-18, the change is: update Q1/Q5 in `02-scope-locked.md`, update the PRD's M10 paragraph, update one seed file. ~30 minutes of work.
- **Shaik has been notified.** Working assumption + 2026-05-18 confirmation deadline communicated to him.

---

## What changes if Shaik picks differently

| If Shaik picks... | What we change |
|---|---|
| **Option A** (₹50 seeker lifetime + ₹250 employer/mo) | Add seeker premium tier ("Elite Member"); change employer price to ₹250; FE adds the seeker upgrade screen; BE adds the lifetime-flag column on User |
| **Option B with Starter tier** (₹499 Starter + ₹999 Pro) | Add a "Starter" plan tier in seed data; FE shows two paid tiers on upgrade screen; no schema change |
| **Option C** (per-post pricing) | Larger change — BE schema gets a `JobPostCredit` table; subscription module repurposes to credit pack logic; FE upgrade screen becomes a credit pack picker |
| **His own variation** | Case-by-case |

The build is designed to be flexible — the subscription module supports configurable plans. Numbers and tier names are seed data, not constants.

---

## Communication to Shaik

A short WhatsApp / email is going to Shaik today (2026-05-11), summarising:

> "We've taken Option B (your recommendation) as the working assumption to unblock Sprint 1, so engineering can start building today. If you want different numbers or a different option, please confirm by Mon 2026-05-18 — anything you say will override this provisional state. If we don't hear back, Option B ships as v1 default. Thank you."

---

## Anchor links

- Full options analysis: [`03-pricing-decision-memo.md`](03-pricing-decision-memo.md)
- Locked scope reflecting provisional state: [`../_context/02-scope-locked.md`](../_context/02-scope-locked.md) (Q1 + Q5)
- Charter Section 7 reflects this provisional state: [`01-project-charter.md`](01-project-charter.md)
- PRD's M10 (Subscription) builds against these numbers: [`04-prd-v1.md`](04-prd-v1.md) (to be generated)
