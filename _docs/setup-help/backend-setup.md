# Step 4 — Set up and run the backend

← [Back to README](../../README.md)

All backend commands run from the `backend` folder.

```powershell
cd path\to\operations-hub\backend
```

---

## 4.1 Install dependencies

```powershell
npm install
```

---

## 4.2 Create your .env file

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Open `.env` in your editor. For local development the defaults work as-is **if** you
used the password `opshub_dev_password` in step 3. If you chose a different password,
update it inside `DATABASE_URL`:

```
DATABASE_URL=postgresql://opshub:opshub_dev_password@localhost:5432/operations_hub
```

Also set `JWT_SECRET` to any long random string (it signs login tokens — anything
unguessable is fine for local dev).

Leave all the `*_MODE=sample` lines alone for now — see
[Sample data vs live API mode](sample-vs-live.md).

---

## 4.3 Create the tables and seed data

```powershell
npm run db:schema; npm run db:seed
```

These commands applies the schema and then seeds demo data.

You should see confirmation messages. The seed creates 5 users (one per role),
3 manufacturers, 8 products with reorder thresholds, and sample history.

The schema is **idempotent** and is also applied automatically every time the backend
starts, so you can't end up with missing tables. To wipe everything and start clean
during development, use `npm run db:reset` (drops all tables and re-creates them), then
`npm run db:seed`.

---

## 4.4 Start the backend

```powershell
npm start
```

You should see:

```
Operations Hub backend running on http://localhost:4000
Stock check scheduled with cron pattern "0 * * * *"
[stock-check] checked 8 SKUs, created 4 new alert(s)
```

The stock check runs once at startup and then every hour. Four sample SKUs are
intentionally below their thresholds so you can see alerts immediately.

Quick sanity check — open a **second** PowerShell window:

```powershell
curl.exe http://localhost:4000/api/health
```

You should get `{"status":"ok",...}`. Leave the backend running.

---

In short you can do: npm install; Copy-Item .env.example .env; npm run db:schema; npm run db:seed; npm start

Next: [Step 5 — Set up and run the frontend](frontend-setup.md)
