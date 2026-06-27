# Step 7 — Sample data vs live API mode

← [Back to README](../../README.md)

Every external source has its own mode switch in `backend/.env`, so you can go live
**one integration at a time** as credentials become available:

```
SHOPIFY_MODE=sample          # sample | live
ZOHO_CRM_MODE=sample
AFTERSHIP_MODE=sample
QR_PARTNER_MODE=placeholder  # placeholder until API access confirmed
```

Shopify drives sales, top customers, stock levels, and revenue (daily/weekly/monthly).

In **sample** mode the backend serves realistic bundled JSON (in
`backend/src/services/sampleData/`) so the whole UI works without any credentials.

---

## Switching a source to live

1. Fill in the matching credentials in `.env` — all variables are listed in
   `.env.example` with inline comments (e.g. `SHOPIFY_STORE_DOMAIN` +
   `SHOPIFY_ACCESS_TOKEN`, or the Zoho `CLIENT_ID` / `CLIENT_SECRET` /
   `REFRESH_TOKEN` trio). Credentials are provided by the account owner.
2. Change that source's `*_MODE` to `live`.
3. Confirm the credentials actually connect by running the
   [integration connectivity tests](../integration-tests/README.md)
   (`.\test-integrations.bat`) — each live source reports PASS or a full error.
4. Restart the backend (`Ctrl+C`, then `npm start`).

If a live call fails, the dashboard shows a sync-failure banner rather than silently
showing stale data — check the **sync status** indicator and the backend console output.

---

## Notes

- Shopify's REST Admin API is legacy (since Oct 2024) but still functional for internal
  custom apps.
- Zoho uses OAuth refresh tokens; the backend caches and refreshes access tokens
  automatically.

---

Next: [Step 8 — Deploying](deployment.md)
