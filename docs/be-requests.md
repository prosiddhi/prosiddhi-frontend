# FE → BE Requests (contract gaps the frontend needs)

**Owner:** Nazir (FE) · **Audience:** Asrar (BE) · **Created:** 2026-06-13
**Purpose:** Track backend changes the frontend is blocked on or degraded without. Each item: what FE needs, why, the proposed contract, and current FE workaround. Tick when BE lands it.

> Convention: when FE ships a workaround for one of these, tag the code `// Q-FE-NN (date) — see docs/be-requests.md#<anchor>`.

---

## Open requests

### BR-1 — Seeker `dateOfBirth` + `gender` fields  `[ ]`
- **Surfaced by:** PJP-81 (registration rework).
- **Need:** `POST /api/jobseekers/register` (and the JobSeeker profile model + `GET/PUT /profile`) should accept and persist `dateOfBirth` (ISO date) and `gender` (`MALE | FEMALE | OTHER`).
- **Why:** The registration design (and ticket PJP-81) collects DOB + gender on the Profile step. The current Zod register schema has no field for either, so the data has nowhere to go.
- **Proposed contract:** add to `jobSeekerRegisterSchema`: `dateOfBirth: string (ISO 8601, past date)`, `gender: enum(MALE,FEMALE,OTHER)`. Both optional or required — FE can treat as required on its side.
- **FE workaround until then:** fields are rendered and validated in the UI and held in client-side registration state, but **omitted from the register payload** (so the request doesn't 400 against a strict schema). Once BE lands the fields, FE flips them into the payload — one-line change.
- **DPDP note:** DOB is sensitive PII; ensure it's covered by the same data-handling rules as phone/email in `docs/security-spec.md`.

### BR-2 — JWT in httpOnly cookie (not localStorage)  `[ ]`
- **Surfaced by:** PJP-79/80/81 (auth foundation) + audit §2.4 (no plaintext secrets in localStorage).
- **Need:** Option to receive the auth JWT as an `httpOnly`, `Secure`, `SameSite` cookie set by the BE on login/register, instead of (or in addition to) the token in the JSON body that FE stores in `localStorage`.
- **Why:** localStorage tokens are readable by any JS (XSS exfiltration risk). httpOnly cookies are the standard hardening for a web client. Mobile (RN) keeps the bearer-token-in-body path.
- **Proposed contract:** on successful `/login` + register-complete, `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`. FE then drops the `Authorization: Bearer` header for web and relies on `credentials: 'include'`. Needs CORS `Access-Control-Allow-Credentials: true` + explicit origin (not `*`).
- **FE workaround until then:** token stored via `AuthContext` in localStorage (current behaviour). Acceptable for dev/QA; revisit before any real-user launch.

### BR-3 — Public categories / sectors / job-titles lookup  `[ ]`
- **Surfaced by:** PJP-81 Categories step (+ future job-post + filter screens).
- **Need:** A public (or auth-light) `GET /api/categories` (or `/sectors` + `/job-titles`) returning the seeded sector → category → designation taxonomy (`documents/INPUT-FILES/*.xlsx`).
- **Why:** `preferredSector` / `preferredJobTitle` are free-text on the BE today. FE wants real dropdowns sourced from the same seed the recommendation engine scores against, so seeker input matches job data.
- **Proposed contract:** `GET /api/categories` → `[{ sector, category, jobTitles: string[] }]` (ACTIVE only).
- **FE workaround until then:** ship the Categories step with a **curated static list** derived from the seed data (committed in the FE repo), free-text fallback allowed. Swap to the endpoint when it exists.

### BR-4 — Include `interview` on seeker application reads  `[ ]`
- **Surfaced by:** PJP-153 (seeker "My Interviews" view).
- **Need:** `GET /api/applications/my` and `GET /api/applications/:id` should `include: { interview: true }` so the seeker can see an interview scheduled for them.
- **Why:** The `Interview` model is 1-1 on `JobApplication` and is created when an employer Accepts→Schedules (PJP-104). Today only the **employer-only** `getCandidateDetails` includes it; the seeker has **no read path** that returns interview data, so they can't see date/time/notes.
- **Proposed contract:** add `interview: true` to the `include` in `applicationService.getMyApplications` + `getApplicationById`. Shape per schema: `{ id, date (ISO), time (string), interviewerTime?, notes? }` (or `null` when none).
- **FE workaround until then:** FE reads `application.interview` defensively — the "My Interviews" list (`/my-interviews`) and the interview card on `my-applications/[id]` render only when the field is present, so they light up automatically once BE adds the include. No FE change needed when it lands. Tagged `// Q-FE — see docs/be-requests.md#br-4`.

### BR-5 — Allow clearing `skillsRequired` on job update  `[ ]`
- **Surfaced by:** PJP-106 code-review pass (2026-06-15), job edit flow.
- **Need:** `updateJobSchema.skillsRequired` is `z.array(z.string()).min(1)...optional()`, so an empty array is rejected. The create schema allows `[]` (default). The asymmetry means an employer **cannot remove all skills** from an existing job via edit.
- **Why:** On the edit form, deleting every skill yields `[]`; the FE then omits the field (to avoid a 400), and the BE keeps the old skills — silent data bug, no error shown.
- **Proposed contract:** drop `.min(1)` on `updateJobSchema.skillsRequired` (allow `[]` to clear) for parity with create.
- **FE workaround until then:** FE omits `skillsRequired` when empty; skills cannot be cleared via edit (documented limitation).

### BR-6 — Add `INACTIVE` to the `JobStatus` Zod enum  `[ ]`
- **Surfaced by:** PJP-106 code-review pass (2026-06-15).
- **Need:** `deactivateJob` writes `status: 'INACTIVE'` (and the Prisma `JobStatus` enum includes it), but `job.validator.ts`'s `JobStatus` Zod enum omits `INACTIVE` (`DRAFT,ACTIVE,CLOSED,FILLED,CANCELLED`). Any PUT that echoed `status: 'INACTIVE'` would 400.
- **Why:** Latent contract bug. The FE job form does **not** send `status`, so it isn't hit today, but it's a trap for any future status-carrying update.
- **Proposed contract:** add `INACTIVE` to the validator enum to match Prisma + service behaviour.
- **FE workaround until then:** none needed — FE never sends `status`.

### BR-7 — Null-guard `email` in recruiter-contact reveal  `[ ]`
- **Surfaced by:** PJP-113 code-review pass (2026-06-15).
- **Need:** In `getRecruiterContact`, `result.email` is assigned whenever `showEmailToSeekers` is true with no null-guard, whereas `phoneNumber` is guarded (`&& ...phoneNumber`). Minor asymmetry.
- **Why:** `User.email` is generally non-null so it's not live-breaking, but the FE relies on truthiness; an empty/null email should be omitted like phone is.
- **Proposed contract:** guard `email` the same way phone is (`showEmailToSeekers && user.email`).
- **FE workaround until then:** FE already treats falsy email as "not present" via truthiness — no FE change needed.

### BR-8 — `GET /profile` leaks the User `password` hash  `[ ]`
- **Surfaced by:** PJP-112 code-review (profile management), reading `authService.getUserProfile`.
- **Need:** `getUserProfile` does `prisma.user.findUnique({ include: {...} })` with **no `select`**, so `GET /api/jobseekers/profile` and `GET /api/employers/profile` return the full `User` row — including the PBKDF2 `password` hash — to the authenticated client.
- **Why:** A password hash (even the user's own, salt-prefixed PBKDF2) should never cross the wire. It widens the blast radius of any client-side leak (XSS, logging, shared device) for zero functional benefit.
- **Proposed fix:** add an explicit `select`/`omit` on `getUserProfile` (and any other endpoint reusing it) that excludes `password` (and ideally `isDeleted`/internal admin fields).
- **FE mitigation in place:** the FE `SeekerProfile`/`EmployerProfile` types intentionally omit `password`; the profile screens never read or store it. Server-side strip still required.

---

## Landed (move here when done, keep for history)

_(none yet)_
