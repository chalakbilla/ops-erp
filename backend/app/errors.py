from flask import jsonify


class ApiError(Exception):
    """Raised for any expected business/validation error.

    Carries an HTTP status code so route handlers can just `raise` instead of
    manually building error responses everywhere.
    """

    def __init__(self, message, status_code=400, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self):
        payload = {"error": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(404)
    def handle_404(err):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def handle_405(err):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def handle_500(err):
        app.logger.exception("Unhandled server error")
        return jsonify({"error": "Internal server error"}), 500
