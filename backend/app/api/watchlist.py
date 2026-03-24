"""Watchlist endpoints — track tokens with optional price targets."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class WatchlistItemCreate(BaseModel):
    symbol: str
    buy_target: Optional[float] = None
    sell_target: Optional[float] = None
    notes: Optional[str] = None


@router.post("")
async def add_to_watchlist(body: WatchlistItemCreate, user: dict = Depends(get_current_user)):
    """Add a token to watchlist with optional buy/sell price targets."""
    db = get_supabase()
    try:
        result = db.table("user_watchlist").insert({
            "user_id": user["id"],
            "symbol": body.symbol.upper(),
            "buy_target": body.buy_target,
            "sell_target": body.sell_target,
            "notes": body.notes,
        }).execute()
        return result.data[0]
    except Exception as e:
        err = str(e).lower()
        if "unique" in err or "duplicate" in err or "23505" in err:
            raise HTTPException(status_code=409, detail="Symbol already in watchlist")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def get_watchlist(user: dict = Depends(get_current_user)):
    """Get watchlist items enriched with current prices and target proximity flags."""
    db = get_supabase()
    result = (
        db.table("user_watchlist")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    items = result.data

    # Fetch current price for each unique symbol
    symbols = list({item["symbol"] for item in items})
    prices_map: dict[str, float] = {}
    for symbol in symbols:
        pr = (
            db.table("price_snapshots")
            .select("price_usd")
            .eq("symbol", symbol)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if pr.data:
            prices_map[symbol] = float(pr.data[0]["price_usd"])

    enriched = []
    for item in items:
        current = prices_map.get(item["symbol"])
        near_buy = None
        near_sell = None
        if current and item.get("buy_target"):
            diff = abs(current - float(item["buy_target"])) / float(item["buy_target"])
            near_buy = diff <= 0.05
        if current and item.get("sell_target"):
            diff = abs(current - float(item["sell_target"])) / float(item["sell_target"])
            near_sell = diff <= 0.05
        enriched.append({
            **item,
            "current_price": current,
            "near_buy_target": near_buy,
            "near_sell_target": near_sell,
        })

    return {"items": enriched, "count": len(enriched)}


@router.delete("/{item_id}")
async def remove_from_watchlist(item_id: str, user: dict = Depends(get_current_user)):
    """Remove a token from the watchlist."""
    db = get_supabase()
    existing = (
        db.table("user_watchlist")
        .select("id")
        .eq("id", item_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Item not found")
    db.table("user_watchlist").delete().eq("id", item_id).execute()
    return {"success": True}
