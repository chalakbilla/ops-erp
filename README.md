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

You need **Docker Desktop** (or `docker` + the Compose plugin) and
**Node.js 18+** installed. Python is only needed on your host if you want to
run the backend outside Docker or run the test suite directly — the launcher
scripts below install and run the backend entirely inside its container.

### Quick start (recommended)

From the repo root:

```bash
# macOS / Linux
./run.sh

# Windows
run.bat
```

This checks for Docker and Node, builds and starts the **backend in Docker**
(installing every Python dependency inside the container — nothing to
install on the host for the backend), installs frontend npm dependencies
(only if missing), and starts the Vite dev server in the current
terminal/window:

- Backend on **http://localhost:5000** (Docker container, keeps running in
  the background)
- Frontend on **http://localhost:5173** (runs in the foreground of this
  window — press `Ctrl+C` to stop it)

To stop the backend afterwards: `docker compose down` from the repo root.

> **Windows note:** if `run.bat` closes immediately, it's almost always
> because Docker Desktop isn't installed or isn't running yet — the script
> checks for both and pauses on failure so you can read the message. Start
> Docker Desktop, wait for it to say "running", then re-run `run.bat`.

Demo logins (also printed by the script):

| Role       | Username | Password    |
|------------|----------|-------------|
| Admin      | `admin`  | `Admin@123` |
| Operations | `ops`    | `Ops@123`   |
| Sales      | `sales`  | `Sales@123` |

### Manual setup

```bash
# Backend — via Docker (recommended)
cd ops-erp
docker compose up --build -d backend    # http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                             # http://localhost:5173
```

If you'd rather run the backend without Docker (e.g. for debugging with a
debugger attached), you can still do it the traditional way:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # venv\Scripts\activate.bat on Windows
pip install -r requirements.txt
cp .env.example .env
python seed.py                    # creates demo users + inventory
python wsgi.py                    # http://localhost:5000
```

### Docker (backend)

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

## Troubleshooting

**`run.bat` seems to stop right after printing the npm version.**
Already fixed in this repo (a bare `npm --version` without `call` was
silently ending the parent script — a classic Windows batch gotcha, since
`npm` is `npm.cmd`, itself a batch file). If you ever add more npm calls to
the script yourself, always use `call npm ...`.

**`docker info` fails with `failed to connect to the docker API at
npipe:////./pipe/dockerDesktopLinuxEngine`.**
Docker Desktop isn't running. The CLI (`docker.exe`) can be installed and
working fine while the actual engine is closed — open Docker Desktop, wait
until it reports "running", then re-run `run.bat`/`run.sh`.

**Frontend shows "Failed to fetch" on login, and `docker ps -a` shows the
backend container `Exited`.**
Check `docker compose logs backend`. If you see
`sqlite3.OperationalError: unable to open database file`, this was a bug
already fixed in this repo: the backend's Docker volume can come up as an
empty directory on first run (a known quirk with BuildKit-built images not
always populating a fresh named volume from the image), so the `instance`
directory SQLite needs didn't exist yet. The fix — recreating that directory
every container start, not just at build time — is already in
`backend/Dockerfile`. If you're hitting this on an older copy of the repo,
just re-run `docker compose up --build -d backend` after pulling the fix;
there's no need to delete the existing `erp-data` volume.

## Git history

This repository is committed incrementally (auth → inventory → work orders →
transfers → orders → frontend → docs) rather than as a single commit — see
`git log` for the development history.
