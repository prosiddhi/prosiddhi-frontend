# ProSiddhi — HTTPS + redeploy runbook

**For:** Nayan · **Server:** `103.225.224.149` (Ubuntu, nginx 1.18, PM2)

**DNS is already done.** All four names resolve to the server:
`prosiddhi.com` · `www.prosiddhi.com` · `api.prosiddhi.com` · `admin.prosiddhi.com`

**Right now the site is live at `http://prosiddhi.com` over plain HTTP, running ~12 July code.**
Work through this top to bottom and it ends fully on HTTPS with all three apps current.

**Order matters:** api gets its certificate *before* the apps are rebuilt to use it, and the root
certificate goes *last* — that way the live site keeps working while you work.

---

## 1. Open the HTTPS port
*443 is the secure-traffic port. 80 already reaches us; if the box is behind NAT, 443 needs the same port-forward at the router.*

```bash
sudo ufw allow 443/tcp && sudo ufw status
```

---

## 2. Route each hostname to its app
*nginx currently answers every hostname with the portal. This sends each name to the right port.*

Create `/etc/nginx/sites-available/prosiddhi`:

```nginx
server {
    listen 80;
    server_name api.prosiddhi.com;
    client_max_body_size 6m;
    location /uploads/ { alias /opt/prosiddhi/data/uploads/; }
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.prosiddhi.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

⚠️ **Check the uploads path matches the backend:** `grep UPLOAD_DIR /opt/prosiddhi/prosiddhi-backend/.env`
If it differs from `/opt/prosiddhi/data/uploads/`, use the real one — otherwise every CV and company document 404s.

```bash
sudo ln -s /etc/nginx/sites-available/prosiddhi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Check:** `curl -s -o /dev/null -w "%{http_code}\n" -H "Host: api.prosiddhi.com" http://127.0.0.1/health` → `200`

---

## 3. Certificates for api + admin
*Free, from Let's Encrypt, auto-renewing. Not the root yet — that comes last.*

```bash
sudo certbot --nginx -d api.prosiddhi.com -d admin.prosiddhi.com
```
Choose **2 — Redirect**.

**Check:** `curl -sI https://api.prosiddhi.com/health | head -1` → `HTTP/1.1 200 OK`, no cert warning.

---

## 4. Close the admin port
*Today anyone on the internet can reach the admin console on :3001 over plain HTTP — passwords in clear text.*

```bash
sudo ufw deny 3001
```
**Check:** `https://admin.prosiddhi.com` loads · `http://103.225.224.149:3001` doesn't.

---

## 5. Back up the database
*Step 6 applies a schema change. Do not skip.*

```bash
sudo -u postgres pg_dump job_portal > ~/job_portal_$(date +%F_%H%M).sql
ls -lh ~/job_portal_*.sql
```

---

## 6. Backend
*New code + the schema change (one column becomes optional — existing rows unaffected).*

```bash
cd /opt/prosiddhi/prosiddhi-backend
git pull && npm ci && npx prisma db push && npm run build
```

Add/update in `.env`:
```
BASE_URL=https://api.prosiddhi.com
FRONTEND_URL=https://prosiddhi.com
```
*`BASE_URL` builds links to uploaded files — left on the old IP, every photo becomes an insecure link on a secure page and the browser silently blocks it. `FRONTEND_URL` is what invite emails link to.*

```bash
pm2 restart prosiddhi-api && pm2 logs prosiddhi-api --lines 30
```
**Check:** `curl -s https://api.prosiddhi.com/health` → `{"status":"healthy"...}`

---

## 7. Portal
*⚠️ The API address is compiled in at BUILD time. Restarting without rebuilding does nothing.*

```bash
cd /opt/prosiddhi/prosiddhi-frontend
git pull && npm ci
echo "NEXT_PUBLIC_API_URL=https://api.prosiddhi.com/api" > .env.local
npm run build
pm2 restart prosiddhi-web
```
**Check:** open `http://prosiddhi.com`, F12 → Network. Requests must go to `https://api.prosiddhi.com/api/...`, **not** `103.225.224.149:5000`. Log in to confirm.

---

## 8. Admin console
*Same build-time rule.*

```bash
cd /opt/prosiddhi/prosiddhi-admin        # adjust if it lives elsewhere
git pull && npm ci
echo "NEXT_PUBLIC_API_URL=https://api.prosiddhi.com/api" > .env.local
npm run build
pm2 restart prosiddhi-admin              # adjust to the real process name
pm2 save
```
**Check:** log in at `https://admin.prosiddhi.com`, dashboard shows real data.

---

## 9. Certificate for the main domain
*Last, because the apps are now built for HTTPS.*

Append to `/etc/nginx/sites-available/prosiddhi`:

```nginx
server {
    listen 80;
    server_name prosiddhi.com www.prosiddhi.com;
    client_max_body_size 6m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d prosiddhi.com -d www.prosiddhi.com
```
Choose **Redirect**.

---

## 10. Close the remaining ports
*The apps are reachable through nginx now; their raw ports shouldn't be public.*

```bash
sudo ufw deny 3000 && sudo ufw deny 5000 && sudo ufw status
```

---

## Final check

```bash
for u in https://prosiddhi.com https://www.prosiddhi.com \
         https://api.prosiddhi.com/health https://admin.prosiddhi.com; do
  printf "%-42s " "$u"; curl -s -o /dev/null -w "%{http_code}\n" "$u"
done
```
All four → `200`. Then in a browser: padlock on `https://prosiddhi.com`, and register a test account end to end.

---

## If something breaks

| Problem | Fix |
|---|---|
| Site loads but nothing works | The portal wasn't rebuilt (step 7) — `npm run build`, not just restart |
| Images / documents broken | `BASE_URL` still on the old IP (step 6), or the `/uploads/` alias is wrong (step 2) |
| certbot fails | Port 80 blocked, or nginx config error. `sudo nginx -t`, then re-run — it's safe to repeat |
| Bad deploy | `git log --oneline -5` → `git checkout <previous>` → rebuild → restart |
| Database | `sudo -u postgres psql job_portal < ~/job_portal_<timestamp>.sql` |

---

## Report back

- [ ] 443 open · nginx routing all four names · certificates issued
- [ ] DB backup filename
- [ ] All three apps pulled, rebuilt, restarted, `pm2 save` done
- [ ] 3000 / 5000 / 3001 closed
- [ ] All four URLs returning 200 with a padlock

Anything that didn't behave as written — flag it rather than working around it.
