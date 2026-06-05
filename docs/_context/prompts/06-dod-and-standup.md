# Prompt 6 — Definition of Done + Standup Template

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

Two small artifacts in one session. They're related, both project-standard, low scope-drift risk.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md (esp. team table + sprint
   shape + risks)
4. docs/_context/04-project-status.md
5. docs/managerial/01-project-charter.md (esp. Section 9
   success criteria)

Your single task: produce two project-standard documents that
the team will use during Sprints 1–3. Both are templates +
project-anchored guidance, not deep specs.

==== OUTPUT 1 — Definition of Done ====

CREATE docs/managerial/07-definition-of-done.md (~80 lines).

Sections:

1. **What "Done" means in v1** — one paragraph. Done = ready
   for QA handover, not "code written".

2. **Per-feature DoD checklist** — 10-12 items that EVERY
   feature must pass before being marked Done. Cover:
   - Acceptance criteria from PRD met (cite by ID, e.g.,
     M5-AC3)
   - Code reviewed by ≥1 peer (cross-app where possible:
     Asrar reviews Nazir's, Nazir reviews Asrar's, Dheeraj's
     reviewed by either)
   - Tests added where the feature touches BE business logic
     (unit / integration; e2e deferred to QA team)
   - Linting + type check passes
   - Manual smoke test on staging
   - Feature works on web AND mobile if scope says so (per
     D3 revised 2026-05-09)
   - i18n: at minimum EN + HI strings added to JSON; other
     8 languages can have [needs review] markers
   - No new console warnings or runtime errors introduced
   - Documentation: scope-locked.md updated if the build
     surfaced new info; PRD updated if acceptance criteria
     evolved
   - WhatsApp templates (if relevant) submitted for Meta
     approval

3. **Sprint-level DoD** — what an entire sprint must produce
   to call itself done. Cover:
   - All sprint backlog items closed or explicitly
     re-planned
   - No P0 bugs open
   - Deploy to staging verified
   - Sprint retro held (15 min, async if needed)

4. **"Done done" for QA handover (2026-06-15)** — pull
   directly from Charter Section 9. List as a numbered
   checklist.

5. **What "Done" does NOT mean** — short list of things
   teams sometimes confuse with done:
   - "Code is on main" ≠ Done (must pass DoD)
   - "Tests pass locally" ≠ Done (must pass on staging)
   - "Asrar said it's ready" ≠ Done without peer review +
     smoke test

Tone: prescriptive but not bureaucratic. Don't add ceremony.

==== OUTPUT 2 — Standup Template ====

CREATE docs/managerial/08-standup-template.md (~50 lines).

Sections:

1. **Format** — daily async standup via Slack/WhatsApp (or
   whatever the team picks). Nazir is the standup facilitator
   (acting PM). Post by 10:30 IST daily.

2. **Three-question template** (paste-able):
   ```
   *Standup — [Name] — [Date]*
   *Yesterday:* (1-3 lines)
   *Today:* (1-3 lines)
   *Blockers:* (or "None")
   *Sprint backlog status:* (link to current sprint board / row)
   ```

3. **Blocker escalation** — if a blocker isn't resolved
   within 4 hours of posting, Nazir tags Shaik (for
   business blockers) or the relevant dev (for technical).

4. **Friday demo + retro** — short Friday standup is a
   demo. Each dev shares one thing they shipped that week
   (5 min each). After standup, 10-minute retro on what
   went well / what to change.

5. **What to NOT do in standup** — diagnose problems
   (take to side-thread); pass blame; repeat yesterday's
   blocker without status; skip without notice.

6. **Mobile dev (Dheeraj) onboarding note** — first week
   of standup includes a "what I read today" line so Nazir
   can verify mobile-design alignment.

==== CONSTRAINTS ====

- Do NOT modify any other doc.
- Do NOT include implementation details about Slack/WhatsApp
  webhooks or bots — that's outside scope. Just specify
  format and discipline.
- ~130 lines combined across both files.
- After saving, report a 3-line chat summary:
  - Files created (2 paths)
  - One thing flagged for Nazir's attention (e.g., "DoD
    item #X may need Asrar/Najeeb input")
  - Any contradiction found with scope-locked.md (should
    be none)
- Estimated time: ~45 min combined.

Today's date: use real current date. User: Nazir Hasan.
Owner: Shaik Ishaq.
```

---

## After this session

Both files are templates — the team uses them during Sprints 1–3 without further iteration. If something feels off after one week of standups, edit `08-standup-template.md` and tell the team.
