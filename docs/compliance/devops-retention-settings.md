# DevOps — logs, backups, clocks and region

**For:** Nayan and Noor, setting up production on Google Cloud.
**Version:** 17 Oct 2026.

Our Privacy Policy makes promises that only the infrastructure can keep. Each setting below
says what to set, and which promise or law it keeps. Please set them **before launch** —
two of them cannot be changed later.

---

## 1. Everything in India

**Set:** every service that holds data in **`asia-south1` (Mumbai)** — Cloud SQL (Postgres),
Cloud Storage buckets, Memorystore (Redis), the VMs, and the log bucket in §2.

**Why:** the policy says *"Your information is stored and processed in India"*, and CERT-In
requires logs to be kept inside India.

## 2. Logs — keep 1 year, in India ⚠️ decide before the first log is written

**Set:**
1. Create a log bucket in **`asia-south1`** with retention **365 days**.
2. Route the `_Default` sink (all application and system logs) to that bucket.
3. Leave `_Required` (Google's own audit logs) as it is — its retention cannot be changed.

**Why 365 days:**
- CERT-In direction 28 Apr 2022, para (iv): logs of all systems, kept **at least 180 days, inside
  India**, and handed over on request.
- DPDP Rules 2025 (from about May 2027): keep logs for **1 year**.
- Our policy: *"Server logs are kept for up to one year … and then deleted."* — so not longer than 1 year.

**Watch out:** a log bucket's region **cannot be changed** after it is created, and the default
retention is only **30 days** (Google Cloud Logging docs). If we start with the defaults, the first
months of logs are in the wrong place and are deleted too soon.

**Also:** the app already masks phone numbers and emails in its logs. Never add a log line that
prints a phone, email, OTP, token, password or GPS point.

## 3. Database backups — rolling, short

**Set:** Cloud SQL automated daily backups kept **7 days**, point-in-time recovery **7 days**.

**Why:** the policy says *"Backups are replaced on a rolling schedule, so erased information also
disappears from them in time."* When someone's account is erased on day 30, their data must be
gone from every backup about a week later. Long-lived backups would break that promise.

If we ever take a manual backup (before a big migration), delete it within 7 days, and write down
that we did.

## 4. File buckets — no old copies

**Set:** on the documents bucket and the profile-photo bucket, either turn **object versioning off**,
or add a lifecycle rule that **deletes non-current versions after 7 days**.

**Why:** when a user deletes a document or their account, the file must really go. With versioning
on and no rule, the "deleted" file stays as an old version forever.

Also: the documents bucket must stay **private** (files are opened only through links that expire in
minutes). Only the profile-photo bucket is public — the policy says so.

## 5. Clocks — Indian time servers

**Set:** on every VM, set the time service (chrony) to use the Indian government's time servers
(NIC's `samay1.nic.in` / `samay2.nic.in`, or NPL's) — ⚠️ check the current server names on the NIC
and NPL websites.

**Why:** CERT-In direction para (i): all systems must sync their clocks to the NTP servers of NIC or
NPL, or to servers traceable to them. When we report an incident, our log times must match theirs.

## 6. The nightly jobs

The backend runs its nightly sweeps at **03:00 IST**: it erases accounts 30 days after deletion,
deletes 180-day registration records when they expire, once a quarter sends the rules reminder,
and saves the day's count of active users for the admin Analytics page (needs migration
`2026-10-27_2_analytics_daily_active`).
With 2 app VMs both start the job, and a database lock lets only one do the work — so nothing to
set, but please **alert us if the job log shows `cron:sweep:…:failed`** for two nights in a row.
The policy promises the 30-day erase; if the job stops, we break it.

## 7. Access

- Every person who can open production has their **own** Google account with **2-step verification**.
  No shared logins.
- Give the least access that does the job. Read-only for anyone who only needs to look.
- Keep secrets (`JWT_SECRET`, DB password, MSG91 key, Razorpay keys, `OTP_PEPPER`) in Secret
  Manager or the server's environment — never in Git, chat or email.
- When someone leaves, remove their access the same day.

## 8. Before launch — tick these

- [ ] All data services in `asia-south1`
- [ ] Log bucket in `asia-south1`, 365 days, `_Default` sink routed to it
- [ ] Cloud SQL backups 7 days, PITR 7 days
- [ ] Buckets: versioning off or non-current versions deleted after 7 days; documents bucket private
- [ ] VM clocks synced to NIC/NPL
- [ ] Alert on `cron:sweep:…:failed`
- [ ] 2-step verification for everyone with production access
- [ ] Google Analytics: production only (web `NEXT_PUBLIC_GA_MEASUREMENT_ID`, app
      `ANALYTICS_ENABLED=true`), nothing on staging; retention 14 months; Google signals off
- [ ] Send Nazir the settings (screenshots are fine) — they go in our compliance folder

## Sources

- CERT-In direction No. 20(3)/2022-CERT-In, 28 April 2022, paras (i) and (iv):
  https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
- Google Cloud Logging — buckets (retention 1–3650 days, default 30; region fixed at creation):
  https://docs.cloud.google.com/logging/docs/buckets
- Our Privacy Policy, sections 10, 11 and 13.
