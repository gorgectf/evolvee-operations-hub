# Step 6 — Logging in

← [Back to README](../../README.md)

The demo seed (`npm run db:seed`) creates one account per role. **All demo passwords are
`radiance123`** — change them before any real use (Admin → Team Members page, or re-seed
with new values in `backend/db/seed.js`).

> **Live / online deployments** don't get these demo accounts. They seed a **single admin
> user** instead — run `npm run db:seed:admin`, or set `AUTO_SEED=admin` so the server does
> it on first boot. The admin email comes from `ADMIN_EMAIL`; the password comes from
> `ADMIN_PASSWORD`, or is auto-generated and printed once if you leave that blank. See
> [Step 8 — Deploying](deployment.md). Add the rest of your team from the Team Members page
> once you're in.

| Email | Role | Sees |
|---|---|---|
| `admin@yourdomain.com` | Admin | Everything, incl. user management |
| `dev@yourdomain.com` | Developer | Everything except user management |
| `ops@yourdomain.com` | Operations Manager | Inventory, sales, customers, revenue*, shipping, alerts, manufacturers |
| `marketing@yourdomain.com` | Marketing | Sales, customers, partner module |
| `partner@yourdomain.com` | Partner/Ambassador | Partner module only |

> Update the seed email addresses in `backend/db/seed.js` before seeding any shared or
> production environment.

\* Revenue visibility for the Ops Manager role is currently enabled. To remove it, edit
the role permissions in `backend/src/middleware/auth.js`.

Try logging in as different users to verify each role sees the right tiles and nav items.

---

Next: [Step 7 — Sample data vs live API mode](sample-vs-live.md)
