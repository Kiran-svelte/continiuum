@echo off
echo ============================================================
echo   AI LEAVE MANAGEMENT - DATABASE MIGRATION
echo ============================================================
echo.

echo [1/3] Checking MySQL connection...
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT 'MySQL is running!' as Status;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] MySQL is not running!
    echo.
    echo Please start MySQL from XAMPP Control Panel first.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] MySQL is running!
echo.

echo [2/3] Running AI Leave Management schema migration...
C:\xampp\mysql\bin\mysql.exe -u root company < backend\migrations\ai_leave_management_schema.sql
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Migration failed!
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Migration completed!
echo.

echo [3/3] Verifying tables...
C:\xampp\mysql\bin\mysql.exe -u root company -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='company' AND TABLE_NAME IN ('ai_decision_logs', 'leave_patterns', 'ai_training_history', 'ai_metrics', 'ai_configuration', 'hr_feedback', 'team_capacity_cache') ORDER BY TABLE_NAME;"

echo.
echo ============================================================
echo   MIGRATION COMPLETE!
echo ============================================================
echo.
echo New tables created:
echo   - ai_decision_logs
echo   - leave_patterns
echo   - ai_training_history
echo   - ai_metrics
echo   - ai_configuration
echo   - hr_feedback
echo   - team_capacity_cache
echo.
echo Enhanced leave_requests table with AI columns:
echo   - ai_confidence
echo   - ai_decision
echo   - ai_reasoning
echo   - emotional_tone
echo   - original_request_text
echo   - professional_reason
echo.
echo Next step: Run start_ai_services.bat to start the AI engine
echo.
pause
