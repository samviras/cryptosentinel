"""CryptoSentinel — AI-Powered Market Monitoring Agent.

FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.api import auth, prices, alerts, analysis, webhooks, market, price_alerts, portfolio, watchlist
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} ({settings.app_env})")

    # Start background monitoring
    if settings.app_env != "test":
        start_scheduler()

    yield

    # Cleanup
    stop_scheduler()
    logger.info("Shutdown complete")


app = FastAPI(
    title="CryptoSentinel API",
    description="AI-powered crypto market monitoring for startups. Powered by Claude Haiku.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(prices.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")
app.include_router(price_alerts.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "CryptoSentinel API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
