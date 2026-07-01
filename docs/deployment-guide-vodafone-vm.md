# ProSiddhi — Deployment Guide (Vodafone Cloud · traditional Linux VMs)

**Audience:** Cloud / DevOps team (Nayan + Vodafone Cloud team).
**Purpose:** Exact configuration + step-by-step to deploy ProSiddhi to **traditional Linux VMs** on **Vodafone Cloud** (IaaS) — *not* a managed-container platform. Covers all three deployable services: the **backend API**, the **web portal** (seeker + employer), and the **admin console**.
**Prepared by:** Application team (Nazir, FE+PM). DevOps owns all cloud/infra decisions; items marked **[DECIDE]** are yours, **[CONFIRM]** = confirm what Vodafone Cloud offers, **[rec]** = our recommendation.

> **Source of truth:** ports, build commands, env vars below come from the actual code in `prosiddhi-backend`, `prosiddhi-frontend`, `prosiddhi-admin`. This guide supersedes `deployment-guide.md` (GCP/Cloud Run) now that we're on Vodafone VMs.

---

## 1. What you're deploying — three Node services + one database

```
                         ┌──────────────────────── VM(s) ─────────────────────────┐
   Browser  ──HTTPS──▶   │   Nginx (80/443, TLS)                                    │
                         │     ├── app.<domain>    ──▶ prosiddhi-web    (Next.js :3000) │
                         │     ├── admin.<domain>  ──▶ prosiddhi-admin  (Next.js :3001) │
                         │     └── api.<domain>    ──▶ prosiddhi-api    (Express :5000) │
                         │                                   │                      │
                         │                                   ▼                      │
                         │                       PostgreSQL 17  (:5432, localhost)  │
                         │                       uploads/  (persistent disk)        │
                         └──────────────────────────────────────────────────────────┘
```

| # | Service | Repo | Runtime | Internal port | Public host [rec] |
|---|---|---|---|---|---|
| 1 | Backend API | `prosiddhi-backend` | Express 5 (ESM) + Prisma 6, Node 20 | **5000** | `api.<domain>` |
| 2 | Web portal | `prosiddhi-frontend` | Next.js 14 (Node server, **not** static) | **3000** | `app.<domain>` (or apex) |
| 3 | Admin console | `prosiddhi-admin` | Next.js 14 (Node server) | **3001** | `admin.<domain>` |
| 4 | Database | — | PostgreSQL 17 | 5432 (localhost only) | — |

**Critical:** both Next.js apps are *standalone Node servers* (they use i18n routing, `headers()`, redirects, image optimization). Do **not** serve them as static files. Run each with `next start` behind Nginx.

---

## 2. Topology — how many VMs

| Option | Layout | When | Notes |
|---|---|---|---|
| **A — single VM** [rec for DEV/UAT] | All 3 Node apps + Nginx + PostgreSQL on one VM | dev / UAT / small prod | Simplest. uploads on local disk "just works." |
| **B — two VMs** [rec for PROD] | VM-app (3 Node apps + Nginx) · VM-db (PostgreSQL) | production | DB isolated, independently backed up/snapshotted. |
| **C — scale-out** | LB → N app VMs · DB VM · **shared storage** for uploads | high load (later) | Needs NFS / object storage for `uploads/` (see §7) + a load balancer **[CONFIRM Vodafone]**. |

**Recommended VM sizing** (Ubuntu 22.04 LTS [rec]):

| Role | vCPU | RAM | Disk | Notes |
|---|---|---|---|---|
| App VM (3 Node apps + Nginx) | 2 | 4 GB | 40 GB SSD | Next build is memory-hungry — 4 GB min; 2 GB will OOM during `npm run build`. |
| DB VM (Option B) | 2 | 4 GB | 50 GB SSD (grows with uploads if co-located) | Enable disk auto-grow / snapshots. |
| All-in-one (Option A) | 4 | 8 GB | 60 GB SSD | Builds + DB + 3 apps on one box. |

**Ask Vodafone Cloud for [CONFIRM]:** Ubuntu 22.04 LTS image; static **public IP**; **firewall/security-group** control; **VM snapshots** + scheduled backup; (optional) **managed PostgreSQL**, **object storage** (S3-compatible?), and a **load balancer** if going Option C.

---

## 3. Base VM setup (run on each app VM)

```bash
# 1. System
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx git curl ufw

# 2. Node.js 20 LTS  (satisfies Next 14 + Express; matches backend's node:20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v   # expect v20.x

# 3. PM2 process manager (keeps the 3 Node apps alive + restarts on reboot)
sudo npm install -g pm2
pm2 startup systemd            # follow the printed command to enable boot-start

# 4. Firewall — only HTTP/HTTPS + SSH public; app ports stay internal
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'    # 80 + 443
sudo ufw enable
# NOTE: do NOT open 3000/3001/5000/5432 publicly — Nginx proxies them on localhost.

# 5. App user (don't run as root)
sudo adduser --system --group --home /opt/prosiddhi prosiddhi
```

> **Docker alternative:** if Vodafone/your team prefers containers on the VM, the backend needs a Dockerfile (one is documented in `deployment-guide.md` §4.1) and both Next apps already build cleanly; run them with `docker compose` + the same Nginx in front. This guide assumes **native Node + PM2** as the simpler "traditional VM" path.

---

## 4. Database — PostgreSQL 17

**Self-hosted** (Option A/B) — on the DB VM (or the all-in-one VM):

```bash
sudo apt -y install postgresql-17        # add PGDG apt repo if 17 isn't in default
sudo -u postgres psql <<'SQL'
CREATE DATABASE job_portal;
CREATE USER prosiddhi_app WITH ENCRYPTED PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE job_portal TO prosiddhi_app;
SQL
```
- Keep PostgreSQL bound to **localhost** (Option A) or the **private network only** (Option B) — never expose 5432 publicly. For Option B, set `listen_addresses` to the private IP and restrict `pg_hba.conf` to the app VM's private IP (use `scram-sha-256`).
- **Managed Postgres [CONFIRM]:** if Vodafone Cloud offers a managed PostgreSQL 17, prefer it (backups/HA handled) — you only need the connection string.

**Connection string** the backend expects (Prisma):
```
DATABASE_URL="postgresql://prosiddhi_app:<password>@<host>:5432/job_portal?schema=public"
# host = localhost (Option A) or the DB VM private IP (Option B)
```

**Create the schema** (once per environment, from the backend repo on the app VM, after step 5):
```bash
cd /opt/prosiddhi/prosiddhi-backend
npx prisma migrate deploy      # [rec] versioned migrations for shared/managed DBs
# (local dev uses `prisma db push`; for servers use migrate deploy so changes are repeatable)
```
> **Seed data:** sector/designation/skills catalog loads via a one-time seed step — coordinate with the backend owner (Asrar). There is no `seed.ts` in the current clone, so confirm the seed source before go-live.

---

## 5. Backend — `prosiddhi-api` (port 5000)

```bash
sudo -u prosiddhi -i
cd /opt/prosiddhi && git clone <prosiddhi-backend repo> && cd prosiddhi-backend
npm ci
# create the env file (chmod 600 — secrets live here)
cat > .env <<'ENV'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://prosiddhi_app:<password>@<host>:5432/job_portal?schema=public
JWT_SECRET=<≥32 chars — `openssl rand -base64 48`>
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
ENV
chmod 600 .env
npm run build                  # = prisma generate && tsc → dist/
npx prisma migrate deploy      # if not already run in §4
```

**Run it under PM2 — and note the env gotcha:** the `start` script is plain `node dist/index.js` and does **not** auto-load `.env`. Inject env one of these ways:

```bash
# Simplest: wrap with dotenv-cli (already a dev dep; install globally or npx)
pm2 start "npx dotenv -e .env -- node dist/index.js" --name prosiddhi-api
# — OR — use a PM2 ecosystem file with an env block / a systemd EnvironmentFile.
pm2 save
```
- **Health check:** `curl http://localhost:5000/health` → `{ "status": "healthy" }`.
- `JWT_SECRET` **must be ≥ 32 chars** or the API refuses to boot (`src/utils/jwt.ts`).

### Backend environment variables
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection (§4). **Secret.** |
| `JWT_SECRET` | ✅ | **≥ 32 chars.** `openssl rand -base64 48`. **Secret.** |
| `JWT_EXPIRES_IN` | ✅ | `7d` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `5000` |
| `MAX_FILE_SIZE` | ✅ | `5242880` (5 MB) |
| `UPLOAD_DIR` | ✅ | `uploads` (persistent on the VM — see §7) |
| `CORS_ORIGIN` | [rec] | restrict to portal + admin origins (see §9) — coordinate with Asrar |
| *(later, per feature)* | — | `MSG91_AUTH_KEY`, `RAZORPAY_KEY_ID/_SECRET/_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_ID/_SECRET`, `OPENAI_API_KEY`, `FCM_SERVER_KEY` |

---

## 6. Web portal `prosiddhi-web` (:3000) & Admin `prosiddhi-admin` (:3001)

### ⚠️ 6.1 The build-time gotcha — read FIRST (applies to BOTH Next apps)
`NEXT_PUBLIC_*` values are **inlined into the JS bundle at BUILD time**, not read at runtime. So:
- You **cannot** change the backend URL by setting an env var on the running process — it has no effect.
- `NEXT_PUBLIC_API_URL` must be set **before `npm run build`**, and you must **rebuild** whenever it changes or you move environments.
- If an app shows blank data / network errors, it was almost certainly built without the real API URL (so it's calling `http://localhost:5000/api`). **Rebuild.**

### 6.2 Web portal
```bash
cd /opt/prosiddhi && git clone <prosiddhi-frontend repo> && cd prosiddhi-frontend
npm ci
cat > .env.local <<'ENV'
NEXT_PUBLIC_API_URL=https://api.<domain>/api
ENV
npm run build                  # bakes the API URL in
pm2 start "npm run start -- -p 3000" --name prosiddhi-web
pm2 save
```

### 6.3 Admin console
```bash
cd /opt/prosiddhi && git clone <prosiddhi-admin repo> && cd prosiddhi-admin
npm ci
cat > .env.local <<'ENV'
NEXT_PUBLIC_API_URL=https://api.<domain>/api
ENV
npm run build
pm2 start "npm run start -- -p 3001" --name prosiddhi-admin
pm2 save
```

> Both apps only need `NEXT_PUBLIC_API_URL` (the API base, **with** the `/api` suffix). Confirm each app's exact var name in its `.env.example` before building.

---

## 7. File uploads — persistent disk (easier than Cloud Run, but back it up)

The backend writes uploads (audio messages, employer docs, profile pics) to **local disk** via `multer.diskStorage` → `<cwd>/uploads`. On a **traditional VM this persists across restarts/redeploys** — so unlike Cloud Run, **no object-storage change is required** for a single app VM.

What you must still do:
- Put `uploads/` on a **persistent data disk** (not the ephemeral/boot volume if your VM separates them), e.g. `UPLOAD_DIR=/opt/prosiddhi/data/uploads`, and ensure the `prosiddhi` user owns it.
- **Back it up** (§11) — it holds user-uploaded documents.
- **Serve it through Nginx** (read-only) so the FE can load files — see §8.
- **Multi-VM (Option C) only:** local disk is NOT shared across app VMs → move `uploads/` to **NFS** or **object storage** (needs a small backend change; coordinate with Asrar). Single/two-VM setups don't need this.

---

## 8. Nginx reverse proxy + TLS

One server block per host, proxying to the local Node ports. Example:

```nginx
# /etc/nginx/sites-available/prosiddhi.conf
server {                                   # API
  server_name api.<domain>;
  client_max_body_size 6m;                 # allow ≤5 MB uploads + headroom
  location / { proxy_pass http://127.0.0.1:5000; include proxy_params; }
  # serve uploaded files directly off disk (read-only)
  location /uploads/ { alias /opt/prosiddhi/data/uploads/; add_header X-Content-Type-Options nosniff; }
}
server {                                   # Web portal
  server_name app.<domain>;
  location / { proxy_pass http://127.0.0.1:3000; include proxy_params; }
}
server {                                   # Admin
  server_name admin.<domain>;
  location / { proxy_pass http://127.0.0.1:3001; include proxy_params; }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/prosiddhi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# TLS: Let's Encrypt (free, auto-renew) — or install Vodafone/corporate certs instead
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d api.<domain> -d app.<domain> -d admin.<domain>
```
- Force HTTPS (certbot adds the redirect). All public traffic on **443** only.
- `proxy_params` should forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.

---

## 9. CORS
The backend currently allows **all origins** (`app.use(cors())`). For production, restrict to the portal + admin origins — coordinate with Asrar to read an allow-list from env:
```
CORS_ORIGIN=https://app.<domain>,https://admin.<domain>
```

---

## 10. Deployment order (runbook)
Do in order — each step depends on the previous:
1. Provision VM(s) + firewall (§2–3).
2. Install & configure **PostgreSQL**, create `job_portal` + app user (§4).
3. Deploy **backend** → `npm ci && build`, set `.env`, `prisma migrate deploy`, `pm2 start` → verify `:5000/health` (§5).
4. Build + start **web portal** with `NEXT_PUBLIC_API_URL=https://api.<domain>/api` (§6.2).
5. Build + start **admin** with the same API URL (§6.3).
6. Configure **Nginx** for the 3 hosts + `/uploads` (§8).
7. Point **DNS** A-records (`api`, `app`, `admin`) at the VM's public IP; issue **TLS** certs (§8).
8. Restrict **CORS** to the real origins and restart the API (§9).
9. **Bootstrap the first admin:** `POST https://api.<domain>/api/admin/create` (open only until the first admin exists), then log in at the admin console.
10. `pm2 save` + confirm `pm2 startup` so all 3 apps survive a reboot.

### Update / redeploy (per app)
```bash
cd /opt/prosiddhi/<repo> && git pull && npm ci
# backend: npm run build && npx prisma migrate deploy && pm2 restart prosiddhi-api
# next apps: npm run build && pm2 restart prosiddhi-web   (or prosiddhi-admin)
```
> Remember: changing `NEXT_PUBLIC_API_URL` requires a **rebuild**, not just a restart.

---

## 11. Backups & disaster recovery
- **Database:** nightly `pg_dump` cron → off-VM storage; keep 7 days (UAT) / 30 days (PROD) [rec].
  `0 2 * * * pg_dump -U prosiddhi_app job_portal | gzip > /backups/job_portal_$(date +\%F).sql.gz`
- **Uploads:** nightly `tar`/`rsync` of `uploads/` to off-VM storage.
- **VM snapshots:** schedule via Vodafone Cloud **[CONFIRM]** (covers OS + app + uploads in one shot).
- Document a **restore test** at least once before go-live.

## 12. Security hardening (VM-specific)
- Run apps as the non-root `prosiddhi` user; `.env` files `chmod 600`.
- `ufw`: only 22/80/443 public; DB + app ports never exposed.
- SSH: key-based only, disable password auth; consider `fail2ban`.
- Keep `JWT_SECRET`/`DATABASE_URL` out of git; rotate if leaked.
- Nginx: add security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`), and serve `/uploads` with `nosniff`.
- DPDP/data-residency: keep VMs + backups **in-region [CONFIRM]**.
- Auth tokens are in `localStorage` today (BR-2 to move to httpOnly cookie later); the `GET /profile` password-hash leak (BR-8) is an open BE fix — note both for the security review.

## 13. Monitoring & logs
- **Health:** uptime check `GET https://api.<domain>/health` every 60s.
- **Logs:** `pm2 logs`; install `pm2-logrotate` to cap size; Next/Express also log to stdout (captured by PM2). Forward to a central log store if Vodafone offers one **[CONFIRM]**.
- **Alerts [rec]:** API 5xx > 1%, p95 latency > 2s, DB CPU/disk > 80%, VM disk > 80% (uploads grow).

---

## 14. Known gaps / things to raise
1. **Backend `start` doesn't load `.env`** → run via `dotenv -e .env -- node dist/index.js`, a PM2 env block, or a systemd `EnvironmentFile` (§5).
2. **Next.js API URL is build-time** → rebuild both apps if the URL changes (§6.1).
3. **No `seed.ts` in the backend clone** → confirm the catalog seed source with Asrar before go-live (§4).
4. **CORS wide open** → restrict for prod (§9).
5. **Migrations:** repo uses `prisma db push` for local dev → use `prisma migrate deploy` on servers (§4).
6. **Uploads on local disk** → fine for single/two-VM; needs shared storage only if you scale to multiple app VMs (§7).
7. **Domain + TLS cert source** → procure domain (**[DECIDE]** pending Shaik) and decide Let's Encrypt vs corporate certs.
8. **First admin bootstrap** → `POST /api/admin/create` is open only until one admin exists (§10 step 9).

---

## 15. Quick reference — env vars
**Backend (`.env`, runtime — secrets):**
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://prosiddhi_app:<pwd>@<host>:5432/job_portal?schema=public   # secret
JWT_SECRET=<≥32 chars>                                                               # secret
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/opt/prosiddhi/data/uploads
CORS_ORIGIN=https://app.<domain>,https://admin.<domain>
```
**Web portal & Admin (`.env.local`, BUILD-TIME — rebuild on change):**
```
NEXT_PUBLIC_API_URL=https://api.<domain>/api
```

---
*Backend specifics (env loading, migrations, uploads, CORS env) → Asrar (BE). Infra/VM/network/backup decisions → Nayan + Vodafone Cloud team. App-side contact: Nazir (biz-ops@azkashine.com). Supersedes the GCP guide (`deployment-guide.md`) for the Vodafone VM target.*
