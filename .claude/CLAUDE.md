# ProSiddhi Portal — Claude Operating Instructions

**This repo (`prosiddhi-frontend`) is the PORTAL** — the seeker + employer web app.
Siblings under `c:\dev\Azkashine\Prosiddhi\`: **`prosiddhi-backend`** (the API — Express 5 + Prisma), **`prosiddhi-admin`** (the admin console), and **`prosiddhi-mobile-app`** (Flutter, ~85% built).

## Read these first

1. **`docs/STATUS.md`** — ⭐ **what is done and what is left.** The single source of truth. **JIRA is stale — trust this instead.** *(This file you are reading now is a summary and goes stale faster than STATUS.md. Where the two disagree, STATUS.md wins.)*
2. **`docs/PRODUCT.md`** — what we're building, who for, and the locked rules (incl. what's permanently out of scope).
3. **`docs/MONETIZATION.md`** — the employer billing system: pricing rules, what's built, what's broken.
4. **`docs/DEPLOY.md`** — deploy + go-live.

**The defect list is `docs/qa/defect-log.csv`** — one register, 35 rows, the QA run plus what we found ourselves. *(The old `docs/qa/functional-audit-portal.md` was resolved and deleted; don't look for it.)* Admin's own list: `prosiddhi-admin/docs/qa/functional-audit-admin.md`.

## Where the product stands *(2026-08-18)*

**Live in production on HTTPS:** portal `https://prosiddhi.com` · API `https://api.prosiddhi.com` · admin `https://admin.prosiddhi.com`. Ports 3000/5000/3001 on the old IP are closed.

- **Backend** — feature-complete, incl. billing, SUPER_ADMIN + audit log, outbound email.
- **Portal** — feature-complete. All seeker + employer flows, chat, monetization, candidate database, team seats.
- **Admin console** — feature-complete. Nothing open but wiring up the invoice-PDF download.
- **Mobile (Flutter)** — **~85%**. Missing: checkout (blocked on decision **D2**), invoices, and **it has never run on a real device**.
- **10 languages ship on both clients** — en · hi · ta · kn · ml · mr · gu · or · te · bn.

What's left is in `STATUS.md` §3. Headline: the **QA defect pass** (see the register), **outbound notification config**, **mobile completion**, and **go-live config**.

## Hard rules

- **We now own the backend** *(changed 2026-07-12)*. We hold the `prosiddhi-backend` code and make BE changes ourselves — the old "never edit the backend" rule is **retired**. ⚠️ **Coordinate with Asrar before committing to it**, or you'll collide.
- **⛔ Audio is REMOVED from the product** — no application voice message, no chat audio. Don't build it, don't restore it.
- **Always use the `api.ts` client** — never a raw `fetch`.
- **Confirm every API path against the real backend routes** before wiring it. Do not trust a path from a doc or from memory.
- **`npm run type-check` must exit 0** before any commit (a pre-commit hook enforces it).
- **Commit per ticket**, conventional message, **no `Co-Authored-By` trailer**.
- **Stay in locked scope.** Never reintroduce: **Aadhaar**, **escrow / platform-handled payments**, **WebSockets** for chat, **voice transcription**. These are gone, not deferred. *(**`.ics` interview invites** were RE-ADDED to scope 2026-07-16 by Nazir (PO) — permitted for the interview email only; see `docs/PRODUCT.md` §5.)*

## Gates before committing

- `npm run type-check` (exit 0) — a pre-commit hook enforces it
- `npm run lint` and `node scripts/verify-locales.mjs` when the change touches copy or locales
- `/security-review` — Claude CAN run this
- `/code-review` — ⚠️ **Claude CANNOT run this.** It is blocked from model invocation and reserved for Nazir to type. **Ask him for it; never imply it ran.**

## Team

Shaik (owner/product) · **Nazir** (frontend + acting PM) · Asrar (backend) · Najeeb + Farhana (QA) · Nayan (infra) · Sailaja (mobile).

## Working style

Plan first on multi-file work and wait for a go-ahead. Propose then pause when scope is unclear; execute when it's clear. If you find yourself reasoning toward a decision the docs already locked, defer to the docs — or push back explicitly before changing anything.

**Write in simple English.** Short sentences, plain words, and a concrete example every time. Answer first, detail after. Skip big tables unless asked. Simple words — not simple thinking: still name the file, the line and the commit.
