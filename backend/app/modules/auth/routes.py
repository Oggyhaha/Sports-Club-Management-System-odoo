"""
FastAPI routing for Authentication, Profile Management, and Staff Invitations.
"""
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.jwt import create_access_token
from app.models import RoleEnum, User
from app.modules.auth.schemas import (
    MemberSummary,
    StaffAcceptInviteRequest,
    StaffInviteRequest,
    StaffInviteResponse,
    TokenResponse,
    UserLoginRequest,
    UserMeResponse,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.modules.auth.service import (
    accept_staff_invitation,
    authenticate_user,
    create_staff_invitation,
    register_member,
    update_user_profile,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _serialize_user_response(user: User) -> UserResponse:
    """Helper to serialize User ORM to UserResponse schema."""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        is_active=user.is_active,
        roles=[r.name for r in user.roles],
        created_at=user.created_at,
    )


def _serialize_user_me_response(user: User) -> UserMeResponse:
    """Helper to serialize User with optional linked Member profile."""
    member_summary = None
    if user.member_profile:
        mp = user.member_profile
        member_summary = MemberSummary(
            id=mp.id,
            plan_name=mp.plan.name if mp.plan else "Unknown",
            start_date=mp.start_date,
            expiry_date=mp.expiry_date,
            is_active=mp.is_active,
        )

    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        is_active=user.is_active,
        roles=[r.name for r in user.roles],
        created_at=user.created_at,
        member_profile=member_summary,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new public member account",
)
def register(
    reg_in: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Public registration endpoint.
    - Always assigns the 'member' role.
    - Does not accept privileged role selection.
    - Does not create a purchased membership plan.
    """
    user = register_member(db, reg_in)
    return _serialize_user_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and receive a JWT access token",
)
async def login(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticates user credentials and issues a 30-minute JWT token.
    Compatible with JSON payload ({"email": "...", "password": "..."})
    and OAuth2 form-data (username=...&password=...).
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
    else:
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required.",
        )

    user = authenticate_user(db, email, password)
    access_token = create_access_token(
        user_id=user.id,
        token_version=user.token_version,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_serialize_user_response(user),
    )


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Get current authenticated user profile and roles",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Returns current authenticated user details, assigned roles, and linked member profile.
    """
    return _serialize_user_me_response(current_user)


@router.put(
    "/me",
    response_model=UserMeResponse,
    summary="Self-service profile update for authenticated user",
)
def update_profile(
    update_in: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows authenticated users to update their own contact details (full_name, phone).
    """
    updated_user = update_user_profile(db, current_user, update_in)
    return _serialize_user_me_response(updated_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out and immediately revoke all active session tokens",
)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revokes the current user's session tokens by incrementing their database token_version.
    """
    current_user.token_version += 1
    db.commit()
    return {"message": "Successfully logged out. Session has been revoked."}


@router.post(
    "/staff/invite",
    response_model=StaffInviteResponse,
    summary="Invite a staff member or business client (Owner only)",
)
def invite_staff(
    invite_in: StaffInviteRequest,
    current_user: User = Depends(require_roles(RoleEnum.OWNER)),
    db: Session = Depends(get_db),
):
    """
    Administrative invitation endpoint.
    - Strictly protected: Owner role only.
    - Owner role cannot be granted via invitation.
    - Generates a single-use, 48-hour cryptographic invitation token.
    """
    invitation, raw_token = create_staff_invitation(
        db,
        invite_in,
        invited_by_user_id=current_user.id,
    )

    invite_url = f"/accept-invitation?token={raw_token}"

    return StaffInviteResponse(
        id=invitation.id,
        email=invitation.email,
        role=invite_in.role,
        expires_at=invitation.expires_at,
        raw_token=raw_token,
        invite_url=invite_url,
    )


@router.post(
    "/staff/accept",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Accept a staff invitation and create an account",
)
def accept_invite(
    accept_in: StaffAcceptInviteRequest,
    db: Session = Depends(get_db),
):
    """
    Public token-gated endpoint.
    Consumes the single-use invitation token, sets the password, and creates the staff user.
    """
    user = accept_staff_invitation(db, accept_in)
    return _serialize_user_response(user)
