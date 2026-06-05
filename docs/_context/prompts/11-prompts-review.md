# Prompt 11 — Review the Six New Prompts (05–10)

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

This is a quality-control pass on the six prompts drafted in batch on 2026-05-11. The drafter (a previous session) was honest that some risks exist: hallucinated specifics, scope drift, missing details, redundancy. Your job is to find and flag those, so Nazir can fix before firing the prompts.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md  (CANONICAL scope)
4. docs/_context/03-codebase-audit.md
5. docs/_context/04-project-status.md
6. docs/technical/job-portal-research.md
7. docs/managerial/01-project-charter.md
8. docs/managerial/02-be-sync-agenda.md
9. docs/managerial/03-pricing-decision-memo.md
10. docs/managerial/03-pricing-decision-provisional.md

Then read the six prompts under review:

A. docs/_context/prompts/05-stage3-claude-operating-layer.md
B. docs/_context/prompts/06-dod-and-standup.md
C. docs/_context/prompts/07-test-plan-skeleton.md
D. docs/_context/prompts/08-security-spec.md
E. docs/_context/prompts/09-rtm-v1.md
F. docs/_context/prompts/10-sprint-plan-s1-backlog.md

Your single task: produce a review document identifying
problems in each prompt so Nazir can decide whether to fix
before firing or accept-as-is.

==== OUTPUT ====

CREATE docs/_context/prompts-review.md (~150–250 lines).

Structure:

## Header
- Title, date, reviewer (Claude Code session N), scope
  (the 6 prompts listed above).

## TL;DR
- 3–5 lines: are these prompts safe to fire as-is? Which
  ones need the most work? Which are fine?

## Review framework

For each prompt (A through F), use this checklist:

### Prompt X — [name]

**1. Hallucination risk** — does the prompt prescribe
specific facts, file paths, library names, or commands
that contradict the primers or aren't verifiable?
List each suspect claim with:
- Where in the prompt (line / section)
- Why suspect
- What it should say instead (or "verify with Nazir")

**2. Scope drift risk** — does the prompt encourage the
future session to do work outside locked scope, or contradict
something in 02-scope-locked.md?
List each potential drift with:
- Where in the prompt
- Which scope decision it conflicts with (D1–D7, Q1–Q13)
- Recommended fix

**3. Missing details** — is anything a future session
would NEED that this prompt doesn't provide?
List each gap with:
- What's missing
- Where it would land in the prompt
- Suggested addition

**4. Redundancy / verbosity** — is anything overstated,
duplicated, or padded?
List each redundancy with:
- Where
- Suggested cut

**5. Output-format adequacy** — will the output file
structure (sections, tables, length budgets) work? Is the
expected length realistic? Are the constraints clear
enough to prevent the session from going off-rails?

**6. Severity** — for this prompt, rate:
- 🟢 Fire as-is
- 🟡 Minor fixes needed (Nazir spends 5 min editing)
- 🟠 Moderate fixes needed (15–30 min editing)
- 🔴 Major rewrite needed before firing

## Cross-prompt issues

After per-prompt review, identify issues that span multiple
prompts:
- Inconsistent assumptions (e.g., one says X, another says ~X)
- Conflicting outputs (e.g., two prompts trying to write the
  same file)
- Sequencing problems (e.g., prompt N depends on prompt M
  but M's output doesn't actually provide what N needs)

## Recommended firing order

Based on the review, recommend the order Nazir should fire
the prompts. Include:
- Which can run in parallel (different sessions, no shared
  state)
- Which must run sequentially (one's output feeds the next)
- Which to fix before firing
- Which to defer

## Final verdict

One paragraph: net assessment of whether this prompt batch
is fit-for-purpose for completing all Stage 1–3 docs today
(2026-05-11) as Nazir wanted.

==== REVIEW STANDARDS ====

- Be specific, not generic. "This prompt seems vague" is
  not useful; "Prompt C line 47 says 'Najeeb to decide
  tooling' but doesn't say BY WHEN — should add deadline"
  IS useful.
- Anchor every finding in a primer or canonical doc. If a
  prompt claim contradicts 02-scope-locked.md, cite the
  D-tag or Q-tag.
- Be calibrated. Don't flag everything as 🔴 — most prompts
  are probably 🟢 or 🟡. The drafter knows the patterns.
- Be honest about uncertainty. If you're not sure whether
  something is a hallucination or just unfamiliar to you,
  flag it as "VERIFY" not "WRONG".
- Don't rewrite the prompts — you're reviewing, not
  redrafting. Recommend changes; Nazir applies them (or
  asks a fresh session to apply).

==== KNOWN AREAS THE DRAFTER FLAGGED AS RISK ====

The drafter said the following spots are the most likely
problem areas — start your scrutiny here:

- **Prompt A (Stage 3):** YAML / file format details for
  slash commands and sub-agents — Claude Code syntax may
  not match what the drafter remembered.
- **Prompt C (Test Plan):** specific framework
  recommendations beyond what Najeeb has actually picked.
- **Prompt D (Security spec):** generic OWASP boilerplate
  vs project-anchored detail. Should be project-anchored.
- **Prompt E (RTM):** depends on PRD's exact module
  numbering. If PRD M-numbering differs, RTM won't trace
  correctly.
- **Prompt F (Sprint Plan):** dev-day capacity math (10
  per 2-week sprint per person) — verify with Asrar's
  BE sync responses if available.

==== CONSTRAINTS ====

- Do NOT modify the six prompts under review.
- Do NOT generate any artifact other than the review doc.
- ~150–250 lines.
- After saving, report 4-line chat summary:
  - File path
  - Severity breakdown (X 🟢 / Y 🟡 / Z 🟠 / W 🔴)
  - Top 3 issues that, if unaddressed, will cause the
    downstream artifact to be wrong
  - Recommendation: fire as-is, fix-then-fire, or major
    rework

Today's date: use real current date. User: Nazir Hasan.
Owner & Sponsor: Shaik Ishaq.
```

---

## After this session

Read the review doc top-to-bottom. For each 🟠 or 🔴, decide whether to fix or accept-as-is. Small (🟡) fixes can be done inline with Edit; larger fixes warrant a fresh session to rewrite the affected prompt.

The review's "Recommended firing order" should be the operational guide for the rest of today.
