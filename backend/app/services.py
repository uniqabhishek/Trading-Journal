from decimal import Decimal, InvalidOperation

def dec(value, default=None):
    if value is None or value == "":
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError("A numeric field contains an invalid value.")

def calculate_simple_pnl(direction, entry, exit_price, quantity):
    if exit_price is None:
        return None
    entry, exit_price, quantity = Decimal(str(entry)), Decimal(str(exit_price)), Decimal(str(quantity))
    if direction == "LONG":
        return (exit_price - entry) * quantity
    if direction == "SHORT":
        return (entry - exit_price) * quantity
    raise ValueError("Direction must be LONG or SHORT.")