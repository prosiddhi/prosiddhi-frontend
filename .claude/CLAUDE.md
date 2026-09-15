# ProSiddhi Portal — Claude Operating Instructions

**This repo (`prosiddhi-frontend`) is the PORTAL** — the seeker + employer web app.
Siblings under `c:\dev\Azkashine\Prosiddhi\`: **`prosiddhi-backend`** (the API — Express 5 + Prisma), **`prosiddhi-admin`** (the admin console), and **`prosiddhi-mobile-app`** (Flutter, ~85% built).

## Read these first

1. **`docs/STATUS.md`** — ⭐ **what is done and what is left.** The single source of truth. **JIRA is stale — trust this instead.** *(This file you are reading now is a summary and goes stale faster than STATUS.md. Where the two disagree, STATUS.md wins.)*
2. **`docs/PRODUCT.md`** — what we're building, who for, and the locked rules (incl. what's permanently out of scope).
3. **`docs/MONETIZATION.md`** — the employer billing system: pricing rules, what's built, what's broken.
4. **`docs/DEPLOY.md`** — deploy + go-live.

**The defect list is `docs/qa/defect-log.csv`** — one register, 35 rows, the QA run plus what we found ourselves. *(The old `docs/qa/functional-audit-portal.md` and the admin's `functional-audit-admin.md` were both resolved and deleted; don't look for them.)* **Admin** — the invoice-PDF download is wired (2026-08-27), but the 2026-09-15 sync found new flags, one of them security. See `docs/STATUS.md` §0.

## Where the product stands *(2026-09-15 — all four surfaces re-checked)*

**Live in production on HTTPS:** portal `https://prosiddhi.com` · API `https://api.prosiddhi.com` · admin `https://admin.prosiddhi.com`. Ports 3000/5000/3001 on the old IP are closed. **Production runs the portal as of about 2026-09-11 14:49.** Checked 2026-09-15 by probing pages only newer code has: `/employer/ledger` is live, but the 09-11 16:20 employer sign-in change is not.

- **Backend** — feature-complete *(HEAD `c413dc0`, 2026-09-11)*. New since 08-21: job pre-moderation, paid re-listing of expired jobs, bookmark-as-a-flag, a SALES role, an editable plan catalogue. ⚠️ **The release is 19 hand-run SQL folders in order — never `prisma db push`** (it drops 5 unique indexes). 🔴 Phone OTPs have no SMS code, so prod keeps `EXPOSE_OTP_IN_RESPONSE` on — an account-takeover path (`STATUS.md` §4 bug 3).
- **Portal** — feature-complete, and **redesigned 2026-08-25 → 09-11** (40 commits, Bharath Kumar). Example: a seeker now lands on a new `/home` page after login, and employers got a credit ledger at `/employer/ledger`. Login, forgot-password, both profiles, settings, the job feed, job details and messages were all rebuilt. There are **19 new portal bugs** — `STATUS.md` §4 rows 29–47: 14 from the redesign, 5 from backend contract changes.
- **Admin console** — feature-complete. The invoice-PDF download is wired. New since 08-18: a SALES role, Plans, account restore, post Approve / Reject. **Open:** an admin-takeover risk through forgot-password (backend + config), the content scan lost its UI, and three broken flows — `STATUS.md` §0.
- **Mobile (Flutter)** — **~85%**. It has now run on Android, but has no recorded smoke test and no iOS run. Missing: invoices. **Forgot password is broken on mobile** (backend drift) — `STATUS.md` §0. *(Checkout is not being built: D2 was resolved 2026-08-20, web-only.)*
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
- `/code-review` — Claude CAN run this *(permission given by Nazir 2026-08-19; the
  old "reserved for Nazir" rule is retired)*. Use **`high`** on logic or backend
  changes; `medium` is enough for copy-only. `medium` deliberately reports only
  high-confidence findings, so it will pass over clumsy-but-correct code.
  ⚠️ **`/code-review ultra`** is still user-triggered and billed — Claude cannot launch it.
- **`/simplify`** — run it on every non-trivial diff. `type-check`, `lint`,
  `/security-review` and `/code-review medium` all passed a block that walked one
  array five times to produce three values (fixed in `a2f1bc1`). None of those
  gates look for clarity; this one does.

### Code standards Claude must self-check before showing a diff

- **One pass over a collection** unless there is a reason for more. No
  `.filter().reduce()` next to `.map().filter().map()` over the same array.
- **No type predicate that exists only to satisfy the compiler** (`(d): d is Date`).
  If the types need a hint, the shape is usually wrong.
- **No `Math.min(...spread)`** or similar cleverness — write the loop.

## Team

Shaik (owner/product) · **Nazir** (frontend + acting PM) · Asrar (backend) · Najeeb + Farhana (QA) · Nayan (infra) · Sailaja (mobile).

**New names in the commit history since 2026-08-21 — roles not yet recorded, ask Nazir before writing one:** Bharath Kumar Srimanthula (all 40 portal commits, 2026-08-25 → 09-11) · prabhazkashine (admin commits) · Krishna Kumar (mobile commits).

## Working style

Plan first on multi-file work and wait for a go-ahead. Propose then pause when scope is unclear; execute when it's clear. If you find yourself reasoning toward a decision the docs already locked, defer to the docs — or push back explicitly before changing anything.

**Write in simple English.** Short sentences, plain words, and a concrete example every time. Answer first, detail after. Skip big tables unless asked. Simple words — not simple thinking: still name the file, the line and the commit.
