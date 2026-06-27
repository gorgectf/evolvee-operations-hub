# Step 8 — Troubleshooting

← [Back to README](../../README.md)

---

## "node" or "psql" is not recognized {#node-or-psql-is-not-recognized}

The program isn't on your PATH.

- **Node:** reinstall from nodejs.org and make sure you open a *new* PowerShell window
  afterwards.
- **psql:** add PostgreSQL's bin folder to PATH: Start → "Edit the system environment
  variables" → Environment Variables → under *System variables* select `Path` → Edit →
  New → add `C:\Program Files\PostgreSQL\16\bin` → OK everything → open a **new**
  PowerShell window.

---

## "password authentication failed for user opshub"

The password in `DATABASE_URL` (in `backend/.env`) doesn't match what you set in step 3.
Fix either side. To reset the DB user's password:

```powershell
psql -U postgres -c "ALTER USER opshub WITH PASSWORD 'opshub_dev_password';"
```

---

## "database operations_hub does not exist"

You skipped step 3, or created it under a different name. Re-run the `CREATE DATABASE`
line from [step 3](database-setup.md).

---

## "ECONNREFUSED" / "Cannot reach the server" in the browser

The backend isn't running, or it's on a different port.

1. Check the backend PowerShell window — is `npm start` still running without errors?
2. Visit http://localhost:4000/api/health directly. If that fails, restart the backend
   and read its console output.
3. Make sure `PORT=4000` in `backend/.env` matches the proxy target in
   `frontend/vite.config.js` (both default to 4000).

---

## "Port 4000 is already in use" (EADDRINUSE)

Something else (probably an old backend window) holds the port:

```powershell
netstat -ano | findstr :4000
taskkill /PID <the_PID_from_above> /F
```

Or change `PORT` in `.env` and the proxy target in `vite.config.js` to match.

---

## PostgreSQL service isn't running

```powershell
Get-Service postgresql*        # check status
Start-Service postgresql-x64-16
```

Or use the Services app: Win+R → `services.msc` → find "postgresql-x64-16" → Start.

---

## CORS error in the browser console

Locally this shouldn't happen — the Vite proxy avoids CORS entirely. If you see it, the
frontend and backend are on different origins without the proxy in between.

---

## Logged out unexpectedly / 401 errors

JWT tokens expire after `JWT_EXPIRES_IN` (default 8 hours). Just log in again. If it
happens immediately after login, the backend's `JWT_SECRET` changed between issuing and
verifying the token (e.g. you restarted with a different `.env`) — log in again.

---

## npm install fails

- Behind a proxy/VPN? Try off VPN.
- `EPERM` / file-lock errors on Windows: close editors/terminals using the folder,
  delete `node_modules` and `package-lock.json`, re-run `npm install`.
- Make sure you're in the right folder — `backend` and `frontend` each have their
  **own** `npm install`.

---

## Seed script says "Database already has users — skipping"

That's the safety guard: seeding only runs on an empty database, so it can't create
duplicates. To wipe and re-seed in development:

```powershell
npm run db:reset    # drops all tables and re-creates them (DESTRUCTIVE)
npm run db:seed
```

Do **not** do this against a production database with real data.

---

## No reorder alerts showing

Alerts are created by the stock check (at startup and hourly). Click **Run check now**
on the Alerts page to trigger one immediately. In sample mode, 4 of the 8 SKUs are
below threshold and should produce alerts.

---

Next: [Step 10 — Project structure reference](project-structure.md)
