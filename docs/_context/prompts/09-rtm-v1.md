# Prompt 9 — RTM (Requirements Traceability Matrix)

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

**PREREQUISITE:** The PRD at `docs/managerial/04-prd-v1.md` must exist. The RTM consumes the PRD — it does not generate requirements from thin air.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/managerial/04-prd-v1.md  (REQUIRED — RTM derives
   from this; abort if not present)
5. docs/managerial/07-definition-of-done.md (if exists; for
   the "Done" column criteria)
6. docs/managerial/09-test-plan.md (if exists; for the test
   case ID column)

Your single task: produce the Requirements Traceability
Matrix that maps each PRD acceptance criterion to its
implementation status, owner, sprint, test coverage, and
risk.

==== OUTPUT ====

CREATE docs/managerial/05-rtm-v1.md (~varies — depends on
PRD size; **expect ~130 rows** matching the PRD's AC count
per Appendix B; if you produce >150 you're double-counting
non-AC content).

Structure:

1. **Header** — title, date, source PRD link.

2. **How to read this matrix** — short paragraph. Each row
   is ONE acceptance criterion from the PRD. Columns
   capture status from creation through QA sign-off.

3. **Legend / column meanings:**
   - Req ID — `M[module]-AC[criterion-number]` (e.g.,
     M1-AC3). **IMPORTANT:** the PRD does NOT carry AC
     IDs in the file — it uses unmarked `- [ ]` checkboxes
     under each module's "Acceptance criteria" section.
     Assign IDs by **1-indexed bullet position** within
     each module's AC section (i.e., the third checkbox
     under M1's `**Acceptance criteria:**` → M1-AC3).
     The total across all modules should be ≈ PRD
     Appendix B's count (130). If you produce many more
     than 130 rows, you're double-counting non-AC
     content (BE endpoints, FE screens, etc. are NOT
     ACs and don't get RTM rows).
   - PRD source — link to the PRD module section
   - Description — one-line restatement of the acceptance
     criterion
   - Owner — Asrar / Nazir / Dheeraj / Najeeb / Nayan /
     Shaik (per scope-locked team table)
   - Sprint — S1 / S2 / S3
   - Status — ⏳ Not started / 🔧 In progress / ✅ Done /
     ❌ Blocked / 🚫 Descoped
   - Test case ID — placeholder `T-[Req ID]` (Najeeb
     populates concrete IDs later)
   - Priority — P0 (must ship) / P1 (should ship) / P2
     (nice-to-have)
   - Risk — H / M / L; one-line risk note if H or M
   - Notes — open questions, dependencies, deletion
     markers (e.g., "Aadhaar code path — TO BE DELETED in
     S1 day 1")

4. **Main matrix** — one table, sorted by module then by
   acceptance criterion. Every PRD module gets at least
   one section heading inside the table.

   **Multi-owner ACs:** if an AC spans multiple owners
   (e.g., M1-AC5 "Login methods wired and tested
   end-to-end for both seeker and employer" spans BE +
   FE + Mobile), emit **ONE row with comma-separated
   owners** (`Asrar, Nazir, Dheeraj`); do NOT split into
   3 rows — splitting breaks 1:1 traceability to the PRD.

   **What goes in the RTM:** only Acceptance Criteria.
   The PRD's `BE endpoints involved`, `FE screens
   involved`, `Mobile scope`, `Out-of-scope`, and
   `Open questions` sub-sections are NOT requirements
   for the RTM — they're implementation notes referenced
   FROM ACs. Skip them.

5. **Status rollup at the top** — summary table:
   - Total requirements: N
   - By status: ⏳ X / 🔧 Y / ✅ Z / ❌ B / 🚫 D
   - By priority: P0 X / P1 Y / P2 Z
   - By sprint: S1 X / S2 Y / S3 Z
   - By owner: each team member's count

6. **Risk register cross-reference** — short section
   listing requirements with H risk and the mitigation
   from scope-locked.md (risk R1-R16).

==== ASSIGNMENT RULES (apply these when filling Owner / Sprint) ====

- Auth, registration, subscription, payments → Asrar (BE)
  in S1; Nazir (FE) in S1; Dheeraj (Mobile) in S1
- Notifications (FCM + SMS + WhatsApp + email) → Asrar
  primarily; Shaik runs Meta verification in parallel
- Audio messaging → Asrar in S2; Nazir + Dheeraj
  consuming in S2
- Content moderation (OpenAI scan) → Asrar in S2
- Candidate management → Asrar (existing endpoints) +
  Nazir/Dheeraj for UI in S2
- Interview scheduling → Nazir + Dheeraj for UI in S2;
  Asrar for SMS/WhatsApp reminders in S2
- i18n → Nazir + Dheeraj implementation in S2; reviewers
  in parallel
- Admin verification + moderation → Nazir (web only, S2)
- Bug fixes from audit (BOOKMARKED validator, rejected
  guard, Math.random OTP, JWT_SECRET default) → Asrar in
  S1 day 1
- Aadhaar deletion → Asrar S1 day 1
- Hardening / perf / security audit / seed data → S3
  (joint)

Priority defaults:
- Anything in Charter Section 9 success criteria → P0
- Anything that gates QA handover (auth, payments, basic
  flows) → P0
- Anything that's a paid-tier-only feature → P1 (workable
  without if pricing pivots)
- Nice-to-have polish → P2

==== CONSTRAINTS ====

- Do NOT fabricate requirements. Every row must trace to
  a specific acceptance criterion in the PRD. If the PRD
  doesn't have one, don't create one.
- Do NOT contradict PRD module wording — use the same
  vocabulary.
- Do NOT include Aadhaar requirements (Q3/Q4 revoked).
- Do NOT include escrow / payment-intent requirements (Q12
  revoked).
- After saving, report 5-line chat summary:
  - File path
  - Total requirement count
  - Distribution by status (should be mostly ⏳ Not started
    since coding hasn't begun)
  - Top 3 P0 H-risk requirements that need owner attention
    today
  - Sanity check: any module from the PRD with ZERO rows
    (would indicate a parsing issue)

Today's date: use real current date. User: Nazir Hasan.
Owner: Shaik Ishaq.
```

---

## After this session

The RTM is the input for the Sprint Plan + S1 Backlog (Prompt 10). It's also Najeeb's anchor for writing test cases — once test case IDs are populated, the matrix becomes the QA sign-off ledger.

Update the RTM continuously through Sprints 1–3 — as items move from ⏳ → 🔧 → ✅, edit in place. Use `/check-scope` (slash command from Stage 3) before any RTM edit that adds requirements not in the PRD.
