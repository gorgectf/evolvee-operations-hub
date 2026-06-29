# Step 5 — Set up and run the frontend

← [Back to README](../../README.md)

In a second PowerShell window:

```powershell
cd path\to\operations-hub\frontend
npm install
npm run dev
```

Vite prints a local URL. Open http://localhost:5173 in your browser.

You don't need a frontend `.env` for local dev. Vite proxies `/api` requests to the
backend on port 4000 automatically (set in `vite.config.js`).

---

Next: [Step 6 — Logging in](logging-in.md)
