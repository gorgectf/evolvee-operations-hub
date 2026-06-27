# Step 8 — Deploying (Netlify + Render)

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

> `render.yaml` lives at the **repository root** (next to `netlify.toml`) and must be
> committed for the steps below — it's how Render knows what to build.

---

## 8.2 Backend on Render

The repo includes a `render.yaml` Blueprint at the root that defines the backend web
service **and** its PostgreSQL database together, so Render provisions both in one step.

1. In the Render Dashboard: **New → Blueprint**, then **Connect** the repo. (Connect your
   GitHub account first if you haven't.)
2. Render reads `render.yaml` and lists the resources it will create: the
   `operations-hub-api` web service and the `operations-hub-db` Postgres database.
3. You're prompted for the environment variables marked `sync: false`. Set:
   - `CORS_ORIGIN` — your Netlify URL, e.g. `https://your-site.netlify.app`. A trailing
     slash is fine (it's ignored), and you can list several origins comma-separated. If
     you don't have the final Netlify URL yet, enter a placeholder and correct it after
     step 8.3.
4. Click **Apply** to deploy the Blueprint. Render builds the service and creates the
   database.

What the Blueprint already handles, so you don't set it by hand:
   - **`DATABASE_URL`** is wired to the new Postgres instance automatically
     (`fromDatabase`).
   - **`JWT_SECRET`** is generated once by Render and kept (`generateValue: true`) — it's
     long and random, so it passes the production strength check (32+ chars, no
     placeholder). Nothing to paste.
   - **Tables are created automatically** on first boot (the idempotent schema runs at
     startup) — there's no manual schema step.
   - **A single admin user is seeded** on the first boot because `AUTO_SEED=admin` (a live
     deploy doesn't get the demo accounts — use `AUTO_SEED=demo` only for a sandbox).
     Seeding only runs against an empty database, so it can't create duplicates. Once the
     first deploy has seeded, set `AUTO_SEED` to `false` on the service's **Environment**
     page.
   - **The admin login** is set by `ADMIN_EMAIL` (you're prompted for it during Blueprint
     creation). `ADMIN_PASSWORD` is intentionally left unset, so the server generates a
     strong random password and prints it **once** in the deploy logs — see the note
     below. To pick the password yourself, add `ADMIN_PASSWORD` as an environment variable
     before the first boot.
   - **Health checks** hit `/api/health`, and **SSL to the database** is enabled
     automatically (the backend turns SSL on for any non-local host — Render Postgres
     included).
   - **Do not add a `PORT` variable.** Render assigns the port itself and the backend
     already reads it from the environment; setting `PORT` can cause a "no open ports
     detected" deploy failure.

5. When the deploy is green, note the public backend URL Render assigns, e.g.
   `https://operations-hub-api.onrender.com`. You'll need it for Netlify in 8.3.

> **Grab the generated admin password from the deploy logs** (Render → the service →
> **Logs**). It's printed once on first boot as `Generated password (shown ONCE): …`. Sign
> in as the admin, change it on the Team Members page, then add the rest of your team
> there. (If you set `ADMIN_PASSWORD` yourself, use that instead — and still change it
> after first login.)

### Free instance types — read before go-live

`render.yaml` ships with `plan: free` for both the service and the database so you can
deploy at no cost, but the free tier has limits that matter for an always-on internal
tool:
   - **Free web services spin down after ~15 minutes of inactivity** and take roughly a
     minute to cold-start on the next request.
   - **Free PostgreSQL databases expire 30 days after creation** (with a 14-day grace
     period to upgrade before the data is deleted), are capped at 1 GB, and have no
     backups.

Before relying on this in production, raise the `plan` field in `render.yaml` for each
resource — `basic-256mb` is the smallest paid Postgres instance, and `starter` or higher
keeps the web service always-on — then commit and push to re-sync the Blueprint.

### Alternative: configure in the Dashboard without the Blueprint

If you'd rather not use `render.yaml`, create the pieces manually instead:
   1. **New → PostgreSQL**, pick a region, and create it. Copy its **Internal Database
      URL**.
   2. **New → Web Service**, connect the repo, and set: **Root Directory** = `backend`,
      **Build Command** = `npm install`, **Start Command** = `npm start`, **Health Check
      Path** = `/api/health`.
   3. Under the service's **Environment**, add `DATABASE_URL` (the Internal Database URL),
      `JWT_SECRET` (a strong 32+ char value — generate one with the command below),
      `NODE_ENV=production`, `CORS_ORIGIN`, `AUTO_SEED=admin` plus `ADMIN_EMAIL` for the
      first deploy (leave `ADMIN_PASSWORD` unset to auto-generate one in the logs), and the
      `*_MODE` switches (`sample`/`placeholder`). Do **not** set `PORT`.
      ```powershell
      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
      ```

---

## 8.3 Frontend on Netlify

1. In Netlify: **Add new site → Import from GitHub** → pick the repo.
2. `netlify.toml` at the repo root already sets `base = frontend`, `publish = dist`
   (which resolves to `frontend/dist`), and the SPA redirect — Netlify picks it up
   automatically.
3. Add one environment variable: `VITE_API_BASE` = your Render backend URL (no trailing
   slash), e.g. `https://operations-hub-api.onrender.com`.
4. Deploy. Then confirm the backend's `CORS_ORIGIN` matches your final Netlify URL (update
   it on the Render service's **Environment** page if it changed).

---

## 8.4 Post-deploy checklist

- [ ] `render.yaml` committed at the **repo root**
- [ ] Blueprint applied — `operations-hub-api` service and `operations-hub-db` database
      created
- [ ] `CORS_ORIGIN` (Render) ↔ Netlify URL match
- [ ] `JWT_SECRET` present (auto-generated by Render; 32+ chars)
- [ ] Single admin seeded once (`AUTO_SEED=admin` + `ADMIN_EMAIL` for first boot, then
      `AUTO_SEED` back to `false`)
- [ ] **Admin password retrieved from the deploy logs and changed** after first login
- [ ] No `PORT` variable set on the service
- [ ] `VITE_API_BASE` (Netlify) → Render backend URL
- [ ] Paid `plan` set for both resources before production use (free Postgres expires
      after 30 days)
- [ ] Add real API credentials per source as they arrive

---

Next: [Step 9 — Troubleshooting](troubleshooting.md)
