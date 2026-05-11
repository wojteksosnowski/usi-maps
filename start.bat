@echo off
echo ========================================
echo   usi-maps ^| Premium Map Generator
echo ========================================
echo.

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
