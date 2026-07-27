# Document Request — Messaging Vendor KYC & Registrations

**To:** Shaik Ishaq / Azkashine accounts & compliance
**From:** Nazir Hasan (FE + acting PM)
**Re:** Documents needed to switch on ProSiddhi's email / SMS / WhatsApp messaging
**Priority:** High — production cannot go live without this

---

## Why this is needed (30 seconds)

ProSiddhi's code can send OTPs and notifications, but the vendor account (MSG91) and the
government/Meta registrations that actually *carry* those messages need the company's legal
documents and an authorised signatory. Without this, **no user can register or log in** once we go
to production — the app will silently send nothing.

I've already completed the technical email setup. The **next gate is KYC**, which only the company
can clear. The documents below also feed the SMS (DLT) and WhatsApp (Meta) registrations, so please
**gather them once** and we'll reuse the same set for all three.

---

## 1. Documents needed

### A — Needed now (to switch email from test-mode to live)

- [ ] **Company PAN card**
- [ ] **GST registration certificate**
- [ ] **Registered business address proof** — utility bill, bank statement, or lease.
      Must show the *same* registered address as the other documents, and be **less than one year old**.
- [ ] **Authorised signatory** — one person's **government photo ID** (PAN / Aadhaar / Passport /
      Driving Licence / Voter ID), plus their **name, mobile number, and a company email address**
      (not a personal one — portal logins and OTPs will go here).

### B — Please also gather now (same papers unlock SMS + WhatsApp)

- [ ] **Certificate of Incorporation** (the one carrying the CIN)
- [ ] **Letter of Authorisation** — on company letterhead, **signed and sealed by a Director**, naming
      the authorised signatory. *(Ready-to-fill template: Appendix A of
      `docs/messaging-registration-runbook.md`.)*
- [ ] **Details typed out** (portals ask for these verbatim):
  - Exact legal company name
  - CIN, GSTIN, PAN numbers
  - Registered address, exactly as printed on the documents
  - Business category / industry
  - Website URL

---

## 2. The one rule that causes most rejections ⚠️

Every document must show the **exact legal entity name, spelled identically everywhere**:

> **Azkashine Software & Services Pvt. Ltd.**
> *(Please confirm this exact spelling against the Certificate of Incorporation before we submit.)*

Meta and the DLT portal reject mismatches outright — if the certificate says "Limited", we must not
type "Ltd."; if the address says "Street", we must not shorten it to "St." Same name, same address,
character-for-character, on every upload.

---

## 3. Format rules for the soft copies

- **Soft copies** (scans or clear photos), one file per document.
- **Under 5 MB each.**
- **Clear and fully legible** — photo IDs and address proofs especially.

---

## 4. What happens next

1. Please share the **Section A** documents first — that alone lets me move email to live.
2. **Section B** can follow shortly after; it starts the SMS (DLT) registration, which is the slowest
   step (3–7 working days once filed), so the sooner it's in hand, the sooner that clock starts.
3. Send everything to **[Nazir — specify channel: email / shared drive folder]**.

> Note: MSG91 does not publish its exact KYC checklist, so they *may* ask for one additional item when
> we submit. The set above covers the known requirements; I'll flag immediately if anything else comes up.

Thank you — this is the main blocker between "built" and "live", and it's entirely in the company's hands.
