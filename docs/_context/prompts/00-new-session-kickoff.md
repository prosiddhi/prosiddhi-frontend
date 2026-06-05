# Prompt 0 — New Session Kickoff

**Use this prompt every time you open a fresh Claude Code session for this project.** It loads the primers, orients the session to where we are, and asks what to work on — without pre-committing to a specific artifact.

Open Claude Code in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

---

```
You are joining the Azkashine Job Portal project mid-stream.
Multi-month effort, hard QA handover deadline 2026-06-15.
The project has compressed context in docs/_context/ — read
it before doing ANYTHING.

==== STEP 1: READ PRIMERS (in this order) ====

1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/04-project-status.md

DO NOT read the 64-page UX PDF, the 55-page mobile design
PDF, the BE codebase, or chat history. The primers replace
those — they're ~30K tokens of compressed truth, vs ~250K
tokens of naive re-discovery.

==== STEP 2: ORIENT ====

The project is in PLANNING PHASE. Confirm what's locked
vs what's pending by reading 04-project-status.md.

Major scope revision was applied 2026-05-09:
- Aadhaar removed entirely (not v1, not v2 either)
- Escrow / platform-handled payments removed entirely
  (revenue is subscription-only)
- WhatsApp Business added to v1 (Shaik Ishaq runs Meta
  verification process; MSG91 is BSP)
- Mobile expanded to full seeker + employer parity
  (Dheeraj is the dedicated mobile dev)
- Pricing pending Owner Shaik Ishaq's decision (Pricing
  Memo at docs/managerial/03-pricing-decision-memo.md
  presents 3 options; deadline 2026-05-18)
- Application audio cap: 2 minutes (standard web + mobile)
- Auth: phone OTP only at registration; Email + Google
  OAuth as alternative login methods

DO NOT discuss WebSockets, voice transcription, or .ics
calendar invites — these were scrubbed entirely from the
doc. Don't propose adding them back.

Five-stage plan (read 04-project-status.md for live status):
- Stage 0 — Discovery
- Stage 0.5 — Decision Locking (revised 2026-05-09)
- Stage 1 — Managerial artifacts (Charter ✅, BE sync ✅,
  Pricing Memo ✅, PRD pending, RTM, Sprint Plan, DoD,
  Standup, Test Plan)
- Stage 2 — Technical layer (OpenAPI contract, DB
  migrations spec, security spec). Aadhaar Research Doc
  CANCELLED.
- Stage 3 — Claude operating layer (lean root CLAUDE.md
  per repo, sub-agents, slash commands, hooks)
- Stage 4 — Execution / Sprint backlog (CODING starts here)

**Coding has NOT started yet.** Don't try to "help" by
scaffolding apps/admin or apps/mobile unless I explicitly
ask. Don't start FE/BE reconciliation work. Don't write
code at all unless the next action explicitly requires it.

==== STEP 3: WAIT FOR DIRECTION ====

After reading the primers, REPLY with:

1. **Two-line read-back** — what you understand the project
   to be (1 sentence) and what stage we're in (1 sentence).
2. **Pending work list** — copy the artifact-status table
   from 04-project-status.md, just the rows marked 🔄 or ⏳.
3. **Critical external dependencies** — copy the list from
   04-project-status.md.
4. **Your question to me:** "What do you want to work on
   today?"

Common next actions I might choose:

- Run a saved prompt from docs/_context/prompts/ for a
  specific artifact:
  - 02-be-sync-agenda.md (regenerate BE sync if scope
    changed since last refresh)
  - 03-prd-v1.md (v1 PRD generation — the big one;
    requires Shaik's pricing decision first)
- Reconcile feedback from Shaik (Owner) or Asrar (BE)
  into the primers (update 02-scope-locked.md + Charter
  + maybe Pricing Memo)
- Generate a future Stage 1 artifact — RTM, Sprint Plan
  + S1 backlog, DoD, Standup template, Test Plan. (You
  don't have prompts for these yet; ask me to write the
  prompt first.)
- Start Stage 2 — OpenAPI contract, DB migrations spec,
  security spec
- Start Stage 3 — sub-CLAUDE.md per app, sub-agents,
  slash commands, hooks, permissions allowlist
- Update docs based on a real-world event (e.g. Shaik's
  pricing decision arrives, Asrar response, Razorpay/MSG91
  status change)
- Regenerate PDFs after Charter or Pricing Memo edits
  (script at /tmp/md_to_pdf.py)

Wait for my answer before producing anything. Don't barrel
into a task — propose, then pause.

==== HOUSE RULES (from previous sessions, in memory) ====

- Match my pace: when I'm terse and decisive, execute. When
  I'm asking exploratory questions, stay in dialogue.
- Don't drift from locked scope. If something I ask conflicts
  with D1–D7 or Q1–Q13 (revised 2026-05-09), push back
  before changing scope.
- One major artifact per session. Don't chain heavyweight
  docs in the same session — fresh sessions per artifact
  keep context clean and prevent hallucination.
- Update 02-scope-locked.md AND 04-project-status.md when
  you finish an artifact or learn something operationally
  important.

I'm Nazir Hasan (FE dev + acting PM + operational PO). The
Owner & Sponsor whose approval matters is Shaik Ishaq. Go.
```

---

## Why this prompt exists

Without a kickoff prompt, every new session either:
- Re-discovers context from raw sources (slow, expensive)
- Starts a task without confirming what stage we're in (risky — coding before scope is locked, etc.)
- Misses operational state (which dependencies are blocking, what's next)

This prompt costs ~30K tokens of read time, replaces ~250K of naive re-discovery, and ensures the session knows we're in planning — not coding.

## When to use a different prompt

- If you know exactly which artifact you want produced, skip this and use the matching task prompt directly (`02-be-sync-agenda.md`, `03-prd-v1.md`).
- This kickoff prompt is for: starting a session and not yet sure what you want to work on, OR returning after a long break, OR onboarding someone else.
