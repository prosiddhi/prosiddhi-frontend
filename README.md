# web

The ProSiddhi Job Portal web app (Next.js).

## Dev setup

The backend API runs on **http://localhost:5000** (base URL `http://localhost:5000/api`).

Copy the example env file and set your API URL:

```bash
cp .env.example .env.local
```

Then make sure `NEXT_PUBLIC_API_URL` points at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

If `NEXT_PUBLIC_API_URL` is unset, the app falls back to `http://localhost:5000/api`.
