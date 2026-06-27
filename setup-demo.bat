@echo off
REM One-time setup for SAMPLE mode: seeds the full demo dataset (5 role users,
REM manufacturers, products) for local/sandbox use. All demo passwords are radiance123.
REM For a live server with a single admin user instead, run setup.bat.
REM Assumes Node, PostgreSQL, and the opshub database/role exist
REM (see _docs\setup-help\prerequisites.md and database-setup.md).

echo === Backend ===
cd /d "%~dp0backend"
call npm install || goto :err
if not exist .env copy .env.example .env
echo Review backend\.env (DATABASE_URL, JWT_SECRET) before running setup if needed.
call npm run db:schema || goto :err
call npm run db:seed || goto :err

echo === Frontend ===
cd /d "%~dp0frontend"
call npm install || goto :err

echo.
echo Setup complete (demo data seeded). Logins are in _docs\setup-help\logging-in.md
echo (all passwords: radiance123). Run run-server.bat to start both servers.
goto :eof

:err
echo.
echo Setup failed (exit %errorlevel%). See message above.
exit /b %errorlevel%
