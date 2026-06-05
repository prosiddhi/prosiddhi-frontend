# Prompt 7 — Test Plan Skeleton

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

This is a SKELETON, not a full test plan. Full content waits until PRD is approved and Najeeb (QA Lead) has confirmed tooling. Today the goal is: produce the structure, populate what's known, leave clear placeholders for Najeeb.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/03-codebase-audit.md
5. docs/managerial/01-project-charter.md (esp. Section 9
   success criteria)
6. docs/managerial/02-be-sync-agenda.md (esp. bugs section)

Your single task: produce a Test Plan SKELETON that
establishes scope, test types, environments, and ownership.
NOT a full test case list — that comes after PRD lands and
Najeeb (QA Lead) decides tooling.

==== OUTPUT ====

CREATE docs/managerial/09-test-plan.md (~150 lines).

Sections:

1. **Purpose + ownership**
   - Najeeb is the QA Lead (per team table).
   - Test Plan is owned by Najeeb post-handover; this
     skeleton is a starting point for him to fill in.
   - Tooling choice (Playwright / Cypress / Selenium /
     manual) is **Najeeb's call** — leave as a `[Najeeb to
     decide]` placeholder. Don't prescribe.

2. **In-scope for v1 testing** — list of areas to test,
   grouped by module (mirror the PRD's 15 modules):
   - M1 Auth & Identity
   - M2 Profile
   - M3 Job posting
   - ... (through M15)
   For each module, write ONE LINE about what we care
   about most. Example: "M1 — verify phone OTP flow
   end-to-end on web + mobile; verify Email/Google OAuth
   login; verify Aadhaar code paths are gone (regression
   guard)."

3. **Test types**
   - **Unit tests** — owned by developers (Asrar BE,
     Nazir FE, Dheeraj Mobile). DoD requires unit tests
     where BE business logic is touched.
   - **Integration tests** — owned by Asrar (BE), Nazir
     (FE API client), Dheeraj (Mobile API client).
   - **End-to-end tests** — owned by Najeeb. Tooling TBD.
   - **Manual smoke tests** — owned by Najeeb's team.
     Sprint-level smoke test on staging before each demo.
   - **UAT (User Acceptance Testing)** — starts 2026-06-15;
     Najeeb owns.
   - **Security audit** — light pass in Sprint 3 (Stage 2
     `security-spec.md` will define checks). Pen test is
     v2.

4. **Test environments**
   - **Local** — dev machines. Mock OTP, no real WhatsApp.
   - **Staging** — Nayan owns infra. Real OpenAI moderation,
     real Razorpay sandbox, mock-mode SMS if DLT not yet
     approved.
   - **UAT** — staging-like with seeded test accounts.
     Available from 2026-06-15.
   - **Production** — post-launch only.

5. **Critical-path test scenarios for handover**
   List the top **8–12** scenarios that MUST work on QA
   handover day (2026-06-15). Anchor on Charter Section 9
   success criteria (do NOT pad with weaker scenarios; if
   you can't reach 8 from Charter Section 9 + PRD success
   criteria, list fewer). Examples:
   - Seeker can sign up with phone OTP, complete profile,
     browse Recommended + Nearby jobs.
   - Employer (Individual) can post a job and receive
     applicants.
   - Employer (Corporate) registration queues to admin
     correctly.
   - Apply-with-audio flow works on web AND mobile (2-min
     cap).
   - 14-day trial conversion flow: employer signup →
     day-3 in-app + WhatsApp check-in → day-7 check-in →
     end-of-trial conversion to paid OR downgrade to free
     (provisional Option B).
   - Admin can run Scan Content on a job post and act on
     violations.
   - Subscription payment via Razorpay (sandbox) succeeds.
   - WhatsApp template delivers OTP (or graceful SMS
     fallback if Meta not yet approved).
   - i18n: switching to Hindi shows Hindi UI.

6. **Pass/fail criteria for handover**
   - All 15 modules' critical scenarios pass.
   - No P0 bugs open.
   - English + Hindi UI 100% complete.
   - Staging environment stable for 48 hours pre-handover.

7. **What's deferred to v2 testing**
   - Performance/load testing (1k+ concurrent users) —
     Sprint 3 may add basic k6 if Najeeb has bandwidth.
   - Accessibility audit (WCAG AA) — v2.
   - Penetration testing — v2.

8. **Najeeb action items (with deadlines)**
   - [Najeeb to decide by **2026-05-25**, mid-S1] e2e
     tooling — Playwright recommended for cross-browser +
     RN coverage; Najeeb's final call. Hard deadline so
     test infra is ready before S2 features land.
   - [Najeeb to decide by **2026-05-25**] CI test gating
     (run on every PR vs sprint-end only)
   - [Najeeb to write by **2026-06-01**] full test case
     list per module (consumes the PRD)
   - [Najeeb to confirm by **2026-05-20**] UAT scenarios —
     sign off the critical-path list above

==== CONSTRAINTS ====

- Do NOT prescribe specific test frameworks. Recommend
  Playwright as a default in a footnote, but ALL final
  calls are Najeeb's.
- Do NOT write specific test case content — this is a
  skeleton.
- Do NOT contradict scope-locked.md (no Aadhaar testing,
  no escrow testing, no WebSocket testing).
- ~150 lines max.
- After saving, report 3-line chat summary:
  - File path
  - Number of [Najeeb to decide / confirm] markers in the
    doc (he should see this list)
  - One sanity-check item

Today's date: use real current date. User: Nazir Hasan.
Owner: Shaik Ishaq.
```

---

## After this session

Send the skeleton to Najeeb with a note: "This is the structure; please fill in your tooling choices and per-module test cases once the PRD lands." Najeeb's full populate happens after PRD + RTM.
