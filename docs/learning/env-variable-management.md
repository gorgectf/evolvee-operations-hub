# Learning - environment variable management

*Reviewed for the Phase 1 checklist. This is the discipline that keeps the six API
keys safe.*

## Why env vars
Secrets (API keys, tokens, `JWT_SECRET`, DB URL) and per-environment settings must
**not** live in source code. Env vars keep them out of the repo and let the same code
run locally, on Railway, and on Netlify with different values.

## `.env` vs `.env.example`
- **`.env`** - the real values. **Git-ignored, never committed.**
- **`.env.example`** - same variable *names*, placeholder values, committed. It's the
  contract/checklist of what the app needs; a teammate copies it to `.env` and fills
  it in. (Ours lists all six integrations.)
- Verify the ignore in PowerShell: `git check-ignore .env` → should print `.env`.
  If a secret was ever committed, rotating the key is the only real fix.

## Loading them
- Node 20+/24 can load a file directly: `node --env-file=.env server.js`, or our
  test scripts use a tiny loader (`scripts/api-tests/_env.mjs`). Either way the values
  land in `process.env.NAME`.
- Read with a small helper that fails loudly if a required var is missing (our
  `requireEnv`), so a missing credential is an immediate, clear error — not a
  confusing runtime 401 later.

## Production: how Netlify & Railway inject vars
- They don't read your local `.env`. You set the variables in each platform's **env
  panel** (paths recorded in `docs/architecture/hosting.md`), and they're injected at
  build/runtime. Frontend (Netlify) only gets **public**, build-time vars (e.g. the
  API base URL, prefixed per Vite's rules); **all secrets stay on the backend
  (Railway)**.
- Keep the same variable **names** across local and production so nothing is renamed
  between environments.

## Rules of thumb
- One source of truth for names: `.env.example`.
- Never log secret values; never put them in URLs/query strings or client bundles.
- Rotate immediately if a key is exposed.
- Sample vs live mode in this build is itself driven by env (per-source), so flipping
  a source to live is a config change, not a code change, once its credential is set.
