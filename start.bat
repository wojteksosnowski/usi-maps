@echo off
echo ========================================
echo   usi-maps ^| Premium Map Generator
echo ========================================
echo.

:: Kill any process on port 3000
echo [0/2] Cleaning up port 3000...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

:: Start the server in a new window
echo [1/2] Starting API server...
:: Using cmd /c to ensure npm runs correctly in the new window
start "usi-maps server" cmd /c "npm run dev"

:: Wait for server to start
echo [2/2] Waiting for initialization (5s)...
timeout /t 5 > nul

:: Open the browser
echo.
echo Opening preview: http://localhost:3000/
start http://localhost:3000/

echo.
echo Done! The server is running in a separate window.
echo You can close this window now.
pause
