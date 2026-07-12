# Functional Audit — ProSiddhi Portal (`prosiddhi-frontend`)

**Type:** Pre-QA business / functional / UX handover audit — **NOT** a code review.
**Date:** 2026-07-07 · **Auditor:** Claude (3 parallel `functional-qa-auditor` passes, merged) · **For:** Nazir (FE + PM), QA team (Najeeb / Farhana)
**Method:** Static-first read of routes + copy + i18n JSON, cross-checked against the live BE contract in `../prosiddhi-backend/src/routes/` and locked scope (`.claude/CLAUDE.md`, `docs/_context/02-scope-locked.md`, `docs/execution-playbook.md`). Read-only; no code changed.

**Scope of the three passes**
- **A — Auth + registration:** seeker + employer register, 3 login methods (email/phone/Google OAuth), email-verify, forgot/reset, role redirects, protected routes, logout.
- **B — Seeker consume loop:** job feed (search/filter/recommended/nearby + category filter), details, saved jobs, my-applications, apply (+audio), contact-recruiter gate, report-job, my-interviews, seeker profile.
- **C — Employer + money + shared:** dashboard, post/manage jobs (taxonomy triple), candidate mgmt, pricing + checkout + credit wallet, chat, employer profile, header/footer/nav, i18n EN/HI.

---

## 0. Executive summary + Go / Not-yet call

> ### ✅ RESOLUTION PASS — 2026-07-12
> **All 2 criticals and all 10 majors are FIXED and verified in the running app** against the hosted backend. The minor items are done too. Each fix ran the full gate (type-check 0, `/code-review`, `/security-review` where auth/money was touched, EN/HI parity, live browser verification). Committed as 9 focused commits on `main`.
>
> **Three additional defects the static audit could not see were found and fixed while verifying:**
> - **i18n was effectively unreachable.** `LanguageDetector` with `caches:['localStorage']` overwrote the user's stored choice with `'en'` on every page load. Picking Hindi worked until you navigated, then the whole app silently reverted to English — full key parity hid it. *(fixed — see the M1/M9 commit)*
> - **The seeker registration language picker ignored the user's choice** (it never called `changeLanguage`) **and offered 10 languages when only 2 ship.** A Hindi speaker tapped हिंदी and got an English app; a Tamil speaker got English forever. *(fixed — M10 commit)*
> - **An open-redirect** was introduced by the deep-link `returnUrl` work (`/\evil.com` bypassed a `startsWith('//')` check) and caught by an adversarial security review before commit. *(fixed with origin-based validation — minors commit)*
>
> Plus: a latent **next/image crash** (the host allowlist omitted the backend origin, so any real profile photo blanked every authed page — promoted to always-on by the C1 fix), the phone-OTP step had **no dev-OTP banner** (blocking QA registration with no SMS gateway), and **"Buy now" opened a checkout for anonymous visitors** who could never complete it. All fixed.
>
> **Revised call: GO for QA handover.** The audio feature was also **removed entirely** (product decision 2026-07-12), not just polished.
>
> *Remaining before production (config/ops, not code): real Razorpay keys + webhook secret, Azkashine GSTIN + registered office in `src/lib/legal.ts`, MSG91/WhatsApp for real OTP + notification delivery, and **legal review of the new Privacy/Terms/Contact copy**.*

**Original call (2026-07-07): NOT-YET for handover — but the blockers are shallow and concentrated, ~1–2 days of polish, not structural rework.**

The three business loops (auth, seeker consume, employer + money) are **functionally complete and genuinely wired to the live backend.** Validation, loading/empty/error/retry states, destructive-action confirms, and the Razorpay checkout's GST math + double-charge safety are all solid. The EN/HI translation JSON has full key parity. **No core journey is broken.**

Every ship-blocking defect lives in **shared chrome or hardcoded-string i18n leaks — not business logic.** The single highest-impact fix is one file: `src/components/navigation/UserDropdown.tsx` clears both critical defects (fake "Sanjay RK" name on every authed page + dead `/settings` link) and one major (untranslated menu / employer misroute).

**Tally:** 2 🔴 critical · 10 🟠 major · 14 🟡 minor · 12 ⚪ by-design (do-not-file).

**Recommended gate:** Fix the 2 🔴 + the 3 highest-impact 🟠 (dead legal footer links, application-status i18n leak, dead Mail/Bell + hero CTAs) before code freeze. Remaining 🟠/🟡 can follow into UAT. Then: **GO.**

**Per-surface calls:** Auth = **GO** (0 critical) · Seeker loop = **GO with the shared-chrome fixes** · Employer + money = **NOT-YET** until `UserDropdown` + footer links are resolved.

---

## 1. Defect report (severity-grouped)

Legend: 🔴 critical (blocks handover) · 🟠 major (fix before freeze / early UAT) · 🟡 minor (polish) · ⚪ by-design (intentional MVP stub — **do not file**).

### 🔴 Critical

| # | Status | Defect | Route(s) | File:line | Business impact |
|---|---|---|---|---|---|
| C1 | ✅ **FIXED** | **Fake hardcoded name "Sanjay RK" in the header on EVERY authenticated screen** (seeker + employer) | all authed routes | `src/components/navigation/UserDropdown.tsx:15-16` (+ ~22 call sites, all pass no props, e.g. `src/app/job-feed/page.tsx:283`) | The dropdown reads `useAuth()` for `logout`/`role` but never uses `user` for the display name, so it always falls back to the default. Every logged-in user sees a fake seeker's name in the global header — a glaring mock-data leak that undermines trust in a paid product. **Fix:** props removed entirely; name comes from `useAuth().user` via `displayName()`, degrades to the email local-part, never a placeholder. |
| C2 | ✅ **FIXED** | **Dead "Setting(s)" link → 404 from the account menu on every authed screen** | all authed routes | `src/components/navigation/UserDropdown.tsx:120-127` | Links to `/settings`, which does not exist in the route tree (`src/app/settings/**` → none). A primary account-menu item routes every seeker and employer to a Next.js 404. **Fix:** built a real `/settings` page (account summary, language, change-password against `POST /api/auth/change-password`, sign-out). |

*(C1 + C2 were independently flagged by both Pass B and Pass C — same file, same root cause. Fixing `UserDropdown` clears both.)*

### 🟠 Major

*All ✅ FIXED. The `Fix` note on each row says how.*

| # | Status | Defect | Fix |
|---|---|---|---|
| M1 | ✅ | **Dead legal/support footer links** — Privacy, Terms, Contact, Help, About, FAQ, careers, blog, pricing, resources (11 links) all 404 (`Footer.tsx`) | Built real **/privacy, /terms, /contact** pages (EN+HI, content grounded in the real data model + MONETIZATION.md; company details centralized in `src/lib/legal.ts`; ⚠️ needs legal review). Every other dead link removed; footer now has 9 links, all resolve. Deleted the orphaned `Navbar.tsx` that held the last dead link (`/jobs`). |
| M2 | ✅ | **"My Application" menu item misroutes employers to a seeker-only screen** (`UserDropdown.tsx`) | Menu is role-aware; employers get **My Jobs → /employer/jobs**. (Same commit as C1/C2.) |
| M3 | ✅ | **Application-status pills hardcoded English** (`applicationStatus.ts`) — widest i18n leak, 5 screens | `statusMeta()` now reads the i18next singleton and translates at call time; new `applicationStatus.*` keys (EN+HI). |
| M4 | ✅ | **Header Mail + Bell are dead no-op buttons; `/messages` orphaned for seekers** | Extracted `HeaderActions`: Mail → /messages, Bell → a real **notifications dropdown** (`GET /api/notifications` + unread-count, mark-read, role-aware routing) — **closes PJP-111**. Both icons now visible on mobile too (were `hidden sm:block`). |
| M5 | ✅ | **Employer landing hero + header CTAs are dead buttons** incl. primary "Post A Job" | Hero CTA is auth-aware (→ /employer/jobs/new or /employer/register); Contact/Call-for-help → /contact; store buttons → honest "coming soon". **Also found:** "Buy now" opened a checkout for anonymous visitors who could never complete it → now routes them to sign-up. |
| M6 | ✅ | **relativeTime / formatSalary / formatDate emit hardcoded English, force `en-IN`** (`jobFormat.ts`) | All translate at call time via the i18next singleton; new `salary.*`, `time.*` (real plurals) keys; date locale follows the language. Also unified 4 private `en-GB` date helpers into `formatShortDate`/`formatMonthYear`. |
| M7 | ✅ | **Hardcoded English on the Google-login + phone-bind path** (`login/page.tsx`) | Employer-type picker, phone-bind, Send/Verify OTP, all Google errors wrapped in `t()`; new `google.*` + `bindPhone.*` keys (EN+HI). |
| M8 | ✅ | **Job status renders as raw English enum on My Jobs** (`employer/jobs/page.tsx`) | New `jobStatusLabel()` + `jobStatus.*` keys. |
| M9 | ✅ | **Footer entirely hardcoded English** (`Footer.tsx`) | Rewritten through `t()` (EN+HI); copyright year computed, not frozen at "2025"; logo alt = brand. |
| M10 | ✅ | **Registration progress indicator internally inconsistent** — 7-step counter skips 6, jumps 5→7, swaps styles | One `RegistrationProgress` component on all 8 steps; count derived from an ordered step array so it can't drift. **Also found + fixed:** the language picker ignored the choice (never switched the app) and offered 10 languages when 2 ship; and the phone-OTP step had no dev-OTP banner (blocking QA with no SMS gateway). |

### 🟡 Minor

| # | Status | Defect | Resolution |
|---|---|---|---|
| m1 | ✅ | User-menu labels hardcoded English | Wrapped in `t()` (EN+HI) — C1/C2 commit. |
| m2 | ✅ | "Setting" / "My Application" grammatically wrong | Fixed to "Settings" / role-aware "My Jobs"/"My Applications". |
| m3 | ✅ | Seeker success: "Profile **Create** Successfully" | "Profile created successfully" (EN+HI). |
| m4 | ✅ | Doc-upload typo "…are **accpet**" | "JPG, DOC and PDF files are accepted". |
| m5 | ✅ | "Near By" empty state dead-ends | Added an "Add your location" link → /profile. |
| m6 | ⚪ | Seeker profile-edit can't set lat/lon → Near By empty | **Deferred (real gap, not shallow).** Profile captures free-text location only; GPS capture is its own feature. m5 gives the user the way there; wiring lat/lon on the profile is follow-up work. |
| m7 | ✅ | No `returnUrl` after login | ProtectedRoute passes `returnUrl`; /login honours it (with **origin-based validation** — the first attempt was an open redirect, caught in security review). |
| m8 | ⚪ | Google phone-bind stores stale `accountStatus` | **Deferred (cosmetic).** No live gate reads `accountStatus` from context today; noted for whoever adds one. |
| m9 | ⚪ | Phone-OTP login: no "no account? sign up" affordance | **Deferred (funnel polish).** Raw BE error is understandable; a friendlier affordance is UAT-tier. |
| m10 | ✅ | "Under review" screen doesn't link to doc upload | Added a link + hint → /employer/profile. |
| m11 | ⚪ | Generic "Sign up" drops into seeker flow | **By design / confirm with QA.** The role-aware "Sign up here" on /login is the intended employer path; the generic button defaulting to seeker matches the majority user. No change. |
| m12 | ✅ | `verificationStatus` raw enum | New `verificationStatusLabel()` + `verificationStatus.*` keys (EN+HI). |
| m13 | ✅ | Logo alt "Job Portal" not "ProSiddhi" | All logo alts → brand / `t('app.name')`; decorative illustration alts cleared to "". |
| m14 | ✅ | Footer copyright stale "2025" | Year computed at render; legal name centralized in `src/lib/legal.ts`. |
| m15 | ⚪ | Report-job success promises review, no admin loop | **By design (v1).** BE has no notification hook for report resolution yet; acceptable for handover. |
| m16 | ✅ | Logoless job cards all show identical grey "JB" | `initials()` fallback is now `?` (was the literal `JB`). |

**Minor summary:** 10 fixed, 6 intentionally deferred/by-design (m6, m8, m9, m11, m15 + the GPS half of m5) — none blocks handover.

### ⚪ By-design (intentional MVP stubs — **do NOT file**)

| Item | Route(s) | Ref | Why it's intentional |
|---|---|---|---|
| VoiceButton 🔊 / voice-search icons are inert (show "coming soon" toast or no-op) | all auth + job-feed | `src/components/feedback/VoiceButton.tsx`; `job-feed/page.tsx:348` | TTS/voice deferred to v2 (scope Q2). Job-feed header voice-search uses a raw button (silent-on-tap) — minor inconsistency, still by-design. |
| DOB + Gender collected in UI but dropped (not sent to BE) | `/register/profile` | `src/app/register/profile/page.tsx:49-56` | BE register schema has no field (tracked BR-1); held client-side only by design. |
| "Dev mode — your code is <OTP>" banner on verify + forgot-password | verify-email, forgot-password | `verify-email/page.tsx:163-168`, `forgot-password/page.tsx:120-124` | BE echoes OTP in non-prod for QA (no real SMS/email sender wired). **MUST be gone in production.** |
| Hard refresh mid-registration restarts the flow | all `/register/*`, `/employer/register/*` | `SeekerRegistrationContext.tsx`, step guards | State (incl. plaintext password) deliberately in-memory only (PJP-81 AC forbids persisting password). |
| Contact-recruiter single-gated (employer toggle only), no seeker paid-tier gate | job-details | `job-details/[id]/page.tsx:305` | Seeker tier is "free forever" in v1 (Q5), so the paid-tier half of the double gate is intentionally moot. |
| My Interviews depends on BR-4 BE work (`application.interview`) | my-interviews, my-applications/[id] | `my-interviews/page.tsx:29` | Empty list may be BE-not-shipped, not FE bug — confirm BR-4 landed first. |
| Apply audio 2-min cap; chat audio 60s cap (client-enforced) | apply / chat | `useAudioRecorder.ts:6,162-168` | Matches locked Q10 / scope. |
| Interview "Mode" dropdown absent from Schedule-Interview modal | ScheduleInterviewModal | `ScheduleInterviewModal.tsx:17-19` | Deferred per Q13; web = date/time/notes only. |
| App Store / Google Play + social buttons are `href="#"` no-ops | `/employer/welcome`, Footer | `welcome/page.tsx:381,384`, `Footer.tsx:23-33,84,87` | Mobile app web-only/unshipped for v1 handover. |
| No cancel-plan / refund control in the money flow | plans/checkout/wallet | per `pricing-rules.md` | "No cancel button", "no refunds in v1"; plans lapse at expiry. Do not file the absence. |

---

## 2. Business test-scenario matrix (for QA — Najeeb / Farhana)

### 2A — Auth + registration

| # | Scenario | Steps | Expected |
|---|---|---|---|
| A1 | Seeker full registration (happy path) | `/register` → language → phone → OTP (dev banner) → profile → categories → experience → password → email OTP → finish | Lands `/register/success` → "Start Job Explore" → `/job-feed`; logged in (token in localStorage) |
| A2 | Seeker hard-refresh mid-flow | Reach `/register/profile`, refresh | Redirected to `/register/phone` (in-memory reset) — **expected, not a bug** |
| A3 | Weak password rejected | `/register/password` enter `abc` | Inline "8+ chars w/ upper/lower/number"; no account |
| A4 | Password mismatch | Valid pw, different confirm | "Passwords do not match" |
| A5 | Invalid phone format | Enter `12345` | "Enter a valid phone number"; OTP not sent |
| A6 | Wrong OTP | 6 wrong digits | Error; inputs cleared; focus to first box |
| A7 | Employer INDIVIDUAL registration | `/employer/register` → Individual → phone → OTP → account → email OTP | Auto-approved; lands `/employer` |
| A8 | Employer CORPORATE registration | …→ Corporate → account → company-details (GST 15-char/CIN/size/founded) → email OTP | Lands `/employer/register/under-review` → "Continue to Dashboard" → `/employer`; PENDING_DOCUMENTS |
| A9 | Corporate GST length validation | company-details, GST of 10 chars | Inline "GST invalid" (must be 15); no call |
| A10 | Upload docs post-registration | After A8 → `/employer/profile` → Documents → upload GST/CIN | Upload succeeds — **verify discoverable (no link from under-review page, m10)** |
| A11–A13 | Login: email/pw (seeker→`/job-feed`; employer→`/employer`); phone OTP | `/login`, respective tabs | Correct role redirect; wrong OTP clears inputs + error |
| A14 | Login unregistered phone | Phone OTP, never-registered number | Confirm error is understandable (currently raw BE error, m9) |
| A15–A16 | Login Google (existing → straight in; new → phone-bind → OTP) | Google tab | Activated + role redirect. **A16: verify Hindi still shows English here (M7)** |
| A17 | Wrong-role login | Register seeker, `/login` toggle Employer + seeker creds | BE 403; friendly error |
| A18 | Forgot password full cycle | `/login` → Forgot → email → dev OTP → new pw → login with new pw | Reset succeeds; new pw works |
| A19 | Forgot pw — weak new pw | Reset stage, `abc` | "8+ chars…"; not saved |
| A20 | Email-unverified login blocked | Register, don't verify, try login | BE rejects until verified |
| A21–A23 | Protected route unauth / wrong-role / 401 mid-session | Visit `/job-feed` logged out; seeker → `/employer`; expire token | → `/login`; role bounce; auto-logout on 401 |
| A24 | Logout | UserDropdown → logout | localStorage cleared → `/login` |
| A25 | i18n sweep (Hindi) — `/login` Google + phone-bind | Set Hindi | **FLAG: hardcoded English appears (M7)** |
| A26 | Double-submit guard | Rapid-click any OTP/register/login submit | Button disables while loading; no dup account/OTP |

### 2B — Seeker consume loop

| # | Scenario | Steps | Expected |
|---|---|---|---|
| S1 | Feed search + city | `/job-feed` All tab, keyword + city → Search | Refetch; count updates; city sends lat/lon+50km; empty state shown |
| S2 | Category (taxonomy) filter | Filter → Category → Sector → Job Title → Apply | Children disabled until parent chosen; results filtered to valid triple; changing parent clears children |
| S3 | Sort correctness | Sort "Salary (low)" then "(high)" | Ascending then descending |
| S4 | Recommended tab | Completed vs empty profile | Completed → matched list; empty → "complete your profile" state; search bar hidden |
| S5 | Near By (with location) | Seeker with lat/lon → Near By | Distance-sorted list |
| S6 | Near By (no location) | Seeker with only text location → Near By | **BUG EXPECTED (m5):** generic empty, no "Add your location" link |
| S7 | Save from feed | Click "Save the Job", refresh | Flips to Saved; persists; appears in `/saved-jobs` |
| S8 | Unsave from Saved Jobs | `/saved-jobs` → click Saved | Row removed optimistically; count decrements; last-row page-step-back; failure reverts + toast |
| S9 | Job details + related | Open `/job-details/{id}` | All fields render; viewCount++; related jobs; back works |
| S10 | Apply — text only | Apply → message → Submit | "Application Submitted"; card shows "Applied" (disabled) |
| S11 | Apply — audio 2-min cap | Record past 2:00 | Auto-stops at 2:00; playback; submits with duration |
| S12 | Apply — double-submit | Submit, fast second click | Ignored; one application |
| S13 | Already applied | Apply to an applied job | "Applied" + disabled on header + action-bar |
| S14 | Contact recruiter — toggled ON | Job with toggles true → Contact | Modal reveals phone/email w/ tel:/mailto: + copy |
| S15 | Contact recruiter — toggled OFF | Both toggles false | Contact button HIDDEN entirely |
| S16 | Report a job | Report → reason <5 chars, then valid | Submit disabled <5; valid → "Report Submitted"; 429 surfaces BE msg |
| S17 | My Applications list | `/my-applications` | Correct status pill per row; count matches |
| S18 | Application detail + withdraw | Open PENDING → Withdraw → confirm | `confirm` fires; → Withdrawn; ACCEPTED/WITHDRAWN show no Withdraw |
| S19 | My Interviews | Employer schedules → `/my-interviews` + `/my-applications/{id}` | Interview card w/ date/time/notes — **verify BR-4 shipped** |
| S20 | Seeker profile edit | `/profile` → change name/taxonomy/experience/skill/photo → Save | Saves + green confirm; re-fetch reflects; incomplete work-exp rows dropped silently |
| S21 | Header nav integrity | Click Mail, Bell; open menu → Setting | **BUGS EXPECTED:** Mail/Bell dead (M4); "Setting" 404 (C2); name = "Sanjay RK" (C1) |
| S22 | Auth gating | Logged out → `/job-feed`; employer → `/saved-jobs` | → `/login`; employer bounced to `/employer` |
| S23 | Hindi i18n sweep (whole loop) | Switch to Hindi | Bodies translate BUT **user menu, salary/"Negotiable", relative time, dates stay English (M3/M6/m1)** |

### 2C — Employer + money + shared

| # | Scenario | Steps | Expected |
|---|---|---|---|
| E1 | Dashboard loads | Login employer → `/employer` | Wallet card, 6 stat tiles, Your Jobs, Recent Applications from live data; per-panel loading/empty/error; retry works |
| E2 | Header shows real identity | Open user menu | Employer's **real name** — NOT "Sanjay RK" (**currently FAILS, C1**) |
| E3 | Settings menu item | Menu → "Setting" | Should reach settings (**currently 404, C2**) |
| E4 | My Application as employer | Menu → "My Application" | Should not drop employer on seeker `/my-applications` (**currently misroutes, M2**) |
| E5 | Post a job — happy path | `/employer/jobs/new` → title≥5/category triple/description≥50/location/type → Publish | Posts → `/employer/jobs`; consumes 1 POST credit; live preview mirrors seeker card |
| E6 | Post-job taxonomy triple | Category → Sector → Job Title | Children disabled until parent; changing parent clears children; options from live `/api/categories` |
| E7 | Post-job validation | 4-char title / <50 desc / salaryMax<Min | Inline block w/ specific msg; button disabled while submitting |
| E8 | Out-of-credits (proactive) | 0 POST credits → open `/employer/jobs/new` | Form replaced by OutOfCreditsUpsell → Top up (₹499 modal) + View plans |
| E9 | Out-of-credits (reactive) | Balance hits 0 before publish | BE 402 → form swaps to upsell (no silent fail) |
| E10 | Delete-refund rule | Delete job <24h old w/ 0 applications; then old/applied job | Confirm → "1 post credit refunded"; older/applied → no refund notice |
| E11 | Candidate list + tabs | `/employer/candidates` → All/Accepted/Shortlisted/Rejected/Bookmarked + search | Correct filtered list per tab; accurate count; empty/loading/error; search on Enter/button |
| E12 | Accept + schedule interview | Candidate → Accept → toggle schedule → date+time+notes | Date+time required when toggled; interview created; → Accepted; Accept/Reject hidden after (terminal) |
| E13 | Reject with reason | Reject → reason ≥10 chars → Confirm | <10 blocked; → Rejected |
| E14 | Bookmark toggle | PENDING/REVIEWED → Bookmark → un-bookmark | Toggles; hidden for statuses BE won't accept |
| E15 | Pricing math (base + 18% GST) | Any plan → Buy → checkout | Base=baseInr, GST=totalInr−baseInr, Total=totalInr; Pay shows total; verify vs `pricing-rules.md` (e.g. STARTER_1M base ₹1,299) |
| E16 | Checkout GSTIN/state logic | Blank GSTIN → place-of-supply required; valid 15-char GSTIN → state auto-derives + disables | Invalid GSTIN blocked; state dropdown behaves per presence |
| E17 | Checkout double-charge safety | Complete Razorpay → simulate verify-call failure; also dismiss Razorpay sheet | "Payment received / verify pending" terminal — NO re-pay; credits land via webhook; dismissal resets cleanly |
| E18 | Wallet reflects purchase | After buy → `/employer` | POST/DOWNLOAD balances rise; expiry shown; "never expire" note only for pack credits |
| E19 | Plan-expiry nudge | Wallet expiry ≤7 days / past | Amber "expiring soon" / red "expired" + Renew link |
| E20 | Invoices list + PDF | `/employer/invoices` after purchase | Rows w/ number/date/total(incl GST); Download streams PDF named by invoice number; empty state when none |
| E21 | Candidate DB search + unlock | `/employer/workers` → search ≥2 chars → open → Unlock | Snippets hide contact; unlock confirm ("use 1 credit"); spends 1 DOWNLOAD; reveal; re-open free; 402 at zero → top-up |
| E22 | Team seats (Pro) | `/employer/team` → invite by email → copy link; remove seat | One-shot invite link copyable; usage updates; gated w/ upgrade prompt when full; remove frees slot |
| E23 | Accept team invite | `/employer/team/accept?token=…` signed in | Binds seat; success; missing/expired token handled |
| E24 | Chat (polling + 60s audio) | Open conversation → send text; record audio (60s cap) → send | Text+audio deliver; ~10s polling brings replies; ✓→✓✓ receipts; recorder stops at 60s |
| E25 | Employer profile edit | `/employer/profile` → change GST/CIN → Save | Warns GST/CIN change re-triggers admin verify (confirm); GST 15-char enforced; saved toast; verificationStatus shown |
| E26 | i18n EN↔HI sweep (employer) | Hindi on dashboard/jobs/candidates/detail/plans/checkout/wallet/invoices/team/profile | Chrome + labels translate. **Known leaks to confirm/fail: status pills (M3), job status (M8), verificationStatus (m12), the whole `/employer/welcome` footer (M9)** |
| E27 | Footer legal links | `/employer/welcome` → Privacy/Terms/Contact/Help | Should reach real pages (**currently all 404, M1 — blocks compliant handover**) |
| E28 | Protected route + role gate | `/employer/*` logged out / as seeker | Logged-out → login; seeker → blocked (requiredRole="employer") |

---

## 3. Completeness summary

| Surface | Wiring to live BE | i18n JSON parity | Blocking defects | Call |
|---|---|---|---|---|
| **A — Auth + registration** | ✅ all 3 login methods + both reg flows + forgot/reset + guards hit real endpoints | ⚠️ Google/phone-bind path hardcoded English (M7) | 0 🔴 | **GO** |
| **B — Seeker consume loop** | ✅ feed/taxonomy/details/save/apply+audio/contact/report/interviews/profile all real | ✅ 100% key parity; ⚠️ formatters English-only (M6) | shared-chrome only (C1/C2/M4) | **GO with shared-chrome fixes** |
| **C — Employer + money + shared** | ✅ dashboard/jobs/taxonomy/candidates/pricing/checkout/wallet/team/invoices/chat all real; Razorpay GST math + double-charge safety solid | ✅ full parity in JSON; ⚠️ hardcoded-enum leaks (M3/M8/m12) + footer (M9) | C1/C2 + M1 | **NOT-YET** |

**Bottom line:** This is a genuinely complete, backend-wired build — not a mock showroom. The money paths (the riskiest surface) are the most solid part of the app. Every ship-blocker is shallow shared-chrome or a hardcoded-string i18n leak, fixable in ~1–2 days:

1. **Fix `src/components/navigation/UserDropdown.tsx`** — real user name from `useAuth().user`, role-aware "My Applications" target, valid/removed Settings link, `t()` on labels. (Clears C1, C2, M2, m1, m2.)
2. **Stand up or remove the dead legal/support footer routes** — Privacy, Terms, Contact at minimum (M1) — legal/trust requirement for a paid product.
3. **Wrap the enum/formatter strings in `t()`** — `applicationStatus.ts` (M3), `jobFormat.ts` (M6), job-status render (M8), Google-login path (M7), Footer (M9) — the biggest visible i18n leaks.
4. **Wire or hide the dead CTAs** — seeker header Mail/Bell (M4), employer hero "Post A Job"/Contact (M5).

Fix items 1–2 and the top of 3 before code freeze (2026-06-21) → **GO for QA handover.** Remaining 🟠/🟡 can ride into UAT. The dev-mode OTP banner + no real SMS/email sender means QA must use the echoed dev OTP and cannot smoke-test real OTP delivery.

---
*Generated from 3 parallel `functional-qa-auditor` passes. Static-first, read-only. No code changed, not committed.*
