# ProSiddhi Portal — Claude Operating Instructions

**This repo (`prosiddhi-frontend`) is the PORTAL** — the seeker + employer web app.
Siblings under `c:\dev\Azkashine\Prosiddhi\`: **`prosiddhi-backend`** (the API — Express 5 + Prisma) and **`prosiddhi-admin`** (the admin console). Mobile (`prosiddhi-mobile-app`) is **not started**.

## Read these first

Four docs, that's it:

1. **`docs/STATUS.md`** — ⭐ **what is done and what is left.** The single source of truth. **JIRA is stale — trust this instead.**
2. **`docs/PRODUCT.md`** — what we're building, who for, and the locked rules (incl. what's permanently out of scope).
3. **`docs/MONETIZATION.md`** — the employer billing system: pricing rules, what's built, what's broken.
4. **`docs/DEPLOY.md`** — deploy + go-live.

Current defect lists: `docs/qa/functional-audit-portal.md` (this repo) and `prosiddhi-admin/docs/qa/functional-audit-admin.md`.

## Where the product stands

The **web product is feature-complete** — seeker + employer flows, chat, EN/HI i18n, and the full **employer monetization** system (credits, Razorpay, GST invoices, a paid candidate database, team seats). The backend is feature-complete. The admin console is wired but is **missing two screens** (taxonomy management, monetization views). **Mobile is 0%.**

What's left is in `STATUS.md` §3 — headline: **two seat bugs**, **outbound notifications**, **two admin screens**, a **QA-defect pass**, and **go-live config**.

## Hard rules

- **We now own the backend** *(changed 2026-07-12)*. We hold the `prosiddhi-backend` code and make BE changes ourselves — the old "never edit the backend" rule is **retired**. ⚠️ **Coordinate with Asrar before committing to it**, or you'll collide.
- **⛔ Audio is REMOVED from the product** — no application voice message, no chat audio. Don't build it, don't restore it.
- **Always use the `api.ts` client** — never a raw `fetch`.
- **Confirm every API path against the real backend routes** before wiring it. Do not trust a path from a doc or from memory.
- **`npm run type-check` must exit 0** before any commit (a pre-commit hook enforces it).
- **Commit per ticket**, conventional message, **no `Co-Authored-By` trailer**.
- **Stay in locked scope.** Never reintroduce: **Aadhaar**, **escrow / platform-handled payments**, **WebSockets** for chat, **voice transcription**, **`.ics` invites**. These are gone, not deferred.

## Gates before committing

- `npm run type-check` (exit 0)
- `/code-review` — must be green; it checks the FE↔BE contract against the real backend routes
- `/security-review` — for anything touching auth, tokens, roles, or **payments**

## Team

Shaik (owner/product) · **Nazir** (frontend + acting PM) · Asrar (backend) · Najeeb + Farhana (QA) · Nayan (infra) · **mobile: unowned**.

## Working style

Plan first on multi-file work and wait for a go-ahead. Propose then pause when scope is unclear; execute when it's clear. If you find yourself reasoning toward a decision the docs already locked, defer to the docs — or push back explicitly before changing anything.
