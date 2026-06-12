# Context Primers — Read This First

Compressed source-of-truth context for Claude Code sessions on **ProSiddhi** (the Job Portal). Reading these beats re-ingesting the Figma file, the full backend codebase, and weeks of planning chat.

## The three repos (standalone, siblings under `Prosiddhi/`)

| Repo | What it is |
|---|---|
| **prosiddhi-frontend** | the **portal** — seeker + employer web app (you are likely here) |
| **prosiddhi-admin** | the **admin** console (web-only, highest-privilege) |
| **prosiddhi-backend** | the **API engine** (Express 5 + Prisma) — the real API contract |

## Read in this order (new session)

1. **[01-product-summary.md](01-product-summary.md)** — what the product is, who uses it, key UX decisions.
2. **[02-scope-locked.md](02-scope-locked.md)** — locked decisions D1–D7 + Q1–Q13, v1 IN/OUT scope, risks. **The canonical scope.**
3. **[../managerial/08-ticket-reconciliation.md](../managerial/08-ticket-reconciliation.md)** — current status truth: what's done vs to-do (the board reconciled against the actual code).
4. **[../managerial/10-portal-execution-playbook.md](../managerial/10-portal-execution-playbook.md)** — the live execution tracker; what to build next, one ticket at a time.

For a guided start, run **`/run-kickoff`**.

## Deeper sources (read only when the task needs them)

| Need to know… | Source |
|---|---|
| Visual design of a screen | **Figma `Job-Portal`** — [design](https://www.figma.com/design/fzkZeIzkrU7MRLwunuYbTf/Job-Portal) · [mobile proto](https://www.figma.com/proto/fzkZeIzkrU7MRLwunuYbTf/Job-Portal?node-id=809-1687) (canonical; repo PDFs are snapshots) |
| Security / auth / data handling | [`../technical/security-spec.md`](../technical/security-spec.md) |
| Cross-team decision log | [`../technical/decisions-log.md`](../technical/decisions-log.md) |
| Industry / market research (Q7–Q13) | [`../technical/job-portal-research.md`](../technical/job-portal-research.md) |
| Deploy / infra (GCP) | [`../technical/devops-deployment-guide.md`](../technical/devops-deployment-guide.md) |
| Pricing (provisional Option B) | [`../managerial/03-pricing-decision-provisional.md`](../managerial/03-pricing-decision-provisional.md) |
| QA / test plan | [`../managerial/09-test-plan.md`](../managerial/09-test-plan.md) |
| BE data model | `prosiddhi-backend/prisma/schema.prisma` (sibling repo) |
| BE routes — the real API contract | `prosiddhi-backend/src/routes/*.routes.ts` (sibling repo) |
| FE API client | `src/lib/api.ts` (this repo) |

## Working agreement for new sessions

- **Don't drift from locked scope.** If you find yourself wanting to defer a v1 feature or add a v2 feature, push back on the user explicitly — don't silently change scope.
- **Update `02-scope-locked.md` immediately** when a locked decision changes, so the next session doesn't act on stale info.
- **Memory = cross-session preferences/feedback. Primers = project facts.** Don't conflate them.
