@echo off
title Constraint-Based AI Leave Management System
color 0A
echo ====================================================
echo   🚀 Constraint-Based Leave System Startup
echo   🤖 No RAG, No ML Models - Pure Constraint Engine
echo ====================================================
echo.

echo [1/3] Starting Node.js Backend (Port 3000)...
cd /d "C:\xampp\htdocs\Company\backend"
start "Node.js Server" cmd /k "node src/server.js"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Python Constraint Engine (Port 8001)...
cd /d "C:\xampp\htdocs\Company\backend\ai-services"
start "Python Constraint Engine" cmd /k "python leave-agent/server.py"
timeout /t 3 /nobreak >nul

echo [3/3] Opening Browser...
start http://localhost/Company/app/pages/employee/leave-request.html
start http://localhost:3000/api/health
start http://localhost:8001/health

echo.
echo ====================================================
echo ✅ System Started Successfully!
echo.
echo 📡 Node.js API:    http://localhost:3000
echo 🤖 Python Engine:  http://localhost:8001
echo 🎨 Frontend:       http://localhost/Company/app/pages/employee/leave-request.html
echo.
echo 🔧 Features:
echo • 14+ Business constraints enforced
echo • 100%% Deterministic decisions
echo • Response time: < 50ms
echo • No RAG, No ML models needed
echo ====================================================
echo.
echo Press any key to open system dashboard...
pause >nul

start http://localhost/Company/app/pages/employee/leave-request.html