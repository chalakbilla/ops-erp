from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.errors import ApiError


def role_required(*allowed_roles):
    """Restrict a route to one or more roles. Always call after verifying JWT."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in allowed_roles:
                raise ApiError(
                    f"Role '{role}' is not authorized for this operation", status_code=403
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator
