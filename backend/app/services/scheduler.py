"""Background task scheduler for periodic monitoring."""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.services.price_monitor import fetch_prices, store_prices
from app.services.ai_analyst import detect_alerts
from app.services.alert_engine import process_alerts

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def check_price_alerts(prices: list) -> None:
    """Compare current prices against user price alerts and mark triggered ones."""
    from datetime import datetime, timezone
    from app.core.database import get_supabase

    if not prices:
        return

    db = get_supabase()
    prices_map = {p["symbol"]: float(p["price_usd"]) for p in prices}

    result = db.table("user_price_alerts").select("*").eq("is_triggered", False).execute()
    for alert in result.data or []:
        current = prices_map.get(alert["symbol"])
        if current is None:
            continue
        target = float(alert["target_price"])
        direction = alert["direction"]
        if (direction == "above" and current >= target) or (direction == "below" and current <= target):
            db.table("user_price_alerts").update({
                "is_triggered": True,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", alert["id"]).execute()
            logger.info(f"Price alert triggered: {alert['symbol']} {direction} ${target} (now ${current:.2f})")


async def price_check_job():
    """Periodic job: fetch prices, store, and check for alerts."""
    try:
        logger.info("Running price check...")
        prices = await fetch_prices()
        await store_prices(prices)
        logger.info(f"Stored {len(prices)} price snapshots")
        await check_price_alerts(prices)
    except Exception as e:
        logger.error(f"Price check failed: {e}")


async def alert_detection_job():
    """Periodic job: run AI alert detection using stored prices."""
    try:
        logger.info("Running AI alert detection...")
        from app.services.price_monitor import get_latest_prices, DEFAULT_WATCHLIST
        from app.core.database import get_supabase

        db = get_supabase()
        # Use stored prices instead of hitting CoinGecko again
        stored_prices = []
        for symbol in DEFAULT_WATCHLIST:
            result = (
                db.table("price_snapshots")
                .select("*")
                .eq("symbol", symbol)
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                row = result.data[0]
                stored_prices.append({
                    "symbol": row["symbol"],
                    "price_usd": float(row["price_usd"]),
                    "volume_24h": float(row.get("volume_24h", 0)),
                    "market_cap": float(row.get("market_cap", 0)),
                    "change_24h": float(row.get("change_24h", 0)),
                    "change_7d": float(row.get("change_7d", 0)),
                })

        if not stored_prices:
            logger.info("No stored prices yet, skipping alert detection")
            return

        alerts = await detect_alerts(stored_prices)
        if alerts:
            stored = await process_alerts(alerts)
            logger.info(f"Generated {len(stored)} new alerts")
        else:
            logger.info("No alerts detected")
    except Exception as e:
        logger.error(f"Alert detection failed: {e}")


def start_scheduler():
    """Start the background scheduler."""
    settings = get_settings()

    scheduler.add_job(
        price_check_job,
        "interval",
        seconds=settings.price_check_interval_seconds,
        id="price_check",
        replace_existing=True,
    )

    # AI alert detection disabled — runs on-demand only to save API costs
    # scheduler.add_job(
    #     alert_detection_job,
    #     "interval",
    #     seconds=settings.ai_analysis_interval_seconds,
    #     id="alert_detection",
    #     replace_existing=True,
    # )

    scheduler.start()
    logger.info(
        f"Scheduler started: prices every {settings.price_check_interval_seconds}s, "
        f"alerts every {settings.ai_analysis_interval_seconds}s"
    )


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()
    logger.info("Scheduler stopped")
