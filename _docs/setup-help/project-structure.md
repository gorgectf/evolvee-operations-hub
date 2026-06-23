# Step 10 — Project structure reference

← [Back to README](../../README.md)

```
operations-hub/
├── netlify.toml              # Netlify build config (base=frontend, SPA redirect)
├── render.yaml               # Render Blueprint: backend web service + Postgres database
├── .gitignore
├── backend/
│   ├── package.json          # scripts: start, dev, db:schema, db:seed, db:setup, db:reset
│   ├── .env.example          # copy to .env; all config documented inline
│   ├── db/
│   │   ├── schema.sql        # all tables
│   │   ├── applySchema.js
│   │   └── seed.js           # sample users, manufacturers, products, history
│   └── src/
│       ├── server.js
│       ├── config/           # env loader, pg pool
│       ├── middleware/       # JWT auth + role permissions, error handler
│       ├── routes/           # auth, users, dashboard, manufacturers,
│       │                     # products, alerts, productionRuns, sync
│       ├── jobs/             # stockCheck.js (node-cron)
│       └── services/
│           ├── apiClient.js  # external fetch wrapper + sync status recording
│           ├── integrations/ # shopify, zohoInventory, zohoBooks, zohoCrm,
│           │                 # aftership, qrPartner (placeholder), zohoAuth
│           └── sampleData/   # bundled JSON used in sample mode
└── frontend/
    ├── package.json
    ├── vite.config.js        # dev proxy /api → localhost:4000
    ├── .env.example          # VITE_API_BASE (production only)
    └── src/
        ├── api.js            # fetch wrapper, token handling
        ├── App.jsx           # routes + permission-filtered nav shell
        └── pages/            # Login, Dashboard, Manufacturers,
                              # ManufacturerDetail, Products, Alerts,
                              # ProductionRuns, Users
```
