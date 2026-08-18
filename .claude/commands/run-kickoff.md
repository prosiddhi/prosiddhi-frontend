---
description: Re-orient a confused session — load primers and report current stage.
---

You are starting (or recovering) a Job Portal session. Before doing anything else, load the project context.

Read these files in order:

1. `docs/STATUS.md` — the source of truth. **`§0` is the whole answer to "what is done, what is left" for all four surfaces**; `§3` has the detail in priority order and `§4` is the known-bug list.
2. `docs/PRODUCT.md` — product summary + canonical locked scope (D1–D7, Q1–Q13, IN/OUT, risks).
3. `docs/qa/defect-log.csv` — the live defect register, if the session is a bug pass.

Then produce a **two-line read-back**:
- Line 1: one-sentence product pitch + where the product is live.
- Line 2: the state of the surface this session is about, and the single most important open item on it.

Then produce the **pending-work list** from `docs/STATUS.md` §0 and §3 — the open items in priority order, one line each:

```
- [what it delivers] — where it's tracked (§3 item / DEF-xxx / PJP-xxx) — blocker: [who/what or "none"]
```

⚠️ **JIRA is stale** (§7) — do not rebuild this list from the board. And do not report a §3 item as open without checking it against the code first; several have been fixed and left marked open.

Stop after that. Do not start coding — wait for the user to pick the next piece of work.
