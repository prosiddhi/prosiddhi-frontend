# Store-policy assessment — employer monetization on mobile

**Decision this unblocks:** STATUS.md **D2** — "Mobile payments: in-app Razorpay or buy-on-web?", currently locked to *in-app Razorpay* with the store-policy risk unverified. This document verifies it.

**Written:** 2026-08-04 · **For sign-off:** Shaik (owner) · **Prepared by:** Nazir (FE + acting PM)

**Bottom line up front:** as designed, our employer purchases **do require Google Play's billing system**. There is no B2B exemption on Google Play, and the "credits → Job Posts / Candidate Unlocks" rename does not change the analysis. Shipping in-app Razorpay for employer purchases would be a policy violation (an instant 3.1.1-class rejection), not a grey area. **Recommendation: Option A — keep employer purchasing on the web and ship the Android app with no purchase surface.**

---

## 1. What we actually sell

Two SKU families, both bought by an employer:

| Internal name | New user-facing name | What the buyer receives | Where it is consumed |
|---|---|---|---|
| post credit | **Job Posts** | The right to publish one job listing | In the app / on the site |
| download credit | **Candidate Unlocks** | Reveals one candidate's contact details | In the app / on the site |

Plus 8 subscription plans that bundle both, sold via Razorpay with a GST invoice.

The buyer is a business (we collect GSTIN and issue a tax invoice). The *outcome* is real-world — a hire. But **the thing purchased is access to functionality and data inside our product**, and that distinction is the one the stores actually apply.

---

## 2. What Google Play's policy says

Google Play billing is **required** for "in-app purchases for access to features/services, including items (such as **virtual currencies**…); **subscription services**; **app functionality or content**; and **cloud software and services**" — the last of which the policy explicitly illustrates with "**business productivity software**".

Google Play billing is **not required** only for a closed list:

- **Physical goods** (groceries, clothing, electronics)
- **Physical services** (transport, airfare, gym memberships, food delivery, live-event tickets)
- **Regulated financial services** — insurance, stock trades, investment consulting, tax preparation
- **Clinical services** by licensed healthcare providers
- **1:1 live services** not replayable afterwards
- Peer-to-peer payments, online auctions, tax-exempt donations
- **Consumption-only apps** — the user accesses content purchased externally and *no in-app purchase occurs*

**There is no business-to-business exemption on Google Play.** It is not on the list. Being a B2B sale, invoicing GST, and having a business buyer are all irrelevant to this policy.

### How our SKUs map

- **Candidate Unlocks** is the weakest position we have. Paying to reveal data inside the app is the textbook "digital content unlock" — structurally identical to the paywalled-content cases the policy is written for.
- **Job Posts** is "app functionality" almost verbatim: paying for the ability to use a feature.
- **The plans** are "subscription services", named in the required list.
- Our recruitment product also reads naturally as "**cloud software and services / business productivity software**" — the one exemption-adjacent category Google went out of its way to put on the *required* side.

### The rename, assessed honestly

The change from "credits" to **Job Posts / Candidate Unlocks** is **worth doing, but it is not a defence.**

- It *removes a specific aggravating factor*: "credits" reads as a **virtual currency**, which Google names first in the required list and separately restricts ("in-app virtual currencies must only be used within the app or game title for which they were purchased"). A currency-like framing is the single most reliable way to be classified as digital goods.
- It *does not change the substance*. Reviewers assess what the purchase unlocks, not the noun on the button. "Candidate Unlocks" describes a digital unlock **more** plainly than "credits" did.

Treat the rename as product-clarity work, not as store-policy mitigation. It should not appear in any argument we make to Google.

### Anti-steering — the trap in Option A

Section 4: apart from the listed exceptions, apps "**may not lead users to a payment method other than Google Play's billing system**." Linking out to an external checkout without the relevant entitlement is a direct violation.

Google loosened linking rules in the **US, UK and EEA** from 30 June 2026 (with a market-specific 5% billing fee). **India is in the "Rest of World" group and does not change until 30 September 2027.** For our launch market, assume the **strict** anti-steering rule applies.

---

## 3. What Apple says

Apple **3.1.3(e)** requires *non*-IAP payment for goods and services "consumed **outside** of the app". Ours are consumed inside it, so this does not rescue us.

Apple does have an enterprise carve-out — but it is narrow: it covers apps "**only sold directly by you to organizations or groups for their employees or students** (for example professional databases and classroom management tools)", allowing those users to access previously-purchased content. It explicitly adds that "consumer, single user, or family sales must use in-app purchase."

ProSiddhi employers **self-serve sign up on the open store**. We do not sell directly to organizations under contract. **We do not qualify.**

*(iOS is not on the near-term roadmap — the app is Flutter and only Android ships first — but the analysis matters if we build the checkout once and reuse it.)*

---

## 4. Options

| | Option | Fee exposure | Build cost | Policy risk |
|---|---|---|---|---|
| **A** ⭐ | **Web-only employer purchasing.** Android app shows balance and the gate; no purchase surface, no price, no link out. | **0%** | Lowest — the parked checkout stays parked | **Low**, if we are disciplined about anti-steering |
| **B** | **Google Play Billing in-app.** Accept the cut, grant credits from the Play purchase server-side. | 15% (to $1M/yr) then 30% | High — a second payment rail, Play↔ledger reconciliation, GST invoicing off a Play receipt, price parity vs web | **None** |
| **C** | **User Choice Billing (India).** Razorpay offered *alongside* Google Play billing, via Google's Alternative Billing APIs. | Google's fee **minus 4%** on alternative-billing transactions (≈11%/26%) | Highest — both rails plus Google's reporting/invoicing obligations | Low, if implemented to spec |
| **D** | **No employer surface on Play at all.** Ship a seeker-only app; employers use web/PWA. | 0% | Lowest, but discards built employer screens | None |

### Why Option A

1. **It is the only option that costs nothing and ships now.** Our mobile employer flows are ~95% built; only the checkout is parked. Option A means it *stays* parked and we launch anyway.
2. **It fits Google's own "consumption-only" pattern** — the user accesses what they purchased externally, and no in-app purchase occurs.
3. **Employers are our web-native users.** The buying decision is a business purchase made with a GST invoice; the web checkout already works and is where a business buyer expects to be.
4. **It is reversible.** If employer mobile purchasing later proves to matter commercially, Option C is a deliberate follow-on investment, not a rewrite.

### The discipline Option A demands

This is where Option A is actually lost, so it must be explicit for whoever builds the mobile plans/wallet screens:

- ✅ **Allowed:** show the current balance ("3 Job Posts remaining"), show the gate ("You have no Job Posts left"), show what a plan includes.
- ❌ **Not allowed:** a Buy button, a price, a "top up on our website" link, a deep link to the web checkout, or any copy that steers toward external payment.
- The wallet screen becomes **read-only**. The gate becomes a **dead end**, not a funnel.

That is a genuine product cost — an employer who runs out on mobile has no in-app path to continue, and we cannot even tell them where to go. It is the price of a 0% fee, and Shaik should sign off knowing it.

---

## 5. Cheap validation before we commit

**Check the incumbents.** Apna, Jobhai (Post Jobs – Recruiter), and Naukri Recruiter all ship Android employer apps in India with paid plans. Install each and check whether the purchase happens **in-app via Google Play billing** or whether the app is balance-only and pushes to web. Half a day of work that tells us what actually survives review in our exact category — worth more than any amount of policy reading.

**Do not ask Google for a ruling before launch.** Play policy support does not give binding pre-clearance for a category, and the question itself frames us as a digital-goods seller.

---

## 6. What to change in the docs after sign-off

- **STATUS.md D2** currently reads 🔒 *"In-app Razorpay. Mobile gets the full checkout"* — this assessment **contradicts the locked decision**. D2 must be reopened and re-locked to whichever option Shaik picks.
- **STATUS.md §3 item 11** and the mobile STATUS should record that the plans/wallet screens are **display-only** under Option A.
- ✅ **Done 2026-08-18.** The rename is now recorded in `MONETIZATION.md` §1 ("Naming — what the user sees"), which states plainly that it is a display-layer clarity change and **not** a store-policy defence. *(It previously lived in `feature-status-breakdown.md:86`, which implied it was store-motivated; that file was deleted.)*

---

## Sources

- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738) — the requirement, the Section 3 exemption list, Section 4 anti-steering, Section 5 virtual currency
- [Understanding Google Play's Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) — worked examples of required vs exempt products
- [Changes to Google Play's billing requirements for developers serving users in India](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en)
- [Understanding user choice billing on Google Play](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en) — the −4% alternative-billing fee
- [Expanded billing choice and lower fees on Google Play](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html) — the 2026 US/UK/EEA change and the Rest-of-World timeline
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 3.1.3(e) and the enterprise carve-out
