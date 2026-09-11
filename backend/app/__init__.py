import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, jwt, cors
from app.errors import register_error_handlers


def create_app(env=None):
    env = env or os.environ.get("FLASK_ENV", "development")
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(env, config_by_name["development"]))

    # Make sure instance folder (for the default sqlite file) exists.
    os.makedirs(os.path.join(app.root_path, "..", "instance"), exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    register_error_handlers(app)

    from app.routes.auth import auth_bp
    from app.routes.inventory import inventory_bp
    from app.routes.work_orders import work_orders_bp
    from app.routes.transfers import transfers_bp
    from app.routes.orders import orders_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(work_orders_bp, url_prefix="/api/work-orders")
    app.register_blueprint(transfers_bp, url_prefix="/api/transfers")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app
