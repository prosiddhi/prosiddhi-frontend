# Saved Session Prompts

Each prompt is **self-contained** — it tells a fresh Claude Code session what to read, what to produce, and what NOT to do. Run each in a **new session** in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` (the project root).

## Which prompt to use

| Situation | Prompt |
|---|---|
| **Starting any new session and not yet sure what to work on** | [`00-new-session-kickoff.md`](00-new-session-kickoff.md) |
| **Returning after a break** or **onboarding a teammate** | [`00-new-session-kickoff.md`](00-new-session-kickoff.md) |
| **Already know exactly which artifact you want** | Skip 00, use the matching task prompt below |

## Task prompts (produce specific artifacts)

| # | File | When to run | Output | Estimated time |
|---|---|---|---|---|
| 0 | [`00-new-session-kickoff.md`](00-new-session-kickoff.md) | Wake up a fresh session and ask what to work on | (no artifact — orientation only) | ~3 min |
| 2 | [`02-be-sync-agenda.md`](02-be-sync-agenda.md) | Generate sync doc for Asrar; regenerate when scope changes | `docs/managerial/02-be-sync-agenda.md` | ~30 min |
| 3 | [`03-prd-v1.md`](03-prd-v1.md) | Generate v1 PRD from all locked decisions + Charter + Pricing + BE responses | `docs/managerial/04-prd-v1.md` | ~90 min |
| 4 | [`04-next-session-resume.md`](04-next-session-resume.md) | One-time resume prompt for 2026-05-09 evening pickup (NOW STALE — kept for history) | (orientation only) | — |
| 5 | [`05-stage3-claude-operating-layer.md`](05-stage3-claude-operating-layer.md) | Set up lean `CLAUDE.md` + slash commands + sub-agent + permissions allowlist | `.claude/CLAUDE.md` + `.claude/commands/*` + `.claude/agents/*` + `.claude/settings.local.json` | ~90 min |
| 6 | [`06-dod-and-standup.md`](06-dod-and-standup.md) | Definition of Done + Standup Template bundle | `docs/managerial/07-definition-of-done.md` + `08-standup-template.md` | ~45 min |
| 7 | [`07-test-plan-skeleton.md`](07-test-plan-skeleton.md) | Test Plan skeleton (Najeeb fills tooling later) | `docs/managerial/09-test-plan.md` | ~45 min |
| 8 | [`08-security-spec.md`](08-security-spec.md) | Project-specific security spec (OWASP + our auth stack) | `docs/technical/security-spec.md` | ~60 min |
| 9 | [`09-rtm-v1.md`](09-rtm-v1.md) | Requirements Traceability Matrix — derives from PRD | `docs/managerial/05-rtm-v1.md` | ~60 min |
| 10 | [`10-sprint-plan-s1-backlog.md`](10-sprint-plan-s1-backlog.md) | Sprint Plan + S1 Backlog — derives from PRD + RTM | `docs/managerial/06-sprint-plan.md` | ~90 min |
| 11 | [`11-prompts-review.md`](11-prompts-review.md) | Quality-control review of prompts 5–10 | `docs/_context/prompts-review.md` | ~45 min |

### Suggested firing order for 2026-05-11 (completing all docs today)

**Parallel-safe (fire in 4 separate sessions, no shared state):**
- Prompt 3 (PRD)
- Prompt 5 (Stage 3 / Claude operating layer)
- Prompt 6 (DoD + Standup)
- Prompt 8 (Security spec)

**Run after parallel batch:**
- Prompt 7 (Test Plan skeleton) — after PRD if you want it module-aware, OR in parallel as a skeleton
- Prompt 11 (Review of 5–10) — to catch issues before firing 9/10

**Run sequentially (each consumes the previous):**
- Prompt 9 (RTM) — needs PRD
- Prompt 10 (Sprint Plan) — needs PRD + RTM

**Recommended sequence:** Fire 3 + 5 + 6 + 8 in parallel windows now. While they run, fire 11 (review) on prompts 5–10 to catch issues. Once 3 (PRD) lands, fire 7 (test plan with module awareness), then 9 (RTM), then 10 (Sprint Plan).

(Note: `01-charter-summary.md` was deleted 2026-05-09 — the Charter at `docs/managerial/01-project-charter.md` is itself user-friendly now, so a separate sign-off summary is redundant. PDF generation script lives at `docs/_context/tools/md_to_pdf.py`.)

## Conventions inside every prompt

- **Single artifact per session.** Each prompt produces ONE file. Do NOT chain prompts in the same session.
- **Read primers first.** Every prompt begins with "Read these in order before anything else" — that loads the locked context cheaply.
- **Use Opus 4.7 1M context.** Model selection matters; larger context = less risk of hallucination on long reads.
- **Save outputs to disk; report a short chat summary.** The artifact is the deliverable, not the chat reply.

## Prompts beyond #3

When the PRD is approved, additional prompts will be generated:
- RTM scaffold
- Sprint Plan + S1 Backlog
- Definition of Done + Standup Template (parallelizable sub-agents)
- Test Plan

These are not yet saved — they will be added after PRD lock.

(Note: the `Aadhaar Integration Research Doc` task that was previously listed for v2 is **CANCELLED** — Aadhaar removed entirely from the product per Q4 revised 2026-05-09.)
