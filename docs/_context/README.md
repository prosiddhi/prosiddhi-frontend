# Context Primers — Read This First

This folder holds **compressed source-of-truth context** for new Claude Code sessions working on the Job Portal project. Reading these saves you from re-ingesting the 64-page UX PDF, full BE codebase, and weeks of planning conversation.

## Starting a new Claude Code session?

**Use the kickoff prompt:** copy [`prompts/00-new-session-kickoff.md`](prompts/00-new-session-kickoff.md) into any fresh Claude Code session. It loads the primers + status, orients to where we are, and asks what to work on — without committing to a specific artifact. Takes ~3 min and ~30K tokens.

If you already know exactly which artifact you want produced, skip the kickoff and use the matching task prompt directly (see [`prompts/README.md`](prompts/README.md)).

## If you are a new Claude session, read in this order

1. **[01-product-summary.md](01-product-summary.md)** — what the product is, who uses it, the 12 flows, key UX decisions (~2 pages)
2. **[02-scope-locked.md](02-scope-locked.md)** — locked decisions D1–D7 + Q1–Q13, v1 IN/OUT scope, BE/FE/Mobile state, open questions, risks (~3 pages)
3. **[04-project-status.md](04-project-status.md)** — operational state: what's done, what's next, which prompt to fire when, daily-tracking dependencies (~2 pages)

After those three, you should know enough to start any drafting/coding task. Saved session prompts (run in fresh sessions) live in [`prompts/`](prompts/). Read deeper sources only when the task requires them:

| Need to know... | Authoritative source |
|---|---|
| Visual design of any screen | **Figma file `Job-Portal`** — [Design view](https://www.figma.com/design/fzkZeIzkrU7MRLwunuYbTf/Job-Portal) · [Mobile prototype](https://www.figma.com/proto/fzkZeIzkrU7MRLwunuYbTf/Job-Portal?node-id=809-1687). PDFs (`Job Portal.pdf` web + `Job_Portal_Mobile.pdf` mobile) are May-2026 snapshots, not source of truth. |
| v1 business flows (locked) | [`02-scope-locked.md`](02-scope-locked.md) — superseded the pre-lock prose + mermaid docs (now in [`docs/archive/superseded/`](../archive/superseded/) for v2 reference only; they contain v2 features and a 9-month plan that conflict with locked v1) |
| BE data model | `../job-portal-backend-azka/prisma/schema.prisma` |
| BE API surface | `../job-portal-backend-azka/API_DOCUMENTATION.md` |
| BE app entry / route registration | `../job-portal-backend-azka/src/index.ts` |
| FE current API client | `apps/web/src/lib/api.ts` (note: paths/ports diverge from BE — see scope-locked.md) |
| Job category seed data | `documents/INPUT-FILES/Group_*_Job_Designations.xlsx` (11 spreadsheets) |
| Decision log on BE | inline tags in BE code: `Q##`, `NC-##`, `T##` referencing dated decisions |
| Industry research with citations | [`docs/technical/job-portal-research.md`](../technical/job-portal-research.md) — read when working on a research-driven decision (Q7–Q13) |
| Per-file BE+FE audit + decision tag map | [`03-codebase-audit.md`](03-codebase-audit.md) — read when wiring a specific endpoint or arguing whether a feature is "really built" |

## Working agreement for new sessions

- **Don't drift from locked scope.** If you find yourself wanting to defer a v1 feature or add a v2 feature, push back on the user explicitly — don't silently change scope.
- **Pace yourself.** Producing one major artifact per session keeps context fresh. Don't chain multiple heavyweight docs in one session.
- **Update primers when reality changes.** If a locked decision is overridden mid-project, update `02-scope-locked.md` immediately so the next session doesn't act on stale info.
- **Memory is for cross-session preferences and feedback. Primers are for project facts.** Don't conflate them.
