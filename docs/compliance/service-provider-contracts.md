# Service providers — contracts checklist

**For:** Nazir and Shaik (who accept contracts for Azkashine), and the lawyer.
**Version:** 17 Oct 2026 · **Status:** checklist — nothing below is ticked until someone has done it.

Our Privacy Policy (section 9) names six companies that handle personal data **for us**, and
says they do it *"under contract, and only for these purposes"*. Under the DPDP Act we stay
responsible for what they do with it. So for each one we need a written contract that says
they process data only on our instructions and keep it safe. Most of these companies have a
standard **data processing addendum (DPA)** that applies when you accept their terms or click
accept in their console.

**For each provider, find and save:** the terms we accepted, the date, which account accepted
them, and a PDF copy in the shared drive folder `Legal/Processors/`.

---

## The six providers

### 1. Google Cloud — servers, database, files

- **Gets:** everything we store — all personal data, documents, photos, logs, backups.
- **Where:** our project is set to India (`asia-south1`, Mumbai). Check every service
  (Cloud SQL, Cloud Storage, Memorystore, Cloud Logging) really is in that region.
- **Contract:** Google Cloud's Cloud Data Processing Addendum plus the Google Cloud terms. Check in
  the Cloud console's legal / compliance settings that it is accepted for our billing account
  (⚠️ the menu name changes — search the console for "data processing").
- [ ] DPA accepted — date: ____ — by: ____
- [ ] Every data service confirmed in `asia-south1`
- [ ] Billing/organisation owner is a company account, not a personal Gmail

### 2. MSG91 (Walkover Web Solutions, India) — SMS, email, WhatsApp

- **Gets:** phone numbers, email addresses, the text of each code or message we send.
- **Where:** India.
- **Contract:** MSG91's terms of service and privacy policy; ask MSG91 support for a DPA in
  writing if their terms do not cover processing on our behalf.
- [ ] Terms saved — date: ____
- [ ] Asked MSG91 whether message content and logs are deleted, and after how long: ____
- [ ] DLT entity registration (header AZKASH) and the Meta WhatsApp templates are in Azkashine's name

### 3. Google Firebase Cloud Messaging — push notifications

- **Gets:** the phone's push token, and the notification text (which can show the first words of a
  chat message).
- **Where:** may be outside India — the policy says so (section 10).
- **Contract:** Firebase's data processing terms, accepted in the Firebase console's project
  settings (⚠️ search the settings for "data processing" or "privacy").
- [ ] Data processing terms accepted — date: ____
- [ ] Firebase project owned by the company Google account (the new one for Play), not a personal one

### 4. Razorpay — employer payments on the website

- **Gets:** employer name, email, phone, payment details (card/UPI handled on Razorpay's own page;
  we never see card numbers). We keep only ids, amounts and status (trimmed since 16 Oct).
- **Where:** India (RBI requires payment data to be stored in India).
- **Contract:** the Razorpay merchant agreement accepted during KYC.
- [ ] Merchant agreement saved — date: ____
- [ ] Webhook secret stored only in the server's secret settings

### 5. Google Sign-In — only for people who choose it

- **Gets:** the person's Google account email and name, when they press "Sign in with Google".
  ⚠️ Switched off in the app today; on the website check before launch.
- **Contract:** covered by the Google Cloud / Google API terms of the OAuth project.
- [ ] OAuth consent screen shows ProSiddhi, the privacy policy link and the support email

### 6. OpenAI — scam check on job post text

- **Gets:** only the **text of a job post**, when a staff member runs the scam check. No job seeker
  data. No employer contact details should be in the text — staff should not paste any in.
- **Where:** outside India (the policy says so, section 10).
- **Contract:** OpenAI's API terms and its Data Processing Addendum (signed online from the OpenAI
  platform settings).
- [ ] DPA signed — date: ____
- [ ] Confirmed in the OpenAI platform settings that API data is not used for training
- [ ] API key held by a company account, kept only in the server's secret settings

---

## Rules for adding a provider

Before any new service receives personal data (an analytics tool, a crash reporter, a new SMS
company, a CRM):

1. Ask: does it really need personal data? If not, don't send any.
2. Get its DPA and check where it stores data.
3. **Add it to the Privacy Policy first** (section 9, and section 10 if outside India), bump the
   policy version — everyone accepts again — and only then switch it on.
4. Add it to this file and to `PROCESSORS` in the backend's `data-export.service.ts` (the
   "Download my data" file lists our providers).

## What to ask any provider (keep the answers in the folder)

- Do you process our users' data only on our instructions?
- Where is it stored? Who else (sub-processors) touches it?
- How fast will you tell us about a breach on your side? (We have 6 hours for CERT-In.)
- When we stop using you, do you delete the data, and how do you confirm it?
- Do you have ISO 27001 or SOC 2? (Save the certificate or the trust page link.)
