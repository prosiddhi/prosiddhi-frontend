# ProSiddhi — Staging Demo Sheet

**Environment:** staging · `103.225.224.149` · **Built and verified 2026-08-11.** Every account and every step below was exercised against the live staging API.

---

## 🔗 URLs

| | URL |
|---|---|
| **Web portal** | **http://103.225.224.149:3000/** |
| Admin console | http://103.225.224.149:3001/admin/login — ⚠️ **see the blocker below** |

## 🔑 Logins — the role toggle on `/login` MUST match

| Role | Email | Password |
|---|---|---|
| **Employer** — Apollo Care Services | `qa.employer@prosiddhi.test` | `Employer@12345` |
| **Job Seeker** — QA Seeker | `qa.seeker@prosiddhi.test` | `Seeker@12345` |
| Job Seeker #2 — Priya Reddy | `qa.seeker2@prosiddhi.test` | `Seeker@12345` |

> Open the **employer in a normal window** and the **seeker in Incognito** so both stay logged in — the best moment needs both.

---

## 🔴 Blocker: the admin console cannot be demoed on staging

No admin credentials exist that we hold. The bootstrap route `POST /api/admin/create` was removed on 2026-07-14 as a security hole, and the first SUPER_ADMIN now only exists via a seed migration whose email and password hash are **placeholders filled in at deploy time**. Only whoever deployed staging (Asrar / Nayan) has them.

**Options, in order of preference:**
1. **Get the credentials from Asrar/Nayan before you start** — one message, and staging is complete.
2. **Run the admin console locally against the staging API** — `npm run dev` in `prosiddhi-admin` with `NEXT_PUBLIC_API_URL=http://103.225.224.149:5000/api`. Still needs a staging admin login, so this only helps if the console itself is the problem.
3. **Skip admin** and say: *"the admin console is feature-complete — 13 screens — I'll walk it separately."* Then demo it on local afterwards if asked.

---

## ⚠️ What staging can and cannot show

**Ready and verified:**
- 9 live jobs in the feed
- The employer owns **"Hospital Ward Assistant"** with **2 PENDING applicants**
- A chat thread already open between the employer and the seeker
- EN / हिंदी switching

**Not available on staging** — do not promise these:
- ❌ **Wallet / plans / GST invoices** — the employer is on the free trial, no purchased plan, no invoices
- ❌ **Team seats** — `seatCap 1`, so there is no roster to show
- ❌ **Candidate database at scale** — only 3 trial unlocks
- ❌ **Google sign-in** — not configured on this deployment
- ❌ **Real SMS / WhatsApp / email** — not configured; OTPs appear on screen instead
- ❌ **Live payments** — Razorpay is in test mode

> 💡 If the money screens matter to this audience, demo them on **local** instead (`demo.employer@prosiddhi.test` / `Demo@12345` has 66 job posts, 656 unlocks, 3 seats and a plan to 2027). See `DEMO-CHEATSHEET.md`.

### The one trap
**The employer has 0 job-post credits left** (the trial credit went into posting the demo job). Posting another job hits the **paywall gate**.

Play it deliberately: *"here's what happens when an employer runs out — the upsell gate"*. That is the monetization system working, and on staging it's the best monetization beat you have. Just don't hit it by accident.

---

## ▶️ FLOW 1 — Job Seeker (~4 min) · `qa.seeker@prosiddhi.test`

1. **Job feed** — 9 live jobs. Show **search**, **filters**, **category**, **Recommended**, **Near By**.
2. Open **"Hospital Ward Assistant"** → full details, **Related jobs** → hit **Save**.
3. **Contact recruiter** → phone/email revealed. *Say: this is a gated, paid action on the employer side.*
4. **My Applications** → his application to the Ward Assistant role.
5. **Messages** → the open conversation with Apollo Care.
6. **My Interviews** → currently empty. **Leave this tab open** — it populates in Flow 2.
7. **Settings → English ⇄ हिंदी** → the UI switches and *stays* switched as you navigate.

## ▶️ FLOW 2 — Employer (~5 min) · `qa.employer@prosiddhi.test`

1. **Dashboard** — 1 job, 2 applications, 2 pending. Real data.
2. **Jobs** → open **"Hospital Ward Assistant"** → show **edit** and the **live preview**.
3. **Applicants** → two PENDING candidates with their cover messages.
4. ⭐ **Accept → Schedule Interview** → pick a date/time → save.
5. ⭐ **Flip to the seeker window → My Interviews → refresh.** The interview you just scheduled is there.

> This cross-window moment is the strongest thing in the demo. Both applicants are PENDING — don't spend them beforehand.

6. **Chat** — reply to the seeker; it lands in the other window within ~10s, read receipts ✓ → ✓✓.
7. *(Optional, deliberate)* **Post a job** → the **paywall gate** appears. *"Credits are spent per post; here's the upsell."*

---

## 🗣️ What to say

- "The **web product is feature-complete** — seeker, employer and admin, all on real data. The backend is feature-complete too."
- "That includes the **full monetization system**: plans, Razorpay checkout, GST invoices, a paid candidate database, and multi-seat teams sharing one wallet." *(Built — just not provisioned on this staging box.)*
- "**English and Hindi throughout** — our users are blue-collar and low-literacy, so that isn't a nice-to-have."
- "**Mobile is ~86%** and in progress. What's left overall is mostly **external configuration** — a live domain, payment keys, SMS/WhatsApp approvals — not unbuilt product."

### ⛔ Do NOT say (all wrong now)
- ~~"voice cover-letters" / audio messages~~ — **removed from the product entirely**
- ~~"AI content scan is backend-pending"~~ — **it's live**
- ~~"we're ~70% of the MVP"~~ — the web product is **feature-complete**

---

## 🩹 If something looks off

- **Wrong-login error** → the role toggle doesn't match the account. Employer ⇄ Job Seeker.
- **"My Interviews" empty** → schedule the interview first (Flow 2 step 4), then refresh the seeker tab.
- **Paywall when posting** → expected, 0 credits. See the trap above.
- **An OTP is needed** → staging runs in dev mode, so the **OTP shows on screen**. No SMS or email is sent.
- **A page is slow on first open** → the route is compiling. Give it a few seconds.
