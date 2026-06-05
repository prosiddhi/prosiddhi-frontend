# Decisions Log — Azkashine Job Portal

**Location locked 2026-05-13** as the shared decision-log master per [`docs/_context/02-scope-locked.md`](../_context/02-scope-locked.md) D6.

All three repos (FE, BE, Mobile) write here. Entries are append-only — never delete, only supersede.

## Format

Each entry uses one of three prefixes:

- **`Q##`** — BE-originated decisions (Asrar's existing convention; pure-numeric counter).
- **`Q-FE-NN`** — FE-originated decisions.
- **`Q-MOB-NN`** — Mobile-originated decisions.

Other prefixes Asrar already uses inline in BE code (`NC-##`, `T##`, `T2a #`, `T3 #`) can land here too with their existing numbering, or be folded into a `Q##` per case.

Entry template:

```
### Q-XX-NN (YYYY-MM-DD) — One-line headline

**Owner:** name (role)
**Affects:** FE / BE / Mobile / All
**Status:** Locked / Superseded by Q-XX-MM / Reversed
**Related:** [[Q-XX-MM]], [link to scope-locked section]

**Decision:** what we picked.

**Reasoning:** why. Include the alternatives considered and why they lost. Include any deadline / external constraint that forced the call.

**Implications:** what code / docs / contracts now have to change because of this.
```

Link entries with `[[Q-XX-NN]]` when referencing each other.

## Cross-reference to scope-locked

For headline scope locks (D1–D7, Q1–Q13 in `02-scope-locked.md`), this log holds the *micro-decisions* underneath them — library choices, endpoint shapes, schema-field semantics, vendor choices, etc. — not the top-level scope itself.

---

## Entries

### Q-FE-01 (2026-05-13) — Decision log master location = git in FE repo

**Owner:** Nazir Hasan (Acting PM)
**Affects:** All
**Status:** Locked
**Related:** [Sprint Plan §8 #10](../managerial/06-sprint-plan.md), [02-scope-locked D6](../_context/02-scope-locked.md)

**Decision:** Shared decision log lives at `docs/technical/decisions-log.md` in the FE repo (this file). FE + Mobile + BE all PR into it. Asrar's local `BACKEND_TASK_LIST.md` + `COMPLETED_TASKS.md` to be migrated here.

**Reasoning:** Notion considered; rejected because devs already work in git all day and a second tool / login adds friction. Git in FE repo (not BE repo) chosen because FE + Mobile do their daily work in this repo; BE devs already pull this repo for the OpenAPI contract per D7.

**Implications:** Asrar migrates his local logs over (no deadline — when convenient). FE + Mobile start logging here from today.

---

### Q-FE-02 (2026-05-13) — Email sender = MSG91 Email

**Owner:** Nazir Hasan
**Affects:** BE (integration), Ops (procurement + billing)
**Status:** Locked
**Related:** [Sprint Plan §8 #4](../managerial/06-sprint-plan.md), Asrar BE sync §9

**Decision:** Use MSG91 Email for transactional email (password reset, employer approval outcome, etc.). Single-vendor with SMS + WhatsApp under one MSG91 account.

**Reasoning:** SendGrid considered (industry-standard deliverability reputation) but rejected. Single-vendor / single-dashboard / single-bill simplicity outweighs SendGrid's deliverability edge for a 6-week MVP. If volume + deliverability data later show MSG91 Email under-performing, swap is one provider-adapter change away.

**Implications:** Nazir to procure MSG91 Email during S1 (folded into MSG91 master account procurement alongside SMS DLT + WhatsApp BSP). BE notification-channel adapter writes against a single MSG91 client.

---

### Q-BE-? / Q-FE-03 (2026-05-13) — Employer corporate doc upload split into two-step flow

**Owner:** Nazir Hasan (decision); Asrar (proposal + implementation)
**Affects:** BE + FE web + Mobile
**Status:** Locked
**Related:** Asrar BE sync §5, [02-scope-locked D6](../_context/02-scope-locked.md)

**Decision:** Employer registration is now two steps:

- **Step 1 — Register (JSON-only):** Phone → OTP → Password → Email Verify → Company Details. No docs at this step. Asrar's `POST /api/employers/register` becomes JSON, not multipart.
- **Step 2 — Documents (separate, multipart):** Corporate employers land in `accountStatus=PENDING_DOCUMENTS` after Step 1. Upload docs whenever ready via `POST /api/employers/me/documents` (multi-file). Admin reviews → flips to `ACTIVE`.

Individual employers skip Step 2 entirely and auto-approve on email verify.

**Reasoning:** Better registration funnel completion — employer can register Mon, see "pending docs" state, upload Tue, get verified Wed. No waiting on doc readiness to finish registering. Cleaner BE code (JSON register endpoint is faster + simpler validation). Trade-off accepted: one extra screen / API call for FE + Mobile.

**Implications:**
- FE `S1-FE-REG` (employer registration screens) rebuilt around two-step flow. Add a "pending documents" landing screen between Step 1 success and Step 2 upload.
- Mobile `S1-MOB-AUTH` similarly two-step for employer role.
- New `accountStatus` enum value `PENDING_DOCUMENTS` on Employer model. See [[Q-BE-?]] below.
- Admin doc review queue UI unchanged (already designed for `verificationStatus` review).

---

### Q-BE-? (2026-05-13) — `accountStatus=PENDING_DOCUMENTS` semantic confirmed

**Owner:** Nazir Hasan (semantic confirmation); Asrar (implementation)
**Affects:** BE
**Status:** Locked
**Related:** [[Q-FE-03]]

**Decision:** New `accountStatus` enum value on Employer model:

- `PENDING_DOCUMENTS` — Corporate employer registered + email-verified, but docs not yet uploaded OR docs uploaded but admin hasn't approved. Can browse + edit profile. **`POST /api/jobs` returns 403.**
- `ACTIVE` — Individual employer post email-verify, OR Corporate employer post admin doc approval. Full feature access.
- (Other states like `SUSPENDED`, `DELETED` etc. follow existing patterns — out of scope for this entry.)

**Reasoning:** Standard "soft-lockout" pattern. Don't fully block the user (drives churn) but block the action that requires verification (posting jobs). Lets admin team see a queue of half-registered employers and chase them for docs.

**Implications:** Job-creation middleware checks `accountStatus !== 'PENDING_DOCUMENTS'`. Admin doc-approval action flips both `verificationStatus=APPROVED` AND `accountStatus=ACTIVE` atomically.

---

### Q-BE-? (2026-05-13) — Google OAuth library = `google-auth-library`

**Owner:** Asrar
**Affects:** BE
**Status:** Locked
**Related:** Asrar BE sync §5, [Sprint Plan §8 #3](../managerial/06-sprint-plan.md)

**Decision:** Use Google's official `google-auth-library` package on BE. Not Passport.

**Reasoning:** Single function (`verifyIdToken`) covers everything we need for stateless JWT auth. Passport's middleware/strategy/serializer overhead is built for session-based apps; we're JWT-only. Smaller dep tree.

**FE pairings:** `@react-oauth/google` (web), `@react-native-google-signin/google-signin` (mobile). Both emit standard Google `id_token` that our BE verifies.

**BE endpoint shape:** `POST /api/auth/google/login { idToken, role }` → BE verifies token → returns our JWT.

**Implications:** No Passport dependency to add. FE + Mobile registration screens collect Google `id_token` (front-channel) and forward to BE.

---

### Q-FE-04 (2026-05-13) — Backward-compat plan = wipe test fixtures, no migration

**Owner:** Asrar (proposal); Nazir (acceptance)
**Affects:** BE
**Status:** Locked, pending Nazir's external-user audit
**Related:** Asrar BE sync §5, [02-scope-locked D6](../_context/02-scope-locked.md)

**Decision:** Production BE has zero real users — only `@test.local` test fixtures from Asrar's test scripts. `scripts/cleanup-tests.ts` wipes them before new-auth deploy. No data migration.

**Caveat:** Nazir to confirm nobody (Shaik, Najeeb, demo accounts) registered against the deployed BE. If anyone has, this plan needs revision.

**Reasoning:** Building a phone-first re-registration migration for zero users is wasted work. Clean break is cheaper + safer.

**Implications:** Pre-deploy step on the auth rework PR: run `cleanup-tests.ts`. Document the assumption explicitly in the PR description so reviewers can object if they know of real users.

---

<!-- New entries appended below. Use the template above. -->
