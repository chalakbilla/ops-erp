@echo off
REM Meridian ERP -- one-command setup + launch (Windows)
REM
REM What this does:
REM   1. Checks for Docker (+ Compose) and Node/npm, with a clear message and
REM      a PAUSE if anything is missing, so this window never closes before
REM      you can read what went wrong.
REM   2. Builds and starts the Flask backend in Docker (this installs every
REM      Python dependency INSIDE the container -- nothing to install on the
REM      host for the backend).
REM   3. Installs frontend npm dependencies (only if node_modules is missing).
REM   4. Runs the Vite dev server in this window.
REM
REM Stopping: press Ctrl+C to stop the frontend. The backend container keeps
REM running in the background afterwards -- stop it with "docker compose down"
REM from this folder when you're done.

setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo ============================================
echo  Meridian ERP - Setup and Launch
echo ============================================
echo.
echo [setup] Checking dependencies...
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo [error] Docker was not found on PATH.
  echo         Install Docker Desktop: https://www.docker.com/products/docker-desktop
  echo         Then re-run this script.
  goto :fail
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo [error] "docker compose" is not available.
  echo         Update Docker Desktop to a recent version ^(it bundles Compose v2^).
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo [error] Node.js was not found on PATH.
  echo         Install Node.js 18+: https://nodejs.org
  echo         Then re-run this script.
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [error] npm was not found on PATH. Reinstall Node.js and re-run this script.
  goto :fail
)

docker --version
node --version
npm --version
echo.

echo [setup] Checking that Docker Desktop is actually running...
docker info >nul 2>nul
if errorlevel 1 (
  echo [error] Docker Desktop does not seem to be running.
  echo         Start Docker Desktop, wait for it to finish starting, then re-run this script.
  goto :fail
)
echo [setup] Docker is running.
echo.

cd /d "%ROOT_DIR%"

if not exist "backend\.env" (
  if exist "backend\.env.example" (
    copy /y "backend\.env.example" "backend\.env" >nul
    echo [setup] Created backend\.env from .env.example
  )
)

echo [setup] Building and starting the backend in Docker...
echo         (this installs all backend dependencies inside the container)
docker compose up --build -d backend
if errorlevel 1 (
  echo.
  echo [error] Failed to build/start the backend container. See the output above.
  goto :fail
)

echo.
echo [setup] Backend container is up. Waiting a few seconds for Flask to come online...
timeout /t 5 /nobreak >nul

curl -s -o nul -w "" http://localhost:5000/api/health >nul 2>nul
if errorlevel 1 (
  echo [warn] Could not confirm the backend is responding yet on http://localhost:5000
  echo        It may still be starting -- check "docker compose logs backend" if the
  echo        frontend can't reach it in a moment.
) else (
  echo [setup] Backend is responding on http://localhost:5000
)
echo.

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
  if errorlevel 1 (
    echo.
    echo [error] npm install failed. See the output above.
    goto :fail
  )
) else (
  echo [setup] Frontend dependencies already installed, skipping npm install.
)

echo.
echo ============================================
echo  Backend:  http://localhost:5000   ^(Docker, running in background^)
echo  Frontend: http://localhost:5173   ^(starting now in this window^)
echo.
echo  Demo logins:
echo    admin / Admin@123
echo    ops   / Ops@123
echo    sales / Sales@123
echo.
echo  Press Ctrl+C to stop the frontend dev server.
echo  Run "docker compose down" from this folder to stop the backend.
echo ============================================
echo.

call npm run dev

echo.
echo [setup] Frontend dev server stopped.
pause
endlocal
exit /b 0

:fail
echo.
echo [setup] Setup did not complete -- see the message above.
pause
endlocal
exit /b 1
