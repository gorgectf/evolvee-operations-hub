# Zoho — Shared Authentication & Regional Setup

**Evolvée Radiance Operations Hub**
*Common reference for Zoho Inventory, Zoho Books, and Zoho CRM*

One OAuth flow covers all three Zoho products. This file documents the shared mechanics;
each product file (`zoho-inventory.md`, `zoho-books.md`, `zoho-crm.md`) lists only its own
endpoints and scopes and points back here for auth.

> Zoho is the longest-lead credential of the six integrations — start it first.

---

## The single biggest gotcha: regional data centre

Zoho runs separate data centres, each with its **own API domain**. The domain **must
match where the account is hosted**, or every call fails with errors that *look like*
auth problems.

| Region | Accounts domain | API domain |
|---|---|---|
| US | `accounts.zoho.com` | `www.zohoapis.com` |
| EU | `accounts.zoho.eu` | `www.zohoapis.eu` |

The Zoho web app URL tells you the region (e.g. `books.zoho.eu` → EU). Set both in `.env`:

```
ZOHO_ACCOUNTS_DOMAIN=accounts.zoho.eu
ZOHO_API_DOMAIN=www.zohoapis.eu
```

Confirming the region before anything else avoids a class of confusing failures.

---

## OAuth 2.0 (shared by all three products)

1. **Register a Self Client** (server-to-server) in the Zoho Developer Console
   (`api-console.zoho.com`) → obtain **Client ID** + **Client Secret**.
2. **Generate a grant token** for the scopes you need (multi-scope in one token is fine):
   - Inventory: `ZohoInventory.items.READ`
   - Books: `ZohoBooks.invoices.READ`, `ZohoBooks.contacts.READ`
   - CRM: `ZohoCRM.modules.contacts.READ`
3. **Exchange the grant token** at `https://{accounts}/oauth/v2/token` for an
   **access token + refresh token**. Use **`access_type=offline`** or you won't get a
   refresh token. Do the exchange within **~2 minutes** — grant tokens are short-lived.
4. **Access tokens expire after ~1 hour.** The **refresh token does not expire** unless
   revoked — store it and exchange it for fresh access tokens (see
   `scripts/api-tests/zoho-auth.mjs`).

> Zoho caps refresh tokens per user and **silently drops the oldest when exceeded** —
> don't regenerate needlessly.

**Auth header on every API call:**

```
Authorization: Zoho-oauthtoken {access_token}
```

---

## Common request requirement: `organization_id`

Inventory and Books require an `organization_id` query parameter on **every** request.
A missing or wrong org id is the #1 silent failure ("Organization not found", even with a
valid token). Retrieve it once via `GET /books/v3/organizations` (or
`GET /inventory/v1/organizations`) and store it in `.env` as `ZOHO_ORGANIZATION_ID`.

---

## Rate limits (apply across the Zoho products)

- **Books: ~100 requests/minute**, with **no `Retry-After` header** — implement your own
  throttle/back-off.
- Zoho also enforces a **per-day API credit** model that varies by plan/edition.
- **Retry on `429`.**

Because there's no `Retry-After`, use a fixed/exponential back-off of your own choosing
(e.g. start at 1s, double on repeat 429) rather than reading a server-provided delay.

---

## Shared `.env` variables

```
ZOHO_ACCOUNTS_DOMAIN=
ZOHO_API_DOMAIN=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORGANIZATION_ID=
```

---

## Credentials checklist (sample → live)

- [ ] **Region** the account is hosted in (US / EU / other) — confirm first
- [ ] **Client ID** + **Client Secret** (Self Client, Developer Console)
- [ ] **Refresh token** generated with the combined scopes above and `access_type=offline`
- [ ] **`organization_id`** (for Inventory and Books)
- [ ] Confirmation that **Inventory, Books, and CRM are all activated** on the account

---

## References

- Zoho Developer Console: <https://api-console.zoho.com>
- OAuth overview: <https://www.zoho.com/accounts/protocol/oauth.html>

**Related:** `zoho-inventory.md`, `zoho-books.md`, `zoho-crm.md`, `README.md`
