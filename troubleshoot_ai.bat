@echo off
echo ========================================
echo   AI SERVICES TROUBLESHOOTER
echo ========================================
echo.

echo [1/6] Checking Python...
python --version
if errorlevel 1 (
    echo ❌ Python not found! Install Python 3.8+
    pause
    exit /b 1
)
echo ✅ Python OK
echo.

echo [2/6] Checking Dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo ❌ Flask not installed
    echo Installing dependencies...
    cd backend\ai-services
    pip install -r requirements.txt
    cd ..\..
) else (
    echo ✅ Flask installed
)

pip show groq >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Groq not installed (LLM will not work)
    echo Run: pip install groq openai
) else (
    echo ✅ Groq installed
)
echo.

echo [3/6] Checking Training Data...
if exist "backend\training_data\leave_policy.csv" (
    echo ✅ Leave policy data found
) else (
    echo ❌ Leave policy data missing
)

if exist "training_data\onboarding_data.csv" (
    echo ✅ Onboarding data found
) else (
    echo ⚠️ Onboarding data missing
)

if exist "training_data\performance_data.csv" (
    echo ✅ Performance data found
) else (
    echo ⚠️ Performance data missing
)
echo.

echo [4/6] Checking if AI Services are Running...
netstat -ano | findstr "8001" >nul 2>&1
if errorlevel 1 (
    echo ❌ Leave Agent (8001) NOT running
) else (
    echo ✅ Leave Agent (8001) running
)

netstat -ano | findstr "8003" >nul 2>&1
if errorlevel 1 (
    echo ❌ Onboarding Agent (8003) NOT running
) else (
    echo ✅ Onboarding Agent (8003) running
)

netstat -ano | findstr "8004" >nul 2>&1
if errorlevel 1 (
    echo ❌ Recruitment Agent (8004) NOT running
) else (
    echo ✅ Recruitment Agent (8004) running
)

netstat -ano | findstr "8006" >nul 2>&1
if errorlevel 1 (
    echo ❌ Performance Agent (8006) NOT running
) else (
    echo ✅ Performance Agent (8006) running
)

netstat -ano | findstr "8007" >nul 2>&1
if errorlevel 1 (
    echo ❌ Control Center (8007) NOT running
) else (
    echo ✅ Control Center (8007) running
)
echo.

echo [5/6] Checking LLM Configuration...
if defined GROQ_API_KEY (
    echo ✅ GROQ_API_KEY is set
) else (
    if defined OPENAI_API_KEY (
        echo ✅ OPENAI_API_KEY is set
    ) else (
        echo ⚠️ No LLM API key set
        echo    Services will work but without natural language generation
        echo    Get free Groq key: https://console.groq.com/keys
        echo    Then run: $env:GROQ_API_KEY = "your_key_here"
    )
)
echo.

echo [6/6] Checking Backend...
netstat -ano | findstr "3000" >nul 2>&1
if errorlevel 1 (
    netstat -ano | findstr "5000" >nul 2>&1
    if errorlevel 1 (
        echo ❌ Backend NOT running (expected port 3000 or 5000)
    ) else (
        echo ✅ Backend running on port 5000
    )
) else (
    echo ✅ Backend running on port 3000
)
echo.

echo ========================================
echo   DIAGNOSIS COMPLETE
echo ========================================
echo.

echo 📋 SUMMARY:
echo.
netstat -ano | findstr "8001 8003 8004 8006 8007" >nul 2>&1
if errorlevel 1 (
    echo ❌ MAIN ISSUE: AI Services are NOT running
    echo.
    echo 🔧 FIX: Run start_ai_services.bat
    echo.
) else (
    echo ✅ AI Services are running
    echo.
    if defined GROQ_API_KEY (
        echo ✅ LLM is configured
        echo ✅ Everything should be working!
    ) else (
        if defined OPENAI_API_KEY (
            echo ✅ LLM is configured
            echo ✅ Everything should be working!
        ) else (
            echo ⚠️ LLM not configured (optional)
            echo    Services work but without natural language generation
            echo    To enable: Set GROQ_API_KEY environment variable
        )
    )
)

echo.
echo For detailed diagnostics, see: AI_SERVICES_DIAGNOSTIC.md
echo.
pause
