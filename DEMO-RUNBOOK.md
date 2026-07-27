# DEMO RUNBOOK — Employer Monetization, Taxonomy, Candidate DB, Team, Invoices, Interviews

**Purpose:** a self-contained, step-by-step script to give the demo. Everything needed is here — accounts, URLs, exact clicks, what to point out, expected results, and Q&A prep.
**Payment rules reference:** see `docs/pricing/pricing-rules.md` (quick answers) and the full specs in `docs/pricing/`.

---

## 0. Setup — start the three apps

| App | Repo | Command | URL |
|---|---|---|---|
| **Backend** | `prosiddhi-backend` | `npm run dev` | http://localhost:5000 |
| **Portal (main FE)** | `prosiddhi-frontend` | `npm run dev` | http://localhost:3000 |
| **Admin** | `prosiddhi-admin` | `npm run dev -- -p 3001` | http://localhost:3001 |

- Quick health checks: `http://localhost:5000/health` (should be `healthy`), portal loads at `:3000`, admin redirects to its login at `:3001`.
- The **demo data lives in Postgres**, so it survives app restarts — if a server is down, just restart it; the seeded accounts/data are still there.
- Backend `.env` note: invoices need `COMPANY_NAME` + `COMPANY_GSTIN` + `COMPANY_GST_STATE` set (already set locally with demo values).

### Demo accounts (password for all: `Demo@12345`)

| Role | Login | State |
|---|---|---|
| **Employer** (primary) | `demo.employer@prosiddhi.test` | Pro plan · ~64 post / ~653 download credits · 3 seats (owner + 1 teammate accepted, 1 free) · 2 invoices · 2 jobs · 1 applicant |
| **Teammate** (employer) | `teammate.demo@prosiddhi.test` | Accepted seat — use for the "accept invite" flow |
| **Seeker** | `demo.seeker@prosiddhi.test` | For the seeker-side taxonomy screens |
| **Admin** | *(needs an admin credential — ask Asrar; not seeded)* | Admin console at `:3001` |

### Handy direct links (logged in as the employer)
- Unlock candidate (Ramesh, locked): `/employer/workers/dd639542-00f5-4281-94a2-7757d702a4de`
- Second candidate (Suresh): `/employer/workers/ccdcca58-5cf5-46d4-be75-5ca786b538e7`

---

## PART A — Employer money-loop

### A1. Dashboard — the credit wallet  ·  `/employer`
- **Log in** as the employer, land on the dashboard.
- **Point out:** the **Credit wallet** card — **post-credit** and **download-credit** balances with expiry dates, and a **View invoices** link.
- **Talking point:** "Employers buy credits. **Posting a job spends 1 post credit; unlocking a candidate spends 1 download credit.** Job seekers are always free."
- Header actions: **Find workers · Team · Post a Job**. Below: stats, your 2 jobs, and **Recent applications → Ramesh Kumar**.

### A2. Pricing page  ·  `/employer/welcome` → scroll to Pricing (or `#pricing`)
- **Point out:** the **Basic / Enterprise toggle**. Basic = Single-post pack + Starter tiers; Enterprise = the Pro tiers.
- Each card: plan name, **base price + "*GST as applicable"**, and the inclusions (job posts, candidate unlocks, seats, validity).
- **Talking point:** "8 tiers — a ₹499 one-time single-post pack up to annual Pro plans with team seats. Prices are GST-exclusive; 18% GST is added at checkout."

### A3. Checkout — LIVE Razorpay (the test-card moment)  ·  Buy button on any card
- Click **Buy now** on a plan → the **checkout modal** opens.
- Enter (optional) a **GSTIN**, and pick a **Place of supply** (state) — required if no GSTIN. *(GST is CGST+SGST if the state matches our home state, else IGST.)*
- Click **Pay** → the **Razorpay** sheet opens.
- **Test card:** `4111 1111 1111 1111` · any future expiry (e.g. `12/30`) · any CVV · any name.
- On success → **credits are added, the modal shows a success confirmation.** Go back to the dashboard to see the wallet updated.
- **Talking point:** "Razorpay-hosted checkout (PCI-compliant). On success the server verifies the payment signature, grants the credits, and generates a GST invoice."

### A4. Top-up pop-up  ·  wallet "Buy credits"
- On the dashboard wallet card, click **Buy credits** → the **top-up pop-up** (the ₹499 single-post pack card) → **Top up now** flows into the same Razorpay checkout.
- **Talking point:** "Quick top-up when you're low — the ₹499 pack adds 1 post + 3 unlock credits and never expires."

### A5. Post a job (spends a credit) + taxonomy picker  ·  `/employer/jobs/new`
- **Point out:** the **cascading 3-level picker — Category → Sector → Job title** (pick one to see the next populate).
- Fill title/description/location/job type → **Publish** → **1 post credit is spent** and the job goes live (30-day window).
- **Post-gate:** at **0 post credits** the form is replaced by an upsell ("out of credits → Top up / View plans"). *(Our demo account has plenty of credits, so mention this rather than exhausting them — or use a fresh account to show it.)*

### A6. Delete-refund toast (NEW polish)  ·  `/employer/jobs`
- Post a throwaway job, then **delete** it immediately (Trash icon → confirm).
- Because it's **< 24h old with 0 applications**, the BE **refunds the post credit** → a green **"1 post credit was refunded to your wallet"** toast appears.
- **Talking point:** "Anti-abuse safeguard — you get the credit back only if you delete a fresh job with no applicants yet."

### A7. Candidate database — search + PAID UNLOCK  ·  `/employer/workers`
- **Search page:** open `/employer/workers`. ⚠️ **Known gap:** the FTS search currently returns no results (backend indexing item — Asrar). So **demo the unlock via the direct link** instead:
- Open the **Ramesh** direct link above → the profile shows **name, location, skills, experience — but contact is hidden** (locked snippet).
- Click **Unlock contact (1 credit)** → explicit confirm ("use 1 candidate-unlock credit?") → **email + phone are revealed**, and the download balance drops by 1.
- **Talking point:** "Naukri/LinkedIn-style — you see a snippet free, then spend 1 download credit to unlock contact. Re-viewing the same candidate later is free."

### A8. Interview scheduler (existing feature, works with seeded data)  ·  Recent applications → Ramesh
- From the dashboard **Recent applications**, click **Ramesh Kumar** (or `/employer/candidates` → open his application).
- On the candidate detail page: **Accept** the application, then **Schedule interview** — pick a date/time/notes in the modal.
- **Talking point:** "When an employer accepts an applicant, they schedule an interview; the seeker sees it on their side."

### A9. Team seats  ·  `/employer/team`
- **Point out:** **seat usage (2 of 3 used)** and the **roster** — owner + **Priya Teammate (Active)** — with 1 free seat.
- **Invite:** type an email → **Send invite** → a **copyable invite link** appears (no email is sent in v1; the owner relays the link).
- **Accept (optional, needs a 2nd window):** open the invite link in an incognito window logged in as `teammate.demo@…` (already accepted) or a fresh employer → **Accept invite**.
- **Talking point:** "Pro plans include 2–3 seats. Invites are a one-shot token; the owner shares the link. Removing a seat frees it up."

### A10. Invoices + PDF  ·  `/employer/invoices` (or wallet → View invoices)
- **Point out:** the **2 GST invoices** (`INV/26-27/…`), each with date and GST-inclusive total.
- Click **Download** → the generated **GST invoice PDF** downloads.
- **Talking point:** "Every purchase generates a proper GST invoice — sequential number, CGST+SGST or IGST depending on place of supply, downloadable anytime."

### A11. Plan-expiry renewal nudge (NEW polish — conditional)
- On the wallet card, when a plan is **within 7 days of expiry** an amber **"expires in N days — Renew"** banner appears; if **expired**, a red one. *(The demo account's plan is months out, so it's correctly hidden — mention it and, if asked, we can show it on an account with a near-expiry plan.)*

---

## PART B — Seeker-side taxonomy

### B1. Registration category step  ·  `/register`
- Start a **fresh seeker registration** (new email/phone) → reach the **"work preferences"** step → the **3-level cascading picker** (Category → Sector → Job title) — replaces the old flat list.

### B2. Profile preferred triple  ·  `/profile` (logged in as `demo.seeker@…`)
- The **Preferred category → sector → job title** cascading picker on the seeker profile edit screen.

### B3. Job-feed category filter  ·  `/job-feed`
- Open the **Filter** panel → the **Category → Sector → Job title** filter (plus location, salary, job type). Applying it filters the feed.

---

## PART C — Bilingual (EN + HI)
- Use the **language switcher** in the header → **हिन्दी**. Every screen above is fully translated. Switch back to English.

---

## PART D — Admin console (`:3001`)  — brief
- The admin app runs at **http://localhost:3001** (separate repo `prosiddhi-admin`).
- **Needs an admin login** (email + password) — not seeded; get one from Asrar (or create via the admin-creation endpoint).
- What it covers: taxonomy CRUD (categories/sectors/job titles), employer approval, and a revenue view (sum of successful payments). *(If no admin credential is available, skip this part or show the login screen only.)*

---

## Q&A prep — known caveats to steer around
- **Candidate search empty** — BE FTS indexing item (Asrar); demo unlock via the direct candidate link.
- **Razorpay = TEST mode** — test cards only (`4111 1111 1111 1111`).
- **Expiry nudge** is conditional (≤7 days / expired) — hidden on the demo account.
- **Admin login** not seeded — needs a credential from Asrar.
- **Not in v1 by design (say so if asked):** cancel button, refunds/money-back, auto-renewal, promo codes.
- **Deployed backend** exists at `http://103.225.224.149:5000` (all routes present), but this demo uses the **local** stack for full control (invoices work, seeded data).

## Full source-of-truth docs
- `docs/pricing/pricing-rules.md` — quick Q&A reference (this repo)
- `docs/pricing/employer-monetization-functional-spec.md` — the what & why (rules)
- `docs/pricing/employer-monetization-technical-design.md` — endpoints & schema
- `docs/pricing/employer-monetization-delete-refund-spec.md` — every reversal rule
- `docs/pricing/employer-monetization-decisions-tracker.md` — the 23 locked decisions
