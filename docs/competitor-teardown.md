# Why our product feels like a cheap copy — a teardown

**Written:** 2026-08-18 · **By:** Claude, for Nazir · **Type:** analysis only, no code changed.

**How this was done.** I opened a real Chromium on a phone-sized screen (390×844 —
a cheap Android in portrait) and used apna.co, workindia.in, jobhai.com and
vahan.co myself. Then I logged into our own live product at `prosiddhi.com` as
`qa.seeker@prosiddhi.test` and `qa.employer@prosiddhi.test` and walked the same
journeys. Every number below was counted by a script inside the page, not
guessed. Screenshots are in the session scratchpad under `shots/` — filenames are
named at each claim.

---

## 1. The verdict

**We do not feel cheap because we lack features. We feel cheap because our screens
cost the user a lot and give back very little.**

Three things do it.

**First, we make people choose before we give them anything.** Our login screen
has 11 buttons on it. WorkIndia's login is one box — your mobile number — and a
"Skip" link. We ask a person to pick a role, then pick one of four sign-in
methods, before they have seen a single job.

**Second, our screens are mostly empty space.** On a phone, our job feed puts the
first job **991 pixels down the page**. That is 1.17 full screens of scrolling
before a job seeker sees one job. apna puts its first job at 234 pixels and fits
**three complete jobs** on the first screen. We fit **zero**.

**Third, and worst — several things we show do not work.** Our tagline is "Find
Jobs Near You". Our "Near By" tab, in production, right now, returns **0
Results**. A person who taps the thing our whole brand promises gets an empty
screen.

That is the feeling. The product looks like a job portal, but when you press on
it, parts give way. That is exactly what a knock-off feels like.

---

## 2. The journeys, counted

All numbers from a 390×844 phone screen, logged out unless said otherwise.

### How fast does a job seeker see a real job?

| Product | Taps from front page to a full job ad | First job appears at | Complete jobs on screen 1 | Login needed? |
|---|---|---|---|---|
| **apna.co** | **2** | 234 px | **3** | No |
| **workindia.in** | 1 (listing page) | top of list | 3 | No — wall appears only on Call/Apply |
| **jobhai.com** | 1 | top of list | 1–2 | No |
| **ProSiddhi** | **2 + login** | **991 px** | **0** | **Yes** |

Evidence: `shots/apna-s3-real-listing.png` shows three job cards — title, company,
city, salary range, tags — all on one screen. `shots/ours-s7-job-feed.png` shows
our feed on the same screen: logo bar, a big "Find Jobs Near You" heading, a
two-line paragraph, a search box, a city box, a Search button, a Filter button, a
muted-speaker icon, three tabs, a section heading, "10 Results", and then the
screen ends. The first job card is cut off at the bottom edge.

**We spend a whole screen telling a logged-in job seeker that this is a place to
find jobs.** They know. They logged in.

### Where does the money gate sit?

| Product | What is free | Where the wall is |
|---|---|---|
| **apna.co** | Browse + read every job ad | At apply — asks for a phone number |
| **workindia.in** | Browse + see the job's Call and WhatsApp buttons | At the call — one box, and a **Skip** link |
| **jobhai.com** | Browse; promises "Call HR directly to fix interview for **FREE**" | At register |
| **ProSiddhi (employer)** | **1 job post + 3 candidate unlocks, free — but only for 14 days, and we barely mention it** | After the trial is spent or expired |

**Correction, 2026-08-19.** An earlier draft of this section said we charge before
giving anything. That was wrong, and the error was mine: the account I tested,
`qa.employer@prosiddhi.test`, had **already posted a job and used its credits**. It
was not a new employer.

**We do give a free trial, and it is properly built.**
[credit.service.ts:445](../../prosiddhi-backend/src/services/credit.service.ts#L445)
grants **1 POST + 3 DOWNLOAD credits, valid 14 days**, once per employer. It is
idempotent and deduped on verified phone/email for an individual and verified
GSTIN for a business, so it cannot be farmed by re-registering. Good engineering.

**Verified end to end on a local backend, 2026-08-19.** I registered a genuinely
new individual employer against a local API and database (never production):
phone OTP → email OTP → `POST /employers/register/individual`. The account came
back `ACTIVE`, and `GET /employers/me/credits` returned:

```json
{ "post": { "balance": 1, "expiresAt": "2026-09-02" },
  "download": { "balance": 3, "expiresAt": "2026-09-02" } }
```

Exactly 1 post, 3 unlocks, 14 days. **The trial fires correctly**, including in the
current registration flow where email is verified *before* the account is created.
And "Post a Job" then works — the real 15-field form with a "Publish Job" button,
no paywall (`shots/trial-02-post-job.png`).

**But here is that employer's day-one dashboard** (`shots/trial-01-dashboard.png`):

> **Credit wallet**  \[+ Buy credits]
> **1** Job-post credits — Expires 02 Sept 2026
> **3** Candidate unlocks — Expires 02 Sept 2026

I searched the rendered page for the words. **"free" — absent. "trial" — absent.**
Both checked programmatically, both `false`.

So on the day we give a small business ₹589 of value, we show them a number, a
**deadline**, and a **"Buy credits"** button. It reads like a bill, not a gift.
Below it sit seven more zeros.

**The real problem is that we never tell the employer they have it.** The trial is
named in exactly two places: the **pricing page**
([employer.json:177](../src/locales/en/employer.json#L177) via
[PricingPlans.tsx:151](../src/components/employer/PricingPlans.tsx#L151)) and the
**terms** ([legal.json:153](../src/locales/en/legal.json#L153)).

It is **not** mentioned on the dashboard, in the wallet, during registration, or
on the paywall. A new employer's wallet just reads *"Credit wallet · 1 Job-post
credits · Expires 2 Sept"* — with no word that it is free, that it is a trial, or
what happens after. And when it runs out, the paywall says **"You're out of
job-post credits… buy a plan to keep hiring"** — never *"your 14-day free trial
has ended"*. Someone who never noticed the gift is simply told to pay.

Three consequences worth naming:

1. **The trial dies in 14 days.** An employer who registers, looks around, and
   comes back three weeks later has lost a free post they never knew they had.
   apna's free posting does not expire.
2. **A business employer's trial does not start until a human approves them** —
   activation for a business means admin approval after GST/CIN/ISO upload
   ([admin.controller.ts:121](../../prosiddhi-backend/src/controllers/admin.controller.ts#L121)).
   So the 14-day clock and the product both wait on us.
3. **The wallet is written in accounting language.** "Credit wallet", "Job-post
   credits", "Candidate unlocks", "Expires {date}" — correct, and meaningless to a
   shop owner with one vacancy.

Meanwhile WorkIndia's own front page says: *"Ready to hire? Post a new job. Start
Now to get calls within 48Hrs."* Free, immediate, and **stated on the front page**
— which is the part we are missing, not the free post itself.

### What our employer sees first

Our employer dashboard, first screen (`shots/phone-e-dashboard.png`), shows:

- 0 Job-post credits
- 0 Candidate unlocks
- 0 Unlocked candidates
- 0 Shortlisted
- 0 Accepted
- 1 Total Job, 1 Active Job, 2 Applications, 2 Pending

**Six zeros.** Their first impression of our product is an empty accounting
ledger with a "Buy credits" button next to it.

Then "Find workers" (`shots/phone-e-workers.png`) is an empty search box with the
message *"Search the candidate database by skill, job title, or keyword to find
workers."* We show them **no candidates at all** until they type. WorkIndia's home
page shows candidate counts and profiles before you have done anything.

### How fast do two humans actually talk?

| Product | How the seeker reaches the employer |
|---|---|
| **workindia.in** | **A green "Call" button and a "WhatsApp" button on the job card itself** (`shots/wi-s3-job-detail.png`) |
| **jobhai.com** | Front page promise: "Call HR directly to fix interview for FREE" |
| **apna.co** | Apply, then chat |
| **vahan.co** | Hiring runs over WhatsApp; barely a web product at all |
| **ProSiddhi** | Apply, then wait. **No phone number anywhere in the seeker flow.** |

Our job ad (`shots/ours-s8-job-detail.png`) shows "₹ Negotiable / Month" where
apna shows "₹1,20,000 - ₹1,49,999". It has two identical blue "Apply" buttons on
one screen and no way to contact anyone.

---

## 3. What they do that we do not

**They show a phone number, or a call button.** WorkIndia puts Call and WhatsApp
directly on every job card. That is the product. We built chat instead, and put a
paywall in front of contact.

**They say the price out loud, in the job ad.** apna shows a salary range on every
card. Ours says "Negotiable".

**They promise trust in plain words on the front page.** jobhai: *"100% FREE &
Verified Jobs"*, *"2 Crore+ Indians trust Job Hai App"*, *"A Naukri Group
company"*. This market is full of fraud and job scams. Our front page makes no
promise about fees, verification, or who we are.

**They offer the whole country.** jobhai: *"Explore jobs in 500+ cities"*. Our
city dropdown offers **four**: Bangalore, Delhi, Mumbai, Pune — hardcoded in
[src/lib/cities.ts:18-23](../src/lib/cities.ts#L18-L23). A person in Nagpur,
Kanpur, Patna or Coimbatore cannot pick their city.

**They let you in with one field.** WorkIndia asks for a mobile number and offers
"Skip" (`shots/wi-s3-job-detail.png`). We ask for a role, a method, an email and a
password.

**They switch language in one obvious tap.** jobhai puts *"आप यह पेज हिंदी में भी
देख सकते है !"* in a band across the top of the front page. We have ten languages —
more than any of them — and we bury the switch behind a dropdown labelled in
English.

---

## 4. What we do that hurts us

### 4a. Things that are broken

**"Near By" returns 0 Results.** Tested live today as `qa.seeker`. All Jobs = 10
results. Recommended = 1 result. **Near By = 0 results.**
(`shots/tab-NearBy.png`). The page header still reads *"Jobs Near You — Sorted by
distance from your location"* above an empty list.

Cause: [src/lib/api.ts:983-986](../src/lib/api.ts#L983-L986) — `getNearbyJobs`
sends only `radius`, `page` and `limit`. **No coordinates are ever sent**, because
nothing in the product captures one.

*Note: the brief predicted this tab returns every job. It does the opposite. It
returns nothing.*

**"Recommended" returns 1 job out of 10.** Same session. A recommendation engine
that finds one match in a ten-job database is not a feature, it is a fault.

**The whole production database has 10 jobs in it.** "10 Results" on All Jobs.
Whatever else we fix, an empty marketplace feels fake. jobhai advertises 20,000+
jobs in Delhi alone.

**The role toggle punishes you for guessing wrong — with a message about a URL.**
This is the clearest proof that the login screen actively costs us users.

I typed the **correct** employer email and the **correct** password, but left the
toggle on "Job Seeker". Both clients returned a red error:

> **"Please use the correct login URL for your account type"**

(`shots/web-role-mismatch.png`, `shots/emp-04-settled.png`.)

Three things are wrong with that.

1. It is **backend jargon**. The string comes from the API —
   [employer.controller.ts:106](../../prosiddhi-backend/src/controllers/employer.controller.ts#L106)
   and [jobseeker.controller.ts:111](../../prosiddhi-backend/src/controllers/jobseeker.controller.ts#L111)
   — and **both clients print it raw**.
2. It talks about a **"login URL"**. On the mobile app there is no URL. There is
   no address bar. The instruction is impossible to follow.
3. It **does not say what actually happened** ("this is an employer account") and
   **does not offer the fix**, even though the Employer button is two centimetres
   above the error.

A shop owner with the right password gets told they are at the wrong web address.
Most will conclude their account is broken and leave.

### 4b. Things that are built but wrong — the interesting ones

**We ship a "coming soon" icon in ten places.** `VoiceButton`
([src/components/feedback/VoiceButton.tsx](../src/components/feedback/VoiceButton.tsx))
is used in **10 files**. Tapping it shows a toast that says voice is coming soon.
There are **two of them on the login screen** — one beside Email, one beside
Password (`shots/ours-s2-login.png`) — and a muted-speaker icon sitting alone on
the job feed under the Filter button.

The code comment argues this is better than a dead button, and as code that is
true. As product it is not. **No competitor ships an icon whose only job is to
admit a feature is missing.** It is the single loudest "unfinished" signal in the
app, and it sits on the first screen a user ever fills in.

**The login screen is eight combinations.**
[src/app/login/page.tsx:19](../src/app/login/page.tsx#L19) is literally
`type Tab = 'email' | 'phoneOtp' | 'phonePassword' | 'google'`. On screen that is a
Job Seeker / Employer toggle **times** four method buttons in a 2×2 grid. Counted
live: **11 buttons, 3 inputs, 14 interactive elements** on a login screen
(`shots/ours-s2-login.png`).

A person who cannot read well now has to know: which of these am I, and which of
these four did I use last time? If they guess wrong, they get an error.

**The filter is a taxonomy tree.** Opening Filter (`shots/ours-filter-panel.png`)
gives Category → Sector → Job title, where Sector says *"Select a category first"*
and Job title says *"Select a sector first"*. Two of the three dropdowns are dead
until you feed the one above. That is a database schema shown to a user who wants
a driver job near their house.

**Corporate employers cannot post at all until a human approves them.**
[src/app/employer/register/under-review/page.tsx](../src/app/employer/register/under-review/page.tsx)
— the comment says `POST /api/jobs` returns 403 until GST/CIN/ISO documents are
uploaded and an admin flips the account to ACTIVE. So a business employer's path
is: register (6 screens) → wait for a human → then hit the credits paywall.

**Our footer tells every visitor the product is unfinished.** On every page:

> *"Our mobile app is on the way. The ProSiddhi Android app is in development.
> Until it launches, everything works in your mobile browser."*

It is honest, and it is on the live site, under the two "voice coming soon" icons.
A visitor is told twice per screen that they are using a preview.

**And the footer names the company wrongly.** It reads
*"© 2026 Azkashine Software & Services Pvt. Ltd.."* — with a **double full stop**.
The verified legal name is **AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED** —
"AND", not "&"; "PRIVATE LIMITED", not "Pvt. Ltd.". On a platform asking small
businesses for money and issuing GST invoices, getting our own registered name
wrong is a trust problem, not a typo.

**Our own monetization doc already admits the pricing page lies.**
[docs/MONETIZATION.md:117](MONETIZATION.md#L117): *"pay only for what you use" is
false for **7 of the 8 SKUs**.* And line 121: the post gate quotes **₹499** on a
charge that is actually **₹589** with GST.

### 4c. The two things Nazir called out — both confirmed

**"You can't tell employer from seeker apart."** Correct, and measurable.

The dominant brand colour on the seeker's job feed is `rgb(92, 194, 237)`. The
dominant brand colour on the employer's dashboard is `rgb(92, 194, 237)`. Same
logo, same top bar, same round blue avatar in the same corner, same card style,
same blue buttons. Compare `shots/ours-s7-job-feed.png` and
`shots/phone-e-dashboard.png` — the only difference in the header is that the
employer has a "Post a Job" button where the seeker has a mail and a bell icon.

These are two different products for two different people with opposite goals.
One is a worker looking for money. The other is a business spending money. They
look identical.

**"The UI is too big for the viewport."** Correct, and this is the strongest
single number in the report.

| Screen | Page height on a 390×844 phone | Screens of scrolling |
|---|---|---|
| Our job feed (10 jobs) | 5,412 px | 6.4 |
| Our job detail | 2,767 px | 3.3 |
| Our employer dashboard | 1,258 px | 1.5 |

The job feed spends its first 991 px on a heading, a paragraph, and a search panel
— before one job. The hero heading "Find Jobs Near You" plus its subtitle is
repeated from the front page onto the feed, where it is pure decoration.

One useful contrast: **our text load is genuinely light.** Our login screen is 41
words. Our front page is 110 words. apna's front page is **1,929 words**. So
reading is not our problem. **Empty space and forced choices are.**

---

## 5. What we do well — and this is real

Being blunt cuts both ways. Some of this is genuinely better than the market
leader.

**Our tap targets are far better than apna's.** On our job feed, 13 of 41 tappable
things are under the 44 px minimum. On apna's listing page it is **251 of 283**.
For a user with big thumbs on a cheap phone, we are much easier to hit.

**Ten languages, and they actually work.** en, hi, ta, kn, ml, mr, gu, or, te, bn.
jobhai offers two. apna's web front page is English only. This is our single
biggest genuine advantage and we are hiding it.

**The Near By empty state is well designed.** "No jobs near your saved location
yet. Try the All Jobs tab" with an **"Add your location"** button
(`shots/tab-NearBy.png`). That is a thoughtful, helpful empty state. The tragedy is
that it is covering for a feature that never worked.

**The app is technically clean.** Across 12 page loads on phone and desktop I got
**zero console errors** and **zero horizontal overflow**. Nothing is visibly
broken in the layout. Role guards work — logging in as a seeker and navigating
straight to `/employer/workers` correctly bounced me back to `/job-feed`.

**The billing engine is real work.** Eight SKUs, GST invoices, credit ledger, team
seats. It is well built. My argument below is about *when* we charge, not about
the quality of what was built.

---

## 6. Recommendations, ranked

Ordered by benefit for the effort. Cost is my estimate of frontend work.

### 1. Tell employers about the free trial they already have — **cheap** — ✅ **no locked decision involved**

*(Rewritten 2026-08-19. The earlier version of this item asked for a free first
post. We already give one — see §2. The gift exists; the announcement does not.)*

Every new employer already gets **1 job post + 3 candidate unlocks free for 14
days**. Today that is stated only on the pricing page and in the terms.

Four cheap changes, in order:

1. **Say it on the employer front door and in registration** — "Post your first
   job free. 1 post + 3 candidate unlocks, on us." This is the single highest-value
   sentence we are not writing.
2. **Label it in the wallet.** Not "Credit wallet · 1 Job-post credits · Expires
   2 Sept" but "**Free trial — 1 free job post and 3 candidate unlocks. Use them
   by 2 September.**"
3. **Change the paywall copy** so it names what ended: "Your free trial has
   ended," not "You're out of job-post credits."
4. **Reconsider the 14-day expiry** — this one *is* a product decision. A free post
   that quietly dies is worse than no free post, because the employer who returns
   in week three feels tricked. ⚠️ Expiry is set in
   [credit.service.ts:455](../../prosiddhi-backend/src/services/credit.service.ts#L455)
   (`validityDays = 14`) and described in MONETIZATION.md §3 — **changing it is
   Shaik's call.** Making it *visible* is not; do that regardless.

Also worth raising: a **business** employer's trial does not begin until an admin
approves their documents. If approval takes four days, we have quietly spent a
quarter of their trial.

### 2. Make the web job feed look like the mobile one — **cheap**

Do not design this from scratch — **our own Flutter app already has the answer.**
Its Job Feed is title, search box, result count, jobs: first card at ~155 px, two
and a half cards on screen. The web is 991 px and zero cards.

Concretely: delete the hero heading and subtitle from `/job-feed` (they are
already on the front page) and collapse the search panel to one row with Filter as
an icon. Target: **first job card above 300 px**, three cards visible — matching
apna and our own mobile app. Layout only, no new logic.

### 3. Make the login one screen, one choice — **cheap to medium**

Default to **phone + OTP** only. Put "Use email instead" as a small text link
below. Drop the role toggle from login entirely — the account already knows if it
is a seeker or an employer, and
[src/app/login/page.tsx](../src/app/login/page.tsx) already reads the intended role
off the return URL. Goes from 8 combinations to 1.

Keep all four methods working underneath; just stop showing all four at once.

### 4. Remove the "coming soon" voice icons — **cheap**

Ten files, one component. Either ship voice or hide the button. An icon that
announces a missing feature on the login screen is the cheapest, most visible
"cheap knock-off" signal we have, and it costs nothing to remove. *(Voice/TTS is
deferred to v2 under locked scope Q2 — hiding the icon does not reopen that
decision, it just stops advertising it.)*

### 5. Fix or hide "Near By" — **cheap to hide, medium to fix** — do this before any demo

A tab that returns 0 results, under a brand promise of "Find Jobs Near You", is
the worst thing in the product. **Hide the tab today.** Fix it properly by
capturing a coordinate — at job posting and in the seeker profile — which also
repairs the 20-point location score that is currently always 0 for everyone.

### 6. Give the employer a different skin — **medium**

Different primary colour, different top bar, the company name in the header
instead of the ProSiddhi logo. A shop owner should never wonder which app they are
in. This is CSS and header components, no logic.

### 7. Open up the city list — **cheap**

Four hardcoded cities in [src/lib/cities.ts](../src/lib/cities.ts) against
jobhai's 500+. Even 40 cities would change how real this looks. Needs a decision
on whether the backend can filter by city name or whether we keep sending
centroids.

### 8. Put a trust line on the front page — **cheap**

"100% free for job seekers. No fees, ever." plus a verified-employer badge.
Every competitor does this. We do none of it, in a market where job scams are the
main reason people distrust these apps.

### 8b. Rename the wallet into plain words — **cheap**

"Credit wallet", "Job-post credits", "Candidate unlocks", "Expires {date}" is
accounting language aimed at a shop owner with one vacancy. Say "**Job posts left:
1**" and "**Worker contacts left: 3**". MONETIZATION.md §1 already approves a
display-layer rename; this extends the same idea to the wallet card.

### 9. Show a phone number, or a call button — **expensive** — ⚠️ **contradicts the monetization model**

This is what WorkIndia and jobhai are actually selling, and per the brief ~60% of
apna's hires happen within two days of a direct call. Our paywall sits exactly
between the two people who want to talk.

⚠️ **This contradicts the contact-unlock revenue model. Shaik's call.** Raising
it, not recommending around it.

### 10. Rewrite the wrong-role login error — **cheap, and do it this week**

"Please use the correct login URL for your account type" must become something a
person can act on — *"This is an employer account. Tap Employer above to sign
in."* — ideally with the toggle switching itself. The string lives in the
**backend** ([employer.controller.ts:106](../../prosiddhi-backend/src/controllers/employer.controller.ts#L106),
[jobseeker.controller.ts:111](../../prosiddhi-backend/src/controllers/jobseeker.controller.ts#L111)),
so either the API changes it or both clients map that 403 to their own copy.
⚠️ Backend change — **coordinate with Asrar**.

If recommendation 3 lands and the role toggle disappears from login, this error
becomes unreachable and the fix is free.

### 11. Fix the footer's company name — **cheap**

*"Azkashine Software & Services Pvt. Ltd.."* — double full stop, and the wrong
legal name. It should be **AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED**. We
issue GST invoices under that name. Also reconsider the "our mobile app is on the
way" footer: it tells every visitor the product is not finished.

### 12. Fix the mobile app's two blues — **cheap**

[app_theme.dart:4](../../prosiddhi-mobile-app/lib/core/constants/app_theme.dart#L4)
is a generic royal blue that was never replaced when branding landed. Point
`primary` at the sky blue on line 24 and check the welcome and login screens.
Also put the real logo on the welcome screen. This is a token change plus a
screen check, and it makes the two clients look like one company.

### 13. Copy the mobile welcome screen onto the web — **cheap**

Mobile's "I'm a Job Seeker / I'm an Employer" split is clearer than anything on
our website, and it solves the role-confusion problem at the front door instead of
inside the login box.

### 14. Get more than 10 jobs into production — **not a frontend job**

No amount of design fixes an empty marketplace. Worth naming because it colours
every other judgement of the product.

---

## 6b. taphubs.com — checked on request

Added 2026-08-19 at Nazir's request. Walked on the same phone screen.

**It is not a competitor in our market.** taphubs.com sells *"Find Your Perfect
Career Match… opportunities that align with your professional goals"*
(`shots/tap-00-home.png`). That is white-collar language. Its stated size is
**10k active professionals, 1k+ partner companies, 5K+ placements** — against
apna's 5 million+ live jobs and jobhai's "2 Crore+ Indians". It is a small Kerala-
registered IT firm (CIN `U62090KL2024PTC089716`), not a blue-collar platform.

So treat it as a **peer**, not a benchmark. Three things are still worth taking
from it.

**1. It splits the two roles at the front door, and so should we.** The home page
has two large buttons — **"Job Seeker Login"** and **"Company Login"** — going to
separate URLs (`/jobs/login`). No toggle, no guessing. That is the same idea as our
mobile welcome screen, and it is better than our web login's role switch. It also
explains where our backend's *"use the correct login URL for your account type"*
message comes from: that model assumes separate login pages, which our web client
does not have.

**2. It leads with trust badges.** *4.9/5 Rating · SSL Secured · Global Network*
above the fold, then *"Trusted by Industry Leaders"*, then hard numbers. We show
none of this.

**3. It makes the same mistake we do.** You **cannot browse a single job without
logging in** — the seeker button goes straight to a login form. apna, jobhai and
WorkIndia all let you look first. taphubs and ProSiddhi both gate the shop window.

One thing to note fairly, since we have the same problem: taphubs writes its own
company name **three different ways** in one footer — "Taphubsglobal IT Solutions &
Services Private Limited", "Taphubsglobal IT service and solution Private
Limited", and "Taphubsglobal IT solutions and Services PVT LTD". It also prints a
build number, "v 66.1.8", on the public page. We are not alone in being sloppy
here, but that is not a defence.

**Verdict:** nothing here changes the recommendations. It reinforces #3 (split the
roles, drop the toggle) and #8 (put trust signals on the front page).

---

## 7. The mobile app — it runs, and it has the same diseases

Added 2026-08-18, after the portal sections. I compiled the Flutter app
(`prosiddhi-mobile-app`) to its web target and drove it in a real browser at
390×844, logged in as `qa.seeker@prosiddhi.test` against the **live production
API**. Flutter paints to a canvas, so I turned on Flutter's accessibility
semantics tree to read and tap real labels rather than guess pixels.

**First, the good news, because it is genuinely good.**

- `flutter analyze` → **"No issues found"**.
- It **builds** for web in 87 seconds and **boots**.
- It **logs in against production and loads real data** — first try.
- **Zero console errors** across the whole walk.

Given the note that this app has never run on a real device, that is a much better
result than expected.

**The welcome screen is better than our web front door** (`shots/mob-00-boot.png`).
Two big cards — *"I'm a Job Seeker — find jobs that match your skills and
location"* and *"I'm an Employer — post jobs and find the right candidates"* — with
"Already have an account? Login" underneath. No language gate first. A person
knows instantly which one they are. **The web should copy this.**

**Registration step one shows all ten languages as tappable chips** — English,
हिंदी, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, ગુજરાતી, ଓଡ଼ିଆ, తెలుగు, বাংলা
(`shots/mob-02-seeker-signup-1.png`). The web hides the same ten behind a
dropdown. Again, mobile is right and web is wrong.

### But the same two diseases are here

**The login screen is the same pile of choices.** Job Seeker / Employer toggle,
then Email & Password / Phone OTP / Phone & Password, then Forgot Password,
Register, and "I have an invite". Counted from the semantics tree: **9 buttons, 8
of them under 44 px tall** (`shots/mob-04-login-filled.png`). It is the web login
with one method removed.

**"Nearby Jobs — 0 results found" sits on the home screen.** Not behind a tab —
**on the first screen, taking up the bottom half**, with a struck-through location
pin and nothing else (`shots/mob3-03-settled.png`). The web at least offers an
"Add your location" button. Mobile offers nothing. Dead space with a zero in it,
on the first screen after login.

Worse: the header of that same screen reads **"Hi QA Seeker · Bengaluru"**. **We
know the user's city and we still return 0 nearby jobs.**

### New findings, mobile only

**Our own app uses two different primary blues.** In
[lib/core/constants/app_theme.dart:4](../../prosiddhi-mobile-app/lib/core/constants/app_theme.dart#L4)
`primary` is `0xFF2563EB` — a generic royal blue. On line 24, `textAction` is
`0xFF5CC2ED` — the sky blue that *is* the ProSiddhi brand, and exactly the
`rgb(92, 194, 237)` the portal uses.

Both are live. The **welcome and login screens are royal blue**; the **home screen
is sky blue**. So the mobile login does not match the mobile home, and neither
fully matches the portal. The branding rollout reached the design tokens and never
reached these screens.

This is probably the single clearest reason the product "feels like a knock-off":
**our two clients do not look like the same company, and one of them does not look
like itself.**

**The welcome screen does not use our logo.** It shows a generic white briefcase in
a rounded royal-blue square — the Flutter starter-app look — with the real
ProSiddhi mark behind it as a pale watermark.

**The two clients word the same field differently.** For a job with no salary, the
**web** says *"₹ Negotiable / Month"* and **mobile** says *"Salary not disclosed"*.
Same data, two products, two meanings.

**Copy bug:** the home screen reads **"1 results"**.

**Same recommendation engine problem:** "Jobs based on your profile" returned
**1 result**, matching the web's Recommended tab.

### The mobile employer — and here mobile beats the web outright

Walked as `qa.employer@prosiddhi.test`: Dashboard, Candidates, My Jobs, Post Job
and Profile. Zero console errors.

**The mobile employer dashboard is better than the web one**
(`shots/emp3-03-settled.png`). It leads with *Profile Summary — Job Posted 1,
Accepted 0, Rejected 0*, then *Recent Activity* with the real job and
**Applicants: 2**. It tells the employer about their hiring.

The web dashboard leads with **"Credit wallet — 0 job-post credits — 0 candidate
unlocks — Buy credits"**. It tells the employer about their bill. Same company,
same user, opposite first impression. **Mobile is right.**

**Mobile also has a proper bottom navigation** — Dashboard · Candidates · My Jobs ·
Post Job · Profile. The web employer has no equivalent; you navigate by hunting.

**And mobile's paywall is more honest than the web's.** Tapping Post Job raises a
sheet (`shots/empt-postjob.png`) that shows:

> Single Post — **₹589 incl. GST** — *₹499 + 18% GST* — 1 job post, 3 candidate
> unlocks, 1 seat, never expires

The web's version of the same wall says *"Buy a plan or the ₹499 single-post
pack"* — quoting **₹499 on a ₹589 charge**, which is exactly the defect
[MONETIZATION.md:121](MONETIZATION.md#L121) already records. **Mobile fixed it;
the web still has it.**

*Both* still charge before the employer has posted anything, so recommendation 1
applies to both clients equally.

### The mobile job feed solves the density problem the web has

This is the most useful thing in the whole teardown, because the fix already
exists inside our own company.

**Mobile Job Feed** (`shots/mobseek-jobfeed.png`): the screen is titled "Job
Feed", then a search box, then *"Showing 9 results"*, then jobs. The **first job
card starts about 155 px down** and **two and a half job cards are visible on one
phone screen**.

**Web job feed**: first job card at **991 px**, **zero** complete cards on screen
one.

Same company. Same database. Same phone. Mobile is roughly six times faster to the
first job. **The web team should copy the mobile layout, not redesign it.**

Mobile also shows the salary on the card where the employer gave one —
*"₹30,000 – 50,000 /Month"* — which is what apna does and what our web job detail
fails to do.

Two small inconsistencies spotted here: the mobile feed says **"Showing 9
results"** where the web says **"10 Results"** for the same account, and the job
data itself is untidy — *"furniture designer"* (lowercase), city recorded as
*"bangalore"*, *"Mysore"* and *"Bengaluru, Karnataka"* in three different styles.
That last one matters: **inconsistent city text makes any city filter unreliable**,
which is a second, independent reason location features misbehave.

### The three blues, seen on one screen

On the mobile employer dashboard at the same moment: the "Job Posted" pill is
**sky blue** `#5CC2ED`, the active "Dashboard" nav item is **royal blue**
`#2563EB`, and the "Create new Post" button is **dark teal** `#164E65`. Three
brand colours, one screen, no system.

### Smaller mobile findings

- Dates are shown as **"11/08/2026"** — is that 11 August or 8 November? The web
  uses "5 hours ago" for the same data.
- The Candidates screen is one job card and then a large empty watermark
  (`shots/empt-candidates.png`) — the same emptiness as the web's "Find workers".
- Copy: **"1 results"**, and the dashboard says "Welcome Back" where the web says
  "Welcome back".

### What I could not reach on mobile

Checkout (unbuilt, blocked on D2), and anything past "Apply" or "Post" — those
write to the production database, which the brief forbids without asking first.

---

## What I did not do

**Seeker coverage, for the record.** On the **web**: home, login, register entry,
job feed, all three tabs, the filter panel, a job detail, My Applications, Saved
Jobs, My Interviews, Profile and Messages. All load, no console errors. My
Interviews has a genuinely good empty state. The seeker **Profile** repeats the
Category → Sector → Job title cascade and asks for Identity Proof, Address Proof,
Education Certificate and Skill Certificate uploads — heavy for this audience —
and contains the developer-ish line *"Only rows with a position and start date are
saved."* On **mobile**: welcome, registration step 1, login, Home, Job Feed, My
List, Profile and a job detail.

**Employer coverage, for the record.** On the **web** I walked login, dashboard,
My Jobs, Post a Job, Candidates, Find workers, Plans, Messages, Team seats and
Invoices — on both a phone and a 1440px desktop. On **mobile**: login, dashboard,
Candidates, My Jobs, Post Job and Profile. Messages on web works and shows a real
conversation. Team seats reads *"1 of 1 seats used · 0 seat(s) available"* —
correct, though "seat(s)" should be written out.

- I did not test the apply flow to completion, or post a job, or buy anything —
  `.env.local` points at the **live production database** and the brief says ask
  before writing. Everything above is read-only.
- jobhai's deep listing pages blocked my automated browser (`ERR_HTTP2_PROTOCOL_ERROR`),
  so jobhai's numbers come from its front page and its public copy, not from a
  full walk.
- vahan.co is a sales site for businesses, not a product a job seeker uses — its
  front page has **zero buttons**. Hiring happens over WhatsApp. There was no
  seeker journey to walk.
- I could not create a brand-new account on any competitor, because they all send
  an OTP to a real phone. Sign-up counts stop at the OTP wall.
