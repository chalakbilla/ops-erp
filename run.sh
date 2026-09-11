#!/usr/bin/env bash
# Mini Operations ERP — one-command setup + launch (Linux / macOS)
#
# What this does:
#   1. Checks for python3 and node/npm, failing with a clear message if missing.
#   2. Creates/activates a Python virtualenv for the backend and installs
#      requirements.txt (only if the venv doesn't already have them).
#   3. Seeds the database with demo users/inventory (safe to re-run).
#   4. Installs frontend npm dependencies (only if node_modules is missing/stale).
#   5. Starts the Flask backend (port 5000) and the Vite dev server (port 5173),
#      and stops both cleanly on Ctrl+C.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

info()  { printf '\033[1;34m[setup]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[error]\033[0m %s\n' "$1" >&2; }

# ---- 1. Check dependencies -------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  error "python3 was not found. Install Python 3.10+ and re-run this script."
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  error "node/npm was not found. Install Node.js 18+ and re-run this script."
  exit 1
fi

info "python3: $(python3 --version)"
info "node:    $(node --version)"
info "npm:     $(npm --version)"

# ---- 2. Backend virtualenv + dependencies ----------------------------------
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  info "Creating Python virtual environment..."
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

info "Checking backend dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  info "Created backend/.env from .env.example"
fi

info "Seeding database (safe to re-run)..."
python seed.py

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

# ---- 4. Run both services ---------------------------------------------------
cleanup() {
  info "Stopping services..."
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

info "Starting backend on http://localhost:5000 ..."
cd "$BACKEND_DIR"
# shellcheck disable=SC1091
source venv/bin/activate
FLASK_ENV=development python wsgi.py &
BACKEND_PID=$!

info "Starting frontend on http://localhost:5173 ..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

info "Both services are starting. Press Ctrl+C to stop."
info "Demo logins: admin/Admin@123, ops/Ops@123, sales/Sales@123"

wait "$BACKEND_PID" "$FRONTEND_PID"
