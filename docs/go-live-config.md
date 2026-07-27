# ProSiddhi — Go-Live Dependency Checklist

**What must be set/registered before each surface can go to production.** Grounded in the actual
code (env vars the code reads, external services it calls) as of **2026-07-27** — not the stale
`.env.example` templates. Companion to `DEPLOY.md` and `STATUS.md`.

Legend: ✅ done · ⏳ in progress / partially done · ❌ not started · 🔒 secret

---

## 0. The one cross-cutting blocker — a real HTTPS domain

Several things **cannot work over `http://<IP>:port`** and need a proper **HTTPS domain**
(e.g. `prosiddhi.com` / `api.prosiddhi.com` pointed at the app):

- **Google OAuth** — Google rejects raw IPs and non-HTTPS as Authorized JavaScript origins (only `localhost` is exempt). Google login is blocked until this exists.
- **Meta / WhatsApp** business verification checks a real HTTPS website.
- **Mobile web-checkout** — the app only enables it when `WEB_BASE_URL` starts with `https://` (`app_config.dart`).
- **Secure cookies / general trust** — the JWT-in-localStorage → httpOnly-cookie hardening also needs HTTPS.

**Action:** put the app behind HTTPS on a real domain (reverse proxy + TLS) before Google login, WhatsApp, and mobile checkout can be considered live.

---

## 1. Backend — the shared config that powers every surface

All on the deployed backend's environment. This is where most go-live work is.

| Area | Env / action | Status | Notes |
|---|---|---|---|
| **Core** | `DATABASE_URL`, JWT secret, `BASE_URL`, `FRONTEND_URL`, `NODE_ENV=production` | ⏳ | `NODE_ENV=production` is **security-critical** — otherwise OTPs echo in API responses |
| **Email (MSG91)** 🔒 | `MSG91_AUTH_KEY`, `MSG91_EMAIL_DOMAIN=mail.prosiddhi.com`, `MSG91_EMAIL_FROM=noreply@mail.prosiddhi.com`, `MSG91_EMAIL_TEMPLATE_ID=prosiddhi_transactional`, `NOTIFY_EMAIL_ENABLED=true` | ⏳ | Code done + committed (`e7be075`). Needs: env set on server + **whitelist server IP `103.225.224.149` on the MSG91 key** + template Approved |
| **SMS (MSG91 + DLT)** 🔒 | `MSG91_SMS_TEMPLATE_ID`, `MSG91_SMS_SENDER_ID` | ❌ | Blocked on **DLT registration** — `PRSDHI` header + `Service Implicit` templates. Packet ready; needs signatory + ₹5,900. Phone-OTP registration doesn't work until this (or a bridge route) lands |
| **WhatsApp (MSG91 + Meta)** 🔒 | `MSG91_WHATSAPP_NUMBER`, `MSG91_WHATSAPP_TEMPLATE_NAME` | ❌ | Blocked on **Meta business verification** + approved utility templates. WhatsApp OTP is dead (Meta-gated); utility notifications only |
| **Push (FCM)** 🔒 | `FCM_SERVICE_ACCOUNT` (service-account JSON) | ❌ | Needs a Firebase project. Push SKIPs silently until set |
| **Razorpay** 🔒 | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | ❌ | See §5 — the one that **refuses to boot** if misconfigured |
| **GST / invoices** | `COMPANY_GSTIN=29ABBCA8287G1ZA`, `COMPANY_NAME=AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED`, `COMPANY_GST_STATE=Karnataka` | ⏳ | Values now known (from the legal docs). **Required to render any invoice PDF** |
| **Google OAuth** 🔒 | `GOOGLE_CLIENT_ID` (must MATCH the web's `NEXT_PUBLIC_GOOGLE_CLIENT_ID`), `GOOGLE_CLIENT_SECRET` | ❌ | + Google Console: authorize the HTTPS origin (§0). Client ID public; secret is secret |
| **OpenAI (content scan)** 🔒 | `OPENAI_API_KEY` | optional | Absent → scan runs the India scam-regex layer only, degrades gracefully |

---

## 2. Web (portal) — `prosiddhi-frontend`

The app reads only **two** browser env vars:

| Env | Value for prod | Status |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | the prod backend API base (e.g. `https://api.prosiddhi.com/api`) | ⏳ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the Google OAuth client ID (same as backend's `GOOGLE_CLIENT_ID`) | ⏳ value in `.env.example`; confirm it's the production client |

Also: the landing page is live at `https://prosiddhi.com` ✅. Everything else the portal needs is the **backend config in §1** (email, Razorpay, etc.).
*(The repo's `.env.example` is stale — it lists AWS/Redis/NextAuth/Maps/Sentry that the code does not read. Ignore those.)*

---

## 3. Admin console — `prosiddhi-admin`

The app reads only **one** env var:

| Env | Value for prod | Status |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | the prod backend API base | ⏳ |

Plus:
- **Seed a SUPER_ADMIN account** — only the seed migration `2026-07-14_superadmin_and_admin_crud` mints one; needed to reach Manage-Admins + the global Audit feed.
- **Rotate the seeded test admin** (`admin@prosiddhi.test`) before go-live.
- One backend gap: admin invoice-PDF route (tracked separately) — non-blocking.

---

## 4. Mobile — `prosiddhi-mobile-app` (Flutter)

Config is compile-time via `--dart-define` (see `app_config.dart`):

| Define / asset | Value for prod | Status |
|---|---|---|
| `--dart-define=API_BASE_URL=` | prod backend (e.g. `https://api.prosiddhi.com`) | ❌ built with dev/emulator URL today |
| `--dart-define=WEB_BASE_URL=` | the **HTTPS** web app URL — enables the web-checkout deep-link (`/employer/plans`); disabled unless it's `https://` | ❌ |
| **Firebase** — `google-services.json` (Android) + `GoogleService-Info.plist` (iOS) + `firebase_options.dart` | from a Firebase project | ❌ not present — push not wired |
| **In-app Razorpay** | `razorpay_flutter` SDK + key | ⏸️ **parked** on the store-policy call (digital-goods 15–30% vs B2B exemption). Interim: web-checkout deep-link |

Plus store-side: app signing, Play/App-Store listings, and the **store-policy decision** (D2) before in-app payments. Mobile is ~60% built overall (see `prosiddhi-mobile-app/docs/STATUS.md`).

---

## 5. Razorpay — detail (all surfaces' payments run through the backend)

Payments are **backend-driven**: the web/mobile client asks the BE to create an order, the BE returns it, the client opens Razorpay checkout, then the BE verifies the signature + a webhook confirms. So Razorpay keys live on the **backend only** (the frontends don't need them in env).

**To go live:**
1. A **live-mode Razorpay account** for Azkashine (KYC-verified).
2. Set on the backend 🔒:
   - `RAZORPAY_KEY_ID` — live key id
   - `RAZORPAY_KEY_SECRET` — live key secret
   - `RAZORPAY_WEBHOOK_SECRET` — **≥ 20 chars, and NOT a weak placeholder** (`local-dev*`, `change-me*`, `test*`). ⚠️ **The backend refuses to start in production if this is weak/missing** — a deliberate guard.
3. In the **Razorpay dashboard → Webhooks**, register the BE webhook URL (`https://api.prosiddhi.com/api/…/webhook`) with that same secret, subscribed to payment events.
4. GST config (§1) must be set or invoice PDFs won't render for paid orders.

Today these are empty/test — no real payment can be taken until steps 1–3 are done in **live** mode.

---

## 6. Quick "can it launch?" summary

| Surface | Blockers to production |
|---|---|
| **Web** | HTTPS domain (§0) · backend config §1 (esp. Razorpay, email, DLT-for-OTP, Google) |
| **Admin** | `NEXT_PUBLIC_API_URL` → prod · seed super-admin · rotate test admin |
| **Mobile** | prod `API_BASE_URL` + HTTPS `WEB_BASE_URL` · Firebase/FCM · store-policy call · remaining ~40% build · store listings |
| **Shared** | **HTTPS domain** · **Razorpay live** · **DLT** (SMS-OTP) · Meta (WhatsApp) · FCM · Google OAuth origins |

---

## 7. Cutover checklist — dev IP → prosiddhi.com

Two phases. Today the app runs on `http://103.225.224.149:3000` (FE) / `:5000` (BE) — a **dev IP over HTTP**. At go-live it moves to **HTTPS on `prosiddhi.com`**. These configs are URL-bound and must swap together at cutover:

| Config | Now (dev IP) | At cutover (prosiddhi.com, HTTPS) |
|---|---|---|
| Google `javascript_origins` | `http://localhost:3000` only — **the IP cannot be registered** | add `https://prosiddhi.com` (+ `www`) |
| FE `NEXT_PUBLIC_API_URL` | `http://103.225.224.149:5000/api` | `https://api.prosiddhi.com/api` |
| FE `NEXT_PUBLIC_APP_URL` | `http://103.225.224.149:3000` | `https://prosiddhi.com` |
| Admin `NEXT_PUBLIC_API_URL` | dev BE | prod BE |
| BE `FRONTEND_URL` (invite links) | `http://103.225.224.149:3000` | `https://prosiddhi.com` |
| BE `BASE_URL` (uploaded-file URLs) | dev BE | prod BE |
| BE CORS allowed origins | dev-IP FE + admin | prosiddhi.com origins |
| Mobile `API_BASE_URL` | dev / emulator | prod BE |
| Mobile `WEB_BASE_URL` (web-checkout; needs `https://`) | — | `https://prosiddhi.com` |
| Razorpay webhook URL | — | prod BE `https://…/webhook` |
| Meta / WhatsApp site verification | — | `https://prosiddhi.com` |

⚠️ **Two things simply do not work on the dev IP** and only light up at cutover:
- **Google login** — Google rejects raw-IP and non-HTTPS authorized origins (only `localhost` is exempt). On the dev IP, use phone-OTP / email login; test Google only on `localhost:3000`.
- **Mobile web-checkout** — the app enables it only when `WEB_BASE_URL` starts with `https://`.

Everything else (email, in-app flows, admin, phone/email auth) works fine on the dev IP.
