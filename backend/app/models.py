from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Trade(db.Model):
    __tablename__ = "trades"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    market = db.Column(db.String(20), nullable=False)  # CRYPTO / FOREX
    exchange = db.Column(db.String(80), nullable=True)
    symbol = db.Column(db.String(40), nullable=False)
    direction = db.Column(db.String(10), nullable=False)  # LONG / SHORT
    status = db.Column(db.String(12), nullable=False, default="CLOSED")
    entry_price = db.Column(db.Numeric(24, 10), nullable=False)
    exit_price = db.Column(db.Numeric(24, 10), nullable=True)
    quantity = db.Column(db.Numeric(24, 10), nullable=False)
    leverage = db.Column(db.Numeric(10, 2), nullable=True)
    stop_loss = db.Column(db.Numeric(24, 10), nullable=True)
    take_profit = db.Column(db.Numeric(24, 10), nullable=True)
    gross_pnl = db.Column(db.Numeric(24, 8), nullable=True)
    fees = db.Column(db.Numeric(24, 8), nullable=False, default=0)
    other_costs = db.Column(db.Numeric(24, 8), nullable=False, default=0)
    net_pnl = db.Column(db.Numeric(24, 8), nullable=True)

    # NEW FEATURES
    strategy = db.Column(db.String(100), nullable=True)
    emotion = db.Column(db.String(50), nullable=True)  # e.g., Confident, FOMO
    tags = db.Column(db.String(255), nullable=True)  # e.g., Breakout, Trend
    notes = db.Column(db.Text, nullable=True)

    opened_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        def val(x):
            return float(x) if x is not None else None

        return {
            "id": self.id, "market": self.market, "exchange": self.exchange,
            "symbol": self.symbol, "direction": self.direction, "status": self.status,
            "entry_price": val(self.entry_price), "exit_price": val(self.exit_price),
            "quantity": val(self.quantity), "leverage": val(self.leverage),
            "stop_loss": val(self.stop_loss), "take_profit": val(self.take_profit),
            "gross_pnl": val(self.gross_pnl), "fees": val(self.fees),
            "other_costs": val(self.other_costs), "net_pnl": val(self.net_pnl),
            "strategy": self.strategy, "emotion": self.emotion, "tags": self.tags, "notes": self.notes,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }