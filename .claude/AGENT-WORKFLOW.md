# Agent Workflow — ProSiddhi Frontend

The canonical map of **when each agent fires**. Agents live in `.claude/agents/`. The main Claude session reads their `description:` fields **plus this map** and delegates accordingly. Keep this in sync when agents change.

## The roster

| Agent | Role | Invoke when | Mode |
|---|---|---|---|
| **ticket-closer** | Main worker — end-to-end ticket closure | "close / work on / implement PJP-XX" | edit + Jira |
| **fe-auth-wirer** | Auth-foundation specialist (PJP-77→82) | auth / login / token / guards work | edit |
| **fe-specialist** | General FE pages, components, `api.ts` | any non-auth FE ticket | edit |
| **scope-drift-checker** | Drift gate vs `docs/_context/02-scope-locked.md` | a feature boundary moved | read-only |
| **code-reviewer** | Pre-commit gate: hygiene **+ correctness + FE↔BE contract** | **BEFORE every commit** | read-only |
| **security-reviewer** | Paranoid security pass | after auth / payments / admin / OTP changes; pre-freeze | read-only |
| **teacher** | Explainer — code / concept / **change-set (Mode D)** | "explain / walk me through / what is X" | read-only + web |

## The development loop (per ticket): **Ticket → Plan → Execute → Explain → Close**

1. **Ticket** — read the PJP ticket (Jira) + its "Wires to" endpoint in [`docs/execution-playbook.md`](../docs/execution-playbook.md). Confirm the BE path against `../prosiddhi-backend/src/routes/*.routes.ts`.
2. **Plan** — `ticket-closer` (or `fe-auth-wirer` / `fe-specialist`) drafts a Template plan and **STOPS for the user's "go".**
3. **Execute** — after "go", the doer implements (types → `api.ts` → context → component → page); type-check as it goes.
4. **Review — the pre-commit GATE** — `code-reviewer` runs: type-check + hygiene + **correctness + FE↔BE contract + wired-vs-mock**. `security-reviewer` if auth/token/role touched; `scope-drift-checker` if a feature boundary moved. Verdict must be **GREEN** (or YELLOW with written justification).
5. **Explain** — `teacher` (Mode D) walks the user through the change-set **high-level first**, then tells them **exactly what to manually test** in the browser (which URL, what to click, success vs failure). The user confirms they understand before closing.
6. **Commit** — the **user** commits (conventional message, **no `Co-Authored-By: Claude`**); the pre-commit hook re-runs type-check.
7. **Close** — `ticket-closer` posts the Jira closure + transitions status (with confirmation), and **ticks the ticket in `docs/execution-playbook.md`** (the live handbook).

`teacher` can also run **out-of-band** any time — it's read-only and never blocks the loop.

## Standing gates (non-negotiable before a commit)

- ✅ `npm run type-check` exits 0
- ✅ `code-reviewer` verdict GREEN (or YELLOW justified) — incl. **FE↔BE contract OK** and **not-still-mock**
- ✅ `scope-drift-checker` clean if a feature boundary moved
- ✅ `security-reviewer` clean if auth / payments / admin / OTP touched
- ✅ no `Co-Authored-By: Claude`, no secrets, no person-names, no stray `console.log`

## Handoff graph

```
  fe-auth-wirer / fe-specialist / ticket-closer   (doers — build)
                      │  build done
                      ▼
                code-reviewer  ──(feature boundary)──▶ scope-drift-checker
                      │
                      ├────────(auth/pay/admin/OTP)──▶ security-reviewer
                      ▼
                 human commits
                      ▼
              ticket-closer  (Jira close + status)

  teacher  ⟂  orthogonal — invoke any time to understand, never gates
```

## How the "wiring" actually works

Two mechanisms, in order of reliability:

1. **Description-driven auto-invocation (primary).** The main session reads each agent's `description:` and proactively delegates — e.g. code-reviewer's description says *"Use BEFORE every commit"*, so the main session invokes it before committing. Keep every `description:` trigger-explicit; that *is* the wiring.
2. **Deterministic hook (ACTIVE).** A `PreToolUse` hook on `git commit` runs `npm run type-check` and blocks on failure — the one gate that can't be forgotten. Config in `.claude/settings.json` (committed). A few seconds per commit; the trade for never committing a broken build.

## Maintenance

When you add / rename an agent or change what it does, update **three** places: its own `description:`, this file's roster + loop, and any `Handoffs` references in sibling agents. An agent that drifts from this map is an agent nobody trusts.
