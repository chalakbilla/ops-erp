#!/usr/bin/env bash
# Meridian ERP — one-command setup + launch (Linux / macOS)
#
# What this does:
#   1. Checks for Docker (+ Compose) and node/npm, failing with a clear
#      message if anything is missing.
#   2. Builds and starts the Flask backend in Docker (this installs every
#      Python dependency INSIDE the container — nothing to install on the
#      host for the backend).
#   3. Installs frontend npm dependencies (only if node_modules is missing).
#   4. Runs the Vite dev server in this terminal.
#
# Stopping: Ctrl+C stops the frontend. The backend container keeps running
# in the background afterwards — stop it with `docker compose down`.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

info()  { printf '\033[1;34m[setup]\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m[warn]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[error]\033[0m %s\n' "$1" >&2; }

# ---- 1. Check dependencies -------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  error "Docker was not found. Install Docker Desktop (or docker-ce) and re-run this script."
  error "https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  error '"docker compose" is not available. Update Docker to a version that includes the Compose plugin.'
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  error "node/npm was not found. Install Node.js 18+ and re-run this script."
  exit 1
fi

info "docker:  $(docker --version)"
info "node:    $(node --version)"
info "npm:     $(npm --version)"

if ! docker info >/dev/null 2>&1; then
  error "Docker daemon does not seem to be running. Start Docker and re-run this script."
  exit 1
fi
info "Docker is running."

# ---- 2. Backend: build + run in Docker -------------------------------------
cd "$ROOT_DIR"

if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
  cp backend/.env.example backend/.env
  info "Created backend/.env from .env.example"
fi

info "Building and starting the backend in Docker..."
info "(this installs all backend dependencies inside the container)"
if ! docker compose up --build -d backend; then
  error "Failed to build/start the backend container. See the output above."
  exit 1
fi

info "Backend container is up. Waiting a few seconds for Flask to come online..."
sleep 5
if curl -s -o /dev/null http://localhost:5000/api/health; then
  info "Backend is responding on http://localhost:5000"
else
  warn "Could not confirm the backend is responding yet on http://localhost:5000"
  warn 'It may still be starting — check "docker compose logs backend" if needed.'
fi

# ---- 3. Frontend dependencies -----------------------------------------------
cd "$FRONTEND_DIR"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  info "Created frontend/.env from .env.example"
fi

if [ ! -d "node_modules" ]; then
  info "Installing frontend dependencies (npm install)..."
  npm install
else
  info "Frontend dependencies already installed, skipping npm install."
fi

# ---- 4. Run the frontend dev server ----------------------------------------
echo
echo "============================================"
echo " Backend:  http://localhost:5000  (Docker, running in background)"
echo " Frontend: http://localhost:5173  (starting now)"
echo
echo " Demo logins: admin/Admin@123, ops/Ops@123, sales/Sales@123"
echo
echo " Press Ctrl+C to stop the frontend dev server."
echo " Run 'docker compose down' from this folder to stop the backend."
echo "============================================"
echo

npm run dev
