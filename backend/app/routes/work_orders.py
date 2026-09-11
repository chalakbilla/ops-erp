from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models import WorkOrder, WorkOrderStatus, Inventory, User, Role
from app.decorators import role_required
from app.errors import ApiError

work_orders_bp = Blueprint("work_orders", __name__)


def _available_at(item, location):
    total = 0
    for row in Inventory.query.filter_by(item=item, location=location).all():
        total += row.available_qty
    return total


def _shortage_for(order):
    available = _available_at(order.item, order.location)
    return max(order.required_qty - available, 0)


@work_orders_bp.get("")
@jwt_required()
def list_work_orders():
    rows = WorkOrder.query.order_by(WorkOrder.created_at.desc()).all()
    return jsonify([r.to_dict(shortage=_shortage_for(r)) for r in rows])


@work_orders_bp.post("")
@role_required(Role.ADMIN)
def create_work_order():
    data = request.get_json(silent=True) or {}
    location = (data.get("location") or "").strip()
    item = (data.get("item") or "").strip()
    required_qty = data.get("required_qty")
    assigned_user_id = data.get("assigned_user_id")

    if not location or not item or assigned_user_id is None:
        raise ApiError("location, item and assigned_user_id are required")
    if not isinstance(required_qty, int) or isinstance(required_qty, bool) or required_qty <= 0:
        raise ApiError("required_qty must be a positive integer")

    assignee = db.session.get(User, assigned_user_id)
    if not assignee:
        raise ApiError("assigned_user_id does not match an existing user")

    from flask_jwt_extended import get_jwt_identity

    order = WorkOrder(
        location=location,
        item=item,
        required_qty=required_qty,
        assigned_user_id=assigned_user_id,
        created_by_id=int(get_jwt_identity()),
        status=WorkOrderStatus.ASSIGNED,
    )
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict(shortage=_shortage_for(order))), 201


@work_orders_bp.patch("/<int:work_order_id>/status")
@role_required(Role.ADMIN, Role.OPERATIONS)
def update_status(work_order_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in WorkOrderStatus.ALL:
        raise ApiError(f"status must be one of {WorkOrderStatus.ALL}")

    order = db.session.get(WorkOrder, work_order_id)
    if not order:
        raise ApiError("Work order not found", status_code=404)

    order.status = new_status
    db.session.commit()
    return jsonify(order.to_dict(shortage=_shortage_for(order)))
