# Maintenance guide

← [Back to project README](../../README.md)

For whoever keeps the Operations Hub running after it's live. Setup and first-run
problems live in [`setup-help/`](../setup-help/); switching to real data lives in
[`deployment/`](../deployment/). This folder is about the day-to-day: is it healthy,
what do I do when a sync fails, how do I back up the database, how do I add a user.

If something is broken *right now*, jump to the file for that area below. If you're new
to the codebase, read [architecture.md](architecture.md) first, then the precise contracts in
[../reference/](../reference/) (API, data model, frontend). End-user "how do I use this screen"
questions live in the [../user-guide/](../user-guide/).

---

## Maintenance cadence

A quick map of what to check and how often. Each row links to the detail.

| How often | Task | Where |
|---|---|---|
| Daily (2 min) | App health endpoint returns `ok: true`; no sync-failure banner in the app | [monitoring-and-health.md](monitoring-and-health.md) |
| Daily | Scan backend logs for `[stock-check] failed` or repeated `HTTP 5xx` lines | [monitoring-and-health.md](monitoring-and-health.md) |
| Weekly | Confirm the hourly stock check is producing/clearing alerts as expected | [monitoring-and-health.md](monitoring-and-health.md) |
| Weekly | Confirm a database backup exists and is recent | [database-maintenance.md](database-maintenance.md) |
| Monthly | Review integration tokens for upcoming expiry (Shopify token, Zoho refresh token) | [integrations.md](integrations.md) |
| Monthly | `npm audit` on `backend` and `frontend`; apply low-risk patches | [updating-dependencies.md](updating-dependencies.md) |
| As needed | Add/remove a user, reset a password, change a role | [access-management.md](access-management.md) |
| As needed | Restore from backup / roll back a deploy | [backup-and-recovery.md](backup-and-recovery.md) |
| When something breaks | Operational failure runbook (symptom → cause → fix) | [common-issues.md](common-issues.md) |

---

## Files in this folder

- **[architecture.md](architecture.md)** — how the pieces fit together, where each concern
  lives, how a request and a data sync actually flow. Read this before changing code.
- **[monitoring-and-health.md](monitoring-and-health.md)** — what "healthy" looks like, the
  `/api/health` endpoint, the `sync_status` table, reading logs, the node-cron stock check.
- **[database-maintenance.md](database-maintenance.md)** — backups, restore, schema changes,
  the destructive-reset guardrail, routine Postgres upkeep.
- **[integrations.md](integrations.md)** — Shopify and Zoho upkeep: modes, token expiry and
  rotation, rate limits, and exactly what breaks when a credential lapses.
- **[backup-and-recovery.md](backup-and-recovery.md)** — the restore drill, database recovery
  steps, and rolling back a Render/Netlify deploy.
- **[updating-dependencies.md](updating-dependencies.md)** — patching npm deps, deliberate
  upgrades, verifying with the tests, and bumping Node/Postgres.
- **[access-management.md](access-management.md)** — roles, adding/resetting users, sessions,
  and rotating `JWT_SECRET`.
- **[common-issues.md](common-issues.md)** — operational failure runbook (symptom → cause →
  fix), distinct from the setup-focused
  [troubleshooting.md](../setup-help/troubleshooting.md).
