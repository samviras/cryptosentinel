"""Alert engine — processes, stores, and delivers alerts."""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.database import get_supabase

logger = logging.getLogger(__name__)


async def process_alerts(alerts: list[dict], user_id: Optional[str] = None) -> list[dict]:
    """Process detected alerts: deduplicate, store, and deliver via webhooks."""
    db = get_supabase()
    stored = []

    for alert in alerts:
        # Deduplicate: hash type+symbol+title to avoid spam
        dedup_key = hashlib.md5(
            f"{alert['type']}:{alert['symbol']}:{alert['title']}".encode()
        ).hexdigest()

        # Check if we've seen this alert in the last hour
        existing = (
            db.table("alerts")
            .select("id")
            .eq("dedup_key", dedup_key)
            .gte("created_at", datetime.now(timezone.utc).replace(minute=0, second=0).isoformat())
            .execute()
        )

        if existing.data:
            continue  # Skip duplicate

        row = {
            "type": alert["type"],
            "severity": alert["severity"],
            "symbol": alert["symbol"],
            "title": alert["title"],
            "message": alert["message"],
            "data": json.dumps(alert.get("data", {})),
            "dedup_key": dedup_key,
            "is_read": False,
        }

        result = db.table("alerts").insert(row).execute()
        if result.data:
            stored.append(result.data[0])

    # Deliver via webhooks
    if stored:
        await _deliver_webhooks(stored)

    return stored


async def get_alerts(
    user_id: str,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50,
) -> list[dict]:
    """Fetch alerts for a user."""
    db = get_supabase()
    query = db.table("alerts").select("*").order("created_at", desc=True).limit(limit)

    if alert_type:
        query = query.eq("type", alert_type)
    if severity:
        query = query.eq("severity", severity)
    if unread_only:
        query = query.eq("is_read", False)

    result = query.execute()
    return result.data or []


async def mark_read(alert_ids: list[str]) -> None:
    """Mark alerts as read."""
    db = get_supabase()
    for aid in alert_ids:
        db.table("alerts").update({"is_read": True}).eq("id", aid).execute()


async def get_alert_rules(user_id: str) -> list[dict]:
    """Get alert rules for a user."""
    db = get_supabase()
    result = (
        db.table("alert_rules")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


async def create_alert_rule(user_id: str, rule: dict) -> dict:
    """Create a new alert rule."""
    db = get_supabase()
    row = {
        "user_id": user_id,
        "type": rule["type"],
        "symbol": rule["symbol"],
        "conditions": json.dumps(rule["conditions"]),
        "webhook_url": rule.get("webhook_url"),
        "is_active": rule.get("is_active", True),
    }
    result = db.table("alert_rules").insert(row).execute()
    return result.data[0] if result.data else {}


async def _deliver_webhooks(alerts: list[dict]) -> None:
    """Send alerts to registered webhooks."""
    db = get_supabase()
    webhooks = db.table("webhooks").select("*").eq("is_active", True).execute()

    if not webhooks.data:
        return

    async with httpx.AsyncClient(timeout=10) as client:
        for webhook in webhooks.data:
            subscribed_events = json.loads(webhook.get("events", "[]")) if isinstance(webhook.get("events"), str) else webhook.get("events", [])

            matching_alerts = [a for a in alerts if a["type"] in subscribed_events]
            if not matching_alerts:
                continue

            payload = {
                "event": "alerts",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alerts": matching_alerts,
            }

            try:
                resp = await client.post(
                    webhook["url"],
                    json=payload,
                    headers={"Content-Type": "application/json", "X-CryptoSentinel-Signature": "v1"},
                )
                logger.info(f"Webhook delivered to {webhook['url']}: {resp.status_code}")
            except Exception as e:
                logger.error(f"Webhook delivery failed for {webhook['url']}: {e}")
