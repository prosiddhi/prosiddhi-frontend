# ProSiddhi — Status

**Updated 2026-10-05.** This is the one page that says where the project stands.
Where it and Jira disagree, check both and fix the wrong one the same day.

**How this page was checked:** the Jira R1 board (PJP, board 34) on 4 Oct,
written updates from every team member on 5 Oct, the git history of all four
repos, and a live probe of production on 4 Oct.

The full history up to 4 Oct (every bug, every fix, every commit) is in
[`_archive/STATUS-history-to-2026-10-04.md`](_archive/STATUS-history-to-2026-10-04.md).
Look there for detail. Keep this page short.

---

## 1. In one paragraph

**The product is built.** All the features for Release 1 are done on the
backend, the website and most of the mobile app, and QA has tested what was
delivered. **What stands between us and launch is not features.** It is
four things: the move to Google Cloud (started late), the outside approvals
(D-U-N-S for the Play Store, the rest of DLT for SMS), the admin console
(no work since 15 Sep), and a final round of testing on the frozen build.

## 2. Dates

| Date | What |
|---|---|
| **10 Oct (Fri)** | Proposed **code freeze** — web, admin, backend |
| **11 Oct (Sat)** | Proposed **mobile build freeze** |
| **13 Oct (Mon)** | Submit the Android app to Google Play (review takes up to 7 days) |
| **21 Oct (Tue)** | **Release 1 launch** |
| Jan 2027 | Release 2 |
| Mar 2027 | Release 3 |

The R1 plan had the Google Cloud cutover on **6 Oct** and Go/No-Go on
**12 Oct**. Both will move. The new dates depend on when Google Cloud staging
is ready (ask Nayan).

## 3. Where each part stands

### Production today
Live on HTTPS: `https://prosiddhi.com` (website), `https://api.prosiddhi.com`
(API), `https://admin.prosiddhi.com` (admin console). All three still run on the
**old server** (`103.225.224.149`), not Google Cloud. The API reports
`environment: development` — deliberate, see `deploy-checklist.md`.
The API restarted around 28 Sep. **Which backend commit and which SQL folders
are on production is not recorded** — ask Asrar.

### Backend — Asrar, Prabhjot — mostly done
- **Done (9 tickets):** safe sign-in, no codes in replies (R1-BE-01) ·
  account deletion + admin password reset (BE-02) · SMS + WhatsApp built
  behind switches, with consent and notification preferences (BE-03) · one
  API contract (BE-04) · live-money fixes, invoices emailed (BE-05) · ready
  for many copies on Google Cloud (BE-06) · logging with masked personal data
  (BE-08) · migration tracking, unsafe commands removed (BE-10) · first
  automated tests, 37 of 37 pass (BE-11).
- **Left:** **R1-BE-09 security hardening** (Asrar, starting this week —
  do the token-library upgrade and hashed codes first; they carry the risk).
- **Moved out of R1 (5 Oct):** R1-BE-07 queue. Launch sends email only;
  WhatsApp bulk needs the queue and is off until Meta approves anyway.
- **Waiting on others:** Redis + Google Cloud to test on staging; live
  Razorpay keys; the SQL migrations run on the real database at deploy.

### Website (portal) — Bharath — done, one ticket left
- **Done:** web sign-in for R1 (R1-POR-01) · back in step with the backend
  (POR-03) · launch polish (POR-04) · WhatsApp consent · forced password
  change after an admin reset (1 Oct).
- **Left: R1-POR-02 — pages Google Play needs** (now Bharath, was Nazir).
  There is no `/delete-account` page and no `/help` page yet. Also: notification
  settings, privacy-policy updates, the 48-hour / 36-hour promises.
  **This blocks the Play submission.** It needs the values in R1-PM-01 first.
- **Small, known:** `legal.ts` has an empty GSTIN and registered office; the
  support email is the placeholder `biz-ops@azkashine.com`; no support phone.

### Admin console — Prabhjot (from 5 Oct) — not started
No commits since 15 Sep.
- **R1-ADM-01 — admin sign-in safe.** The console still shows the reset code
  in the URL and on screen; a wrong password says "Session expired".
  *(The backend half of the old admin-takeover risk is fixed: staff can no
  longer reset from outside the console — `auth.service.ts:401`.)*
- **R1-ADM-02 — tools support needs.** Must have for launch: **Reset password**,
  **Release phone** (with the warning in D7), the deleted-account restore badge.
  Moved after launch: the content-scan button, approve-a-rejected-post,
  audit-list sync, queue due times.

### Mobile app (Android) — Sailaja, Krishna — mostly done
- **Done:** app sign-in (R1-MOB-01) · force-upgrade screen (MOB-02) · back in
  step with the backend (MOB-04) · app ID is `com.prosiddhi.app` · account
  deletion · privacy links · WhatsApp consent.
- **In progress:** Play compliance (MOB-03) · push (MOB-05) · polish (MOB-06) ·
  Play release (MOB-07).
- **Blocked:**
  - **Release signing** waits for the keystore from Nayan (R1-OPS-06).
    Without it the build is debug-signed and Play rejects it.
  - **Push notifications + Google sign-in** wait for the new Google/Firebase
    account Asrar is creating on the biz-ops email.
  - **Force-upgrade test** waits for Google Cloud.
  - **First Play upload** waits for the organisation Play account → D-U-N-S.
- **Moved out of R1 (5 Oct):** wiring "Near me" — hide the button for launch.
- **Not in R1:** iOS (Release 3), invoices on mobile.

### Google Cloud — Nayan — started late
- **Done:** Google Cloud project and service account.
- **In progress:** the dev environment.
- **Not started:** data layer — Cloud SQL, Redis, buckets (R1-OPS-02) · Cloud
  Run + load balancer (OPS-03) · release pipelines (OPS-04) · monitoring
  (OPS-05) · production config + keystore (OPS-06) · cutover (OPS-07).
- **Waiting on it:** the backend staging test, the force-upgrade test, QA's
  staging and performance tests, the live-payment deploy.

### Testing — Nazeeb, Farhana — further along than Jira shows
- **Done:** full regression on web and mobile; email-code testing; device
  tests on Android 9, 11, 13, 16 and 17 (Sauce Labs).
- **Not done:** performance test (blocked — the Vodafone VPN won't connect) ·
  security test (waiting on Satya) · money and trial-abuse paths (R1-QA-03) ·
  Play compliance check (QA-05) · Google Cloud check (QA-07) · production
  retest of the defect register (QA-09) · final regression + UAT + Go/No-Go
  (QA-10).
- **Important:** the tests ran before the last sign-in and password changes
  (29 Sep – 1 Oct). Everything must be tested again on the frozen build, on
  the servers we launch on.

## 4. Outside approvals

| What | Why we need it | Status |
|---|---|---|
| **DLT (SMS)** | Phone codes by SMS | **Entity REGISTERED 5 Oct** (Airtel, ref AIR8106146323). Next: register the `PRSDHI` header and the message templates, then give the IDs to MSG91. Then Asrar turns on `SMS_OTP_ENABLED`. |
| **D-U-N-S** | Organisation Play account → the app on the store | Applied 23 Sep. **Not confirmed.** Without it the 13 Oct submission cannot happen. |
| **Meta (WhatsApp)** | WhatsApp messages | Not confirmed. Not needed to launch. |
| **Razorpay live keys + KYC** | Real payments from 21 Oct (D-3) | Not confirmed. Were due ~5 Oct. |
| **New Google account (biz-ops)** | Push + Google sign-in on mobile | Asrar is creating it. |

## 5. What is blocked on what

- **Google Cloud** → backend staging test, force-upgrade test, QA staging +
  performance tests, live-payment deploy.
- **D-U-N-S** → Play account → first upload → 13 Oct submission.
- **Keystore (Nayan)** → release-signed app.
- **New Google account** → push + Google sign-in on mobile.
- **R1-PM-01 values (Nazir)** → Play pages, privacy policy, Help page, invoices.
- **Vodafone VPN** → performance test. **Satya** → security test.

**What does NOT block launch:** SMS and WhatsApp. Both are built behind
server switches. We launch with email codes and switch them on when the
approvals land — no app update.

## 6. Security

- 🔴 **Most urgent: `EXPOSE_OTP_IN_RESPONSE` on production.** While this
  switch is on, `POST /auth/forgot-password` returns the reset code in the
  reply for any **seeker or employer email** (`auth.service.ts:1886-1890`).
  Example: someone types a user's email on Forgot password, reads the code
  from the browser's network tab, and sets a new password. Production had it
  on as of 15 Sep; **nobody has confirmed it is off now.** Email delivery
  works, so it can be turned off — check today (Asrar / Nayan).
- **Fixed in code:** staff reset codes never go into a reply, and staff can't
  reset outside the console (`auth.service.ts:401`, `:1870-1890`); phone reset
  and phone-code login are refused until SMS is on; CORS is locked down; the
  backend has tests that prove the sign-in rules. *(Whether production runs
  this code is not recorded — see §3, Production today.)*
- **Open:**
  - The admin console shows reset codes on screen (R1-ADM-01).
  - Security hardening — headers, token library, hashed codes (R1-BE-09).
  - The independent security test has not started (R1-QA-06, waiting on Satya).
  - Login tokens are stored in the browser, not an httpOnly cookie (Release 2).
- **Phone-only users who forget their password** must contact support until SMS
  is on. Support needs the Reset password button (R1-ADM-02) and a rule: **give
  the temporary password only by calling back the account's registered number.**

## 7. Moved out of Release 1 (decided 5 Oct)

- The queue and worker (R1-BE-07) — email-only at launch.
- Wiring mobile "Near me" — hide the button instead. *(Reverses D-14b.)*
- Admin extras: the content-scan button *(delays D-4)*, approve-a-rejected-post,
  audit-list sync, queue due times.
- Anything called "Agent Siddhi" — not in any R1 ticket.

**Still in R1, decide by 8 Oct:** push notifications (D-10). If the new Google
account isn't ready, launch with in-app notifications only.

## 8. Open decisions for Nazir

1. **Public support email and phone number** (R1-PM-01). Also the GSTIN
   (`29ABBCA8287G1ZA`) and registered office — known, need your confirmation —
   and a DPDP grievance officer.
2. **Refund the post credit when an admin rejects a post?** Today the employer
   loses it. Admin **Delete** is permanent and wipes applications and chats —
   limit it to SUPER_ADMIN?
3. **Google Cloud fallback:** if staging isn't tested by ~14 Oct, launch on the
   current server and move after launch?

## 9. Bugs not covered by a ticket

The defect register is [`qa/defect-log.csv`](qa/defect-log.csv) — 35 rows:
16 closed (12 of them verified only locally, need a production retest),
11 fixed and awaiting retest, 5 open, 3 not defects. R1-QA-09 retests them.

Small known items, none blocks launch (detail in the archived history, §4):
- Backend: registration errors have no `code` (bug 18); one message for three
  causes (bug 19); the dashboard job list doesn't return `moderationStatus`, so a
  job awaiting review shows "Inactive" there (bug 44); accept-invite still
  checks the old email after an email change (bug 31); Google sign-up never
  records WhatsApp consent (bug 56).
- Portal: the job feed's heading/subtitle came back after the redesign (TD-15);
  the ledger shares a rate limit with candidate unlocks (bug 37c).
- Location: the coordinate backfill for old jobs (TD-40) has not run on production.

## 10. Locked decisions — don't reopen without Nazir

- **D1** Audio is removed everywhere. **D2** Purchasing is web-only; the app
  sells nothing. **D3** We own the backend; coordinate with Asrar.
  **D5** The mobile app is Flutter. **D6** Web and mobile registration screens
  differ on purpose. **D7** A verified phone claim beats an unverified one;
  support can release an unverified number, with a warning when it leaves the
  user no way to sign in.
- **21 Sep (D-1 … D-19):** no phone code at sign-up in R1 (D-1) · suggest an
  email + contact support + admin-assisted reset (D-2) · Razorpay live on
  21 Oct (D-3) · deletion: hidden at once, restorable 30 days, then erased,
  invoices kept (D-6) · neutral no-credit copy on mobile (D-7) · Help page on
  prosiddhi.com (D-8) · app ID `com.prosiddhi.app` (D-9) · push in R1 (D-10) ·
  GST fields hidden for Individual employers (D-11) · Rejected tab with the
  reason (D-12) · credit grant/refund in Release 2 (D-13) · keep "already
  registered" messages + strict rate limits (D-16) · suspended accounts
  blocked at once (D-17) · risk-based R1 QA; iOS not in R1 (D-19) ·
  SLAs: documents in 48 h, reported jobs in 36 h (PJP-129).
  Full text: `../_jira-merge/phase0a-verified-2026-09-21.md` §9.
- **Permanently out of scope:** Aadhaar, escrow, WebSockets for chat, voice
  transcription. `.ics` interview invites ARE in scope (2026-07-16).

## 11. Team

Shaik (owner) · **Nazir** (frontend lead + acting PM; all decisions go to him) ·
Asrar (backend) · Prabhjot Singh (backend; admin console from 5 Oct) ·
Bharath Kumar (website) · Sailaja, Krishna (mobile) · Nayan (DevOps; Noor
supports) · Nazeeb (QA lead), Farhana (QA) · Raja Gopal (DLT / D-U-N-S
signatory) · Satya (security testing — role to confirm).

## 12. Other documents

[PRODUCT.md](PRODUCT.md) — what we build and the scope rules ·
[MONETIZATION.md](MONETIZATION.md) — pricing and billing ·
[DEPLOY.md](DEPLOY.md), [deploy-checklist.md](deploy-checklist.md),
[go-live-config.md](go-live-config.md) — deploying ·
[messaging-registration-runbook.md](messaging-registration-runbook.md) — DLT / MSG91 / Meta ·
[store-policy-assessment.md](store-policy-assessment.md) — Play billing ·
[qa/](qa/) — test plans and the defect register ·
mobile's own tracker: `../../prosiddhi-mobile-app/docs/STATUS.md`.
