# Step 2 — Install the prerequisites

← [Back to README](../../README.md)

You need two things: **Node.js** and **PostgreSQL**.

---

## 2.1 Node.js (v24 LTS)

1. Go to https://nodejs.org and download the **LTS** installer for Windows (.msi).
2. Run the installer. Accept all defaults. You do **not** need the optional "Tools for
   Native Modules" checkbox.
3. Close and reopen PowerShell, then verify:

```powershell
node --version    # should print v24.x.x (v20+ also works)
npm --version
```

If `node` is "not recognized", see
[Troubleshooting → PATH issues](troubleshooting.md#node-or-psql-is-not-recognized).

---

## 2.2 PostgreSQL 16

1. Go to https://www.postgresql.org/download/windows/ and click **Download the
   installer** (EDB installer).
2. Choose PostgreSQL **16.x** for Windows x86-64.
3. Run the installer:
   - Keep all components ticked (you don't strictly need Stack Builder — you can untick
     it).
   - When asked for a **password for the `postgres` superuser**, choose one and **write
     it down**. You will need it once, in the next section.
   - Keep the default port **5432**.
   - Accept the default locale.
4. Verify in a **new** PowerShell window:

```powershell
psql --version
```

If `psql` is "not recognized", the PostgreSQL `bin` folder isn't on your PATH — see
[Troubleshooting](troubleshooting.md#node-or-psql-is-not-recognized).

---

Next: [Step 3 — Set up the database](database-setup.md)
