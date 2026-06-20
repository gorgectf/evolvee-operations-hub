# Zoho Inventory API

*Service reference · stock levels per item*

**Integration role:** Pull (request/response). The backend reads stock figures on a
scheduled `node-cron` job to drive low-stock flags and reorder alerts.

---

## Authentication

Uses the **shared Zoho OAuth flow** — see **`zoho-auth.md`** for the full setup
(regional data centre, Self Client, grant → refresh token exchange, token lifetimes).

- Required scope: **`ZohoInventory.items.READ`**
- Auth header: `Authorization: Zoho-oauthtoken {access_token}`
- Base URL: `https://{api}/inventory/v1` (where `{api}` is the regional API domain, e.g.
  `www.zohoapis.eu`)

---

## Endpoints

### Stock levels

```
GET https://{api}/inventory/v1/items?organization_id={org}
```

Returns items including `stock_on_hand` and `available_stock`.

> **`organization_id` is required on every request.** See `zoho-auth.md` for how to
> obtain and store it.

### Organizations (to fetch the org id once)

```
GET https://{api}/inventory/v1/organizations
```

---

## Rate limits

See `zoho-auth.md`. Zoho enforces per-minute request limits and a per-day API credit
model, with **no `Retry-After` header** — back off on `429` using your own schedule.

---

## Credentials checklist (sample → live)

- [ ] Shared Zoho auth complete (`zoho-auth.md`)
- [ ] Scope `ZohoInventory.items.READ` included in the refresh token
- [ ] `ZOHO_ORGANIZATION_ID` set
- [ ] Inventory module activated on the account

---

## References

- Zoho Inventory API: <https://www.zoho.com/inventory/api/v1/>

**Related:** `zoho-auth.md`, `zoho-books.md`, `zoho-crm.md`