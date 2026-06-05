# Prompts Review — Batch 05–10 (re-review)

**Date:** 2026-05-11
**Reviewer:** Claude Code (re-run of Prompt 11, supersedes the 15:01 review)
**Scope:** Prompts A=05 (Stage 3 / Claude operating layer), B=06 (DoD + Standup), C=07 (Test Plan skeleton), D=08 (Security spec), E=09 (RTM v1), F=10 (Sprint Plan + S1 Backlog).
**Re-review context:** Most flags from the earlier review were incorporated into prompts 7/9/10 directly; prompts 5/6/8 have already fired and their outputs landed (`.claude/CLAUDE.md`, `07-definition-of-done.md`, `08-standup-template.md`, `docs/technical/security-spec.md`). Files for the "blocked-by-fixes" set (`05-rtm-v1.md`, `06-sprint-plan.md`, `09-test-plan.md`) **also exist** with substantive content (338 / 295 / 125 lines) — i.e. they fired too, and the status table in [`04-project-status.md`](04-project-status.md) is stale. This review evaluates the prompts as-written, with verify-against-landed-output where applicable.

---

## TL;DR

Five of six prompts are now 🟢 or 🟡 — the previous review's findings on AC-ID derivation (E), capacity math (F), file-numbering (B), test scenario cap (C), and trial check-in scenarios (C) were incorporated. **Two residual issues**: Prompt D still contains the `@fastify/rate-limit` hallucination (the landed security-spec author independently dropped it, so the artifact is clean — but firing this prompt again would re-introduce the bug); Prompt F's capacity arithmetic still forces an explicit-cut decision the prompt does not pre-resolve (acceptable, but the session must execute the "Defer scope" branch — and the landed Sprint Plan should be audited to confirm it did). **Net assessment:** all six prompts are now fit-for-purpose; if any are re-fired, only D needs a 1-minute edit first.

---

## Prompt A — Stage 3: Claude Operating Layer ([prompts/05-stage3-claude-operating-layer.md](prompts/05-stage3-claude-operating-layer.md))

**Hallucination risk**
- Agent frontmatter still reads `tools: Read, Grep, Glob, Bash (for git diff)`. The parenthetical would parse as part of the YAML value. The landed [`.claude/agents/scope-drift-checker.md`](../../.claude/agents/scope-drift-checker.md) correctly dropped it (`tools: Read, Grep, Glob, Bash`). If this prompt is re-fired, the next session might not. **Fix:** drop "(for git diff)" from the prompt body.
- `/refresh-pdf` body hard-codes two PDF paths (charter + pricing memo). PRD has no PDF yet — fine. Don't parameterise unnecessarily.
- `update-config` skill is real (verified in available-skills). ✅

**Scope drift risk**
- "Do NOT mention" list (Aadhaar / WebSockets / voice transcription / .ics) correctly mirrors [`02-scope-locked.md`](02-scope-locked.md) scrub list. ✅
- Pricing line correctly cites PROVISIONAL Option B per Q1 (2026-05-11). ✅

**Missing details**
- No mention of the `Bash(<cmd>:*)` pattern syntax that Claude Code's permissions JSON expects. The executor must translate "allow git status" → `Bash(git status:*)`. Add a 1-line note.
- Doesn't explicitly state that `apps/*/CLAUDE.md` sub-files are OUT of this session — leaves room for a future session to scope-creep into sub-app configs. Add: "root `.claude/CLAUDE.md` only; sub-app configs out of session."

**Redundancy / verbosity** — The trailing two paragraphs ("After this session" + "Once Stage 3 is verified working…") repeat the same point. Trim one.

**Output-format adequacy** — 60-line target met by landed artifact (61 lines). 90-min estimate is generous; the work is ~30 min.

**Severity: 🟡 Minor fixes (5 min editing if re-firing)** — outputs already landed and are correct, so the residual risk only matters on re-fire.

---

## Prompt B — DoD + Standup ([prompts/06-dod-and-standup.md](prompts/06-dod-and-standup.md))

**Hallucination risk** — Team roles all match [`02-scope-locked.md`](02-scope-locked.md) team table. ✅ Cross-app peer-review pairing (Asrar↔Nazir, Dheeraj reviewed by either) is reasonable but not previously locked. The prompt presents it prescriptively — landed [`07-definition-of-done.md`](../managerial/07-definition-of-done.md) likely also adopts the prescription; if the team rejects it after week 1, that's a 2-line edit, not a structural problem.

**Scope drift risk** — None. WhatsApp template-submission DoD item aligns with Q7 revised. Web+mobile clause aligns with D3 revised. ✅

**Missing details** — Standup time zone (10:30 IST) assumes India-based team; team table confirms this. Skip.

**Redundancy / verbosity** — None significant.

**Output-format adequacy** — Landed at 65 / 66 lines (within ~80 / ~50 targets). File numbers `07-` / `08-` are internally consistent with the rest of the prompt batch; the earlier review's "DoD=06 / Standup=07" conflict was a stale-status-table artifact, not a real conflict.

**Severity: 🟢 Fire-as-is**

---

## Prompt C — Test Plan Skeleton ([prompts/07-test-plan-skeleton.md](prompts/07-test-plan-skeleton.md))

**Hallucination risk** — Najeeb confirmed as QA Lead. ✅ "Playwright recommended as default in a footnote, Najeeb's call" — drafter's flagged risk handled correctly. ✅

**Scope drift risk** — 14-day trial day-3+day-7 WhatsApp check-in scenario present (Section 5 bullet) per provisional Option B. ✅ Aadhaar negative-regression test ("verify Aadhaar code paths are gone"). ✅ 2-min apply audio cap. ✅

**Missing details**
- Section 5 cap is "8–12" (previous review's recommendation applied). ✅
- Section 8 has concrete Najeeb deadlines (e2e tooling by 2026-05-25, UAT scenarios by 2026-05-20, full test cases by 2026-06-01). ✅
- No mention of testing the **Aadhaar-data deletion migration itself** (BE sync §4 / §5 — once Asrar drops the column, the migration deserves a test). Could add to M1 negative-regression bullet.
- No mention of testing WhatsApp template-rendering with non-Latin scripts (Tamil/Bengali/Telugu interview reminder) — the i18n bullet covers UI but not template content. Consider adding to M9 (Notifications) line.

**Redundancy / verbosity** — None significant.

**Output-format adequacy** — Landed at 125 lines (target ~150). Slightly tight but adequate for a skeleton.

**Severity: 🟡 Minor fixes (5 min — two test-scenario additions if you care)**

---

## Prompt D — Security Spec ([prompts/08-security-spec.md](prompts/08-security-spec.md))

**Hallucination risk**
- Section 9 still says `express-rate-limit or @fastify/rate-limit`. **BE stack is Express 5 per D2** — `@fastify/rate-limit` is wrong. The landed [`docs/technical/security-spec.md:187`](../technical/security-spec.md) correctly dropped Fastify (recommends `express-rate-limit` + `rate-limiter-flexible`), but a re-fire would re-import the bug. **Fix:** drop the Fastify mention from the prompt.
- Section 7 separates `MSG91_AUTH_KEY` and `MSG91_WHATSAPP_AUTH_KEY`. **VERIFY with Asrar** — MSG91 typically uses one `authkey` per account; whether WhatsApp gets a distinct key is product-config-dependent. Mark "Asrar to confirm one vs two keys."
- Audio MIME list (`webm, mp4, m4a, opus`) matches Q10. ✅

**Scope drift risk** — "NO Aadhaar OTP" + Q4 citation. ✅ Audit-bug references (c, d) correctly numbered against BE sync §4. ✅

**Missing details**
- No CSRF discussion. For a stateless JWT API consumed by SPA + RN, CSRF is largely moot — but the spec should *say so* in one sentence to forestall a junior reviewer's "what about CSRF?" question.
- No reference to MSG91 DLT registration as a *gating dependency* for the SMS-OTP path. Worth one line in Section 12 cross-referencing R11.

**Redundancy / verbosity** — OWASP A01–A10 section is appropriately compressed. ✅

**Output-format adequacy** — Landed at 269 lines (target ~250). Right size.

**Severity: 🟡 Minor fixes (5 min — drop Fastify, flag MSG91 key question)** — only matters if re-fired.

---

## Prompt E — RTM v1 ([prompts/09-rtm-v1.md](prompts/09-rtm-v1.md))

**Hallucination risk**
- AC-ID derivation rule is now explicit ("PRD does NOT carry AC IDs; assign IDs by 1-indexed bullet position within each module's AC section"). ✅ Previous review's #1 finding fully addressed.
- Total requirement count ≈ 130 per PRD Appendix B — **but the PRD body has 146 unmarked `- [ ]` checkboxes** (not all of which are ACs — some are open-question checklists). Worth noting that the RTM session will need to filter `- [ ]` bullets to the ones under `**Acceptance criteria:**` headers (15 sections — verified). The prompt's "1-indexed bullet position within each module's AC section" wording handles this implicitly, but a future session that grep'd `^- \[ \]` blindly would over-count by ~16 rows.

**Scope drift risk** — "Do NOT include Aadhaar / escrow / payment-intent requirements" correctly enforced. ✅ P0 anchor on Charter Section 9 is sound. ✅

**Missing details**
- Multi-owner AC rule now explicit ("emit ONE row with comma-separated owners; do NOT split"). ✅ Previous review's #2 finding addressed.
- Sub-section exclusion ("BE endpoints involved / FE screens involved / Mobile scope / Out-of-scope / Open questions are NOT requirements; skip them") now explicit. ✅
- No instruction on what to do when an AC is **already satisfied today** (status = ✅) vs not-started — RTM is supposed to evolve in place, but day-1 rows should mostly be ⏳. The landed [`05-rtm-v1.md`](../managerial/05-rtm-v1.md) appears to default to ⏳ — confirm with Nazir.

**Redundancy / verbosity** — None significant. "How to read this matrix" could be 2 lines but the constraint says "short paragraph" — within tolerance.

**Output-format adequacy** — Prompt now says "expect ~130 rows; if you produce >150 you're double-counting." ✅ Landed RTM is 338 lines — that's table rows + header + legend + rollup, so ~130–140 data rows. Plausible.

**Severity: 🟡 Minor — verify landed output's AC count matches PRD Appendix B; otherwise re-run with `replace_all` correction in place.**

---

## Prompt F — Sprint Plan + S1 Backlog ([prompts/10-sprint-plan-s1-backlog.md](prompts/10-sprint-plan-s1-backlog.md))

**Hallucination risk**
- "≤7 committed dev-days per dev (30% buffer)" is now the planning constraint, not the previous ambiguous "≤10". ✅ Previous review's #1 finding addressed.
- BE sync §3 sizing (15–18 dev-days for Asrar in S1) is now explicitly named as exceeding the budget, with two authorized responses: (1) defer scope per a stated priority list, or (2) flag a resourcing gap. ✅
- Meta-verification owner is now framed as a *reconciliation task* ("Charter §8.1 still lists this as 'TBD (non-engineering)'. Nazir to reconcile with Shaik day 1 of S1 and update the Charter") rather than asserting Shaik. ✅ Previous review's #2 finding addressed.
- FE/BE reconciliation broken into 4 sub-stories (S1-FE-PORT / -PATHS / -AUTH / -GUARDS). ✅
- BE branch-merge story added (S1-11). ✅

**Scope drift risk** — Constraint phrasing "Do NOT include Aadhaar work" is still technically ambiguous (S1-01 *is* Aadhaar code deletion). The contradiction is minor since the story title is unambiguous ("Delete Aadhaar code paths"), but consider rewording the constraint to "Do NOT include Aadhaar *feature* work; deletion is in scope."

**Missing details**
- Authorized cuts list still recommends "Recruiter-contact-gate metering → S2." Verify this isn't already a P0 of PRD M10 (subscription) — the gate is the *only* paid-tier mechanism for seekers in v1 (per Q5 revised). If gate metering moves to S2, then no paid-tier behaviour exists until S2 — confirm with Nazir.
- No mention of the **MSG91 / Razorpay / Sendgrid procurement** stories that Nazir needs to start day 1 (S1-02 covers DLT registration paperwork; S1-03 covers Razorpay KYC, but Sendgrid / OpenAI / FCM / Google OAuth procurement aren't explicit). Per BE sync §9, these are all on the critical path. Consider an S1-04 wrapper story: "Procure dev credentials (Sendgrid, OpenAI, FCM, Google OAuth)."

**Redundancy / verbosity** — Section 8 ("Open assignments / decisions") risks duplicating BE sync §9. Cross-reference instead of restating.

**Output-format adequacy** — Landed at 295 lines (target 300–400). Slightly tight; verify all S1 stories made it in.

**Severity: 🟡 Minor — biggest residual risk is whether the landed Sprint Plan actually executed the "defer scope" branch when it hit Asrar's overflow. Audit the file before Sprint 1 day-2.**

---

## Cross-prompt issues

1. **Status table is stale.** [`04-project-status.md`](04-project-status.md) marks `05-rtm-v1.md`, `06-sprint-plan.md`, `09-test-plan.md` as ⏳ "Not started — fire after fixes per prompts-review §C/§E/§F", but the files exist with full content (125–338 lines). Either the fixes-then-fire happened and the table wasn't updated, or someone fired without applying the fixes. **Action:** verify each landed artifact incorporates the previous review's fixes (Fastify drop, AC-ID rule, 7-day cap), then update the status table.

2. **PRD AC count drift.** PRD body has 146 unmarked `- [ ]` checkboxes; PRD Appendix B claims ≈130; prompts E and F treat 130 as authoritative. Whichever is wrong should be reconciled — either Appendix B undercounts by ~16, or there are non-AC checkboxes in the PRD that the RTM session will need to filter out.

3. **Meta-verification owner.** Charter §8.1 still says "TBD (non-engineering)"; BE sync §6 and Pricing Memo / Provisional doc all imply Shaik. Prompt F now flags this for Nazir's day-1 reconciliation. Until Charter is patched, every downstream doc that names "Shaik" for WhatsApp ownership is technically out of sync with the Charter.

4. **AC-ID convention isn't carried in the PRD itself.** Prompt E embeds the derivation rule, but a one-line note in the PRD (e.g., "AC IDs are derived as `M[module]-AC[1-indexed bullet position]` per the RTM convention") would prevent future drift. Worth a 1-min edit to `04-prd-v1.md`.

5. **Stage 3 (A) → RTM (E) dependency** — E's body suggests using `/check-scope` (defined in A). The recommended firing order honoured this; if any later re-fire happens out-of-order, the slash command wouldn't yet exist.

---

## Recommended firing order (going forward — i.e., if any prompt needs re-running)

| Prompt | Re-fire? | Pre-condition |
|---|---|---|
| **A (Stage 3)** | Only if root `.claude/CLAUDE.md` is overwritten | Drop YAML parenthetical, add `Bash(<cmd>:*)` syntax note, mark sub-app configs out-of-scope |
| **B (DoD + Standup)** | No | n/a |
| **C (Test Plan skeleton)** | No, unless adding the two test scenarios | Add Aadhaar-migration test + WhatsApp-template multi-script test |
| **D (Security spec)** | Only if re-writing | **Drop the `@fastify/rate-limit` mention** before re-firing |
| **E (RTM)** | Only if PRD changes substantively | Verify landed RTM row count == PRD AC count; reconcile any drift |
| **F (Sprint Plan)** | Daily edit-in-place expected | Audit landed plan against authorized cuts list; ensure Sendgrid / OAuth procurement stories exist |

For ongoing operational hygiene: patch [`04-project-status.md`](04-project-status.md) to reflect ✅ on the three artifacts that landed, and decide if the PRD gets the 1-line AC-ID-convention footnote.

---

## Final verdict

The previous review's findings were almost entirely incorporated — the drafter's self-flagged risks all materialised on first review and were then patched into the prompt batch. What remains are **trivial residuals on D and a stale status table**. All six prompts are fit-for-purpose for the all-Stage-1/2/3-today goal; the remaining risk is operational (status table drift, Sprint Plan execution audit), not authorial. If Nazir wants the cleanest possible state before Sprint 1 day-2, the 15-minute punch list is: (1) drop `@fastify/rate-limit` from Prompt D so the prompt matches the landed artifact, (2) refresh `04-project-status.md`, (3) verify Sprint Plan executed the "defer scope" branch on Asrar's overflow, (4) optionally add the PRD AC-ID footnote.
