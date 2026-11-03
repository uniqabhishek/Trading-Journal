from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = data.get("name", "").strip(), data.get("email", "").strip().lower(), data.get("password",
                                                                                                          "")
    if not name or not email or len(password) < 8:
        return jsonify({"error": "Name, email and password (min 8 chars) are required."}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered."}), 409
    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email, password = data.get("email", "").strip().lower(), data.get("password", "")
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})


@auth_bp.get("/me")
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    if not current_user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = db.session.get(User, int(current_user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"id": user.id, "name": user.name, "email": user.email})