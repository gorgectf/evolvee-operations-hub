@echo off
REM One-time setup for a LIVE server: seeds a SINGLE admin user (no demo data).
REM For the demo/sample dataset instead, run setup-demo.bat.
REM Assumes Node, PostgreSQL, and the opshub database/role exist
REM (see _docs\setup-help\prerequisites.md and database-setup.md).

echo === Backend ===
cd /d "%~dp0backend"
call npm install || goto :err
if not exist .env copy .env.example .env
echo Review backend\.env (DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD) before running setup if needed.
call npm run db:reset || goto :err
call npm run db:seed:admin || goto :err

echo === Frontend ===
cd /d "%~dp0frontend"
call npm install || goto :err

echo.
echo Setup complete (admin user seeded). If you left ADMIN_PASSWORD blank, the
echo generated password was printed once above - save it now.
echo Run run-server.bat to start both servers.
goto :eof

:err
echo.
echo Setup failed (exit %errorlevel%). See message above.
exit /b %errorlevel%
