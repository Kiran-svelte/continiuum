@echo off
echo ========================================
echo   Starting Python AI Services
echo ========================================
echo.

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo [1/5] Starting Leave Agent (Port 8001)...
start "Leave Agent" cmd /k "cd backend\ai-services\leave-agent && python server.py"
timeout /t 3 /nobreak > nul

echo [2/5] Starting Onboarding Agent (Port 8003)...
start "Onboarding Agent" cmd /k "cd backend\ai-services\onboarding-agent && python server.py"
timeout /t 3 /nobreak > nul

echo [3/5] Starting Recruitment Agent (Port 8004)...
start "Recruitment Agent" cmd /k "cd backend\ai-services\recruitment-agent && python server.py"
timeout /t 3 /nobreak > nul

echo [4/5] Starting Performance Agent (Port 8006)...
start "Performance Agent" cmd /k "cd backend\ai-services\performance-agent && python server.py"
timeout /t 3 /nobreak > nul

echo [5/5] Starting Control Center (Port 8007)...
start "Control Center" cmd /k "cd backend\ai-services\control-center && python server.py"

echo.
echo ========================================
echo   All AI Services Started!
echo ========================================
echo.
echo Services running on:
echo   - Leave Agent: http://localhost:8001
echo   - Onboarding: http://localhost:8003
echo   - Recruitment: http://localhost:8004
echo   - Performance: http://localhost:8006
echo   - Control: http://localhost:8007
echo.
echo Press any key to check health status...
pause > nul

echo.
echo Checking service health...
timeout /t 5 /nobreak > nul

curl http://localhost:8001/health 2>nul
curl http://localhost:8003/health 2>nul
curl http://localhost:8004/health 2>nul
curl http://localhost:8006/health 2>nul
curl http://localhost:8007/health 2>nul

echo.
echo.
echo All AI services should be running!
echo Keep these windows open while using the app.
pause
