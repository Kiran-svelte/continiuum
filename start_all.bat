@echo off
echo ========================================
echo   Company AI System - Complete Startup
echo ========================================
echo.

echo [Step 1/4] Starting Python AI Services...
echo   This will open 5 new windows...
echo.
call start_ai_services.bat
timeout /t 15 /nobreak > nul

echo.
echo [Step 2/4] Starting Node.js Backend...
start "Backend API" cmd /k "cd backend && npm start"
timeout /t 8 /nobreak > nul
echo   Backend API started on port 5000

echo.
echo [Step 3/4] Starting Frontend...
start "Frontend" cmd /k "npx serve app -p 3000"
timeout /t 5 /nobreak > nul
echo   Frontend started on port 3000

echo.
echo [Step 4/4] Opening Browser...
timeout /t 3 /nobreak > nul
start http://localhost:3000

echo.
echo ========================================
echo   ALL SYSTEMS ONLINE!
echo ========================================
echo.
echo Services Running:
echo   - Backend API:     http://localhost:5000
echo   - Frontend:        http://localhost:3000
echo   - Leave AI:        http://localhost:8001
echo   - Onboarding AI:   http://localhost:8003
echo   - Recruitment AI:  http://localhost:8004
echo   - Performance AI:  http://localhost:8006
echo   - Control Center:  http://localhost:8007
echo.
echo IMPORTANT: Keep all windows open!
echo.
echo Press any key to run integration tests...
pause > nul

echo.
echo Running integration tests...
cd backend
node test_ai_system.js

echo.
pause
