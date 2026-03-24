"""Webhook management endpoints."""

import json
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.schemas.models import WebhookCreate

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("")
async def list_webhooks(user: dict = Depends(get_current_user)):
    """List registered webhooks."""
    db = get_supabase()
    result = (
        db.table("webhooks")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"webhooks": result.data or []}


@router.post("")
async def create_webhook(body: WebhookCreate, user: dict = Depends(get_current_user)):
    """Register a new webhook."""
    db = get_supabase()
    row = {
        "user_id": user["id"],
        "url": body.url,
        "events": json.dumps([e.value for e in body.events]),
        "secret": body.secret,
        "is_active": True,
    }
    result = db.table("webhooks").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create webhook")
    return result.data[0]


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str, user: dict = Depends(get_current_user)):
    """Delete a webhook."""
    db = get_supabase()
    db.table("webhooks").delete().eq("id", webhook_id).eq("user_id", user["id"]).execute()
    return {"status": "deleted"}


@router.patch("/{webhook_id}/toggle")
async def toggle_webhook(webhook_id: str, user: dict = Depends(get_current_user)):
    """Toggle webhook active/inactive."""
    db = get_supabase()
    current = db.table("webhooks").select("is_active").eq("id", webhook_id).eq("user_id", user["id"]).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Webhook not found")

    new_state = not current.data[0]["is_active"]
    db.table("webhooks").update({"is_active": new_state}).eq("id", webhook_id).execute()
    return {"is_active": new_state}
