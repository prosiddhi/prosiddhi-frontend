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

## The development loop (per ticket)

1. **Plan** — `ticket-closer` (or `fe-auth-wirer` / `fe-specialist` for FE work) reads the PJP ticket, drafts a Template plan, and **STOPS for approval**.
2. **Build** — after "go", the doer implements in order (types → `api.ts` → context → component → page); type-check as it goes.
3. **Review — the pre-commit GATE** — `code-reviewer` runs: type-check + hygiene + **correctness + FE↔BE contract + wired-vs-mock + verification gap**. Branch as needed:
   - feature boundary moved → also `scope-drift-checker`
   - auth / payments / admin / OTP touched → also `security-reviewer`
   - Verdict must be **GREEN** (or YELLOW with written justification) before commit.
4. **Commit** — the **human** commits (conventional message, **no `Co-Authored-By: Claude`**).
5. **Close** — `ticket-closer` posts the Jira closure comment + transitions status (with confirmation).

`teacher` runs **out-of-band** any time — it's read-only and never blocks the loop.

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
2. **Deterministic hook (optional, opt-in).** For a gate that can't be forgotten, a `PreToolUse` hook on `git commit` can run `npm run type-check` and block on failure. Proposed config lives in this repo's `.claude/settings.json` review — enable when ready. (Hooks add a few seconds per commit; that's the trade for never shipping a broken build.)

## Maintenance

When you add / rename an agent or change what it does, update **three** places: its own `description:`, this file's roster + loop, and any `Handoffs` references in sibling agents. An agent that drifts from this map is an agent nobody trusts.
