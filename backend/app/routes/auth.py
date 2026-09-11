from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User
from app.decorators import role_required
from app.errors import ApiError

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        raise ApiError("username and password are required")

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        raise ApiError("Invalid credentials", status_code=401)

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username},
    )
    return jsonify({"access_token": token, "user": user.to_dict()})


@auth_bp.get("/users")
@role_required("admin")
def list_users():
    users = User.query.order_by(User.username).all()
    return jsonify([u.to_dict() for u in users])


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        raise ApiError("User not found", status_code=404)
    return jsonify(user.to_dict())
