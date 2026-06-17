# Learning - JWT authentication

*How the hub's login/auth works, reviewed for the Phase 1 learning checklist.*

## What a JWT is
A **JSON Web Token** is a signed string in three dot-separated parts:
`header.payload.signature` (each base64url-encoded).
- **Header** - the algorithm (we use HMAC `HS256`) and token type.
- **Payload** - the *claims*: who the user is and metadata. Ours carries the user id,
  **role** (Admin / Developer / Operations Manager / Marketing / Partner-Ambassador),
  `iat` (issued-at) and `exp` (expiry). **Claims are readable by anyone** - base64 is
  not encryption - so never put secrets in the payload.
- **Signature** - HMAC of `header.payload` using our server secret (`JWT_SECRET`).
  This is what makes the token tamper-evident.

## Signing vs verifying
- **Signing** (login): the user presents credentials; on success we build the claims
  and sign them with `JWT_SECRET`, returning the token to the client.
- **Verifying** (every protected request): auth middleware re-computes the signature
  with the same secret. If it matches and `exp` is in the future, the request is
  trusted and `req.user` (id + role) is populated for downstream handlers.
- Because verification only needs the secret (no DB lookup), auth is stateless and fast.

## Expiry & refresh
- Short access-token lifetime limits the damage if a token leaks. On expiry the client
  re-authenticates (or uses a refresh token if/when we add one).
- There is no server-side "logout" for a stateless JWT until it expires - if we ever
  need instant revocation, that requires a denylist or short expiry + refresh tokens.

## How it ties into this project
- The token's **role claim** is the input to RBAC: route/middleware checks gate which
  modules a user can hit, and the **Partner/Ambassador** role additionally needs
  **row-level scoping** (see the schema-design note) - module access alone isn't enough.
- `JWT_SECRET` is an environment variable, never committed (see env-management note).

## Watch-outs
- Keep `JWT_SECRET` long and random; rotating it invalidates all live tokens.
- Always set `exp`. Never trust claims without verifying the signature first.
