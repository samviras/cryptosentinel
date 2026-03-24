"""AI analysis service — uses Claude Haiku for market intelligence."""

import json
import logging
from datetime import datetime, timezone

import anthropic

from app.core.config import get_settings
from app.core.database import get_supabase
from app.services.price_monitor import fetch_prices, fetch_price_history

logger = logging.getLogger(__name__)


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


SYSTEM_PROMPT = """You are CryptoSentinel AI, a professional crypto market analyst for institutional clients.

Your role:
- Analyze price data, volume, momentum, and market structure
- Identify actionable signals: breakouts, breakdowns, divergences, support/resistance
- Assess risk levels objectively
- Provide clear, concise recommendations

Output format — respond with valid JSON only:
{
  "summary": "2-3 sentence market overview",
  "sentiment": "bullish | bearish | neutral | mixed",
  "signals": [
    {"type": "momentum|support|resistance|volume|divergence", "description": "...", "strength": "strong|moderate|weak"}
  ],
  "risk_level": "low | medium | high | extreme",
  "recommendation": "Clear action recommendation",
  "confidence": 0.0 to 1.0
}

Be specific with numbers. No hedging. Institutional clients want clarity."""


async def analyze_symbol(symbol: str, include_sentiment: bool = True) -> dict:
    """Run AI analysis on a symbol using Claude Haiku."""
    db = get_supabase()

    # Use stored prices instead of hitting CoinGecko again
    latest = (
        db.table("price_snapshots")
        .select("*")
        .eq("symbol", symbol.upper())
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )

    if not latest.data:
        # Fallback to live fetch only if no stored data
        current = await fetch_prices([symbol])
        if not current:
            return {"error": f"No price data for {symbol}"}
        price_data = current[0]
    else:
        row = latest.data[0]
        price_data = {
            "price_usd": float(row["price_usd"]),
            "change_24h": float(row.get("change_24h", 0)),
            "change_7d": float(row.get("change_7d", 0)),
            "volume_24h": float(row.get("volume_24h", 0)),
            "market_cap": float(row.get("market_cap", 0)),
        }

    # Get stored history from DB
    history_rows = (
        db.table("price_snapshots")
        .select("price_usd, recorded_at")
        .eq("symbol", symbol.upper())
        .order("recorded_at", desc=True)
        .limit(48)
        .execute()
    )
    history = [{"timestamp": r["recorded_at"], "price_usd": float(r["price_usd"])} for r in (history_rows.data or [])]
    history.reverse()

    # Build context for Haiku
    recent_prices = history[-48:] if len(history) > 48 else history
    price_points = [f"{p['timestamp']}: ${p['price_usd']:,.2f}" for p in recent_prices]

    user_prompt = f"""Analyze {symbol} market data:

Current Price: ${price_data['price_usd']:,.2f}
24h Change: {price_data['change_24h']:.2f}%
7d Change: {price_data.get('change_7d', 'N/A')}%
24h Volume: ${price_data['volume_24h']:,.0f}
Market Cap: ${price_data['market_cap']:,.0f}

Recent price history (7 days):
{chr(10).join(price_points[-20:])}

Provide your analysis as JSON."""

    client = _get_client()

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = response.content[0].text
        # Parse JSON from response
        analysis = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to extract JSON from text
        try:
            start = raw_text.index("{")
            end = raw_text.rindex("}") + 1
            analysis = json.loads(raw_text[start:end])
        except (ValueError, json.JSONDecodeError):
            logger.error(f"Failed to parse Haiku response: {raw_text[:200]}")
            analysis = {
                "summary": raw_text[:500],
                "sentiment": "unknown",
                "signals": [],
                "risk_level": "unknown",
                "recommendation": "Analysis parsing failed — review raw output",
                "confidence": 0.0,
            }
    except Exception as e:
        logger.error(f"Haiku API error: {e}")
        raise

    # Enrich with metadata
    analysis["symbol"] = symbol
    analysis["generated_at"] = datetime.now(timezone.utc).isoformat()
    analysis["price_at_analysis"] = price_data["price_usd"]

    # Store analysis
    _store_analysis(symbol, analysis)

    return analysis


async def detect_alerts(prices: list[dict]) -> list[dict]:
    """Use Haiku to detect alert-worthy conditions across all monitored assets."""
    if not prices:
        return []

    summary_lines = []
    for p in prices:
        summary_lines.append(
            f"{p['symbol']}: ${p['price_usd']:,.2f} (24h: {p['change_24h']:+.2f}%, vol: ${p['volume_24h']:,.0f})"
        )

    prompt = f"""Review these crypto prices and identify any alert-worthy conditions.

Current market snapshot:
{chr(10).join(summary_lines)}

Look for:
1. ARBITRAGE: Unusual price movements suggesting exchange discrepancies
2. LIQUIDATION: Extreme moves (>8% in 24h) suggesting potential cascade liquidations
3. MOMENTUM: Strong directional moves with volume confirmation
4. GOVERNANCE: Note any tokens with significant movements that may relate to governance events

Respond with JSON array of alerts:
[
  {{
    "type": "arbitrage|liquidation|momentum|governance",
    "severity": "low|medium|high|critical",
    "symbol": "TOKEN",
    "title": "Short alert title",
    "message": "Detailed explanation",
    "data": {{"key": "value"}}
  }}
]

If no alerts are warranted, return an empty array: []"""

    client = _get_client()

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system="You are a crypto market alert system. Output valid JSON arrays only. Be selective — only flag genuinely noteworthy conditions.",
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text
        alerts = json.loads(raw)
        if not isinstance(alerts, list):
            alerts = []
    except json.JSONDecodeError:
        try:
            start = raw.index("[")
            end = raw.rindex("]") + 1
            alerts = json.loads(raw[start:end])
        except (ValueError, json.JSONDecodeError):
            alerts = []
    except Exception as e:
        logger.error(f"Alert detection error: {e}")
        alerts = []

    return alerts


def _store_analysis(symbol: str, analysis: dict) -> None:
    """Store analysis result in Supabase."""
    try:
        db = get_supabase()
        db.table("analyses").insert({
            "symbol": symbol,
            "summary": analysis.get("summary", ""),
            "sentiment": analysis.get("sentiment", "unknown"),
            "risk_level": analysis.get("risk_level", "unknown"),
            "recommendation": analysis.get("recommendation", ""),
            "confidence": analysis.get("confidence", 0),
            "signals": json.dumps(analysis.get("signals", [])),
            "raw_response": json.dumps(analysis),
            "generated_at": analysis.get("generated_at", datetime.now(timezone.utc).isoformat()),
        }).execute()
    except Exception as e:
        logger.error(f"Failed to store analysis: {e}")
