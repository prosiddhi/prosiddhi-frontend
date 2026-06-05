# Pricing Decision Memo — Azkashine Job Portal v1

**For:** Shaik Ishaq (Owner & Sponsor, Azkashine)
**From:** Nazir Hasan (Acting PM)
**Date:** 2026-05-09
**Decision deadline:** 2026-05-18
**Status:** Draft — for your approval

---

## What this memo is

Shaik, this memo is for your decision on one question: **how should the Azkashine Job Portal make money in v1?**

It's the most important business decision for this product, and your approval is needed before the engineering team can finalise the subscription module in Sprint 1. We've kept it short, in plain language, with real numbers. Everything is sourced — links at the bottom — so anything you want to verify, you can.

By the end of this memo you should be able to pick one of three options, or propose your own variation.

---

## TL;DR — the one-paragraph version

We're building a job portal in a market where **all our competitors give workers free access and make money from employers.** The big question is how to charge employers — by **monthly subscription** (like ₹250 / ₹999 a month), by **per-job-post** (like Apna at ₹650 per post), or by a **hybrid model**. We recommend **Option B** (worker free, employer ₹999 / month with a 14-day trial) because it matches what works in the market, generates meaningful per-employer revenue, and keeps the product simple to build. **Your approval is needed by 2026-05-18** — otherwise the engineering team can't start building the subscription module on schedule.

---

## 1. The market we're entering

A few facts that shape the pricing decision:

- **Over 300 million blue-collar and grey-collar workers in India** (excluding agriculture). McKinsey forecasts 70% of India's new jobs by 2030 will be blue-collar.
- **56% of employers plan to hire in H2 FY26**, with hiring growing fastest in tier-3 and tier-4 cities (12–15% growth).
- **The market is competitive but fragmented** — Apna leads the blue-collar segment; WorkIndia is a strong number two; Naukri owns the white-collar segment; JobHai (a Naukri Group brand) is competing on free-to-employer pricing.
- **Workers in this segment have very low ability to pay.** A construction worker earns ₹15,000–25,000 a month. They don't subscribe to apps. Every competitor in this segment keeps workers free — no exceptions.

---

## 2. What our competitors actually charge (verified May 2026)

### 2.1 Apna (the market leader for blue-collar)

**Workers:** 100% free. No premium tier for workers.

**Employers:** subscription with credits, plus separate "Apna Coins" for unlocking candidate contact details.

| Plan | Price | What you get | Per-post cost |
|---|---|---|---|
| Single post | **₹699** | 1 job posting (15 days) | ₹699 |
| 1 Month | **₹1,949** | 3 job credits (15-day posts) | ~₹650 each |
| 3 Month | **₹3,649** | 6 job credits | ~₹608 each |
| 6 Month | **₹7,099** | 13 job credits | ~₹546 each |
| Custom enterprise | Contact sales | Account manager, ATS, branding | — |

**Apna Coins:** 1 coin = ₹1 + 18% GST = ₹1.18. Used to unlock a candidate's phone number or CV after they've applied. So the recruiter pays the post fee + variable spend on contact unlocks.

### 2.2 Naukri (white-collar leader, but published rates apply to blue-collar too)

**Workers:** Naukri Premium starts at ₹890 / month — but worker revenue is a tiny fraction of their business. Most workers are free.

**Employers:**

| Plan | Price | Validity |
|---|---|---|
| Free | ₹0 | — |
| Standard | ₹400 / post | 30 days |
| Classified | ₹850 / post | 30 days |
| Hot Vacancy | ₹1,650 / post | 30 days |
| Resdex (database access) | ₹55,000+ | 3 months |

10% discount when buying 5+ posts together.

### 2.3 WorkIndia

**Workers:** free.

**Employers:** tiered plans by validity period (30 / 90 / 365 days), 1 active job per plan. Pricing is gated behind a sales contact form. A third-party listing reports the one-month plan around ₹2,118.

### 2.4 JobHai (Naukri Group's blue-collar play)

**Workers:** free.

**Employers: free.** JobHai's bet is to capture volume by being free-to-post; they're presumably monetized via the wider Naukri Group (cross-promotion to Naukri's paid products, lead generation for Naukri Resdex, etc.).

### 2.5 What this tells us

| Pattern | Used by |
|---|---|
| Workers are free | **All competitors** — Apna, WorkIndia, Naukri (mostly), JobHai |
| Employers pay per-post | Naukri |
| Employers pay subscription with credits | Apna |
| Employers pay nothing (volume play) | JobHai |
| Workers pay a small premium | Naukri only — and even there it's rounding error |

Two things stand out:

1. **No competitor in our segment makes serious money from workers.** Charging workers is acquisition — it's not revenue.
2. **The cheapest way for an employer to post a job in India today is ₹400 (Naukri Standard).** Apna's effective per-post price for low-volume employers is ~₹650. So anything below ₹400/post or below ~₹500–₹999/month feels deeply discounted.

---

## 3. The three options

Each option is described in plain English, then we show what it likely earns at three different scales (1,000 employers, 5,000 employers, 10,000 employers).

The numbers below assume:
- A 40% paid-conversion rate from "trial / free" to "paid" employer (B2B SaaS median is 25–30%; we're being slightly optimistic because the value is fast — employers see applicants in their first week).
- A 5% paid-conversion rate from "free worker" to "paid worker" (typical freemium range is 2–10%).

These are estimates, not promises.

### Option A — Aggressive entry pricing (the original plan)

**The pitch:** undercut everyone, capture market share, monetize later.

| Side | Price |
|---|---|
| Worker | ₹50 one-time lifetime payment to unlock "Contact Recruiter" |
| Employer | ₹250 / month, 14-day free trial |

**Revenue projection (annual):**

| At this scale | Employer revenue | Worker revenue | Total |
|---|---|---|---|
| 1,000 employers | ₹250 × 12 × 1,000 × 40% = **₹12 L** | 5% of 10,000 workers × ₹50 = ₹25,000 | ~₹12.3 L |
| 5,000 employers | **₹60 L** | ~₹1.25 L | ~₹61 L |
| 10,000 employers | **₹1.2 Cr** | ~₹2.5 L | ~₹1.22 Cr |

**Pros:**
- Lowest barrier in the market — easiest signup.
- ₹250 / month is below every named competitor's pricing.
- Worker fee creates a small revenue stream and a status differentiator ("Elite Member").

**Cons:**
- Per-employer revenue is one-third to one-quarter of what Apna's smaller plans bring in.
- Hard to raise prices later — customers churn when prices go up.
- Worker revenue is tiny. Don't model it as meaningful income.
- "₹250" might signal "low quality" to enterprise employers.

### Option B — Worker free, employer pays closer to market (RECOMMENDED)

**The pitch:** match what works in the market. Workers are free (no friction); employers pay a meaningful subscription.

| Side | Price |
|---|---|
| Worker | Free forever. No premium tier. |
| Employer | ₹999 / month, 14-day free trial |

**Revenue projection (annual):**

| At this scale | Employer revenue | Worker revenue | Total |
|---|---|---|---|
| 1,000 employers | ₹999 × 12 × 1,000 × 40% = **₹48 L** | ₹0 | ~₹48 L |
| 5,000 employers | **₹2.4 Cr** | ₹0 | ~₹2.4 Cr |
| 10,000 employers | **₹4.8 Cr** | ₹0 | ~₹4.8 Cr |

**Pros:**
- ₹999 is in the same range as Apna's 1-Month plan (₹1,949) and below the WorkIndia third-party rate (~₹2,118). Aggressive but credible.
- Per-employer revenue is **4× higher than Option A.** This is the difference between "fun side project" revenue and "real business" revenue.
- Workers being free removes all friction at the top of the funnel.
- Simpler product — only one paid tier to build and maintain.
- Matches what Apna and WorkIndia actually do.

**Cons:**
- Higher price means slower employer signups. We'd need to invest in marketing.
- Some small employers (one-off hirers) may bounce off ₹999.
- No worker revenue — but as research shows, that was always going to be small anyway.

### Option C — Per-post pricing (Apna-style)

**The pitch:** charge employers only when they post. Smaller employers can dip in for ₹350; heavier hirers pay more.

| Side | Price |
|---|---|
| Worker | Free + optional small add-ons via WhatsApp (₹20–50, e.g., "highlight my application") |
| Employer | First post free. ₹350 per post for 15-day visibility. Bulk packs (₹2,000 for 10 posts). |

**Revenue projection (annual):**

| At this scale | Assumption | Revenue |
|---|---|---|
| 1,000 employers | Average 4 paid posts/year per active employer | **₹14 L** |
| 5,000 employers | Same assumption | **₹70 L** |
| 10,000 employers | Same assumption | **₹1.4 Cr** |

**Pros:**
- Most-similar to what Apna does; we know the model works at scale.
- Small employers (one-off household hires) can use the platform cheaply.
- Revenue scales naturally with employer hiring volume.
- Lower commitment from the employer = lower churn anxiety.

**Cons:**
- Engineering complexity is higher: per-post billing, post credit tracking, expiry logic, bulk-pack management.
- Subscription-style corporate employers (with ongoing hiring needs) may find per-post billing annoying.
- Revenue is more variable and harder to forecast.
- Total revenue at 10k employers (~₹1.4 Cr) is between Option A and Option B.

---

## 4. Side-by-side comparison

### 4.1 Revenue comparison at 5,000 employers (year 1 target)

```
Option A (₹250/mo)        ███░░░░░░░░░░░░░░░░░░  ₹61 L
Option B (₹999/mo)        ████████████░░░░░░░░░  ₹2.4 Cr
Option C (₹350/post)      ██████░░░░░░░░░░░░░░░  ₹70 L
```

### 4.2 Quick-look matrix

| Factor | Option A | Option B (Recommended) | Option C |
|---|---|---|---|
| Worker price | ₹50 lifetime | Free | Free |
| Employer price | ₹250 / month | ₹999 / month | ₹350 / post |
| Annual revenue at 5k employers | ~₹61 L | ~₹2.4 Cr | ~₹70 L |
| Engineering complexity | Low | Low | High (per-post billing) |
| Easiest to sell | Yes (cheapest) | Medium | Easy for small employers |
| Hardest to raise prices later | Yes | No | No |
| Closest to market norms | No (well below) | Yes | Yes |
| Best for: | Capturing volume, brand awareness | Building real revenue, sustainable business | Mixed-customer base |

---

## 5. Our recommendation: Option B (with two small modifications)

We recommend **Option B — Worker free, Employer ₹999 / month with a 14-day free trial.**

### Why we recommend it

1. **It matches what works in the market.** Apna and WorkIndia both succeed with worker-free, employer-paid models. Going below ₹999 would cut us off from the revenue our business needs to sustain itself.
2. **The revenue difference is huge.** At 5,000 employers, Option B brings in roughly **4× what Option A would** (₹2.4 Cr vs ₹61 L per year). Same product, different price point.
3. **Workers being free removes the wrong kind of friction.** Workers in our target segment have low income and rarely subscribe to apps. Removing the worker fee removes a barrier to volume — which then attracts employers.
4. **Simpler to build.** No "Elite Member" tier for workers means fewer screens, fewer flows, less testing. Engineering finishes faster.
5. **Easier to discount than to raise.** Starting at ₹999 leaves room to offer ₹499 promotional pricing later if needed. Starting at ₹250 forces us to either accept low revenue forever or risk churn when we raise.

### Two small modifications we'd suggest

1. **Add a "Starter" tier at ₹499 / month** for individual employers and very small businesses (1 active post at a time, basic features). This captures the budget-sensitive segment Apna is leaving on the table — and is a natural upgrade path to the ₹999 main tier.
2. **Use a 14-day trial with structured check-ins.** Research shows 14-day trials with day-3 and day-7 engagement touches convert at 44% — the best of any trial length. Practically: send the employer a WhatsApp reminder on day 3 ("Have you reviewed your applicants yet?") and day 7 ("Your trial ends in a week — here's how to convert"). Adds 0.5 dev-days. Worth it.

### What this would look like in practice

| Tier | Price | Who it's for |
|---|---|---|
| Free trial | 14 days | Every new employer; no card on file |
| Starter | ₹499 / month | Individual employers, small businesses (1 active post) |
| Pro | ₹999 / month | Mid-market employers (unlimited posts, advanced analytics, voice messages in native languages) |
| Custom | Contact sales | Large employers with ATS / branding / multi-user needs |

---

## 6. Things to consider before deciding

### 6.1 Reversibility — once you set a price, what can change later?

| Move | Risk |
|---|---|
| **Lower prices** (e.g., A → discount campaigns) | Low. Customers happy. Easy. |
| **Raise prices** (e.g., A → B later) | High. Existing customers churn or feel betrayed. |
| **Switch model** (e.g., A → C) | Medium. Existing customers grandfathered or annoyed. |
| **Add a tier** (e.g., add "Starter" between Free and Pro) | Low. New customers self-select. |

**This argues for starting at the higher price (Option B) and discounting if needed**, rather than starting at the lower price (Option A) and trying to raise it later.

### 6.2 What our cost base looks like

This isn't an analysis of unit economics, but worth knowing:

- **Razorpay payment processing:** ~2% + 18% GST on cards and net banking. UPI is effectively zero-MDR. So we keep ~98% of subscription revenue.
- **WhatsApp messaging cost:** ~₹0.115 per template message. At 50 messages per employer per month, that's ~₹5.75 / month — negligible.
- **SMS (OTP and payment confirmation only):** ~₹0.20 per message, ~₹4 / month per employer.
- **Hosting + AWS:** scales with users, but at 5,000 employers expect ~₹50,000–₹1L / month for the whole stack.

So at Option B's ₹999 / month, the gross margin per paid employer is roughly **96–98%**. Plenty of room.

### 6.3 GST and invoicing

Once we charge employers, GST registration applies. Razorpay handles the invoice generation per transaction. Operations team will need to manage GST filings monthly — this is a known cost, not a blocker.

### 6.4 Auto-renewal vs manual renewal

Per the locked scope (revised 2026-05-09), v1 is **manual renewal only** — at the end of each month, the employer is prompted to pay again. RBI's auto-debit rules require a 24-hour pre-notification surface that's not worth building in v1. Auto-renewal is a v2 add.

This means churn risk is higher (employers have to actively renew), but engineering risk is much lower.

---

## 7. Questions you might want to ask before deciding

- **What's the goal of v1 — market share or revenue?**
  - Market share / brand → lean toward Option A
  - Revenue → lean toward Option B
- **Who is your primary employer customer?**
  - Mid-market companies hiring constantly → Option B (subscription)
  - Individuals and SMBs hiring occasionally → Option C (per-post) or Option B with Starter tier
- **What does Finance / the Founder think the break-even point is?**
  - If we need ₹50 L+ in year 1 to be sustainable, Option B is the only realistic path
  - If burn is funded for 18+ months, Option A's "buy market share" approach may be acceptable
- **How much marketing budget will we have?**
  - Higher pricing (Option B / C) requires more marketing to sell
  - Lower pricing (Option A) is closer to self-sell

---

## 8. The decision we need from you

Shaik, by **2026-05-18** (one week into Sprint 1), we need from you:

1. **A choice:** Option A, Option B (recommended), Option C, or your own variation.
2. **If Option B:** confirm the Starter (₹499) + Pro (₹999) tier split, or pick a different price point.
3. **Trial length:** 14-day with check-ins (recommended), or different.

If we don't hear back from you by 2026-05-18, we'll proceed with **Option B at ₹999 / month, 14-day trial** as the safe default and circle back with you on the Starter tier separately.

Reply on this memo by email or WhatsApp — short is fine. The pricing decision can be revised in v1.1 based on what we learn during the first launch month, so this isn't a permanent commitment — just the starting point we need to ship.

---

## Appendix: Sources

All claims in this memo are backed by sources you can verify yourself.

| Claim | Source |
|---|---|
| Apna pricing (₹699 / ₹1,949 / ₹3,649 / ₹7,099) | [employer.apna.co/pricing](https://employer.apna.co/pricing) — verified 2026-05-09 |
| Apna Coins: ₹1 + 18% GST | [apna.co/employer-help-center/127](https://apna.co/employer-help-center/127/how-much-is-the-value-of-apna-coins-in-rupees) |
| Naukri pricing (₹400 / ₹850 / ₹1,650 / Resdex ₹55k+) | [Naukri Job Posting Price Guide — Internshala](https://internshala.com/blog/employer-naukri-job-posting-price/) |
| WorkIndia tiered plans | [WorkIndia Pricing](https://www.workindia.in/pricing/); [SoftwareSuggest WorkIndia listing](https://www.softwaresuggest.com/workindia) |
| JobHai free job posting | [JobHai Recruiter Portal](https://employer.jobhai.com/hire/recruiter-login); [Top 6 Blue-Collar Recruitment Portals — CXOToday](https://cxotoday.com/story/top-6-blue-collar-job-recruitment-portals-to-kickstart-your-career-in-2025/) |
| Indian blue-collar workforce 300M, 70% of new jobs by 2030 | [Blue Collar Jobs to Drive 70% — BWPeople (McKinsey citation)](https://www.bwpeople.in/article/blue-collar-jobs-to-drive-70-of-indias-new-job-growth-by-2030-report-517793); [Blue collar Tech Market — Enablers](https://enablersinvestment.com/backend/wp-content/uploads/2021/01/Gig-Economy-Blue-Collar-Tech-1.pdf) |
| 56% of employers planning H2 FY26 hiring; tier-3/4 growth | [India 2026 Job Trends — Inventiva](https://www.inventiva.co.in/trends/top-10-job-portals-in-2026/) |
| B2B SaaS trial-to-paid conversion benchmarks (15–30%) | [Trial-to-Paid Conversion Benchmarks — Pulseahead](https://www.pulseahead.com/blog/trial-to-paid-conversion-benchmarks-in-saas) |
| 14-day trial with check-ins converts at 44% | [Free Trial Conversion Statistics 2026 — Amra & Elma](https://www.amraandelma.com/free-trial-conversion-statistics/) |
| Freemium conversion rates (2–10% typical) | [SaaS Freemium Conversion Rates — First Page Sage](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/) |
| Razorpay MDR (~2% + GST on cards; ₹0 on UPI) | [Razorpay Payment Gateway Pricing](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/) |
| WhatsApp Business pricing in India (~₹0.115/msg utility) | [Job Portal Research — Topic 1](../technical/job-portal-research.md) |
| SMS DLT pricing (~₹0.18–0.25/msg) | [Job Portal Research — Topic 1](../technical/job-portal-research.md) |

For the full industry research that informed this memo, see [`docs/technical/job-portal-research.md`](../technical/job-portal-research.md).
