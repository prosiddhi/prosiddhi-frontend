# Manual Testing Walkthrough — ProSiddhi Web + Admin
### A hands-on guide to exercise every built feature & integration, and mark pass/fail

> **How to use:** work top to bottom. Each test has **steps → expected result → a box to mark** `[ ]` pass / `[x]` done / note failures inline. Grounded in the **real routes** in the code (verified 2026-07-27).

---

## 0. Before you start

**Environments**
- **Portal:** http://103.225.224.149:3000 (→ https://prosiddhi.com once prod moves)
- **Admin:** http://103.225.224.149:3001/admin/login
- **API:** proxied at `…/api` → backend :5000

**⚠️ Critical context (so results make sense)**
- The **backend is in `development` mode** → **OTPs are shown on screen / returned in the response; no real SMS or email is sent.** Use the on-screen OTP. (This is a known go-live item, not a test failure.)
- **Google OAuth is NOT configured** on this deployment (empty client ID) → the Google button will fail. Skip it or expect failure until configured.
- **Razorpay is in TEST mode** → pay with **Razorpay test cards**, no real money moves.
- **WhatsApp / SMS / Push are not configured** → those deliveries record `SKIPPED`; **in-app** notifications still work.
- **DB state:** plans + taxonomy are seeded; there may be **few/no jobs or users** — you'll create test data as you go (registration works via dev-OTP).
- **Admin access:** you need an admin account on the hosted env — **[CONFIRM: admin login credentials]**.

**Marking:** `[ ]` = not tested · `[x]` = pass · write **FAIL: …** inline for anything broken.

---

## 1. Integration Reality Check *(read §Integration findings above first)*
Test these explicitly — they're the point of this pass:
- [ ] **Phone OTP** — register; confirm the OTP appears (dev banner/response) and verifies.
- [ ] **Email OTP / verify** — trigger email verification; confirm OTP is returned and verifies (no real email expected).
- [ ] **Forgot/reset password** — confirm the safe generic message; reset works via returned code.
- [ ] **Google OAuth** — expect **failure/none** (not configured). Note the exact behaviour (button missing? error?).
- [ ] **Razorpay** — complete a checkout with a **test card**; wallet updates; invoice generates.
- [ ] **Notifications** — trigger an interview/status change; confirm **in-app** notification appears (WhatsApp/SMS/push will be silent).
- [ ] **Content scan (admin)** — run it on a job; confirm it returns findings and states its OpenAI state.

---

## 2. Portal — Job Seeker

- [ ] **T-S1 Registration** — `/register` → phone → OTP → password → profile → categories → experience → success. *Expected:* account created, lands logged-in.
- [ ] **T-S2 Login** — `/login` with email + password. *Expected:* routed to seeker home.
- [ ] **T-S3 Forgot password** — `/forgot-password`. *Expected:* generic message; reset via returned OTP works.
- [ ] **T-S4 Job feed** — `/job-feed`: try **search**, **filters**, **category**, **nearby**, **recommended**. *Expected:* results filter correctly; empty state if no jobs.
- [ ] **T-S5 Job details + Apply** — `/job-details/[id]` → **Apply**. *Expected:* one-tap apply; "applied" state; appears in My Applications.
- [ ] **T-S6 Saved jobs** — bookmark a job → `/saved-jobs`. *Expected:* saved list; unsave works.
- [ ] **T-S7 My applications** — `/my-applications` + detail. *Expected:* list with status pills.
- [ ] **T-S8 Messages/chat** — `/messages` → conversation. *Expected:* text send/receive (polling), read state.
- [ ] **T-S9 My interviews** — `/my-interviews`. *Expected:* scheduled interviews listed.
- [ ] **T-S10 Profile** — `/profile` edit. *Expected:* saves persist.
- [ ] **T-S11 Language** — `/settings` → switch between **any of the 10 languages**. *Expected:* UI switches and **stays switched on navigation** (this was a fixed bug — verify it holds). Check the same list appears in all four pickers: the header switcher, Settings, the home page section and registration step one — they were four separate hardcoded lists until 2026-08-18 and three were stuck on EN+HI.
- [ ] **T-S12 Scripts render (no tofu)** — switch to **ଓଡ଼ିଆ**, then **മലയാളം**, then **తెలుగు**. *Expected:* real letters, **not** empty boxes (□□□). DM Sans carries Latin only, so these depend on the Noto faces added in `src/app/fonts.ts`; a font regression shows up here and nowhere else. Worth doing on a **low-end Android phone**, not just a desktop browser — the desktop has fonts the target device may not.

---

## 3. Portal — Employer

- [ ] **T-E1 Registration** — `/employer/register` → phone → OTP → account → company-details → verify-email/under-review. *Expected:* business lands in **under-review** (needs admin approval); individual verifies by email.
- [ ] **T-E2 Dashboard** — `/employer`. *Expected:* dashboard loads (jobs/applicants/wallet summary).
- [ ] **T-E3 Plans + Checkout** — `/employer/plans` → pick a plan → **Razorpay test card** → verify. *Expected:* wallet credits increase; **GST invoice** generated.
- [ ] **T-E4 Post a job** — `/employer/jobs/new`: pick **Category → Sector → Job Title** (taxonomy triple). *Expected:* publishing spends **1 post credit**; at 0 credits you hit the **upsell gate** (402).
- [ ] **T-E5 Manage jobs** — `/employer/jobs`, edit via `/employer/jobs/[id]/edit`. *Expected:* edit is free; status shows.
- [ ] **T-E6 Applicants** — `/employer/candidates` (+ `/[applicationId]`). *Expected:* accept/reject/shortlist; move to chat/interview.
- [ ] **T-E7 Candidate database** — `/employer/workers`: search → **snippet** (contact hidden) → open `/[jobSeekerId]` → **Unlock** ("Use 1 credit?") → full profile. *Expected:* explicit confirm; download credit spent once; re-view free; appears in unlocked history.
- [ ] **T-E8 Wallet** — credit balances + expiry nudge. *Expected:* correct post/unlock balances; soonest-expiry-first.
- [ ] **T-E9 Invoices** — `/employer/invoices` → download **GST PDF**. *Expected:* PDF opens; amounts match (base + 18% GST).
- [ ] **T-E10 Team** — `/employer/team`: **invite by email** → open the invite link → `/invite/[token]` → register/sign-in → **auto-accept**. *Expected:* new member joins the **org**, shares the **same wallet/jobs/unlocks**; owner vs member roles; remove/revoke work. *(This is the cold-path that had the trial-lot bug — verify a brand-new invitee can accept.)*
- [ ] **T-E11 Profile** — `/employer/profile`. *Expected:* saves persist.

---

## 4. Admin Console

- [ ] **T-A1 Login** — `/admin/login`. *Expected:* real admin session; header shows the signed-in admin.
- [ ] **T-A2 Dashboard** — `/admin/dashboard`. *Expected:* **real revenue** + **12-month trend** + **pending verifications** cards.
- [ ] **T-A3 Employer management** — `/admin/employer`: **approve** a business. *Expected:* approval lets that employer post; write confirms with a toast.
- [ ] **T-A4 Job-seeker management** — `/admin/employee`. *Expected:* list + actions.
- [ ] **T-A5 Document verification** — `/admin/documents`: approve/reject. *Expected:* status updates.
- [ ] **T-A6 Post moderation + scan** — `/admin/post-moderation`: run **content scan**; record a **violation with reason**. *Expected:* scan shows offending text + its OpenAI state; violation persists reason + count.
- [ ] **T-A7 Skills** — `/admin/skills`: CRUD. *Expected:* each write confirms.
- [ ] **T-A8 Taxonomy** — `/admin/taxonomy`: **create** a Job Title → **link** to a sector → **unlink** → **soft-delete**. *Expected:* create-then-link makes it visible; delete removes from all sectors; deleted rows flagged.
- [ ] **T-A9 Monetization** — `/admin/monetization`: payments · GST invoices · per-employer credits/seats. *Expected:* figures match the API; read-only. *(Note: admin invoice-PDF download may be disabled — known BE gap.)*
- [ ] **T-A10 Reports queue** — `/admin/reports`: resolve with a note. *Expected:* resolve persists; second concurrent resolve → handled gracefully.
- [ ] **T-A11 Newer pages** — `/admin/add-user`, `/admin/admins`, `/admin/audit-log`. *Expected:* **verify these actually work** (some were listed as unbuilt in older docs — confirm current state).

---

## 5. Cross-Surface Integration Flows *(the ones that prove the ecosystem works)*

- [ ] **X1 Post → Discover → Apply → Chat** — employer posts a job → **seeker sees it in `/job-feed`** → applies → **employer sees the applicant** → both chat. *The core loop.*
- [ ] **X2 Credit lifecycle** — buy credits (test) → wallet reflects → posting spends a **post** credit → unlocking spends a **download** credit → balances correct.
- [ ] **X3 Team cold-start** — owner invites a **brand-new email** → that person registers fresh → accepts → **resolves the ORG wallet** (not their own trial 1/3). *Verifies the trial-lot bug is actually fixed on this deployment.*
- [ ] **X4 Report → Moderate** — seeker reports a job → it appears in **admin `/admin/reports`** → admin resolves.
- [ ] **X5 Interview → Notify** — employer schedules an interview → **seeker gets an in-app notification** (email/.ics won't send in dev — note that).

---

## 6. Logging what you find
For each failure, capture:
- **Where** (surface + route) · **Steps** · **Expected vs actual** · **Screenshot** · **Severity** (blocker / major / minor).

Hand this back and I'll triage into a defect list + go-live impact.
