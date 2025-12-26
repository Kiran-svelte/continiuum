@echo off
echo ===================================================
echo   RESTARTING COMPANY.AI SYSTEM
echo ===================================================

echo [1/3] Stopping existing services...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Starting Backend Server...
start "Backend Server" /D "backend" npm start

echo [3/3] Starting Frontend Interface...
start "Frontend App" /D "." npx serve app -p 3000

echo.
echo System Restarted!
echo Please ensure XAMPP MySQL is GREEN (Running).
pause
