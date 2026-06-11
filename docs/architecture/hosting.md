# Hosting & Deployment

## Frontend — Netlify

**Site:** evolvee-operations-hub  
**Repo:** GitHub → evolvee-operations-hub  
**Base directory:** `frontend/`  
**Build command:** `npm run build`  
**Publish directory:** `frontend/dist`

### Environment Variables
**Path:** Site settings → Environment variables  
Add variables here once API credentials are available from Shontayvia.

---

## Backend — Railway

**Site:** railway.app  
**Repo:** GitHub → evolvee-operations-hub  
**Root directory:** `backend/`

### PostgreSQL Service
Provisioned via Railway: **New → Database → Add PostgreSQL**  
Appears as a separate service tile on the project canvas. This becomes the production database.

### Environment Variables
**Path:** Project → service → Variables  
Add variables here once API credentials are available from Shontayvia.