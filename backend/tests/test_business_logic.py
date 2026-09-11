import threading
from tests.conftest import login, auth_headers


def test_1_cannot_reserve_more_than_available(client):
    token = login(client, "sales", "Sales@123")
    resp = client.post(
        "/api/orders",
        json={
            "customer_name": "Acme Corp",
            "item": "Widget",
            "location": "WAREHOUSE-A",
            "quantity": 1000,
        },
        headers=auth_headers(token),
    )
    assert resp.status_code == 409
    assert "available" in resp.get_json()["error"].lower()


def test_2_cannot_transfer_more_than_available(client):
    token = login(client, "ops", "Ops@123")
    create = client.post(
        "/api/transfers",
        json={
            "source_location": "WAREHOUSE-A",
            "destination_location": "WAREHOUSE-B",
            "item": "Widget",
            "quantity": 5000,
        },
        headers=auth_headers(token),
    )
    assert create.status_code == 201
    transfer_id = create.get_json()["id"]

    dispatch = client.post(
        f"/api/transfers/{transfer_id}/dispatch", headers=auth_headers(token)
    )
    assert dispatch.status_code == 409
    assert "available" in dispatch.get_json()["error"].lower()


def test_3_destination_stock_increases_only_after_receipt(client):
    token = login(client, "ops", "Ops@123")
    create = client.post(
        "/api/transfers",
        json={
            "source_location": "WAREHOUSE-A",
            "destination_location": "WAREHOUSE-B",
            "item": "Widget",
            "quantity": 10,
        },
        headers=auth_headers(token),
    )
    transfer_id = create.get_json()["id"]

    def dest_qty():
        rows = client.get(
            "/api/inventory", query_string={"item": "Widget", "location": "WAREHOUSE-B"},
            headers=auth_headers(token),
        ).get_json()
        return sum(r["physical_qty"] for r in rows)

    before = dest_qty()

    dispatch = client.post(f"/api/transfers/{transfer_id}/dispatch", headers=auth_headers(token))
    assert dispatch.status_code == 200
    # Still not increased before receipt.
    assert dest_qty() == before

    receive = client.post(f"/api/transfers/{transfer_id}/receive", headers=auth_headers(token))
    assert receive.status_code == 200
    assert dest_qty() == before + 10


def test_4_same_transfer_cannot_be_received_twice(client):
    token = login(client, "ops", "Ops@123")
    create = client.post(
        "/api/transfers",
        json={
            "source_location": "WAREHOUSE-A",
            "destination_location": "WAREHOUSE-B",
            "item": "Widget",
            "quantity": 5,
        },
        headers=auth_headers(token),
    )
    transfer_id = create.get_json()["id"]
    client.post(f"/api/transfers/{transfer_id}/dispatch", headers=auth_headers(token))

    first = client.post(f"/api/transfers/{transfer_id}/receive", headers=auth_headers(token))
    assert first.status_code == 200

    second = client.post(f"/api/transfers/{transfer_id}/receive", headers=auth_headers(token))
    assert second.status_code == 409


def test_5_unauthorized_user_cannot_perform_restricted_operation(client):
    # Sales user must not be able to create a Work Order (admin-only).
    token = login(client, "sales", "Sales@123")
    resp = client.post(
        "/api/work-orders",
        json={
            "location": "WAREHOUSE-A",
            "item": "Widget",
            "required_qty": 10,
            "assigned_user_id": 1,
        },
        headers=auth_headers(token),
    )
    assert resp.status_code == 403

    # Sales user must not be able to create/adjust inventory either.
    resp2 = client.post(
        "/api/inventory",
        json={"item": "New Item", "category": "General", "location": "WAREHOUSE-A", "physical_qty": 10},
        headers=auth_headers(token),
    )
    assert resp2.status_code == 403


def test_concurrent_reservations_only_one_succeeds(app, client):
    """Two users try to reserve more than the total available stock at once.

    WAREHOUSE-A has 100 available. User A reserves 80, User B reserves 50 at
    (almost) the same time. Both must not succeed.
    """
    token_a = login(client, "sales", "Sales@123")
    token_b = login(client, "sales2", "Sales2@123")

    results = {}

    def reserve(name, token, qty):
        with app.test_client() as c:
            resp = c.post(
                "/api/orders",
                json={
                    "customer_name": name,
                    "item": "Widget",
                    "location": "WAREHOUSE-A",
                    "quantity": qty,
                },
                headers=auth_headers(token),
            )
            results[name] = resp.status_code

    t1 = threading.Thread(target=reserve, args=("User A", token_a, 80))
    t2 = threading.Thread(target=reserve, args=("User B", token_b, 50))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    statuses = list(results.values())
    assert statuses.count(201) == 1, f"Exactly one reservation should succeed, got {results}"
    assert statuses.count(409) == 1, f"Exactly one reservation should be rejected, got {results}"
