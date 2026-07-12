---
description: Re-orient a confused session — load primers and report current stage.
---

You are starting (or recovering) a Job Portal session. Before doing anything else, load the project context.

Read these two files in order:

1. `docs/PRODUCT.md` — product summary + canonical locked scope (D1–D7, Q1–Q13, IN/OUT, risks).
2. `docs/STATUS.md` — the live execution tracker (what's done / build next), with the status-reconciliation analysis as Appendix A.

Then produce a **two-line read-back**:
- Line 1: one-sentence product pitch + hard deadline.
- Line 2: where we are now (execution phase) + the next unchecked ticket(s) from the playbook.

Then produce the **pending-work list**: from `docs/STATUS.md`, list the next unchecked `[ ]` tickets in order (Stage 1 → 2 → 3), with any blocker noted. Format:

```
- [PJP-xxx] — [what it delivers] — blocker: [who/what or "none"]
```

Stop after that. Do not start coding — wait for the user to pick the next ticket.
