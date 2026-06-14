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

---

## Landed (move here when done, keep for history)

_(none yet)_
