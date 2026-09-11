# Meridian ERP — Mini Operations ERP

A small full-stack Operations ERP covering:
**Inventory → Work Order → Stock Check → Internal Transfer / Shortage → Customer Reservation**

## Tech stack

| Layer      | Choice                                                             |
|------------|---------------------------------------------------------------------|
| Frontend   | React 19 (Vite), React Router, Tailwind CSS                        |
| Backend    | Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS            |
| Database   | SQLite by default (file-based, zero setup); any SQLAlchemy-compatible DB (Postgres/MySQL) via `DATABASE_URL` |
| Auth       | JWT access tokens, role claim (`admin` / `operations` / `sales`)     |
| Testing    | Pytest (business logic + a threaded concurrency test)                |
| Container  | Docker (backend), `docker-compose.yml`                              |

The backend never hard-codes a hosting provider or database engine — every
credential and connection string is read from environment variables
(`backend/.env.example`), so it can run locally, in Docker, or against a
managed Postgres instance without code changes.

## Project structure

```
ops-erp/
├── backend/               Flask API
│   ├── app/
│   │   ├── routes/        auth, inventory, work_orders, transfers, orders
│   │   ├── models.py      SQLAlchemy models
│   │   ├── decorators.py  role_required() authorization
│   │   └── errors.py      consistent JSON error handling
│   ├── tests/              pytest suite (mandatory tests 1–5 + concurrency)
│   ├── seed.py             demo users + starter inventory
│   ├── wsgi.py             app entrypoint
│   └── Dockerfile
├── frontend/               Vite + React + Tailwind UI
│   └── src/
│       ├── pages/          Login, Inventory, WorkOrders, Transfers, Orders
│       ├── components/     shared glass UI + app shell + route guard
│       ├── context/        Auth + Toast providers
│       └── api/client.js   typed fetch wrapper
├── docs/
│   ├── ER_DIAGRAM.md        Mermaid ER diagram + schema notes
│   └── API.md               Full endpoint reference
├── run.sh / run.bat         One-command setup + launch (see below)
└── docker-compose.yml       Backend container, for reference/production
```

## Project setup

You need **Python 3.10+** and **Node.js 18+** installed. Everything else is
handled by the launcher scripts below.

### Quick start (recommended)

From the repo root:

```bash
# macOS / Linux
./run.sh

# Windows
run.bat
```

This checks for Python/Node, creates a virtualenv, installs backend and
frontend dependencies (only if missing), seeds the database with demo data,
and starts:

- Backend on **http://localhost:5000**
- Frontend on **http://localhost:5173**

Demo logins (also printed by the script):

| Role       | Username | Password    |
|------------|----------|-------------|
| Admin      | `admin`  | `Admin@123` |
| Operations | `ops`    | `Ops@123`   |
| Sales      | `sales`  | `Sales@123` |

### Manual setup

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate          # venv\Scripts\activate.bat on Windows
pip install -r requirements.txt
cp .env.example .env
python seed.py                    # creates demo users + inventory
python wsgi.py                    # http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                       # http://localhost:5173
```

### Docker (backend only)

```bash
cd ops-erp
docker compose up --build
```

The backend will be available on `http://localhost:5000`, backed by a named
volume (`erp-data`) so the SQLite file persists across restarts. Point
`DATABASE_URL` at Postgres/MySQL instead if you want a networked database —
no code changes required.

## Database setup

Nothing to install — the default `DATABASE_URL` is a local SQLite file
(`backend/instance/erp.db`), created automatically on first run by
`db.create_all()` in `wsgi.py` / `seed.py`.

To use Postgres or MySQL instead, set `DATABASE_URL` in `backend/.env`, e.g.:

```
DATABASE_URL=postgresql://user:password@localhost:5432/opserp
```

No other code changes are needed — SQLAlchemy handles the dialect
differences, and every business rule is enforced with standard atomic
`UPDATE` statements (see [`docs/API.md`](docs/API.md#concurrency--transaction-notes)),
not SQLite-specific tricks.

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Key ones:

| Variable                        | Where     | Purpose                                  |
|----------------------------------|-----------|-------------------------------------------|
| `DATABASE_URL`                  | backend   | SQLAlchemy connection string              |
| `SECRET_KEY` / `JWT_SECRET_KEY` | backend   | Flask/JWT signing secrets                 |
| `JWT_ACCESS_TOKEN_EXPIRES_HOURS`| backend   | Token lifetime (default 8h)               |
| `CORS_ORIGINS`                  | backend   | Allowed frontend origin(s)                |
| `VITE_API_URL`                  | frontend  | Backend base URL the UI calls             |

## How to run

Covered above under **Project setup** — `./run.sh` / `run.bat`, or the
manual two-terminal flow. Login → Inventory → Work Orders → Transfers →
Customer Orders, in that order, is the intended demo path.

## How to test

```bash
cd backend
source venv/bin/activate
pytest -v
```

This runs the 5 mandatory tests plus one extra concurrency test:

1. Cannot reserve more than available inventory
2. Cannot transfer more than available inventory
3. Destination stock increases only after transfer receipt
4. Same transfer cannot be received twice
5. Unauthorized user cannot perform a restricted operation
6. *(bonus)* Two simultaneous reservations that together exceed available
   stock — exactly one succeeds, proven with real threads against a shared
   SQLite connection.

## Business rules implemented

- **Available quantity** is never stored — always computed as
  `physical_qty - reserved_qty`, so it can't drift.
- **Negative inventory, invalid quantities, and duplicate `(item, location,
  batch)` rows** are rejected at the API layer, backed by `CHECK`/`UNIQUE`
  constraints at the database layer.
- **Work order shortage** (`required_qty - available_at_location`, floored
  at 0) is computed on every read, not stored, so it's always current.
- **Transfers**: source stock reduces on dispatch; destination stock is
  untouched until receipt; a transfer can't be received twice. All three are
  enforced with atomic conditional `UPDATE`s, not application-level
  read-then-write logic, so they hold under concurrent requests.
- **Customer reservations**: two users racing to reserve more than what's
  available — only one can succeed, enforced the same way.
- **Order cancellation** releases the reservation back to available stock.

## Git history

This repository is committed incrementally (auth → inventory → work orders →
transfers → orders → frontend → docs) rather than as a single commit — see
`git log` for the development history.
