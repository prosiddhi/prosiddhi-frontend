# ProSiddhi — Web App

The ProSiddhi Job Portal web frontend (seeker + employer + admin), built with **Next.js 14 (App Router)**, TypeScript, and Tailwind CSS.

This is a **standalone repository** — it was extracted from the `job-portal-fe` monorepo (`apps/web`) and is now the canonical home for the web frontend.

> **Deploy note for DevOps:** this app is **NOT a static export**. It uses Next.js built-in `i18n` routing, `headers()`, `redirects()`, and image optimization — all of which require a **running Node.js server**. Deploy it as a container / Cloud Run service (`next start` or the standalone server in the Dockerfile), not a static bucket.

## Tech stack

- Next.js 14.2.x (App Router, Node server runtime)
- React 18, TypeScript 5
- Tailwind CSS, Radix UI primitives, lucide-react
- TanStack Query + Zustand (state), Axios (HTTP), react-hook-form + Zod (forms)

## Prerequisites

- Node.js >= 18.17
- npm (this repo uses plain npm — no pnpm/workspace tooling)

## Local development

```bash
npm install
cp .env.example .env.local      # then edit values (see below)
npm run dev                     # http://localhost:3000
```

The app talks to the backend API. Point it at your backend:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

If `NEXT_PUBLIC_API_URL` is unset, the app falls back to `http://localhost:5000/api`.

## Environment variables

Only the `NEXT_PUBLIC_*` variables are consumed by this frontend (they are inlined into the client bundle **at build time**, so they must be present when you run `npm run build` / build the Docker image — not just at runtime):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g. `https://api.<domain>/api`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of this web app |
| `NEXT_PUBLIC_ENABLE_VOICE_SEARCH` | Feature flag |
| `NEXT_PUBLIC_ENABLE_SKILL_VERIFICATION` | Feature flag |

> The other keys in `.env.example` (`DATABASE_URL`, `RAZORPAY_*`, `AWS_*`, `REDIS_URL`, `NEXTAUTH_*`, etc.) are **backend concerns** carried over from the original template. The web app does not read them — they can be ignored or pruned. **Do not put real secrets in this repo.**

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build (emits `.next/standalone`) |
| `npm start` | Run the production build (`next start`) |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check (no emit) |

## Production build (no Docker)

```bash
npm ci
NEXT_PUBLIC_API_URL=https://api.<domain>/api npm run build
npm start            # serves on PORT (default 3000)
```

## Container build (Cloud Run / GKE)

The included `Dockerfile` builds the standalone server (`output: 'standalone'` in `next.config.js`).

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.<domain>/api \
  -t prosiddhi-web .

docker run -p 3000:3000 prosiddhi-web
```

Because `NEXT_PUBLIC_*` values are baked in at build time, each environment (dev/uat/prod) needs its own image built with that environment's `NEXT_PUBLIC_API_URL`.

## Project structure

```
src/
  app/        Next.js App Router pages (seeker, employer, admin, auth, ...)
  lib/        API client (lib/api.ts) and shared utilities
public/       Static assets (favicon, images)
```
