"""Market data endpoints — Fear & Greed, Global Market, Top Movers."""

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/market", tags=["Market"])


@router.get("/fear-greed")
async def get_fear_greed(user: dict = Depends(get_current_user)):
    """Fetch Fear & Greed Index from alternative.me (last 30 days)."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.alternative.me/fng/?limit=30",
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch Fear & Greed data: {e}")

    entries = data.get("data", [])
    current = entries[0] if entries else None

    return {
        "current": current,
        "history": entries,
    }


@router.get("/global")
async def get_global_market(user: dict = Depends(get_current_user)):
    """Fetch global market stats from CoinGecko (free tier)."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.coingecko.com/api/v3/global",
                timeout=10,
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch global market data: {e}")

    total_market_cap = data.get("total_market_cap", {}).get("usd", 0)
    total_volume = data.get("total_volume", {}).get("usd", 0)
    market_cap_pct = data.get("market_cap_percentage", {})
    btc_dominance = market_cap_pct.get("btc", 0)
    eth_dominance = market_cap_pct.get("eth", 0)
    market_cap_change_24h = data.get("market_cap_change_percentage_24h_usd", 0)
    active_coins = data.get("active_cryptocurrencies", 0)

    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "btc_dominance": btc_dominance,
        "eth_dominance": eth_dominance,
        "market_cap_change_24h": market_cap_change_24h,
        "active_cryptocurrencies": active_coins,
    }


@router.get("/movers")
async def get_top_movers(user: dict = Depends(get_current_user)):
    """Return top 3 gainers and top 3 losers from stored price snapshots."""
    db = get_supabase()

    # Get the most recent snapshot for each symbol
    result = (
        db.table("price_snapshots")
        .select("symbol, price_usd, change_24h, recorded_at")
        .order("recorded_at", desc=True)
        .limit(200)
        .execute()
    )

    # Deduplicate: keep only the most recent row per symbol
    seen: set[str] = set()
    prices = []
    for row in result.data:
        sym = row["symbol"]
        if sym not in seen and row.get("change_24h") is not None:
            seen.add(sym)
            prices.append({
                "symbol": sym,
                "price_usd": float(row["price_usd"]),
                "change_24h": float(row["change_24h"]),
            })

    if not prices:
        return {"gainers": [], "losers": []}

    sorted_prices = sorted(prices, key=lambda x: x["change_24h"], reverse=True)
    gainers = sorted_prices[:3]
    losers = list(reversed(sorted_prices[-3:])) if len(sorted_prices) >= 3 else sorted_prices[::-1]

    return {"gainers": gainers, "losers": losers}
