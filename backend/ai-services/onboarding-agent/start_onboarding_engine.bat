@echo off
echo ========================================
echo Starting AI Onboarding Constraint Engine
echo Port: 8002
echo ========================================

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

REM Install required packages if needed
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing Flask...
    pip install flask flask-cors mysql-connector-python
)

REM Start the onboarding engine
echo Starting Onboarding Constraint Engine...
python onboarding_engine.py
