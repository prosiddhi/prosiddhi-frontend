# Test Plan (Skeleton) — Azkashine Job Portal v1

**Owner (post-handover):** Najeeb (QA Lead) + Farhana (QA junior, Mohamad.farhana@azkashine.com)
**Skeleton author:** Nazir Hasan (Acting PM)
**Date drafted:** 2026-05-11
**Product Owner / Sponsor:** Shaik Ishaq
**QA handover:** 2026-06-22  |  **Code freeze:** 2026-06-21

> This is a **skeleton**, not a finished test plan. It establishes scope, test types, environments, ownership, and the critical-path scenarios anchored to the Charter Section 9 success criteria. The full per-module test case list, tooling choices, and CI gating are Najeeb's calls after PRD lands — see Section 8 action items.

---

## 1. Purpose & ownership

- The Test Plan is **owned by Najeeb** as QA Lead (supported by Farhana, QA junior) from handover (2026-06-22) onward. This document is a starting point for them to fill in.
- **Tooling choice is Najeeb's call.** Where this skeleton would otherwise prescribe a framework, it instead leaves a `[Najeeb to decide]` marker. A non-binding recommendation (Playwright) appears in the footnote — but the final call is QA's.
- Scope: covers v1 only, per [`docs/_context/02-scope-locked.md`](_context/02-scope-locked.md). v2 features are out of scope for testing — see Section 7.

---

## 2. In-scope for v1 testing (per PRD's 15 modules)

| Module | Top-line testing concern |
|---|---|
| M1 — Auth & Identity | Phone OTP end-to-end on web + mobile for both seeker + employer; Email/password + Google OAuth login; **regression guard: zero Aadhaar code paths reachable anywhere in UI, API, or DB**. |
| M2 — Profile management | Profile create/update for seeker + employer (Individual + Corporate); profile photo + document CRUD; min-1-doc invariant on employer delete; forbidden-keys guard on profile PUT. |
| M3 — Job posting | Employer post with rich fields, live preview, location lat/lon, `showEmailToSeekers` / `showPhoneToSeekers` toggles; auto-FILL when accepted ≥ positions. |
| M4 — Job discovery | Recommended Jobs (weighted scoring per Q9) + Near By Jobs (GPS sort); ACTIVE-only filter; soft-deleted-employer exclusion; cold-start fallback. |
| M5 — Job application | Apply with optional **2-min audio** (web + mobile parity); withdraw; saved jobs; my-applications list and detail. |
| M6 — Candidate management | Employer Accept / Reject / Bookmark / Shortlist; candidate detail; All/Accepted/Shortlist/Rejected tabs (mobile parity). |
| M7 — Interview scheduling | Modal slot picker on Accept; WhatsApp + SMS confirmation; 24h + 2h reminders; reschedule once; day-after outcome (Hired / No-show / Re-interview). |
| M8 — Chat / messaging | Polling-based chat (`?after=<msgId>`); TEXT + AUDIO (60s cap); SYSTEM messages on apply/accept/reject; lastSeenAt surfaced. |
| M9 — Notifications | All 11 `NotificationType` events route through correct channels: in-app + FCM push + WhatsApp (where templates approved) + SMS fallback + email for sensitive. |
| M10 — Subscription & payments | Razorpay sandbox checkout; 14-day trial signup → day-3 + day-7 check-ins → end-of-trial conversion or downgrade; manual renewal only (no auto-debit). **Regression guard: no escrow / payment-intent / commission code paths.** |
| M11 — Admin verification | Corporate employer approval queue; seeker + employer document review; soft-delete + `/deleted` listing. |
| M12 — Admin content moderation | Scan Content button → OpenAI `omni-moderation-latest` + India scam regex layer; admin Send Warning / Delete; Job Reports from seekers. |
| M13 — Soft delete | `User.isDeleted` blocks login, kills pre-deletion JWT, hides jobs of soft-deleted employers from public browse and recruiter-contact reveal. |
| M14 — i18n (10 languages) | Language picker at register + header switcher; EN + HI 100% complete; other 8 fall back with `[needs review]` markers (never raw English placeholders). |
| M15 — Cross-cutting | Logging, request IDs, file upload caps (5 MB, type filters), error response shape, JWT expiry handling, lastSeenAt fire-and-forget. |

---

## 3. Test types

| Type | Owner | Notes |
|---|---|---|
| **Unit tests** | Devs — Asrar (BE), Nazir (FE), Mobile dev (TBD — Dheeraj off project 2026-05-15; new hire pending) (Mobile) | DoD requires unit tests where BE business logic is touched (subscription gates, recommendation scoring, OTP, moderation). |
| **Integration tests** | Asrar (BE), Nazir (FE API client), Mobile dev (TBD) (Mobile API client) | API-contract level. Catch FE↔BE divergence (top risk R1). |
| **End-to-end tests** | Najeeb / Farhana | Tooling: **[Najeeb to decide]** — see Section 8. |
| **Manual smoke tests** | Najeeb / Farhana | Sprint-end smoke on staging before each demo. Pre-handover smoke must pass on 2026-06-21. |
| **UAT** | Najeeb / Farhana | Starts **2026-06-22**. Uses critical-path scenarios in Section 5. |
| **Security audit** | Asrar + Nazir, reviewed by Najeeb | Light pass in Sprint 3, driven by Stage 2 `security-spec.md`. **Pen test is v2.** |

---

## 4. Test environments

| Env | Owner | Auth / integrations | Notes |
|---|---|---|---|
| **Local** | Devs | Mock OTP (returned in API response), mock WhatsApp, no real Razorpay | Default for unit + dev-loop work. |
| **Staging** | Nayan (infra) | Real OpenAI moderation, Razorpay **sandbox**, MSG91 sandbox / mock-mode SMS if DLT not yet approved, mock WhatsApp until Meta templates land | Must be stable for **48 hours pre-handover**. |
| **UAT** | Nayan + Najeeb / Farhana | Staging-like; seeded test accounts (admin, seekers, employers Individual + Corporate, job categories) | Available **from 2026-06-22**. |
| **Production** | TBD | Real everything | Post-launch only. Out of scope for handover testing. |

---

## 5. Critical-path test scenarios for handover (anchored to Charter Section 9)

The scenarios below are the must-pass set for QA handover on **2026-06-22**. They map directly to Charter Section 9 success criteria.

1. **Seeker phone-OTP signup → profile → recommended + nearby feeds.** Web AND mobile.
2. **Seeker applies to a job with a 2-minute audio message.** Same 2-min cap on web AND mobile; file plays back to employer.
3. **Seeker logs in via Email/password and via Google OAuth.** Both alternative login methods reach the dashboard.
4. **Employer (Individual) signs up → posts a job → receives applicants.** Instant approval path.
5. **Employer (Corporate) signs up → queues to admin → admin approves → can post.** Corporate approval path.
6. **Employer schedules an interview** via the modal slot picker; seeker receives the WhatsApp message (or SMS fallback) and the 24h reminder.
7. **Employer 14-day trial conversion flow:** signup → day-3 check-in → day-7 check-in → end-of-trial conversion to paid OR downgrade to free (Option B provisional). Razorpay sandbox completes successfully.
8. **Admin runs Scan Content** on a job post; OpenAI returns violations; admin uses Send Warning and Delete actions; seeker-side Job Report visible in admin post detail.
9. **Chat between seeker and employer** carries TEXT + AUDIO (60s cap); polling delivers new messages within ~10s; SYSTEM messages auto-post on apply/accept/reject.
10. **i18n smoke:** language switch to Hindi shows Hindi UI across all critical screens; EN + HI are 100% complete and reviewed.
11. **WhatsApp template delivers an OTP**, OR graceful SMS fallback fires if Meta verification has not yet completed.

> If the list cannot reach 8+ scenarios from Charter Section 9 + PRD success criteria for a given module, leave it short. Do not pad.

---

## 6. Pass / fail criteria for handover

- All 15 modules' critical scenarios above **pass on staging** in the 48 hours preceding handover.
- **Zero P0 bugs open.** P1 count agreed with Shaik Ishaq before handover sign-off.
- **EN + HI UI 100% complete and reviewed.** Other 8 languages present with `[needs review]` markers permitted on non-critical strings only.
- **Staging stable for 48 hours pre-handover** — no unplanned restarts, no env drift.
- **Seed data loaded** — job categories from `documents/INPUT-FILES/`, admin user, sample employers (Individual + Corporate), sample jobs.
- **QA pack delivered** — test account credentials, environment URLs, known-limitations note, regression scenarios.

---

## 7. Deferred to v2 testing

- **Performance / load testing** (1k+ concurrent users). Sprint 3 may add basic k6 smoke if Najeeb has bandwidth.
- **Accessibility audit** (WCAG AA) — v2.
- **Penetration testing** — v2. v1 ships with a light internal security review only.
- Anything covered by a v2 feature itself: TTS voice playback, AI document verification (OCR/photo-match), skill assessment, job ratings/reviews, auto-renewing subscriptions.

---

## 8. Najeeb action items (with deadlines)

- **[Najeeb to confirm by 2026-05-20]** UAT scenarios — sign off the critical-path list in Section 5; flag any missing must-have.
- **[Najeeb to decide by 2026-05-25, mid-S1]** **E2E tooling.** Recommended default: **Playwright** (cross-browser + can drive RN via Appium/Maestro alongside) — but the final call is yours. Hard deadline so test infra is ready before S2 features land.
- **[Najeeb to decide by 2026-05-25]** **CI test gating** — run E2E on every PR, sprint-end only, or a tiered subset (smoke on PR, full nightly)?
- **[Najeeb to write by 2026-06-01]** **Full test case list per module** — consumes the PRD; one file per module under `docs/test-cases/M01-...md` … `M15-...md` (path suggestion only, your call).
- **[Najeeb to confirm by 2026-06-08]** Staging readiness for the 48-hour pre-handover stability window — coordinate with Nayan.

---

## 9. Notes & references

- Charter (success criteria): [`charter.md`](charter.md) Section 9.
- Scope (canonical IN/OUT): [`_context/02-scope-locked.md`](_context/02-scope-locked.md).
- Current board / status truth + per-ticket Definition of Done: [`execution-playbook.md`](execution-playbook.md) (status analysis in its Appendix A). The standalone DoD / standup-template / BE-sync-agenda docs were removed in the 2026-06-13 purge — in git history.

> Footnote on tooling: Playwright is suggested as a non-binding default because it covers web cross-browser natively and pairs cleanly with Appium/Maestro for the React Native side, giving one assertion style across surfaces. All final calls — framework, runner, reporter, CI gating — are Najeeb's.
