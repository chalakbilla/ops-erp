from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import Inventory, Role
from app.decorators import role_required
from app.errors import ApiError

inventory_bp = Blueprint("inventory", __name__)


def _validate_qty(value, field_name):
    if not isinstance(value, int) or isinstance(value, bool):
        raise ApiError(f"{field_name} must be an integer")
    if value < 0:
        raise ApiError(f"{field_name} cannot be negative")
    return value


@inventory_bp.get("")
@jwt_required()
def list_inventory():
    location = request.args.get("location")
    item = request.args.get("item")
    query = Inventory.query
    if location:
        query = query.filter_by(location=location)
    if item:
        query = query.filter_by(item=item)
    rows = query.order_by(Inventory.location, Inventory.item).all()
    return jsonify([r.to_dict() for r in rows])


@inventory_bp.post("")
@role_required(Role.ADMIN, Role.OPERATIONS)
def create_inventory():
    data = request.get_json(silent=True) or {}
    item = (data.get("item") or "").strip()
    category = (data.get("category") or "").strip()
    location = (data.get("location") or "").strip()
    batch = (data.get("batch") or "DEFAULT").strip()
    physical_qty = data.get("physical_qty", 0)

    if not item or not category or not location:
        raise ApiError("item, category and location are required")

    physical_qty = _validate_qty(physical_qty, "physical_qty")

    existing = Inventory.query.filter_by(item=item, location=location, batch=batch).first()
    if existing:
        raise ApiError(
            "Duplicate inventory transaction: this item/location/batch already exists. "
            "Use the update endpoint to adjust quantity instead.",
            status_code=409,
        )

    row = Inventory(
        item=item, category=category, location=location, batch=batch, physical_qty=physical_qty
    )
    db.session.add(row)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("Duplicate inventory transaction", status_code=409)

    return jsonify(row.to_dict()), 201


@inventory_bp.patch("/<int:inventory_id>")
@role_required(Role.ADMIN, Role.OPERATIONS)
def adjust_inventory(inventory_id):
    data = request.get_json(silent=True) or {}
    row = db.session.get(Inventory, inventory_id)
    if not row:
        raise ApiError("Inventory row not found", status_code=404)

    if "physical_qty_delta" in data:
        delta = data["physical_qty_delta"]
        if not isinstance(delta, int) or isinstance(delta, bool):
            raise ApiError("physical_qty_delta must be an integer")
        new_qty = row.physical_qty + delta
        if new_qty < 0:
            raise ApiError("Resulting physical quantity cannot be negative", status_code=409)
        if new_qty < row.reserved_qty:
            raise ApiError(
                "Resulting physical quantity cannot be less than reserved quantity",
                status_code=409,
            )
        row.physical_qty = new_qty
    elif "physical_qty" in data:
        new_qty = _validate_qty(data["physical_qty"], "physical_qty")
        if new_qty < row.reserved_qty:
            raise ApiError(
                "physical_qty cannot be less than reserved_qty", status_code=409
            )
        row.physical_qty = new_qty
    else:
        raise ApiError("physical_qty or physical_qty_delta is required")

    db.session.commit()
    return jsonify(row.to_dict())
