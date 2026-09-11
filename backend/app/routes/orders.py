from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import update
from app.extensions import db
from app.models import CustomerOrder, OrderStatus, Inventory, Role
from app.decorators import role_required
from app.errors import ApiError

orders_bp = Blueprint("orders", __name__)


@orders_bp.get("")
@jwt_required()
def list_orders():
    rows = CustomerOrder.query.order_by(CustomerOrder.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])


@orders_bp.post("")
@role_required(Role.ADMIN, Role.SALES)
def create_order():
    data = request.get_json(silent=True) or {}
    customer_name = (data.get("customer_name") or "").strip()
    item = (data.get("item") or "").strip()
    location = (data.get("location") or "").strip()
    quantity = data.get("quantity")

    if not customer_name or not item or not location:
        raise ApiError("customer_name, item and location are required")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ApiError("quantity must be a positive integer")

    rows = (
        Inventory.query.filter_by(item=item, location=location)
        .order_by(Inventory.id)
        .all()
    )
    if not rows:
        raise ApiError("No inventory found for this item at this location", status_code=404)

    total_available = sum(r.available_qty for r in rows)
    if total_available < quantity:
        raise ApiError("Cannot reserve more than available inventory", status_code=409)

    # Reserve across one or more batches using an atomic compare-and-swap
    # UPDATE per row. Each UPDATE only succeeds if the row still has enough
    # available stock at the moment it runs, which is what keeps two
    # concurrent reservations from both succeeding when only one could fit.
    remaining = quantity
    reserved_rows = []
    for row in rows:
        if remaining <= 0:
            break
        take = min(row.available_qty, remaining)
        if take <= 0:
            continue
        stmt = (
            update(Inventory)
            .where(Inventory.id == row.id)
            .where((Inventory.physical_qty - Inventory.reserved_qty) >= take)
            .values(reserved_qty=Inventory.reserved_qty + take)
        )
        result = db.session.execute(stmt)
        if result.rowcount == 0:
            # Someone else grabbed the stock between our read and our write.
            db.session.rollback()
            raise ApiError("Cannot reserve more than available inventory", status_code=409)
        reserved_rows.append((row.id, take))
        remaining -= take

    if remaining > 0:
        db.session.rollback()
        raise ApiError("Cannot reserve more than available inventory", status_code=409)

    order = CustomerOrder(
        customer_name=customer_name,
        item=item,
        location=location,
        quantity=quantity,
        status=OrderStatus.RESERVED,
        created_by_id=int(get_jwt_identity()),
    )
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201


@orders_bp.post("/<int:order_id>/cancel")
@role_required(Role.ADMIN, Role.SALES)
def cancel_order(order_id):
    order = db.session.get(CustomerOrder, order_id)
    if not order:
        raise ApiError("Order not found", status_code=404)

    stmt = (
        update(CustomerOrder)
        .where(CustomerOrder.id == order.id)
        .where(CustomerOrder.status == OrderStatus.RESERVED)
        .values(status=OrderStatus.CANCELLED, cancelled_at=datetime.now(timezone.utc))
    )
    result = db.session.execute(stmt)
    if result.rowcount == 0:
        db.session.rollback()
        raise ApiError(
            f"Only a '{OrderStatus.RESERVED}' order can be cancelled "
            f"(current status: '{order.status}')",
            status_code=409,
        )

    # Release the reservation back to available stock.
    remaining = order.quantity
    rows = Inventory.query.filter_by(item=order.item, location=order.location).all()
    for row in rows:
        if remaining <= 0:
            break
        release = min(row.reserved_qty, remaining)
        if release <= 0:
            continue
        row.reserved_qty -= release
        remaining -= release

    db.session.commit()
    db.session.refresh(order)
    return jsonify(order.to_dict())
