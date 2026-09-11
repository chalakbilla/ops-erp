import pytest
from app import create_app
from app.extensions import db
from app.models import User, Role, Inventory


@pytest.fixture()
def app():
    application = create_app("testing")
    with application.app_context():
        db.create_all()
        _seed(db)
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _seed(db):
    admin = User(username="admin", role=Role.ADMIN)
    admin.set_password("Admin@123")
    ops = User(username="ops", role=Role.OPERATIONS)
    ops.set_password("Ops@123")
    sales = User(username="sales", role=Role.SALES)
    sales.set_password("Sales@123")
    sales2 = User(username="sales2", role=Role.SALES)
    sales2.set_password("Sales2@123")
    db.session.add_all([admin, ops, sales, sales2])
    db.session.commit()

    db.session.add(
        Inventory(
            item="Widget",
            category="General",
            location="WAREHOUSE-A",
            batch="B1",
            physical_qty=100,
            reserved_qty=0,
        )
    )
    db.session.add(
        Inventory(
            item="Widget",
            category="General",
            location="WAREHOUSE-B",
            batch="B1",
            physical_qty=60,
            reserved_qty=0,
        )
    )
    db.session.commit()


def login(client, username, password):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
