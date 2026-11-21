"""
JWT access token utilities using PyJWT.
Enforces HS256 algorithm allowlist, timezone-aware UTC timestamps,
and required payload claims (sub, exp, iat, ver).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt

from app.core.config import settings


def get_jwt_secret(secret_key: Optional[str] = None) -> str:
    """
    Validates that a secure SECRET_KEY is configured.
    Enforces a minimum length of 32 characters (256 bits) as per RFC 7518.
    Fails securely if missing or insecure.
    """
    secret = settings.SECRET_KEY if secret_key is None else secret_key
    if not secret or len(secret.strip()) < 32:
        raise ValueError(
            "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY is missing or too short (minimum 32 characters required)."
        )
    return secret


def create_access_token(
    user_id: uuid.UUID | str,
    token_version: int,
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None,
) -> str:
    """
    Creates a signed JWT access token.
    Payload contains:
    - sub: user UUID (as string)
    - iat: issued-at timestamp (UTC integer)
    - exp: expiration timestamp (UTC integer)
    - ver: current user token_version integer
    """
    key = get_jwt_secret(secret_key)
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "ver": int(token_version),
    }

    return jwt.encode(payload, key, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(
    token: str,
    secret_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Decodes and validates a JWT token.
    Enforces:
    - Signature verification with SECRET_KEY.
    - Explicit algorithm allowlist (HS256 only; rejects 'none' or unlisted algorithms).
    - Expiration timestamp validation (exp).
    - Presence of required claims: sub, exp, iat, ver.
    Raises:
    - jwt.ExpiredSignatureError if token has expired.
    - jwt.InvalidSignatureError if token signature doesn't match.
    - jwt.InvalidTokenError for malformed tokens or missing required claims.
    """
    key = get_jwt_secret(secret_key)
    payload = jwt.decode(
        token,
        key,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "iat", "ver"]},
    )
    return payload
