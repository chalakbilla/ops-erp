from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


def now_utc():
    return datetime.now(timezone.utc)


class Role:
    ADMIN = "admin"
    OPERATIONS = "operations"
    SALES = "sales"
    ALL = [ADMIN, OPERATIONS, SALES]


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    location = db.Column(db.String(80), nullable=True)  # optional home location
    created_at = db.Column(db.DateTime, default=now_utc)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "location": self.location,
        }


class Inventory(db.Model):
    __tablename__ = "inventory"
    __table_args__ = (
        db.UniqueConstraint("item", "location", "batch", name="uq_item_location_batch"),
        db.CheckConstraint("physical_qty >= 0", name="ck_physical_nonneg"),
        db.CheckConstraint("reserved_qty >= 0", name="ck_reserved_nonneg"),
        db.CheckConstraint("reserved_qty <= physical_qty", name="ck_reserved_le_physical"),
    )

    id = db.Column(db.Integer, primary_key=True)
    item = db.Column(db.String(120), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False)
    location = db.Column(db.String(80), nullable=False, index=True)
    batch = db.Column(db.String(80), nullable=False, default="DEFAULT")
    physical_qty = db.Column(db.Integer, nullable=False, default=0)
    reserved_qty = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)

    @property
    def available_qty(self):
        return self.physical_qty - self.reserved_qty

    def to_dict(self):
        return {
            "id": self.id,
            "item": self.item,
            "category": self.category,
            "location": self.location,
            "batch": self.batch,
            "physical_qty": self.physical_qty,
            "reserved_qty": self.reserved_qty,
            "available_qty": self.available_qty,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkOrderStatus:
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ALL = [ASSIGNED, IN_PROGRESS, COMPLETED]


class WorkOrder(db.Model):
    __tablename__ = "work_orders"

    id = db.Column(db.Integer, primary_key=True)
    location = db.Column(db.String(80), nullable=False)
    item = db.Column(db.String(120), nullable=False)
    required_qty = db.Column(db.Integer, nullable=False)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=WorkOrderStatus.ASSIGNED)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)

    assigned_user = db.relationship("User", foreign_keys=[assigned_user_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self, shortage=None):
        return {
            "id": self.id,
            "location": self.location,
            "item": self.item,
            "required_qty": self.required_qty,
            "assigned_user": self.assigned_user.username if self.assigned_user else None,
            "assigned_user_id": self.assigned_user_id,
            "status": self.status,
            "shortage": shortage,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TransferStatus:
    REQUESTED = "requested"
    DISPATCHED = "dispatched"
    RECEIVED = "received"
    ALL = [REQUESTED, DISPATCHED, RECEIVED]


class Transfer(db.Model):
    __tablename__ = "transfers"

    id = db.Column(db.Integer, primary_key=True)
    source_location = db.Column(db.String(80), nullable=False)
    destination_location = db.Column(db.String(80), nullable=False)
    item = db.Column(db.String(120), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=TransferStatus.REQUESTED)
    requested_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)
    dispatched_at = db.Column(db.DateTime, nullable=True)
    received_at = db.Column(db.DateTime, nullable=True)

    requested_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "source_location": self.source_location,
            "destination_location": self.destination_location,
            "item": self.item,
            "quantity": self.quantity,
            "status": self.status,
            "requested_by": self.requested_by.username if self.requested_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "dispatched_at": self.dispatched_at.isoformat() if self.dispatched_at else None,
            "received_at": self.received_at.isoformat() if self.received_at else None,
        }


class OrderStatus:
    RESERVED = "reserved"
    CANCELLED = "cancelled"
    FULFILLED = "fulfilled"
    ALL = [RESERVED, CANCELLED, FULFILLED]


class CustomerOrder(db.Model):
    __tablename__ = "customer_orders"

    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(120), nullable=False)
    item = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(80), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=OrderStatus.RESERVED)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)
    cancelled_at = db.Column(db.DateTime, nullable=True)

    created_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "item": self.item,
            "location": self.location,
            "quantity": self.quantity,
            "status": self.status,
            "created_by": self.created_by.username if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
        }
