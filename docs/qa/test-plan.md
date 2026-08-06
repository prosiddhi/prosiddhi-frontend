# ProSiddhi — Master Test Plan
**Version 1.0 · Owner: QA Lead (Najeeb) · Status: Draft for review**

> The single planning document for the ProSiddhi pre-go-live test effort. Scope, approach, environment, roles, schedule/estimate, entry/exit criteria, and risks. Test *cases* live in [test-cases/](test-cases/) (538 cases, 6 suites). This plan says *how* we run them.

---

## 1. Scope

**In scope** — full functional + non-functional testing of the four surfaces before go-live:
- **Web portal** (seeker + employer) · **Admin console** · **Mobile app** (Android + iOS) · **Backend API** · **Cross-surface E2E** · **System-design robustness** (concurrency, resilience, data-integrity) · **Performance/Load** · **Security/pen-test** · **UAT**.

**Out of scope (this cycle)** — features flagged `Not-yet-built` in the case suites (in-app mobile checkout, mobile invoices, mobile Google sign-in, HRMS/ATS integrations, AI matching), and unit/white-box testing (owned by dev). These are logged as known gaps, **not** filed as defects.

**Test basis** — `docs/PRODUCT.md`, `docs/MONETIZATION.md`, `docs/STATUS.md`, the admin/mobile STATUS docs, and the catalog feature list. Traceability in [traceability-matrix.csv](traceability-matrix.csv).

## 2. Test approach

- **Manual, black-box** execution of the 538 cases, ordered Web → Admin → API → E2E → Mobile → System-Design.
- **Attack-first bias** — the suites are ~60% negative/boundary/security/concurrency; testers execute those with equal weight to happy paths.
- **Defect-driven** — every failure logged per [defect-report-template.md](defect-report-template.md) into [defect-log.csv](defect-log.csv); triaged daily by the Lead.
- **Two regression cycles** after dev fixes, using the tagged **Smoke** (per-build sanity) and **Regression** (impacted-area) subsets.
- **Non-functional tracks** (Performance, Security, UAT) run in parallel late in the cycle — see their dedicated plans.

## 3. Test environment

| Surface | URL / target | Notes |
|---|---|---|
| Portal | `http://103.225.224.149:3000` → `https://prosiddhi.com` | Move to HTTPS before sign-off |
| Admin | `:3001/admin/login` | Web-only, desktop |
| API | `…/api` via `:80` proxy → backend `:5000` | — |
| Mobile | Android emulator `10.0.2.2:5000` · iOS sim `localhost:5000` · device = LAN IP | **Never run on a device yet** |

⚠️ **Known environment conditions that shape results** (from the live probe):
- Backend runs in **`development` mode** → OTPs are returned/shown (no real SMS/email); flip to `production` before the security pass.
- **Google OAuth not configured**, **Razorpay in test mode**, **WhatsApp/SMS/push not configured** → test flows via dev-OTP + test cards; do not file these as bugs.
- **DB is near-empty** (plans + taxonomy seeded only) → **test data must be created/seeded first** (see §7).

## 4. Roles & responsibilities

| Role | Person | Responsibilities |
|---|---|---|
| **QA Lead** | Najeeb | Plan, triage, System-Design + Security + Perf tracks, E2E, reporting, go/no-go |
| **Junior Tester 1** | Farhana | Web portal, API (Postman), regression |
| **Junior Tester 2** | *(TBD)* | Admin, Mobile (device), regression |
| Dev support | Asrar / Nazir | Fix defects, support failure-injection & load setup, seed data |
| Product | Shaik / Nazir | UAT sign-off, policy calls (store, legal) |

## 5. Entry criteria
- Environment stable and reachable (all 4 surfaces up).
- Test data seeded; test accounts created (owner/member employer, seeker, admin, super-admin).
- Builds are `type-check`/`flutter analyze` green.
- This plan + the case suites reviewed.

## 6. Exit criteria (go-live gate)
- **100%** of P1 cases executed; **≥95%** of P2 executed.
- **Zero open P1/blocker defects**; open P2s triaged and accepted by Product.
- Two regression cycles clean on the impacted areas.
- Performance targets met (see Perf plan); Security pass with no High/Critical open.
- UAT signed off by Product.
- Go-Live Readiness Checklist fully green.

## 7. Test data
- Seed via API/registration (dev-OTP lets QA self-serve accounts) or `prosiddhi-backend/scripts/seed-seat-test.ts` (owner/mate/spare/seeker @seattest.local, pw `SeatTest@123`).
- Needed: 2-seat + 1-seat employer plans, a business + individual employer, several seekers, jobs across taxonomy, a suspended-member scenario, payments for reconciliation.
- **Isolation:** each tester needs distinct accounts to avoid colliding on shared state (the org wallet especially).

## 8. Schedule & effort estimate — team of 3 (1 Lead + 2 Juniors)

> Estimate assumes a **stable environment**, **prompt dev fix turnaround**, and dev/specialist support for the load & failure-injection cases. Calendar includes fix-and-retest, not just first-pass execution.

| Phase | Work | Effort (person-days) | Calendar | Owner |
|---|---|---|---|---|
| 0 | **Setup** — env, seed data, Postman collection, device/emulator, tools | ~6 | ~3 days | Lead + J2 |
| 1 | **Functional: Web + Admin** (241 cases) | ~22 | ~1.5 wk | J1 + J2 |
| 2 | **Mobile** (84 cases, Android + iOS, first-ever device run) | ~14 | ~1.5 wk | J2 + Lead |
| 3 | **API** (108, Postman) | ~10 | ~1 wk | J1 |
| 4 | **E2E integration** (30 cross-surface) | ~7 | ~0.5 wk | Lead + J1 |
| 5 | **System-design** (QA-testable ~40 of 75) | ~12 | ~1 wk | Lead + dev |
| 6 | **Performance / Load** | ~10 | ~1 wk | Lead + dev |
| 7 | **Security / pen-test** | ~10 | ~1 wk | Lead / external |
| 8 | **UAT** | ~6 | ~1 wk (business-paced) | Lead + Product |
| 9 | **Regression** (2 cycles after fixes) | ~30 | ~2 wk | J1 + J2 |
| 10 | **Reporting / sign-off** | ~4 | ~2 days | Lead |

**Headline:**
- **First-pass functional (Web+Admin+Mobile+API+E2E): ~4–5 weeks.**
- **Complete program (incl. non-functional, UAT, 2 regression cycles): ~9–12 weeks calendar.**

**The variables that move this:**
- **Defect volume + dev fix speed** — regression is the biggest swing; a buggy first pass can add weeks.
- **Mobile is the wildcard** — nothing has run on a device; layout/permission/lifecycle bugs could surface in volume.
- **Perf + Security ideally need dev/specialist (or external) support** — if the trio does everything solo, add ~1–2 weeks.
- **~35 hardcore system-design cases** (true concurrency/failure-injection/load) are **dev-collaboration**, not black-box QA — folded into the Perf/Security tracks with dev.

## 9. Compatibility / device matrix

**Browsers (Web portal):** Chrome, Firefox, Edge, Safari — latest 2 versions. Small-screen (mobile web) at 360px + tablet. *(Admin = desktop Chrome only — web-only by locked scope; do not file admin mobile bugs.)*

**Mobile devices:**
| Platform | Coverage |
|---|---|
| Android | 1 low-end (Go/2GB, the real audience), 1 mid, 1 recent; API 24 → latest; emulator + ≥1 physical |
| iOS | 1 recent iPhone (sim) + ≥1 physical if available |

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Env not production-configured (HTTP, dev-mode, no keys) | Can't test OAuth/mail/payments/security truthfully | Sequence: config → then security/UAT passes |
| Mobile never device-run | High unknown, late surprises | Device smoke test **first** in the mobile phase |
| Empty DB | Blocks execution | Seed before Phase 1 |
| Testers colliding on shared org state | False failures | Per-tester account isolation |
| Slow dev fix turnaround | Regression blows out | Daily triage; fix SLAs by severity |

## 11. Deliverables
Test Plan (this) · Traceability Matrix · 538 test cases (6 suites) · Defect log · Smoke & Regression suites · Performance, Security, UAT plans · Test Summary Report + go/no-go · Go-Live Readiness Checklist.
