"""JWT authentication and API key validation."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.database import get_supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expires,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Validate JWT token or API key and return user."""
    token = credentials.credentials
    db = get_supabase()

    # Try API key first (starts with "cs_")
    if token.startswith("cs_"):
        result = db.table("api_keys").select("*, users(*)").eq("key", token).eq("is_active", True).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid API key")
        api_key = result.data[0]

        # Track usage
        db.table("api_keys").update({
            "last_used_at": datetime.now(timezone.utc).isoformat(),
            "usage_count": api_key["usage_count"] + 1,
        }).eq("id", api_key["id"]).execute()

        return api_key["users"]

    # Otherwise treat as JWT
    payload = decode_token(token)
    result = db.table("users").select("*").eq("id", payload["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    return result.data[0]


def check_tier_limit(user: dict, resource: str) -> None:
    """Check if user has exceeded their tier limits."""
    tier_limits = {
        "starter": {"alerts_per_day": 1000, "analyses_per_day": 100, "api_keys": 5},
        "growth": {"alerts_per_day": 10000, "analyses_per_day": 500, "api_keys": 20},
        "enterprise": {"alerts_per_day": 999999, "analyses_per_day": 2000, "api_keys": 999},
    }
    tier = user.get("tier", "starter")
    limits = tier_limits.get(tier, tier_limits["starter"])
    # In production, check actual usage counts from DB
    # For now, this is a placeholder that always passes
