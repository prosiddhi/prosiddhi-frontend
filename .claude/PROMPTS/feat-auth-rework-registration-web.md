# SPEC — Auth rework: registration + login (PORTAL / WEB)

**Repo:** `prosiddhi-frontend` · **Status:** ready to implement · **Written:** 2026-08-06
**Verified against backend commit `09a88fc`** — every payload below was captured from a live local BE, not copied from documentation.

> ⚠️ **FIRST INSTRUCTION.** Run `cd C:\dev\Azkashine\Prosiddhi\prosiddhi-backend && git rev-parse --short HEAD`.
> If it is **not `09a88fc`**, the backend has moved. **STOP.** Re-capture the contract in §3 before writing any code — do not assume this spec is still accurate.

---

## 1. SESSION CONTEXT — read before doing anything

```
C:\dev\Azkashine\Prosiddhi\prosiddhi-frontend\.claude\CLAUDE.md
C:\dev\Azkashine\Prosiddhi\prosiddhi-frontend\docs\STATUS.md          (§3 — what is left)
C:\dev\Azkashine\Prosiddhi\prosiddhi-frontend\docs\PRODUCT.md         (§4, §5 — locked rules)
this file
```

Then run the gate:

```
cd C:\dev\Azkashine\Prosiddhi\prosiddhi-frontend && npm run type-check
```

**If errors > 0 — STOP.** List them. Do not start the feature on a broken tree.

---

## 2. TASK + WHY

**Task:** rebuild portal registration and login for the new backend contract, in which both contacts are verified *before* the account is created and the password arrives *with* it.

**Why this changed (do not undo it).** Registration used to run `register → set-password → verify-email`. Between the first two calls an account existed with `password: ''`, and `POST /{jobseekers,employers}/set-password` was **unauthenticated** — its only guard was *"does a password already exist"*. Anyone who knew an email could claim any unfinished signup. 25 such rows existed on the dev server. Both `set-password` routes are now **deleted (404)**.

**Current state: portal registration is 100% broken against this backend.** All three register calls 400 (missing `password`, unverified email) and all three `setPassword` calls 404. Nobody can sign up.

---

## 3. THE CONTRACT — CAPTURED, NOT COMPOSED

Captured 2026-08-06 from `http://localhost:5000` at BE `09a88fc`. Do not edit these payloads; re-capture if the SHA moves.

### 3.1 The flow

```
1. phone   POST /api/otp/send        → POST /api/otp/verify
2. email   POST /api/email-otp/send  → POST /api/email-otp/verify     (skip if seeker has no email)
3. create  POST /api/{jobseekers/register | employers/register/individual | employers/register/business}
4. login   POST /api/{jobseekers|employers}/login
```

Steps 1 and 2 may run **in either order** — the BE only reads both flags at step 3.

**Verified marks do not expire.** Only the 6-digit *code* has a 10-minute TTL; the `verified` flag persists until step 3 consumes it. Proven: verified a phone, slept 65 s, registered → `201`. A long form between verification and register is safe.

**Verified marks are single-use.** Step 3 burns both. See §3.5 N-6.

### 3.2 Who needs what

| Role | Phone | Email |
|---|---|---|
| Job seeker | **required** | **optional** — omit the key, or send `""` (BE normalises `""` → absent) |
| Employer individual | **required** | **required** |
| Employer business | **required** | **required** |

### 3.3 Happy paths — real captured responses

**Seeker with email** — `POST /api/jobseekers/register` (multipart; `password` now required)
```json
201 {"success":true,"message":"Job seeker registered successfully. You can now log in.",
 "data":{"userId":"…","email":"s.a@test.local","phoneNumber":"+9199011780",
 "accountStatus":"ACTIVE","emailVerified":true,"phoneVerified":true,
 "filesUploaded":{"profilePic":false,"document":false},"workExperiencesAdded":0}}
```

**Seeker phone-only** — same call, no `email` key
```json
201 {"data":{"userId":"…","email":null,"phoneNumber":"+9197011780",
 "accountStatus":"ACTIVE","emailVerified":false,"phoneVerified":true, …}}
```
> **`email` is `null`.** It is also `null` in the JWT payload. Every UI that reads `user.email` must handle null.

**Employer individual** — `POST /api/employers/register/individual`
```json
201 {"success":true,"message":"Employer registered successfully. You can now log in.",
 "data":{"userId":"…","email":"…","phoneNumber":"…","accountStatus":"ACTIVE",
 "emailVerified":true,"phoneVerified":true}}
```
Trial credits are granted here. `GET /api/employers/me/credits` immediately after:
```json
{"post":{"balance":1,"expiresAt":"+14d"},"download":{"balance":3,"expiresAt":"+14d"},
 "seatCap":1,"seatsUsed":1,"planExpiresAt":null,"role":"OWNER","seatStatus":"ACTIVE"}
```

**Employer business** — `POST /api/employers/register/business`
```json
201 {"message":"Business registered successfully. Upload your business documents next — admin approval is required before posting jobs.",
 "data":{…,"accountStatus":"PENDING_DOCUMENTS","emailVerified":true,"phoneVerified":true}}
```
No trial credits until admin approval.

> **`emailVerification` is gone from all three responses.** Anything reading `result.emailVerification.otp` is dead code.

### 3.4 Login — three arms, all captured working

| Arm | Body | Notes |
|---|---|---|
| 1 | `{identifier:"<email>", password}` | |
| 2 | `{identifier:"<phone E.164>", otp}` | code comes from `POST /api/auth/login-phone-send` |
| 3 | `{identifier:"<phone E.164>", password}` | **NEW** — the only password login a phone-only seeker has |

Gate is *"at least one verified contact"*: has email → `emailVerified`; no email → `phoneVerified`.

Success → `200 {data:{token, user:{id,email,role,accountStatus,profile:{…}}}}`.

> `POST /api/otp/send` does **not** issue LOGIN-purpose codes (captured: returns no usable otp for that purpose). Use `POST /api/auth/login-phone-send` for arm 2. Its response shape also differs — `expiresIn` is the **number** `10`, whereas `/otp/send` returns the **string** `"10 minutes"`. Do not share a parser.

### 3.5 Negatives — captured, exact

| # | Trigger | Response |
|---|---|---|
| N-1 | `POST /{jobseekers,employers}/set-password` | `404 {"message":"Route not found","path":"…"}` |
| N-2 | register, no `password` | `400 errors:[{path:"password",message:"Invalid input: expected string, received undefined"}]` |
| N-3 | register, weak password | `400 errors:[{path:"password",…"at least 8 characters"},{…"one uppercase letter, one lowercase letter, and one number"}]` |
| N-4 | register, phone not verified | `400 {"message":"Phone number must be verified before registration. Please verify your phone number first."}` |
| N-5 | register, email supplied but not verified | `400 {"message":"Email must be verified before registration. Please verify your email first."}` |
| N-6 | **replay** — register twice with the same consumed OTPs | `400` with the **N-4 message** (the mark was burned) |
| N-7 | employer register, no `email` | `400 errors:[{path:"email",message:"Invalid input: expected string, received undefined"}]` |
| N-8 | employer register, email verified but phone not | `400` N-4 message |
| N-9 | wrong OTP | `400 {"message":"Invalid OTP. You have 4 attempt(s) left"}` — 5 attempts, 10-min expiry |
| N-10 | login, wrong password | `401 {"message":"Invalid credentials"}` |
| N-11 | login, `{email, otp}` (invalid union) | `400 errors:[{path:"identifier",message:"Invalid phone format…"}]` — **misleading**; do not surface raw |
| N-12 | register on an already-registered phone | `400` N-4 message — **not** a clear "phone in use" |
| N-13 | register with an email another account owns | `400 {"message":"User with this email already exists"}` |
| N-14 | register on a phone another account owns, **with a live verified mark** | `400 {"message":"User with this phone number already exists"}` — `auth.service.ts:109 / 842 / 968`. Distinguishable, unlike N-12. Which of the two you get is decided by ORDER: a consumed mark trips the verification check first (N-4 message); a live mark reaches the duplicate check. Handle both — this one can honestly say "this number already has an account, sign in instead". *(Added by A-4.)* |

> **N-4 / N-6 / N-12 are the same message for three different causes.** After any register failure carrying that message, send the user back to **re-verify their phone** — never silently retry the register call, and never say "phone already in use" (you cannot tell them apart).

### 3.6 dev vs production — what disappears

Captured on the same build, `NODE_ENV=development` then `NODE_ENV=production`.

| | dev | **production** |
|---|---|---|
| `/otp/send` → `data.otp` | `"261730"` | **absent** |
| `/email-otp/send` → `data.otp` | `"907036"` | **absent** |
| `/auth/login-phone-send` → `data.otp` | `"542920"` | **absent** |
| `/auth/forgot-password` → `data.otp` | present iff registered | **absent for both** |
| business-rule error → `error` field | `{}` | **field omitted entirely** |
| validation error → `errors[{path,message}]` | present | **present** ✅ |

**Consequences, both load-bearing:**

1. **The dev OTP banner must be conditional.** Render only when `otp` is actually in the response. Never assume it exists; never make a flow depend on it.
2. **Registration business errors carry NO machine-readable discriminator in production** — no `code`, no `error`, only `message` + HTTP status. Field-level validation *does* survive via `errors[].path`. So: map field errors by `path`; map business errors by **HTTP status + the known message set in §3.5**, with a safe generic fallback. This is a genuine BE limitation — record it, do not work around it with a BE change.

### 3.7 Adding an email later (phone-only seekers) — captured working

`POST /api/email-otp/send {email, purpose:"CHANGE_EMAIL"}` → `POST /api/auth/change-email {newEmail, otp}` **with Bearer** → `200 {"message":"Email changed successfully"}`. Logging in with the new email + the original password then succeeds. Verified end to end.

---

## 4. DECISIONS — with reasons, so they are not re-litigated

| # | Decision | Why |
|---|---|---|
| D-1 | **Flow order splits by role** (Option A) | Employer email is mandatory → verify up front as a gate, before a 7-field company form. Seeker email is optional → a dedicated "enter your email" screen reads as *required* no matter what the skip copy says, and it is the highest-drop-off slot in the funnel, spent on the field we need least. |
| D-2 | **Phone-only seeker registration ships** | PRODUCT.md §2: the seeker is an unskilled, often low-literacy worker who frequently has no email. The BE now supports it end to end. |
| D-3 | **Employers verify both contacts on ONE screen**, two 6-digit fields, one button | Makes two OTPs feel like one step without weakening anything. |
| D-4 | **Split 3+3 OTP was considered and REJECTED** | Needs a BE change we ruled out, and cuts each code from 1,000,000 to 1,000 combinations — with 5 attempts × 5 resends per 15 min that is a **2.5% per-window** guess rate on the phone code, versus 0.0025% today. It also breaks SMS autofill and makes errors unfixable ("which half was wrong?"). **Do not implement it.** |
| D-5 | **Google = seekers + individual employers only** | Business-via-Google creates an *empty* employer (no company name/GST/CIN, status `PENDING`) needing a "complete your company profile" flow we do not have. Google saves a business nothing — they must supply documents anyway. |
| D-6 | **Google stays behind its existing config flag** | No OAuth client ID, and it needs the real HTTPS domain. Build the wiring; do not ship a visible button that cannot work. |
| D-7 | **No backend changes in this pass** | Locked by the PO. Anything that seems to need one → write it in §10 RISKS, do not do it. |

---

## 5. THE CHANGE

### 5.1 `src/lib/api.ts`

| Action | Target |
|---|---|
| **DELETE** | `jobSeekerAPI.setPassword` (~line 732) and `employerAPI.setPassword` (~line 1165) — both endpoints are 404 |
| **EDIT** | `jobSeekerAPI.register` (~697) — append `password` to the FormData; make `email` optional and only append when non-empty |
| **EDIT** | `employerAPI.registerIndividual` / `registerBusiness` — add required `password` to the body + the TS input types |
| **EDIT** | `SeekerRegisterResult` (~674) — drop `emailVerification`; add `accountStatus`, `emailVerified`, `phoneVerified`; `email: string \| null` |
| **ADD** | `authAPI.changeEmail(newEmail, otp)` → `POST /auth/change-email` (Bearer). Only `changePhone` exists today (~539) |
| **VERIFY** | `authAPI.login` already accepts `{identifier, password}` — arm 3 needs no client change, only UI |
| **KEEP** | `authAPI.verifyEmailOtp` — still used by admin-added accounts; **must no longer be called by registration** |

Any user-facing type carrying `email` must become `string | null`.

### 5.2 Seeker flow — new order

```
/register              language  +  NEW role choice (seeker | employer)  → branches
/register/phone        enter phone → POST /otp/send
/register/otp          6-digit    → POST /otp/verify
/register/profile      name, DOB, gender, EMAIL (optional, clearly marked)
   └─ if an email was entered → /register/verify-email  (verify BEFORE register, see below)
/register/categories   taxonomy triple
/register/experience   work history            ← defect 7 fix goes here
/register/password     password + confirm → POST /jobseekers/register (WITH password)
                                          → POST /jobseekers/login
/register/success
```

- **`/register/verify-email` is repurposed**: it now runs **before** the account exists and calls `emailOtpAPI.verify(email, otp, 'REGISTRATION')` — **not** `authAPI.verifyEmailOtp`. Skipped entirely when no email was given.
- **`/register/password` becomes the account-creation step**: register → login → `success`. Delete the old post-register `verifyEmailOtp` + login block.
- `REGISTRATION_STEPS` in `src/components/auth/RegistrationProgress.tsx` must match the new order, and the email step is **conditional** — the progress count must not claim a step the user will never see.

### 5.3 Employer flow — new order (both types)

```
/employer/register            individual | business
/employer/register/contacts   NEW — phone AND email on one screen → sends BOTH codes
/employer/register/verify     NEW — ONE screen, TWO 6-digit fields, ONE button   ← D-3
/employer/register/account    individual: name + designation + password
                              business:  password
/employer/register/company-details   business only
   → POST /employers/register/{individual|business} (WITH password) → POST /employers/login
   → individual: /employer     business: /employer/register/under-review
```

- Replaces the current `/employer/register/phone` + `/otp` pair.
- `/employer/register/verify-email` is **deleted** — the account is already verified at creation.
- **Preserve the invite carry-through.** `verify-email/page.tsx:88` currently reads `readInviteToken()` after login and routes to `invitePath(token)`. Move it, unchanged, to the new post-register login. Losing it silently breaks team invites for new employers.
- Verifying one field but not the other is **not** a failure state — the good mark persists (§3.1). Show a per-field error and let them fix just that one.

### 5.4 Login page — `src/app/login/page.tsx`

- Add the **phone + password** arm (arm 3). Tabs become: Email · Phone OTP · **Phone + Password** · Google.
- Accept a **role hint** so the Employer tab can be preselected — fixes defect 12.
- **Phone-first recovery affordance.** "Forgot password?" is a dead end for a phone-only seeker (it is email-based). When the phone tab is active, offer the phone-OTP route as the recovery path.
- Any redirect target must still go through `lib/safeRedirect.ts`. **Do not add a second redirect path** — one open redirect has already been fixed here.

### 5.5 Refresh survivability — defect 8

Today registration state is in-memory React context, so a refresh drops it and the guards bounce the user to `/register/phone` — QA's *"last step asks for mobile number and goes back to step 2"*.

The new contract makes this fixable without weakening anything: **both verifications now live on the server**, so only non-secret progress needs to survive a reload.

- **MAY persist** (sessionStorage): phone number, email, which contacts are verified, current step, taxonomy/profile choices.
- **MUST NOT persist, ever**: the password. It stays in memory only — that constraint is the reason the context exists.
- On reload, restore progress and land the user on the step they left.

### 5.6 Folded-in defects (QA doc `ProSidhdhi_TestExec_IssuesIdentified_04-Aug-2026`)

| # | Fix | Where |
|---|---|---|
| **5 + 13** | Role choice on `/register` | §5.2 — structurally required by D-1 and D-5 |
| **8** | Refresh no longer restarts the flow | §5.5 |
| **12** | Employer footer links preselect the Employer tab | `components/home/Footer.tsx` links + §5.4 |
| **3** | Logo on `/register` and `/login` | Both are bare modals; `/register/password` already renders `/assets/logo.png` — match it |
| **7** | Remove an added Experience | `src/app/register/experience/page.tsx` — `handleAddExperience` exists, **no remove handler exists at all**. Add one; guard the last row |
| **2** | Home language dropdown actually switches the app | `components/home/LanguageSection.tsx:44` only does `localStorage.setItem('selectedLanguage', …)` — a dead write i18next never reads, and it offers **10 languages when 2 ship**. Use `useLanguagePreference()` and cut the list to `en`/`hi`, exactly as `src/app/register/page.tsx:28-47` already does |

---

## 6. SCOPE

**ONLY these files may change:**
```
src/lib/api.ts
src/app/register/page.tsx
src/app/register/phone/page.tsx
src/app/register/otp/page.tsx
src/app/register/profile/page.tsx
src/app/register/verify-email/page.tsx
src/app/register/categories/page.tsx
src/app/register/experience/page.tsx
src/app/register/password/page.tsx
src/app/register/success/page.tsx
src/app/register/SeekerRegistrationContext.tsx
src/app/employer/register/page.tsx
src/app/employer/register/phone/page.tsx        (deleted or folded into contacts)
src/app/employer/register/otp/page.tsx          (deleted or folded into verify)
src/app/employer/register/contacts/page.tsx     (new)
src/app/employer/register/verify/page.tsx       (new)
src/app/employer/register/verify-email/page.tsx (deleted)
src/app/employer/register/account/page.tsx
src/app/employer/register/company-details/page.tsx
src/app/employer/register/EmployerRegistrationContext.tsx
src/app/login/page.tsx
src/components/auth/RegistrationProgress.tsx
src/components/home/LanguageSection.tsx
src/components/home/Footer.tsx
src/locales/en/*.json
src/locales/hi/*.json
docs/qa/test-cases/01-web-app-test-cases.csv
```

**DO NOT TOUCH:**
```
Any file in C:\dev\Azkashine\Prosiddhi\prosiddhi-backend        ← no BE changes (D-7)
src/lib/safeRedirect.ts        (settled; route through it, don't rewrite it)
src/lib/inviteErrors.ts · src/lib/inviteToken.ts · src/app/invite/**
src/contexts/AuthContext.tsx   (unless a null-email type genuinely forces it — say so if it does)
src/components/home/HeroSection.tsx      ← defect 1, NOT this pass
src/app/employee/page.tsx                ← defects 4 + 6, NOT this pass
src/app/settings/**                      ← the contacts panel is a later pass
Everything under src/app/employer/** other than employer/register/**
```

---

## 7. CROSS-FILE CONTRACTS — all must update in the same session

Changing what a registration screen sends means **all five** move together. A change that updates one and not the rest is incomplete, even if it compiles.

1. `src/lib/api.ts` — the client function **and** its TypeScript input/output types
2. The calling screen(s)
3. **i18n: `src/locales/en/*.json` AND `src/locales/hi/*.json`** — every new string in both. EN + HI are at full parity today; a Hindi gap on the registration flow is a defect against our primary audience, not polish
4. `src/components/auth/RegistrationProgress.tsx` — `REGISTRATION_STEPS` if any step is added, removed, reordered or made conditional
5. `docs/qa/test-cases/01-web-app-test-cases.csv` — the registration/auth rows describe the **old** contract and are now wrong. Update them as you go; QA receives this pack

---

## 8. PRE-IMPLEMENTATION CHECKLIST

Before writing a line of code:

1. BE SHA is `09a88fc` (top of this file). If not, STOP.
2. `npm run type-check` exits 0.
3. List the exact files you will change; confirm every one is in §6 SCOPE.
4. Confirm you have a local BE running and can reach `GET /api/categories` — you need a **real taxonomy triple** to register a seeker. `"Construction"` does not exist; a valid one captured on 2026-08-06 is
   `Agri & Food-Based Industries` / `Agri Equipment Manufacturing` / `Helper`.
5. Confirm you will not call `authAPI.verifyEmailOtp` from any registration screen.
6. Confirm the password is never written to `localStorage` or `sessionStorage` (§5.5).

---

## 9. VALIDATION — run every one against a live BE

**Not "it compiles". Not "it looks right".** Every check below is a real flow against a running backend, matching §3. Record the actual HTTP status and body.

| Test | Scenario | Expected |
|---|---|---|
| **A** | Seeker, with email, full flow | `201`, then auto-login, lands `/register/success` |
| **B** | Seeker, **no email** — skip the email step entirely | `201` with `email:null`; app never shows an empty email anywhere |
| **C** | Seeker with email `""` submitted | `201`, treated as absent |
| **D** | Phone-only seeker logs out, logs in with **phone + password** | `200` + token |
| **E** | Phone-only seeker logs in with **phone + OTP** | `200` + token |
| **F** | Phone-only seeker → Settings/whatever surface → **add an email** (§3.7), then log in with it | `200` |
| **G** | Employer individual, dual-code screen, full flow | `201` `ACTIVE`; wallet reads **1 post / 3 download** |
| **H** | Employer business, full flow | `201` `PENDING_DOCUMENTS`; lands on under-review |
| **I** | Dual-code screen: **correct phone code, wrong email code** | Per-field error; the phone mark survives; fixing only the email field succeeds |
| **J** | Register with an unverified email (N-5) | User is told to verify their email, not a generic failure |
| **K** | **Replay** — go back and resubmit register (N-6) | Sent back to re-verify the phone; **no** "phone already in use" message |
| **L** | Register with an email another account owns (N-13) | The real message surfaces |
| **M** | Weak password (N-3) | Both password rules shown, mapped from `errors[].path` |
| **N** | **Refresh mid-flow** at each step | Progress survives; the password does not; no bounce to step 2 (defect 8) |
| **O** | Employer arrives via `/invite/<token>`, registers, returns | Auto-accepts; lands in the org — invite carry-through intact |
| **P** | Switch to **हिंदी** on the home page (defect 2) | Whole app switches; only `en`/`hi` are offered |
| **Q** | Footer "Post a Job" while logged out (defect 12) | `/login` opens on the **Employer** tab |
| **R** | Add two Experience rows, remove one (defect 7) | Removed; the other survives; submits correctly |
| **S** | Run the whole of A and G against a **production-mode** BE | No OTP is displayed anywhere; the dev banner renders nothing and nothing crashes (§3.6) |

Test **S** is not optional — it is the only check that proves the dev-only fields were not made load-bearing.

---

## 10. RISKS & KNOWN LIMITATIONS — record, do not fix

1. **Registration business errors have no machine-readable code in production** (§3.6). We branch on HTTP status + message. Fragile if the BE rewords a message. A `code` on these responses is a future BE ticket; **not this pass.**
2. **N-4 / N-6 / N-12 collapse into one message** — "never verified", "verification already used" and "phone already registered" are indistinguishable to the client.
3. **In production with no MSG91 configured, registration is impossible** — the BE stops echoing OTPs and no SMS/email is delivered, so there is no way to obtain a code. This directly affects the plan to run the security/UAT passes against a production-mode server. **Flag to Nazir; do not try to solve it in the frontend.**
4. **Google individual employers appear to receive 0 trial credits** where phone-first ones get 1 post + 3 unlocks — the Google path never calls the grant, and the backup hook looks the user up by a phone number they do not have yet. Traced by reading, not run. **Parked by the PO until Google is switched on.**
5. **The BE refuses to boot in production if `RAZORPAY_WEBHOOK_SECRET` is weak/short/missing** (`src/utils/razorpay.ts`) — deliberate. Relevant only when standing up a prod-mode server for test S.
6. `docs/STATUS.md` known-bug **#3** (forgot-password OTP leak + enumeration oracle) is **dev-only** — captured production responses for a registered and an unregistered email are byte-identical with no `otp`. Recommend closing it. Not a code change here.

### Added during implementation (2026-08-06)

7. **Web and mobile registration flows have DIVERGED.** `prosiddhi-mobile-app` `37dedcb` shipped a separate seeker-skippable email screen and two sequential employer OTP screens; the web ships Option A (email folded into the profile step, one dual-code employer screen). Per **A-1** the web is canonical and **mobile is to be aligned to it** — that work is not in this pass and is currently unowned (mobile has no owner). Until it happens, the two clients teach users two different flows and the QA pack describes only the web one.

8. **An employer can pay to unlock a candidate and receive no email address.** `User.email` is `String?` and `candidate.service` passes it straight through, so a phone-only seeker unlocks with a phone number only. The FE now hides the empty email row rather than showing a bare icon, but the *product* question — is a phone-only unlock worth the same credit? — is for the PO. Nothing in the pricing rules currently distinguishes them.

9. **`src/app/invite/[token]/page.tsx:256` passes `user?.email ?? ''` as `signedInAs`.** Left untouched: it is inside a §6 DO-NOT-TOUCH path, and it is unreachable in practice because an invitee is an employer, whose email is mandatory. It would surface only if seekers ever became invitable. Recorded so the next null-email sweep does not have to rediscover it.

10. **The BE has two reachable duplicate-contact errors, not one** — see the new **N-14** row in §3.5. Handled in the FE error map; no BE change requested.

---

## 11. OUT OF SCOPE — loud

- **No backend changes.** None. If something looks like it needs one → §10.
- **No business-employer Google signup** (D-5).
- **No split 3+3 OTP** (D-4).
- Defects **1, 4, 6, 10, 11** (hero i18n, dead search bar, viewport fit, ProSiddhi logo) — a separate pass. Defect **9** is not a defect (admin has no self-signup by design).
- Locked scope stays locked: **no Aadhaar, no escrow, no WebSockets, no voice transcription, no audio anywhere.**
- Do not "improve" anything not named in §5.

---

## 12. AFTER — the gate

Run all of these. **All must pass.** Every ticket, both reviews — standing rule, no exceptions, and this is auth.

```
npm run type-check                  → 0 errors
/code-review                        → green (checks the FE↔BE contract against real routes)
/security-review                    → green (auth, tokens, redirects, credential handling)
/check-scope                        → no drift from PRODUCT.md
```

Then the live smoke: **tests A–S in §9**, against a running backend, results recorded.

**Commits:** one per unit, conventional message, **no `Co-Authored-By` trailer**. Suggested sequence — each independently revertible:

```
1. refactor(api): register carries the password; drop the dead set-password calls
2. feat(register): role choice at step one            (defects 5+13)
3. feat(register): seeker flow — optional email, verified before the account exists
4. feat(employer): one-screen dual verification, then the forms
5. feat(auth): phone + password login + role-aware login entry   (defect 12)
6. fix(register): progress survives a refresh; password never persisted  (defect 8)
7. fix(register): remove an added experience                      (defect 7)
8. fix(i18n): the home language picker actually switches the app  (defect 2)
9. docs(qa): registration test cases match the new contract
```

**Docs to update when done:** `docs/STATUS.md` (§3 + known bugs — including closing #3 per §10.6) and the QA pack rows in §7.5. Nothing else; the doc set was deliberately pruned — do not add new documents.

---

## 13. BOOTSTRAP PROMPT

```
Read C:\dev\Azkashine\Prosiddhi\prosiddhi-frontend\.claude\PROMPTS\feat-auth-rework-registration-web.md
in full and implement it.

Start by verifying the backend SHA in §1 and running npm run type-check. If either fails, STOP
and tell me.

Then work through §5 in the commit order in §12, one commit per unit. Do not touch anything
outside §6 SCOPE. Every registration screen change must move all five cross-file contracts in §7
together — including the Hindi locale.

When the code is done, run the full gate in §12: type-check, /code-review, /security-review,
/check-scope, then the live tests A–S in §9 against a running local backend. Report the actual
status codes, not a summary.

Do not make any backend change. If something appears to require one, add it to §10 and continue.
```

---

## 14. AMENDMENTS — 2026-08-06, after commits `0e620c5` … `6e85f41`

These were raised by the implementing session and are **decided**. They override the sections named.

### A-1 · Flow order is CONFIRMED as Option A — do not rework it

The mobile app shipped a **different** order the same day (`prosiddhi-mobile-app` `37dedcb`): a separate, seeker-skippable email screen and two sequential OTP screens for employers.

**The web stays on Option A as built.** It is the better experience — the seeker never meets an email-only screen, and the employer clears both codes on one screen — and `5aa1efc` + `6e85f41` already deliver it. **Mobile will be aligned to the web afterwards**, not the reverse.

Record the divergence in §10; do not act on it here.

### A-2 · Defect 12 — take the `returnUrl` inference route *(supersedes the §5.6 row)*

All three employer footer links render `ProtectedRoute` themselves, so a logged-out click already arrives as `/login?returnUrl=/employer/…`. Infer the role from that, **inside `login/page.tsx`**, and leave `Footer.tsx` unchanged. It fixes defect 12 for *every* employer deep link rather than three footer ones, and keeps `useAuth()` out of the footer.

Two constraints:
- Infer **only from the already-validated internal path** returned by the existing `safeInternalPath` / `lib/safeRedirect.ts` arbiter — never from the raw query string, and **never introduce a second redirect path**. An open redirect has already been fixed here once.
- `/invite/<token>` deep links should preselect **employer** too — an invitee is joining an employer workspace.

### A-3 · Null-email sweep *(amends §6 DO NOT TOUCH)*

`src/app/settings/page.tsx:138` renders `{user?.email}`, which is now blank for a phone-only seeker. The session was right that this collides with test B.

**Decision: fix it, narrowly.** A fallback to the phone number is not "building the contacts panel" — that panel (verified badges, add-email, verify-phone) remains out of scope.

Also **sweep the repo for every other place `user.email` is rendered or used as the display identity** and apply the same fallback. This audit was missing from the spec and belongs in it: we just made `email` nullable, so every consumer is suspect. Keep each fix minimal and list them in the commit body.

### A-4 · A fourth business error — add to §3.5

The session found `User with this phone number already exists` (`auth.service.ts:109 / 842 / 968`), which is **distinguishable** from the N-4 / N-6 / N-12 collapse.

Both paths are reachable and the order decides which you get: if the phone's verified mark was consumed, the verification check fires first (N-4 message); if the mark is live and the number already belongs to an account, this duplicate error fires. **Handle both** — the duplicate case can and should say "this number already has an account, sign in instead", which is far better than sending them to re-verify.

Add it to the §3.5 table and to the error map.

