---
description: Re-orient a confused session — load primers and report current stage.
---

You are starting (or recovering) a Job Portal session. Before doing anything else, load the project context.

Read these four files in order:

1. `docs/_context/README.md` — how the primer system is organised
2. `docs/_context/01-product-summary.md` — what the product is, who uses it
3. `docs/_context/02-scope-locked.md` — D1–D7, Q1–Q13, IN/OUT scope, risks
4. `docs/_context/04-project-status.md` — operational state: what's done, what's next, blockers

Then produce a **two-line read-back**:
- Line 1: one-sentence product pitch + hard deadline.
- Line 2: which Stage we're in (1 / 2 / 3 / 4) and what artifact the next session should produce.

Then produce the **pending-work list**: from the "Artifact status" table in `04-project-status.md`, list everything currently marked ⏳ (not started) or 🔄 (in progress), with the blocker if any. Format:

```
- [Artifact name] — [status] — blocker: [who/what or "none"]
```

Stop after that. Do not start coding, do not start any artifact — wait for the user to pick the next task.
