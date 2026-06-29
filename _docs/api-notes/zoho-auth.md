# Zoho — Authentication & Regional Setup

Authentication reference for Zoho CRM. The OAuth flow below is what the CRM integration
uses. `zoho-crm.md` lists the CRM endpoints and scope and points back here for auth.

---

## Watch out for the regional data centre

Zoho runs separate data centres, each with its own API domain. The domain must match where
the account is hosted, or every call fails with errors that look like auth problems.

| Region | Accounts base | API base |
|---|---|---|
| US | `https://accounts.zoho.com` | `https://www.zohoapis.com` |
| EU | `https://accounts.zoho.eu` | `https://www.zohoapis.eu` |

The Zoho web app URL tells you the region (e.g. `crm.zoho.eu` → EU). Set both:

```
ZOHO_ACCOUNTS_BASE=https://accounts.zoho.eu
ZOHO_API_BASE=https://www.zohoapis.eu
```

Confirm the region before anything else; it rules out a whole class of confusing failures.

---

## OAuth 2.0

1. Register a Self Client (server-to-server) in the Zoho Developer Console
   (`api-console.zoho.com`) to get a Client ID and Client Secret.
2. Generate a grant token for the CRM scope: `ZohoCRM.modules.contacts.READ`.
3. Exchange the grant token at `https://{accounts}/oauth/v2/token` for an access token and
   refresh token. Use `access_type=offline` or you won't get a refresh token. Do the
   exchange within ~2 minutes; grant tokens are short-lived.
4. Access tokens expire after ~1 hour. The refresh token doesn't expire unless revoked;
   store it and exchange it for fresh access tokens as needed. The backend caches the
   access token and refreshes it automatically.

> Zoho caps refresh tokens per user and silently drops the oldest when you exceed the cap.
> Don't regenerate needlessly.

Auth header on every API call:

```
Authorization: Zoho-oauthtoken {access_token}
```

---

## Rate limits

- Zoho enforces per-minute request limits and a per-day API credit model that varies by
  plan/edition.
- No `Retry-After` header, so implement your own throttle/back-off (e.g. start at 1s,
  double on a repeat 429) rather than reading a server-provided delay.
- Retry on `429`.

---

## Environment variables

```
ZOHO_ACCOUNTS_BASE=
ZOHO_API_BASE=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
```

---

## Credentials checklist (sample → live)

- [ ] Region the account is hosted in (US / EU / other), confirm first
- [ ] Client ID and Client Secret (Self Client, Developer Console)
- [ ] Refresh token generated with the CRM scope above and `access_type=offline`
- [ ] Confirmation that CRM is activated on the account

---

## References

- Zoho Developer Console: <https://api-console.zoho.com>
- OAuth overview: <https://www.zoho.com/accounts/protocol/oauth.html>

Related: `zoho-crm.md`
