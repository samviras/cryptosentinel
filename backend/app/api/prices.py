"""Price endpoints."""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.auth import get_current_user
from app.services.price_monitor import fetch_prices, fetch_price_history, get_latest_prices

router = APIRouter(prefix="/prices", tags=["Prices"])


@router.get("")
async def get_prices(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols (e.g., BTC,ETH,SOL)"),
    user: dict = Depends(get_current_user),
):
    """Get current prices for monitored assets."""
    symbol_list = symbols.split(",") if symbols else None
    prices = await fetch_prices(symbol_list)
    return {"prices": prices, "count": len(prices)}


@router.get("/latest")
async def get_latest(user: dict = Depends(get_current_user)):
    """Get latest stored prices from database."""
    prices = await get_latest_prices()
    return {"prices": prices, "count": len(prices)}


@router.get("/history/{symbol}")
async def get_history(
    symbol: str,
    days: int = Query(default=7, ge=1, le=365),
    user: dict = Depends(get_current_user),
):
    """Get price history for a symbol."""
    history = await fetch_price_history(symbol.upper(), days)
    return {"symbol": symbol.upper(), "days": days, "data": history, "count": len(history)}
