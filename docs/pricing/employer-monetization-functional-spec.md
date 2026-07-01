# Employer Monetization — Functional Specification

**Status:** Locked (decisions approved 2026-06-29) · **Owner:** Nazir (PM) · **Audience:** PM / stakeholders / QA / FE+BE+mobile devs (the *what & why*)
**Companion:** [technical-design](./employer-monetization-technical-design.md) (the *how*) · [delete-refund-spec](./employer-monetization-delete-refund-spec.md) (every reversal rule) · [decisions-tracker](./employer-monetization-decisions-tracker.md) (the 23-doubt scoreboard)
**Supersedes:** the provisional flat ₹999/month "Option B" (scope-locked Q1/Q5).

> This is the single source of truth for **what the employer monetization feature does and the rules it obeys.**
> No schema or code here — it is meant to be read and signed off by non-engineers, and tested against by QA.
> When behaviour changes, change this doc first.

---

## 1. Overview & goals

ProSiddhi monetizes the **employer** side only — **job seekers are free forever.** We are replacing the earlier
flat ₹999/month idea with an **8-tier metered credits model** (Naukri/LinkedIn-style): employers buy **credits**
that they spend to **post jobs** and to **unlock candidates**, inside time-boxed plans.

**Why credits, not a flat fee:** it matches how Indian recruiters already buy (Naukri job-packs + Resdex database
quotas), lets a tiny employer pay ₹499 for one hire while a large one buys an annual pool, and ties revenue to
actual usage.

---

## 2. The pricing model

### 2.1 The two things an employer spends
- **Post credit** — spent when an employer **publishes a job** (1 credit per job).
- **Download credit** (a.k.a. *candidate unlock*) — spent the **first time** an employer opens a given
  candidate's full profile/contact. Viewing that same candidate again, or contacting them, is **free** after the
  first unlock. (Naukri/LinkedIn Recruiter model.)

### 2.2 The 8 plans (prices are **base, exclusive of 18% GST**)

| Group | Plan | Price (₹, +18% GST) | Posts | Downloads | Seats | Duration |
|---|---|---|---|---|---|---|
| **Credit Pack** | Single post | 499 | 1 | 3 | — | one-shot, stacks on any plan, **never expires** |
| **Starter** | 1 Month | 1,299 | 3 | 5 | 1 | 1 month |
| **Starter** | 3 Months | 2,400 | 6 | 7 | 1 | 3 months |
| **Starter** | 6 Months | 4,499 | 13 | 10 | 1 | 6 months |
| **Pro** | 6 Months · 1 seat | 8,999 | 20 | 200 | 1 | 6 months |
| **Pro** | 6 Months · 2 seats | 11,999 | 20 | 200 | 2 | 6 months |
| **Pro** | 12 Months · 1 seat | 16,499 | 40 | 400 | 1 | 12 months |
| **Pro** | 12 Months · 3 seats | 21,999 | 45 | 450 | 3 | 12 months |

### 2.3 Free employer tier (always available)
A registered employer who has **not** bought anything can: register, and (once the candidate database ships in
**Phase 2**) **search the candidate database and see snippet results** (no full contact). They **cannot post** or
**unlock** until they have credits. This is the permanent free floor beneath the trial and the paid plans.

> **Phasing note (decisions-tracker #23):** candidate search + snippets is a **Phase 2** capability. The **Phase-1
> pricing page must NOT advertise search** (it doesn't exist yet) — omit the search claim until Phase 2 ships.

### 2.4 Free trial (one-time)
When the employer's account first becomes **ACTIVE** (individual: at email verification; **business: at admin
approval** — so a business gets its full 14 days only once it can actually use the product), they are granted a
free **starter kit**: **1 post credit + 3 download credits, valid 14 days.** It is granted **once per employer**
(dedupe key = verified phone/email for individual, **verified GSTIN for business**) so it can't
be farmed by re-registering. It lets a new employer run the real loop once — post a job, get applicants, unlock a
candidate — before paying. After it's spent/expired, the free tier (search + snippets) remains.

---

## 3. Business rules (the locked decisions)

| # | Rule |
|---|---|
| **Credit expiry** | Credits bundled with a **subscription plan forfeit when that plan expires**. Credits from the **₹499 Single-post pack never expire.** |
| **Trial** | One-time 1 post + 3 downloads, 14-day validity, once per employer. |
| **GST** | Prices shown are **base + "18% GST"**; GST is a separate line at checkout (exclusive). |
| **Buying more / top-ups** | An employer can buy **any of the 8 plans/packs, any time.** No separate top-up SKUs in v1. |
| **Multiple plans → merge** | Buying another plan **merges everything into one wallet** with **a single expiry = the latest active plan's expiry.** All plan credits live until then; pack credits never expire. **No proration.** If seat counts differ, the **higher** seat count applies. |
| **Mismatched pools** | If one credit type runs out, the employer buys whichever existing plan/pack covers the shortfall (₹499 pack includes downloads; Pro plans carry large download pools). |
| **Cancel** | **No cancel button** — renewal is manual, so a plan simply runs to expiry and lapses; no refund. |
| **Grace period** | **3 days.** At expiry: posting + new unlocks are blocked, but **already-live jobs stay live** and **already-unlocked candidates stay viewable.** On **day 3**, active jobs go **INACTIVE.** Already-unlocked contacts are kept (never clawed back). |
| **GSTIN + invoice** | **Optional GSTIN** at checkout; a **GST invoice PDF is always generated** per purchase. |
| **Edit a published job** | **Always free.** No "major edit = new post." (A paid *refresh/boost-to-top* is a future feature, not v1.) |
| **Reactivation** | **None.** Once a plan fully lapses, its unused subscription credits are gone; re-engaging = buy fresh. Pack credits persist. |
| **Refunds** | No money-back flow in v1 (chargebacks go through Razorpay's own dispute process). |

**Safeguards (anti-abuse / UX):**
- **Delete-refund:** deleting a job returns its post credit **only if the job has no applications yet AND is deleted within 24h** of publishing.
- **Unlock confirmation:** unlocking a candidate is an **explicit confirm** ("Use 1 credit to unlock?") — never charged on accidental view.
- **Per-job live window:** a published job is live for **30 days** (refreshable), independent of plan duration, so long plans don't keep stale jobs live.
- **Seeker privacy:** the candidate database honours DPDP — free/locked search returns **snippets only**; full contact appears only after a paid unlock.

---

## 4. Employer journeys

### 4.1 New employer → first hire (the happy path)
1. Registers → lands on the **free tier** + receives the **trial** (1 post / 3 unlocks / 14 days).
2. Posts a job → **1 post credit spent** (trial credit). Job goes live (30-day window).
3. Receives applicants; opens a candidate's full profile → **explicit unlock confirm** → 1 download credit spent.
4. Likes the platform → buys a plan (e.g. Starter 3-Month) at checkout (base price **+ 18% GST**, optional GSTIN, GST invoice emailed).
5. Credits merge into one wallet; continues posting/unlocking until credits or plan duration run out.

### 4.2 Running low / buying more
- Out of post credits → **can't publish**; sees an upsell to buy any plan/pack. Buying merges into the wallet (single latest expiry).
- Out of download credits but posts remain → buys the ₹499 pack (adds 3 downloads, never expires) or a Pro plan.

### 4.3 Plan expiry → grace → lapse
- At expiry: new posts/unlocks blocked; **live jobs + unlocked candidates remain** for 3 days.
- Day 3: active jobs go **INACTIVE.** Already-unlocked contacts are retained.
- Reminder emails nudge renewal; renewing = buying again (no auto-charge). No reactivation of lapsed subscription credits.

### 4.4 Job lifecycle
- Publish → 1 post credit, live 30 days. Edits are free. Delete within 24h with no applications → credit refunded; otherwise no refund.

---

## 5. States

- **Employer credit wallet:** post-credit balance, download-credit balance, and the wallet's current expiry date (latest active plan; pack credits shown as non-expiring).
- **Plan/credit source:** TRIAL · SUBSCRIPTION (a plan) · PACK (₹499) — drives expiry behaviour.
- **Job:** DRAFT → ACTIVE (30-day window) → INACTIVE (window elapsed, plan expired+grace, or deactivated) → FILLED/CLOSED.
- **Candidate (per employer):** LOCKED (snippet only) → UNLOCKED (full profile + contact, permanent for that employer).

---

## 6. Acceptance criteria (for QA + Jira)

- New employer is granted exactly **1 post + 3 download** trial credits, expiring in 14 days, **once** (a second account on the same verified phone/email gets none).
- A free-tier (zero-credit) employer **cannot publish a job** and **cannot unlock** a candidate, but **can search and see snippets**.
- Publishing a job decrements post credits by exactly 1; at **0 post credits**, publish is **blocked** with an upsell.
- Unlocking a candidate the **first** time decrements download credits by 1; **re-viewing or contacting** the same candidate decrements **nothing**.
- Buying a second plan results in **one wallet**, summed credits, and **one expiry = the later** of the two; **no** credit is lost at purchase and **no** proration occurs.
- At plan expiry, posting/unlocking is blocked immediately but live jobs stay live until **day 3**, then go INACTIVE; previously unlocked contacts remain visible throughout.
- Every purchase emails a **GST invoice**; if a GSTIN was entered it appears on the invoice. Price charged = base **+ 18% GST**.
- Deleting a job **<24h** old with **no applications** refunds 1 post credit; deleting later or with applications does **not**.
- ₹499-pack credits remain usable **after** a subscription has lapsed.

---

## 7. Out of scope / deferred

- **v1.1:** bulk post-packs, download-only top-up SKU, promo/coupon codes, enterprise/custom deals, referral discounts, win-back/reactivation offers, paid "refresh/boost-to-top", TDS (Sec 194J) reconciliation, auto-renewal (RBI e-mandate).
- **Phasing of the build itself** (Phase 1 posting → Phase 2 candidate database → Phase 3 seats) is described in the Technical Design.
