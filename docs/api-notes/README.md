# Evolvée Radiance Operations Hub — API Documentation

Reference documentation for the six external APIs the Operations Hub integrates.
Each service has its own file. The three Zoho products share one OAuth flow, which
is documented once in `zoho-auth.md` and referenced by each Zoho service file.

| Service | File | Direction relative to the Hub | V1 use |
|---|---|---|---|
| Shopify Admin API | `shopify.md` | Hub **pulls** (request/response, scheduled) | Orders, products, customers, inventory levels, locations |
| Zoho — shared auth | `zoho-auth.md` | — | OAuth 2.0, regional data centre, common rate-limit notes |
| Zoho Inventory | `zoho-inventory.md` | Hub **pulls** (request/response, scheduled) | Stock on hand / available stock per item |
| Zoho Books | `zoho-books.md` | Hub **pulls** (request/response, scheduled) | Invoices / revenue |
| Zoho CRM | `zoho-crm.md` | Hub **pulls** (request/response, scheduled) | Contacts / top customers |
| AfterShip Tracking API | `aftership.md` | AfterShip **pushes** to Hub (webhooks, inbound) + Hub pulls/creates trackings | Shipping overview |
| Klaviyo | `klaviyo.md` | Hub **pushes** to Klaviyo (outbound only) | Event/profile sync (V2 marketing analytics deferred) |

## Data-flow map

```
                 request / response (Hub pulls)
   ┌──────────────────────────────────────────────────────┐
   │                                                      ▼
 Shopify ◄── Zoho Inventory ◄── Zoho Books ◄── Zoho CRM ◄── [ Operations Hub ]
                                                            │   ▲        │
                                                            │   │        │ outbound only
                                                            │   │        ▼
                                              webhook push  │   │     Klaviyo
                                       (inbound to backend) │   │
                                                  AfterShip ┘   │
                                                  (Hub also pulls/creates trackings)
```

- **Pull integrations** (Shopify, all three Zoho products): the backend makes
  scheduled outbound requests on a `node-cron` schedule and stores the responses.
- **AfterShip** is primarily a **webhook push** into the backend (inbound). The Hub
  also makes outbound calls to create/update trackings and read courier data.
- **Klaviyo** is **outbound only** for this project — the Hub sends events and
  profile data to Klaviyo; nothing is pulled back in V1/V2 scope.

## Conventions used in these files

- Every file pins to a **specific API version** in the base URL or a version header.
  Do not use `latest` in production; upgrade deliberately.
- Secrets (tokens, client secrets, API keys) live in `.env` and are never committed.
  Each file lists the exact `.env` variable names it expects.
- Each file ends with a **Credentials checklist** — the values needed before that
  source can switch from sample mode to live mode.

## Sample vs live mode

Each source can run in sample mode or live mode independently, configured per source
in `.env`. Switch a source to live once its credentials checklist is complete.
