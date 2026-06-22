# Step 3 — Set up the database

← [Back to README](../../README.md)

The app uses its own database (`operations_hub`) and its own database user (`opshub`),
so it never touches anything else on your machine.

Open PowerShell and connect as the `postgres` superuser (it will prompt for the password
you set during installation):

```powershell
psql -U postgres
```

At the `postgres=#` prompt, paste these three lines (you can change the password — just
remember to use the same one in `.env` later):

```sql
CREATE USER opshub WITH PASSWORD 'opshub_dev_password';
CREATE DATABASE operations_hub OWNER opshub;
\q
```

That's it. The tables get created automatically by a script in the next step.

---

Next: [Step 4 — Set up and run the backend](backend-setup.md)
