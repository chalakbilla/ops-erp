@echo off
REM Mini Operations ERP -- one-command setup + launch (Windows)
REM
REM What this does:
REM   1. Checks for python and node/npm, failing with a clear message if missing.
REM   2. Creates/activates a Python virtualenv for the backend and installs
REM      requirements.txt.
REM   3. Seeds the database with demo users/inventory (safe to re-run).
REM   4. Installs frontend npm dependencies (only if node_modules is missing).
REM   5. Opens the Flask backend (port 5000) and the Vite dev server (port 5173)
REM      each in their own window.

setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo [setup] Checking dependencies...

where python >nul 2>nul
if errorlevel 1 (
  echo [error] python was not found on PATH. Install Python 3.10+ and re-run this script.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [error] node was not found on PATH. Install Node.js 18+ and re-run this script.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [error] npm was not found on PATH. Install Node.js 18+ and re-run this script.
  exit /b 1
)

python --version
node --version
npm --version

REM ---- Backend virtualenv + dependencies ----
cd /d "%BACKEND_DIR%"

if not exist "venv" (
  echo [setup] Creating Python virtual environment...
  python -m venv venv
)

call venv\Scripts\activate.bat

echo [setup] Checking backend dependencies...
python -m pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [setup] Created backend\.env from .env.example
  )
)

echo [setup] Seeding database (safe to re-run)...
python seed.py

call venv\Scripts\deactivate.bat

REM ---- Frontend dependencies ----
cd /d "%FRONTEND_DIR%"

if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [setup] Created frontend\.env from .env.example
  )
)

if not exist "node_modules" (
  echo [setup] Installing frontend dependencies ^(npm install^)...
  call npm install
) else (
  echo [setup] Frontend dependencies already installed, skipping npm install.
)

REM ---- Run both services in separate windows ----
echo [setup] Starting backend on http://localhost:5000 ...
start "Ops ERP - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && set FLASK_ENV=development && python wsgi.py"

echo [setup] Starting frontend on http://localhost:5173 ...
start "Ops ERP - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo [setup] Both services are starting in separate windows.
echo [setup] Demo logins: admin/Admin@123, ops/Ops@123, sales/Sales@123

endlocal
