# Step 6 — Logging in

← [Back to README](../../README.md)

The demo seed (`npm run db:seed`) creates one account per role. **All demo passwords are
`radiance123`** — change them before any real use (Admin → Team Members page, or re-seed
with new values in `backend/db/seed.js`).

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
