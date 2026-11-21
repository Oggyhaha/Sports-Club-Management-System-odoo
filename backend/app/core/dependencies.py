"""
FastAPI security and authentication dependencies.
Extracts Bearer tokens, validates JWTs against PostgreSQL users,
enforces token_version invalidation, and provides RBAC role enforcement.
"""
import uuid
from typing import Callable, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.jwt import decode_access_token
from app.modules.auth.models import RoleEnum, User

# OAuth2 scheme extracts Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=True,
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Validates Bearer access token:
    1. Extracts and verifies signature, expiration, and required claims.
    2. Loads user from PostgreSQL database.
    3. Verifies user exists and is_active.
    4. Validates token_version against current database token_version (logout invalidation).
    Raises HTTP 401 on missing, expired, revoked, or invalid tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={
                "WWW-Authenticate": 'Bearer error="invalid_token", error_description="The token has expired"'
            },
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    user_id_str = payload.get("sub")
    token_version = payload.get("ver")

    if not user_id_str or token_version is None:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(*allowed_roles: Union[RoleEnum, str, list, tuple, set]) -> Callable[[User], User]:
    """
    Reusable role-based access control dependency factory.
    Verifies that the authenticated user possesses at least one of the specified allowed roles.
    Roles are queried directly from the database-backed User.roles relationship.
    Supports both varargs (require_roles(A, B)) and collections (require_roles([A, B])).
    Rejects unauthorized users with HTTP 403 Forbidden.
    """
    # Canonicalize allowed roles to string set (handling potential lists/tuples)
    allowed_role_set = set()
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            for item in r:
                allowed_role_set.add(item.value if isinstance(item, RoleEnum) else str(item))
        else:
            allowed_role_set.add(r.value if isinstance(r, RoleEnum) else str(r))

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_roles = {r.name for r in current_user.roles}
        if not user_roles.intersection(allowed_role_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: insufficient privileges",
            )
        return current_user

    return role_checker
