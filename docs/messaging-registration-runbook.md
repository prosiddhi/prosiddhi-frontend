# Messaging Vendor Registration — Action Runbook

**For:** Shaik Ishaq (Owner & Sponsor)
**From:** Nazir Hasan (FE + acting PM)
**Date:** 2026-07-10
**Status:** Awaiting your decisions on §2 and your signature on Tracks B and C

---

## 1. The ask, in one paragraph

ProSiddhi cannot send a single email, SMS, or WhatsApp message today. Not because the code is
missing — because the vendor accounts and government registrations that carry those messages have
never been opened. Three of the four items below need **company legal documents and an authorised
signatory**, which means they need you, not the engineering team. Total cash outlay is roughly
**₹6,000–₹12,000 to start**, and the longest item takes **3–7 working days** once documents are in
hand. Everything else — the code — is already understood and can be built in parallel.

**What I need from you:** four decisions (§2), one signature packet (§4), and one scope call (§7).

---

## 2. Decisions only you can make

Please answer these five. Everything downstream is blocked on them.

| # | Decision | Options / what I need | My recommendation |
|---|---|---|---|
| **D1** | **Sending domain for email** | ✅ `prosiddhi.com` is purchased. Remaining: **confirm the subdomain**, and tell me **who holds the DNS** (which registrar, and who has the login). | Send app mail from the subdomain **`mail.prosiddhi.com`**, never from the root `prosiddhi.com`. Two reasons: if app mail is ever flagged as spam it won't damage the reputation of the domain your team's human email goes out on; and a subdomain gets its own SPF record, avoiding a conflict with the root domain's existing mail setup (see Track A, step 4). |
| **D2** | **SMS sender ID ("header")** | Exactly **6 letters, A–Z**. No digits, no spaces, no symbols. Must reflect the brand and must not already be taken by another business. | 1st choice **`PRSDHI`** · 2nd **`PROSID`** · 3rd **`AZKASH`**. We submit in that order; if one is taken we fall to the next. |
| **D3** | **A dedicated phone number for WhatsApp** | Meta requires a number that is **not currently active on consumer WhatsApp or the WhatsApp Business app**. It must be able to receive an OTP once. A new SIM or a landline works. | Buy a fresh SIM for this. Do not use your personal number or any number already on WhatsApp — it cannot be migrated back easily. |
| **D4** | **Budget approval** | DLT entity registration ≈ **₹5,900 incl. GST** (confirm on the portal — some sources describe this as an annual renewal rather than one-time). Plus MSG91 message credits (pay-as-you-go). Optionally, MSG91 sells a paid **"DLT Premium Support"** package where they walk the filing through for you. | Approve the ₹5,900 and buy the DLT Premium Support. It is cheap relative to a week of your time and the filing is fiddly. |
| **D5** | **Bridge route for OTP while DLT is pending** | Ship using an international-route OTP provider so QA and the demo can proceed without DLT? (Details and caveats in §6.) | **Yes.** It unblocks us in days instead of weeks and is explicitly designed as a launcher. We migrate to our own DLT header before real users arrive. |

---

## 3. Why this is urgent

Two independent reasons.

**The app breaks the day it goes to production.** In development, the backend returns the OTP directly
in the API response so we can test. In production it correctly stops doing that — but nothing sends
the OTP instead, because no SMS or email provider has ever been connected. The API will return a
cheerful "success" and the user will receive nothing. **Registration and login become impossible for
every user, silently, with no error in the logs.** Phone OTP is the only way to register for
ProSiddhi. This is not a bug QA will catch; it is a bug your first customer catches.

**The clocks are elapsed time, not developer time.** DLT approval takes 3–7 working days. Meta
verification takes anywhere from 10 minutes to 14 working days. Nobody can code faster to shorten
these. Our own risk register flagged DLT as critical-path back in **May 2026** (risk R11) and it was
never started. Every day we don't file is a day added to launch.

---

## 4. What to have ready — once, for everything

Collect all of this into one folder before starting any track. Tracks B and C both draw from it.

> **The single rule that causes most rejections:** every document must show the exact legal entity name —
> `Azkashine Software & Services Pvt. Ltd.` — spelled **identically** everywhere. Meta rejects
> abbreviations outright: if the certificate says "Limited", do not type "Ltd." Same for the address: do
> not shorten "Street" to "St."

### A. Company legal documents

- [ ] **Company PAN card**
- [ ] **GST registration certificate**
- [ ] **Certificate of Incorporation** (carries the CIN)
- [ ] **Registered business address proof** — utility bill, bank statement, or lease. Must show the *same*
      address entered in the portals. For Meta, the **business name and address (or phone) should appear on
      the same document**, and it should be **less than one year old**.
- [ ] **Letter of Authorisation** — company letterhead, signed and sealed by a Director, naming the
      authorised signatory. *(Template in Appendix A.)*
- [ ] **Trademark certificate or brand-authorisation letter for "ProSiddhi"** — *standby only.* Produce it
      only if the DLT portal challenges our claim to the `PRSDHI` header. Do not submit unprompted.

### B. The authorised signatory (a person, not a document)

- [ ] **Government photo ID** — PAN, Aadhaar, Passport, Driving Licence, or Voter ID
- [ ] **Their mobile number and email address** — portal credentials, OTPs, and the Entity ID all arrive here.
      Use a company address, not a personal one.

### C. Physical and digital assets

- [ ] **A fresh SIM card** — for the WhatsApp Business number. It must **not** be active on consumer
      WhatsApp or the WhatsApp Business app, and it must be able to receive one OTP. A landline works too.
      Do not use a personal number: migrating it back off the Business API later is painful.
- [ ] **DNS login for `prosiddhi.com`** — which registrar, and who holds the password.
- [ ] **A working mailbox at the domain** — e.g. `admin@prosiddhi.com`. Meta prefers to send its
      verification code to an address at the verified domain.
- [ ] **A live website at `prosiddhi.com`** — Meta checks that the business has a real, reachable web
      presence matching the name on the documents. **If the domain currently serves nothing, put at least a
      landing page up before submitting Track C.**

### D. Payment

- [ ] **A company card or net-banking access** to pay ≈ ₹5,900 on the DLT portal. Pay from a company
      instrument rather than a personal one — it keeps the audit trail clean.

### E. Information to have typed out (portals will ask for these verbatim)

- [ ] Exact legal name — `Azkashine Software & Services Pvt. Ltd.` *(confirm against the Certificate of Incorporation)*
- [ ] **CIN**, **GSTIN**, and **PAN** numbers
- [ ] Registered address, exactly as it appears on the documents
- [ ] Business category / industry
- [ ] Website URL — `https://prosiddhi.com`
- [ ] Chosen SMS header — `PRSDHI`, with `PROSID` and `AZKASH` as fallbacks

**Format rules for every upload:** soft copies, clear and legible, **under 5 MB each** (Jio's limit; Airtel
allows 10 MB — staying under 5 MB satisfies both portals). Photo IDs and address proofs must be visually clear.

### Which track needs what

| | Track A — Email | Track B — SMS / DLT | Track C — WhatsApp / Meta |
|---|:---:|:---:|:---:|
| Company PAN | KYC | ✅ | |
| GST certificate | KYC | ✅ | ✅ *(either this…)* |
| Certificate of Incorporation | | ✅ | ✅ *(…or this)* |
| Address proof | | ✅ | ✅ |
| Letter of Authorisation | | ✅ | |
| Signatory photo ID | | ✅ | |
| Fresh SIM | | | ✅ |
| DNS login | ✅ | | |
| Mailbox at domain | | | ✅ |
| Live website | | | ✅ |
| Payment method | | ✅ | |

*MSG91's own KYC list (needed to move the account from DEMO to LIVE) is not published on their site. Expect
company PAN + GST + address proof; confirm with their support when the account is created.*

---

## Track A — Email · *fastest, no government involvement, start today*

No TRAI, no Meta, no telecom operator. Email needs nothing but DNS records on a domain we already own.
This is why email lands first even though it was second on our original list.

**Who does it:** whoever holds DNS for the sending domain (likely Nayan — infra). Not a signature task.

### Steps

1. **Confirm the subdomain** — `mail.prosiddhi.com` (decision D1) — and identify who holds DNS for
   `prosiddhi.com`.
2. **Create the MSG91 account** at [msg91.com](https://msg91.com) and complete **KYC**. Until KYC is done
   the account sits in **DEMO** status and delivers only test content. KYC is what flips it to **LIVE**.
   *(Same account serves SMS and WhatsApp — do this once.)*
3. **Add `mail.prosiddhi.com`** in the MSG91 email dashboard. It will generate three DNS records.
4. **Publish the DNS records** at the registrar:
   - **SPF** — a `TXT` record on `mail.prosiddhi.com` authorising MSG91's servers to send as us.
     > ⚠️ **A domain may have only ONE SPF record.** Two SPF `TXT` records on the same name make *both*
     > invalid and all mail starts failing — including, potentially, human email. This is precisely why we
     > send from the `mail.` subdomain: it carries its own SPF, entirely separate from whatever
     > `prosiddhi.com` itself uses for Google Workspace or similar. **Do not add MSG91's SPF to the root
     > domain.**
   - **DKIM** — a `CNAME` or `TXT` record carrying the cryptographic signing key.
   - **DMARC** — a `TXT` record at `_dmarc.mail.prosiddhi.com` telling receiving mail servers what to do
     with mail that fails the first two. Start at `p=none` (monitor only), tighten later once we can see
     that legitimate mail is passing.
5. **Wait for propagation** (minutes to a few hours) and click *Verify* in the dashboard.
6. **Hand the API key to engineering.** Done.

**Elapsed time:** 1–3 days, nearly all of it waiting on DNS and KYC.

**Bonus:** owning `prosiddhi.com` also unblocks Track C step 4 — Meta prefers to send its verification code
to an email address *at the verified domain*, so a working `something@prosiddhi.com` mailbox makes the
WhatsApp verification smoother. Worth setting one up early.

**Note on vendor choice:** we locked "email via MSG91" on 2026-05-13 to keep SMS + WhatsApp + Email on a
single vendor and a single bill. MSG91 does have a real transactional email product with SPF/DKIM/DMARC
support, so that decision still holds. If its deliverability disappoints us later, the code is being
written so that swapping to Resend or Zoho ZeptoMail is a one-file change. **This is not a decision worth
agonising over.**

---

## Track B — SMS via DLT · *the long pole, needs your signature*

**What DLT is:** India's telecom regulator (TRAI) requires every business sending commercial SMS —
including OTPs — to register itself, its sender ID, and the exact text of every message on a
blockchain-backed portal run by the telecom operators. Operators are legally obliged to **block SMS from
unregistered senders**. There is no legal way around this for domestic SMS.

**Who does it:** you, or someone you authorise via the Letter of Authorisation. Requires the §4 documents.

**Important:** you register on **one** operator's portal and it syncs to the others. Do not do this five times.

### Steps, in order

**B1. Choose a portal.** Either is fine:
- **Airtel** — [dltconnect.airtel.in](https://dltconnect.airtel.in/signup/) · ~₹5,000 + 18% GST = **₹5,900** · approval 1–3 business days
- **Jio TrueConnect** — [trueconnect.jio.com](https://trueconnect.jio.com/) · **₹5,900** incl. GST · approval 2–7 business days

*Recommendation: Airtel. Faster stated turnaround, and 10 MB document limit.*

**B2. Register the Entity (the "Principal Entity" / PE).** Upload the §4 documents. You will receive a
unique **19-digit Entity ID (PE ID)** by email. *Approval: 1–3 days.*

**B3. Initiate the PE–TM Chain.** ⚠️ **This is the step everyone forgets.** Log back into the portal and
explicitly link **MSG91 as your Telemarketer (TM)**. Without this link, MSG91 is not authorised to send on
your headers and every message fails — even with a valid Entity ID and approved templates.

**B4. Register the Header (sender ID).** Submit `PRSDHI` (decision D2). It must be exactly 6 alphabetic
characters and unique across the DLT system. Category: **not promotional**. *Approval: 1–3 days. Free.*

**B5. Register the content templates.**

> ⚠️ **The single most common rejection.** Do **not** select the **`Transactional`** category. On the DLT
> portal that category is reserved for **banks and financial institutions**. ProSiddhi is not a bank, so an
> OTP template filed as `Transactional` **will be rejected**.
>
> **Select `Service Implicit`.** This is the correct category for OTPs sent by non-banking businesses, and it
> still delivers 24×7 to numbers on the Do Not Disturb registry — which is what we need.

Templates must match the sent message **character for character**, with variables marked `{#var#}`.
Two are enough for v1 (drafted in Appendix B). *Approval: 1–3 days each. Free.*

**B6. Enter the IDs into MSG91.** Paste the **Entity ID**, **Header**, and each **Template ID** into the
MSG91 dashboard. Engineering does the rest.

**Elapsed time:** 3–7 working days with clean documents. 7–21 days if anything is inconsistent —
which is why §4's "spell the entity name identically everywhere" matters more than it sounds.

---

## Track C — WhatsApp via Meta · *free, start today, lands whenever it lands*

**Who does it:** you. Requires the §4 documents plus the dedicated phone number from D3.

### Steps

1. **Create a Meta Business Manager account** (if Azkashine doesn't have one) at
   [business.facebook.com](https://business.facebook.com).
2. **Enter business details.** They must match the legal documents **exactly** — no abbreviating
   "Street" to "St." or "Limited" to "Ltd." unless the document itself abbreviates it. Address and phone
   must both appear on the *same* uploaded document.
3. **Submit Business Verification.** Upload the Certificate of Incorporation or GST certificate. Free.
4. **Receive the confirmation code.** Meta sends it by email (must be an address *at the verified domain* —
   another reason Track A's domain decision comes first), phone, or WhatsApp.
5. **Connect the dedicated number** (D3) to the WhatsApp Business Account via MSG91's dashboard.
6. **Submit utility templates** for approval — application status, interview scheduled, interview reminder,
   payment confirmation. These are typically approved within hours. Free. *(Drafts in Appendix C.)*

**Elapsed time:** Meta says 10 minutes to 14 working days. Plan for a week.

---

## 5. What we are NOT doing, and why

**We are not sending OTP over WhatsApp**, despite that being in the locked v1 scope (decision Q7). See §7 —
this needs your sign-off.

**We are not using the international OTP route for anything except OTP.** Order updates, reminders, and
anything promotional must go over the DLT-registered route once it exists. Misusing the international route
gets the account filtered and suspended.

**We are not exempt from the DPDP Act.** Whichever route carries the message, we still owe consent capture,
audit logs, and proper data handling. That's engineering's job and it's in the security spec.

---

## 6. The bridge: shipping OTP before DLT approval (decision D5)

Providers such as **Message Central (VerifyNow)** and **StartMessaging** route OTP over **international SMS
gateways** rather than India's domestic network. Indian operators don't enforce DLT template-matching on
international-origin OTP traffic, so it delivers with **zero registration from us**. Sign up, get credits,
send within minutes.

**Honest limitations — I want these on the record before you approve:**

- **OTP and authentication only.** Signup, login, 2FA, password reset. Nothing else. Ever.
- **Messages arrive under the provider's sender identity, not `PRSDHI`.** Less trustworthy-looking to the user.
- **It costs more per message** than a domestic DLT route. This stops mattering only above ~100,000 OTP/day.
- **The vendors themselves position it as a launcher, not a destination.** The recommended pattern is: launch
  on the international route, register DLT in parallel, migrate.

For getting QA unblocked and the demo running, this is the right trade. It is not what we launch on.

---

## 7. Scope change requiring your sign-off ⚠️

**Locked scope (decision Q7, 2026-05-09) says WhatsApp delivers OTP in v1, with SMS as fallback. That is not
achievable, and I'd rather tell you now than in September.**

Meta has closed WhatsApp OTP to new businesses. From MSG91's own documentation: authentication templates
require completing one of Meta's *Scaling Paths* **and** sustaining a **minimum of 2,000 business-initiated
conversations per day per phone number**, and are "allowed only for accounts in higher messaging tiers."
Meta imposed this because OTP abuse accounted for roughly 40–50% of scam traffic on the platform.

A brand-new WhatsApp Business Account starts in the lowest tier. **ProSiddhi cannot send WhatsApp OTP on day
one, and won't qualify until it is already doing 2,000 conversations a day** — which is a volume we'd only
reach well after launch. This is a chicken-and-egg that no amount of engineering resolves.

**What survives:** WhatsApp *utility* templates are a different category and are **not** subject to that gate.
So application status updates, interview scheduled, interview reminders, and payment confirmations all still
work in v1 exactly as planned. Only the OTP use case dies.

**What I recommend:** amend Q7 to drop WhatsApp OTP. SMS becomes the sole OTP channel (with email OTP already
built as a second factor for email verification). WhatsApp remains in v1 for notifications. If you agree, I'll
record it in `docs/PRODUCT.md` §5 (locked scope) and `.claude/CLAUDE.md`.

---

## 8. If we do nothing

- We cannot go to production. Not "it'll be degraded" — **no user can create an account.**
- The DLT clock does not start. Every day of delay is a day added to the launch date, one-for-one.
- The demo continues to work, because development mode returns OTPs in the API response. **This is exactly
  why the problem has stayed invisible for two months.**

---

## Appendix A — Letter of Authorisation (template)

> *On Azkashine Software & Services Pvt. Ltd. letterhead. Signed and sealed by a Director.*

```
Date: __________

To Whom It May Concern,

This is to certify that Azkashine Software & Services Pvt. Ltd.
(CIN: ____________, GSTIN: ____________, PAN: ____________),
having its registered office at ______________________________,
hereby authorises Mr./Ms. ____________________ (PAN: ____________)
to act as the Authorised Signatory of the Company for the purpose of
registration on the Distributed Ledger Technology (DLT) platform, and
to register the Company's Entity, Headers and Content Templates thereon.

All actions performed by the said authorised person in this regard shall
be binding upon the Company.

For Azkashine Software & Services Pvt. Ltd.

_______________________
(Name)
Director
(Company Seal)
```

---

## Appendix B — SMS templates to register (DLT)

Category for **both**: **`Service Implicit`** — *not* `Transactional`. See §B5.

The 10-minute validity below matches the backend's configured OTP expiry. Do not change the wording without
telling engineering, because DLT matches the sent message character-for-character against the registered text.

**Template 1 — Registration / login OTP**
```
{#var#} is your ProSiddhi verification code. Valid for 10 minutes. Do not share it with anyone. - ProSiddhi
```

**Template 2 — Password reset OTP**
```
{#var#} is your ProSiddhi password reset code. Valid for 10 minutes. Do not share this code with anyone. - ProSiddhi
```

---

## Appendix C — WhatsApp utility templates (Meta)

All are **utility** category — not authentication. Submit after Business Verification clears.

1. **Application received** — *"Hi {{1}}, your application for {{2}} at {{3}} has been received."*
2. **Application accepted** — *"Congratulations {{1}}! Your application for {{2}} has been accepted."*
3. **Application rejected** — *"Hi {{1}}, thank you for applying to {{2}}. The employer has moved forward with other candidates."*
4. **Interview scheduled** — *"Hi {{1}}, your interview for {{2}} is scheduled for {{3}} at {{4}}."*
5. **Interview reminder (24h)** — *"Reminder: your interview for {{1}} is tomorrow at {{2}}."*
6. **Payment confirmation** — *"Payment of ₹{{1}} received. Your ProSiddhi plan is active until {{2}}."*

Each will need a Hindi variant before code freeze.

---

## Appendix D — Glossary

| Term | Plain English |
|---|---|
| **TRAI** | India's telecom regulator. Makes the SMS rules. |
| **DLT** | The blockchain-backed portal where TRAI makes you register before you may send SMS. |
| **Principal Entity (PE)** | Us — the business whose messages these are. Gets a 19-digit Entity ID. |
| **Telemarketer (TM)** | MSG91 — the company that physically sends on our behalf. |
| **PE–TM Chain** | The link on the portal saying "MSG91 is allowed to send as us." Easy to forget; nothing works without it. |
| **Header / Sender ID** | The 6-letter name the SMS appears to come from. Ours will be `PRSDHI`. |
| **Content Template** | The exact pre-approved text of a message, with `{#var#}` where the OTP goes. |
| **Service Implicit** | The DLT category for OTPs from non-bank businesses. The correct one for us. |
| **SPF / DKIM / DMARC** | Three DNS records proving our emails really came from us. Without them, mail lands in spam. |
| **BSP** | Business Solution Provider — a Meta-approved reseller of WhatsApp API access. MSG91 is ours. |
| **WABA** | WhatsApp Business Account — the Meta-side container for our WhatsApp number and templates. |
| **DPDP Act** | India's data protection law. Applies regardless of which vendor or route we use. |

---

## Sources

- [MSG91 — DLT registration in India](https://msg91.com/help/dlt-registration-in-india) · [DLT process steps](https://msg91.com/help/dlt-registration-in-india/dlt-process) · [WhatsApp OTP prerequisites](https://msg91.com/help/whatsapp/whatsapp-otp) · [Common FAQs (KYC / DEMO→LIVE)](https://msg91.com/help/msg91-common-faq-s)
- [Airtel DLT portal](https://dltconnect.airtel.in/signup/) · [Jio TrueConnect portal](https://trueconnect.jio.com/)
- [Message Central — DLT registration complete guide 2026](https://www.messagecentral.com/blog/a-complete-guide-on-dlt-registration) · [Sending OTP without DLT registration](https://www.messagecentral.com/blog/how-to-send-otp-sms-without-dlt-registration) · [WhatsApp Business API India guide](https://www.messagecentral.com/blog/whatsapp-business-api-india-guide)
- [SMSGatewayCenter — which category to register OTP templates under](https://www.smsgatewaycenter.com/blog/kb/under-which-category-should-i-register-my-otp-templates-on-the-dlt-portal/)
- [Meta — Verify your business in Meta Business Suite](https://www.facebook.com/business/help/2058515294227817)
