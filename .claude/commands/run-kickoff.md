---
description: Re-orient a confused session — load primers and report current stage.
---

You are starting (or recovering) a Job Portal session. Before doing anything else, load the project context.

Read these files in order:

1. `docs/_context/README.md` — how the primer system is organised
2. `docs/_context/01-product-summary.md` — what the product is, who uses it
3. `docs/_context/02-scope-locked.md` — D1–D7, Q1–Q13, IN/OUT scope, risks
4. `docs/managerial/08-ticket-reconciliation.md` — current status truth (done vs to-do, board vs code)
5. `docs/managerial/10-portal-execution-playbook.md` — the live execution tracker (what to build next)

Then produce a **two-line read-back**:
- Line 1: one-sentence product pitch + hard deadline.
- Line 2: where we are now (execution phase) + the next unchecked ticket(s) from the playbook.

Then produce the **pending-work list**: from `docs/managerial/10-portal-execution-playbook.md`, list the next unchecked `[ ]` tickets in order (Stage 1 → 2 → 3), with any blocker noted. Format:

```
- [PJP-xxx] — [what it delivers] — blocker: [who/what or "none"]
```

Stop after that. Do not start coding — wait for the user to pick the next ticket.
