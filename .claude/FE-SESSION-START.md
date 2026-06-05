# FE Session Start — paste the block below

Open a Claude Code session **rooted in `prosiddhi-frontend/`** (so the FE agents + FE `CLAUDE.md` + the FE memory namespace auto-load and git works natively), then paste this as your first message:

---

```
FE ticket-closing session. I'm Nazir (FE + acting PM), FE-only today.

This is the standalone FE repo (extracted from the old job-portal-fe monorepo; repo root
IS the app root — plain npm, no pnpm/workspace). BE is a separate repo (prosiddhi-backend).

Auto-loaded memory should cover: jira-connection (cloudId for MCP), jira-project-pjp
(PJP, project 10033; Asrar=BE also uses Claude Code), repo-structure + label convention,
local-run-setup, feedback-pointer-prompts, claude-setup-artifacts, plus the FE primers
(locked scope, team/timeline, decisions). If any are missing, read them from the memory folder.

Agents available here: fe-specialist, fe-auth-wirer, scope-drift-checker (FE), plus shared
agents code-reviewer, security-reviewer, teacher, ticket-closer. Use them.

GOAL: close as many FE Sprint 1/2 tickets as we realistically can today, biased to the
auth-foundation chain first. The audit is at docs/audit/sprint-audit-raw.json — verified
fresh as of 2026-06-01 (file/line refs in it still use the old apps/web/ paths → they are
now just src/...). Read the ticket's audit entry before planning.

ATTACK ORDER (each unlocks the next — fe-auth-wirer owns the chain):
  1. PJP-77  — api.ts fallback :8080→:5000, fix .env.example (:3001→:5000), add README dev note   (~30m, no dep)
  2. PJP-78  — path renames /job-seeker/*→/api/jobseekers/*, /employer/*→/api/employers/*, /api prefix on admin+jobs  (needs 77)
  3. PJP-79  — AuthContext + AuthProvider + Bearer interceptor in api.ts + 401→logout; centralize scattered localStorage  (needs 77,78)
  4. PJP-81 (slice) — remove plaintext password from localStorage in src/app/employer/register/account/page.tsx:28 — SECURITY fix only  (independent)
  5. PJP-80 / PJP-82 (partials) — ProtectedRoute + role redirects + login wiring MINUS Google OAuth (blocked on S1-04)  (needs 79)
  6. PJP-86  — WhatsApp templates doc, pure drafting, fully closeable  (parallelizable; ticket-closer)

RULES:
  • Plan-first on every ticket: have fe-auth-wirer / fe-specialist draft the Phase-1 plan and
    WAIT for my "go" before any code. No silent additions.
  • Type-check gate before "done": from the repo root run `npm run type-check` (exit 0).
  • Use the api.ts client, never raw fetch. Stay in locked scope (no WebSockets/transcription/.ics/Aadhaar).
  • BE is Asrar's separate repo (prosiddhi-backend); don't edit it. Flag any FE↔BE contract change for him.
  • ⚠️ PARKED (awaiting Shaik, no confirmation as of 2026-06-01): root .claude/CLAUDE.md says
    "Seeker = ₹50 lifetime Elite" but FE scope says "worker free forever." Do NOT code anything
    pricing-adjacent until the ruling lands; don't re-raise it as open — it's blocked on Shaik.

Start by having fe-auth-wirer fetch PJP-77 from Jira and draft its Phase-1 plan. Stop at the gate.
```

---

## Why this is set up the way it is
- **Rooted in `prosiddhi-frontend/`** so: (a) the FE agents auto-discover, (b) the FE `CLAUDE.md` (locked scope) auto-loads, (c) `git` works (this repo is its own git repo → `github.com/prosiddhi/prosiddhi-frontend`).
- **Standalone repo:** extracted from the old `job-portal-fe` monorepo on 2026-06-05. Repo root is the app root; plain `npm` (no pnpm/workspace). Build: `npm run build`. Type-check: `npm run type-check`.
- **Agents:** `fe-specialist`, `fe-auth-wirer`, `scope-drift-checker` + shared `code-reviewer`, `security-reviewer`, `teacher`, `ticket-closer` live in `.claude/agents/`.
- **Audit at `docs/audit/sprint-audit-raw.json`** — its file/line references predate the extraction, so `apps/web/src/...` in it now maps to `src/...`.
