# ProSiddhi — QA Pack

Everything needed to test ProSiddhi before go-live, across all four surfaces (web portal, admin console, mobile app, backend API) plus integration, system-design, performance, security and UAT.

**538 test cases across 6 suites**, plus the planning, defect-handling and release artifacts around them. All CSVs import into Excel / TestRail / Zephyr / Jira.

---

## What's in here

### Test cases — `test-cases/`
| File | Covers | Cases |
|---|---|---|
| `01-web-app-test-cases.csv` | Seeker + employer web portal | 127 |
| `02-admin-test-cases.csv` | Admin console (all 13 pages) | 114 |
| `03-api-test-cases.csv` | Backend API | 108 |
| `04-e2e-integration-test-cases.csv` | End-to-end journeys across surfaces | 30 |
| `05-mobile-app-test-cases.csv` | Mobile app (incl. device/runtime) | 84 |
| `06-system-design-test-cases.csv` | Architecture (concurrency, resilience, scale) | 75 |

### Planning
| File | What it does |
|---|---|
| `test-plan.md` | Master plan — scope, approach, roles, entry/exit criteria, risks, timeline estimate |
| `traceability-matrix.csv` | Maps every feature to the cases that cover it (coverage proof) |
| `manual-testing-walkthrough.md` | Hands-on click-through guide to smoke-test the app |

### Defects
| File | What it does |
|---|---|
| `defect-report-template.md` | Standard format for logging a bug (fields, severity, priority) |
| `defect-log.csv` | The register where bugs get logged |

### Release
| File | What it does |
|---|---|
| `go-live-readiness-checklist.md` | Sign-off gate — everything that must be done before launch |

### Non-functional
| File | What it does |
|---|---|
| `performance-load-test-plan.md` | Load / performance testing plan |
| `security-test-plan.md` | Security testing + pen-test scope |
| `uat-plan.md` | User acceptance testing plan (business sign-off) |
| `uat-scripts.csv` | 22 plain-language business scenarios for UAT |

---

## How to read the test-case CSVs
Each row has: `ID · Module · Title · Type · Priority · Preconditions · Test Data · Test Steps · Expected Result · Actual Result · Status · Feature State · Notes`.
- **Status** — leave blank; QA fills Pass / Fail / Blocked / Not Run.
- **Feature State** — `Implemented` = testable now · `Not-yet-built` = planned/blocked, don't file as a bug.
- **Type** — positive / negative / boundary / security / concurrency / etc. Roughly 60% are attack cases by design.

## Start here
1. Read `test-plan.md` (scope, roles, timeline).
2. Skim `manual-testing-walkthrough.md` to get the app running and see the environment gotchas.
3. Execute the case suites in order (Web → Admin → API → E2E → Mobile → System Design).
4. Log anything that fails into `defect-log.csv` using the template.

## Heads-up on the current environment
A few things aren't switched on yet — all flagged in the docs so they don't get filed as bugs:
- **Google login, real SMS/WhatsApp/push, and live payments** are not configured (Razorpay is in test mode; OTPs show on-screen in dev mode).
- **The mobile app has never run on a real device** — device testing is the top mobile priority.
- **The site is on HTTPS** as of 2026-08-18 (`https://prosiddhi.com`, `https://api.prosiddhi.com`, `https://admin.prosiddhi.com`) — the old IP-and-port URLs are closed.
- ⚠️ **The backend still runs in `development` mode**, which must change before the security/UAT passes. It cannot simply be flipped: in production the BE stops echoing OTPs, and with MSG91 unconfigured nothing delivers them — so registration would be impossible for everyone. `NODE_ENV=production` and working OTP delivery have to land together.
