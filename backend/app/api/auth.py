"""Authentication endpoints."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends

from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.core.database import get_supabase
from app.schemas.models import UserRegister, UserLogin, TokenResponse, APIKeyCreate, APIKeyResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister):
    """Register a new user account."""
    db = get_supabase()

    # Check if email already exists
    existing = db.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user
    user_data = {
        "email": body.email,
        "password_hash": hash_password(body.password),
        "company_name": body.company_name,
        "tier": "starter",
        "is_active": True,
    }
    result = db.table("users").insert(user_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = result.data[0]
    token = create_access_token(user["id"], user["email"])

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    """Login and receive JWT token."""
    db = get_supabase()
    result = db.table("users").select("*").eq("email", body.email).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")

    token = create_access_token(user["id"], user["email"])

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
    )


@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(body: APIKeyCreate, user: dict = Depends(get_current_user)):
    """Create a new API key."""
    db = get_supabase()

    key = f"cs_{secrets.token_urlsafe(32)}"
    expires_at = None
    if body.expires_in_days:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)).isoformat()

    row = {
        "user_id": user["id"],
        "name": body.name,
        "key": key,
        "expires_at": expires_at,
        "is_active": True,
        "usage_count": 0,
    }
    result = db.table("api_keys").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create API key")

    data = result.data[0]
    return APIKeyResponse(
        id=data["id"],
        name=data["name"],
        key=data["key"],
        created_at=data["created_at"],
        expires_at=data.get("expires_at"),
    )


@router.get("/api-keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    """List all API keys for the current user."""
    db = get_supabase()
    result = db.table("api_keys").select("id, name, created_at, expires_at, is_active, usage_count, last_used_at").eq("user_id", user["id"]).execute()
    return result.data or []


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str, user: dict = Depends(get_current_user)):
    """Revoke an API key."""
    db = get_supabase()
    db.table("api_keys").update({"is_active": False}).eq("id", key_id).eq("user_id", user["id"]).execute()
    return {"status": "revoked"}
