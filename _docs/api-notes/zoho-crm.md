# Zoho CRM API

*Service reference · contacts / top customers*

**Integration role:** Pull (request/response). The backend reads contact records on a
scheduled `node-cron` job to drive the top-customers view.

---

## Authentication

Uses the **Zoho OAuth flow** - see **`zoho-auth.md`** for the full setup
(regional data centre, Self Client, grant → refresh token exchange, token lifetimes).

- Required scope: **`ZohoCRM.modules.contacts.READ`**
- Auth header: `Authorization: Zoho-oauthtoken {access_token}`
- Base URL: `https://{api}/crm/{version}` (where `{api}` is the regional API domain).
  **Verify the current version** - `v8` at time of writing.

---

## Endpoints

### Contacts

```
GET https://{api}/crm/{version}/Contacts
```

Returns contact records.

> CRM uses **module names with capital letters** (`Contacts`, not `contacts`). Casing
> matters in the path.

CRM does **not** require an `organization_id` query parameter.

---

## Rate limits

See `zoho-auth.md`. Zoho enforces per-minute request limits and a per-day API credit
model that varies by plan/edition. **Retry on `429`** with your own back-off (no
`Retry-After` header is provided).

---

## Credentials checklist (sample → live)

- [ ] Shared Zoho auth complete (`zoho-auth.md`)
- [ ] Scope `ZohoCRM.modules.contacts.READ` included in the refresh token
- [ ] Current CRM API version confirmed (verify `v8` is still current)
- [ ] CRM module activated on the account

---

## References

- Zoho CRM API: <https://www.zoho.com/crm/developer/docs/api/>

**Related:** `zoho-auth.md`