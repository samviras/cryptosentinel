"""Price monitoring service — fetches crypto prices from CoinGecko."""

import httpx
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Map common symbols to CoinGecko IDs
SYMBOL_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "AVAX": "avalanche-2",
    "MATIC": "matic-network",
    "ARB": "arbitrum",
    "OP": "optimism",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "AAVE": "aave",
    "MKR": "maker",
    "CRV": "curve-dao-token",
    "LDO": "lido-dao",
    "DOGE": "dogecoin",
    "ADA": "cardano",
    "DOT": "polkadot",
    "ATOM": "cosmos",
    "NEAR": "near",
    "APT": "aptos",
    "SUI": "sui",
}

# Default watchlist
DEFAULT_WATCHLIST = ["BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "LINK", "UNI", "AAVE"]


async def fetch_prices(symbols: list[str] | None = None) -> list[dict]:
    """Fetch current prices from CoinGecko."""
    if symbols is None:
        symbols = DEFAULT_WATCHLIST

    coin_ids = [SYMBOL_MAP.get(s.upper(), s.lower()) for s in symbols]
    ids_param = ",".join(coin_ids)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{COINGECKO_BASE}/coins/markets",
            params={
                "vs_currency": "usd",
                "ids": ids_param,
                "order": "market_cap_desc",
                "sparkline": "false",
                "price_change_percentage": "24h,7d",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for coin in data:
        results.append({
            "symbol": coin["symbol"].upper(),
            "coingecko_id": coin["id"],
            "price_usd": coin["current_price"],
            "volume_24h": coin.get("total_volume", 0),
            "market_cap": coin.get("market_cap", 0),
            "change_24h": coin.get("price_change_percentage_24h", 0),
            "change_7d": coin.get("price_change_percentage_7d_in_currency", 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return results


async def fetch_price_history(symbol: str, days: int = 7) -> list[dict]:
    """Fetch historical price data."""
    coin_id = SYMBOL_MAP.get(symbol.upper(), symbol.lower())

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
            params={"vs_currency": "usd", "days": days},
        )
        resp.raise_for_status()
        data = resp.json()

    prices = []
    for ts, price in data.get("prices", []):
        prices.append({
            "timestamp": datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat(),
            "price_usd": price,
        })

    return prices


async def store_prices(prices: list[dict]) -> None:
    """Store price snapshots in Supabase."""
    db = get_supabase()
    rows = [
        {
            "symbol": p["symbol"],
            "price_usd": p["price_usd"],
            "volume_24h": p["volume_24h"],
            "market_cap": p["market_cap"],
            "change_24h": p["change_24h"],
            "change_7d": p.get("change_7d", 0),
            "recorded_at": p["timestamp"],
        }
        for p in prices
    ]
    try:
        db.table("price_snapshots").insert(rows).execute()
    except Exception as e:
        logger.error(f"Failed to store prices: {e}")


async def get_latest_prices() -> list[dict]:
    """Get latest stored prices from DB."""
    db = get_supabase()
    result = (
        db.table("price_snapshots")
        .select("*")
        .order("recorded_at", desc=True)
        .limit(len(DEFAULT_WATCHLIST))
        .execute()
    )
    return result.data or []
