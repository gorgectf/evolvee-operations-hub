# Integration connectivity tests

← [Back to README](../../README.md) · related: [Step 7 — Sample vs live](../setup-help/sample-vs-live.md)

One file per external service. Each makes a **real** request using the credentials in
`backend/.env` and reports full error detail if it fails — use these to confirm a service
works before flipping the app to live mode.

## Run

From the project root (Node 20+, no `npm install` needed — these are dependency-free):

```powershell
.\test-integrations.bat          # all services, one summary
node _docs\integration-tests\run-all.cjs
node _docs\integration-tests\shopify.test.cjs   # a single service
```

## What you'll see

- **PASS** — the live request succeeded.
- **FAIL** — request, HTTP status, response body, and network cause (e.g. `ENOTFOUND`,
  cert errors) are printed.
- **SKIP** — that service's `*_MODE` isn't `live` in `backend/.env`, or a required
  credential is missing. This is expected for any integration you haven't gone live on
  yet — set e.g. `SHOPIFY_MODE=live` to actually test it.

`node _docs\integration-tests\run-all.cjs --selfcheck` validates the helper logic with no
network calls.
