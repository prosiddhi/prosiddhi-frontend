# Prompt 5 — Stage 3: Claude Operating Layer

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

This sets up the Claude harness for the rest of the build — lean root `CLAUDE.md`, slash commands, sub-agents, permissions allowlist. High leverage: every subsequent session inherits these.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/04-project-status.md
5. .claude/CLAUDE.md (the current one — it's the bloated
   "1M-user enterprise architecture" template we're
   replacing)

Your single task: configure the Claude Code operating
layer for the Job Portal FE monorepo. Specifically:

1. Replace .claude/CLAUDE.md with a lean ~60-line file
2. Create 3 slash commands under .claude/commands/
3. Create 1 sub-agent under .claude/agents/
4. Set up a permissions allowlist via the update-config skill

==== OUTPUT 1: lean .claude/CLAUDE.md ====

REPLACE the existing .claude/CLAUDE.md. Target ~60 lines.
Include:

- One-line project pitch (pull from 01-product-summary.md)
- Hard deadline (2026-06-15 QA handover)
- Team roster (Shaik Owner, Nazir PM/FE, Asrar BE, Dheeraj
  Mobile, Najeeb QA, Nayan Infra)
- The 5-stage plan with current state (Stage 1 mostly done,
  Stage 4 not started)
- "Always read primers first" rule with the 4-file list
- Locked scope summary (one line each):
  - Aadhaar removed entirely (Q3, Q4 revoked)
  - Escrow / platform-handled payments removed entirely
  - WhatsApp Business in v1 via MSG91
  - Mobile = seeker + employer parity (Dheeraj)
  - Pricing = PROVISIONAL Option B (₹999/mo employer, 14-day
    trial; worker free); awaiting Shaik's confirmation by
    2026-05-18
  - Application audio 2 min; chat audio 60s
  - Phone-OTP auth + Email/Google OAuth login
- "Do NOT mention" list (WebSockets, voice transcription,
  .ics calendar invites, Aadhaar)
- Pointer to docs/_context/prompts/ for saved session prompts
- One-line work agreement: "Propose then pause when scope
  unclear; execute when scope is locked; one major artifact
  per session."

DO NOT include the existing template's 1M-user
architecture, OWASP-compliance-mandatory, microservices
section — none of it applies. This is a 6-week MVP with
3 devs.

==== OUTPUT 2: slash commands under .claude/commands/ ====

Create these three files. Each is a single .md with YAML
frontmatter (description) and a prompt body.

a) .claude/commands/check-scope.md
   Description: "Compare current work-in-progress against
   docs/_context/02-scope-locked.md and flag any drift."
   Body: instructs Claude to: read 02-scope-locked.md,
   read git status, read any modified files in the diff,
   identify anything that contradicts locked scope (Aadhaar
   re-introduction, escrow code, WebSocket usage, etc.),
   report findings in a short list.

b) .claude/commands/refresh-pdf.md
   Description: "Regenerate the Charter and Pricing Memo
   PDFs from current markdown."
   Body: instructs Claude to run:
   `python3 docs/_context/tools/md_to_pdf.py docs/managerial/01-project-charter.md docs/managerial/01-project-charter.pdf`
   `python3 docs/_context/tools/md_to_pdf.py docs/managerial/03-pricing-decision-memo.md docs/managerial/03-pricing-decision-memo.pdf`
   and report the file sizes.

c) .claude/commands/run-kickoff.md
   Description: "Re-orient a confused session — load primers
   and report current stage."
   Body: instructs Claude to read the 4 primers in order
   (README.md, 01-product-summary.md, 02-scope-locked.md,
   04-project-status.md) and produce a two-line read-back
   plus the pending-work list from 04-project-status.md.

==== OUTPUT 3: sub-agent under .claude/agents/ ====

Create .claude/agents/scope-drift-checker.md.

Frontmatter:
- name: scope-drift-checker
- description: "Use when reviewing a proposed change or PR
  to verify it doesn't introduce scope drift from
  02-scope-locked.md. Reports drift findings with line/file
  references."
- tools: Read, Grep, Glob, Bash (for git diff)

Body (the agent's system prompt): explain its job — check
if a diff or PR description re-introduces anything that
was scrubbed (Aadhaar, escrow, WebSockets, voice
transcription, .ics invites), or adds features that aren't
in 02-scope-locked.md's IN list. Output format: list of
findings with "❌ DRIFT" or "✅ ALIGNED" per file changed,
plus a one-line summary at the end.

Keep the agent's system prompt under 80 lines.

==== OUTPUT 4: permissions allowlist ====

Use the `update-config` skill (it's listed in the harness's
available skills). Set up an allowlist in
.claude/settings.local.json so common read-only operations
don't prompt:

- Bash: allow git status, git diff, git log, ls, cat,
  python3 docs/_context/tools/md_to_pdf.py, wc, find (with
  ./ prefix), grep, pdfinfo
- Read: allow everything in the repo
- Write/Edit: keep prompting (we don't want silent edits)

Do NOT use --dangerously-skip-permissions or any blanket
allowance. Per-tool, per-command allowlist only.

==== CONSTRAINTS ====

- Do NOT modify .claude/settings.json (the shared one) —
  only settings.local.json. Per the harness, settings.json
  is checked in and shared; settings.local.json is local.
- Do NOT introduce hooks in this session — that's a separate
  pass. Just slash commands, agent, permissions, CLAUDE.md.
- Do NOT add Anthropic API keys or any secrets to settings
  files.
- After saving, report a 5-line chat summary:
  - .claude/CLAUDE.md replaced (line count before/after)
  - 3 slash commands created (filenames)
  - 1 sub-agent created (filename)
  - Permissions allowlist updated (count of tool patterns)
  - One sanity-check item: invoke /run-kickoff in chat and
    verify it loads the primers
- Estimated time: ~90 min

Today's date: use real current date. User: Nazir Hasan.
Owner & Sponsor: Shaik Ishaq.
```

---

## After this session

Test the setup in a separate fresh session by typing `/run-kickoff` — it should auto-load primers and orient. If it doesn't, the slash command file format is wrong and needs fixing.

Once Stage 3 is verified working, future sessions become much faster — `/check-scope` before commits, `/refresh-pdf` after Charter or Pricing Memo edits, sub-agent for PR review.
