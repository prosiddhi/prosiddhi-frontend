# English source-copy defects

Findings from the 2026-08-18 audit of every English string in the portal and the mobile app
(~2,100 strings, five reviewers). Each was verified against the component or backend service that
renders it, not just read in the JSON.

**Why this matters more than it looks:** every defect here is already reproduced in ten languages.
Fixing one English string costs one re-translation pass; shipping it costs ten wrong screens.

Status: **catalogued, not fixed.** These are product-copy decisions and several are legal calls.
Known defects from `GLOSSARY.md` §8 are not repeated here.

---

## A. Legal and compliance — the privacy policy misstates what we do

These are not wording problems. The Privacy Policy makes factual claims about our own system that
are untrue, and the Terms contradict the Privacy Policy inside the same file.

| # | Key | Problem |
|---|---|---|
| A1 | `legal.privacy.storage.body` | Says we keep **"two things"** in local storage (token + language). We actually write **six**: `auth_token`, **`auth_user` — the full user object incl. name, email, phone and role** — `rememberedEmail`, `showTutorial`, `userType`, and the language key. The policy explicitly denies storing personal data locally. **Verified by enumerating every `localStorage.setItem` in `src/`.** ⬅️ **Now five.** The login page's "Remember me" checkbox was deleted with the redundant email form — it was the only writer of `rememberedEmail`, and nothing ever read it back, so it promised a convenience it never delivered. The policy clause listing it was removed in all ten languages at the same time. |
| A2 | `legal.terms.employers.items[1]` + `legal.terms.credits.items[6]` | Terms promise an unlocked candidate is **"free, forever"** and **"never taken away from you"**. `legal.privacy.deletion` — in the same file — says we stop serving contact details to employers *including one who already unlocked*, and MONETIZATION §4 confirms that is the built behaviour, **with no refund**. An unqualified promise the product deliberately breaks. |
| A3 | `legal.privacy.whoWeShare.items` | Omits the two vendors that touch **every** user: **MSG91** (every OTP, verification email and interview invite — so every phone number and email leaves our systems) and **Google** (OAuth sign-in). A data-sharing list that omits the processors handling all personal data. |
| A4 | `legal.privacy.whatWeCollect.seeker[2]` | Says date of birth and gender are collected **"if you provide them"**. Both are **mandatory** at registration, and DOB is what enforces the locked 18+ rule. Understates what we compel. |
| A5 | `legal.privacy.contact.body` / `.rights` | The policy invokes India's **DPDP Act** and tells users they may complain to the Data Protection Board, but names **no Grievance Officer** — whose contact DPDP §13 requires be published — and prints no registered office (`legal.ts REGISTERED_OFFICE` is empty). Business decision required before go-live. |
| A6 | `legal.privacy.whatWeCollect.seeker[1]` | Presents email as required. It is **optional** for seekers (locked rule, PRODUCT §4). |
| A7 | `legal.privacy.whatWeCollect.employer` | Omits **teammate email addresses**, which an owner submits to invite someone — third-party personal data we collect and email. |
| A8 | every `{{company}}` in `legal.json` | Interpolates `COMPANY_LEGAL_NAME` = `"Azkashine Software & Services Pvt. Ltd."`, which PRODUCT §1 records as the **wrong legal form**. Six strings, including the Terms preamble and the copyright line — so the blast radius is contract text, not just invoices. |

## B. Money — copy that misstates what happens to the customer's money

| # | Key | Problem |
|---|---|---|
| B1 | `wallet.planExpiringSoon` | The single warning before **paid-for credits are forfeited** (MONETIZATION §4) never mentions that credits will be lost — only that posting stops. |
| B2 | `wallet.planExpired` + `wallet.renew` | **"Renew"** implies reactivation. §4: there is **no reactivation**; lapsed subscription credits are gone and the button buys a fresh plan. Also omits the 3-day grace. |
| B3 | `plans.subheading` | **"pay only for what you use"** — false for 7 of the 8 SKUs. Subscription credits are time-boxed and forfeit at expiry; only the ₹499 pack matches the claim. Headline text on the pricing page. |
| B4 | `team.inviteFull` | **"Upgrade to a Pro plan"** — but `PRO_6M_1S` is a Pro plan with **1 seat**, so buying it adds nothing, and an owner already on the 3-seat SKU is told to buy what they have. |
| B5 | `candidate.unlockCta` | "Unlock contact (1 credit)" — the **button that spends money** is the only place in the flow that doesn't say *which* credit. An employer holding post credits but no unlock credits will click expecting it to work. |
| B6 | `jobs.confirmDelete` | Silent on money, on the only irreversible money action in the jobs list. The post credit returns **only** if the job has no applications and is under 24h old (§4). |
| B7 | `postGate.body` | Quotes **₹499** with no GST note on a screen that has no GST footnote. The employer is charged ₹589. |
| B8 | — *(missing string)* | **No non-refundable notice at checkout.** §4: no refunds, no cancel button in v1. A ₹21,999 plan is sold with no on-screen notice. |
| B9 | — *(missing string)* | **The seat-suspended block on post/unlock is untranslated** — a suspended member gets raw backend English via `err.message`. English-only dead end in a 10-language product. |

## C. Contradicts a locked product rule

| # | Key | Problem |
|---|---|---|
| C1 | `auth.login.viewPricing` | **"View pricing & plans" is shown to job seekers.** `login/page.tsx:794` is gated on `mode === 'login'` only — the sibling signup link *is* role-gated, so the gate was understood and missed here. Contradicts *"job seekers are free forever"*. **Fix is a role gate, not a reword.** |
| C2 | `auth.success.showTutorial` | **The tutorial does not exist.** The toggle writes `localStorage.showTutorial` and **nothing in the codebase ever reads it**. A first-time low-literacy seeker is offered help that will never arrive. |
| C3 | `seeker.landing.categories.*` | **The eight category tiles are fictional.** The real level-1 taxonomy (BE `prisma/seed.ts`) has **seven** different names; "Common Works", "Repair Service", "Medical" and "Food Products" exist nowhere in it. The landing page tells a seeker what work is on the platform and gets it wrong. |
| C4 | `landing.pricing.freeFeatures.f1` / `.f2` | "0 Job Posting" and "No Access to candidate database" both contradict §3 (every employer gets 1 post + 3 unlocks for 14 days; free tier *can* search the database). `f2` also contradicts `f5` **on the same card**. |
| C5 | `landing.pricing.startPaidPlan` / `startFreePlan` | The two CTAs are **swapped**: the Free card says "Start Paid Plan", Enterprise says "Start Free Plan". |
| C6 | `plans.tabEnterprise` | Names a tier that doesn't exist — the tab filters `group === 'PRO'`, and enterprise deals are deferred to v1.1. |
| C7 | `seeker.jobFeed.voiceSearchTooltip` | "Voice search — coming soon" promises a feature on no roadmap. Audio is **removed from the product**. |
| C8 | `landing.cta.downloadApp` (employer + seeker) | Advertises a store download for an app that has never run on a device and is not released. |
| C9 | `seeker.nav.companies` | Advertises a company directory that **does not exist** — no route, no handler. |
| C10 | mobile `empTeamInviteReadyBody` / `empTeamInviteShareText` | Says **"We do NOT email invites — you have to send this yourself."** The backend **does** email it, with an Accept button (`team.service.ts:287`). Tells the owner to redo work already done, and describes an app-paste flow while the email carries a web link. |
| C11 | mobile `authEmployerTypeIndividualSubtitle` | **"Hire as a person (freelancer, small business)"** — invites a **small business** to register as an *Individual* employer. PRODUCT §2 locks individual = *"a household hiring a maid; auto-approved"* vs business = *"a company; **must be admin-approved** before it can post"*. This copy routes businesses around the approval gate and auto-approves them. The paired Business card correctly says "GST / CIN required", so **the two cards contradict each other on the same screen.** Not a wording problem — a business-rule hole. |
| C12 | mobile `empPostLocationHint` | "Select the State options" on a **free-text field** (`PostJobBorderedField` + min-3-char validator). There is no state list, and the label says "Location". |

### Functional defects found while reading copy (not copy fixes)

- **The entire seeker filter panel on mobile is inert** — `search_tab.dart:471-476` documents that
  location, radius, experience and role are held as local UI state and dropped on Apply, pending
  PJP-155. That makes `seekerFiltersApplied` ("{count} filters applied") and `seekerApplyFilter`
  untrue at runtime regardless of wording.
- **Every employer job card prints the currency twice.** `employer_job_card.dart:130` hard-codes a
  `'₹ '` TextSpan immediately before `empwSalaryValue` = `"{range} Rupees/{period}"`, so the card
  reads **"₹ 15,000 – 25,000 Rupees/Month"**. Verified in the widget.
- **Mobile experience filters overlap and leave a hole** — 1–3, 4–6, 6–8, 8–10, 10+ years: 6, 8 and
  10 each match two buckets and nothing covers 3–4. The distance filter has the same shape (0–5,
  10–25, 40+ km, with 5–10 and 25–40 unreachable).

## D. Reaches a user, wrong or unreadable

Grammar, ambiguity, jargon and seat-misdirection. Full detail in the audit transcripts; the
highest-value ones:

- `seeker.applyModal.submit` — **"Apply the Job"**, the primary action of the entire seeker product.
  Same article tic in "Save the Job", "View the Job", "Saved Jobs by you".
- `auth.experience.title` — the work-experience step is titled **"Create Account"**; the account is
  created two steps later.
- `auth.success.startExplore` — **"Start Job Explore"**, the success screen's primary CTA.
- `seeker.jobCard.perMonth` — wraps `salary.negotiable`, so a job with no salary renders
  **"₹ Negotiable / Month"**; and the backend has no salary period, so daily-wage work (normal for
  this audience) is shown as monthly.
- `profile.employer.heading` / `.changeLogo` / `.documentsHint` — an **individual** employer (a
  household hiring a maid) is shown "Company Profile", asked for a "Logo", and told to supply a GST
  certificate they will never have. Rendered unconditionally.
- `team.statusSuspendedHint` — tells a **suspended member** to "upgrade or remove someone", both
  owner-only. Contradicts `suspendedBannerBody` two lines above, which gets it right.
- mobile `empTeamNoSeatsFree` — "upgrade your plan" rendered to **members**, outside the `isOwner`
  guard that hides the button.
- mobile `seekerNearMe*` — the distance filter offers **0–5, 10–25, 40+ km**. There is no way to
  filter 5–10 or 25–40 km.
- mobile `seekerNearbyJobsTitle` — **"Near by Jobs"** misspelled on a home-screen heading.
- `seeker.status.BOOKMARKED` — the employer's private shortlist flag shown to the **seeker** as
  their own status, clashing with the product's own "Save"/"Saved Jobs".
- Terminology drift: three names for the business account type (**Corporate / Business Employer /
  Employer (business)**); four statements of the phone-number rule, two of which disagree on whether
  international numbers are allowed; "Recruiter" on the seeker's main screen when the Terms say
  *"we are not a recruitment agency"*.
- Untranslatable plural hacks beyond the two already known: `{{count}} candidates`, `{{count}} views`,
  `plans.postsLabel` ("1 job posts" on the cheapest card), `candidate.confirmBalance`
  ("You have 1 unlock credits"), and three mobile result-count keys.
- Jargon for a low-literacy reader: `TBC`, `incl. GST`, "parse", "min 2 chars", "500 chars",
  `YYYY-MM-DD`, "A–Z" (meaningless in Devanagari/Tamil/Bengali).

## Fixed on 2026-08-18

| Area | Done |
|---|---|
| **Legal (§A)** | A1 storage disclosure corrected to the six keys we actually write · A2 the "never taken away" promise now carries the account-deletion carve-out and the no-refund, in both Terms bullets · A3 MSG91 and Google added to the data-sharing list · A4/A6 DOB and gender stated as mandatory, seeker email as optional · A8 legal entity corrected to `AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED` |
| **Money (§B)** | B1 the expiry warning now says unused credits are **lost** · B2 "Renew" replaced with "Buy a plan" and the 3-day grace stated · B3 the false "pay only for what you use" claim removed · B4 the impossible "upgrade to a Pro plan" seat advice replaced · B5 the unlock button now names its credit type · B6 delete-refund conditions stated · B7 the hardcoded ₹499 removed |
| **Rule holes (§C)** | C1 the pricing link on `/login` is now gated to employers · C11 the Individual employer card no longer invites businesses around the admin-approval gate · C10 mobile invite copy no longer claims we don't email invites · C6 "Enterprise Plans" → "Pro Plans" · C12 the free-text location hint no longer says "select" |
| **Readability (§D)** | 48 grammar, jargon and misspelling fixes across both surfaces — "Apply the Job", "Near by Jobs", "Start Job Explore", "No of Applicants", "TBC", "min 2 chars", `A–Z`, the double-currency salary string, and the seat hint that told a member to do an owner-only action |
| **Dead keys (§E)** | **660 strings removed** across all 10 locales |
| **Translations** | All 73 corrected keys re-translated into the other 9 languages. The old translations were faithful renderings of the *wrong* English — e.g. Hindi's `wallet.renew` was नवीनीकृत करें, promising a restored balance that does not exist. |

## Left over after the 2026-08-18 fix pass

Small items the fixes surfaced but did not close:

- **`chatCallHr` is now misnamed.** Its English went from "HR Contact" to "Call" (half of
  ProSiddhi's employers are individuals with no HR), but the **key** still says `Hr`. Harmless at
  runtime, misleading to read. Rename to `chatCall` when someone is next in that file.
- **`legal.ts` `GSTIN` and `REGISTERED_OFFICE` are still empty.** `go-live-config.md` records a
  GSTIN, but that document is grounded in env vars rather than the incorporation papers, and the
  constants file's own rule is *"if a value is unknown, leave it empty and let the component skip
  it."* A wrong GSTIN on a tax invoice is worse than an absent one. **Needs confirming against the
  source documents.**
- **A5 — no DPDP grievance officer** (see §A). Needs a name, designation and email from the
  business; cannot be drafted.
- **`common.json`'s 12 unreferenced button labels were deliberately kept.** They are a shared
  vocabulary (`submit`, `search`, `edit`, `confirm`…), not a dead feature — cheap to carry, and
  deleting them invites someone to re-add them by hand with different wording.
- The functional defects listed above (inert mobile filter panel, double currency on the employer
  job card, overlapping distance/experience buckets) are **code**, not copy, and remain open.

## E. Dead keys — translated into 9 languages, rendered nowhere

- **`employer.json`: 65 of 433 keys (15%)** — including the whole `landing.pricing.*` block, which
  holds five of the 🔴 defects above and would ship wrong the moment anyone wired it up. Also
  `plans.free.*`, a complete second invite-accept flow (`team.accept.*`) whose wording diverges from
  the live one, and the retired job-form fields.
- **`auth.json`: 7 keys** — including `googleComingSoon` ("Google sign-in is coming soon"), now
  false since Google sign-in ships.
- `common.nav` and `seeker.nav` duplicate 8 identical strings across two files, free to drift.

Pruning these before the next translation pass is the cheapest win in this document.
