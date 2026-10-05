# ProSiddhi Portal — Claude Operating Instructions

**This repo (`prosiddhi-frontend`) is the PORTAL** — the seeker + employer web app.
Siblings under `c:\dev\Azkashine\Prosiddhi\`: **`prosiddhi-backend`** (the API — Express 5 + Prisma), **`prosiddhi-admin`** (the admin console), and **`prosiddhi-mobile-app`** (Flutter, ~85% built).

## Read these first

1. **`docs/STATUS.md`** — ⭐ **what is done and what is left**, on one short page (rewritten 2026-10-05). Work is tracked in **Jira, R1 board 34** (tickets PJP-200…243). Where STATUS.md and Jira disagree, check both and fix the wrong one. The full history up to 4 Oct is in `docs/_archive/STATUS-history-to-2026-10-04.md`.
2. **`docs/PRODUCT.md`** — what we're building, who for, and the locked rules (incl. what's permanently out of scope).
3. **`docs/MONETIZATION.md`** — the employer billing system: pricing rules, what's built, what's broken.
4. **`docs/DEPLOY.md`** + **`docs/deploy-checklist.md`** — deploy + go-live.

**The defect list is `docs/qa/defect-log.csv`** — one register, 35 rows. Out-of-date docs live in `docs/_archive/` (and `../_archive/` for the root folder) — don't treat them as current.

## Where the product stands *(2026-10-05 — summary; STATUS.md wins)*

Release 1 launches **21 Oct 2026**; the Android app must reach Google Play by **13 Oct**. Production (`prosiddhi.com`, `api.` and `admin.`) still runs on the old server; the move to Google Cloud has started late.

- **Backend** — R1 work done except **security hardening (R1-BE-09)**. The queue (BE-07) moved out of R1. ⚠️ **Never `prisma db push`** — use the tracked migration commands from R1-BE-10. 🔴 While prod has `EXPOSE_OTP_IN_RESPONSE` on, a seeker/employer email reset returns the code in the reply — STATUS §6.
- **Portal** — R1 work done except **R1-POR-02** (delete-account + help pages, privacy updates, notification settings) — Bharath, blocks the Play submission.
- **Admin console** — no work since 15 Sep. **R1-ADM-01** (sign-in safety) and **R1-ADM-02** (reset password, release phone) — Prabhjot from 5 Oct.
- **Mobile (Flutter, Android only in R1)** — sign-in and backend sync done; Play compliance, push, polish and the Play release in progress; blocked on the keystore, a new Google/Firebase account and D-U-N-S.
- **SMS + WhatsApp** are built behind server switches and stay off until DLT / Meta approve — they don't block launch.
- **10 languages ship on both clients** — en · hi · ta · kn · ml · mr · gu · or · te · bn.

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

Shaik (owner) · **Nazir** (frontend lead + acting PM — every decision goes to him) · Asrar + Prabhjot Singh (backend; Prabhjot also takes the admin console from 2026-10-05) · Bharath Kumar Srimanthula (portal) · Sailaja + Krishna Kumar (mobile) · Nayan (DevOps; Noor supports) · Nazeeb (Jira: "Nazeebur Rehman Syed"; older docs say "Najeeb") + Farhana (QA).

*(prabhazkashine in the git history = Prabhjot Singh.)*

## Working style

Plan first on multi-file work and wait for a go-ahead. Propose then pause when scope is unclear; execute when it's clear. If you find yourself reasoning toward a decision the docs already locked, defer to the docs — or push back explicitly before changing anything.

**Write in simple English.** Short sentences, plain words, and a concrete example every time. Answer first, detail after. Skip big tables unless asked. Simple words — not simple thinking: still name the file, the line and the commit.
