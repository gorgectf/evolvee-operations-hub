@echo off
start "Backend"  powershell -NoExit -Command "cd '%~dp0backend'; npm start"
start "Frontend" powershell -NoExit -Command "cd '%~dp0frontend'; npm run dev"
