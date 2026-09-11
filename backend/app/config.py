import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Environment-based configuration.

    Every value can be overridden via environment variables so the app is not
    tied to any single hosting provider. Defaults are safe for local dev.
    """

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "8"))
    )

    # Defaults to a local SQLite file so the app runs with zero setup, but any
    # SQLAlchemy-compatible URL (Postgres, MySQL, etc.) can be supplied.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'instance', 'erp.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {}

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")


class TestConfig(Config):
    from sqlalchemy.pool import StaticPool

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret"
    # StaticPool + check_same_thread=False lets the single in-memory SQLite
    # connection be shared safely across the threads used in concurrency
    # tests (e.g. two "simultaneous" reservation requests).
    SQLALCHEMY_ENGINE_OPTIONS = {
        "poolclass": StaticPool,
        "connect_args": {"check_same_thread": False},
    }


config_by_name = {
    "development": Config,
    "production": Config,
    "testing": TestConfig,
}
