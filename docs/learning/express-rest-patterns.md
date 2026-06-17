# Learning - Node.js / Express REST patterns

*Reviewed for the Phase 1 checklist, mapped to the hub's backend structure.*

## Layering (separation of concerns)
- **Routes/Router** - declare the URL surface (`/api/inventory`, `/api/manufacturers`,
  `/api/auth/login`…) and attach middleware. Thin: no business logic here.
- **Controllers** - translate HTTP ↔ application: read params/body, call a service,
  shape the response and status code.
- **Services** - the actual logic (reorder checks, role filtering, talking to the
  external APIs). Reusable and testable without HTTP.
- **Data layer** - DB queries (parameterised, never string-concatenated).
Keeping these separate means the same service powers an HTTP route today and a
`node-cron` job (automated stock checks) without duplication.

## Middleware (runs in order, per request)
- Parsing (`express.json()`), logging, CORS.
- **Auth middleware** - verifies the JWT, sets `req.user` (id + role); see the JWT note.
- **Authorisation/RBAC** - checks `req.user.role` against what the route allows;
  partner-scoped routes additionally inject the row-level `owner` filter.
- **Centralised error handler** - an `(err, req, res, next)` handler at the end maps
  errors to clean JSON + status codes, so controllers can just `throw`/`next(err)`.

## REST conventions we follow
- Nouns + HTTP verbs: `GET /manufacturers`, `POST /manufacturers`,
  `GET /manufacturers/:id`, `PUT /manufacturers/:id`, `DELETE /manufacturers/:id`.
- Correct status codes: `200/201`, `400` (bad input), `401` (no/invalid token),
  `403` (authenticated but not allowed - the RBAC denials), `404`, `500`.
- Consistent JSON envelopes for data and errors.

## Talking to the six external APIs
- Wrap each integration in its own service module (`shopifyService`, `zohoService`…)
  so auth/headers/rate-limit-retry live in one place. The `scripts/api-tests/*` calls
  are the seed of these - same endpoints, same headers.
- Apply **retry-on-429 with backoff** at this layer (Zoho Books has no `Retry-After`).

## Robustness
- Validate input at the controller boundary.
- Never block the event loop; `await` external calls and handle failures so one slow
  API doesn't take a request (or a cron run) down.
