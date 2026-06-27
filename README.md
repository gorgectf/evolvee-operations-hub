# Operations Hub

Internal operations dashboard and manufacturer/reorder management tool.

**Built with:** React (Vite) · Node.js / Express · PostgreSQL · JWT authentication · node-cron

This README assumes **zero prior setup** on a Windows machine. Follow it top to bottom
and you will have the app running locally. All commands are for **PowerShell**.

Detailed setup steps live in [`_docs/setup-help/`](_docs/setup-help/) - links below.

---

## Contents

1. [What's in this project](#1-whats-in-this-project)
2. [Install the prerequisites](_docs/setup-help/prerequisites.md)
3. [Set up the database](_docs/setup-help/database-setup.md)
4. [Set up and run the backend](_docs/setup-help/backend-setup.md)
5. [Set up and run the frontend](_docs/setup-help/frontend-setup.md)
6. [Logging in](_docs/setup-help/logging-in.md)
7. [Sample data vs live API mode](_docs/setup-help/sample-vs-live.md)
8. [Deploying (Netlify + Railway)](_docs/setup-help/deployment.md)
9. [Troubleshooting](_docs/setup-help/troubleshooting.md)
10. [Project structure reference](_docs/setup-help/project-structure.md)

Other:
[Browser Support](_docs/browser-support.md)
[Going from 'Sample' to 'Live' on a deployed site](_docs/going-live.md)

---

## 1. What's in this project

Two systems in one app:

**Operations Dashboard - core modules**
- Stock levels per SKU with low-stock flags (Shopify)
- Product sales - best and slow sellers (Shopify)
- Top customers (Shopify + Zoho CRM)
- Revenue by day / week / month (Shopify)
- Reorder alerts and manufacturing triggers
- Order & shipping status overview (AfterShip)
- QR partner dashboard - **placeholder tile** until API access is confirmed
- User management (Admin only)

**Manufacturer POC & Reorder Management Tool**
- Manufacturer and contact records (CRUD)
- SKU-to-manufacturer assignment
- Reorder thresholds per SKU
- Automated stock checks (node-cron) that raise reorder alerts
- Reorder history, communication log, production run tracker

**Roles:** `admin`, `developer`, `ops_manager`, `marketing`, `partner` - each sees only
the modules their role permits. Revenue visibility for the Ops Manager role is currently
**enabled** and can be toggled in `backend/src/middleware/auth.js`.

**Deferred modules:** partner sales performance, commissions, influencer gifting (Shopify
Collabs), returns (AfterShip Returns), Marketing Performance (Klaviyo).

---

Continue with [Step 2 - Install the prerequisites](_docs/setup-help/prerequisites.md).
