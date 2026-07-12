# Agent Workflow — ProSiddhi Frontend

The canonical map of **when each gate fires**. Some gates are sub-agents (`.claude/agents/`); the two review gates are **slash-command skills** (`/code-review`, `/security-review`). The main Claude session reads this map + each agent's `description:` and delegates accordingly. Keep this in sync when agents change.

> **Reality note (2026-06-15):** Only `fe-auth-wirer`, `fe-specialist`, and `scope-drift-checker` are reliably available as spawnable sub-agents this environment. The legacy `code-reviewer` / `security-reviewer` / `ticket-closer` / `teacher` agent files are **not registered as sub-agents** — so:
> - **Review gates run via the `/code-review` and `/security-review` SKILLS** (not the `code-reviewer`/`security-reviewer` agents).
> - **Ticket-closer work** (implement + Jira close) is done by the **main session directly**.
> - **Explain** is done inline by the main session (or the `claude`/`general-purpose` agent), not a `teacher` agent.

## The roster

| Gate | Role | Invoke when | Mode |
|---|---|---|---|
| main session | Main worker — implement + Jira close + playbook tick | "close / work on / implement PJP-XX" | edit + Jira |
| **fe-auth-wirer** | Auth-foundation specialist (PJP-77→82) | auth / login / token / guards work | sub-agent (edit) |
| **fe-specialist** | General FE pages, components, `api.ts` | any non-auth FE ticket | sub-agent (edit) |
| **scope-drift-checker** | Drift gate vs `docs/PRODUCT.md` | a feature boundary moved | sub-agent (read-only) |
| **`/code-review`** | Pre-commit gate: correctness + FE↔BE contract + wired-vs-mock | **BEFORE every commit** | skill |
| **`/security-review`** | Security pass | after auth / payments / admin / OTP changes; pre-freeze | skill |
| inline explain | Change-set walkthrough + manual-test script | after the gate, before/at close | main session |

## The development loop (per ticket): **Ticket → Plan → Execute → Explain → Close**

1. **Ticket** — read the PJP ticket (Jira) + its "Wires to" endpoint in [`docs/STATUS.md`](../docs/STATUS.md). Confirm the BE path against `../prosiddhi-backend/src/routes/*.routes.ts`.
2. **Plan** — draft a Template plan, post it as a Jira comment, and **STOP for the user's "go"** *unless* the user has given a standing "work the queue / complete all tickets" — then proceed without pausing per-ticket.
3. **Execute** — implement (types → `api.ts` → context → component → page); type-check as you go.
4. **Review — the pre-commit GATE** — run **`/code-review`** (correctness + FE↔BE contract + wired-vs-mock); run **`/security-review`** if auth/token/role/OTP touched; spawn **`scope-drift-checker`** if a feature boundary moved. Fix everything HIGH/MEDIUM before committing. (When the named skills are unavailable, approximate with `general-purpose` finder + verifier agents.)
5. **Explain** — inline: walk the user through the change-set **high-level first**, then tell them **exactly what to manually test** (which URL, what to click, success vs failure).
6. **Commit** — **Claude commits** per ticket: conventional message, reference the PJP ticket, **NO `Co-Authored-By: Claude` trailer** (project override of the harness default, locked 2026-06-15). The pre-commit hook re-runs type-check.
7. **Close** — post the Jira closure comment + transition status (with confirmation), and **tick the ticket in `docs/STATUS.md`** once it's truly Done (live-smoke-verified, not just code-complete).

## Standing gates (non-negotiable before a commit)

- ✅ `npm run type-check` exits 0
- ✅ **`/code-review`** clean (no unaddressed HIGH/MEDIUM) — incl. **FE↔BE contract OK** and **not-still-mock**
- ✅ `scope-drift-checker` clean if a feature boundary moved
- ✅ **`/security-review`** clean if auth / payments / admin / OTP touched
- ✅ commit message: **no `Co-Authored-By: Claude` trailer**, no secrets, no person-names, no stray `console.log`

## Handoff graph

```
  main session (+ fe-auth-wirer / fe-specialist)   (doers — build)
                      │  build done
                      ▼
                /code-review  ──(feature boundary)──▶ scope-drift-checker
                      │
                      ├────────(auth/pay/admin/OTP)──▶ /security-review
                      ▼
                Claude commits (no Co-Authored-By)
                      ▼
              main session  (Jira close + status + playbook tick)

  inline explain  ⟂  walk the user through the change-set + manual-test script
```

## How the "wiring" actually works

Two mechanisms, in order of reliability:

1. **Discipline-driven gating (primary).** The main session runs the GATE before every commit — `/code-review` always, `/security-review` for auth/OTP/token, `scope-drift-checker` on boundary moves. This is enforced by the standing rule in memory (`feedback-full-review-gate`), because skipping it once already shipped real contract bugs. Treat it as non-optional, not "auto-invoked."
2. **Deterministic hook (ACTIVE).** A `PreToolUse` hook on `git commit` runs `npm run type-check` and blocks on failure — the one gate that can't be forgotten. Config in `.claude/settings.json` (committed). A few seconds per commit; the trade for never committing a broken build.

## Maintenance

When you add / rename an agent or change what it does, update **three** places: its own `description:`, this file's roster + loop, and any `Handoffs` references in sibling agents. An agent that drifts from this map is an agent nobody trusts.
