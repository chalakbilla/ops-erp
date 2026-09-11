# API Documentation

Base URL: `http://localhost:5000/api` (override with `VITE_API_URL` on the
frontend, or just call it directly with curl/Postman).

All endpoints except `/auth/login` and `/health` require:

```
Authorization: Bearer <access_token>
```

Roles: `admin`, `operations`, `sales`. Endpoints marked **Roles** are
enforced server-side (see `app/decorators.py::role_required`) — a request
from a disallowed role gets `403 Forbidden`.

---

## Auth

### `POST /auth/login`
Public. Body: `{ "username": "admin", "password": "Admin@123" }`
Returns: `{ "access_token": "...", "user": { id, username, role, location } }`

### `GET /auth/me`
Any authenticated user. Returns the current user.

### `GET /auth/users`
**Roles: admin.** Lists all users (used to populate the "assign to" dropdown
when creating a Work Order).

---

## Inventory

### `GET /inventory?item=&location=`
Any authenticated user. Optional filters. Returns a list of rows, each with
`physical_qty`, `reserved_qty`, and the computed `available_qty`.

### `POST /inventory`
**Roles: admin, operations.**
Body: `{ item, category, location, batch?, physical_qty }`
`409` if the `(item, location, batch)` combination already exists — use
`PATCH` to adjust an existing row instead (prevents duplicate inventory
transactions).

### `PATCH /inventory/<id>`
**Roles: admin, operations.**
Body: `{ "physical_qty_delta": 10 }` (relative) or `{ "physical_qty": 50 }`
(absolute). Rejects `409` if the result would be negative or below the
already-reserved quantity.

---

## Work Orders

### `GET /work-orders`
Any authenticated user. Each row includes a computed `shortage` field:
`max(required_qty - available_at_location, 0)`.

### `POST /work-orders`
**Roles: admin.**
Body: `{ location, item, required_qty, assigned_user_id }`. Status starts as
`assigned`.

### `PATCH /work-orders/<id>/status`
**Roles: admin, operations.**
Body: `{ "status": "in_progress" | "completed" | "assigned" }`

---

## Internal Transfers

### `GET /transfers`
Any authenticated user.

### `POST /transfers`
**Roles: admin, operations.**
Body: `{ source_location, destination_location, item, quantity }`. Status
starts as `requested`.

### `POST /transfers/<id>/dispatch`
**Roles: admin, operations.**
Moves `requested → dispatched`. Reduces **source** `physical_qty`
immediately. `409` if there isn't enough available stock at the source, or
if the transfer isn't currently `requested`.

### `POST /transfers/<id>/receive`
**Roles: admin, operations.**
Moves `dispatched → received`. Only now does **destination** `physical_qty`
increase. `409` if the transfer isn't currently `dispatched` (this is what
stops the same transfer from being received twice).

---

## Customer Orders

### `GET /orders`
Any authenticated user.

### `POST /orders`
**Roles: admin, sales.**
Body: `{ customer_name, item, location, quantity }`. Reserves stock
(`reserved_qty += quantity`) atomically. `409` if the requested quantity
exceeds what's available — this is enforced at the database level, so two
near-simultaneous requests can't both succeed if only one could fit.

### `POST /orders/<id>/cancel`
**Roles: admin, sales.**
Moves `reserved → cancelled` and releases the reservation back to available
stock. `409` if the order isn't currently `reserved`.

---

## Error format

Every error is JSON: `{ "error": "message" }` with an appropriate HTTP
status (`400` validation, `401` bad credentials, `403` wrong role, `404` not
found, `409` business-rule conflict).

---

## Concurrency & transaction notes

Every operation that changes a quantity or a status uses an atomic
`UPDATE ... WHERE <precondition>` (via SQLAlchemy Core), then checks
`rowcount`:

- **Reservation** (`POST /orders`): `UPDATE inventory SET reserved_qty =
  reserved_qty + :take WHERE id = :id AND (physical_qty - reserved_qty) >=
  :take`. If two requests race, the database serializes the two `UPDATE`s;
  whichever runs second sees the already-updated `reserved_qty` and its
  `WHERE` clause fails, so `rowcount == 0` and it's rejected with `409`.
- **Transfer dispatch**: same pattern against `physical_qty`.
- **Transfer receive / order cancel**: `UPDATE ... WHERE status = <expected
  current status>`. Only the first of two concurrent requests can match the
  `WHERE status = 'dispatched'` (or `'reserved'`) clause; the second gets
  `rowcount == 0` and is rejected — this is what makes "received twice" and
  double-cancel impossible regardless of timing.

This works with the default SQLite database and carries over unchanged to
Postgres/MySQL if `DATABASE_URL` is pointed at one, since it relies only on
standard atomic `UPDATE` semantics, not a SQLite-specific feature.
