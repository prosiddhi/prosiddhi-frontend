# Job Portal — Claude Operating Instructions

**Project:** Azkashine Job Portal — a mobile-first, multilingual job portal connecting unskilled workers in India with employers, with phone-based identity, in-app audio messaging, and a low-cost subscription model.

**Hard deadline:** QA handover **2026-06-22**. Code freeze **2026-06-21**. This is a **~5-week MVP** (sprint shifted 1 week 2026-05-15), not an enterprise build.

## Team

- **Shaik Ishaq** — Owner & Sponsor (Product Owner; pricing decisions)
- **Nazir Hasan** — Frontend dev + acting Project Manager (the user)
- **Asrar** — Backend dev (`job-portal-be` repo)
- **Mobile dev** — **TBD** (Dheeraj off project 2026-05-15; new hire pending — major scope risk if not filled by ~Jun 1)
- **Najeeb** — QA Lead
- **Farhana** — QA junior (Mohamad.farhana@azkashine.com)
- **Nayan** — Infra

## 5-stage plan

| Stage | Output | State |
|---|---|---|
| 0 — Discovery | FE/BE/UX audit, gaps identified | done |
| 0.5 — Decision locking | D1–D7 + Q1–Q13 locked; primers written | done |
| 1 — Managerial | Charter, BE sync, PRD, RTM, Sprint Plan, DoD, Standup, Test Plan | done (all 9 artifacts in `docs/managerial/`) |
| 2 — Technical | Security spec, OpenAPI scaffold, DB migrations spec | partly done (Security spec landed; OpenAPI + DB migrations deferred to Asrar in S1) |
| 3 — Claude operating layer | Lean CLAUDE.md, slash commands, sub-agents, permissions | done (hooks deferred — not critical for v1) |
| 4 — Execution | S1–S3 sprints; **CODING starts here**, not before | in progress — Sprint 1 (May 12–24) |

## Always read primers first

Before any non-trivial task, read in order:
1. `docs/_context/README.md`
2. `docs/_context/01-product-summary.md`
3. `docs/_context/02-scope-locked.md`
4. `docs/_context/04-project-status.md`

These replace re-ingesting the [Figma design file](https://www.figma.com/design/fzkZeIzkrU7MRLwunuYbTf/Job-Portal) ([mobile prototype view](https://www.figma.com/proto/fzkZeIzkrU7MRLwunuYbTf/Job-Portal?node-id=809-1687)) and the BE codebase. The repo PDFs (`Job Portal.pdf`, `Job_Portal_Mobile.pdf`) are May-2026 snapshots — Figma is canonical.

## Locked scope summary

- **Aadhaar removed entirely** (Q3, Q4 revoked) — phone OTP is the only registration identity, no Aadhaar field anywhere, no fallback ID screens, no `AadhaarVerification` model.
- **Escrow / platform-handled payments removed entirely** (Q12) — out forever, not just v2; revenue is subscription-only.
- **WhatsApp Business in v1 via MSG91** (Q7 reversed) — OTP, status updates, interview reminders, payment confirmation; SMS as fallback.
- **Mobile = seeker + employer parity** (D3 revised) — Dheeraj owns; full RN build for both roles. Admin stays web-only.
- **Pricing = PROVISIONAL Option B** — ₹999/month employer with 14-day free trial; worker free forever. Awaiting Shaik Ishaq's final confirmation by **2026-05-18**.
- **Application audio cap = 2 min** (Q10 revised); **chat audio cap = 60s**. Standard across web AND mobile.
- **Auth = phone-OTP at registration + Email/password + Google OAuth as alternative login methods.** Same options for seekers and employers.

## Do NOT mention

The following are scrubbed entirely — not "deferred", not "v2", just gone:
- WebSockets / real-time chat transport (polling is final)
- Voice message transcription
- `.ics` calendar invites for interviews
- Aadhaar verification of any kind (mock or real)

## Saved session prompts

`docs/_context/prompts/` holds copy-paste session prompts for each major artifact. Run each in a fresh session; don't chain them.

## Work agreement

Propose then pause when scope is unclear; execute when scope is locked; **one major artifact per session**. Don't drift from locked scope — if tempted to defer a v1 feature or add a v2 feature, push back explicitly before changing anything.
