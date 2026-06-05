# Definition of Done — Job Portal v1

**Owner:** Nazir Hasan (Acting PM)
**Date:** 2026-05-11
**Applies to:** Sprints 1–3 (May 18 – Jun 19, 2026), QA handover 2026-06-22
**Source acceptance criteria:** [`04-prd-v1.md`](04-prd-v1.md) (Modules M1–M15)

---

## 1. What "Done" means in v1

Done means **ready for QA handover** — not "code written." A feature is Done when its PRD acceptance criteria are demonstrably met on the staging environment, a peer has reviewed the code, and a teammate other than the implementer has clicked through the feature end-to-end without finding a defect. If QA can't run the scenario on Day 1 of UAT (2026-06-22), it isn't Done — regardless of what the PR looks like.

## 2. Per-feature Definition of Done

Every backlog item must satisfy ALL of the following before being marked Done:

1. **All PRD acceptance criteria met**, cited by ID in the PR description (e.g., M5-AC3, M10-AC7). If the build proves an AC was wrong, update the PRD before closing — never silently skip.
2. **Peer code review by ≥1 teammate**, cross-app where possible: Asrar reviews Nazir's BE-touching changes; Nazir reviews Asrar's API-shape changes; mobile changes (owner: Mobile dev (TBD — Dheeraj off project 2026-05-15; new hire pending)) are reviewed by either Nazir or Asrar.
3. **Tests added where the feature touches BE business logic** — unit tests for services, integration tests for routes. E2E is QA's responsibility (Najeeb / Farhana) and is not blocking here.
4. **Linting + type check pass** locally and in CI. Zero new warnings introduced.
5. **Manual smoke test on staging** performed by someone other than the implementer.
6. **Feature works on web AND mobile** if scope says so (D3 revised 2026-05-09 — full seeker + employer parity on mobile). Admin remains web-only.
7. **i18n: EN + HI strings added to JSON** at minimum. The other 8 languages may carry `[needs review]` markers — never placeholder English strings, never missing keys.
8. **No new console warnings, runtime errors, or unhandled promise rejections** introduced. Existing ones may be left alone if untouched by this change.
9. **Documentation updated where the build surfaced new facts:** `02-scope-locked.md` if a locked decision clarified; `04-prd-v1.md` if an AC evolved; BE's `API_DOCUMENTATION.md` (or OpenAPI artefact) if the API shape changed.
10. **WhatsApp templates submitted to Meta** if the feature triggers a notification under Q7 (application status, interview scheduled/reminders, payment confirmation, recruiter message, OTP). Submission is the non-engineering owner's task — engineering's job is to flag it on the PR.
11. **Subscription / paid-tier gating verified** — paid-only features (e.g., contact-recruiter reveal, employer posting) check subscription state; free flows aren't accidentally blocked. Reference: [`03-pricing-decision-provisional.md`](03-pricing-decision-provisional.md) (Option B).
12. **Scope-drift check** — the change does NOT add anything listed as permanently out of scope in `02-scope-locked.md` (Aadhaar, escrow / platform-handled wages, WebSockets / real-time chat, .ics calendar invites, voice message transcription).

## 3. Sprint-level Definition of Done

A sprint is Done when:

- **All sprint backlog items closed or explicitly re-planned** into a later sprint with a written reason. Half-done items do not carry forward silently.
- **No P0 (blocker) bugs open** against features marked Done this sprint. P1s are tracked but don't block sprint close.
- **Deploy to staging verified end-to-end** for every Done feature by someone other than the implementer.
- **Sprint retro held** (15 min, async on the standup channel is fine), summarised into `04-project-status.md` session log.

## 4. "Done done" for QA handover (2026-06-22)

Pulled from [`01-project-charter.md`](01-project-charter.md) Section 9. Every item must be true on the morning of 2026-06-22:

1. Three apps deployed to staging — public website, admin website, mobile app — all on real authentication, no mock data on critical paths.
2. A worker can: sign up via phone OTP, complete profile, browse Recommended + Nearby jobs, apply with a voice message, chat with an employer, pay (Option B pricing), receive notifications.
3. An employer (Individual or Corporate) can: sign up, get verified or instantly approved, post a job, review applicants, schedule an interview, pay, message a worker.
4. An admin can: process verification queues, scan content with OpenAI moderation, send warnings, delete violating posts, see revenue dashboard.
5. EN + HI UI 100% complete and reviewed. Other 8 languages present, with `[needs review]` markers where incomplete.
6. Backend has: Razorpay subscription module, phone-OTP + Email + Google OAuth login, content moderation via OpenAI + India scam regex, all 11 notification types delivered across the channel matrix (in-app + push + SMS for critical + email for sensitive + WhatsApp where templates are approved).
7. Seed data loaded — job categories from the 11 INPUT-FILES spreadsheets, an admin user, sample employers.
8. API contract published in `docs/technical/`; QA pack delivered to Najeeb / Farhana — test accounts, environment URLs, known limitations, regression scenarios.
9. Code freeze holds from June 21; only P0 blocker fixes during UAT.

## 5. What "Done" does NOT mean

- **"Code is on main"** ≠ Done. A merged PR that hasn't passed Section 2 is just merged code.
- **"Tests pass locally"** ≠ Done. Tests must pass in CI and the feature must work on staging.
- **"Asrar said it's ready"** (or Nazir, or Mobile dev (TBD)) ≠ Done without peer review + a smoke test by someone else.
- **"It works on web"** ≠ Done if scope says it must work on mobile too (D3 revised).
- **"The mock data shows the right screens"** ≠ Done. Mock data is only acceptable on screens the PRD explicitly marks as non-critical for QA Day 1.
- **"WhatsApp template was drafted"** ≠ Done. Template must be submitted to Meta (approval may slip past handover per R14 — that's accepted; submission is not).

---

When in doubt, the PRD acceptance criteria are the contract. If an AC doesn't say it, it's not in scope. If reality requires expanding an AC, update the PRD before closing the ticket — not after.
