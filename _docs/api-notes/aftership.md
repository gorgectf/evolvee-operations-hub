# AfterShip Tracking API

*Service reference · shipping overview · API version 2026-01*

**Integration role:** Primarily a **webhook push** - AfterShip sends tracking updates
into the backend (inbound). The host application also makes outbound calls to
create/update trackings and read courier data. Keep this directionality in mind: most
shipping data arrives *unsolicited* at a webhook endpoint, not via polling.

## Base URL

```
https://api.aftership.com/tracking/2026-01
```

All endpoints are HTTPS-only and live at `api.aftership.com`. The version is pinned in
the path (`2026-01`).

---

## Authentication (outbound API calls)

AfterShip verifies requests with an **`as-api-key`** header. Generate the key in the
AfterShip admin portal under **API keys → Create an API key**.

```
GET https://api.aftership.com/tracking/2026-01/trackings/{id}
as-api-key: {your_api_key}
```

> Legacy `aftership-api-key` headers are **no longer supported** from the 2023-10
> version onward. Use `as-api-key`.

Store the key in your environment configuration as `AFTERSHIP_API_KEY`. AfterShip also
offers a more involved HMAC/RSA-signed key method and OAuth (30-day access tokens) for
distributed apps; the plain API key is sufficient for an internal integration.

---

## Outbound endpoints (application → AfterShip)

| Action | Endpoint |
|---|---|
| Get trackings | `GET /trackings` |
| Create a tracking | `POST /trackings` |
| Get a tracking by ID | `GET /trackings/{id}` |
| Update a tracking by ID | `PUT /trackings/{id}` |
| Delete a tracking by ID | `DELETE /trackings/{id}` |
| Retrack an expired tracking | `POST /trackings/{id}/retrack` |
| Mark tracking as completed | `POST /trackings/{id}/completed` |
| Get couriers | `GET /couriers` |
| Detect courier | `POST /couriers/detect` |

**Creating a tracking** - supply the tracking number; supplying the courier `slug` too is
recommended but optional (AfterShip will attempt courier detection):

```
POST https://api.aftership.com/tracking/2026-01/trackings
as-api-key: {your_api_key}
Content-Type: application/json

{ "tracking_number": "9405511202575421535949", "slug": "usps" }
```

> Send the `slug` exactly as listed in AfterShip's courier list - slugs are
> case/format-sensitive.

---

## Webhooks (AfterShip → application) - the primary data path

AfterShip pushes a notification to your backend for **every tracking update**.

**Setup (admin portal → notifications → webhooks):**

- Select a **webhook version** (latest preferred). The webhook version is **independent
  of the API version** - you can call API `2026-01` while a webhook is on a different
  version. An `as-webhook-version` header on each delivery tells you the payload version.
- Add the **webhook URL** (your backend endpoint). Up to **10 URLs** are supported; the
  URL port must be **80, 443, or 8080**.
- Optionally add **custom headers** (up to 5 per URL) for your own auth.
- Use **Send test webhook** to validate. Your endpoint must return an HTTP status in the
  **200–299** range or AfterShip treats the delivery as failed.

**Verifying authenticity:** each webhook request includes an **`aftership-hmac-sha256`**
header - a base64-encoded HMAC-SHA256 of the raw request body, keyed with your account's
webhook secret. Compute the same HMAC on the received body and compare before trusting
the payload. Store the secret in your environment configuration as
`AFTERSHIP_WEBHOOK_SECRET`.

> Verify the signature against the **raw** body bytes, before any JSON re-serialisation,
> or the HMAC will not match.

---

## Rate limits (outbound calls)

From the **2024-07** version onward, AfterShip moved from a single org-wide limit
(previously ~10 requests/sec per organisation) to **per-endpoint** rate limits. Each
endpoint's specific limit is listed in AfterShip's API reference.

- Exceeding a limit returns **`429`** - back off and retry.
- `POST`/`PUT`/`PATCH` requests with a malformed field type return **`400`**; validate
  body field types before sending.

Check the current per-endpoint figures in the reference before sizing any bulk job.

---

## Credentials checklist (sample → live)

- [ ] `AFTERSHIP_API_KEY` - API key from the admin portal
- [ ] Webhook URL registered in the admin portal, returning 2xx on test
- [ ] `AFTERSHIP_WEBHOOK_SECRET` - for verifying `aftership-hmac-sha256`
- [ ] Webhook version selected and your parser handles that payload version

---

## References

- Tracking API quick start: <https://www.aftership.com/docs/tracking/quickstart/api-quick-start>
- Authentication: <https://www.aftership.com/docs/tracking/quickstart/authentication>
- Webhook overview: <https://www.aftership.com/docs/tracking/webhook/webhook-overview>
- Webhook versioning: <https://www.aftership.com/docs/tracking/webhook/webhook-versioning>
- Rate limit: <https://www.aftership.com/docs/tracking/quickstart/rate-limit>