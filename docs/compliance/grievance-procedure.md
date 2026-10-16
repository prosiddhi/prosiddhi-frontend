# Complaints and data requests — procedure

**For:** Rambabu Gorantla (Grievance Officer) and anyone who helps him answer users.
**Version:** 17 Oct 2026 · **Status:** draft for lawyer review.

Our Privacy Policy (section 16) and Terms (section 15) make public promises. This file is how
we keep them. If this file and the policy ever disagree, the policy wins — tell Nazir so this
file is fixed.

---

## 1. The promises — the clocks

| What came in | Confirm we got it | Finish by |
|---|---|---|
| Any complaint | **24 hours** | **7 days** |
| Content that breaks Terms section 7 (fake job, asking seekers for money, obscene, hateful, someone pretending to be someone else, illegal…) | 24 hours | **36 hours** |
| A reported job post (the Report button in the app) | — | reviewed within **36 hours** |
| A request about personal data (see a copy, correct, delete, nominate) | 24 hours | **30 days** |
| Intimate or sexual images of a person shared without consent | at once | **remove at once** — ⚠️ the law sets a short limit (24 hours in the 2021 Rules; the 2026 amendment may have cut it further). Lawyer to confirm the number |
| An order from a court or a government agency | at once | **act at once** — ⚠️ lawyer to confirm the current legal limit |

The clock starts when the email or report **arrives**, not when we read it. Weekends count.

At the end, tell the person what we decided and that they can appeal to the Government's
**Grievance Appellate Committee** at **gac.gov.in within 30 days** — and, for personal data, complain
to the **Data Protection Board of India**.

---

## 2. Where complaints arrive

- `grievance@prosiddhi.com` — the Grievance Officer's mailbox (on every legal page). ⚠️ Must
  exist before launch.
- `biz-ops@azkashine.com` and +91 70265 54789 — the support contacts on the website. Anything
  that is really a complaint gets copied into the log below.
- **Report** on a job post — goes to the admin console (Reports). ⚠️ There is no "report a user"
  button; a complaint about a person comes by email.

## 3. The log — one row per complaint

Until it is built into the admin console, keep a shared spreadsheet, **`Grievance log`**, that
only the Grievance Officer, Nazir and Shaik can open. It holds personal data — never forward it.

| Column | Example |
|---|---|
| Ref | `G-2026-0042` |
| Received (date, time IST) | 18 Oct 2026, 09:15 |
| Channel | grievance email |
| From (name, registered phone/email) | Ravi K., +91 98xxxxxx21 |
| Type | fake job / money asked / data request / account / payment / other |
| Summary | "Employer asked ₹2,000 for training before joining" |
| Acknowledged at | 18 Oct, 10:02 |
| Due by | 19 Oct, 21:15 (36 h — Terms §7) |
| Action taken | post deactivated, employer account deleted |
| Closed at · reply sent | 18 Oct, 16:40 |

Keep each row for 3 years after it is closed, then delete it.

---

## 4. How to handle each type

### A fake job, or someone asking a job seeker for money

This is our most important complaint: our users are workers who can lose real money.

1. In the admin console, open the job post. Use **Mark violation** or **Deactivate**, and **Reject**
   if it is still waiting for review.
2. If the employer is clearly a fraud, **delete the employer account** (Admin → Employers → delete).
   ⚠️ There is no "suspend" action in the system today — deleting is the only way to stop an
   account. A deleted account can be restored within 30 days if we were wrong.
3. Reply to the person who complained. Remind them: ProSiddhi never asks seekers for money.
4. If money was already paid: give them `cybercrime.gov.in` and helpline **1930**.

### Other content that breaks the Terms

Remove or deactivate it within 36 hours, tell the person who posted it why (Terms section 8),
and record it.

### A request about personal data

**First check it is really them.** Reply only to the phone number or email registered on the
account. Never send data to a different address because someone asks.

- **"Send me my data"** — show them **Settings → Download my data** on prosiddhi.com. If they
  cannot use it, Nazir or a backend developer runs the same export (`GET /me/export`) for them
  and you send the file to their registered email.
- **"Correct my data"** — most fields they can edit themselves. Anything else: ask a backend
  developer and record what changed.
- **"Delete my account"** — show them how (app: Profile → Delete account; web:
  prosiddhi.com/delete-account), or delete it from the admin console. Tell them: hidden at once,
  restorable for 30 days, then erased; a locked registration record is kept 180 days as the law
  requires; invoices are kept for tax law.
- **Withdraw consent** — WhatsApp messages and notification types are in Settings; push and
  location are in their phone settings. Withdrawing agreement to the whole Privacy Policy means
  deleting the account.
- **Nominate someone** — record the nominee's name and contact in the log. When the nominee later
  writes, ask for proof (for example a death certificate or a medical certificate), then act on
  the request as if from the user.
- **Someone under 18 has an account** — delete it from the admin console and record it.

### A complaint about us — a payment, a refund, a bug, a staff member

Find the facts, fix what is ours to fix, and reply with what we did. Payment refunds follow
prosiddhi.com/refund-policy; refunds always go back to the original payment method.

---

## 5. Reply templates

**Acknowledgement (within 24 hours):**

> Hello [name], we have received your complaint about [one line]. Your reference is [G-…]. We
> will reply by [date]. — Rambabu Gorantla, Grievance Officer, ProSiddhi

**Decision:**

> Hello [name], about your complaint [G-…]: [what we found] and [what we did]. If you are not
> satisfied, you can appeal to the Government of India's Grievance Appellate Committee at
> gac.gov.in within 30 days[, and for personal data, complain to the Data Protection Board of
> India]. — Rambabu Gorantla, Grievance Officer, ProSiddhi

Write back in the language the person used, if we can.

---

## 6. Every month

Rambabu sends Nazir one line per type: how many came in, how many met the clock, any that
missed and why. Repeated complaints about the same employer → Nazir decides on the account.

## Sources

- Privacy Policy sections 12 and 16; Terms sections 7, 8 and 15 (prosiddhi.com, version 2026-10-17).
- `docs/compliance/legal-compliance-plan-2026-10-16.md` §3.5 (grievance timelines and their sources).
