from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Trade
from ..services import dec, calculate_simple_pnl

trades_bp = Blueprint("trades", __name__)


def validate_and_apply(trade, data, creating=False):
    if creating:
        required = ["market", "symbol", "direction", "entry_price", "quantity"]
        missing = [k for k in required if data.get(k) in (None, "")]
        if missing:
            raise ValueError("Missing required fields: " + ", ".join(missing))

    if data.get("market"):
        trade.market = data["market"].upper()
    if data.get("direction"):
        trade.direction = data["direction"].upper()
    if data.get("status"):
        trade.status = data["status"].upper()

    string_fields = ["exchange", "symbol", "strategy", "emotion", "tags", "notes"]
    for key in string_fields:
        if key in data:
            setattr(trade, key, data[key])

    numeric_fields = ["entry_price", "exit_price", "quantity", "leverage", "stop_loss", "take_profit", "fees",
                      "other_costs", "gross_pnl"]
    for key in numeric_fields:
        if key in data:
            setattr(trade, key, dec(data[key], Decimal("0") if key in ("fees", "other_costs") else None))

    if trade.status == "CLOSED":
        if trade.exit_price is None:
            raise ValueError("Exit price is required for closed trades.")

        if trade.market == "FOREX":
            if trade.gross_pnl is None:
                raise ValueError("For Forex, provide gross_pnl manually.")
            gross = trade.gross_pnl
        else:
            gross = calculate_simple_pnl(trade.direction, trade.entry_price, trade.exit_price, trade.quantity)
            trade.gross_pnl = gross

        trade.net_pnl = gross - (trade.fees or Decimal("0")) - (trade.other_costs or Decimal("0"))
        if not trade.closed_at:
            trade.closed_at = datetime.now(timezone.utc)
    else:
        trade.gross_pnl = None
        trade.net_pnl = None
        trade.closed_at = None


@trades_bp.route("", methods=["GET", "POST"])
@jwt_required()
def trade_collection():
    uid = int(get_jwt_identity())
    if request.method == "GET":
        rows = Trade.query.filter_by(user_id=uid).order_by(Trade.opened_at.desc()).all()
        return jsonify([t.to_dict() for t in rows])

    data = request.get_json(silent=True) or {}
    trade = Trade(user_id=uid)
    try:
        validate_and_apply(trade, data, creating=True)
        db.session.add(trade)
        db.session.commit()
        return jsonify(trade.to_dict()), 201
    except (ValueError, TypeError) as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@trades_bp.route("/<int:trade_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def trade_item(trade_id):
    trade = Trade.query.filter_by(id=trade_id, user_id=int(get_jwt_identity())).first()
    if not trade:
        return jsonify({"error": "Trade not found."}), 404

    if request.method == "GET":
        return jsonify(trade.to_dict())
    if request.method == "DELETE":
        db.session.delete(trade)
        db.session.commit()
        return jsonify({"message": "Trade deleted."})
    try:
        validate_and_apply(trade, request.get_json(silent=True) or {})
        db.session.commit()
        return jsonify(trade.to_dict())
    except (ValueError, TypeError) as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400