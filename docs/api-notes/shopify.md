# Shopify Admin API — Notes
**Evolvee Radiance Operations Hub · Phase 2 reference**  
*Last updated: 9 June 2026*

---

## ⚠️ REST API legacy status

The REST Admin API is a legacy API as of October 1, 2024. Starting April 1, 2025, all new public apps must be built exclusively with the GraphQL Admin API.

**What this means for this project:**  
Evolvée Radiance's Operations Hub is an internal custom app (not a public app listed on the Shopify App Store), so REST access is still available and functional. However, build with migration in mind — prefer read-only REST calls for V1, and plan to move to GraphQL for any write operations or new modules added in later phases. Shopify has not announced a hard sunset date for REST on custom apps.

---

## Authentication

### Custom app token (what we're using)

To create a custom app, navigate to Shopify Admin → Apps → Develop apps. Once the app is set up, you'll receive an Admin API access token, which serves as the key to authenticate your requests.

Include your token as a `X-Shopify-Access-Token` header on all API queries.

```
GET https://{shop}.myshopify.com/admin/api/2026-01/orders.json
X-Shopify-Access-Token: {access_token}
```

**Important:** The access token is shown **once** on install. If missed, the app must be uninstalled and reinstalled — this generates a new token and invalidates the old one. Store it in the `.env` file under `SHOPIFY_ACCESS_TOKEN` and never commit it.

### OAuth (public/custom apps via Dev Dashboard)

Public and custom apps created in the Dev Dashboard generate tokens using OAuth. To keep the platform secure, apps need to request specific access scopes during the install process — only request as much data access as your app needs.

For V1 of this project the custom app token approach above is sufficient. OAuth becomes relevant if the app is ever distributed to other stores.

---

## Access scopes required for V1 modules

Request only what V1 needs. These scopes are set in Shopify Admin when configuring the custom app.

| Module | Read scope | Write scope (if needed) |
|---|---|---|
| Orders | `read_orders` | `write_orders` |
| Orders (>60 days) | `read_all_orders` | — |
| Products | `read_products` | — |
| Customers | `read_customers` | — |
| Inventory Levels | `read_inventory` | `write_inventory` |
| Locations | `read_locations` | — |

By default, the Order API allows access to data from the last 60 days. To retrieve older data, you must request the `read_all_orders` scope in addition to `read_orders`. Shopify will only approve this if you have a valid business reason.

---

## V1 module endpoints

Base URL pattern: `https://{shop}.myshopify.com/admin/api/2026-01/`

### Orders

An order is a customer's request to purchase one or more products from a shop. You can create, retrieve, update, and delete orders using the Order resource.

| Action | Endpoint |
|---|---|
| List orders | `GET /orders.json` |
| Single order | `GET /orders/{id}.json` |
| Count orders | `GET /orders/count.json` |

Useful query params on list: `status`, `financial_status`, `fulfillment_status`, `created_at_min`, `created_at_max`, `limit` (max 250), `since_id`.

**Note:** You can't change the items or quantities in an order using the REST API — that requires the GraphQL Admin API.

---

### Products

| Action | Endpoint |
|---|---|
| List products | `GET /products.json` |
| Single product | `GET /products/{id}.json` |
| Count products | `GET /products/count.json` |
| Product variants | `GET /products/{id}/variants.json` |

Useful query params: `title`, `vendor`, `product_type`, `published_status`, `limit`, `since_id`.

---

### Customers

| Action | Endpoint |
|---|---|
| List customers | `GET /customers.json` |
| Single customer | `GET /customers/{id}.json` |
| Count customers | `GET /customers/count.json` |
| Customer orders | `GET /customers/{id}/orders.json` |

The Orders resource requires access to protected customer data — enable this in the custom app's data protection settings if customer PII appears in order responses.

---

### Inventory Levels

An inventory level represents the quantities of an inventory item for a location. Each inventory level belongs to one inventory item and has one location. For every location where an inventory item can be stocked, there's an inventory level that represents the inventory item's quantities relating to that location.

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

**Required param:** The `GET /inventory_levels.json` endpoint requires either `inventory_item_ids` or `location_id` — it will not return results without one of them.

---

## Rate limits

### Algorithm: leaky bucket

Shopify employs a leaky bucket algorithm. The bucket has a maximum capacity of 40 requests. Each request fills the bucket by 1 request. Requests "leak" out of the bucket at a consistent rate of 2 requests per second.

| Plan | Bucket size | Leak rate |
|---|---|---|
| Standard | 40 requests | 2 req/s |
| Shopify Plus | 400 requests | 20 req/s |

Evolvée Radiance is on a standard plan — design sync jobs around the 2 req/s sustained rate.

### Monitoring usage

You can check how many requests you've already made using the `X-Shopify-Shop-Api-Call-Limit` response header. It lists how many requests you've made for a particular store — for example `32/40` means 32 used, 40 is the bucket size. The request count decreases according to the leak rate over time.

### When the limit is exceeded

When a request goes over a rate limit, a `429 Too Many Requests` error and a `Retry-After` header are returned. The `Retry-After` header contains the number of seconds to wait until you can make a request again.

### Handling strategy for this project

Rate limits are measured per-app, per-store. For the scheduled sync jobs (Node-cron):

1. **Read the `X-Shopify-Shop-Api-Call-Limit` header** on every response and back off if usage is above ~35/40.
2. **Space scheduled jobs** — hourly inventory/order syncs are well within limits; don't fire all API calls at once on the cron tick.
3. **Implement exponential back-off** on any 429 response: read `Retry-After`, wait that many seconds, then retry once before failing with an error log.
4. **Batch requests where possible** — use `limit=250` on list endpoints rather than paginating with small page sizes.

---

## API versioning

Shopify releases new API versions quarterly (`YYYY-01`, `YYYY-04`, `YYYY-07`, `YYYY-10`). The current stable version is **2026-01**. Versions are supported for a minimum of 12 months after release. Pin to a specific version in the base URL and upgrade deliberately — do not use `latest` in production.

---

## Useful links

- REST Admin API reference: https://shopify.dev/docs/api/admin-rest
- Rate limits: https://shopify.dev/docs/api/admin-rest/usage/rate-limits
- Access scopes: https://shopify.dev/docs/api/usage/access-scopes
- GraphQL migration guide: https://shopify.dev/docs/api/admin-graphql (for future reference)