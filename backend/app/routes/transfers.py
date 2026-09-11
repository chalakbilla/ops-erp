from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import update
from app.extensions import db
from app.models import Transfer, TransferStatus, Inventory, Role
from app.decorators import role_required
from app.errors import ApiError

transfers_bp = Blueprint("transfers", __name__)


@transfers_bp.get("")
@jwt_required()
def list_transfers():
    rows = Transfer.query.order_by(Transfer.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])


@transfers_bp.post("")
@role_required(Role.ADMIN, Role.OPERATIONS)
def create_transfer():
    data = request.get_json(silent=True) or {}
    source = (data.get("source_location") or "").strip()
    destination = (data.get("destination_location") or "").strip()
    item = (data.get("item") or "").strip()
    quantity = data.get("quantity")

    if not source or not destination or not item:
        raise ApiError("source_location, destination_location and item are required")
    if source == destination:
        raise ApiError("source_location and destination_location must differ")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ApiError("quantity must be a positive integer")

    transfer = Transfer(
        source_location=source,
        destination_location=destination,
        item=item,
        quantity=quantity,
        status=TransferStatus.REQUESTED,
        requested_by_id=int(get_jwt_identity()),
    )
    db.session.add(transfer)
    db.session.commit()
    return jsonify(transfer.to_dict()), 201


@transfers_bp.post("/<int:transfer_id>/dispatch")
@role_required(Role.ADMIN, Role.OPERATIONS)
def dispatch_transfer(transfer_id):
    transfer = db.session.get(Transfer, transfer_id)
    if not transfer:
        raise ApiError("Transfer not found", status_code=404)
    if transfer.status != TransferStatus.REQUESTED:
        raise ApiError(
            f"Only a '{TransferStatus.REQUESTED}' transfer can be dispatched "
            f"(current status: '{transfer.status}')",
            status_code=409,
        )

    # Reduce source inventory atomically. The WHERE clause guarantees we never
    # dispatch more than is actually free at the source, even under
    # concurrent requests, since the UPDATE...WHERE is applied atomically by
    # the database.
    source_rows = Inventory.query.filter_by(
        item=transfer.item, location=transfer.source_location
    ).all()
    total_available = sum(r.available_qty for r in source_rows)
    if total_available < transfer.quantity:
        raise ApiError(
            "Cannot transfer more than available inventory at source location",
            status_code=409,
        )

    remaining = transfer.quantity
    for row in source_rows:
        if remaining <= 0:
            break
        take = min(row.available_qty, remaining)
        if take <= 0:
            continue
        stmt = (
            update(Inventory)
            .where(Inventory.id == row.id)
            .where((Inventory.physical_qty - Inventory.reserved_qty) >= take)
            .values(physical_qty=Inventory.physical_qty - take)
        )
        result = db.session.execute(stmt)
        if result.rowcount == 0:
            db.session.rollback()
            raise ApiError(
                "Inventory changed concurrently, please retry the transfer", status_code=409
            )
        remaining -= take

    if remaining > 0:
        db.session.rollback()
        raise ApiError(
            "Cannot transfer more than available inventory at source location",
            status_code=409,
        )

    dispatch_stmt = (
        update(Transfer)
        .where(Transfer.id == transfer.id)
        .where(Transfer.status == TransferStatus.REQUESTED)
        .values(status=TransferStatus.DISPATCHED, dispatched_at=datetime.now(timezone.utc))
    )
    result = db.session.execute(dispatch_stmt)
    if result.rowcount == 0:
        db.session.rollback()
        raise ApiError("Transfer was already dispatched", status_code=409)

    db.session.commit()
    db.session.refresh(transfer)
    return jsonify(transfer.to_dict())


@transfers_bp.post("/<int:transfer_id>/receive")
@role_required(Role.ADMIN, Role.OPERATIONS)
def receive_transfer(transfer_id):
    transfer = db.session.get(Transfer, transfer_id)
    if not transfer:
        raise ApiError("Transfer not found", status_code=404)

    # Atomic status transition dispatched -> received. If two receive
    # requests race, only the first UPDATE affects a row; the second gets
    # rowcount 0 and is rejected. This is what prevents the same transfer
    # from being received twice.
    stmt = (
        update(Transfer)
        .where(Transfer.id == transfer.id)
        .where(Transfer.status == TransferStatus.DISPATCHED)
        .values(status=TransferStatus.RECEIVED, received_at=datetime.now(timezone.utc))
    )
    result = db.session.execute(stmt)
    if result.rowcount == 0:
        db.session.rollback()
        raise ApiError(
            f"Transfer cannot be received (current status: '{transfer.status}')",
            status_code=409,
        )

    # Destination inventory only increases now, after receipt is confirmed.
    dest_row = Inventory.query.filter_by(
        item=transfer.item, location=transfer.destination_location
    ).first()
    if dest_row:
        dest_row.physical_qty += transfer.quantity
    else:
        dest_row = Inventory(
            item=transfer.item,
            category="TRANSFERRED",
            location=transfer.destination_location,
            batch="DEFAULT",
            physical_qty=transfer.quantity,
            reserved_qty=0,
        )
        db.session.add(dest_row)

    db.session.commit()
    db.session.refresh(transfer)
    return jsonify(transfer.to_dict())
