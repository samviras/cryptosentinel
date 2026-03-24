"""Market data endpoints — Fear & Greed Index, etc."""

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user

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
