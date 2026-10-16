@echo off
rem Double-click to run the site locally.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js isn't installed, so the site can't start.
  echo Install the LTS version from https://nodejs.org and then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages. This only happens the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo Installing packages failed. Check your internet connection and run this file again.
    pause
    exit /b 1
  )
)

call npm run dev
pause
