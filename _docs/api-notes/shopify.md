# Shopify Admin API

*Service reference · API version 2026-01*

**Integration role:** Pull (request/response). The backend makes scheduled outbound
calls to Shopify on a `node-cron` schedule and stores the results. Initial scope is
read-only.

---

## REST vs GraphQL — legacy status

The REST Admin API became a legacy API on **October 1, 2024**. From **April 1, 2025**,
all new *public* apps must be built on the GraphQL Admin API.

**What this means here:** an internal **custom app** (not listed on the Shopify App
Store) means REST is still available and functional. Build with migration in mind:

- Prefer **read-only REST** calls for the initial scope.
- Plan to move to **GraphQL** for any write operations or new modules in later phases.
- Shopify has **not** announced a hard sunset date for REST on custom apps.

---

## Authentication

### Custom app token (the method used here)

Create the custom app in **Shopify Admin → Apps → Develop apps**. On install you receive
an **Admin API access token**, which authenticates every request.

Send the token as an `X-Shopify-Access-Token` header on all calls:

```
GET https://{shop}.myshopify.com/admin/api/2026-01/orders.json
X-Shopify-Access-Token: {access_token}
```

> **The token is shown once on install.** If missed, the app must be uninstalled and
> reinstalled — this generates a new token and invalidates the old one. Store it in your
> environment configuration as `SHOPIFY_ACCESS_TOKEN` and never commit it.

### OAuth

Public/custom apps created in the Dev Dashboard generate tokens via OAuth, requesting
specific access scopes at install. The custom app token above is sufficient for an
internal integration; OAuth only becomes relevant if the app is ever distributed to other
stores.

---

## Access scopes

Request only what the current integration needs. These are set in Shopify Admin when
configuring the custom app.

| Module | Read scope | Write scope (if needed) |
|---|---|---|
| Orders | `read_orders` | `write_orders` |
| Orders (>60 days) | `read_all_orders` | — |
| Products | `read_products` | — |
| Customers | `read_customers` | — |
| Inventory Levels | `read_inventory` | `write_inventory` |
| Locations | `read_locations` | — |

> By default the Order API only returns the **last 60 days**. To retrieve older data,
> request `read_all_orders` **in addition to** `read_orders`. Shopify only approves this
> with a valid business reason.

---

## Endpoints

Base URL pattern: `https://{shop}.myshopify.com/admin/api/2026-01/`

### Orders

| Action | Endpoint |
|---|---|
| List orders | `GET /orders.json` |
| Single order | `GET /orders/{id}.json` |
| Count orders | `GET /orders/count.json` |

Useful list params: `status`, `financial_status`, `fulfillment_status`,
`created_at_min`, `created_at_max`, `limit` (max 250), `since_id`.

> You can't change items or quantities on an order via REST — that requires GraphQL.

### Products

| Action | Endpoint |
|---|---|
| List products | `GET /products.json` |
| Single product | `GET /products/{id}.json` |
| Count products | `GET /products/count.json` |
| Product variants | `GET /products/{id}/variants.json` |

Useful params: `title`, `vendor`, `product_type`, `published_status`, `limit`, `since_id`.

### Customers

| Action | Endpoint |
|---|---|
| List customers | `GET /customers.json` |
| Single customer | `GET /customers/{id}.json` |
| Count customers | `GET /customers/count.json` |
| Customer orders | `GET /customers/{id}/orders.json` |

> The Orders resource requires access to **protected customer data**. Enable this in the
> custom app's data protection settings if customer PII appears in order responses.

### Inventory Levels

The inventory model has four layers:

```
Product Variant  →  InventoryItem  →  InventoryLevel  →  Location
(price, images)     (SKU, physical)    (qty per site)     (warehouse)
```

| Action | Endpoint |
|---|---|
| List inventory levels | `GET /inventory_levels.json` |
| Adjust quantity | `POST /inventory_levels/adjust.json` |
| Set quantity | `POST /inventory_levels/set.json` |
| List locations | `GET /locations.json` |

> `GET /inventory_levels.json` **requires** either `inventory_item_ids` or `location_id`
> — it returns nothing without one of them.

---

## Rate limits

**Algorithm: leaky bucket.** Capacity 40 requests; each request fills it by 1; requests
leak out at 2/second.

| Plan | Bucket size | Leak rate |
|---|---|---|
| Standard | 40 requests | 2 req/s |
| Shopify Plus | 400 requests | 20 req/s |

Design sync jobs around the sustained leak rate of your plan.

**Monitoring:** read the `X-Shopify-Shop-Api-Call-Limit` response header (e.g. `32/40`
= 32 used of 40). The count decreases over time at the leak rate.

**On exceed:** a `429 Too Many Requests` plus a `Retry-After` header (seconds to wait).

### Handling strategy (node-cron sync jobs)

1. **Read `X-Shopify-Shop-Api-Call-Limit`** on every response; back off above ~35/40.
2. **Space scheduled jobs** — hourly inventory/order syncs sit well within limits; don't
   fire all calls on a single cron tick.
3. **Exponential back-off** on any 429: read `Retry-After`, wait, retry once, then fail
   with an error log.
4. **Batch where possible** — use `limit=250` on list endpoints rather than small pages.

Rate limits are measured per-app, per-store.

---

## API versioning

Shopify releases versions quarterly (`YYYY-01`, `-04`, `-07`, `-10`). Current stable:
**2026-01**. Versions are supported for a minimum of 12 months after release. Pin to a
specific version in the base URL and upgrade deliberately — never `latest` in production.

---

## Credentials checklist (sample → live)

- [ ] `SHOPIFY_SHOP` — the `{shop}` subdomain for the target store
- [ ] `SHOPIFY_ACCESS_TOKEN` — Admin API access token (shown once on install)
- [ ] Confirmation that all required scopes above are granted on the custom app
- [ ] Protected customer data access enabled (if PII appears in order responses)

---

## References

- REST Admin API reference: <https://shopify.dev/docs/api/admin-rest>
- Rate limits: <https://shopify.dev/docs/api/admin-rest/usage/rate-limits>
- Access scopes: <https://shopify.dev/docs/api/usage/access-scopes>
- GraphQL migration guide: <https://shopify.dev/docs/api/admin-graphql>