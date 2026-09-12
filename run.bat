@echo off
setlocal enabledelayedexpansion

REM Meridian ERP -- one-command setup + launch (Windows)
REM
REM What this does:
REM   1. Checks for Docker (+ Compose) and Node/npm. Any failure prints the
REM      real command output (nothing is hidden) and PAUSES before the
REM      window closes, so you can always read what went wrong.
REM   2. Builds and starts the Flask backend in Docker (installs every
REM      Python dependency INSIDE the container).
REM   3. Installs frontend npm dependencies (only if node_modules is missing).
REM   4. Runs the Vite dev server in this window.
REM
REM Stopping: Ctrl+C stops the frontend. Run "docker compose down" from this
REM folder afterwards to stop the backend container.

set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo ============================================
echo  Meridian ERP - Setup and Launch
echo ============================================
echo.
echo [step 1/6] Checking Docker...

where docker >nul 2>nul
if errorlevel 1 goto :no_docker

docker --version
echo.
echo [step 2/6] Checking Docker Compose...
docker compose version
if errorlevel 1 goto :no_compose

echo.
echo [step 3/6] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 goto :no_node
where npm >nul 2>nul
if errorlevel 1 goto :no_node

node --version
npm --version

echo.
echo [step 4/6] Checking that the Docker engine is actually running...
echo (running "docker info" -- if this hangs or errors, Docker Desktop is not ready)
docker info
if errorlevel 1 goto :docker_not_running
echo [ok] Docker engine is running.

echo.
echo [step 5/6] Building and starting the backend container...
cd /d "%ROOT_DIR%"

if exist "backend\.env.example" if not exist "backend\.env" (
  copy /y "backend\.env.example" "backend\.env" >nul
  echo Created backend\.env from .env.example
)

docker compose up --build -d backend
if errorlevel 1 goto :backend_failed

echo.
echo [ok] Backend container started. Giving Flask a few seconds to come online...
timeout /t 5 /nobreak >nul
echo Backend should now be reachable at http://localhost:5000
echo (if it isn't yet, run "docker compose logs backend" to see why)

echo.
echo [step 6/6] Preparing the frontend...
cd /d "%FRONTEND_DIR%"

if exist ".env.example" if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo Created frontend\.env from .env.example
)

if exist "node_modules" goto :skip_npm_install
echo Installing frontend dependencies (npm install)...
call npm install
if errorlevel 1 goto :npm_install_failed
goto :after_npm_install

:skip_npm_install
echo Frontend dependencies already installed, skipping npm install.

:after_npm_install
echo.
echo ============================================
echo  Backend:  http://localhost:5000   (Docker, running in background)
echo  Frontend: http://localhost:5173   (starting now in this window)
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
exit /b 0

:no_docker
echo.
echo [ERROR] Docker was not found on PATH.
echo         Install Docker Desktop: https://www.docker.com/products/docker-desktop
echo         Then close and reopen this terminal (PATH only updates for new windows)
echo         and re-run this script.
goto :fail

:no_compose
echo.
echo [ERROR] "docker compose" is not available (see the output above).
echo         Update Docker Desktop to a recent version -- it bundles Compose v2.
goto :fail

:no_node
echo.
echo [ERROR] Node.js/npm was not found on PATH.
echo         Install Node.js 18+: https://nodejs.org
echo         Then close and reopen this terminal and re-run this script.
goto :fail

:docker_not_running
echo.
echo [ERROR] "docker info" failed (see the output above for the exact reason).
echo         This almost always means Docker Desktop is not running yet, or is
echo         still starting up. Open Docker Desktop, wait until it says
echo         "Docker Desktop is running", then re-run this script.
goto :fail

:backend_failed
echo.
echo [ERROR] "docker compose up --build" failed -- see the build output above
echo         for the exact error (common causes: port 5000 already in use,
echo         or a syntax error in backend\Dockerfile).
goto :fail

:npm_install_failed
echo.
echo [ERROR] npm install failed -- see the output above for the exact error.
goto :fail

:fail
echo.
echo [setup] Setup did not complete. Read the [ERROR] message above.
echo         This window will stay open -- press any key to close it.
pause >nul
exit /b 1
