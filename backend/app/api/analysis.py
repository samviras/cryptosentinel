"""AI analysis endpoints."""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user, check_tier_limit
from app.services.ai_analyst import analyze_symbol
from app.schemas.models import AnalysisRequest

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])


@router.get("/{symbol}")
async def get_analysis(symbol: str, user: dict = Depends(get_current_user)):
    """Get AI-powered analysis for a symbol."""
    check_tier_limit(user, "analyses_per_day")
    result = await analyze_symbol(symbol.upper())
    return result


@router.post("")
async def request_analysis(body: AnalysisRequest, user: dict = Depends(get_current_user)):
    """Request detailed AI analysis with custom parameters."""
    check_tier_limit(user, "analyses_per_day")
    result = await analyze_symbol(
        symbol=body.symbol.upper(),
        include_sentiment=body.include_sentiment,
    )
    return result
