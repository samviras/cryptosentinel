"""Alert endpoints."""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.auth import get_current_user
from app.services.alert_engine import get_alerts, mark_read, get_alert_rules, create_alert_rule
from app.schemas.models import AlertRuleCreate

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
async def list_alerts(
    type: Optional[str] = Query(None, description="Filter by alert type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    unread: bool = Query(False, description="Only unread alerts"),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    """List alerts."""
    alerts = await get_alerts(
        user_id=user["id"],
        alert_type=type,
        severity=severity,
        unread_only=unread,
        limit=limit,
    )
    return {"alerts": alerts, "count": len(alerts)}


@router.post("/read")
async def mark_alerts_read(
    alert_ids: list[str],
    user: dict = Depends(get_current_user),
):
    """Mark alerts as read."""
    await mark_read(alert_ids)
    return {"status": "ok", "marked": len(alert_ids)}


@router.get("/rules")
async def list_rules(user: dict = Depends(get_current_user)):
    """List alert rules."""
    rules = await get_alert_rules(user["id"])
    return {"rules": rules, "count": len(rules)}


@router.post("/rules")
async def create_rule(
    body: AlertRuleCreate,
    user: dict = Depends(get_current_user),
):
    """Create an alert rule."""
    rule = await create_alert_rule(user["id"], body.model_dump())
    return rule
