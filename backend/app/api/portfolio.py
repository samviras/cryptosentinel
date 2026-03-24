"""Portfolio tracker endpoints."""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


class AddHoldingRequest(BaseModel):
    symbol: str
    amount: float
    buy_price: float


def _get_prices_map(db, symbols: list[str]) -> dict[str, float]:
    """Fetch latest stored price for each symbol."""
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
    return prices_map


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

    symbols = list({h["symbol"] for h in holdings})
    prices_map = _get_prices_map(db, symbols)

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


@router.post("/share")
async def share_portfolio(user: dict = Depends(get_current_user)):
    """Generate a share token for the public portfolio page."""
    db = get_supabase()

    # Check if user already has a share token
    user_row = db.table("users").select("share_token").eq("id", user["id"]).execute()
    if user_row.data and user_row.data[0].get("share_token"):
        token = user_row.data[0]["share_token"]
    else:
        token = secrets.token_urlsafe(16)
        db.table("users").update({"share_token": token}).eq("id", user["id"]).execute()

    return {"share_token": token}


@router.get("/public/{share_token}")
async def get_public_portfolio(share_token: str):
    """Public portfolio view — shows % allocation only, no amounts. No auth required."""
    db = get_supabase()

    # Find user by share token
    user_row = db.table("users").select("id").eq("share_token", share_token).execute()
    if not user_row.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    user_id = user_row.data[0]["id"]
    holdings = (
        db.table("portfolio_holdings")
        .select("symbol, amount, buy_price")
        .eq("user_id", user_id)
        .execute()
        .data
    )

    if not holdings:
        return {"allocations": [], "total_holdings": 0, "performance": None}

    symbols = list({h["symbol"] for h in holdings})
    prices_map = _get_prices_map(db, symbols)

    total_value = 0.0
    total_cost = 0.0
    symbol_values: dict[str, float] = {}

    for h in holdings:
        symbol = h["symbol"]
        amount = float(h["amount"])
        buy_price = float(h["buy_price"])
        current_price = prices_map.get(symbol)
        cost = amount * buy_price
        total_cost += cost
        if current_price:
            val = amount * current_price
            total_value += val
            symbol_values[symbol] = symbol_values.get(symbol, 0) + val

    allocations = []
    for symbol, val in sorted(symbol_values.items(), key=lambda x: x[1], reverse=True):
        allocations.append({
            "symbol": symbol,
            "percentage": round(val / total_value * 100, 1) if total_value > 0 else 0,
        })

    performance = None
    if total_cost > 0:
        pnl_pct = (total_value - total_cost) / total_cost * 100
        performance = f"{'+' if pnl_pct >= 0 else ''}{pnl_pct:.1f}%"

    return {
        "allocations": allocations,
        "total_holdings": len(set(h["symbol"] for h in holdings)),
        "performance": performance,
    }
