# User Acceptance Test (UAT) Plan — ProSiddhi
**Owner: Product (Shaik / Nazir).** Business/stakeholder acceptance before launch. UAT answers *"does this do what the business needs, for real users?"* — not *"is the code correct?"* (that's the functional suites). Scripts: [uat-scripts.csv](uat-scripts.csv).

---

## 1. Objectives
Confirm, in **business terms**, that a real employer can hire and a real seeker can get hired — end to end, in English and Hindi — and that the money, trust and admin controls behave as the business expects. Sign-off here is the last gate before go-live.

## 2. Participants
| Role | Who | Does |
|---|---|---|
| UAT Lead | Nazir (PM) | Coordinates, collects sign-off |
| Product owner | Shaik | Final acceptance |
| Business/pilot **employers** | 2–3 real SMEs | Run the hiring journey |
| Business/pilot **seekers** | 3–5 real blue-collar users (Hindi-first) | Run the job-search journey |
| Admin/ops staff | Internal | Run the moderation/verification journey |
| QA support | Najeeb | Sets up data, records outcomes, logs issues |

> Using **real users** (especially low-literacy, Hindi-first seekers on their own phones) is the point — it surfaces usability and language issues no internal tester will.

## 3. Approach
- **Scenario-based**, written in plain business language (see the scripts) — not click-by-click.
- Run on a **production-like environment** with realistic (not obviously fake) data, **HTTPS**, and — where possible — real payments in a low-value live mode or a clearly-communicated test mode.
- Each participant runs their persona's scenarios; UAT Lead records **Accepted / Rejected / Accepted-with-comments** per scenario.
- Observe **usability** (can a first-time, low-literacy user actually do this?), not just correctness.

## 4. Scope
The real revenue + core-loop journeys: seeker registration→job→apply→interview; employer registration→approval→buy→post→search→unlock→hire; team seats; admin verify/moderate; billing/GST; EN/HI. **Out:** unbuilt features (mobile checkout, invoices, Google sign-in) and non-functional aspects (covered by Perf/Security plans).

## 5. Acceptance criteria
- All **P1 business scenarios Accepted**.
- No open issue that blocks a real user completing a core journey.
- **Hindi journey accepted by an actual Hindi-first user** (not just string-checked).
- Money journeys (buy, unlock, invoice) accepted by the business.
- Product owner signs the acceptance.

## 6. Environment & data
Prod-like + HTTPS; seeded pilot accounts; at least one real employer plan purchased; a candidate pool to search/unlock; a moderation case to action.

## 7. Deliverables & sign-off
Completed [uat-scripts.csv](uat-scripts.csv) with per-scenario disposition · an issues list (feeding the defect log) · a signed **UAT Acceptance** row in the [Go-Live Checklist](go-live-readiness-checklist.md).

## 8. Risks
- Real Hindi-first users are essential but harder to schedule — plan early.
- Payments in UAT need a policy call (test vs low-value live).
- Pilot employers need admin approval first — pre-stage it.
