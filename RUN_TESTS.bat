@echo off
REM ============================================================
REM Company HR System - Comprehensive Test Runner
REM ============================================================
echo.
echo ========================================
echo   COMPANY HR SYSTEM - TEST SUITE
echo ========================================
echo.

cd /d "%~dp0"
cd backend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Install test dependencies
echo Installing test dependencies...
call npm install --save-dev jest supertest express-rate-limit helmet nodemailer multer axios

REM Kill any existing processes on ports
echo.
echo Checking for port conflicts...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo Killing process on port 5000: %%a
    taskkill /F /PID %%a 2>nul
)

REM Start MySQL if not running
echo.
echo Checking MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo Starting MySQL...
    start "" "C:\xampp\mysql\bin\mysqld.exe"
    timeout /t 3 >nul
)

REM Run Unit Tests
echo.
echo ========================================
echo   RUNNING UNIT TESTS
echo ========================================
call npx jest tests/unit --verbose --forceExit

REM Run Integration Tests (requires server)
echo.
echo ========================================
echo   RUNNING INTEGRATION TESTS
echo ========================================
call npx jest tests/integration --verbose --forceExit --runInBand

REM Run E2E Tests
echo.
echo ========================================
echo   RUNNING E2E TESTS
echo ========================================
call npx jest tests/e2e --verbose --forceExit --runInBand

REM Generate Coverage Report
echo.
echo ========================================
echo   GENERATING COVERAGE REPORT
echo ========================================
call npx jest --coverage --forceExit

echo.
echo ========================================
echo   TEST SUITE COMPLETE
echo ========================================
echo.
pause
