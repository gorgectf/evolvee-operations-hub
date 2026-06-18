# API test calls

Small, dependency-free scripts (Node 18+, uses global `fetch`) that confirm each
external credential works. They map one-to-one to the Week 2 "Run test call"
checklist items.

These scripts live in `docs/scripts/api-tests/`. They read credentials from the
backend `.env` (`backend/.env`), so there is a single source of truth - you do
not copy credentials into the `docs/` tree. Paths are resolved relative to each
script file, so the working directory you launch from does not matter.

## How to run (PowerShell, from the project root)

```powershell
# 1. Make sure backend\.env exists and holds the credential(s) the script needs
Copy-Item backend\.env.example backend\.env   # first time only, then paste in real values

# 2. Run a single test (from the project root)
# Example:
node docs\scripts\api-tests\shopify-orders.mjs
```

The script searches for `.env` in this order: `backend\.env`, then a root-level
`.env`, then the legacy `scripts\..\.env` location. To point at a `.env`
somewhere else, set `ENV_FILE` first:

```powershell
$env:ENV_FILE = "C:\path\to\.env"
node docs\scripts\api-tests\shopify-orders.mjs
```

If a credential is missing the script stops immediately and prints exactly which
`.env` variable to add; nothing crashes, so it is safe to run any script at any time.

## The scripts

| Script | Checklist item | Needs |
|--------|----------------|-------|
| `shopify-orders.mjs` | fetch recent orders | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN` |
| `shopify-products-inventory.mjs` | fetch product + inventory data | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN` |
| `zoho-inventory-stock.mjs` | fetch stock levels | `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN`, `ZOHO_ORG_ID` |
| `zoho-books-revenue.mjs` | fetch revenue data | `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN`, `ZOHO_ORG_ID` |
| `aftership-shipments.mjs` | fetch shipments | `AFTERSHIP_API_KEY` |
| `klaviyo-profiles.mjs` | fetch customer profiles | `KLAVIYO_PRIVATE_KEY` |
| `_env.mjs` | shared loader/helpers | - |
| `zoho-auth.mjs` | shared Zoho OAuth token exchange | - |

## Other issues

- **Zoho data centre** - `ZOHO_ACCOUNTS_DOMAIN` / `ZOHO_API_DOMAIN` must match the
  account's region. Wrong domain looks like an auth failure.
- **AfterShip header** - versioned API uses `as-api-key`, not `aftership-api-key`,
  and legacy keys do not work; a fresh key is required.
- **Klaviyo revision** - the dated `revision` header is mandatory; pin a stable one.
- **Shopify** - REST is legacy (still fine for this internal app); new custom apps
  are created in the Dev Dashboard as of Jan 2026.