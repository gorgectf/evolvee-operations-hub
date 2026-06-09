# Evolvee Radiance - Operations Hub

The Operations Hub is an internal web application that centralises Evolvee Radiance's day-to-day operations into a single place. It pulls live data from the tools the business already runs on--Shopify, Zoho, AfterShip, and Klaviyo--and surfaces it as an at-a-glance dashboard, while giving the team a structured way to manage manufacturer relationships and reorder cycles. The goal is to replace scattered spreadsheets and manual checks with one reliable, role-aware system that scales as the business grows.

> **Status:** Phase 1 (Setup & Learning). This repository currently contains the project scaffold; feature modules are built out from Phase 2 onward.

---

## Systems

The hub is made up of two main systems, plus shared access control.

**1. Operations Dashboard**
A read-oriented overview of the business. Its V1 modules are Inventory, Sales, Top Customers, Revenue, Shipping, and Reorder Alerts, each fed from an external API (see [`docs/architecture`](docs/architecture)). A scheduled job checks stock against reorder thresholds and raises alerts automatically.

**2. Manufacturer Tool**
A working tool for managing manufacturer relationships: a list view of all manufacturers and a detail view per manufacturer covering contact details, assigned SKUs, reorder thresholds, a communication log, and production runs.

**User Management** sits across both systems, providing authentication and role-based access so team members only see what their role allows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL 17 |
| Scheduler | node-cron |
| Auth | JWT + role-based access middleware |
| Frontend hosting | Netlify |
| Backend hosting | Railway (with managed PostgreSQL) |
| External APIs | Shopify, Zoho Inventory, Zoho Books, Zoho CRM, AfterShip, Klaviyo |

**Runtime versions:** Node.js 24 LTS - PostgreSQL 17

---

## Project Structure

```
evolvee-operations-hub/
├── frontend/                  # React + Vite app
├── backend/
│   └── src/
│       ├── routes/            # Express route definitions
│       ├── controllers/       # Request handlers
│       ├── services/
│       │   ├── integrations/  # Shopify, Zoho, AfterShip, Klaviyo clients
│       │   └── scheduler/     # node-cron jobs (reorder alerts, syncs)
│       ├── middleware/        # Auth, error handling, CORS
│       ├── models/            # Data models
│       └── db/
│           └── migrations/    # Schema migrations
└── docs/
    ├── api-notes/             # Per-API integration notes (e.g. shopify.md)
    └── architecture/          # Data flow chart, hosting notes
```

---

## Local Setup

### Prerequisites

- **Node.js 24 LTS** — check with `node -v`
- **PostgreSQL 17** — check with `psql --version`
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/evolvee-operations-hub.git
cd evolvee-operations-hub
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in the values (see below)
npm run migrate             # apply database migrations
npm run dev                 # starts the Express server
```

Required `.env` values (never commit the real file):

```
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/evolvee_hub
JWT_SECRET=<a-long-random-string>
SHOPIFY_ACCESS_TOKEN=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
AFTERSHIP_API_KEY=
KLAVIYO_API_KEY=
```

External API keys are supplied during Phase 2 — the backend runs without them for local scaffold work.

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev                 # open the localhost URL shown in the terminal
```

---

## Documentation

- **Implementation Plan** — phase-by-phase build plan → `docs/Implementation_Plan` *(update with the shared Drive/repo link)*
- **Scope Definition** — V1 scope and module definitions → `docs/Scope_Definition` *(update with the shared link)*
- **API integration notes** — [`docs/api-notes/`](docs/api-notes)
- **Architecture** — data flow chart and hosting notes in [`docs/architecture/`](docs/architecture)

---

*Internal project — not for public distribution.*