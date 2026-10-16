# Data breach response — runbook

**For:** anyone at Azkashine who finds or hears about a security problem with ProSiddhi.
**Owner:** Nazir (incident lead) · **Version:** 17 Oct 2026 · **Status:** draft for lawyer review.

If something looks wrong — **start the clock and call the incident lead. Do not wait to be sure.**
The 6-hour limit below starts when we *notice* the problem, not when we finish investigating.

---

## 1. What counts as an incident

Report it inside the team at once if any of these happens or might have happened:

- Someone who should not have it got personal data: a database copy, a backup, a document
  file, an export, a list of phone numbers.
- Someone signed in to a server, the database, Google Cloud, MSG91, Razorpay, GitHub or the
  admin console without permission — or a staff password or API key leaked.
- Our website or app was changed by someone else (defacement, a strange link, injected code).
- Malware or ransomware on a server or a staff laptop that holds data or keys.
- A fake ProSiddhi app, website or WhatsApp number that tricks users (phishing).
- A large attack that takes the service down (DDoS).
- A mistake of our own: data sent to the wrong person, a bucket made public, a log that
  printed phone numbers, a test database with real data left open.

**Example:** a developer pushes `.env` with the database password to a public GitHub repo for
ten minutes. That is an incident — the key leaked, even if we see no sign of use.

These are from CERT-In's list of incidents that **must** be reported (Annexure I of the
28 April 2022 direction): unauthorised access to systems or data, data breach, data leak,
website defacement or intrusion, malware, attacks on database/mail/DNS servers, identity theft
and phishing, DoS/DDoS, attacks on payment systems, malicious or fake mobile apps, attacks on
cloud systems, attacks on AI/ML systems.

---

## 2. Who does what

| Role | Person | Job in an incident |
|---|---|---|
| Incident lead | **Nazir** | Decides, keeps the timeline, signs off every report |
| Systems | **Nayan** (DevOps), Noor | Contain, preserve logs, rotate secrets, restore |
| Backend | **Asrar**, Prabhjot | Find what data was touched and whose; fix the cause |
| Grievance Officer | **Rambabu Gorantla** | Answers users who write in; sends the user notices |
| Owner | **Shaik** | Told within 1 hour; approves notices to users and authorities |

If the incident lead cannot be reached in 30 minutes, the next person on this list leads.

---

## 3. The clock

`T0` = the moment anyone at Azkashine first noticed or was told. Write it down.

### Within 1 hour — contain and preserve

1. **Open an incident log** — a shared document named `INC-<date>-<short name>`. Every action,
   with the time (IST) and who did it. This log becomes our reports.
2. **Stop the leak** without destroying evidence:
   - leaked key or password → revoke and replace it (Google Cloud service account key, DB
     password, `JWT_SECRET`, MSG91 auth key, Razorpay keys, OTP pepper);
   - a public bucket → make it private;
   - a hacked server → take it out of the load balancer; **do not wipe it** — snapshot it first;
   - a hacked staff account → disable it and sign it out everywhere.
3. **Preserve logs.** Export the relevant Cloud Logging range and database audit logs to a
   locked bucket. CERT-In can ask for logs, and they must cover at least the last 180 days.
4. Tell Shaik.

### Within 6 hours — report to CERT-In (law, now)

The CERT-In direction of 28 April 2022, para (ii): report **within 6 hours of noticing**.

- **Email:** `incident@cert-in.org.in` · **Phone:** 1800-11-4949 · **Fax:** 1800-11-6969
- Use the incident reporting form on `www.cert-in.org.in`. Send what we know at hour 6, even if
  it is incomplete, and say that an update will follow. Late is worse than incomplete.
- Include: what happened, when we noticed (T0), which systems, what data may be affected,
  what we have done so far, our point of contact.
- Keep the sent email and any reference number in the incident log.

### Without delay — tell the Data Protection Board and the affected people

DPDP Rules 2025, Rule 7. ⚠️ *These duties formally start around 13 May 2027, and the exact
wording should be checked against the Gazette (G.S.R. 846(E)). Our Privacy Policy already
promises to tell users and the authorities, so we follow it now.*

**To each affected person** — through their account and the phone/email they registered, in
plain words, in their language where we can. It must say:

1. what happened — its nature, extent and when;
2. what it may mean for them;
3. what we have done and are doing to reduce the harm;
4. what they can do to protect themselves;
5. who to contact: the Grievance Officer, `grievance@prosiddhi.com`.

**To the Data Protection Board** — a first notice without delay: what happened, how big, when
and where, and the likely impact.

### Within 72 hours — the detailed report to the Board

Rule 7(2)(b). Unless the Board gives more time on a written request, within 72 hours of
becoming aware:

1. updated, detailed information about the breach;
2. the facts, circumstances and reasons that led to it;
3. what we did or will do to reduce the risk;
4. what we know about who caused it;
5. what we changed so it does not happen again;
6. a report on the notices we sent to affected people.

### Others to tell, when they apply

- **Razorpay** — if payment data, the Razorpay dashboard or webhook secret is involved.
- **Google Play** — if our app or the developer account was compromised, or a fake app copies us.
- **Police / cyber crime** — `cybercrime.gov.in` (helpline 1930) if money was stolen or a crime
  is involved. Ask the lawyer first unless someone is in immediate danger.
- **Our service providers** (MSG91, Google Cloud, Firebase, OpenAI) — if the problem is on their
  side, ask them for their incident report in writing.

---

## 4. Message templates

### To an affected user (in-app notification + SMS/email)

> **Important: a security problem affected your ProSiddhi account.**
> On [date] we found that [plain description, e.g. "someone got a copy of the phone numbers of
> some job seekers"]. Your [which data] may have been seen by someone else. Your [what was NOT
> affected, e.g. "password and documents"] were not affected.
> We have [what we did, e.g. "closed the gap and changed our keys"].
> To stay safe: [e.g. "do not share any code you receive by SMS; ProSiddhi will never ask you
> for money"].
> Questions: our Grievance Officer, grievance@prosiddhi.com.

Never put more personal data in the notice than the person already has.

### First email to CERT-In

> Subject: Cyber incident report — AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED (ProSiddhi) — [type]
> Organisation: AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED, brand ProSiddhi (prosiddhi.com).
> Noticed at: [date, time IST]. Type: [from the CERT-In list]. Systems: [e.g. API server on
> Google Cloud asia-south1, database]. Data possibly affected: [types, approximate number of
> people]. Actions taken: [list]. Status: investigation ongoing; update to follow by [time].
> Point of contact: [name, designation, mobile, email].

---

## 5. After the incident

Within 2 weeks: a short review in the incident log — what happened, why, what we changed.
No blame. Add any new check to the deploy checklist so the same gap cannot reopen.

## 6. Things to set up before launch

- [ ] Send our **point of contact** to CERT-In (`info@cert-in.org.in`) in the Annexure II format:
      name, designation, organisation, office address, email, mobile, office phone.
- [ ] Logs kept 180 days or more, in India — see `devops-retention-settings.md`.
- [ ] Server clocks synced to NIC/NPL time — see `devops-retention-settings.md`.
- [ ] Everyone in the table in §2 has this file and each other's mobile numbers.
- [ ] A tested way to send an in-app notice to a list of users (the backend can write SYSTEM
      notifications, as the quarterly reminder does — `legal-reminder.service.ts`).

## Sources

- CERT-In direction No. 20(3)/2022-CERT-In, 28 April 2022, paras (i)–(iv) and Annexures I–II:
  https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf (read 17 Oct 2026).
- DPDP Rules 2025, Rule 7 (secondary text): https://dpdpa.com/dpdparules/rule7.html — ⚠️ check
  against the Gazette.
- Our Privacy Policy, section 13 "How we protect your information".
