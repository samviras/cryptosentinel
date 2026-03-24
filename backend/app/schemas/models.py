"""Pydantic models for request/response validation."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# === Auth ===

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    company_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


# === Prices ===

class PriceSnapshot(BaseModel):
    symbol: str
    price_usd: float
    volume_24h: float
    market_cap: float
    change_24h: float
    change_7d: Optional[float] = None
    timestamp: datetime


class PriceHistoryQuery(BaseModel):
    symbol: str
    days: int = Field(default=7, ge=1, le=365)


# === Alerts ===

class AlertType(str, Enum):
    ARBITRAGE = "arbitrage"
    LIQUIDATION = "liquidation"
    GOVERNANCE = "governance"
    MOMENTUM = "momentum"
    CUSTOM = "custom"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertResponse(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    symbol: str
    title: str
    message: str
    data: Optional[dict] = None
    created_at: datetime
    is_read: bool = False


class AlertRuleCreate(BaseModel):
    type: AlertType
    symbol: str
    conditions: dict  # Flexible JSON for rule conditions
    webhook_url: Optional[str] = None
    is_active: bool = True


class AlertRuleResponse(BaseModel):
    id: str
    type: AlertType
    symbol: str
    conditions: dict
    webhook_url: Optional[str] = None
    is_active: bool
    created_at: datetime


# === AI Analysis ===

class AnalysisRequest(BaseModel):
    symbol: str
    include_sentiment: bool = True
    include_technicals: bool = True
    include_on_chain: bool = False


class AnalysisResponse(BaseModel):
    symbol: str
    summary: str
    sentiment: Optional[str] = None
    signals: list[dict]
    risk_level: str
    recommendation: str
    confidence: float = Field(ge=0, le=1)
    generated_at: datetime


# === Webhooks ===

class WebhookCreate(BaseModel):
    url: str
    events: list[AlertType]
    secret: Optional[str] = None


class WebhookResponse(BaseModel):
    id: str
    url: str
    events: list[str]
    is_active: bool
    created_at: datetime


# === API Keys ===

class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = 90


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key: str  # Only shown on creation
    created_at: datetime
    expires_at: Optional[datetime]


# === Usage ===

class UsageResponse(BaseModel):
    api_calls_today: int
    alerts_today: int
    analyses_today: int
    tier: str
    limits: dict
