import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from .extensions import db
from .routes.auth import auth_bp
from .routes.trades import trades_bp
from .routes.dashboard import dashboard_bp

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///trademind_v2.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Allow all origins for local development
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    JWTManager(app)

    from . import models
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(trades_bp, url_prefix="/api/trades")
    app.register_blueprint(dashboard_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "TradeMind AI V2"})

    with app.app_context():
        db.create_all()

    return app