# Pricing Rules

Quick-reference distillation of the **finalized** employer monetization rules. For depth, see the full specs in this folder:
`employer-monetization-functional-spec.md` (what & why), `…-technical-design.md` (how), `…-delete-refund-spec.md` (reversals), `…-decisions-tracker.md` (23 locked decisions).

**Model in one line:** ProSiddhi monetizes the **employer** side only — **job seekers are free forever.** Employers buy **credits** and spend them to **post jobs** and **unlock candidates**, inside time-boxed plans.

---

## The two credit types
- **Post credit** — spent when an employer **publishes a job** (1 per job). Job is live **30 days** (per-job window, independent of plan length).
- **Download credit** (candidate unlock) — spent the **first time** an employer opens a candidate's **full profile/contact**. Re-viewing or contacting that same candidate again is **free**.

## The 8 plans (prices are BASE, + 18% GST)

| Group | Plan | Code | ₹ (base) | Posts | Downloads | Seats | Duration |
|---|---|---|---|---|---|---|---|
| **Credit Pack** | Single post | `PACK_SINGLE_POST` | 499 | 1 | 3 | — | one-shot, **never expires** |
| **Starter** | 1 Month | `STARTER_1M` | 1,299 | 3 | 5 | 1 | 1 month |
| **Starter** | 3 Months | `STARTER_3M` | 2,400 | 6 | 7 | 1 | 3 months |
| **Starter** | 6 Months | `STARTER_6M` | 4,499 | 13 | 10 | 1 | 6 months |
| **Pro** | 6 Months · 1 seat | `PRO_6M_1S` | 8,999 | 20 | 200 | 1 | 6 months |
| **Pro** | 6 Months · 2 seats | `PRO_6M_2S` | 11,999 | 20 | 200 | 2 | 6 months |
| **Pro** | 12 Months · 1 seat | `PRO_12M_1S` | 16,499 | 40 | 400 | 1 | 12 months |
| **Pro** | 12 Months · 3 seats | `PRO_12M_3S` | 21,999 | 45 | 450 | 3 | 12 months |

## Free tier + trial
- **Free tier (always):** a registered employer who hasn't bought anything can register and search + see candidate **snippets** (no contact — email/phone stripped). **Cannot post or unlock** until they have credits. *(Candidate search shipped 2026-07; it is live, not future.)*
- **Free trial (one-time):** on account **activation**, an employer gets **1 post + 3 download credits, valid 14 days.** Granted **once per employer** (dedupe = verified phone/email for individuals, verified **GSTIN** for business) so it can't be farmed by re-registering.

## GST & invoices
- Prices shown are **base + "18% GST"** (GST is a separate line at checkout, exclusive).
- **GSTIN optional** at checkout. **Place of supply** decides tax: buyer's state == our home state → **CGST + SGST**; else → **IGST**.
- A **GST invoice PDF is always generated** per purchase (sequential number `INV/YY-YY/NNNNNN`, resets each April), downloadable anytime.

## Lifecycle rules
- **Credit expiry:** credits bundled with a **subscription plan forfeit when that plan expires.** Credits from the **₹499 pack never expire.**
- **Buy anytime:** any of the 8 plans/packs, any time. No separate top-up SKUs in v1.
- **Multiple plans → one wallet (merge):** buying another plan merges everything into **one wallet** with **a single expiry = the latest active plan's expiry.** No proration. If seat counts differ, the **higher** seat count applies.
- **No cancel button** — a plan simply runs to expiry and lapses (renewal is manual = buy again). **No money-back / refunds in v1** (chargebacks go through Razorpay's dispute process).
- **Grace period = 3 days:** at expiry, posting + new unlocks are blocked, but **already-live jobs stay live** and **already-unlocked contacts stay viewable.** On **day 3**, active jobs go **INACTIVE.** Unlocked contacts are never clawed back.
- **Reactivation:** none — once a plan lapses its unused subscription credits are gone; re-engaging = buy fresh. Pack credits persist.

## Safeguards
- **Delete-refund:** deleting a job returns its post credit **only if** the job has **no applications yet AND is deleted within 24h** of publishing.
- **Unlock confirm:** unlocking a candidate is an **explicit confirm** ("Use 1 credit to unlock?") — never charged on an accidental view.
- **Edit a published job:** **always free** (no "major edit = new post").
- **Seeker privacy (DPDP):** free/locked candidate search returns **snippets only**; full contact appears only after a paid unlock.

## Explicitly OUT of v1 (say so if asked)
Cancel button · money-back/refund flow · auto-renewal (RBI e-mandate) · promo/coupon codes · download-only top-up SKU · bulk post-packs · enterprise/custom deals · referral discounts · win-back offers · paid "refresh/boost-to-top" · TDS reconciliation.

## Team seats (Phase 3)
- Pro plans include **2–3 seats**. The **owner** invites teammates by email → gets a **one-shot invite token** (no email delivery in v1 — the owner relays the link). Invitee accepts with their own account. Removing a seat frees it. Seat cap = the higher seat count across active plans.

## Deployment / launch-gate notes
- GST is registered under **Azkashine** (the legal entity); invoices issue from Azkashine's GSTIN. The backend reads `COMPANY_NAME` / `COMPANY_GSTIN` / `COMPANY_GST_STATE` from env — real values plugged in at deploy.
- Razorpay runs in **test mode** for dev/demo; live keys + webhook secret at go-live.
