# FE Session Start — paste the block below

Open a Claude Code session **rooted in `prosiddhi-frontend/`** (so the FE agents + `CLAUDE.md` + the git/hook auto-load), then paste this as your first message:

---

```
Portal dev session. I'm Nazir (FE + acting PM).

Standalone PORTAL repo (prosiddhi-frontend — seeker + employer), separate from the admin
(prosiddhi-admin) and the backend (prosiddhi-backend) — siblings under c:\dev\Azkashine\Prosiddhi\.
Repo root IS the app root (plain npm).

Auto-loaded here:
  .claude/CLAUDE.md         — locked scope, conventions, team, do-NOT-mention list
  .claude/AGENT-WORKFLOW.md — agent roster + the dev loop + standing gates
  + the agents + a pre-commit type-check hook (active)
Commands: /run-kickoff (re-orient + pending-work list) · /check-scope (pre-commit drift audit)
Live tracker: docs/STATUS.md
Status truth: docs/STATUS.md
Backend: LIVE + seeded at the URL in .env.local (ephemeral tunnel — tell me if it 502s).
Jira: project PJP via the Atlassian MCP.

→ FIRST: run /run-kickoff to load state + give me the pending-work list, then wait for me to pick.

THE DEV LOOP (every ticket): Ticket → Plan → Execute → Explain → Close
  1. TICKET  — read PJP-XX from Jira; note ACs + the verified BE path (playbook "Wires to").
  2. PLAN    — fe-specialist / fe-auth-wirer / ticket-closer drafts a Template plan (B or D), then STOPS for my "go".
  3. EXECUTE — doer wires types → api.ts → context → component → page; type-check as it goes.
               GATE: code-reviewer GREEN; security-reviewer if auth/token/role; scope-drift-checker
               (or /check-scope) if a feature boundary moved.
  4. EXPLAIN — teacher (Mode D) walks me through the change-set high-level + tells me EXACTLY what to
               test in the browser. I confirm I understand before we close.
  5. CLOSE   — I commit (conventional msg, NO Co-Authored-By); ticket-closer posts the Jira closure +
               moves the ticket; tick the ticket in the playbook (the live handbook).

STATE: the auth foundation (AuthContext, ProtectedRoute, /login 3-method, api.ts rewrite) is COMMITTED
(69be6b0) but UNVERIFIED against the live BE.
  ⭐ STEP 0 — verify it before building on it: npm run dev → /login → log in as a seeker against the live
     BE; confirm token stored, a protected page loads, 401 bounces to /login. Fix first if broken.

ATTACK ORDER (per docs/STATUS.md):
  Stage 0 — board cleanup (auth 77/78/79/80/82 → Done w/ "integration-unverified" caveat; close dup
            tickets 132–137; confirm .env.local BE URL is live).
  Stage 1 — auth finish: PJP-81 (registration screens), PJP-142 (forgot/reset password).
  Stage 2 — seeker consume loop: PJP-138 feed → 139 details → 140 saved → 141 my-applications →
            103 apply(2-min audio) → 113 contact-gate.
  Stage 3 — employer: PJP-143 dashboard → 106 job posting → 104 candidate management.
  Stage 4 — shared: PJP-105 chat → 112 profile → 109 i18n.

RULES (full set in .claude/AGENT-WORKFLOW.md + CLAUDE.md):
  • Plan-first, WAIT for my "go". • api.ts client, never raw fetch. • type-check exit 0 (hook enforces).
  • code-reviewer before every commit; security-reviewer for anything auth/token/role.
  • Confirm every api.ts path against ../prosiddhi-backend/src/routes/*.routes.ts. Don't edit the BE.
  • Stay in locked scope (no WebSockets / transcription / .ics / Aadhaar). Tick the playbook on close.
```

---

# Teacher / Explainer session — paste into a SECOND portal window

Open another session **rooted in `prosiddhi-frontend/`**, then paste:

```
Portal teacher session — I'm Nazir (FE+PM), learning as we build. Use the teacher agent.

As code gets wired in my execution session, I'll ask you to walk me through it — Mode A (one file) or
Mode D (a whole change-set / git diff), high-level first, analogies, with a check-for-understanding.
Read the ACTUAL files (git diff / the page), never guess; be honest about committed vs unverified vs
still-mock.

AFTER explaining a wired piece, tell me EXACTLY what to manually test in the browser to verify it:
which URL, what to click, what success vs failure looks like — e.g. the job feed at
http://localhost:3000/job-feed against the live BE. Start by asking me which piece I want explained.
```

## Running the portal app locally (for your manual testing)
```
cd c:\dev\Azkashine\Prosiddhi\prosiddhi-frontend
npm run dev
```
- Opens on **http://localhost:3000** (admin lands on :3001 if you run both — Next prints the real URL).
- Reads `.env.local` at startup (points at the live tunnel) — **restart** if that file changes.
- Hot-reloads on code changes. Login needs a real account — ask Asrar for seeded seeker/employer creds, or
  register via `/register` (phone-OTP path; dev mode returns the OTP in the API response, no real SMS).
