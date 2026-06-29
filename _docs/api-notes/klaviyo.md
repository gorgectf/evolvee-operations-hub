# Klaviyo API

Service reference, outbound event & profile sync.

Integration role: outbound only. The app sends events and profile data to Klaviyo; nothing
is pulled back in the initial scope. Reading Klaviyo data back out for marketing
performance analytics is deferred.

---

## Base URL & versioning

```
https://a.klaviyo.com/api/
```

Klaviyo versions its API with revisions, ISO 8601 dates passed in a `revision` request
header (e.g. `revision: 2024-10-15`), not in the URL.

- Pin to a specific stable revision. Check the revision dropdown in the Klaviyo developer
  docs for the current latest stable revision and use that exact date; upgrade
  deliberately.
- Beta revisions carry a `.pre` suffix (e.g. `2026-04-15.pre`) and must not be used in
  production.
- Breaking changes are gated behind a new revision; Klaviyo gives 30 days' notice before
  altering an existing one. Omitting the header (or using a stale value) can trigger
  deprecated behaviour.

Store the chosen revision as a constant (e.g. `KLAVIYO_API_REVISION`) so every request
sends the same one.

---

## Authentication

Two key types:

| Key | Used for | Header / param |
|---|---|---|
| Private API key | Server-side `/api` endpoints | `Authorization: Klaviyo-API-Key {private_key}` |
| Public key (Site ID) | Client-side `/client` endpoints only | `?company_id={public_key}` |

Server-side request shape:

```
POST https://a.klaviyo.com/api/events/
Authorization: Klaviyo-API-Key {private_key}
revision: {revision}
content-type: application/vnd.api+json
accept: application/json
```

> Never use a private key with client-side `/client` endpoints. The private key reads and
> writes sensitive account data, so treat it like a password, keep it in
> `KLAVIYO_PRIVATE_KEY`, and scope it to only the permissions this integration needs. A new
> private key can be created or deactivated at any time if one is exposed.

Klaviyo follows the JSON:API spec: request/response bodies wrap data in a `data` object
with `type` and `attributes`, and `PATCH` requests must include the resource `type` and
`id`.

---

## Outbound endpoints (application → Klaviyo)

### Events

| Action | Endpoint | Notes |
|---|---|---|
| Create event | `POST /api/events/` | Server-side. Can also create/update the profile it references. |
| Bulk create events | `POST /api/event-bulk-create-jobs/` | Up to 1,000 events per request. |

An event needs at least a profile identifier (`id`, `email`, or `phone_number`) and a
metric name. A successful call returns `202 Accepted`, meaning the event was validated and
queued, not that processing finished.

> De-duplication: events de-dupe on the tuple `(profile, metric, unique_id)`. Set a
> distinct `unique_id` per event you want kept distinct, or genuinely separate events may
> be silently discarded as duplicates.

### Profiles

| Action | Endpoint |
|---|---|
| Create profile | `POST /api/profiles/` |
| Update profile | `PATCH /api/profiles/{id}/` |
| Subscribe profiles | `POST /api/profile-subscription-bulk-create-jobs/` |

> A profile needs at least one identifier (`email`, `phone_number`, `external_id`, or
> `anonymous_id`). Updating an existing profile's identifiers must be done server-side with
> the private key; client-side attempts return `202` but won't apply the change.

---

## Rate limits

Every endpoint is rate limited per account, using a fixed-window algorithm with two windows
that apply at the same time:

- Burst: a 1-second window
- Steady: a 1-minute window

Each endpoint is assigned a tier (XS / S / M / L / XL); the burst and steady figures for
that tier are on the endpoint's reference page. Example tiers:

| Tier | Burst | Steady |
|---|---|---|
| XS | 1/s | 15/m |
| S | 3/s | 60/m |
| M | 10/s | 150/m |
| L | 75/s | 700/m |
| XL | 350/s | 3,500/m |

> Read the specific endpoint's documented limit rather than assuming a tier. Some
> parameters (e.g. extra `include`/`additional-fields`) change the effective limit.

Handling:

- Hitting either window returns `429`; read the `Retry-After` header and wait.
- Use exponential back-off if you hit limits consistently.
- Non-429 responses include `RateLimit`-style headers showing remaining quota; watch them
  to throttle proactively.
- Maximum payload size is 5 MB (decompressed); a single string field can't exceed 100 KB.

For high volume, prefer the bulk endpoints over many single calls.

---

## Credentials checklist (sample → live)

- [ ] `KLAVIYO_PRIVATE_KEY`, private API key scoped to the permissions needed
- [ ] `KLAVIYO_API_REVISION`, the pinned stable revision date
- [ ] (Client-side only, if ever used) public key / Site ID
- [ ] Metric names and event payload shape agreed for the events being sent

---

## References

- API overview: <https://developers.klaviyo.com/en/reference/api_overview>
- Authentication: <https://developers.klaviyo.com/en/docs/authenticate_>
- Versioning & deprecation policy: <https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy>
- Rate limits & error handling: <https://developers.klaviyo.com/en/docs/rate_limits_and_error_handling>
- Events API overview: <https://developers.klaviyo.com/en/reference/events_api_overview>
