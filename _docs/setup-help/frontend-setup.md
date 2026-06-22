# Step 5 — Set up and run the frontend

← [Back to README](../../README.md)

In a **second** PowerShell window:

```powershell
cd path\to\operations-hub\frontend
npm install
npm run dev
```

In short you can do: npm install; npm run dev

You should see Vite print a local URL. Open **http://localhost:5173** in your browser.

You don't need a frontend `.env` for local development — Vite proxies `/api` requests to
the backend on port 4000 automatically (configured in `vite.config.js`).

---

Next: [Step 6 — Logging in](logging-in.md)
