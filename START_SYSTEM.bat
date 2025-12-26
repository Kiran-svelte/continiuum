@echo off
title Constraint-Based Leave System - Quick Start
color 0A

echo ====================================================
echo   🚀 Starting Constraint-Based Leave System
echo ====================================================
echo.

echo [1/2] Starting Node.js Backend (Port 5000)...
cd /d "C:\xampp\htdocs\Company\backend"
start "Node.js Backend" cmd /k "npm start"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Python Constraint Engine (Port 8001)...
cd /d "C:\xampp\htdocs\Company\backend\ai-services\leave-agent"
start "Python Constraint Engine" cmd /k "python server.py"
timeout /t 3 /nobreak >nul

echo.
echo ====================================================
echo ✅ System Started Successfully!
echo.
echo 📡 Node.js API:    http://localhost:5000/api/health
echo 🤖 Python Engine:  http://localhost:8001/health
echo 🎨 Frontend:       http://localhost/Company/app/pages/employee/leave-request.html
echo.
echo 🔧 Features:
echo • 14+ Business constraints enforced
echo • 100%% Deterministic decisions
echo • Response time: ^< 50ms
echo • No RAG, No ML models needed
echo ====================================================
echo.
echo Opening system in browser...
timeout /t 2 /nobreak >nul

start http://localhost:5000/api/health
start http://localhost:8001/health
start http://localhost/Company/app/pages/employee/leave-request.html

echo.
echo System is ready! Check the browser windows.
echo Press any key to exit this launcher...
pause >nul
