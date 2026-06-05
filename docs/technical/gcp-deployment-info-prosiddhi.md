# ProSiddhi — Information for GCP Deployment Checklist

**Product:** ProSiddhi (mobile-first multilingual job portal for unskilled workers in India)
**Company:** Azkashine Software & Services Pvt. Ltd.
**Document prepared:** 2026-05-27 by the application team (Nazir Hasan, FE+PM)
**Purpose:** Provide all project-side information available today to the Cloud / DevOps team to fill the GCP Project Deployment Checklist. **No DevOps or cloud-architecture decisions are made in this document** — every item flagged "OPEN" is for the cloud team to decide.

**Sources:** This document draws from `docs/_context/02-scope-locked.md`, `docs/managerial/04-prd-v1.md`, `docs/technical/security-spec.md`, and the BE codebase. If anything below is ambiguous, those are the authoritative anchors.

---

## 1. Project Overview

| Field | ProSiddhi Information |
|---|---|
| Project Name | **ProSiddhi** (product brand). Parent company: Azkashine Software & Services Pvt. Ltd. |
| Business Purpose | Connect unskilled / blue-collar workers in India with employers via phone-based identity, in-app audio messaging, and a low-cost subscription model. |
| Application Description | Web (Next.js 14 seeker + employer + admin) + Mobile (React Native, seeker + employer parity) + Backend (Express 5 / Prisma 6 / PostgreSQL). Phone-OTP registration, audio messages (2 min apply / 60s chat), 10-language i18n, content moderation with OpenAI, Razorpay subscriptions, WhatsApp Business notifications via MSG91. |
| Environment Details (DEV / SIT-UAT / PROD) | **Requested: DEV + UAT + PROD** (three environments). Final naming + structure: OPEN — cloud team to decide. |
| Project Owner | **Shaik Ishaq** (Owner & Sponsor, also Product Owner) |
| Technical SPOC | **Asrar** (Backend, `job-portal-be` repo) + **Nazir Hasan** (Frontend + acting Project Manager, `job-portal-fe` repo). Mobile dev: **TBD** (replacement hire pending). |
| Business SPOC | **Shaik Ishaq** |
| Support Team Details | **QA Lead:** Najeeb. **QA Junior:** Farhana (Mohamad.farhana@azkashine.com). **Infra:** Nayan. |
| Expected Go-Live Date | **Code freeze: 2026-06-21. QA handover: 2026-06-22.** Public launch date is the cloud team + Shaik's call. |

---

## 2. Application Architecture

| Field | ProSiddhi Information |
|---|---|
| Architecture Diagram | Not formally drafted yet. High-level: 3 web apps (seeker, employer, admin) + 2 mobile apps (seeker, employer, both RN+Expo) → single Express 5 BE → PostgreSQL. Local-disk file storage for v1 (audio + docs + profile pics). |
| Monolith / Microservices | **Monolith.** Single Express 5 BE serves all clients. No microservice split planned for v1. |
| Frontend & Backend Details | **FE Web:** Next.js 14 App Router, TypeScript, Tailwind, lucide-icons. Two workspaces: `apps/web` (seeker + employer) and `apps/admin` (admin-only).<br>**FE Mobile:** React Native + Expo, RTK Query, NativeBase, MMKV (single workspace `apps/mobile`; seeker + employer parity).<br>**BE:** Express 5 ESM + TypeScript + Prisma 6 + PostgreSQL + Zod 4 + JWT (HS256) + PBKDF2 + Winston + Multer. Runs on port 5000. |
| API Flow | REST over HTTPS. JWT (HS256, 7-day expiry) in `Authorization: Bearer` header. ~115 endpoints total. No GraphQL, no WebSockets (polling for chat). |
| External Integrations | **MSG91** (SMS OTP, Email transactional, WhatsApp Business templates — single vendor) · **Razorpay** (subscription payments only — no escrow / no platform-handled wages) · **Google OAuth** (alternative login) · **FCM** (push notifications) · **OpenAI** `omni-moderation-latest` (content moderation). |
| Authentication Method | Three options for both seekers and employers: (a) Phone + OTP, (b) Email + Password, (c) Google OAuth. JWT issued post-auth. Password hashing PBKDF2 310k rounds sha256. See `docs/technical/security-spec.md` for details. |
| High-Level Data Flow | Client → HTTPS → BE → PostgreSQL. Audio/image uploads → Multer → local disk (v1) / Cloud Storage (v2+ migration is one-config-change per spec). Outbound: MSG91 (SMS/Email/WhatsApp), Razorpay webhook in, FCM out, OpenAI API for moderation. |
| Expected User Traffic | **Launch (Jun 2026):** small — likely <1,000 employers and a few thousand seekers in initial weeks. **6-month projection:** 1k–10k employers, 10k–100k seekers (rough; not formally modelled). Peak QPS: low double digits expected. **OPEN — formal traffic model is a v2 task.** |
| HA / DR Requirements | **OPEN — cloud team to define.** Application-side: BE is stateless (JWT, no sessions), so horizontal scaling is straightforward; DB is the only stateful component. |

---

## 3. GCP Project Requirements

| Field | ProSiddhi Information / Status |
|---|---|
| Existing GCP Project or New Project | **OPEN — cloud team to decide.** No existing GCP footprint for ProSiddhi today. |
| Billing Account Details | **OPEN — Shaik Ishaq + Azkashine finance.** |
| Folder / Organization Placement | **OPEN — cloud team to decide.** |
| Required Regions | **Suggested by the project team: `asia-south1` (Mumbai)** because (a) DPDP Act 2023 data-residency, (b) latency to Indian users. Final choice OPEN. |
| Multi-region Requirement | **Not required for v1.** Single Indian region is acceptable. Multi-region is a v2 candidate. |
| Naming Convention Standards | **OPEN — cloud team to define.** Suggestion: include `prosiddhi-<env>-<service>` somewhere. |
| Labels / Tags Required | **Project team can suggest:** `product=prosiddhi`, `company=azkashine`, `env=<dev/uat/prod>`, `owner=<team-email>`. Final labels: OPEN. |

---

## 4. IAM & Access Management

Team size is small (~6 people). Group structures may be overkill — Cloud team to decide.

| Field | ProSiddhi Information |
|---|---|
| User Access Requirements | **6 people total** today: Shaik (Owner), Nazir (FE+PM), Asrar (BE), mobile-dev-TBD, Najeeb (QA Lead), Farhana (QA Junior), Nayan (Infra). |
| Admin Users | **Cloud-side admin:** Nayan. **Application-side admin:** Nazir + Asrar (for emergencies). |
| Developer Access | Nazir (FE), Asrar (BE), mobile-dev-TBD (Mobile). |
| Read-only Users | Shaik (visibility), Najeeb (QA), Farhana (QA). |
| Service Accounts Required | (a) BE app runtime service account, (b) CI/CD service account (one per repo). **OPEN — cloud team to scope.** |
| Group-based Access | Team is small; project team has no preference. Cloud team's call. |
| CI/CD Access Requirements | CI/CD provider not yet confirmed — **SETUP-GAPS #3 open.** Working assumption: **GitHub Actions** (both repos are on GitHub). If GCP-native (Cloud Build), cloud team to advise. |
| Third-party Access | **None planned.** No external auditors / contractors expected pre-launch. |
| RBAC Requirements | **Application-side roles:** SEEKER, EMPLOYER, ADMIN (enforced in BE; documented in security-spec.md §4). **GCP RBAC:** OPEN. |

---

## 5. Networking Requirements

Mostly OPEN — cloud team to design. Project-side inputs:

| Field | ProSiddhi Information |
|---|---|
| Existing VPC or New VPC | **OPEN** |
| Subnet Requirements | **OPEN** |
| CIDR Ranges | **OPEN** |
| Private / Public Access | **Public:** API (BE) + Web (FE) + Admin Web. **Private:** Database, Secrets, internal service-to-service. |
| VPN Requirement | None planned for v1. |
| Interconnect Requirement | None planned for v1. |
| Hybrid Connectivity | Not applicable — no on-prem. |
| Peering Requirements | **OPEN** |
| Firewall Rules | Standard for public web + API; restrict DB to private. **Cloud team to draft.** |
| Allowed Ports | **Inbound public:** 443 (HTTPS) only. **Inbound private (DB):** 5432 (PostgreSQL). All other ports closed. |
| Internal-only Services | Database, Secret Manager, internal service-to-service auth. |
| NAT Gateway Requirement | **Likely yes** — BE makes outbound calls to MSG91, Razorpay, OpenAI, FCM, Google OAuth verification. Cloud team's call on configuration. |
| Private Google Access | **OPEN — cloud team to decide.** |
| Internal / External Load Balancer | **External LB:** required for FE (web, admin) + API. **Internal LB:** OPEN. |
| SSL Requirements | **Required for prod.** Domain TBD (likely `prosiddhi.in` or similar — Shaik to confirm). Cert source (Let's Encrypt / GCP-managed): cloud team's call. |
| DNS Requirements | **Domain not yet procured.** Once Shaik confirms domain, DNS records needed for: `api.<domain>`, `<domain>` (seeker web), `employer.<domain>` (employer web), `admin.<domain>`. Subdomain strategy OPEN — cloud team to advise. |

---

## 6. Kubernetes / Compute Requirements

| Field | ProSiddhi Information |
|---|---|
| GKE or Cloud Run | **OPEN — cloud team to choose.** Application is a single containerised Express 5 server + static-export Next.js apps. Either fits; project team has no architectural preference. |
| Node Sizing | If GKE: **OPEN.** |
| Autoscaling Requirements | Should scale horizontally based on request volume. Initial load is low; autoscaling minimums can be conservative. **Specifics OPEN.** |
| Namespace Structure | If GKE: **OPEN.** |
| Ingress Requirements | If GKE: external ingress for API + web + admin. **OPEN.** |
| Helm Charts Availability | No existing Helm charts. **Cloud team to author if GKE is chosen.** |
| Resource Limits | BE is small — single Express server, peak ~512MB–1GB RAM expected at launch traffic. Each FE app is static Next.js export (no SSR needed) — minimal runtime resources. **Final limits OPEN.** |
| Persistent Storage Requirements | **Yes for file uploads** — audio messages, employer documents, profile pictures, seeker documents. Current v1 plan: local disk with presigned-URL abstraction; **migration to Cloud Storage in v1 production is recommended** (BE security spec already accommodates this). |

---

## 7. Cloud Run Requirements (if Cloud Run is chosen)

| Field | ProSiddhi Information |
|---|---|
| Service Names | **Suggested:** `prosiddhi-api` (BE), `prosiddhi-web` (seeker + employer FE), `prosiddhi-admin` (admin FE). |
| CPU & Memory Requirements | **BE:** start with 1 vCPU / 1 GB RAM. **FE (static export):** minimal — 0.5 vCPU / 512 MB RAM each likely fine. **Cloud team to finalise.** |
| Minimum / Maximum Instances | **OPEN.** Suggest min=1 to avoid cold starts on API; max=10 initially. |
| Concurrency Settings | **OPEN — cloud team to set.** |
| Public or Private Access | **Public:** API, web, admin. |
| Domain Mapping | Required once domain is procured (see §5 DNS Requirements). |
| Environment Variables | Known config keys (BE): `DATABASE_URL`, `JWT_SECRET`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_WHATSAPP_TEMPLATE_*`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `OPENAI_API_KEY`, `FCM_SERVER_KEY`, `NODE_ENV`. Full list per `docs/technical/security-spec.md`. |
| Secrets Required | All credentials above must live in Secret Manager (not env-injected as plain text). **Secret Manager is required** — already in our security spec. |
| VPC Connector Requirement | If DB is in a private subnet (likely), yes. **OPEN — cloud team to decide.** |
| Service-to-Service Authentication | API ↔ DB only. No internal service-to-service auth needed (monolith). |

---

## 8. CI / CD Requirements

| Field | ProSiddhi Information |
|---|---|
| Repository Details | **Two GitHub repos:** `job-portal-fe` (FE web + admin + mobile workspace) and `job-portal-be` (BE). Separate per D7 decision in scope-locked.md. |
| GitHub / GitLab / Bitbucket | **GitHub.** |
| Branch Strategy | **OPEN — SETUP-GAPS #6.** Project team's working assumption: `main` is protected, feature branches via `feature/`, fix branches via `fix/`, PR-based merges. **Cloud team / Nazir to finalise.** |
| Trigger Conditions | **Suggested:** PR to main → run tests; push to main → deploy to UAT; manual approval → deploy to PROD. Final: cloud team's call. |
| Build Steps | **FE:** `pnpm install && pnpm build` (Next.js static export for web + admin; Expo build for mobile). **BE:** `pnpm install && pnpm prisma generate && pnpm build` (TypeScript compile to ESM). Docker images per service. |
| Deployment Strategy | **OPEN.** Suggested: rolling deploy on Cloud Run / blue-green. |
| Rollback Plan | **OPEN — cloud team to define.** Cloud Run supports revision-based rollback natively. |
| Artifact Registry Repository Names | **Suggested:** `prosiddhi-api`, `prosiddhi-web`, `prosiddhi-admin` Docker images. Final: cloud team. |
| Docker Images | One per service. Base: official `node:20-alpine` or similar (cloud team's call on hardening). |
| Retention Policy | **OPEN — cloud team to define.** |
| Access Control | CI/CD service account scoped to deploy + read artifact registry; no production DB write access. |

---

## 9. Database Requirements

| Field | ProSiddhi Information |
|---|---|
| AlloyDB / Cloud SQL Details | **PostgreSQL is the application's database** (Prisma 6 schema). Choice between AlloyDB and Cloud SQL: **OPEN — cloud team to pick based on scale + cost.** Project team has no preference. Cloud SQL is likely sufficient for v1 launch volumes. |
| HA Requirement | **Yes for PROD** (regional HA). DEV / UAT: zonal is fine. |
| Backup Policy | **OPEN — cloud team to define.** Suggested: daily automated backup, 30-day retention for PROD, 7-day for UAT/DEV. |
| Storage Requirement | **Small at launch** — initial DB size estimated <10 GB. Growth dominated by user records, applications, messages (text-only), notification log. **No formal sizing model yet.** |
| Read Replicas | **Not required for v1 launch.** |
| DB Users & Roles | One application user (read/write); one migration user (DDL); one read-only user for analytics/QA. Specific role split: **OPEN.** |
| Encryption Requirement | Encryption at rest **required** (managed provider default is fine). Encryption in transit (TLS) **required**. |
| Migration Requirement | **Schema migrations via Prisma** (`prisma migrate deploy`). Seed data: 14 XLSX files in `documents/INPUT-FILES/` need to load into job category tables via a one-time seed script. **No legacy data migration** — BE production currently has zero real users (only test fixtures, cleaned pre-deploy). |
| Redis Cache Requirements | **Not required for v1.** ProSiddhi does NOT use Redis. JWT auth is stateless (no session store), chat is polling-based (no pub/sub), no caching layer exists in the BE code. **Cloud team should not provision Redis** unless adding it as a future v2 architecture decision. |
| Persistence Requirement | (Redis N/A) |
| Eviction Policy | (Redis N/A) |

---

## 10. Storage Requirements

| Field | ProSiddhi Information |
|---|---|
| Cloud Storage Buckets | **Yes — required.** Audio messages (apply + chat), profile pictures (seeker + employer), employer verification documents (GST cert, CIN cert, ISO certs, etc.), seeker documents. |
| Bucket Naming | **Suggested:** `prosiddhi-<env>-audio`, `prosiddhi-<env>-docs-private`, `prosiddhi-<env>-profile-pics`. Final: cloud team. |
| Lifecycle Policies | **OPEN — cloud team to define.** Suggested: standard storage class; move to nearline after 90 days; cold after 1 year. |
| Retention Policy | **Application-side:** all uploads tied to a user; on soft-delete of user (NC-9), associated files become orphaned but are not auto-deleted in v1. **Cloud-side retention/deletion policy: OPEN.** |
| Backup Requirements | **OPEN — cloud team to define.** Audio files are recreatable in theory (user can re-record) but employer docs are not. Suggest different retention for `audio` vs `docs-private` buckets. |
| Encryption Requirement | Encryption at rest required (Google-managed key is fine for v1; CMEK is a v2+ candidate). |
| Public / Private Access | **Public (or presigned-URL-only):** profile pictures, audio messages (intended recipient only — via presigned URL). **Private:** employer verification docs, seeker docs (admin-review only). |

---

## 11. Security Requirements

See `docs/technical/security-spec.md` for the full spec. GCP-side asks:

| Field | ProSiddhi Information |
|---|---|
| Cloud Armor | **Recommended for PROD** (per security-spec §1 non-scope: "WAF in front of API — Nayan to decide hosting first; WAF vendor follows"). Cloud team's call on configuration. |
| WAF Policies | Same as above — cloud team's call. Minimum: rate limit auth + upload endpoints, block known-malicious IPs. |
| DDoS Protection | GCP standard (Cloud Armor adaptive protection) is sufficient for v1. |
| SSL Certificates | **Required for all public endpoints.** GCP-managed certs are fine; renewal must be automated. |
| Secret Manager Usage | **Required.** All secrets listed in §7 above must live in Secret Manager, never in env files / source code. |
| CMEK / KMS Requirement | **Not required for v1.** Google-managed encryption keys (GMEK) are acceptable. CMEK is a v2+ candidate. |
| Audit Logging | **Required** — all admin actions, all auth events, all data deletes. BE already emits structured Winston logs; ingestion into Cloud Logging is required. |
| Compliance Standards | **India DPDP Act 2023** applies (personal data of Indian users — phone, email, KYC documents). **No PCI scope** — Razorpay handles all card data; we never touch PANs. **No HIPAA / SOC2 / ISO 27001** required for v1. |
| Data Residency Requirements | **All user data must reside in India** (DPDP Act 2023). Reinforces `asia-south1` preference. |
| Vulnerability Scanning | **Container image scanning recommended** (Artifact Registry has this built-in). Application-level pen-testing is v2. |

---

## 12. Monitoring & Logging

| Field | ProSiddhi Information |
|---|---|
| Cloud Logging Requirements | **Required.** BE already uses Winston (`logs/error.log`, `logs/combined.log` locally) — these need to forward to Cloud Logging in containerised deploy. Request logger middleware emits HTTP duration + status for every request. Prisma query logs are off by default (`warn`/`error`/`info` only) — keep. |
| Monitoring Dashboards | **OPEN — cloud team to draft.** Project-side asks: API request rate, p50/p95/p99 latency per endpoint, error rate, DB connection pool usage. |
| Alerting Requirements | **OPEN — cloud team to draft.** Suggested initial alerts: API 5xx rate >1%, p95 latency >2s, DB CPU >80%, failed Razorpay webhook signature attempts >10/hr. |
| Incident Notification Emails | **Primary recipients:** Nazir (biz-ops@azkashine.com) + Asrar + Nayan. Escalation: Shaik. |
| SLA / SLO Definitions | **Not yet defined.** Project-side suggestion for v1: 99% monthly uptime target (informal), p95 API <1.5s. **Formal SLA: OPEN — Shaik + cloud team.** |
| Uptime Checks | **Required.** At minimum: `/health` endpoint on API every 60s from multiple regions. BE has no `/health` endpoint yet — needs adding as part of go-live prep. |
| Error Reporting | Cloud Error Reporting / similar. Useful but not blocking. |

---

## 13. Backup & Disaster Recovery

| Field | ProSiddhi Information |
|---|---|
| Backup Frequency | **OPEN — cloud team to define.** Project-side ask: at least daily DB backups; bucket versioning on for the docs bucket. |
| Retention Period | **OPEN.** 30 days for PROD DB backups is a reasonable default. |
| DR Region | **OPEN.** For v1, single-region (asia-south1) is acceptable; multi-region DR is a v2 candidate. |
| RPO / RTO Requirements | **Not yet defined.** Project-side suggestion for v1: RPO 24h (daily backups), RTO 4h (restore from backup within half a business day). **Formal numbers: OPEN — Shaik + cloud team.** |
| Restore Testing Requirement | **Recommended quarterly** post-launch. Not a launch blocker. |

---

## 14. Cost & Budgeting

| Field | ProSiddhi Information |
|---|---|
| Budget Allocation | **OPEN — Shaik Ishaq + Azkashine finance.** |
| Cost Center | **Azkashine — ProSiddhi product.** |
| Budget Alerts | **Strongly recommended** at 50%, 80%, 100% of monthly budget. Alert recipients: Shaik + Nazir + Nayan. |
| Expected Monthly Usage | **Launch month (Jun 2026):** small — likely <USD 500/month combined across all GCP services at initial traffic. **6-month projection: OPEN — no formal model yet.** |
| Environment-wise Cost Estimation | **OPEN — cloud team to model post-architecture finalisation.** |
| Cost Optimization Expectations | Project team is cost-sensitive (early-stage product, subscription model with ₹999/mo employer pricing). Prefer min-instance counts conservative; aggressive autoscale-down on UAT/DEV; consider spot/preemptible nodes where feasible. |

---

## 15. Operations & Support

| Field | ProSiddhi Information |
|---|---|
| Support Model | **Business-hours initial support** (IST). 24x7 not in scope for v1. |
| Escalation Matrix | **L1:** Najeeb (QA Lead, application issues) / Nayan (infra issues). **L2:** Nazir (FE+PM) / Asrar (BE). **L3:** Shaik Ishaq. |
| Deployment Windows | **OPEN — cloud team + Shaik to define.** Suggested: low-traffic hours (early IST morning). |
| Maintenance Windows | Same as above. |
| Patch Management | **OPEN — cloud team to define.** OS patches: GCP-managed if Cloud Run; team-managed if GKE. Application dependency patches: standard `npm audit` cadence (project team). |
| Ownership Matrix | **App ownership:** Nazir (FE), Asrar (BE), mobile-dev-TBD (Mobile). **Infra ownership:** Nayan. **DB ownership:** Asrar (schema) + Nayan (operations). |
| On-call Requirements | **None formally defined for v1.** Best-effort response from Nazir + Asrar + Nayan. Formal on-call rotation is a v2 candidate. |

---

## 16. Documentation Required

| Field | ProSiddhi Status |
|---|---|
| Architecture Diagram | **Not yet drafted.** Can produce post-cloud-team architecture choices. |
| HLD / LLD | **HLD: PRD v1** (`docs/managerial/04-prd-v1.md`, 969 lines, 15 modules, ~130 acceptance criteria) + **Security Spec** (`docs/technical/security-spec.md`). **LLD:** module-level pending. |
| Runbooks | **Not yet drafted.** Will produce alongside go-live prep. |
| SOPs | **Not yet drafted.** Will produce alongside go-live prep. |
| Deployment Guide | **TBD — cloud team to write** (or jointly with project team). |
| Rollback Guide | **TBD — cloud team to write.** |
| Access Matrix | **TBD.** Project team can scaffold once IAM is designed. |
| DR Document | **TBD — cloud team to write.** |

---

## 17. Mandatory Services Checklist — ProSiddhi Confirmation

### Core GCP Services

| Service | Required by ProSiddhi? | Notes |
|---|---|---|
| Cloud Run | **Likely** | Single Express BE + 3 Next.js static FE apps. Cloud Run fits cleanly. Cloud team's final call. |
| Cloud Build | **OPEN** | Or GitHub Actions (project-team default per SETUP-GAPS). Either is fine. |
| Artifact Registry | **Yes** | Docker images for BE + FE apps. |
| AlloyDB | **OR Cloud SQL** | Cloud team picks one based on cost + scale. Both work with PostgreSQL + Prisma. |
| Redis | **NO — not needed for v1.** | See §9 — application has no Redis dependency. Cloud team should NOT provision unless adding architecture decision. |
| Secret Manager | **Yes — required** | All env secrets must live here per security spec. |
| Cloud Storage | **Yes — required** | Audio files, employer docs, profile pictures. |
| Cloud Logging | **Yes — required** | BE logs need to forward here. |
| Cloud Monitoring | **Yes — required** | Dashboards + alerting. |
| IAM | **Yes — required** | Cloud team to design. |

### Security & Networking

| Service | Required by ProSiddhi? | Notes |
|---|---|---|
| VPC | **Yes** | Cloud team to design. |
| Firewall Rules | **Yes** | Restrict DB to private; public for FE/API. |
| Load Balancer | **Yes — external** | For FE + API public endpoints. |
| Cloud Armor | **Recommended for PROD** | Per security spec; cloud team's final call. |
| SSL Certificates | **Yes — required** | All public endpoints. |
| DNS | **Yes — required** | Once domain is procured. |

---

## 18. Final Approval Checklist

| Approval | Owner |
|---|---|
| Security Team Approval | Cloud / Security team |
| Network Team Approval | Cloud team |
| Cloud Team Approval | Nayan + cloud team |
| Application Team Sign-off | **Nazir (FE+PM) + Asrar (BE)** |
| Management Approval | **Shaik Ishaq** |
| Production Readiness Review (PRR) | Joint — Project team + Cloud team |

---

## What ProSiddhi explicitly does NOT need or use

To prevent over-provisioning, here is what the project team explicitly does NOT use:

- **No Redis / no caching layer** — JWT auth is stateless, chat is polling-based. (Reasons in §9.)
- **No WebSockets / no real-time transport** — polling is final for v1. No socket gateway needed.
- **No Aadhaar / UIDAI integration** — removed from product entirely (Q3/Q4 revoked 2026-05-09).
- **No escrow / no platform-handled payments** between worker and employer — out of scope forever. Razorpay only handles **subscription** payments from employers to Azkashine.
- **No PCI scope** — card data never touches our infrastructure (Razorpay-hosted checkout).
- **No HIPAA / no SOC2 / no ISO 27001** — not required for v1.
- **No multi-region deployment** — single Indian region (asia-south1) is acceptable for v1.
- **No microservice split** — monolith BE.
- **No CMEK / customer-managed keys** — Google-managed encryption keys are acceptable for v1.
- **No multi-factor authentication** — not required for v1, including for admin users.
- **No formal SOC** / 24x7 ops — business-hours support model.

---

## Open items the cloud team should ask the project team about

1. Domain procurement status (Shaik) — needed for SSL + DNS.
2. Expected formal launch / promotion date — for capacity planning.
3. UAT user load (how many testers, what timeframe) — for UAT sizing.
4. Whether Cloud Build or GitHub Actions for CI (SETUP-GAPS #3 still open project-side).
5. Budget envelope — Shaik to confirm monthly cap.

---

*Prepared by the ProSiddhi project team. For questions or clarifications on any line above, contact Nazir Hasan (biz-ops@azkashine.com). DevOps and cloud-architecture decisions remain entirely with the cloud team — items marked OPEN above are for them to fill.*
