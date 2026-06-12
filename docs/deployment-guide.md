# ProSiddhi — DevOps Deployment Guide

**Audience:** Cloud / DevOps team (Nayan + cloud team).
**Purpose:** Exact configuration and step-by-step guidance to deploy ProSiddhi (Frontend + Backend + Database) to Google Cloud. The single deployment doc (the earlier `gcp-deployment-info` requirements-input was consolidated into this guide on 2026-06-13).
**Prepared by:** Application team (Nazir, FE+PM). DevOps owns all cloud-architecture decisions; items marked **[DECIDE]** are yours.

> **Source of truth:** values below come from the actual code in `prosiddhi-frontend` and `prosiddhi-backend`. Where a value is a recommendation, it's marked **[rec]**; where it's your call, **[DECIDE]**.

---

## 1. What you're deploying — three services, not one

The frontend is a browser client; it does nothing without the backend, and the backend does nothing without the database. A working environment is **three tiers**:

```
   Cloud Run                 Cloud Run                  Cloud SQL
┌───────────────┐  HTTPS   ┌───────────────┐  TCP/SSL ┌───────────────┐
│ prosiddhi-web │ ───────▶ │ prosiddhi-api │ ───────▶ │  PostgreSQL 17 │
│  (Next.js 14) │ ◀─────── │  (Express 5)  │ ◀─────── │   (job_portal) │
└───────────────┘  JSON    └───────┬───────┘          └───────────────┘
                                   │ file uploads (audio, docs, pics)
                                   ▼
                          Cloud Storage bucket  ← REQUIRED (see §7)
```

| Service | Repo | Runtime | Port |
|---|---|---|---|
| Frontend | `prosiddhi-frontend` | Next.js 14 (Node server — **not** static export) | 3000 |
| Backend | `prosiddhi-backend` | Express 5 (ESM) + Prisma 6 | 5000 |
| Database | — | PostgreSQL 17 | 5432 |

**Critical:** the FE is a *standalone Node server* (it uses Next.js `i18n` routing, `headers()`, `redirects()`, image optimization). Do **not** try to serve it as a static bucket.

---

## 2. Prerequisites / decisions before you start

| Item | Value / Status |
|---|---|
| Region | **`asia-south1` (Mumbai)** [rec] — DPDP Act 2023 data residency |
| GCP project | **[DECIDE]** — new project per env (dev/uat/prod) recommended |
| Compute platform | **Cloud Run** [rec] — both services containerize cleanly |
| Database | **Cloud SQL for PostgreSQL 17** [rec] (AlloyDB optional) |
| Container registry | **Artifact Registry** |
| Secrets | **Secret Manager** (required — see §8) |
| File storage | **Cloud Storage** (required — see §7) |
| CI/CD | **[DECIDE]** — GitHub Actions or Cloud Build (both repos on GitHub) |

---

## 3. Database — Cloud SQL (PostgreSQL 17)

1. Create a **Cloud SQL for PostgreSQL 17** instance in `asia-south1`.
   - Tier: start small (e.g. `db-custom-1-3840` = 1 vCPU / 3.75 GB) [rec]; scale later.
   - Storage: 10 GB SSD to start (auto-increase on).
   - **HA:** regional for PROD; zonal for DEV/UAT.
   - Backups: daily automated, 7-day retention (UAT/DEV), 30-day (PROD) [rec].
2. Create database **`job_portal`** and an application user (read/write).
3. Enforce **SSL/TLS** for connections; keep the instance **private** (no public IP) and reach it from Cloud Run via the **Cloud SQL connector / VPC connector**.
4. The connection string the backend expects (Prisma format):
   ```
   DATABASE_URL="postgresql://<user>:<password>@<host>:5432/job_portal?schema=public"
   ```
   For the Cloud SQL connector, use the socket form Prisma supports, e.g.:
   ```
   DATABASE_URL="postgresql://<user>:<password>@localhost/job_portal?host=/cloudsql/<PROJECT>:<REGION>:<INSTANCE>&schema=public"
   ```

**Schema creation / migrations** (run once per env, from the backend, against this DB):
```bash
# preferred for shared/managed DBs — applies committed migrations:
npx prisma migrate deploy
# (the repo currently uses `prisma db push` for local dev; for managed
#  environments use `migrate deploy` so changes are versioned & repeatable)
```
> Seed data: 14 `.xlsx` files of job designations/sectors load into category tables via a one-time seed script. Coordinate with the backend owner (Asrar) on the seed step.

---

## 4. Backend — `prosiddhi-api` (Cloud Run)

### 4.1 The backend has NO Dockerfile — add this one

Create `Dockerfile` in the `prosiddhi-backend` repo root:

```dockerfile
# syntax=docker/dockerfile:1
# ProSiddhi Backend — Express 5 (ESM) + Prisma 6

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client must be generated before tsc; `npm run build` does both
# (it runs `prisma generate && tsc`). DATABASE_URL is NOT needed at build time
# for `prisma generate`, but the build script loads .env via dotenv — pass a
# dummy if your CI lacks one, or adjust the build script to not require dotenv.
RUN npx prisma generate && npx tsc

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY package.json ./
USER nodejs
EXPOSE 5000
ENV PORT=5000
CMD ["node", "dist/index.js"]
```

> Note: the repo's `build`/`prisma:*` scripts wrap commands in `dotenv -e .env`. In CI there is no `.env`; either (a) provide build-time env, or (b) call `npx prisma generate && npx tsc` directly as shown above. Confirm the Prisma client output path (`src/generated/prisma`) ships into the image.

### 4.2 Cloud Run service config

| Setting | Value |
|---|---|
| Service name | `prosiddhi-api` [rec] |
| Region | `asia-south1` |
| CPU / Memory | **1 vCPU / 1 GB** [rec] |
| Min / Max instances | min 1 (avoid cold starts on API), max 10 [rec] |
| Concurrency | 80 (default) [DECIDE] |
| Ingress | Public (the FE calls it) |
| Port | **5000** |
| Health check | `GET /health` → returns `{ status: "healthy" }` (exists in code ✓) |
| Cloud SQL connection | attach the instance / VPC connector |

### 4.3 Backend environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Cloud SQL Postgres connection string (§3). **Secret.** |
| `JWT_SECRET` | ✅ | **MUST be ≥ 32 characters** — the BE refuses to boot otherwise (`src/utils/jwt.ts`). Generate: `openssl rand -base64 48`. **Secret.** |
| `JWT_EXPIRES_IN` | ✅ | `7d` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `5000` |
| `MAX_FILE_SIZE` | ✅ | `5242880` (5 MB) |
| `UPLOAD_DIR` | ✅ | `uploads` (but see §7 — local disk is ephemeral on Cloud Run) |

> **Integration keys** (MSG91, Razorpay, Google OAuth, OpenAI, FCM) — full list in `docs/security-spec.md`. Add them only as those features are enabled; they're not required for the core API to boot.

---

## 5. Frontend — `prosiddhi-web` (Cloud Run)

The FE repo already has a `Dockerfile` (multi-stage, standalone output) and `.dockerignore`.

### 5.1 ⚠️ The build-time gotcha — read this first

`NEXT_PUBLIC_*` values are **inlined into the JS bundle at BUILD time**, not read at runtime. This means:

- You **cannot** change the backend URL by setting an env var on the running Cloud Run service. It has no effect.
- The API URL must be passed **as a Docker build arg** when you build the image.
- **Each environment (dev/uat/prod) needs its own image**, built with that env's API URL.

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.<your-domain>/api \
  -t <region>-docker.pkg.dev/<project>/<repo>/prosiddhi-web:<tag> .
```

> **If the FE is already live and showing errors / blank data, this is almost certainly why** — it was likely built without `NEXT_PUBLIC_API_URL`, so it's calling `http://localhost:5000/api`. Rebuild with the real backend URL.

### 5.2 Cloud Run service config

| Setting | Value |
|---|---|
| Service name | `prosiddhi-web` [rec] |
| CPU / Memory | **0.5 vCPU / 512 MB** [rec] |
| Min / Max instances | min 1, max 10 [DECIDE] |
| Ingress | Public |
| Port | **3000** |

### 5.3 Frontend build args / env

| Variable | When | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **build time** | `https://api.<domain>/api` (note the `/api` suffix) |
| `NEXT_PUBLIC_APP_URL` | build time | `https://app.<domain>` |

---

## 6. Deployment order (runbook)

Do this **in order** — each step depends on the previous:

1. **Provision Cloud SQL** (§3) → note the connection string.
2. **Create the database `job_portal`** + app user.
3. **Run migrations** (`prisma migrate deploy`) against it → tables exist.
4. **Build + push the backend image** (§4.1).
5. **Deploy `prosiddhi-api`** with secrets + Cloud SQL connection (§4.2–4.3) → verify `GET https://api.<domain>/health` returns healthy.
6. **Build the frontend image** with `--build-arg NEXT_PUBLIC_API_URL=https://api.<domain>/api` (§5.1).
7. **Deploy `prosiddhi-web`** (§5.2) → open it, confirm it loads data from the API.
8. **Wire DNS + SSL** (§9).
9. **Restrict CORS** to the FE origin (§10) and redeploy the API.

---

## 7. File storage — REQUIRED change (uploads break on Cloud Run)

⚠️ The backend writes uploads to **local disk** via `multer.diskStorage` → `process.cwd()/uploads` (`src/config/multer.ts`). Cloud Run instances are **ephemeral and stateless** — any uploaded file (audio messages, employer documents, profile pictures) is **lost on restart, redeploy, or scale-out**, and isn't shared across instances.

**Options:**
- **[rec] Migrate uploads to Cloud Storage** — one bucket (or per-type buckets: `prosiddhi-<env>-audio`, `prosiddhi-<env>-docs-private`, `prosiddhi-<env>-profile-pics`). Requires a small backend change to swap `multer.diskStorage` for a GCS adapter + presigned URLs. **Coordinate with Asrar.**
- **Interim only:** mount a persistent volume / single-instance — not recommended beyond a demo.

This is a **launch blocker for any feature that uploads files.** Flag it early.

---

## 8. Secrets — Secret Manager

Never bake these into images or plain env. Store in **Secret Manager**, grant the Cloud Run service account `secretAccessor`:

- `DATABASE_URL`
- `JWT_SECRET`
- (later) `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `MSG91_AUTH_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET`, `OPENAI_API_KEY`, `FCM_SERVER_KEY`

Non-secret config (`NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `MAX_FILE_SIZE`) can be plain env vars.

---

## 9. DNS & SSL

| Host | Points to |
|---|---|
| `app.<domain>` (or apex) | `prosiddhi-web` |
| `api.<domain>` | `prosiddhi-api` |

- Procure the domain (**[DECIDE]** — pending Shaik).
- Use **Google-managed SSL certs** [rec]; automate renewal.
- All public endpoints **HTTPS only** (443).

---

## 10. CORS

The backend currently allows **all origins** (`app.use(cors())` in `src/index.ts`). Fine to launch, but for production restrict it to the FE origin. Coordinate with Asrar to set an allowed-origins list driven by an env var, e.g. `CORS_ORIGIN=https://app.<domain>`.

---

## 11. Environment matrix

| | DEV | UAT | PROD |
|---|---|---|---|
| Cloud SQL HA | zonal | zonal | **regional** |
| Min instances | 0 (cost) | 1 | 1 |
| FE image build arg | dev API URL | uat API URL | prod API URL |
| Backups retention | 7d | 7d | 30d |
| Secrets | per-env Secret Manager entries | | |

> Because the FE bakes the API URL at build time, **build a separate FE image per environment.**

---

## 12. Monitoring & health

- **Uptime check:** `GET /health` on the API every 60s.
- **Logging:** the BE uses Winston (structured logs to stdout) → flows into Cloud Logging automatically on Cloud Run.
- **Alerts** [rec]: API 5xx rate > 1%, p95 latency > 2s, DB CPU > 80%.

---

## 13. Known gaps / blockers to raise

1. **BE has no Dockerfile** → use §4.1.
2. **FE build-time API URL** → rebuild if already deployed pointing at localhost (§5.1).
3. **Uploads on local disk** → must move to Cloud Storage before file features work (§7).
4. **CORS wide open** → restrict for prod (§10).
5. **Migrations:** repo uses `prisma db push` for local dev; switch to `migrate deploy` for managed envs (§3).
6. **Domain not procured** → blocks DNS/SSL (§9).

---

## 14. Quick reference — all environment variables

**Backend (`prosiddhi-api`):**
```
DATABASE_URL=postgresql://<user>:<pwd>@<host>/job_portal?schema=public   # secret
JWT_SECRET=<≥32 chars, openssl rand -base64 48>                          # secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=5000
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
# later, per feature: MSG91_AUTH_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
# RAZORPAY_WEBHOOK_SECRET, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
# OPENAI_API_KEY, FCM_SERVER_KEY
```

**Frontend (`prosiddhi-web`) — BUILD ARGS, not runtime:**
```
NEXT_PUBLIC_API_URL=https://api.<domain>/api
NEXT_PUBLIC_APP_URL=https://app.<domain>
```

---

*Questions on any backend specifics (Dockerfile, migrations, uploads-to-GCS change) → Asrar (BE). Infra/cloud decisions → Nayan + cloud team. App-side contact: Nazir (biz-ops@azkashine.com).*
