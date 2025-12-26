@echo off
echo Testing AI Leave Engine...
echo.

powershell -Command "Invoke-WebRequest -Uri http://localhost:8001/quick-check -Method POST -ContentType 'application/json' -Body '{\"text\": \"I need tomorrow off for a doctor appointment\", \"user_id\": 1}' -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10"

echo.
pause
