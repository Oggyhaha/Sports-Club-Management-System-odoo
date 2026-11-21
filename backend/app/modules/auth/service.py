"""
Authentication and Authorization service layer.
Encapsulates user registration, password verification, staff invitation lifecycle,
and profile management.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import Invitation, Member, Role, RoleEnum, User
from app.modules.auth.schemas import (
    StaffAcceptInviteRequest,
    StaffInviteRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
)


def register_member(db: Session, reg_in: UserRegisterRequest) -> User:
    """
    Public member registration:
    - Normalizes email.
    - Rejects duplicate emails (HTTP 409 Conflict).
    - Strictly forces assignment of the 'member' role.
    - Does NOT create a paid membership subscription.
    """
    normalized_email = reg_in.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # Fetch canonical 'member' role
    member_role = db.query(Role).filter(Role.name == RoleEnum.MEMBER.value).first()
    if not member_role:
        member_role = Role(
            name=RoleEnum.MEMBER.value,
            description="Registered sports club member with booking privileges",
        )
        db.add(member_role)
        db.flush()

    user = User(
        email=normalized_email,
        hashed_password=hash_password(reg_in.password),
        full_name=reg_in.full_name.strip(),
        phone=reg_in.phone.strip() if reg_in.phone else None,
        is_active=True,
        token_version=1,
    )
    user.roles.append(member_role)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Verifies user credentials:
    - Normalizes email.
    - Constant-time bcrypt check.
    - Checks active account status.
    """
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive. Please contact club administration.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def create_staff_invitation(
    db: Session,
    invite_in: StaffInviteRequest,
    invited_by_user_id: str,
) -> Tuple[Invitation, str]:
    """
    Generates a secure single-use staff/client invitation token.
    - Role is strictly restricted to allowlisted staff/client roles (never 'owner').
    - Only SHA-256 hash of the token is persisted in PostgreSQL.
    - Returns (invitation_record, raw_token).
    """
    normalized_email = invite_in.email.strip().lower()

    # Verify target role exists
    role = db.query(Role).filter(Role.name == invite_in.role).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{invite_in.role}' does not exist in the system.",
        )

    # Check if a user with this email already exists
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{normalized_email}' already exists.",
        )

    # Cryptographically secure random 32-byte token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    invitation = Invitation(
        email=normalized_email,
        role_id=role.id,
        token_hash=token_hash,
        invited_by=invited_by_user_id,
        status="pending",
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return invitation, raw_token


def accept_staff_invitation(
    db: Session,
    accept_in: StaffAcceptInviteRequest,
) -> User:
    """
    Consumes a staff invitation token:
    - Hashes incoming raw token.
    - Validates token existence, expiration, and 'pending' status.
    - Creates User with assigned role.
    - Marks invitation as 'accepted' in the same atomic transaction.
    """
    token_hash = hashlib.sha256(accept_in.token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    invitation = (
        db.query(Invitation)
        .filter(Invitation.token_hash == token_hash, Invitation.status == "pending")
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already consumed invitation token.",
        )

    if invitation.expires_at < now:
        invitation.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token has expired.",
        )

    # Double-check email conflict
    if db.query(User).filter(User.email == invitation.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # Create staff user with invited role
    new_user = User(
        email=invitation.email,
        hashed_password=hash_password(accept_in.password),
        full_name=accept_in.full_name.strip(),
        phone=accept_in.phone.strip() if accept_in.phone else None,
        is_active=True,
        token_version=1,
    )
    new_user.roles.append(invitation.role)
    db.add(new_user)

    # Mark invitation accepted
    invitation.status = "accepted"
    invitation.accepted_at = now

    db.commit()
    db.refresh(new_user)
    return new_user


def update_user_profile(
    db: Session,
    user: User,
    update_in: UserProfileUpdateRequest,
) -> User:
    """
    Self-service profile update for authenticated users.
    Synchronizes full_name and phone to linked Member profile if present.
    """
    if update_in.full_name is not None:
        user.full_name = update_in.full_name.strip()
    if update_in.phone is not None:
        user.phone = update_in.phone.strip()

    # Synchronize linked member profile if present
    if user.member_profile:
        if update_in.full_name is not None:
            user.member_profile.full_name = user.full_name
        if update_in.phone is not None:
            user.member_profile.phone = user.phone

    db.commit()
    db.refresh(user)
    return user
