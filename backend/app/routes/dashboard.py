from decimal import Decimal
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Trade

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/dashboard")
@jwt_required()
def dashboard():
    uid = int(get_jwt_identity())
    trades = Trade.query.filter_by(user_id=uid, status="CLOSED").all()
    pnls = [Decimal(str(t.net_pnl or 0)) for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    total = sum(pnls, Decimal("0"))
    gross_profit = sum(wins, Decimal("0"))
    gross_loss = abs(sum(losses, Decimal("0")))

    return jsonify({
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate": round((len(wins) / len(trades) * 100), 2) if trades else 0,
        "net_pnl": float(total),
        "gross_profit": float(gross_profit),
        "gross_loss": float(gross_loss),
        "profit_factor": float(gross_profit / gross_loss) if gross_loss else None,
    })