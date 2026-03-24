"""Portfolio tracker endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


class AddHoldingRequest(BaseModel):
    symbol: str
    amount: float
    buy_price: float


@router.post("")
async def add_holding(body: AddHoldingRequest, user: dict = Depends(get_current_user)):
    """Add a new portfolio holding."""
    db = get_supabase()
    result = db.table("portfolio_holdings").insert({
        "user_id": user["id"],
        "symbol": body.symbol.upper(),
        "amount": body.amount,
        "buy_price": body.buy_price,
    }).execute()
    return result.data[0]


@router.get("")
async def get_portfolio(user: dict = Depends(get_current_user)):
    """Get portfolio with current values calculated from stored prices."""
    db = get_supabase()
    holdings = (
        db.table("portfolio_holdings")
        .select("*")
        .eq("user_id", user["id"])
        .order("added_at", desc=True)
        .execute()
        .data
    )

    if not holdings:
        return {
            "holdings": [],
            "total_value": 0,
            "total_cost": 0,
            "total_pnl": 0,
            "total_pnl_percent": 0,
        }

    # Fetch current prices for all held symbols
    symbols = list({h["symbol"] for h in holdings})
    prices_map: dict[str, float] = {}
    for symbol in symbols:
        result = (
            db.table("price_snapshots")
            .select("price_usd")
            .eq("symbol", symbol)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            prices_map[symbol] = float(result.data[0]["price_usd"])

    enriched = []
    total_value = 0.0
    total_cost = 0.0

    for h in holdings:
        symbol = h["symbol"]
        amount = float(h["amount"])
        buy_price = float(h["buy_price"])
        current_price = prices_map.get(symbol)
        cost = amount * buy_price

        if current_price is not None:
            current_value = amount * current_price
            pnl = current_value - cost
            pnl_percent = (pnl / cost * 100) if cost > 0 else 0.0
        else:
            current_value = None
            pnl = None
            pnl_percent = None

        total_value += current_value or 0.0
        total_cost += cost

        enriched.append({
            **h,
            "current_price": current_price,
            "current_value": current_value,
            "pnl": pnl,
            "pnl_percent": pnl_percent,
        })

    total_pnl = total_value - total_cost
    total_pnl_percent = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0

    return {
        "holdings": enriched,
        "total_value": total_value,
        "total_cost": total_cost,
        "total_pnl": total_pnl,
        "total_pnl_percent": total_pnl_percent,
    }


@router.delete("/{holding_id}")
async def delete_holding(holding_id: str, user: dict = Depends(get_current_user)):
    """Remove a portfolio holding."""
    db = get_supabase()
    existing = (
        db.table("portfolio_holdings")
        .select("id")
        .eq("id", holding_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.table("portfolio_holdings").delete().eq("id", holding_id).execute()
    return {"success": True}
