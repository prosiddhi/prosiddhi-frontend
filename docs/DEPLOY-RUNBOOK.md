# ProSiddhi — Corrected Deploy Runbook (backend + frontend, Vodafone VM)

This runbook supersedes the matching sections of `deployment-guide-vodafone-vm.md` for
the **backend** (`prosiddhi-backend`) and **web portal** (`prosiddhi-frontend`). It folds
in the code fixes made on 2026-06-25 and the corrections found while verifying the guide
against the actual code. Admin console is a separate repo, not covered here.

---

## 0. Code changes already made in the repos (commit these before deploy)

| Change | File | Why |
|---|---|---|
| `UPLOAD_DIR` is now honored for **both** writing and serving uploads | `prosiddhi-backend/src/config/multer.ts`, `src/index.ts` | Previously hardcoded to `<cwd>/uploads`; the env var did nothing. Now `path.resolve(process.env.UPLOAD_DIR \|\| 'uploads')`. |
| Documented `BASE_URL` (already read by code, was missing from example) | `prosiddhi-backend/.env.example` | `getFileUrl()` builds absolute file URLs from `BASE_URL`; unset → URLs point at `http://localhost:5000`. |
| Clarified `MAX_FILE_SIZE` is informational (cap fixed at 5 MB in code) | `prosiddhi-backend/.env.example` | Multer hardcodes the 5 MB limit. |

No frontend code changes were needed.

---

## 1. Things the original guide got wrong (read once)

1. **`.env` IS auto-loaded.** `src/index.ts` calls `dotenv.config()`, so `node dist/index.js`
   loads `.env` from its working directory. The `npx dotenv -e .env -- …` wrapper is
   **not needed** — but PM2 **must** start the API with `cwd` = the backend repo root.
2. **No Prisma migrations exist** in the repo (`prisma/` has only `schema.prisma`). So
   `prisma migrate deploy` applies nothing and **creates no tables**. See §4 for the two
   supported options (baseline migration, or `db push`).
3. **`CORS_ORIGIN` is not read by code** — the API allows all origins (`app.use(cors())`).
   Restricting CORS needs a backend change (coordinate with Asrar); treat the guide's
   `CORS_ORIGIN` as a TODO, not a working setting.
4. **`UPLOAD_DIR` / `MAX_FILE_SIZE`** — fixed/clarified per §0 above.

---

## 2. Backend — `prosiddhi-api` (port 5000)

```bash
sudo -u prosiddhi -i
cd /opt/prosiddhi && git clone <prosiddhi-backend repo> && cd prosiddhi-backend
npm ci

# --- env file (chmod 600) ---
cat > .env <<'ENV'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://prosiddhi_app:<password>@<host>:5432/job_portal?schema=public
JWT_SECRET=<run: openssl rand -base64 48>      # MUST be >= 32 chars or the API won't boot
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/opt/prosiddhi/data/uploads         # absolute, on the persistent disk
BASE_URL=https://api.<domain>                  # REQUIRED — used in uploaded-file URLs
ENV
chmod 600 .env

# ensure the persistent uploads dir exists and is owned by the app user
mkdir -p /opt/prosiddhi/data/uploads

npm run build      # = dotenv -e .env -- prisma generate && tsc  (needs .env present — it is)
```

### Create the schema (pick ONE — see §4), then start under PM2

```bash
# Start with cwd = repo root so dotenv.config() and the uploads path resolve.
pm2 start dist/index.js --name prosiddhi-api --cwd /opt/prosiddhi/prosiddhi-backend
pm2 save

curl http://localhost:5000/health     # -> {"status":"healthy", ...}
```

---

## 3. Web portal — `prosiddhi-web` (port 3000)

`NEXT_PUBLIC_API_URL` is baked in at **build time** (it falls back to
`http://localhost:5000/api` if missing — `src/lib/api.ts`). Set it **before** building and
**rebuild** whenever it changes.

```bash
cd /opt/prosiddhi && git clone <prosiddhi-frontend repo> && cd prosiddhi-frontend
npm ci
cat > .env.local <<'ENV'
NEXT_PUBLIC_API_URL=https://api.<domain>/api
ENV
npm run build                                  # bakes the API URL in
pm2 start "npm run start -- -p 3000" --name prosiddhi-web --cwd /opt/prosiddhi/prosiddhi-frontend
pm2 save
```

> Only `NEXT_PUBLIC_API_URL` is actually consumed today. The other keys in the repo's
> `.env.example` (NEXTAUTH, AWS S3, Razorpay, Redis, Sentry, Google Maps) are unused
> placeholders — ignore them for this deploy.

---

## 4. Database schema — two supported options

The repo ships **no migrations**, so plain `prisma migrate deploy` does nothing. Choose one:

### Option A (recommended for MVP / single env): `db push`
Syncs the schema straight to the DB. Matches how the repo is built (`prisma:push`).
```bash
cd /opt/prosiddhi/prosiddhi-backend
npx prisma db push           # creates all tables from schema.prisma
```

### Option B (versioned migrations): create a one-time baseline, then deploy
Run on the VM (Node 20 is installed). This is the "proper" path for a shared DB.
```bash
cd /opt/prosiddhi/prosiddhi-backend
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty \
    --to-schema-datamodel prisma/schema.prisma --script \
    > prisma/migrations/0_init/migration.sql      # generates init SQL offline, no DB needed

# Fresh DB (no tables yet):
npx prisma migrate deploy                          # applies 0_init

# OR if you already ran `db push` above and tables exist:
# npx prisma migrate resolve --applied 0_init      # marks baseline as applied, no re-run
```
> Commit `prisma/migrations/0_init/` back to the repo so future migrations stack on it.
> (Couldn't be generated on the app team's Windows box — no Node installed there.)

### Seed catalog data (sectors / designations / skills)
`package.json` has `npm run prisma:seed` → `tsx prisma/seed.ts`, but **`prisma/seed.ts` is
absent**. Get the seed source from **Asrar** before go-live, drop it in, then:
```bash
npm run prisma:seed          # needs dev deps (tsx) — run after `npm ci`, not `npm ci --omit=dev`
```

---

## 5. Nginx — uploads path must match `UPLOAD_DIR`

The `/uploads/` alias must point at the **same** directory as `UPLOAD_DIR`:
```nginx
location /uploads/ { alias /opt/prosiddhi/data/uploads/; add_header X-Content-Type-Options nosniff; }
```
Everything else in the guide's §8 (proxy_pass to :5000/:3000, `client_max_body_size 6m`,
TLS via certbot) is correct.

---

## 6. Deploy order (corrected)

1. Provision VM + firewall (guide §2–3); install Node 20, PM2, Nginx, PostgreSQL 17.
2. Create DB + app user (guide §4).
3. Backend: `npm ci` → write `.env` (incl. **BASE_URL**, absolute **UPLOAD_DIR**) → `npm run build`.
4. Create schema: **`db push`** (Option A) or baseline migration (Option B) — §4.
5. (When seed file lands from Asrar) `npm run prisma:seed`.
6. `pm2 start dist/index.js --cwd <repo>` → verify `:5000/health`.
7. Frontend: set `NEXT_PUBLIC_API_URL=https://api.<domain>/api` → `npm run build` → `pm2 start`.
8. Nginx for `api.` + `app.` hosts + `/uploads` alias matching `UPLOAD_DIR`; DNS + TLS.
9. Bootstrap first admin: `POST https://api.<domain>/api/admin/create` (open until first admin exists).
10. `pm2 save` + confirm `pm2 startup` so both apps survive reboot.

## 7. Still open (not code-blocking, but track)
- **CORS** stays wide open until Asrar wires `CORS_ORIGIN` into `app.use(cors())`.
- **Admin console** (`prosiddhi-admin`, :3001) is a separate repo — deploy per the main guide.
