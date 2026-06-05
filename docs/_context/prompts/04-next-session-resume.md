# Prompt 4 — Next-Session Resume (2026-05-09 evening pickup)

**This is a one-time resume prompt** for picking up where the 2026-05-09 session left off. Use this instead of `00-new-session-kickoff.md` if you want the new session to know specifically what to attack next (rather than ask you what to work on).

Open Claude Code in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

---

```
You are picking up where the previous session left off on the
Azkashine Job Portal project. The previous session was
context-heavy and had to wrap up; you're the fresh continuation.

==== STEP 1: READ PRIMERS (in this order) ====

1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/04-project-status.md

DO NOT read the 64-page UX PDF, the 55-page mobile design
PDF, the BE codebase, or chat history. The primers replace
them — ~30K tokens of compressed truth vs ~250K of naive
re-discovery.

==== STEP 2: WHERE WE ARE (2026-05-09 evening) ====

A major scope revision was applied 2026-05-09 morning:
- Aadhaar removed entirely (not v1, not v2 either)
- Escrow / platform-handled payments removed entirely
  (revenue is subscription-only forever)
- WhatsApp Business added to v1 (Shaik Ishaq runs Meta
  verification process; MSG91 is BSP)
- Mobile expanded to full seeker + employer parity
  (Dheeraj is dedicated mobile dev)
- Pricing pending Shaik Ishaq's decision (deadline
  2026-05-18; Pricing Memo at
  docs/managerial/03-pricing-decision-memo.md)
- Application audio cap: 2 minutes (was 5 min)
- Auth: phone OTP only at registration; Email + Google
  OAuth as alternative login methods

Stage 1 deliverables sent out:
- Charter (docs/managerial/01-project-charter.md +
  PDF) — sent to Shaik Ishaq for sign-off
- Pricing Memo (docs/managerial/03-pricing-decision-memo.md
  + PDF) — sent to Shaik for pricing decision (deadline
  2026-05-18)
- BE sync agenda (docs/managerial/02-be-sync-agenda.md) —
  refreshed and sent to Asrar (response deadline 2026-05-12)

DO NOT mention WebSockets, voice transcription, or .ics
calendar invites — these were scrubbed entirely. Don't
propose adding them back.

==== STEP 3: WHAT'S BLOCKED VS WHAT'S NOT ====

Heavy planning artifacts (PRD, RTM, Sprint Plan) are blocked
on Shaik (pricing) + Asrar (BE responses). DO NOT start the
PRD until both come back.

But there's significant unblocked work that doesn't depend on
either response. The next-session focus should be one of:

**OPTION A — Stage 3: Claude operating layer (RECOMMENDED — highest leverage)**

Why: every future session benefits. Saves ~1 day of friction
across the full build.

What:
1. Replace the bloated `.claude/CLAUDE.md` at repo root —
   currently a "1M users, 99.99% uptime, enterprise architecture"
   template that doesn't fit our 6-week MVP. Replace with a lean
   ~50-line file pointing at scope-locked.md.
2. Add slash commands:
   - `/check-scope` (compares current state to scope-locked.md;
     flags drift)
   - `/refresh-pdf` (re-runs docs/_context/tools/md_to_pdf.py
     for Charter + Pricing Memo)
   - `/run-kickoff` (fires the kickoff prompt)
3. Add sub-agents: scope-drift checker that can be invoked
   when reviewing PRs / commits.
4. Add a permissions allowlist in .claude/settings.json so
   common reads/edits don't prompt.

Estimated: ~2 hours total, partly parallelizable.

**OPTION B — Stage 1 small artifacts (low risk, completes the managerial layer)**

What:
1. Definition of Done (~30 min) — quality gates per feature,
   code review standards, deploy checklist
2. Standup Template (~20 min) — daily standup format
3. Test Plan skeleton (~45 min) — QA scope, test types,
   environments (full content can wait until after PRD)

Estimated: ~90 min combined.

**OPTION C — Stage 2 technical work (moderate ROI, partly blocked)**

1. Security spec (~60 min) — auth boundaries, OWASP top 10,
   secrets handling. Not blocked.
2. OpenAPI scaffold (~90 min) — derive from BE Zod validators
   if Asrar approves. Partly blocked.
3. DB migrations spec baseline (~60 min) — Prisma migration
   approach, naming, review process. Partly blocked.

**OPTION D — Sprint Zero workspace prep**

1. Create `apps/admin` workspace skeleton (lift from
   apps/web/src/app/admin/*)
2. Create `apps/mobile` workspace skeleton (Expo init)
3. FE/BE port + path reconciliation prep work

==== STEP 4: WAIT FOR DIRECTION ====

After reading the primers, REPLY with:

1. **Two-line read-back:** what you understand the project
   to be (1 sentence) and where we are (1 sentence).
2. **Confirm understanding** of the locked scope: Aadhaar
   gone, escrow gone, WhatsApp in v1, mobile expanded,
   pricing → Shaik. (One sentence.)
3. **Ask the user:** "Which option do you want to attack —
   A (Stage 3 / Claude layer), B (small Stage 1 templates),
   C (Stage 2 technical), D (workspace prep), or your own?"

Wait for the answer. Don't barrel into work.

==== HOUSE RULES ====

- Match my pace: when I'm terse and decisive, execute. When
  I'm asking exploratory questions, stay in dialogue.
- Don't drift from locked scope. If something I ask conflicts
  with D1–D7 or Q1–Q13 (revised 2026-05-09), push back
  before changing scope.
- One major artifact per session. Don't chain heavyweight
  docs in the same session.
- Update 02-scope-locked.md AND 04-project-status.md when
  you finish an artifact.
- PDF generation: docs/_context/tools/md_to_pdf.py — call as
  `python3 docs/_context/tools/md_to_pdf.py <input.md> <output.pdf>`

I'm Nazir Hasan (FE dev + acting PM + operational PO). The
Owner & Sponsor whose approval matters is Shaik Ishaq.
Today's date: use real current date — context window from
the previous session is closing. Go.
```

---

## After this session

This file (`04-next-session-resume.md`) is a one-time prompt for the immediate pickup. Once that session is done, fall back to `00-new-session-kickoff.md` for subsequent sessions — it's the durable entry point.

If you find yourself wanting another tailored "resume" prompt for a future hand-off, ask Claude to write a fresh one based on the latest `04-project-status.md` session log. Don't reuse this file as-is — its specifics will get stale.
