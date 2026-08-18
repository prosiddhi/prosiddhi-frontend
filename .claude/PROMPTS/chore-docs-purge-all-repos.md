# chore: docs purge + status consolidation across all four repos

**Status:** ready to run · **Written:** 2026-08-18 · **Owner:** Nazir

---

## 1. Why

97 markdown files live across the four repos. Many have done their job and now
actively mislead. `.claude/CLAUDE.md` in the portal was corrected on 2026-08-18
after it was found claiming mobile was 0% built and the admin console was missing
two screens — both months out of date. A session that reads a stale file plans
work that is already finished.

**The goal is fewer, truer documents** — not tidiness for its own sake.

## 2. Scope

Every `*.md` in these four repos, excluding `node_modules/` and `.git/`:

```
c:\dev\Azkashine\Prosiddhi\prosiddhi-frontend      (48 files)
c:\dev\Azkashine\Prosiddhi\prosiddhi-backend       ( 5 files)
c:\dev\Azkashine\Prosiddhi\prosiddhi-admin         (18 files)
c:\dev\Azkashine\Prosiddhi\prosiddhi-mobile-app    (26 files)
```

Also in scope: `docs/qa/*.csv` — but **read only**. See §4.

## 3. ⚠️ You cannot delete files

Deletion is blocked in this environment. It has been attempted and refused.

So the deliverable is **not** a clean repo. It is:

1. A **delete list** — every file to remove, with **one line saying why**.
2. **cmd.exe commands** Nazir can paste. He uses **cmd.exe, not PowerShell** —
   `del "path\file.md"`, not `Remove-Item`.
3. The **consolidation work you CAN do**: writing and editing files. Do that part
   yourself before handing over the delete list, so nothing is lost when he runs
   the deletions.

Order matters: **merge the content first, delete second.**

## 4. MUST KEEP — do not delete these, and check for others like them

**The rule: never delete the only record of a decision or of unfinished work.**
A file can look like clutter and still be the only place a reason is written
down. When a doc is deleted, the reasoning goes with it, and a later session
"helpfully" reverses the decision because nothing explains it.

Known examples — verify each still holds, and look for more:

| File | Why it must survive |
|---|---|
| `prosiddhi-frontend/docs/store-policy-assessment.md` | The **only** record of why the mobile checkout is blocked, and it **contradicts locked decision D2**. Delete this and someone rebuilds in-app Razorpay. |
| `prosiddhi-frontend/docs/brand-asset-brief.md` | The designer spec. Two items are **still owed** — the editable source file and the Azkashine A1/A2 marks. |
| `prosiddhi-frontend/docs/i18n/COPY-DEFECTS.md` | The live register for the copy workstream. Has **open** items: DPDP grievance officer, GSTIN, registered office. |
| `prosiddhi-frontend/docs/qa/defect-log.csv` | The live bug register, 35 rows. **Never touch this file in this task.** |
| `prosiddhi-frontend/docs/STATUS.md` | Source of truth for the whole project. |
| `prosiddhi-frontend/docs/https-cutover-runbook.md` | How production was actually built. Needed to rebuild or debug it. |
| `prosiddhi-frontend/docs/messaging-registration-runbook.md` | DLT / MSG91 / Meta steps **not yet done**. |
| `prosiddhi-admin/docs/admin-ui-buildout.md` | Records that only Asrar/Nayan hold the production SUPER_ADMIN credentials. |
| `prosiddhi-mobile-app/docs/STATUS.md` | The mobile tracker. |

**Also protected:** `PRODUCT.md`, `MONETIZATION.md`, `DEPLOY.md`, `go-live-config.md`,
`security-spec.md`, and every `.claude/agents/*.md` (those are live tooling, not
documentation).

## 5. Strong delete candidates — verify before listing them

Do **not** trust this list. Open each one and confirm nothing unique is inside.

| File | Suspected reason |
|---|---|
| `prosiddhi-mobile-app/README.md` | Its own `docs/STATUS.md` marks it **STALE** — describes god-files and "no service layer", both false. |
| `prosiddhi-mobile-app/ARCHITECTURE.md` | Same — marked STALE by the same file. |
| `prosiddhi-mobile-app/.claude/APPRAISAL-2026-06-19.md` | Two months old, superseded. |
| `prosiddhi-backend/HANDOFF-2026-07-12.md` | Six weeks old; the work handed off has shipped. |
| `prosiddhi-frontend/docs/DEMO-STAGING.md` | Written for one demo, on a staging box whose **ports are now closed**. |
| `prosiddhi-frontend/docs/feature-status-breakdown.md` | A snapshot for the 28-July meeting; superseded by `STATUS.md`. **Check first** — it holds the "credits → Job Posts / Candidate Unlocks" rename. If that lives nowhere else, move it before deleting. |
| `prosiddhi-admin/docs/qa/functional-audit-admin.md` | The audit is resolved. **Check** it holds no open item. |

## 6. ⚠️ Handle with care — coordinate, do not just delete

- `prosiddhi-backend/API_DOCUMENTATION.md` and `ADMIN_API_DOCUMENTATION.md` are
  **Asrar's**. They have diverged from the source before (three known stale
  spots). **Do not delete. Do not rewrite.** Flag them for him.
- Anything under `.claude/` in a repo that is not the portal — those are that
  repo's operating instructions. Correct them if stale; deleting them blinds that
  repo's sessions.

## 7. The consolidation

After the purge there must be **one clear answer per surface** to "what is done,
what is left":

- **Backend** — what is live, what is open. Include the two unmerged/undecided
  items: the trial-lot invite fix (`2b5a3ad`, never merged) and the OTP
  enumeration decision.
- **Portal** — feature-complete; the open QA defects.
- **Admin** — feature-complete; the invoice-PDF download is the only gap.
- **Mobile** — ~85%; checkout blocked on D2, invoices never built, **never run on
  a device**.

`STATUS.md` is where this lives. Correct it where it is stale — it currently has
**two blocks both dated 2026-08-18** and a `§3 item 3d` that still reads OPEN
though it was fixed in `5d982ac`.

Every stale claim you correct: say what it said, and what is actually true.

## 8. Validation — do not skip

1. `find` each repo again and confirm the file count dropped as expected.
2. **Grep for links to every deleted file.** A dead link in `STATUS.md` is worse
   than the clutter you removed. Fix every one.
3. Confirm nothing in §4 was deleted.
4. Portal only: `npm run type-check` must still exit 0 — docs should not affect
   it, but prove it rather than assume.
5. Commit per repo, conventional message, **no `Co-Authored-By`**.

## 9. Bootstrap prompt

```
Docs purge and status consolidation, all four repos. The spec is
prosiddhi-frontend/.claude/PROMPTS/chore-docs-purge-all-repos.md — read it first
and follow it.

Key points so you do not have to be told twice:
- You CANNOT delete files. Produce a delete list with a reason per file, plus
  cmd.exe commands (del, not Remove-Item) for me to run.
- Merge content BEFORE listing anything for deletion.
- NEVER delete the only record of a decision or of unfinished work. §4 lists the
  protected files and explains why. store-policy-assessment.md is the clearest
  example: it is the only thing stopping someone rebuilding the mobile checkout.
- Backend API docs are Asrar's. Flag, do not touch.
- Grep for links to anything you delete and fix them.

Talk to me in very simple English, with examples.
```
