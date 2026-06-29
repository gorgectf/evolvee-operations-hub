# Architecture & maintenance reference

← [Back to README](../README.md)

How the pieces fit together and how to change them. Setup instructions are in
[`setup-help/`](setup-help/) and the quirks of each external API are in
[`api-notes/`](api-notes/). This document covers the parts that aren't obvious
from reading any single file.

---

## 1. Shape of the system

There are two deployables in one repo.

```
Browser ──► frontend (React/Vite SPA)  ──HTTP /api──►  backend (Express)  ──►  PostgreSQL
                                                            │
                                                            └──►  Shopify / Zoho CRM / AfterShip
```

The frontend is a static SPA. In production Netlify serves the built `dist/`
folder; there's no Node server in front of it. In development Vite proxies `/api`
to `localhost:4000` (see `vite.config.js`).

The backend is a single Express process. It talks to Postgres and the three
external services, and it runs the stock-check cron job in the same process.

Postgres is the only thing that persists. Data from the external services is
fetched on demand and not stored, apart from the `sync_status` table, which keeps
the result of the last fetch. There's no queue, cache, or separate worker.

---

## 2. Request lifecycle

Here's what happens on a typical authenticated call, using the dashboard
inventory tile as the example:

1. The frontend calls `api('/dashboard/inventory')` ([frontend/src/api.js](../frontend/src/api.js)).
   That wrapper prefixes `/api`, attaches `Authorization: Bearer <token>` from
   `localStorage`, and parses the JSON response.
2. Express matches `app.use('/api/dashboard', …)` ([backend/src/server.js](../backend/src/server.js)).
3. `router.use(authenticate)` verifies the JWT and sets `req.user`
   ([backend/src/middleware/auth.js](../backend/src/middleware/auth.js)).
4. `requirePermission('inventory')` checks `req.user.role` against `ROLE_PERMISSIONS`.
5. The handler calls an integration service such as `shopify.getStockLevels()`,
   which picks off / sample / live (see §4) and records a `sync_status` row.
6. Errors thrown in the handler are caught by `asyncRoute` and passed to
   `errorHandler` ([backend/src/middleware/errorHandler.js](../backend/src/middleware/errorHandler.js)),
   which returns `{ error }` as JSON.
7. Back on the frontend, a `401` clears the session and redirects to `/login`.
   Any other non-2xx response throws with the server's `error` message.

The distinction between `401` and `403` matters. A `401` means the token is
missing or expired, so the user is signed out and sent to login. A `403` means
they're logged in but their role doesn't cover the module, so the error is shown
in place and the session is left alone.

---

## 3. Auth & permission model

Authentication is a stateless JWT. There are no server-side sessions, so signing
out just means dropping the token on the client. Token lifetime comes from
`JWT_EXPIRES_IN` and defaults to `8h`.

Permissions map roles to modules and are defined in one place: `ROLE_PERMISSIONS`
in [middleware/auth.js](../backend/src/middleware/auth.js).

| Module key | admin | developer | ops_manager | marketing | partner |
|---|:-:|:-:|:-:|:-:|:-:|
| inventory | ✓ | ✓ | ✓ | | |
| sales | ✓ | ✓ | ✓ | ✓ | |
| customers | ✓ | ✓ | ✓ | ✓ | |
| revenue | ✓ | ✓ | ✓ | | |
| shipping | ✓ | ✓ | ✓ | | |
| alerts | ✓ | ✓ | ✓ | | |
| partners | ✓ | ✓ | | ✓ | ✓ |
| manufacturers | ✓ | ✓ | ✓ | | |
| users | ✓ | | | | |
| sync | ✓ | ✓ | ✓ | | |

The same list is used in two places: the backend enforces it on every route
through `requirePermission`, and the frontend reads it (`user.permissions`, set at
login in [routes/auth.js](../backend/src/routes/auth.js)) to decide which nav links
and pages to show. The frontend side is only there to hide things the user can't
use. The backend check is the actual access control, so don't move enforcement
into the SPA.

A few things to be aware of before editing this:

- The products and production-run routes require the `manufacturers` permission.
  There is no separate "products" key (`products.js` and `productionRuns.js` both
  call `requirePermission('manufacturers')`).
- `revenue` is included in `ops_manager` by default. The README treats this as a
  policy decision; remove `'revenue'` from that role's array to hide it.
- Changing what a role can see is a one-line edit to its array. Adding a whole new
  role takes a few more steps, covered in §7.4.

---

## 4. Integration mode system (off / sample / live)

Each external service has a mode set by an environment variable: `SHOPIFY_MODE`,
`ZOHO_CRM_MODE`, `AFTERSHIP_MODE`. These load in
[config/env.js](../backend/src/config/env.js) as `env.modes.*`.

Every integration function has the same three branches.
[shopify.js](../backend/src/services/integrations/shopify.js) is the clearest
example to copy from:

- `off` returns an empty array and records the sync as OK. The tile renders empty
  and nothing errors.
- `sample` returns the bundled JSON from `services/sampleData/*.json`, with no
  network call.
- Anything else is treated as live. Call the real API through `callExternal()`,
  transform the response, and record the sync.

`callExternal()` ([services/apiClient.js](../backend/src/services/apiClient.js)) is
the only place that should call `fetch()` for an external API. It owns the 15-second
timeout, the error formatting, and the optional header capture used for pagination.
`recordSync()` in the same file upserts a row into `sync_status` after each attempt,
so the frontend can show that an integration is stale or failing instead of just
displaying nothing. `GET /api/sync/status` reads those rows.

So: any new external call goes through `callExternal`, and any new integration
function calls `recordSync` on both success and failure. Don't skip either.

---

## 5. Data model

The full schema is in [backend/db/schema.sql](../backend/db/schema.sql). It's applied
by `applySchema.js`, which uses `IF NOT EXISTS` throughout so it's safe to run more
than once. That same property is what makes it the migration mechanism (see §7.5).

```
users ─┐ (created_by / logged_by, SET NULL)
       ├──< reorder_history
       └──< communications

manufacturers ──< manufacturer_contacts   (CASCADE)
      │       ──< communications           (CASCADE)
      │       ──< production_runs          (CASCADE)
      │       ──< reorder_history          (SET NULL)
      └──────────  products.manufacturer_id (SET NULL)

products ──1:1── reorder_thresholds  (CASCADE)
     │     ──< reorder_alerts         (CASCADE)
     │     ──< reorder_history        (CASCADE)
     └─────< production_runs          (SET NULL)

sync_status   (standalone, PK = source)
```

Three details that aren't obvious from the table definitions:

- `products` has no stock column. Stock is always fetched live from Shopify and
  matched to a product by `shopify_inventory_item_id` first, then by `sku`. The live
  store has no SKUs, which is why the item-id column exists. The matching logic is in
  [jobs/stockCheck.js](../backend/src/jobs/stockCheck.js).
- There's at most one open alert per product. `alertIfLowStock` won't create a new
  alert while an `open` or `acknowledged` one exists, so resolving an alert is what
  allows the next one to fire.
- `role` and the various `status` and `channel` columns have CHECK constraints.
  Adding a new value (a new role, a new production-run status) means editing the
  constraint as well as the application code. Grep for the literal to find both.

---

## 6. API surface

Everything is under `/api`. In the auth column, "token" means a valid JWT is
required and "module" means the user also needs that permission. `GET /api/health`
is the only fully public route.

| Method & path | Auth | Notes |
|---|---|---|
| POST `/auth/login` | public | returns `{ token, user }` |
| GET `/auth/me` | token | refresh user + permissions |
| POST `/auth/password` | token | change own password |
| GET `/dashboard/inventory` | inventory | Shopify stock |
| GET `/dashboard/sales` | sales | Shopify sales overview |
| GET `/dashboard/customers` | customers | Shopify + Zoho |
| GET `/dashboard/revenue` | revenue | daily/weekly/monthly |
| GET `/dashboard/shipping` | shipping | AfterShip |
| GET `/dashboard/alerts-summary` | alerts | open-alert counts |
| GET `/dashboard/partners` | partners | placeholder until QR API |
| GET `/manufacturers` · `/:id` | manufacturers | list / detail |
| POST `/manufacturers` · PATCH/DELETE `/:id` | manufacturers | CRUD |
| POST `/manufacturers/:id/contacts` · DELETE `/contacts/:cid` | manufacturers | contacts |
| POST `/manufacturers/:id/communications` | manufacturers | comm log |
| POST `/manufacturers/:id/reorders` | manufacturers | reorder history entry |
| GET/POST `/products`, PATCH `/:id/manufacturer`, PUT `/:id/threshold` | manufacturers | not a "products" key |
| GET `/alerts`, PATCH `/:id`, DELETE `/:id` | alerts | acknowledge/resolve |
| POST `/alerts/check-now` | alerts | run stock check on demand |
| GET/POST `/production-runs`, PATCH `/:id` | manufacturers | |
| GET `/users`, POST, PATCH `/:id`, DELETE `/:id` | users | admin-only in practice |
| GET `/sync/status` | sync | integration health |

This table is the only flat list of the whole surface, so add a row whenever you
add a route.

---

## 7. How to change things

### 7.1 Add a dashboard tile or endpoint
1. Add the handler in the relevant `routes/*.js`, guarded by `requirePermission('<module>')`.
2. If it needs external data, add a function to the integration service that follows
   the off/sample/live pattern and records its sync.
3. Fetch it on the frontend with `api('/path')`.
4. Add the row to the table in §6.

### 7.2 Add a new external integration
1. Create a file in `services/integrations/`. Every network call goes through `callExternal`.
2. Add a `*_MODE` variable to `.env.example` and to `config/env.js` (`env.modes.x`).
3. Add a `sampleData/x.json` file so `sample` mode works offline.
4. Call `recordSync('x', mode, ok, message)` on both success and failure.
5. Write up the API's quirks in `api-notes/x.md` and add an integration test under
   `_docs/integration-tests/`.

### 7.3 Add a permission module
1. Add the key to the roles that should have it in `ROLE_PERMISSIONS`.
2. Guard the backend routes with `requirePermission('newkey')`.
3. Gate the frontend nav and page with `can('newkey')`.

### 7.4 Add a role
1. Add it to `ROLE_PERMISSIONS` with its list of modules.
2. Update the `role` CHECK constraint in `schema.sql`, and run it against any existing databases.
3. Add it to the seed scripts if it needs a demo user.

### 7.5 Schema changes and migrations
There's no migration framework. `applySchema.js` runs `schema.sql` on every boot, and
because everything uses `IF NOT EXISTS` it's idempotent. For an additive change such as
a new table, column, or index, write it as `CREATE … IF NOT EXISTS` or `ALTER TABLE …
ADD COLUMN IF NOT EXISTS` (the existing `shopify_inventory_item_id` column is the
pattern) so it applies to both fresh and existing databases. Destructive changes —
dropping, renaming, or retyping a column, or tightening a constraint — aren't
idempotent. Run those by hand against the live database and record them in
[deployment/going-live.md](deployment/going-live.md).

### 7.6 Background job
The stock check runs on `STOCK_CHECK_CRON` (hourly by default) plus once at startup. It
runs in the main process, not a separate worker. `POST /api/alerts/check-now` triggers
it on demand. If the checks ever start taking long enough to matter, that's the point to
move them out of process.

---

## 8. Versioning & release

The backend and frontend versions live in their respective `package.json` files. The
stack/version block in the README is generated, not hand-written — run `npm run
docs:versions` (backend) or `node update-readme-versions.cjs`. Edit the script rather
than the text between the `versions:start` and `versions:end` markers.

Deploy configuration is in `render.yaml` (the backend and Postgres Blueprint) and
`netlify.toml` (the frontend). The full walkthrough is in
[deployment/deployment.md](deployment/deployment.md).

`npm test` on the backend runs the integration suite in `_docs/integration-tests/`.
Those tests hit either the live or sample integrations, as described in that folder's
README.

---

## 9. Conventions

The backend is CommonJS (`require`), Node 20 or newer, plain Express. There's no
TypeScript and no ORM; database access is raw parameterised `pg` queries through the
`query()` helper in `config/db.js`. Always parameterise SQL with `$1`, `$2`, and so on.
There's no query builder, and that's intentional. Route handlers wrap their async work
in `asyncRoute(...)` so that thrown errors reach `errorHandler`.

The frontend is React 18 with react-router and no state-management library. The session
lives in `localStorage` and components fetch their own data on mount. Keep it that way
unless a page genuinely needs shared state.
