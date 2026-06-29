# Step 3 — Set up the database

← [Back to README](../../README.md)

The app uses its own database (`operations_hub`) and its own user (`opshub`), so it
won't touch anything else on your machine.

Connect as the `postgres` superuser (it'll prompt for the password you set during install):

```powershell
psql -U postgres
```

At the `postgres=#` prompt, paste these three lines. You can change the password, just
use the same one in `.env` later:

```sql
CREATE USER opshub WITH PASSWORD 'opshub_dev_password';
CREATE DATABASE operations_hub OWNER opshub;
\q
```

That's it. The tables are created automatically in the next step.

---

Next: [Step 4 — Set up and run the backend](backend-setup.md)
