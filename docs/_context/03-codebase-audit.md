# Codebase Audit — 2026-05-05

Companion to `02-scope-locked.md`. This file is the long-form per-file audit captured in one session. Read this when you're about to wire a specific endpoint, modify an existing controller, or argue about whether a feature is "really built." For scope-level summaries, use `02-scope-locked.md` first.

**Conventions:** all backend paths are relative to `/Users/nazirhasan/Documents/GitHub/job-portal-backend-azka/`. All frontend paths are relative to `/Users/nazirhasan/Documents/GitHub/Job_Portal/apps/web/`.

---

## 1. Backend audit

### 1.1 Controllers

| File | Endpoints / responsibility | Notes & gaps |
|---|---|---|
| `src/controllers/aadhaar.controller.ts` (42 LOC) | `POST /api/aadhaar/send`, `POST /api/aadhaar/verify`. | Mock-mode: returns OTP in response body. No Verhoeff check (only 12-digit format via validator). |
| `src/controllers/admin.controller.ts` (2,157 LOC) | All admin functionality: createAdmin, login, getProfile; employer queue (getAll/Pending/Rejected/Details/Approve/Reject/PaymentStatus); jobseeker queue (getAll/Rejected/Details/Approve/Reject/PaymentStatus); document review (getDocuments/verifyDocument/rejectDocument); dashboard (stats/recentJobs/subscriptionChart); post moderation (getAllPosts/getPostDetails/approve/reject/sendWarning/delete/markNoViolation/markViolation/activate/deactivate); soft delete (deleteJobSeeker/deleteEmployer + listDeletedJobSeekers/listDeletedEmployers). | Single 2k-line file. Notification producer-hooks are wrapped in try/catch — failures don't abort the parent action. Revenue calc is hardcoded ₹500/sub × paid count (placeholder). |
| `src/controllers/application.controller.ts` (391 LOC) | apply/withdraw/check/count/myApplications/getById; employer-side getJobApplications/getEmployerAllApplications/stats/jobsList/candidateDetails/accept/reject/bookmark/updateStatus. | Apply payload is text-only `{jobId, message}`. No multer wired here. Long string-match error chains in catch blocks (smell — should use sentinel codes). |
| `src/controllers/auth.controller.ts` (127 LOC) | `forgot-password`, `resend-verification`, `change-phone`, `change-email`, `change-password`, `reset-password`. | All wired. `forgotPassword` returns 404 on "No account found", which is an enumeration risk for prod (resend-verification correctly returns generic 200). |
| `src/controllers/conversation.controller.ts` (156 LOC) | start/list/getMessages/sendMessage/markMessageRead. List endpoint enriches with `otherPartyLastSeenAt`. getMessages enriches with `otherParty.lastSeenAt` + job summary. | Polling via `?after=<lastMessageId>` supported. SendMessage rejects AUDIO/IMAGE — service throws. |
| `src/controllers/email-otp.controller.ts` (76 LOC) | `send/resend/verify/status` for `(email, purpose)`. | Mock — returns OTP. |
| `src/controllers/employer-document.controller.ts` (119 LOC) | `POST/GET/DELETE /api/employers/me/documents`. Single-file upload via `uploadSingleEmployerDocument` (PDF/JPG/PNG/DOC/DOCX, 5MB). | Delete refuses when count drops to 0 (min-1-doc invariant — senior 2026-04-24). |
| `src/controllers/employer.controller.ts` (576 LOC) | `register/individual`, `register/business`, `set-password`, `verify-email`, `login`, get/update profile, dashboard endpoints, profile-photo update (NC-2). | Update-profile detects GST/CIN change, resets verificationStatus + notifies admins (T2 #20). Min-1-doc safety net on update. |
| `src/controllers/job.controller.ts` (323 LOC) | createJob, getJobById, getJobs (filters + lat/lon), updateJob, deleteJob, getMyJobs, getEmployerJobs, getRelatedJobs, getRecruiterContact (NC-5), getMyExpiredJobs, getRecommended (T2 #13), activateJob/deactivateJob (T2a #34b), reportJob (T2 #12). | View count auto-increments on detail GET unless requester is the posting employer. |
| `src/controllers/jobseeker-document.controller.ts` (111 LOC) | `POST/GET/DELETE /api/jobseekers/me/documents` (T2 #15). Multipart `file`. | No min-doc invariant on seeker side — any number ok. |
| `src/controllers/jobseeker.controller.ts` (286 LOC) | `register` (multipart with profilePic + document + workExperiences JSON), set-password, verify-email, login, get/update profile, profile-photo update (NC-2). | Forbidden-keys guard on update (T1 #8). Profile update is atomic across User + JobSeeker + WorkExperience tables. |
| `src/controllers/notification.controller.ts` (75 LOC) | list/unread-count/mark-read/mark-all-read. | All in-app. Limit 1–100. |
| `src/controllers/otp.controller.ts` (88 LOC) | Phone OTP send/resend/verify/status. | Mock. |
| `src/controllers/savedJob.controller.ts` (134 LOC) | save/unsave/list/check/clear/count. | Save refuses if job is not ACTIVE. |
| `src/controllers/skill.controller.ts` (190 LOC) | listPublic (seeker dropdown — auth required, ACTIVE-only), listAdmin (with active filter), create/update/remove/activate/deactivate (admin), listMine/addMine/removeMine (seeker side). | Q53 (2026-04-26). |

### 1.2 Services

| File | What it does | Notes & gaps |
|---|---|---|
| `src/services/aadhaar.service.ts` (98 LOC) | sendOTP / verifyOTP. | No Verhoeff. Idempotent: re-send resets attempts. Once verified the row sticks (no consume). |
| `src/services/application.service.ts` (1,220 LOC) | applyToJob, getMyApplications, getApplicationById, withdrawApplication, hasApplied, getMyApplicationsCount, getJobApplications, getEmployerAllApplications, getEmployerApplicationStats, getCandidateDetails, getEmployerJobsList, updateApplicationStatus, acceptApplication, rejectApplication, toggleBookmark. | Producer hooks: apply → SYSTEM message + notify employer (T3 #39, T2 #11). Accept → SYSTEM message + notify seeker; auto-FILL job when accepted ≥ numberOfPositions (T2 #14). Reject → SYSTEM message + notify seeker. The "cannot reject accepted" guard is **commented out** (lines ~1070–1073) — bug or deliberate? confirm. |
| `src/services/auth.service.ts` (730 LOC) | registerJobSeeker, setPassword, verifyEmail, resendEmailVerification, login, registerEmployerIndividual, registerEmployerBusiness, forgotPassword, resetPassword, changePassword, changeEmail, changePhone, getUserProfile. | Full account-lifecycle. Login gates on emailVerified + accountStatus + isDeleted. |
| `src/services/conversation.service.ts` (298 LOC) | startConversation (with application-history scope check), listConversations, getMessages, sendMessage (TEXT-only), markMessageRead, postSystemMessage (used by producer hooks). | Hard-coded text-only at line ~200: throws "AUDIO / IMAGE types are not yet supported (needs cloud storage)". |
| `src/services/document.service.ts` (204 LOC) | uploadForSeeker, listForSeeker, deleteForSeeker, uploadForEmployer, listForEmployer, deleteForEmployer (with min-1 invariant). | Disk-only storage. `unlinkSafe` cleans up on delete. |
| `src/services/email-otp.service.ts` (178 LOC) | sendOTP/resendOTP/verifyOTP/isEmailOtpVerified/consumeVerifiedOTP/getVerificationStatus. 30s resend cooldown. | Composite key `(email, purpose)` so multiple purposes coexist. |
| `src/services/job-report.service.ts` (47 LOC) | reportJob — single method. Free-text, no status workflow, duplicates allowed. | Senior 2026-04-24 — keep simple. |
| `src/services/job.service.ts` (1,033 LOC) | createJob, getJobById, getJobs (Haversine for lat/lon), updateJob, deleteJob, getRecruiterContact, getEmployerJobs, getEmployerExpiredJobs, getRelatedJobs, **getRecommendedForSeeker (T2 #13 — full recommendation algo with 6 scoring signals)**, setJobStatus + activate/deactivate variants (T2a #34b). | The "primer was wrong" item: recommendation IS built. Algorithm details captured in 02-scope-locked.md Q6. |
| `src/services/notification.service.ts` (76 LOC) | create/listForUser/unreadCount/markOneRead/markAllRead. | In-app only. No external channels. |
| `src/services/otp.service.ts` (184 LOC) | Phone OTP. Mirrors email OTP shape. | E.164 normalization in `utils/phone.ts`. |
| `src/services/savedJob.service.ts` (245 LOC) | save/unsave/list/check/clear/count. | Returns full job + employer summary on save. |
| `src/services/skill.service.ts` (207 LOC) | Admin catalog CRUD + seeker-side link CRUD. P2002 (unique violation) → friendly error. | Q53 (2026-04-26). Activate/deactivate idempotent. JobSeekerSkill rows preserved on deactivate. |

### 1.3 Validators (Zod schemas — these ARE the API contracts)

| File | What it covers | Notes |
|---|---|---|
| `validators/aadhaar.validator.ts` | sendAadhaarOTPSchema (12-digit number), verifyAadhaarOTPSchema. | **No Verhoeff.** |
| `validators/admin.validator.ts` | All admin query/param/body schemas. UUID param schemas. Approve/reject/payment-status enums. Post-moderation (approvePost/rejectPost/sendWarning/delete/markViolation). | Verification status / employerType / paymentStatus / moderationStatus enums all defined. |
| `validators/application.validator.ts` | applyToJob `{jobId, message?}`, withdraw, my-list query, job-list query, updateStatus, employer-all query, stats query, accept (notes? + interview?), reject (reason? + notes?). | **ApplicationStatus enum at line ~4 OMITS `BOOKMARKED`** but service uses it via `toggleBookmark`. Inconsistency: `updateApplicationStatus` validator can never set BOOKMARKED. |
| `validators/auth.validator.ts` | jobSeekerRegisterSchema (email/fullName/phone E.164/aadhaar 12-digit/preferredSector/preferredJobTitle/preferredLanguage/lat/lon/location), setPasswordSchema, loginSchema, verifyEmailSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, changeEmailSchema, changePhoneSchema, employerIndividualRegisterSchema, employerBusinessRegisterSchema (incl. CompanySize enum), createAdminSchema (Q57 — phone optional for admin), updateJobSeekerProfileSchema (with T1 #8 forbidden-keys guard), updateEmployerProfileSchema. | Password rule: ≥8 + uppercase + lowercase + digit. GST: exactly 15 chars. |
| `validators/conversation.validator.ts` | start (recipientId UUID + jobId? UUID), sendMessage (content 1–5000 chars), getMessagesQuery (after? UUID + limit 1–200). | TEXT-only — no file/audio fields. |
| `validators/document.validator.ts` | uploadSeekerDocumentSchema (type? from SEEKER_ALLOWED_TYPES list), uploadEmployerDocumentSchema (type? from EMPLOYER_ALLOWED_TYPES list), documentIdParamSchema. | Seeker types: IDENTITY_PROOF/ADDRESS_PROOF/EDUCATION_CERTIFICATE/SKILL_CERTIFICATE/OTHER. Employer types: GST_CERTIFICATE/COMPANY_REGISTRATION/OTHER. |
| `validators/email-otp.validator.ts` | sendEmailOTPSchema, verifyEmailOTPSchema, statusQuerySchema. Purpose enum: FORGOT_PASSWORD/CHANGE_EMAIL/REGISTRATION. | OTP exactly 6 digits. |
| `validators/job.validator.ts` | createJobSchema (full job spec with NC-5/Q51 toggles), updateJobSchema, getJobsQuerySchema (rich filters), getJobByIdSchema, getRelatedJobsQuerySchema, reportJobSchema (T2 #12), getRecommendedJobsQuerySchema (T2 #13). | salaryMax ≥ salaryMin refine. radius default 5km. numberOfPositions max 1000. |
| `validators/notification.validator.ts` | getNotificationsQuerySchema (limit 1–100, unreadOnly bool), notificationIdParamSchema. | |
| `validators/otp.validator.ts` | sendOTPSchema, verifyOTPSchema. E.164 phone regex. | |
| `validators/savedJob.validator.ts` | saveJob `{jobId}`, unsaveJob (param), getSavedJobsQuerySchema. | |
| `validators/skill.validator.ts` | createSkillSchema (name 1–100, category 1–50, description? 0–500), updateSkillSchema, addSeekerSkillSchema, getSkillsQuerySchema (page/limit), getAdminSkillsQuerySchema (extends with active filter). | Q53. |

### 1.4 Routes

All routes are mounted under `/api/*` in `src/index.ts`. The full mounting:

| Mount path | Router file | Notes |
|---|---|---|
| `/api/otp` | `routes/otp.routes.ts` | send/resend/verify/status |
| `/api/email-otp` | `routes/email-otp.routes.ts` | send/resend/verify/status |
| `/api/auth` | `routes/auth.routes.ts` | forgot-password, resend-verification, reset-password (public) + change-password/change-email/change-phone (authenticated) |
| `/api/conversations` | `routes/conversation.routes.ts` | GET / + POST / + GET/POST `/:id/messages` |
| `/api/messages` | `routes/conversation.routes.ts` (messageRouter) | PATCH `/:id/read` only |
| `/api/notifications` | `routes/notification.routes.ts` | list/unread-count/read-all/mark-one |
| `/api/jobseekers` | `routes/jobseeker.routes.ts` | register (multipart), set-password, verify-email, login (public); profile + profile-photo + me/documents + me/skills (auth) |
| `/api/employers` | `routes/employer.routes.ts` | register/individual + register/business (multipart), set-password, verify-email, login (public); profile + dashboard/* + me/documents + me/profile-photo (auth) |
| `/api/admin` | `routes/admin.routes.ts` | login + create + many auth admin routes including soft-delete (NC-9) and post-moderation (T2a #34b). NB: route ordering matters — `/jobseekers/deleted` MUST be declared before `/jobseekers/:jobSeekerId` to avoid the `deleted` literal being captured as a UUID param (intentional comments in source). |
| `/api/jobs` | `routes/job.routes.ts` | All public + employer + seeker job operations. `/recommended` MUST be before `/:id` for the same Express-routing reason. |
| `/api/saved-jobs` | `routes/savedJob.routes.ts` | seeker-only |
| `/api/applications` | `routes/application.routes.ts` | seeker + employer + shared `/:id` |
| `/api/aadhaar` | `routes/aadhaar.routes.ts` | send/verify (no auth) |
| `/api/skills` | `routes/skill.routes.ts` | GET / (auth required, public dropdown) |

### 1.5 Middleware / utils / config

- `middleware/auth.ts` — `authenticate` extracts Bearer token, verifies JWT, loads User + employer/jobSeeker/admin profiles, **rejects soft-deleted users (NC-9)**, fire-and-forget bumps `lastSeenAt`. `authorize(...roles)` checks `req.user.role`.
- `middleware/validate.ts` — `validateBody` mutates `req.body` to parsed result. `validateQuery` writes to `req.validatedQuery` (Express 5 makes `req.query` read-only). `validateParams` mutates `req.params`. All return 400 with `{ path, message }` array on Zod failure.
- `middleware/requestLogger.ts` — every request logged at http level on receipt and on finish (with duration + statusCode). 4xx/5xx escalate to warn.
- `utils/crypto.ts` — `hashPassword` (PBKDF2 sha256, 310k rounds, 16-byte salt, 32-byte key — salt-prefixed `salt:hex`), `comparePassword`, `generateToken` (32-byte hex), `generateOTP` (6-digit, **`Math.random()` — NOT cryptographically secure**, fix before prod).
- `utils/jwt.ts` — sign/verify HS256, default secret literal `'your-secret-key'` if `JWT_SECRET` env unset (smell — fail-fast in prod).
- `utils/phone.ts` — `normalizePhoneNumber` (prepend `+` if missing). Doesn't validate country code or strip non-digits beyond trim.
- `utils/prisma.ts` — singleton client with event-based logging.
- `utils/response.ts` — `sendSuccess` and `sendError` helpers; error body suppresses `error` field in non-development.
- `utils/file.ts` — `getRelativeFilePath` (strips cwd, normalizes Windows backslashes), `getFileUrl` (with BASE_URL env fallback).
- `config/multer.ts` — full multer setup: profile-pics dir, documents dir, employer-docs dir; image filter + document filter + employer filter (broadened to PDF/JPG/PNG/DOC/DOCX 2026-04-24); 5MB cap; multi-config for register flows + post-registration single-file flows + profile-photo flow (NC-2).
- `config/logger.ts` — Winston with console + file transports + exception/rejection handlers.

### 1.6 Decision tags found in BE code

Authoritative list of all `Q##`, `NC-##`, `T##`, `T2a #...`, `T3 #...` tags found in the source today. Future sessions can grep these to understand decisions.

| Tag | Files where it appears | Meaning (inferred from context) |
|---|---|---|
| `Q4` | services/auth.service.ts (implicit via T2 #20) | Aadhaar verification depth (mock for v1). Verhoeff promised but missing in code. |
| `Q51` | validators/job.validator.ts:43, 91; controllers/job.controller.ts:196; services/job.service.ts:50, 348, 402; routes/job.routes.ts:48 | Recruiter contact reveal — per-job toggles `showEmailToSeekers` / `showPhoneToSeekers`. (Same as NC-5.) |
| `Q53` | validators/skill.validator.ts:3; routes/admin.routes.ts:332; routes/jobseeker.routes.ts:100; services/job.service.ts:769, 787, 904, 906 | Skills CRUD shipped 2026-04-26. Skills are self-declared; `JobSeekerSkill.verified` not exposed by any endpoint. |
| `Q57` | validators/auth.validator.ts:132 | `phoneNumber` is OPTIONAL for admin (nullable in schema). Seeker + employer keep it required. (2026-04-26) |
| `NC-2` | config/multer.ts:187; controllers/employer.controller.ts:15, 60, 521; controllers/jobseeker.controller.ts:230; routes/employer.routes.ts:118; routes/jobseeker.routes.ts:91 | Profile-photo update endpoint for both seeker + employer; multipart `profilePic`; old-file unlink. |
| `NC-5` | validators/job.validator.ts:43, 91; controllers/job.controller.ts:196; services/job.service.ts:50, 348, 402; routes/job.routes.ts:48 | Recruiter Contact toggles (paired with Q51). |
| `NC-9` | middleware/auth.ts:43; controllers/admin.controller.ts:264, 342, 366, 1026, 1055, 1957; routes/admin.routes.ts:89, 148, 383; services/auth.service.ts:270, 524, 567; services/job.service.ts:186, 615, 837 | Soft-delete user (2026-04-27). `User.isDeleted` + `deletedAt`. Excluded from default queues + login + recommendations + public browse. List endpoints `/jobseekers/deleted` + `/employers/deleted`. |
| `T1 #8` | validators/auth.validator.ts:170; controllers/jobseeker.controller.ts:151 | Forbidden-keys guard on profile update (email/phone/password/aadhaarNumber rejected). |
| `T1 #9` | controllers/jobseeker.controller.ts:32 | Zod body validation on multipart routes (`z.coerce` handles string→number). |
| `T2 #11` | controllers/admin.controller.ts:176, 237, 722, 801, 919, 992, 1817; services/application.service.ts:107, 957, 1118 | Notification producer hooks across approve/reject/document-verified/document-rejected/admin-warning + apply/accept/reject. |
| `T2 #12` | validators/job.validator.ts:155; controllers/job.controller.ts:300; controllers/admin.controller.ts:1628; routes/job.routes.ts:102 | JobReport — seeker-initiated, free-text, no status workflow, duplicates allowed. Visible in admin post detail. |
| `T2 #13` | validators/job.validator.ts:164; controllers/job.controller.ts:236; services/job.service.ts:761; routes/job.routes.ts:25 | Profile-based recommended jobs algorithm. |
| `T2 #14` | services/application.service.ts:905 | Auto-mark job as FILLED when acceptedCount reaches numberOfPositions. |
| `T2 #15` | routes/jobseeker.routes.ts:68 | Seeker Document CRUD on profile edit. |
| `T2 #16` | routes/employer.routes.ts:95; config/multer.ts:166 | Employer Document CRUD on profile. |
| `T2 #20` | validators/auth.validator.ts:204; controllers/employer.controller.ts:204 | GST/CIN re-verify hook — strict format match with register schema, optional means "omit to skip". |
| `T2a #34b` | controllers/job.controller.ts:264, 282; controllers/admin.controller.ts:1648, 1665; services/job.service.ts:964; routes/job.routes.ts:112; routes/admin.routes.ts:289 | Activate/deactivate post toggle. Idempotent. Strict ACTIVE↔INACTIVE-only state transitions. |
| `T2a #38` | controllers/admin.controller.ts:364, 1052 | Tab-badge counts in admin queue lists are global (ignore current filter). |
| `T3 #39` | services/application.service.ts:106, 956, 1117 | Producer hook to auto-create conversation + post SYSTEM message on apply/accept/reject. |

### 1.7 Contradictions between API_DOCUMENTATION.md and actual route implementations

`API_DOCUMENTATION.md` (~2,265 lines, claims v2.0.0, last updated Nov 19 2025) covers roughly **60% of the implemented surface** — it documents ~68 endpoints; the BE actually has ~115. The doc is a strict subset (no false-positives, but many false-negatives). Specific gaps:

**Entire modules missing from docs:**
- `/api/auth/*` — forgot-password, reset-password, change-password, change-email, change-phone, resend-verification (all 6 endpoints)
- `/api/email-otp/*` — send/resend/verify/status (4 endpoints)
- `/api/conversations/*` + `/api/messages/*` — start, list, get-messages (with `?after=` polling), send-message, mark-read (5 endpoints)
- `/api/notifications/*` — list, unread-count, read-all, mark-one (4 endpoints)
- Almost all admin moderation/dashboard/skills surface — only ~7 admin endpoints documented vs ~25+ implemented
- `/me/documents` + `/me/profile-photo` for both seeker + employer (6 endpoints)
- `/api/jobseekers/me/skills/*` (Q53) (3 endpoints)
- `/api/jobs/recommended` (T2 #13)
- `/api/jobs/:id/recruiter-contact` (NC-5/Q51)
- `/api/jobs/:id/report` (T2 #12)
- `/api/jobs/:id/activate` + `/deactivate` (T2a #34b)
- `/api/skills` public dropdown
- `/api/otp/resend` + `/status`

**Schema-level contradictions:**
- `POST /api/applications` — doc shows `{jobId, message}` (no length cap noted), reality caps `message` at 1000 chars. Doc implies audio support somewhere ("audio messages" in product copy) but no audio field exists in validator and no multer is wired on this route.
- `POST /api/conversations/:id/messages` — service explicitly throws on AUDIO/IMAGE; doc omits this constraint.
- `ApplicationStatus` enum — doc lists 6 (PENDING/REVIEWED/SHORTLISTED/REJECTED/ACCEPTED/WITHDRAWN); reality uses 7 (BOOKMARKED added by `toggleBookmark`) but the validator's `updateApplicationStatusSchema` enum is also missing BOOKMARKED — a real inconsistency in code.
- Aadhaar verify response implies real verification semantics; reality is mock + no Verhoeff.
- OTP send responses include the OTP value in body — doc mentions this but the FE devs and prod-cutover need to know.

**Auth-gating to verify with Asrar:**
- `GET /api/jobs`, `/jobs/:id`, `/jobs/:id/related` — doc shows no Authorization header, implying public. Code indeed leaves these unauthenticated. Confirm this is intentional (Q: should we require login to browse jobs?).
- `GET /api/skills` is auth-required (any authenticated user) but its purpose (registration dropdown) suggests it should be public. Today, an unauthenticated registration page can't fetch skills.
- `POST /api/admin/create` — doc says no auth needed for first admin. Code confirms. Production hardening risk.

### 1.8 Surprises (security gaps, dead code, partial implementations, anything weird)

1. **OTP value returned in response body across all OTP endpoints** (phone, email, aadhaar). Mock-mode artifact. **MUST be removed before any external user testing** — currently anyone hitting `/api/otp/send` can fetch their own (and anyone's, if not rate-limited) OTP. Also no rate limiting or send-cooldown on phone OTP (email OTP has 30s cooldown).
2. **`generateOTP` uses `Math.random()` instead of `crypto.randomInt`** (utils/crypto.ts:43). Predictable when prod gets serious.
3. **Default JWT secret literal `'your-secret-key'`** if `JWT_SECRET` env unset (utils/jwt.ts:4). Should fail-fast in prod (assert env present at boot).
4. **Forgot-password 404 leaks email enumeration** (auth.controller.ts:22-23 — returns 404 when "No account found"). Resend-verification got this right (always 200); forgot-password didn't.
5. **`POST /api/admin/create` is unauthenticated** (admin.routes.ts:45-49). Anyone reachable on the network can create an admin. Acceptable for first-admin bootstrap during dev; **must gate behind a setup token or env-var-allowlisted email before staging**.
6. **`acceptApplication` reject-already-accepted check is commented out** (application.service.ts:1070-1073). Either dead code (delete it) or a real bug (re-enable it). Confirm with Asrar. Likely was disabled for testing and forgotten.
7. **BOOKMARKED status not in `updateApplicationStatusSchema` enum** — `PUT /api/applications/:id/status` cannot set BOOKMARKED, only `PUT /api/applications/:id/bookmark` can. Validator drift.
8. **Admin revenue calculation is hardcoded** (`subscriptionPrice = 500` in admin.controller.ts:1324). Not connected to any payment record. The "₹500/sub × paid count" is a placeholder.
9. **Aadhaar verification has no Verhoeff** despite Q4 spec promising it. Add `Verhoeff.validate(aadhaarNumber)` to validators/aadhaar.validator.ts + auth.validator.ts.
10. **Audio chat is half-built:** `MessageType` schema enum has TEXT/AUDIO/IMAGE/SYSTEM, but service rejects AUDIO/IMAGE. Either remove from enum or implement upload pipeline. Currently inconsistent.
11. **Audio on apply is half-built:** FE has working audio recorder + `ApplyModal` UI, but BE has no audio field in validator and no multer on `POST /api/applications`. The webm Blob has nowhere to go.
12. **No real-time delivery channels:** notifications are in-app rows only. No FCM, no SMS, no email sending. The `notificationService.create` log says "Notification created" but nothing leaves the BE.
13. **`/api/skills` requires JWT** (skill.routes.ts:13) — but it's intended as a registration dropdown source. Registration is unauthenticated. Either drop the auth or move catalog fetch to post-login.
14. **Soft-deleted employer's jobs filtered out of public browse + recommendations + related, but not out of `/jobs/employer/:employerId`** (the public per-employer endpoint). Confirm if deliberate.
15. **No admin endpoint to undelete a soft-deleted user.** Once deleted, no `restoreUser` API. Confirm if v2 or never.
16. **Dashboard stats in admin count `prisma.jobSeeker.count()` and `prisma.employer.count()` without isDeleted filter.** This means deleted users still inflate counts (compare to other admin lists which all filter `user.isDeleted=false`).
17. **`getRelatedJobs` and `getRecommendedForSeeker` over-fetch `limit*3` candidates and score in memory.** OK at current scale (low rows), but with 10k+ jobs this becomes a load problem — flag for v2 perf work.
18. **`Q57` decision exists** (admin phone optional) but admin schema in primer didn't mention it. Captured.
19. **Status ordering matters for routes** — `routes/admin.routes.ts` and `routes/job.routes.ts` have explicit ordering comments showing `/deleted` and `/recommended` MUST come before `/:id` patterns. This is correctly implemented today; future contributors must preserve the order or routing breaks.
20. **`UserDropdown.tsx` shows 'Sanjay RK' as default user name** — hardcoded persona name from primer. Cosmetic but worth knowing.

---

## 2. Frontend audit

> Reference: full FE audit including base-URL/path/registration-flow divergences and all ~30 page summaries was done in the same session and saved to `/tmp/fe_audit_excel.md`. Selected highlights below; see that file for per-page tables.

### 2.1 What's wired vs mock

**Real API calls (FE wired to `apps/web/src/lib/api.ts`):** only **3** pages:
- `app/register/phone/page.tsx` — calls `jobSeekerAPI.registerPhone({phoneNumber})`
- `app/register/otp/page.tsx` — calls `jobSeekerAPI.verifyOTP` and `registerPhone` for resend
- `app/register/profile/page.tsx` — calls `jobSeekerAPI.completeProfile(formData)` (but does NOT include profile image or password)

**Pure mock (inline arrays/objects, no API):**
- All login pages (`/login`, `/employer`, `/admin/login`)
- `/forgot-password`
- All `/job-feed`, `/job-details/[id]` (param `[id]` is unused — same data regardless), `/my-applications`, `/my-applications/[id]`, `/saved-jobs`
- All `/employer/*` registration steps (5 pages), `/employer`, `/employer/workers` (placeholder "Coming soon" dashboard)
- All `/admin/*` pages (login uses hardcoded `admin@jobportal.com` / `admin123`)
- `ApplyModal` audio recorder records but submit is `console.log + alert`

### 2.2 Validation present

- `register/profile`: real multi-field — name trim, email contains `@`, DOB present, gender + language selected, password ≥8, passwords match
- `employer/register/account`: password ≥8 + match
- `employer/register/phone`: 10-digit numeric only

Everything else uses native HTML `required` or has none.

### 2.3 Broken navigation targets

Routes referenced in code but with no route file:
- `/register/categories` (target after profile success)
- `/tutorial` (target from registration success)
- `/jobs` (target from registration success — likely meant `/job-feed`)
- `/profile`, `/settings` (UserDropdown menu items)

### 2.4 FE/BE divergence (specifics)

**Base URL / port:** FE defaults to `http://localhost:8080/api` (api.ts:2); BE listens on `5000`. Override `NEXT_PUBLIC_API_URL` to fix. No `.env.example` was set in the FE so this trap is undocumented.

**Path naming:**
| FE expects | BE provides | Gap |
|---|---|---|
| `/job-seeker/*` (singular, hyphenated) | `/api/jobseekers/*` (plural, no hyphen) | Every jobseeker call is wrong |
| `/employer/*` | `/api/employers/*` | Same shape mismatch |
| `/admin/*` | `/api/admin/*` | OK on prefix but resource names diverge inside |

**Registration flow shape:** FE is 5 sequential POSTs (`register/phone`, `register/verify-otp`, `register/profile`, `register/categories`, `register/experience`). BE is a single multipart POST `/api/jobseekers/register` with all fields + Aadhaar + documents in one request. Architectural mismatch. **Recommended:** keep FE multi-step UX, accumulate state client-side, single multipart POST at the end. Matches D6.

**Auth model:** FE never sends `Authorization: Bearer <token>`. There's no token storage and no interceptor (api.ts has no token logic). BE expects Bearer JWT on protected routes. **All authenticated calls would 401 today.** This is the most urgent FE fix before integration.

**Other:**
- Profile image captured on FE but never sent (only previewed via FileReader)
- Password collected on FE but not sent on any wizard step
- OTP length: FE seeker = 4 digits; FE employer = 6 digits; BE schema = exactly 6 digits — **seeker OTP length mismatch will silently fail**
- Aadhaar input: not collected anywhere on FE — biggest gap for D6
- Plaintext password stored in localStorage on `employer/register/account/page.tsx` with comment "in production, hash this!" — a real security smell, must be removed before any wiring

---

## 3. Job category seed data — Excel file schemas

Source folder: `/Users/nazirhasan/Documents/GitHub/Job_Portal/documents/INPUT-FILES/`. Read via `openpyxl 3.1.5`. All 14 files are single-sheet workbooks (`Sheet1`).

### 3.1 Master taxonomy

**`Non_IT_Sectors_Categorized.xlsx`** — 121 rows. Columns: `Category`, `Sector`. The category → sector parent table.

```
Manufacturing & Engineering | Automobiles
Manufacturing & Engineering | Auto Components
Manufacturing & Engineering | Heavy Machinery
```

**`Statewise_Opportunity_Matrix.xlsx`** — 100 rows. Columns: `(unnamed)`, `Telangana`, `Andhra Pradesh`, `Karnataka`, `Tamil Nadu`, `Kerala`. South-India only. ✔️ marks active.

```
Automobiles      | ✔️ | -  | ✔️ | ✔️ | -
Auto Components  | ✔️ | -  | ✔️ | ✔️ | -
Heavy Machinery  | ✔️ | ✔️ | ✔️ | -  | -
```

**Open question:** seed all-India or only these 5 states? Confirm with Nazir.

### 3.2 Designation files

- **`non_it_sector_job_designations.xlsx`** — 86 rows. Columns: `Sector`, `Employment Type`, `Designation`. All rows seen are "Skilled".
- **`non_it_sector_job_designations_More.xlsx`** — 86 rows, same columns, **same first 3 rows** as the above. **Likely a duplicate.** Confirm with Nazir before ingesting.

### 3.3 Group designation files (10 files × 200 rows = 2,000 rows)

`Group_1..10_Job_Designations.xlsx` — each 200 rows, columns `Sector`, `Employment Type`, `Job Title`. Anchor sectors (first row of each):

| File | Anchor sector |
|---|---|
| Group_1 | Automobiles |
| Group_2 | Cement & Concrete Products |
| Group_3 | Rubber Products |
| Group_4 | Cold Chain Logistics |
| Group_5 | Biofuels & Ethanol |
| Group_6 | Hospital Infrastructure |
| Group_7 | Real Estate & Urban Housing |
| Group_8 | Leather Products |
| Group_9 | Fleet Management Services |
| Group_10 | Beauty & Wellness Services |

All 10 files start with the same 3 generic skilled titles (Machine Operator, Electrician, Welder), so significant deduplication is expected. Total raw rows: ~2,393. Expected unique `(sector, employment_type, title)` pairs after dedup: ~few hundred.

### 3.4 Recommended seed shape (PostgreSQL)

```sql
CREATE TABLE job_categories (
  id   UUID PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL
);
CREATE TABLE job_sectors (
  id          UUID PRIMARY KEY,
  category_id UUID REFERENCES job_categories(id),
  name        VARCHAR(160) UNIQUE NOT NULL
);
CREATE TYPE employment_type AS ENUM ('SKILLED','SEMI_SKILLED','UNSKILLED');
CREATE TABLE job_titles (
  id              UUID PRIMARY KEY,
  sector_id       UUID REFERENCES job_sectors(id),
  employment_type employment_type NOT NULL,
  title           VARCHAR(160) NOT NULL,
  UNIQUE (sector_id, employment_type, title)
);
CREATE TABLE states (
  id   UUID PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL
);
CREATE TABLE sector_state_availability (
  sector_id UUID REFERENCES job_sectors(id),
  state_id  UUID REFERENCES states(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (sector_id, state_id)
);
```

### 3.5 Open seed questions

1. Confirm `non_it_sector_job_designations_More.xlsx` is a duplicate (or has divergent rows).
2. Confirm whether ALL `Employment Type` rows are "Skilled" or whether SEMI_SKILLED / UNSKILLED variants exist (sample only showed "Skilled").
3. Confirm 5-state vs all-India scope for `sector_state_availability`.
4. Confirm whether the existing Prisma `Job.category` (free string) and `Job.subcategory` (free string) should be migrated to FK references against `job_sectors.id` and `job_titles.id`, or kept as free text with the seed data as a UI dropdown only.

---

## 4. Pointers for follow-up sessions

- **Don't re-read the BE.** This audit captures the surface as of 2026-05-05. Re-read individual files only when modifying them.
- **Trust 02 first, 03 second, then code.** 02 is the leadership inventory; 03 is the per-file detail; the code is authoritative when 03 contradicts it (record the correction in 03).
- **The grep tags table (1.6) is the source of truth for "what does Q53 mean?" questions.** Don't invent meanings.
- **Surprises (1.8) are the hit-list for S1 hardening.** Items 1, 3, 4, 5 are security must-fix-before-staging; 2, 9 are correctness; 6, 7, 16 are bugs / dead code; 10, 11, 12 are scope-locked.md "Missing" items.
- **FE audit (section 2) and Excel audit (section 3) save you 2–3 hours each.** Don't re-do them unless something in code changes.
