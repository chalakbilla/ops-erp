# Database Schema / ER Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string username UK
        string password_hash
        string role "admin | operations | sales"
        string location "optional home location"
        datetime created_at
    }

    INVENTORY {
        int id PK
        string item
        string category
        string location
        string batch
        int physical_qty
        int reserved_qty
        datetime updated_at
    }

    WORK_ORDERS {
        int id PK
        string location
        string item
        int required_qty
        int assigned_user_id FK
        int created_by_id FK
        string status "assigned | in_progress | completed"
        datetime created_at
    }

    TRANSFERS {
        int id PK
        string source_location
        string destination_location
        string item
        int quantity
        string status "requested | dispatched | received"
        int requested_by_id FK
        datetime created_at
        datetime dispatched_at
        datetime received_at
    }

    CUSTOMER_ORDERS {
        int id PK
        string customer_name
        string item
        string location
        int quantity
        string status "reserved | cancelled | fulfilled"
        int created_by_id FK
        datetime created_at
        datetime cancelled_at
    }

    USERS ||--o{ WORK_ORDERS : "assigned_to / created_by"
    USERS ||--o{ TRANSFERS : "requested_by"
    USERS ||--o{ CUSTOMER_ORDERS : "created_by"
    INVENTORY }o--o{ WORK_ORDERS : "item + location (looked up, not FK)"
    INVENTORY }o--o{ TRANSFERS : "item + source/destination (looked up, not FK)"
    INVENTORY }o--o{ CUSTOMER_ORDERS : "item + location (looked up, not FK)"
```

## Notes on the design

- `inventory` is keyed by the natural combination of **(item, location, batch)**
  — enforced with a unique constraint — rather than by a synthetic
  "SKU" table, since the case study's minimum fields don't call for a
  separate item master. `available_qty` is never stored; it's always
  `physical_qty - reserved_qty`, computed on read, so it can never drift out
  of sync.
- `work_orders`, `transfers`, and `customer_orders` reference inventory by
  `(item, location)` rather than a foreign key to a single `inventory.id`,
  because a work order or transfer can be satisfied across more than one
  batch at the same location. This keeps batch-level detail in `inventory`
  without forcing every other table to know about batches.
- Two `CHECK` constraints on `inventory` (`reserved_qty >= 0` and
  `reserved_qty <= physical_qty`) provide a database-level backstop against
  negative or over-reserved stock, on top of the application-level checks.
- Every status transition (`dispatch`, `receive`, `cancel`) is implemented as
  an atomic `UPDATE ... WHERE status = <expected>` — see
  [`API.md`](./API.md#concurrency--transaction-notes) for why this is what
  makes the concurrency requirements (Tests 1–4) hold up under load.
