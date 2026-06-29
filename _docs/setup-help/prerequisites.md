# Step 2 — Install the prerequisites

← [Back to README](../../README.md)

You need two things: Node.js and PostgreSQL.

---

## 2.1 Node.js (v24 LTS)

1. Download the LTS installer (.msi) for Windows from https://nodejs.org.
2. Run it and accept the defaults. You don't need the optional "Tools for Native Modules"
   checkbox.
3. Close and reopen PowerShell, then check the versions:

```powershell
node --version    # v24.x.x (v20+ also works)
npm --version
```

If `node` isn't recognized, see
[Troubleshooting → PATH issues](troubleshooting.md#node-or-psql-is-not-recognized).

---

## 2.2 PostgreSQL 16

1. Go to https://www.postgresql.org/download/windows/ and click Download the installer
   (the EDB installer).
2. Pick PostgreSQL 16.x for Windows x86-64.
3. Run the installer:
   - Leave the components ticked. You can untick Stack Builder; it isn't needed.
   - When it asks for a password for the `postgres` superuser, pick one and write it down.
     You'll need it once, in the next section.
   - Keep the default port, 5432.
   - Accept the default locale.
4. Check it in a new PowerShell window:

```powershell
psql --version
```

If `psql` isn't recognized, PostgreSQL's `bin` folder isn't on your PATH. See
[Troubleshooting](troubleshooting.md#node-or-psql-is-not-recognized).

---

Next: [Step 3 — Set up the database](database-setup.md)
