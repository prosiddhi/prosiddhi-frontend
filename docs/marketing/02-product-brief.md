# Azkashine Job Portal — Product Brief

**Brand owner:** Shaik Ishaq, Azkashine Software & Services Pvt. Ltd.
**Document author:** Nazir Hasan (Product Manager)
**Date:** 2026-05-12
**Status:** Final for partner / employer / institutional distribution
**Companion document:** [`01-pitch-deck.md`](01-pitch-deck.md) — short-form deck for presentations

---

## Table of Contents

1. Product Description
2. Target Users
3. Market Context
4. Platform Architecture (functional)
5. Feature Catalogue — Worker (Job Seeker)
6. Feature Catalogue — Employer
7. Feature Catalogue — Administrator
8. Notification & Communication System
9. Security, Trust, and Verification
10. Localization (10 Indian Languages)
11. Subscription Model & Pricing
12. Technical Architecture (summary)
13. Quality Assurance & Compliance
14. Delivery Plan and Timeline
15. Product Roadmap — v1 to v2

---

## 1. Product Description

Azkashine Job Portal is a multilingual, mobile-first employment platform that connects **Potential workers and Domain Specialists in India** with employers seeking those workers. The product operates as a two-sided marketplace: a worker side (a free, multilingual app where workers create profiles, browse roles, and apply with text or voice) and an employer side (a paid subscription where employers post roles, review candidates, and conduct hiring conversations).

The platform is designed around three operating principles that distinguish it from existing alternatives in the Indian market:

- **Language reach.** The application interface is delivered in ten Indian languages — English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, and Bengali — from initial release. Workers and employers operate in the language they think and speak in.
- **Voice-first applications.** Job applications can include a recorded audio message (up to two minutes). Voice removes the literacy barrier that text-only application flows impose on a large portion of the Indian workforce and provides employers a richer signal about candidates than a paragraph of typed text.
- **WhatsApp-native communication.** Status updates, interview reminders, recruiter messages, and payment confirmations are delivered primarily through WhatsApp Business — the channel Indian workers actually use — with SMS as a fallback for delivery resilience.

The platform is operated by a small administrative team within Azkashine. This team manually verifies corporate employer registrations and performs second-line review of job-post moderation flags. The platform does not handle wages, settlement, or any payment flows between workers and employers; that economic relationship remains entirely off-platform. Revenue is generated exclusively through employer subscriptions.

---

## 2. Target Users

The platform serves three distinct persona types, each with explicit access controls and feature sets.

### 2.1 Job Seekers (Potential Workers and Domain Specialists)

The primary user population. Workers register through a phone-based flow and access the platform predominantly on mobile (Android and iPhone). Workers can also access the platform via the web for convenience but typical usage is mobile-led.

Workers in this segment commonly:

- Work across construction, manufacturing, food production, automotive, renewable energy, medical assistance, common works, repair services, domestic help, delivery, and retail sectors
- Possess specialised skills across multiple job domains
- Use a regional language as their primary working language; English fluency varies
- Operate primarily through WhatsApp for digital communication
- Are sensitive to commute distance when evaluating job opportunities

### 2.2 Employers

Two distinct sub-categories with different verification paths.

**Individual Employers** are sole proprietors or households hiring directly (e.g., a household hiring domestic help, a small shop hiring assistance). Registration is straightforward: phone OTP, profile, basic business information. Approval is automatic upon email verification.

**Corporate Employers** are registered businesses (private limited companies, partnerships, LLPs, sole proprietors with GST registration). Registration requires submission of business documentation — GST registration number, CIN where applicable, ISO certificates, business address, and trade documents. The Azkashine admin team manually reviews these documents before activating the account. The verification gate exists to protect job seekers from fraudulent postings and to enable a "verified employer" trust signal in candidate-facing screens.

Both employer categories use the platform from web (primary, desk-based workflow) and from the mobile employer application (for on-the-go candidate review, messaging, and scheduling).

### 2.3 Administrators

Azkashine's internal team. Administrators have access to a dedicated administrative web application that is separate from the public website. Their responsibilities span verification (worker documents, corporate employer registrations), content moderation (job-post review, scam-pattern detection), user management (account status, soft-delete recovery), and revenue oversight (subscription dashboards, payment reconciliation).

The administrative application is web-only. There is no administrative mobile application.

---

## 3. Market Context

India's workforce of potential workers and domain specialists across the segments listed in Section 2.1 numbers in excess of 300 million, according to publicly available labour statistics. McKinsey & Company has published projections indicating that approximately 70 percent of new employment created in India by 2030 will fall into the segments this platform serves.

Tier-2, Tier-3, and Tier-4 cities are presently the fastest-growing markets for hiring activity, with year-on-year growth in job postings ranging from 12 to 15 percent across these locations. These same markets are most affected by the gaps in existing platforms — particularly language and communication-channel limitations.

The existing competitive landscape comprises:

- **Apna** — the segment leader by user count. Offers eleven languages. Employer pricing is per-post (₹350–₹650 per posting for 15-day visibility) with separate purchases to unlock candidate contact details. Worker side is free.
- **WorkIndia** — strong competitor with tens of millions of users. Available in Hindi and English only. Employer pricing is tiered by validity period (30, 90, 365 days), typically beginning around ₹2,118 per month.
- **Naukri** — dominant in the white-collar segment. Employer per-post pricing ranges from ₹400 (non-metro) to ₹1,650 (Hot Vacancy listings). Worker premium offering is ₹890 per month but is a minor revenue line for the company. Resume database access (Resdex) is approximately ₹55,000 for three months.
- **JobHai** — Naukri-group property focused on the blue-collar segment. Employer side is free, monetisation occurs via the wider Naukri ecosystem.

Across all four competitors, the worker side is free or near-free. Revenue is generated from the employer side. Recruiter contact details are typically gated behind payment. The Indian market does not support meaningful worker-side monetisation in this segment.

Azkashine differentiates from this competitive set on language reach (broader than WorkIndia, comparable to Apna), communication channel (WhatsApp-native versus competitors' SMS-primary), application format (voice-first versus text-only), and pricing model (subscription versus per-post).

---

## 4. Platform Architecture (functional view)

The platform comprises four discrete applications operating against a shared backend.

| Application | Audience | Platform | Primary purpose |
|---|---|---|---|
| Public Web | Job Seekers, Employers | Browser (responsive) | Discovery, registration, job browsing, applications, candidate review, messaging |
| Mobile (Worker + Employer) | Job Seekers, Employers | Android, iOS | Same feature set as the public web for both worker and employer roles |
| Administrative Web | Azkashine admin team | Browser | Verification queues, content moderation, payments, revenue dashboards |
| Backend API | All three apps | Server-side | Single source of truth; all business logic; serves all three clients via REST + polling |

The backend is built on Express 5 with TypeScript, Prisma ORM 6, and PostgreSQL. Authentication uses JSON Web Tokens (JWT) with PBKDF2 password hashing. Input validation is enforced via Zod schemas on every endpoint. File uploads are handled by Multer with type and size allow-lists. Logging is provided by Winston with structured request, error, and event logs.

Audio and document files are stored on local disk for v1 with a presigned-URL abstraction layer. Migration to cloud storage (S3 or compatible) is a single configuration change in v2.

The mobile applications are React Native with Expo, supporting both Android and iOS from a single codebase.

---

## 5. Feature Catalogue — Worker (Job Seeker)

### 5.1 Registration and Account Management

Workers register using a phone-number-only flow. No government identification (Aadhaar or otherwise) is required at signup. The registration sequence is: language selection, phone number entry, six-digit OTP verification, profile creation (name, email, location, profile picture), preferred sector and job title, work experience, optional document uploads (certificates, ID), and password creation. Email is collected during the profile step and verified through an email-link confirmation.

Three login methods are supported post-registration: phone number with OTP, email with password, and Google OAuth. The choice is the worker's at every login.

Password reset, email change, phone change, and password change are supported through dedicated account-management flows with OTP verification at each step.

### 5.2 Language Selection

At first launch, the worker selects their preferred language from the ten supported. The selection persists across sessions. The language can be changed at any time through the profile settings; the change applies immediately to the entire user interface. All workflow-critical strings, button labels, form labels, and notification messages are translated.

### 5.3 Job Discovery

The platform presents two distinct job feeds on the home screen.

**Recommended Jobs** uses a weighted scoring algorithm against the worker's profile (preferred sector, preferred job title, work experience, skills) and location. The scoring weights for v1 are: sector match (25 points), job-title exact match (30 points), job-title fuzzy match (15 points), past work-experience tokens matching (up to 15 points), skills overlap (up to 20 points), and location proximity (10 points within 10 km, decaying exponentially beyond). A recency boost is applied (10 points for jobs under 24 hours old, 5 points for jobs under 7 days old). Cold-start workers (empty profile) see a fallback list based on city and popular categories.

**Nearby Jobs** sorts strictly by GPS distance from the worker's current or registered location. No profile-based scoring.

Both feeds support filtering by job type (full-time, part-time, contract), experience required, salary range, industry sector, role category, and urgent-opening flag.

### 5.4 Job Detail and Application

Each job posting displays the title, company name, salary range, job type, industry, location, posted date, full job description, and skills/qualifications required. A "Related Jobs" section appears below the description, showing comparable openings.

Workers apply through an application modal that supports two input formats: a typed text message (up to 1,000 characters) and a recorded audio message (up to two minutes; standard across web and mobile). Workers may submit text only, voice only, or both. The audio recording uses the browser's MediaRecorder API on the web and React Native's audio recording library on mobile; format detection at record time stores the file in its native container (WebM/Opus on Chrome and Android, MP4/AAC on iOS Safari, M4A or Opus on React Native).

After submission, applications appear in the worker's "My Applications" section, with state markers (Applied, Reviewed, Shortlisted, Rejected, Accepted, Withdrawn).

Application withdrawal is supported until the employer accepts or rejects the application.

### 5.5 Saved Jobs

Workers can mark any job for later review using a bookmark icon. Saved jobs are accessible from a dedicated "Saved Jobs" screen and persist across sessions. Workers can remove jobs from the saved list at any time.

### 5.6 Messaging with Employers

Workers can chat with employers via an in-app messaging system, but only with employers to whose jobs they have applied (scope rule enforced server-side). Messages are exchanged as text or as voice notes up to 60 seconds. The interface updates by polling every 10 seconds while the chat is open; no WebSocket connection is required.

Messages support read-receipts (per-message acknowledgement), last-seen timestamps on contacts, and system-generated notifications for application status changes ("Application submitted", "Application accepted with interview details", "Application rejected" with explanatory text).

Workers can call the employer's HR line directly from the chat interface where the employer has enabled phone visibility on the job posting (Section 6.6).

### 5.7 Notifications

Workers receive notifications across multiple channels (Section 8). In-app notifications appear in a dedicated notifications screen with eleven distinct event types: application submitted, application status changes (reviewed, shortlisted, rejected, accepted), interview scheduled, interview reminders (24-hour and 2-hour), document verification outcomes, profile approval, employer-warning messages from admin, and payment confirmations.

### 5.8 Interview Scheduling

When an employer schedules an interview, the worker receives a notification with the date, time, mode (in-person with address, phone with number, or video with meeting link), and any notes the employer added. WhatsApp and SMS reminders are sent 24 hours and 2 hours before the scheduled time.

After the interview, both parties can reschedule once. Subsequent rescheduling falls back to chat negotiation.

### 5.9 Profile Management

Workers can update their name, email address, profile picture, work experience entries, sector preference, job title preference, language, and uploaded documents at any time. Sensitive fields (email, phone, password) require additional verification via OTP. The interface enforces a profile-photo size limit (≤5 MB, JPEG/PNG/GIF/WebP) and an aggregate document upload limit.

### 5.10 Job Reporting

Workers can report any job posting they find suspicious or misleading. Reports require a written reason (5 to 1,000 characters) and are queued for administrator review.

---

## 6. Feature Catalogue — Employer

### 6.1 Registration and Verification

The employer registration flow varies based on company type.

**Individual employer registration** (suitable for households and sole proprietors) requires: phone number with OTP, name, email, company name, address, founded date, employee count, GST number (if applicable), CIN (if applicable), one identification document upload, and password. The account activates automatically upon email verification.

**Corporate employer registration** requires the same fields plus a richer document set: business registration certificate, ISO certifications (where applicable), GST registration, and additional trade documentation. The application enters an admin verification queue. Until verified, the employer cannot post jobs. The Azkashine admin team typically reviews submissions within 24 to 48 hours.

After registration, all employers receive a 14-day free trial that grants full feature access including unlimited job postings.

### 6.2 Dashboard

The employer dashboard summarises key activity across the employer's account: total jobs posted, total applications received (accepted, rejected, pending), recent applicants with status, and current subscription status (trial remaining, days to renewal, plan tier).

Dashboard widgets are tappable shortcuts to the related sub-screens (job-post list, candidate list, etc.).

### 6.3 Job Posting

Job posting is a multi-field form supported by a live preview pane. Required fields: job title, company name, salary range (or range with payment frequency), job type (full-time, part-time, contract), city and area, industry sector, department, urgent-requirement flag, and job description (rich-text). Optional fields: skills required, experience expected, gender preference (where legally relevant), and benefit description.

The live preview updates as the employer fills the form, showing the job exactly as candidates will see it. The employer can save as draft, post immediately, or schedule for a future date.

After posting, the job is subject to the content moderation flow (Section 7.3) before becoming publicly visible.

### 6.4 Candidate Management

The candidate management screen shows all applicants for a selected job. The interface includes four tabs: All Applicants, Accepted, Shortlist, and Rejected. Each applicant row displays the candidate's name, photo, contact information (subject to employer-set visibility rules), industry sector, location, and the time of application.

Tapping into an applicant opens the candidate detail view: personal information, language, sector and category preference, experience summary, work history entries, uploaded documents (with preview), and the voice/text application message. The employer can play the audio application directly in the interface.

Actions available per candidate: Accept (triggers interview scheduling), Reject (records rejection with the option to attach a brief message), Shortlist (move to shortlist tab for later review), Bookmark (defer decision).

### 6.5 Interview Scheduling

Upon accepting a candidate, the employer is prompted with an interview scheduling modal containing: date, time, interview type (in-person with address, phone with number, video with meeting link), and optional notes. Upon submission, the system automatically sends WhatsApp and SMS confirmation to the candidate and creates calendar entries on the employer's side.

Reminder messages are sent automatically 24 hours and 2 hours before the scheduled time, through both WhatsApp and SMS where the candidate has provided a reachable number.

After the interview, the employer is presented with a three-option outcome capture screen: Hired, Did Not Show Up, or Need Re-Interview. The selection drives the candidate's application status and any subsequent notifications.

### 6.6 Job Visibility Controls

For each posted job, employers can independently toggle two privacy settings: "Show email to seekers" and "Show phone to seekers". These flags control whether candidates see the employer's contact information in the job detail view, and whether the "Contact Recruiter" button is functional for that candidate. Workers must additionally be on a paid tier (where the platform's paid-tier mechanics gate recruiter contact) for the button to be visible.

### 6.7 Messaging with Candidates

Employers chat with applicants through the same messaging interface as workers. Conversations are scoped to candidates who have applied to one of the employer's jobs. Text and voice notes (60-second cap) are supported. The interface includes a phone-call shortcut and an email shortcut for employers who wish to escalate communication outside the platform.

### 6.8 Job Post Management

Posted jobs are accessible from a unified job-post list with two tabs: Active and Expired (filled, closed, cancelled, or past expiry date). Per-job actions include: edit, mark as filled, activate/deactivate, and view post details with applicant statistics.

When a job reaches the configured number of positions filled, the system automatically marks it as filled and removes it from the public feed.

### 6.9 Subscription Management

Employers can view their subscription status, payment history, and trial countdown from a dedicated subscription screen. Plan upgrade is available through Razorpay payment flow (UPI, cards, net banking). Manual renewal is the model in v1 — automatic recurring debit is deferred to a later release. The system prompts the employer 7 days before, 3 days before, and on the day of trial expiration.

---

## 7. Feature Catalogue — Administrator

### 7.1 Verification Queues

Three distinct verification queues operate within the admin application.

**Worker document verification queue** — workers who have uploaded identification or skills documents appear here. Admins review documents page-by-page (PDF, image), match against the worker's profile, and mark the document as Verified or Rejected. Rejected documents trigger an automated notification to the worker requesting resubmission. Verified documents grant the worker a verification badge visible to employers.

**Corporate employer verification queue** — employers registered as Corporate enter this queue immediately upon registration. Admins review business documents, GST registration, ISO certificates, and any required compliance documentation. Verification approval activates the account; rejection sends a notification with the reason and the option to resubmit.

**Re-verification queue** — when an employer changes their GST number, CIN, or company name, the system automatically re-queues the account for verification with the verification status reset to Pending.

### 7.2 Content Moderation

Every newly posted job appears in the moderation feed with a "Scan Content" button. The scan invokes OpenAI's `omni-moderation-latest` engine (a free moderation API with strong multilingual support — published improvements of 4 to 6× on Marathi, Bengali, and Telugu in late 2024 releases). The scan returns violations across categories: hate speech, harassment, self-harm, sexual content, and violence.

On top of the AI moderation, a regex-based India-specific scam detection layer flags additional patterns: registration or training fee demands, MLM language, free-email-domain "HR" contacts on jobs claiming to be from named corporates, upfront-payment demands, and "earn lakhs by recruiting" structures.

The system presents flagged content to the admin with highlighted offending text. The admin chooses one of three actions: No Violation (clear the flag), Send Warning (creates an employer-facing warning entry with admin-supplied reason), or Delete (removes the post permanently).

The admin can also process worker-submitted job reports through the same interface, which routes to the relevant post for review.

### 7.3 User Management

Admins can suspend, delete, or restore users (workers, employers, and other admin accounts). Soft-delete is the default behaviour: deleted users are flagged in the database but data is retained for compliance and recovery. The system enforces login rejection for soft-deleted users and excludes them from public job feeds. A dedicated "Deleted Users" screen lists deleted accounts with restoration controls.

### 7.4 Payment and Revenue Dashboards

Admins have access to platform-wide payment status: total revenue, total paid users, recent transactions, and per-user payment history. The revenue dashboard summarises year-on-year and month-on-month growth, with a breakdown by subscription tier. Admins can flag payment disputes for manual review.

### 7.5 Skills Catalogue Management

Admins maintain the skills catalogue that workers select from during profile creation. Each skill entry has a name, optional description, and an active/inactive flag. Inactive skills are hidden from worker-facing UIs but persist in the database for historical records.

### 7.6 Reporting and Analytics

A separate reporting screen provides aggregate analytics: total users (split by worker and employer), recent registrations, subscription chart (paid vs free, employer vs worker), recent job posts, and platform-wide application statistics.

---

## 8. Notification & Communication System

The platform uses a multi-channel notification architecture, with each event type routed to the channels most likely to ensure delivery and engagement.

| Channel | Purpose | Typical events | Cost characteristic |
|---|---|---|---|
| In-app notification | Universal default; available to all logged-in users | All eleven event types | Free (own infrastructure) |
| Phone push (FCM) | Primary mobile notification mechanism | All eleven event types | Free (Firebase) |
| WhatsApp Business | Primary external channel; high engagement | Application status, interview reminders, recruiter messages, payment confirmations, password reset | ~₹0.115 per utility template message |
| SMS | Critical channel + WhatsApp fallback | OTP, payment confirmation, interview reminders (where WhatsApp not delivered) | ~₹0.18–0.25 per message (DLT-compliant) |
| Email | Critical-only fallback | Password reset, employer-approval outcome | ~₹0.02–0.05 per message |

WhatsApp messaging is delivered through MSG91 (also our SMS provider, ensuring consistent vendor relationship). Templates require Meta Business Verification — a one-time onboarding process that runs in parallel with engineering build. Approved templates cover OTP delivery, application accepted/rejected/shortlisted, interview scheduled and reminders, payment confirmation, document approved/rejected, employer-to-candidate messages, and password reset.

WhatsApp open rates in India typically exceed 80 percent for transactional messages, compared with approximately 30 percent for SMS. This delivery difference is the primary rationale for WhatsApp-primary, SMS-fallback architecture.

---

## 9. Security, Trust, and Verification

### 9.1 Authentication and Authorization

All authentication uses JSON Web Tokens with seven-day expiry. Passwords are hashed using PBKDF2 with 310,000 rounds and SHA-256, with per-user salts. Phone and email OTPs are six-digit codes with 10-minute expiry and a maximum of five attempts per code.

Authorization is enforced through middleware-level role checks (SEEKER, EMPLOYER, ADMIN) plus per-resource ownership checks (workers can only edit their own profiles; employers can only edit their own jobs; admins access verification queues regardless of authorship).

Soft-deleted users are blocked from login by the authentication middleware. Soft-deleted employers are filtered from public job browses; the system returns the same response shape for both "employer not found" and "employer is deleted" to avoid information leakage.

### 9.2 Input Validation and File Uploads

Every endpoint validates input through a Zod schema. Raw request body access is prohibited. The profile update endpoint enforces a forbidden-key guard (email, phone, password fields cannot be modified through the profile endpoint; they require dedicated change endpoints with OTP verification).

File uploads are validated by Multer with type and size allow-lists. Profile pictures accept JPEG, PNG, GIF, WebP up to 5 MB. Documents accept PDF, JPG, PNG, DOC, DOCX up to 5 MB each, with a 10-file cap per worker or employer. Audio files accept WebM, MP4, M4A, Opus, with duration capped at two minutes for application audio and 60 seconds for chat audio.

### 9.3 Content Moderation

Section 7.2 describes the moderation pipeline. The AI-driven scan plus India-specific scam detection plus mandatory admin review constitute a three-stage defence against fraudulent or harmful postings. Workers can additionally report any job post, which immediately queues the post for re-review.

### 9.4 Data Protection

All data handling is aligned with the Digital Personal Data Protection Act 2023. Sensitive fields are never logged. Passwords are never stored in plain text. Payment card data is handled entirely by Razorpay; the platform does not store card numbers or CVVs. Logging strictly excludes JWT tokens, passwords, and OTP values from production logs.

The platform does not collect Aadhaar numbers or any other government-issued identification at registration. This is an explicit design decision: requiring Aadhaar would impose friction without offering meaningful verification value, and would create regulatory burden under the Supreme Court's Puttaswamy ruling on private-sector Aadhaar use.

### 9.5 Compliance Posture

The platform is designed to comply with:

- **DPDP Act 2023** — data minimisation, purpose limitation, user-rights workflows
- **TCCCPR 2018 (SMS regulations)** — DLT registration with MSG91; principal-entity status; approved-template-only commercial messaging
- **RBI Master Direction on Payment Aggregators (Sept 2025)** — the platform does not act as a payment aggregator; we use Razorpay as our PA, and all wage settlement happens off-platform
- **IT Act, 2000 and Intermediary Guidelines 2021** — due diligence, 36-hour takedown for notified content, designated grievance officer
- **Indian labour-law concerns** — neutral content moderation against discriminatory job posts

---

## 10. Localization (Ten Indian Languages)

The platform supports ten languages from initial release: English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, and Bengali.

Translation is produced using a hybrid pipeline: AI-generated first drafts are reviewed by native speakers before publication. This approach produces production-grade translations at approximately one-quarter to one-sixth the cost of agency translation.

The translation files are stored as JSON keys in the application repository, shared between the web application (next-i18next) and the mobile application (i18next) through a common workspace package. A hosted translation management system (TMS) such as Crowdin or Lokalise is a planned upgrade for v2 once string count exceeds 5,000 or release cadence justifies it.

English and Hindi are guaranteed to be 100% complete at code freeze. The other eight languages will be substantially complete; any missing strings will be flagged in the build as "[needs review]" rather than falling back to placeholder English.

Indic script support is handled natively by React Native and Next.js without additional configuration. Character-width considerations (some Indic scripts use 30–60% more horizontal space than equivalent Latin text) are factored into layout designs.

---

## 11. Subscription Model & Pricing

The platform operates on a subscription model. Workers are free and remain free; revenue is generated exclusively from the employer side.

The current pricing structure (provisional, awaiting final Owner confirmation):

| Side | Model |
|---|---|
| Job Seekers | Free indefinitely. No paid tier in v1. |
| Employers — Trial | 14-day free trial including full feature access and unlimited postings. Day-3 and Day-7 check-ins are delivered via WhatsApp to encourage trial conversion. |
| Employers — Paid | ₹999 per month (provisional). Includes unlimited job postings, candidate management, audio applications, multilingual UI, dedicated support, and WhatsApp candidate communication. |
| Renewal | Manual. The employer is prompted to renew at the end of each billing cycle. No automatic recurring debits in v1. |

Pricing was selected from a comparative analysis of competitor practices and an evaluation of three pricing options (subscription, per-post, hybrid). Detailed analysis is available in the Pricing Decision Memo (companion document).

The platform supports Razorpay as the payment gateway, accepting UPI, credit and debit cards (including RuPay), and net banking. No platform commission is taken from worker wages, applicant fees, or hiring outcomes. Revenue is subscription-only.

---

## 12. Technical Architecture (summary)

| Component | Technology |
|---|---|
| Backend | Express 5 (TypeScript, ESM), Prisma 6 ORM, PostgreSQL, Zod input validation, JWT authentication, PBKDF2 password hashing, Multer file uploads, Winston logging |
| Frontend (Web) | Next.js 14 (App Router), TypeScript, Tailwind CSS, lucide icon system |
| Frontend (Mobile) | React Native + Expo, RTK Query, NativeBase, MMKV storage |
| Admin App | Next.js + Tailwind (matching the public web stack to minimise migration overhead) |
| Translations | next-i18next (web), i18next (mobile), shared package |
| Payments | Razorpay (subscription via standard checkout in v1; e-mandate in v2) |
| Notifications | Firebase Cloud Messaging (push), MSG91 (SMS, WhatsApp), Sendgrid or equivalent (email) |
| Content Moderation | OpenAI Moderation API (`omni-moderation-latest`) + regex-based scam detection |
| File Storage | Local disk (v1) with presigned-URL abstraction; S3-compatible (Cloudflare R2 or AWS S3) in v2 |
| Hosting | Cloud-hosted; specific provider TBD by infrastructure team |
| Repository structure | Two repositories: frontend monorepo (`apps/web`, `apps/admin`, `apps/mobile`, shared packages) and backend (separate repository for build/deploy independence) |

The architecture explicitly does not include WebSocket real-time transport in v1 (polling every 10 seconds is the chat refresh mechanism), nor on-platform escrow or payment intermediation. These are not deferred features; they are explicit design exclusions.

---

## 13. Quality Assurance & Compliance

The platform is built with a dedicated Quality Assurance Lead (Najeeb) who owns the test plan and acceptance testing process. The QA workflow comprises:

- **Unit testing** — owned by developers (Asrar for backend, Nazir for frontend, Dheeraj for mobile). Required for every feature touching business logic
- **Integration testing** — at the BE-FE-Mobile API boundary, owned by the same developers in coordination
- **End-to-end testing** — owned by QA with tooling to be determined (Playwright is the recommended default for cross-browser plus React Native coverage)
- **Manual smoke testing** — QA team executes sprint-end and before each demo, on the staging environment
- **User acceptance testing** — begins on 2026-06-15 (the QA handover date). Test scenarios anchor on the Charter's success criteria

The platform is built with a Definition of Done that includes peer code review, lint and type checks, manual staging smoke tests, and i18n string completeness for English and Hindi. The full DoD is documented separately.

Security review occurs during Sprint 3 (the final week before QA handover), focusing on the authentication baseline, OWASP top 10 mitigations, secrets management, and the Razorpay webhook integrity. The security specification is a standalone document.

---

## 14. Delivery Plan and Timeline

| Date | Phase |
|---|---|
| 2026-05-05 to 10 | Sprint 0 — Discovery, decision-locking, planning artifacts |
| 2026-05-11 to 24 | Sprint 1 — Authentication rework, subscription module, FE/BE reconciliation, mobile and admin app skeletons, WhatsApp + SMS infrastructure setup |
| 2026-05-25 to Jun 7 | Sprint 2 — Core flows: apply with audio, candidate management, chat with audio, content moderation, English + Hindi UI |
| 2026-06-08 to 14 | Sprint 3 — Bug fixes, performance pass, security audit, seed data, staging deploy |
| 2026-06-14 | Code freeze |
| 2026-06-15 | QA handover; UAT begins |
| 2026-07-01 (target) | Public launch |

The build window is six weeks. Engineering capacity is three full-time developers (one backend, one frontend, one mobile) plus a QA Lead and an Infrastructure Lead with separate engagement schedules.

External dependencies tracked on a daily basis include: DLT registration with MSG91 (2 to 3 weeks elapsed), Razorpay merchant KYC (2 to 3 weeks elapsed), Meta Business verification for WhatsApp (1 to 3 weeks elapsed), and translation reviewer recruitment.

---

## 15. Product Roadmap — v1 to v2

### v1 (June 2026 launch) — Feature Set

All features described in Sections 5–11 are within v1 scope. The platform launches with the worker side fully free, the employer side on the 14-day trial-to-paid model, ten Indian languages, WhatsApp-native notifications, and the full administrative review workflow.

### v2 (post-launch, six months out) — Planned Additions

- **Real-time chat transport** (WebSocket) — if user engagement justifies it. The v1 polling architecture is sufficient at MVP scale.
- **Voice text-to-speech engine** — the placeholder voice icons across the worker interface today become functional; workers can hear UI labels and job descriptions read aloud in their selected language.
- **AI-driven document verification** — OCR plus photo-match plus government-database cross-check to replace current manual document review.
- **Voice transcription** — application audio messages get an automated transcript displayed alongside the audio.
- **Razorpay e-mandate** — automatic recurring debit for subscription renewal, replacing v1's manual prompt.
- **Cloud storage migration** — audio and document storage moves from local disk to S3-compatible object storage. This is a single configuration change in the existing presigned-URL abstraction layer.
- **Employer mobile feature parity** — already present at v1; v2 adds optimisations.
- **Job ratings and reviews** — post-completion ratings from both worker and employer.
- **Translation management system** — hosted Crowdin or Lokalise integration when string count exceeds 5,000.

### Permanently Out of Scope

Two features are explicit, permanent exclusions from this product:

- **Government-issued identification verification at registration** (Aadhaar or otherwise). Workers register with phone OTP only; this is a deliberate design choice based on competitor analysis and friction reduction.
- **Platform-handled payments between workers and employers** (escrow, commissions, payouts). Azkashine connects workers and employers; the economic settlement between them is direct. We do not intermediate.

These are explicitly out of scope, not deferred. They will not appear in v2 or later releases of this product.

---

## Document Status

This brief reflects the locked v1 product specification as of 2026-05-12. It is suitable for distribution to prospective partners, prospective enterprise employers, and internal Azkashine stakeholders. For changes to scope or feature set, the canonical document is `docs/_context/02-scope-locked.md`; any divergence between this brief and that document should be treated as an oversight in this brief and corrected accordingly.

**Companion documents:**
- [`01-pitch-deck.md`](01-pitch-deck.md) — short-form deck for presentations
- [`../managerial/01-project-charter.md`](../managerial/01-project-charter.md) — project charter (Owner & Sponsor sign-off document)
- [`../managerial/03-pricing-decision-memo.md`](../managerial/03-pricing-decision-memo.md) — detailed pricing analysis with three options
- [`../managerial/04-prd-v1.md`](../managerial/04-prd-v1.md) — full Product Requirements Document for engineering build
