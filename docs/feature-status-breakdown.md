# ProSiddhi — Feature Status Breakdown
**Granular built-vs-to-build across all four surfaces.** Point-in-time snapshot for the 28 July 2026 status meeting.
Verified against the code (mobile git history current to 2026-07-23; web/admin/BE per this session's code review).

Legend: `✅ built · 🟡 partial · ⬜ not built`

---

## Backend — ~100% (feature-complete)
- ✅ **Auth** — phone-OTP, email+password, Google OAuth, email verify, forgot/reset, change pw/phone, soft-delete
- ✅ **Jobs** — CRUD, 3-level taxonomy validation, 30-day live window + cron, recommendations, saved jobs, reports
- ✅ **Applications** — apply, status workflow, interviews (on accepted application)
- ✅ **Chat** — conversations/messages (polling), read receipts, audio removed
- ✅ **Profiles** — seeker + employer, documents, skills
- ✅ **Search** — Postgres full-text for jobs and candidates
- ✅ **Monetization** — 8 plans, credit ledger (lots), Razorpay checkout + webhook + client-verify (no double-grant), GST invoices + PDF, post-credit gate (402), delete-refund, wallet, 14-day trial, daily crons
- ✅ **Candidate DB** — FTS search, snippet gate, atomic paid unlock, history
- ✅ **Team seats** — org membership (EmployerUser), entitlements (seatCap = MAX), invite (hashed token), public peek, accept, remove/revoke, seat-downgrade suspension
- ✅ **Admin API** — queues, document verification, moderation, content scan, skills CRUD, monetization views, reports queue, audit log, manage-admins (super-admin), add-user, real revenue
- ✅ **Notifications** — MSG91 SMS/WhatsApp/email + FCM adapters (no-op until configured)
- ✅ rate-limiting, webhook audit log, error-code contract

**Left:** ⬜ admin invoice-PDF route · 🟡 invite trial-lot cold-path fix (written, not merged) · ⬜ OTP-leak/enumeration fix · ⬜ prod validation-error detail · ⬜ JWT→httpOnly cookie (hardening)

---

## Web Portal — ~100% (+ internal QA-defect pass done)
- ✅ **Auth** — register seeker + employer (individual & business), 3 logins, email verify, forgot/reset, role routing, protected routes
- ✅ **Seeker** — job feed (search / filter / category / nearby / recommended), job details, apply, saved jobs, my applications, my interviews, contact-recruiter gate, report job, profile, chat, notifications dropdown, settings + language
- ✅ **Employer** — dashboard, post job (taxonomy), manage jobs (edit), applicants (accept/reject/shortlist), interviews, chat, profile
- ✅ **Monetization** — pricing, Razorpay checkout, wallet + expiry nudge, post-credit gate + upsell, top-up, invoices + PDF
- ✅ **Candidate DB** — snippet search, unlock confirm, unlocked history
- ✅ **Team seats** — roster (active/suspended/pending), invite, public `/invite/<token>` landing, remove/revoke
- ✅ **i18n** — English + Hindi complete
- ✅ Privacy / Terms / Contact

**Left:** ⬜ Google OAuth config (client-id not set) · ⬜ 8 more languages · ⬜ JWT→cookie · ⬜ *(roadmap, not v1: bulk upload, AI matching, featured listings)*

---

## Admin Console — ~100% (+ internal QA-defect pass done, 13 pages)
- ✅ Login + auth guard + role (ADMIN / SUPER_ADMIN)
- ✅ Dashboard — real revenue + 12-month trend + pending verifications
- ✅ Employer management — approve (atomic dual-flip), reject, payment override, soft-delete, deleted tab
- ✅ Job-seeker management
- ✅ Document verification (+ safe file links)
- ✅ Post moderation — no-violation / violation / warning / content scan / activate / deactivate / hard-delete
- ✅ Skills CRUD
- ✅ Taxonomy — Category/Sector/JobTitle CRUD, link/unlink, restore, tree
- ✅ Monetization views — payments, GST invoices, employer credits & seats
- ✅ Reports queue + resolve
- ✅ Manage admins (super-admin, guards)
- ✅ Add-user (jobseeker / employer, OTP pre-verify)
- ✅ Audit log (global + per-entity)

**Left:** ⬜ invoice-PDF download (blocked on the BE route). *Only gap — admin is essentially complete.*

---

## Mobile App — ~86% (Flutter · owner: Sailaja)
- ✅ **Auth 100%** — onboarding, language select, phone-OTP register (seeker + employer ind/biz), email-OTP verify, set-password, login (email + phone), forgot/reset
- 🟡 Google sign-in — built but switched OFF (needs Cloud console OAuth clients)
- ✅ **Seeker ~95%** — feed + taxonomy search, job detail (save, related), apply, my applications (+ withdraw), saved, my interviews, contact-recruiter, report, profile read/edit
- ✅ **Employer ~95%** — dashboard, post job (credit-gated), preview + submit, my jobs, edit/close/reopen/delete, recruiter-contact in post/edit, applicants → accept + schedule interview / reject, profile
- ✅ **Candidate DB 100%** — search + snippet gate, paid unlock (confirm), re-view free, history
- ✅ **Team seats 100%** — roster, invite (share-based), public peek, accept (consent-gated), revoke/remove
- ✅ **Chat 100%** — text + 5s polling + read receipts, Call HR
- ✅ Notifications (in-app), taxonomy cascade picker
- ✅ **i18n 100%** — English + Hindi

**Left:** ⬜ **in-app payment** (decision: in-app Razorpay + web-handoff fallback) · ⬜ **invoices** · ⬜ **Google sign-in enablement** (Cloud console) · ⬜ **device testing (never run on a device)** · ⬜ FAQ/Help · ⬜ push (FCM config) · ⬜ 8 more languages · 🟡 deep linking (paste-code works)

---

## Rollup

| Surface | Build | Testing | Key remaining |
|---|---|---|---|
| Backend | ~100% | 0% (starting) | config + a few small routes |
| Web Portal | ~100% | internal pass done | Google config, languages |
| Admin | ~100% | internal pass done | 1 BE-dependent gap |
| Mobile | ~86% | 0% (never on device) | payments, invoices, Google, device test |

## Cross-cutting, all surfaces
- **Go-live config:** HTTPS/TLS, `NODE_ENV=production`, live Razorpay keys + GSTIN, MSG91 DLT/WhatsApp, FCM
- **Terminology change (decided):** "credits" → user-facing **Plans / Job Posts / Candidate Unlocks** (display layer only; internal model unchanged)
- **Roadmap (not v1):** AI matching, HRMS/ATS integrations, bulk upload, skill assessments, 8 additional languages
