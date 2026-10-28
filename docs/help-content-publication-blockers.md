# Help content — publication blockers

Covers the four English-only help pages: `/faq/employer`, `/faq/employee`, `/guides/employer`, `/guides/employee`.
Content lives in `src/content/help/`. Written 2026-10-28 after a code check of the backend and portal; screenshots added the same day.

The pages use the **conservative wording** below until each decision is confirmed. Change the wording in `src/content/help/` once it is.

## Confirmed

| # | Decision | Confirmed | What the pages say now |
|---|---|---|---|
| 1 | **Individual employers must receive admin approval before they can post jobs.** | 2026-10-28, by the project team | FAQ and guide say that every new employer account (Individual or Corporate) must be approved before posting or buying plans. A Corporate account uploads documents (usually reviewed within 48 hours). An Individual account uploads no documents at sign-up and the account itself is approved. No review time is promised for individuals. |

Matches the code and the portal: an individual is created as `PENDING_ADMIN_APPROVAL` (`prosiddhi-backend` `auth.service.ts` `registerEmployerIndividual`), posting needs an ACTIVE account (`job.service.ts` `createJob`), and the employer home screen shows "Your account is awaiting admin approval".

**Documents that still disagree with this decision (not edited here — owners to fix):**
- `docs/PRODUCT.md` §2 and §4 and `docs/MONETIZATION.md` §3 still say individuals are auto-approved or activated at email verification.
- The Terms (`src/locales/en/legal.json`, employers section) only say a *business* account needs approval. It does not say individuals can post freely, so it does not contradict the decision, but whoever owns the Terms should decide whether to say "every employer account".

## The open blockers

Numbers are kept from the original list so they stay easy to refer to.

| # | Question | Owner | What the pages say now |
|---|---|---|---|
| 2 | **Free trial.** Approving a business's documents makes it ACTIVE but does not add the trial. An admin must also use "Approve employer". A business with no GSTIN gets no trial, and a failure is only logged. | Nazir, Asrar | "Every new employer gets one free trial… If you cannot see it, contact us." No promise about when it appears. |
| 3 | **Plan end and grace.** Terms say: 3 days' grace, then live jobs are closed. The code does this only for employers who have a subscription plan. Trial-only and Single Post employers are never closed by it. | Nazir | Repeats the Terms wording and links to the Terms. |
| 4 | **Account deletion erase step.** The 30-day erase runs only on a server with `RUN_SCHEDULER=true`. If it is not on in production, nothing is erased and the Privacy Policy is not being followed. | Asrar / Nayan | "We keep the closed account for 30 days, then erase it as our Privacy Policy explains." |
| 5 | **The 50-application limit.** It is enforced in code but is not in any policy page. | Nazir | Stated as a plain rule in both FAQs and both guides. Decide whether to add it to the Terms. |
| 6 | **Plans page screenshot is held back (blocked).** The prices on the earlier Plans capture (₹549 / ₹1,499 / ₹2,999 / ₹5,999 before 18% GST) match `prisma/seed.ts`, migration `2026-10-20_3_job_posting_catalog` and `docs/MONETIZATION.md`. But that migration also creates a **Launch Offer of 10% with no end date**, and MONETIZATION.md says it applies automatically. A Plans page with the offer live would show different prices, and the capture shows none. **Whether the offer is live in production is not confirmed.** Production status must not be inferred from the code or from configuration documents. It needs a statement from Nazir or another authorised owner. (A Jira search was tried on 2026-10-28 and failed: the tenant returned `403 suspended-payment`.) | Nazir or an authorised owner | Step 8 of the Employer Guide keeps its **Plans page placeholder**. The payment summary and the Invoices list use clearly synthetic sample amounts (see below), so they do not state real prices. |
| 7 | **Contact Us screenshot (support email and phone numbers).** It shows the values in `src/lib/legal.ts`: `prosiddhisales@azkashine.com`, `+91 97410 66225` and `+91 91107 62251`. The email was corrected and the second phone number replaced on 2026-10-22 by the product owner. The code is therefore the latest owner-committed value. Not confirmed: that the deployed build has them, and `docs/compliance/grievance-procedure.md` still lists different contacts (stale). | Nazir | The Employee Guide shows the screenshot with the caption "Contact details can change, so always check the Contact Us page itself." Re-capture it if the details change. |
| 8 | **RESOLVED 2026-10-28 — Employer FAQ wording mismatch.** The Employer FAQ said "You choose “Individual” or “Business”" (the portal says Individual or Corporate) and "the job shows “Applications closed”" (only job seekers see that label). Both are corrected and were verified in the browser. The Employee FAQ never had this wording, and the guides were already corrected. Left as it was: the general word "business" elsewhere in the Employer FAQ (for example "A business uploads its documents…"). | Nazir (approved the change) | Employer FAQ now says “Individual” or “Corporate”, and "Job seekers see “Applications closed” on the job. You see the number of candidates, for example “50 candidates for this job”." |

## Left out on purpose

- **Pricing text, the Launch Offer, team seats:** not stated in the text. The Plans page screenshot is held (blocker 6). Every plan has 1 seat, so team invites cannot be used; the **Team** button that appears in the employer screenshots is not described anywhere as a working feature.
- **Refund details beyond the Refund Policy:** the pages link to the policy. The code also returns a Job Post when an admin rejects a job, and an unlock when a seeker deletes their account. Neither is in the policy.
- **Phone-code sign-in and phone-only password reset:** not promised. Phone-only users are told to contact support.
- **Chat and employer contact details for seekers:** not mentioned. They are switched off by default and the live setting is unconfirmed.
- **"Download my data":** not mentioned. The backend works but there is no button.
- **Who can see a deleted seeker:** not stated. Employers' applicant views may still show the seeker until the erase step.

## Screenshots — status

**Published in the guides: 55 images (29 Employee, 26 Employer)**, as WebP in `public/guides/employee/` and `public/guides/employer/` (about 2.4 MB in total).

- They are real captures of the running portal (Chrome against the dev server), not drawings. Every backend call was answered with **synthetic sample data** in the browser, so no real user, database or backend was involved. Names, numbers, emails and dates are made up (the seeker is "Demo Seeker"; emails use `@example.com`; phones are `90000xxxxx`).
- Each guide says so in Step 1. Interview dates, trial expiry dates and counts are examples tied to the capture date (2026-10-28), not commitments. Captions say "Sample data" where dates are visible.
- Full-page captures had only the dark site footer cropped off (employer dashboard, applicant page, profile, settings; employee saved jobs and job details). Nothing else was cropped, except the four added on 2026-10-28 (below). Tall images stay readable on a phone by tapping them: each opens the full-size file.

**Added on 2026-10-28 (all four use synthetic sample data):**

| Guide / step | File | Notes |
|---|---|---|
| Employee 3 | `11b-profile-edit` | The real edit form, cropped just below the **Save Changes** and **Cancel** buttons (the Documents and Skills cards and the footer are cut off; Documents is shown in Step 4). |
| Employer 5 | `10b-post-job-success` | The real success state: a message that the job is with our team for review, over My Jobs, Pending Review, with the new job listed. The "job created" reply was mocked. |
| Employer 8 | `13b-payment-summary` | The portal's own "Complete your purchase" box (price, 18% GST, total, optional GSTIN, place of supply, Pay button). **Pay was never pressed and no Razorpay script was loaded.** The plans behind it are named "Sample plan A–D" with round amounts. Caption: "Sample amounts, not real prices." |
| Employer 8 | `14b-invoices-sample` | Invoice numbers `INV/SAMPLE/000001–2` and "Sample plan" descriptions. Cropped to remove blank space. Caption: "Sample invoice list. The invoice numbers and amounts are made up, not real transactions." |

**Not shown as an image:**

| Guide / step | Item | Why |
|---|---|---|
| Employee 9 | Withdraw confirmation | It is a **native browser dialog** (`window.confirm`). Both a normal screenshot and a direct Chrome DevTools capture hang while it is open, so it cannot be captured by automation, and no fake portal box was drawn. The guide now says it in text: “Your browser asks: ‘Withdraw this application? This cannot be undone.’ Choose OK to withdraw or Cancel to keep your application.” |
| Employer 8 | Plans page | Still a **placeholder**: blocked on blocker 6 (Launch Offer status). |

**What the real screens showed that the first draft got wrong, now fixed in the guides:** the portal says "Corporate", not "Business"; Edit and Delete are on the My Jobs cards, not on the job detail page; My Jobs is split into tabs (Pending Review, Active, Inactive, Expired, Rejected); employers see "50 candidates for this job" and only job seekers see "Applications closed".

**Unblocking the Plans page.** Do not use the earlier capture `employer/13-plans.png` (scratch folder `D:\Bharath\Azkashine\_shots\shots\`, deleted at cleanup): it shows the plain list prices with no offer. After Nazir or an authorised owner confirms whether the Launch Offer is live: re-capture the Plans page in that state, prepare the image the same way (WebP, width at most 1280), copy it into `public/guides/employer/`, add one entry to `DIMS` and replace the `'The Plans page.'` placeholder string in `employerGuide.tsx`.

## Separate note for the backend team

`GET /jobs/:id` appears to return internal moderation fields (such as moderation notes and violation details) to any viewer. It is not part of this content. Asrar should confirm.
