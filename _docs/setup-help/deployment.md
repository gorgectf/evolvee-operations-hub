# Step 8 — Deploying (Netlify + Railway)

← [Back to README](../../README.md)

---

## 8.1 Push to GitHub first

```powershell
cd path\to\operations-hub
git init
git add .
git commit -m "Initial commit"
```

Create an empty repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/operations-hub.git
git push -u origin main
```

`.gitignore` already excludes `node_modules` and `.env` — **never commit `.env`**.

---

## 8.2 Backend on Railway

1. In Railway, create a project → **Deploy from GitHub repo** → pick the repo.
2. **Set the service root directory to `backend`.** This is required — the repo root has
   no `package.json`, so Railway can't detect the app without it. (`backend/railway.json`
   then pins the build command, start command, and `/api/health` health check
   automatically.)
3. Add a **PostgreSQL** database in the same project. In the backend service's variables,
   add `DATABASE_URL` as a reference to the Postgres service's connection string.
4. Set the rest of the environment variables (from `.env.example`):
   - `JWT_SECRET` — a **strong** value. In production the backend refuses to start if
     this is missing, under 32 characters, or a placeholder. Generate one with:
     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```
   - `CORS_ORIGIN` — your Netlify URL, e.g. `https://your-site.netlify.app`. A trailing
     slash is fine (it's ignored), and you can list several origins comma-separated.
   - The `*_MODE` switches (leave at `sample`/`placeholder` until credentials arrive).
   - `NODE_ENV=production` is recommended. **SSL to the database does not depend on it**
     — the backend auto-enables SSL for any non-local database host, so Railway Postgres
     connects over SSL automatically. (If you ever need to force it, set
     `DATABASE_SSL=true` or `false`.)
5. **Database tables are created automatically** on first boot (the idempotent schema
   runs at startup), so there's no manual schema step. You only need to create the
   demo/login accounts once. Easiest: set `AUTO_SEED=true` in the variables for the
   first deploy — the backend seeds the demo users when it sees an empty database — then
   set it back to `false`. (Alternatively, run `npm run db:seed` once against Railway's
   **public** `DATABASE_URL` from your machine.)
6. Note the public backend URL Railway assigns (e.g.
   `https://your-app.up.railway.app`).

> **Change the seeded passwords immediately** — they all start as `radiance123`. Sign in
> as the admin and update them on the Team Members page.

---

## 8.3 Frontend on Netlify

1. In Netlify: **Add new site → Import from GitHub** → pick the repo.
2. `netlify.toml` at the repo root already sets `base = frontend`, `publish = dist`
   (which resolves to `frontend/dist`), and the SPA redirect — Netlify picks it up
   automatically.
3. Add one environment variable: `VITE_API_BASE` = your Railway backend URL (no
   trailing slash).
4. Deploy. Then confirm Railway's `CORS_ORIGIN` matches your final Netlify URL.

---

## 8.4 Post-deploy checklist

- [ ] Railway service **root directory = `backend`**
- [ ] `DATABASE_URL` referenced from the Postgres service
- [ ] Strong unique `JWT_SECRET` in Railway (32+ chars)
- [ ] Demo accounts seeded once (`AUTO_SEED=true` for first boot, then back to `false`)
- [ ] **Seed passwords changed** from default
- [ ] `CORS_ORIGIN` (Railway) ↔ Netlify URL match
- [ ] `VITE_API_BASE` (Netlify) → Railway URL
- [ ] Add real API credentials per source as they arrive

---

Next: [Step 9 — Troubleshooting](troubleshooting.md)
