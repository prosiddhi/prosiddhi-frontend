# Deploy checklist — the 2026-08-19/20 fix release

**This is not a runbook.** [DEPLOY.md](DEPLOY.md) is the runbook — VM setup,
PM2, Nginx, Prisma. This file covers only what **this release** needs that a
normal deploy does not, because three backend commits changed how the server
reads its environment.

**Owner:** Nayan (infra) with Asrar (backend). **Read §1 before touching
anything.**

---

## 1. ⛔ STOP — one commit already on `main` will refuse to boot

`79ebc15` (TD-30) is **already pushed**. Anyone who deploys backend `main`
today gets it.

It makes two previously-implicit behaviours explicit, and one of them **fails
closed at start-up**:

```
RAZORPAY_WEBHOOK_SECRET is missing, too short (<20 chars), or matches a
known weak placeholder — refusing to start.
```

That check used to run only `if (NODE_ENV === 'production')`. The live API
runs as `development`, so it never ran. It now runs **always**.

**If production is still using the placeholder secret from `.env.example`, the
API will not start after this deploy.** Decide which before you deploy, not
during:

- [ ] **Preferred** — set a real `RAZORPAY_WEBHOOK_SECRET` (≥20 chars, not
      starting `local-dev` / `change-me` / `test` / `placeholder` / `secret` /
      `todo` / `xxx`), and rotate it in the Razorpay dashboard to match.
- [ ] **Or** — set `ALLOW_WEAK_PAYMENT_SECRETS=true` to keep today's
      behaviour. This is logged loudly at every boot.

---

## 2. Environment variables — set these BEFORE restarting the API

All three are new. Missing ones change behaviour silently or stop the boot.

| Variable | Set it to | If you skip it |
|---|---|---|
| `RAZORPAY_WEBHOOK_SECRET` **or** `ALLOW_WEAK_PAYMENT_SECRETS` | a real secret, **or** `true` | **API refuses to start** |
| `EXPOSE_OTP_IN_RESPONSE` | `true` | **Phone-OTP login stops working.** DLT is not delivering SMS, so the OTP in the response body is currently the only way anyone receives one. Confirmed intentional by Nazir 2026-08-20. |
| `CORS_ALLOWED_ORIGINS` | leave unset, **or** a comma-separated list | Unset falls back to `prosiddhi.com`, `www.prosiddhi.com`, `admin.prosiddhi.com`. Anything else calling the API **from a browser** stops working. |
| `CORS_ALLOW_LOCALHOST` | **leave unset in production** | Only needed on a developer machine. |

Requests with **no `Origin` header** — the mobile app, curl, server-to-server —
are always allowed. CORS is a browser mechanism; the Flutter app is unaffected
by the allowlist.

**After the first boot, check the log.** Every relaxed flag announces itself:

```
⚠️  DANGER FLAGS SET — must never be true on a public deployment:
   • EXPOSE_OTP_IN_RESPONSE — OTPs are returned in API responses
```

Seeing that line is expected for this release. Seeing `CORS_ALLOW_LOCALHOST`
is not.

---

## 3. Push order — backend first, then frontend

Not interchangeable. The portal's wrong-role login message reads a `code` field
that only exists after the backend change. Frontend first = a broken login
message for however long the gap lasts.

- [ ] Push `prosiddhi-backend` (1 local commit: `624fd30`, CORS)
- [ ] Deploy + restart the API, confirm §5 passes
- [ ] Push `prosiddhi-frontend` (7 local commits)
- [ ] Build + restart the portal
- [ ] `prosiddhi-mobile-app` is already fully pushed; nothing to do

Re-check what is actually local before you start — some of this session's work
was pushed mid-session:

```bash
for r in prosiddhi-frontend prosiddhi-backend prosiddhi-mobile-app; do
  printf '%-24s ' "$r"; (cd "../$r" && git fetch -q origin && git status -sb | head -1)
done
```

---

## 4. Database

- [ ] **No migration in this release.** Nothing in these commits touches
      `schema.prisma`. If `prisma migrate status` reports drift, that is
      pre-existing and unrelated — resolve it separately, do not fold it in.

---

## 5. Smoke checks — API, straight after restart

Run from anywhere. `<host>` = `https://api.prosiddhi.com`.

- [ ] **The API is up**
      ```bash
      curl -s -o /dev/null -w '%{http_code}\n' <host>/api/jobs?limit=1     # 200
      ```

- [ ] **CORS allows the portal**
      ```bash
      curl -s -i -X OPTIONS <host>/api/jobs \
        -H 'Origin: https://prosiddhi.com' \
        -H 'Access-Control-Request-Method: GET' | grep -i access-control-allow-origin
      ```
      Expect `Access-Control-Allow-Origin: https://prosiddhi.com`.
      **Not** `*` — a wildcard means the old build is still running.

- [ ] **CORS refuses a stranger**
      ```bash
      curl -s -i -X OPTIONS <host>/api/jobs \
        -H 'Origin: https://evil.example.com' \
        -H 'Access-Control-Request-Method: GET' | grep -i access-control-allow-origin
      ```
      Expect **no output**. The refusal is logged with the origin.

- [ ] **The admin console still works.** It is a different origin
      (`admin.prosiddhi.com`) and is the most likely thing the allowlist
      breaks. Open it and load one list page.

- [ ] **OTP login still works.** Send an OTP and confirm the response still
      carries it (this is deliberate — see §2).

- [ ] **Wrong-role login says something sensible.** Correct employer
      credentials on the Job Seeker tab should name the account and switch the
      tab — not print "Please use the correct login URL for your account type".

---

## 6. Smoke checks — portal, on a phone-sized window

The whole point of this release is what a person sees, so look at it.

- [ ] Employer dashboard opens with **stats and jobs**, not the wallet
- [ ] A job detail has **one** Apply button, above the description
- [ ] No page says "our mobile app is on the way"
- [ ] The home page badge reads "Job seekers are free, forever."
- [ ] The seeker landing's **Register / Login / Sign up today** buttons
      actually navigate (they did nothing before this release)

---

## 7. After the deploy — the part that has been blocked for two sessions

- [ ] **Re-run the whole retest table** in
      [teardown-fix-list.md](teardown-fix-list.md) §1. **20 register rows are
      sitting in "fixed — awaiting retest" and cannot be judged until now**,
      because until this deploy, testing production tested old code.
- [ ] Update [qa/defect-log.csv](qa/defect-log.csv) with the real results.
- [ ] Expect **DEF-021 / DEF-022 / DEF-023 to pass now.** They were recorded as
      failing on production, but `HeaderActions` is imported by all 12 employer
      pages in the code — they were deploy gaps, not regressions.

---

## 8. Rollback

Each app is a separate PM2 process, so they roll back independently.

- [ ] Backend: `git checkout <previous-sha> && npm ci && npm run build && pm2 restart prosiddhi-api`
- [ ] Portal: same against `prosiddhi-web`
- [ ] **If the API will not boot, read the error before rolling back.** The
      most likely cause is §1 — a placeholder Razorpay secret — and that is a
      one-line env fix, not a code problem.

---

## 9. Known-and-accepted for this release

Recorded so nobody spends the evening "fixing" a deliberate decision.

- **`NODE_ENV` stays `development` on the live API.** Confirmed intentional by
  Nazir, 2026-08-20. It is what keeps OTPs in the response body while DLT is
  not delivering SMS. The consequence is that error payloads carry more detail
  than a production build would, and `EXPOSE_OTP_IN_RESPONSE` must stay `true`.
  Revisit when DLT clears — that is also what unblocks TD-16/17.
- **Mobile has not been visually verified.** TD-26 and TD-27 are
  `flutter analyze` clean and reasoned from the code, but no device or
  emulator rendered them. Sailaja should look before any store build. TD-32.
- **Nine admin-login translations were not written by the translation agent.**
  They use the "admin" / "admin console" loanword. Worth a native check.
