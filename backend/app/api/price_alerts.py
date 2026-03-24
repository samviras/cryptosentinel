"""User price alert endpoints."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import get_supabase

router = APIRouter(prefix="/price-alerts", tags=["Price Alerts"])


class CreateAlertRequest(BaseModel):
    symbol: str
    target_price: float
    direction: Literal["above", "below"]


@router.post("")
async def create_alert(body: CreateAlertRequest, user: dict = Depends(get_current_user)):
    """Create a new price alert."""
    db = get_supabase()
    result = db.table("user_price_alerts").insert({
        "user_id": user["id"],
        "symbol": body.symbol.upper(),
        "target_price": body.target_price,
        "direction": body.direction,
    }).execute()
    return result.data[0]


@router.get("")
async def list_alerts(user: dict = Depends(get_current_user)):
    """List all price alerts for the current user."""
    db = get_supabase()
    result = (
        db.table("user_price_alerts")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"alerts": result.data, "count": len(result.data)}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Delete a price alert."""
    db = get_supabase()
    existing = (
        db.table("user_price_alerts")
        .select("id")
        .eq("id", alert_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.table("user_price_alerts").delete().eq("id", alert_id).execute()
    return {"success": True}
