# ProSiddhi — Analytics plan (DRAFT for Nazir's approval)

**Drafted 2026-10-27.** Nothing is built yet. Approve or change the two lists below
(Part A numbers, Part B events) and the open decisions in §5; the build starts after that.

Two kinds of analytics, both on web **and** mobile:

- **A — Business numbers** counted from our own database, shown on a new **Reports** page in
  the admin console. No outside tool. No policy change.
- **B — Visitor and behaviour tracking** with **Google Analytics 4 through Firebase** (project
  `prosiddhi-prod-510106`, which the app already uses for push). Needs a Privacy Policy update
  first (§4).

---

## 1. Part A — business numbers (admin Reports page)

Every number can be filtered by date range (today · 7 days · 30 days · custom) and, where it
makes sense, split by **web / app**, **state / city** and **category**.

✅ = can be counted from data we already store · 🆕 = needs a small new backend record.

### Job seekers
| # | Number | Counted from |
|---|---|---|
| A1 | New seeker sign-ups (per day / week / month) | `User.createdAt`, role JOB_SEEKER ✅ |
| A2 | …split web vs app | sign-up `LegalConsent.userAgent` (app = Dart client) ✅ — confirm the app's user agent |
| A3 | …split by state, city, category | `JobSeeker.cityId`, `preferredCategory` ✅ |
| A4 | "Actively looking" seekers | the actively-looking flag ✅ |
| A5 | Active seekers — seen in the last 1 / 7 / 30 days | `User.lastSeenAt` ✅ (today's value only — see A-history) |
| A6 | Dormant: signed up, never applied | no `JobApplication` row ✅ |
| A7 | Dormant: not seen for 30+ days | `User.lastSeenAt` ✅ |
| A8 | Applications per seeker (average) | `JobApplication` ✅ |
| A9 | Seekers missing city or job choice (`needsJobPreferences`) | `JobSeeker` fields ✅ |

### Employers
| # | Number | Counted from |
|---|---|---|
| A10 | New employer sign-ups, individual vs business | `Employer`, `User.createdAt` ✅ |
| A11 | Waiting for admin approval (now) | already on the admin dashboard ✅ |
| A12 | Time from sign-up to approval (average) | 🆕 approval time is not stored today |
| A13 | Employers who never posted a job | no `Job` row ✅ |
| A14 | Employers who posted exactly one job ("9 of 10 post 1 job" — tracker N31) | `Job` ✅ |
| A15 | Jobs posted (per period), by category / city | `Job.createdAt`, `JobCity` ✅ |
| A16 | Live jobs now | `Job.status`, `liveUntil` ✅ |
| A17 | Jobs with 0 applications · jobs that hit the 50 cap | `JobApplication` ✅ |
| A18 | Candidate unlocks (per period) | `EmployerCandidateUnlock.unlockedAt` ✅ |

### Hiring
| # | Number | Counted from |
|---|---|---|
| A19 | Applications (per period) and per job (average) | `JobApplication` ✅ |
| A20 | Accepted applications ("hires") and interviews scheduled | `ACCEPTED` status, `Interview` ✅ |

### Money
| # | Number | Counted from |
|---|---|---|
| A21 | Revenue per day / month | `PaymentHistory` SUCCESS ✅ (monthly already exists) |
| A22 | Paying employers · first-time vs repeat | `PaymentHistory` ✅ |
| A23 | Failed payments | `PaymentHistory` status ✅ |
| A24 | Sales by plan, and how many used an offer | `PaymentHistory`, `PriceOffer` ✅ |

### Funnels (step-by-step drop-off)
| # | Funnel |
|---|---|
| A25 | Seeker: signed up → first application → first accepted |
| A26 | Employer: signed up → approved → first job → first payment |

### Accounts leaving
| # | Number | Counted from |
|---|---|---|
| A27 | Accounts deleted per month, by self vs admin | `User.deletedAt`, `deletedBy` ✅ |

### A-history — one gap
`lastSeenAt` only keeps the **latest** visit, so we can say "1,200 seekers were active in the
last 7 days" **today**, but not draw a line of active users over past weeks. 🆕 Fix: a small
nightly job saves the day's active counts into one new table. History starts from the day it
ships.

---

## 2. Part B — events sent to Google Analytics

The **same event names on web and app**, so one report covers both. GA4 records page views
(web) and screen views (app) by itself.

**Sent with every event:** `platform` (web / android) · `app_language` · `user_role` (seeker /
employer / guest).

**Page and screen names are cleaned before they are sent:** no query string, and every ID or token
in a path becomes `:id` (the app sends the route template). `/invite/<token>` carries a sign-in
credential — it must never reach Google.

**Switched on in production only:** web `NEXT_PUBLIC_GA_MEASUREMENT_ID` (unset = nothing loads),
app `--dart-define=ANALYTICS_ENABLED=true` (off = nothing is sent). Staging sends nothing.

| Event | When | Extra details |
|---|---|---|
| `role_selected` | landing: "Looking for a job" / "Looking to hire" | `role` |
| `language_selected` | language picked | `language` |
| `sign_up_started` | first sign-up screen opened | `role` |
| `sign_up_step` | each step passed (phone code, email code, details) | `step` |
| `sign_up` *(GA4 standard)* | account created | `role`, `method` (phone / google) |
| `login` *(GA4 standard)* | signed in | `method` |
| `use_my_location` | "Use my location" tapped | `result` (ok / denied / no_city) |
| `job_search` | a search or filter is run | `category`, `has_city` — **never the typed text** |
| `job_viewed` | job details opened | `category` |
| `job_saved` | job saved | `category` |
| `apply_started` / `apply_done` | apply opened / sent | `category` |
| `job_post_started` / `job_post_done` | employer opens / submits Post a Job | `category` |
| `candidate_search` | employer searches candidates | `has_category`, `has_city` |
| `candidate_unlocked` | contact unlocked | — |
| `plans_viewed` | plans page opened — **web only** | — |
| `begin_checkout` *(GA4 standard)* | Pay clicked — **web only** | `plan_code`, `value` |
| `purchase` *(GA4 standard)* | payment confirmed — **web only** | `plan_code`, `value`, `currency` INR |

**Never sent to Google, in any event:** name · phone · email · address · exact location ·
date of birth · gender · documents · typed search text · job or company names · any ID of a
person. Purchases stay web-only (locked decision D2), so the app sends no money events.

---

## 3. Who builds what

| Part | Work | Suggested owner |
|---|---|---|
| A | Report endpoints (admin-only) + the nightly active-users count | Asrar |
| A | Reports page with charts in the admin console | Prabhjot |
| B | Google tag + the events above on the website | Bharath |
| B | `firebase_analytics` + the same events in the app | Sailaja / Krishna |
| Both | Check the numbers match (admin vs Google Analytics) | Nazeeb, Farhana |

---

## 4. Legal steps before Part B is switched on

Required by `compliance/service-provider-contracts.md`:

1. **Privacy Policy:** remove "We do not use advertising or analytics trackers"; name Google
   Analytics / Firebase as a provider (section 9) and say the data may be stored outside India
   (section 10). Same change in all 10 languages.
2. **Raise the policy version** — every user accepts once more (expected).
3. **Accept Google's data processing terms** in the Firebase / Google Analytics console.
4. Add Google Analytics to `service-provider-contracts.md` and to `PROCESSORS` in the backend's
   `data-export.service.ts`.
5. **Play Data Safety form:** declare "App activity" collected for analytics.
6. Turn **off** Google Signals and ad personalisation in GA4 (we are not using ads), and turn
   **Enhanced measurement off** on the web stream (it would send raw links and addresses).
7. Set GA4 data retention to **14 months** (the policy says so; the default is 2).

Open for the lawyer review: Google Analytics cookies are set for signed-out visitors, who
have not accepted the policy. Decide whether a cookie notice is needed for them.

Part A needs none of this.

---

## 5. Decisions (Nazir, 2026-10-27)

1. **Lists in §1 and §2: approved as written.**
2. **Analytics ships in the FIRST app release.** So the Privacy Policy update (§4) must be live
   before the app is uploaded, and the Data Safety form declares analytics from the start.
3. **No "Share usage data" switch.** Covered by accepting the Privacy Policy.
4. **Our user ID is NOT sent to Google** (not asked; the recommendation stands). GA4 cannot
   join one person's web and app visits.
