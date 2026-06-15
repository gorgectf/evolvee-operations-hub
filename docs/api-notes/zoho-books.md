# Zoho Books API

**Evolvée Radiance Operations Hub**
*Service reference · revenue / invoices*

**Integration role:** Pull (request/response). The backend reads invoices on a scheduled
`node-cron` job to drive revenue-by-day/week/month reporting.

---

## Authentication

Uses the **shared Zoho OAuth flow** — see **`zoho-auth.md`** for the full setup
(regional data centre, Self Client, grant → refresh token exchange, token lifetimes).

- Required scopes: **`ZohoBooks.invoices.READ`**, **`ZohoBooks.contacts.READ`**
- Auth header: `Authorization: Zoho-oauthtoken {access_token}`
- Base URL: `https://{api}/books/v3` (where `{api}` is the regional API domain, e.g.
  `www.zohoapis.eu`)

---

## Endpoints

### Invoices (revenue)

```
GET https://{api}/books/v3/invoices?organization_id={org}
```

Returns invoices including `total`, `status`, and `currency_code`.

> **`organization_id` is required on every request** — this is the #1 silent failure
> when omitted or wrong ("Organization not found", even with a valid token).

### Organizations (to fetch the org id once)

```
GET https://{api}/books/v3/organizations
```

---

## Rate limits

- **~100 requests/minute.**
- **No `Retry-After` header** — implement your own throttle/back-off.
- Per-day API credit model varies by plan/edition.
- **Retry on `429`.**

These are the figures referenced in `zoho-auth.md`; Books is the product against which
the ~100/min limit is documented.

---

## Credentials checklist (sample → live)

- [ ] Shared Zoho auth complete (`zoho-auth.md`)
- [ ] Scopes `ZohoBooks.invoices.READ` and `ZohoBooks.contacts.READ` in the refresh token
- [ ] `ZOHO_ORGANIZATION_ID` set
- [ ] Books module activated on the account

---

## References

- Zoho Books API: <https://www.zoho.com/books/api/v3/>

**Related:** `zoho-auth.md`, `zoho-inventory.md`, `zoho-crm.md`, `README.md`
