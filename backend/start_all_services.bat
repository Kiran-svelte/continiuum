@echo off
echo =====================================================
echo  ENTERPRISE MULTI-TENANT SYSTEM STARTUP
echo =====================================================
echo.
echo Starting all AI engines and backend services...
echo.

cd /d "%~dp0"

REM Kill existing processes
echo [1/5] Cleaning up existing processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start Leave Constraint Engine (Port 8001)
echo [2/5] Starting Leave Constraint Engine (Port 8001)...
start "Leave Engine" /MIN cmd /c "cd /d ai-services\leave-agent && python constraint_engine.py"
timeout /t 3 /nobreak >nul

REM Start Onboarding Constraint Engine (Port 8002)
echo [3/5] Starting Onboarding Constraint Engine (Port 8002)...
start "Onboarding Engine" /MIN cmd /c "cd /d ai-services\onboarding-agent && python onboarding_engine.py"
timeout /t 3 /nobreak >nul

REM Start Enterprise Multi-Tenant Engine (Port 8003)
echo [4/5] Starting Enterprise Multi-Tenant Engine (Port 8003)...
start "Enterprise Engine" /MIN cmd /c "cd /d ai-services\enterprise && python enterprise_config.py"
timeout /t 3 /nobreak >nul

REM Start Node.js Backend (Port 5000)
echo [5/5] Starting Node.js Backend (Port 5000)...
start "Backend Server" cmd /c "node server.js"
timeout /t 3 /nobreak >nul

echo.
echo =====================================================
echo  ALL SERVICES STARTED
echo =====================================================
echo.
echo  Services Running:
echo  - Leave Constraint Engine:      http://127.0.0.1:8001
echo  - Onboarding Constraint Engine: http://127.0.0.1:8002
echo  - Enterprise Multi-Tenant:      http://127.0.0.1:8003
echo  - Node.js Backend:              http://127.0.0.1:5000
echo.
echo  Frontend: http://localhost:3000
echo.
echo =====================================================
echo.
pause
