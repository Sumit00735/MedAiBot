@echo off
title MedScan AI - Medicine OCR Agent
echo ===================================================
echo Starting MedScan AI (Medicine OCR Agent)...
echo ===================================================

echo.
echo Installing any missing dependencies...
call yarn install

echo.
echo Starting the local server on all network interfaces...
echo (This allows your mobile phone to connect if it's on the same WiFi/Hotspot)
echo.
echo IMPORTANT: Leave this window open while using the app!
echo.
:: Start the dev server in the background
start /B cmd /C "yarn dev -H 0.0.0.0"

:: Wait for the server to be ready before opening the browser
echo Waiting for the server to compile and start...
:waitloop
timeout /t 2 /nobreak >nul
node -e "require('http').get('http://127.0.0.1:3000', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    Still compiling...
    goto waitloop
)

echo.
echo ===================================================
echo  Server is READY! Opening browser now...
echo ===================================================
start http://localhost:3000

:: Keep the window open so the server keeps running
echo.
echo Press Ctrl+C to stop the server.
cmd /K
