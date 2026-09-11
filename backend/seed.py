"""Seed the database with demo users and starter inventory.

Run with: python seed.py
Safe to re-run; skips rows that already exist.
"""
from app import create_app
from app.extensions import db
from app.models import User, Role, Inventory

DEMO_USERS = [
    {"username": "admin", "password": "Admin@123", "role": Role.ADMIN, "location": None},
    {"username": "ops", "password": "Ops@123", "role": Role.OPERATIONS, "location": "WAREHOUSE-A"},
    {"username": "sales", "password": "Sales@123", "role": Role.SALES, "location": "WAREHOUSE-A"},
]

DEMO_INVENTORY = [
    {"item": "Steel Bolt M8", "category": "Hardware", "location": "WAREHOUSE-A", "batch": "B1", "physical_qty": 100},
    {"item": "Steel Bolt M8", "category": "Hardware", "location": "WAREHOUSE-B", "batch": "B1", "physical_qty": 40},
    {"item": "Hydraulic Pump", "category": "Machinery", "location": "WAREHOUSE-A", "batch": "B1", "physical_qty": 15},
    {"item": "Control Valve", "category": "Machinery", "location": "WAREHOUSE-B", "batch": "B1", "physical_qty": 30},
]


def run():
    app = create_app()
    with app.app_context():
        db.create_all()

        for u in DEMO_USERS:
            if not User.query.filter_by(username=u["username"]).first():
                user = User(username=u["username"], role=u["role"], location=u["location"])
                user.set_password(u["password"])
                db.session.add(user)

        db.session.commit()

        for row in DEMO_INVENTORY:
            exists = Inventory.query.filter_by(
                item=row["item"], location=row["location"], batch=row["batch"]
            ).first()
            if not exists:
                db.session.add(Inventory(**row))

        db.session.commit()
        print("Seed complete.")
        print("Demo logins:")
        for u in DEMO_USERS:
            print(f"  {u['role']:<10} username={u['username']:<8} password={u['password']}")


if __name__ == "__main__":
    run()
