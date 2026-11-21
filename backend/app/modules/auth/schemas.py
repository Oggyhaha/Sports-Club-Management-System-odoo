"""
Pydantic schemas for Authentication, Registration, and Staff Invitations.
"""
from datetime import date, datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegisterRequest(BaseModel):
    """
    Public registration payload.
    Strictly forces role to 'member'. Does not accept any role input.
    """
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$", description="User email address")
    password: str = Field(..., min_length=8, description="Plaintext password (8-72 UTF-8 bytes)")
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name")
    phone: Optional[str] = Field(None, max_length=20, description="Contact phone number")

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password exceeds bcrypt maximum length limit of 72 bytes.")
        return v

    model_config = ConfigDict(extra="ignore")


class UserLoginRequest(BaseModel):
    """
    JSON credentials payload for login.
    """
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")


class UserProfileUpdateRequest(BaseModel):
    """
    Self-service profile update payload for authenticated users.
    """
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class MemberSummary(BaseModel):
    """
    Embedded summary of linked club member profile.
    """
    id: uuid.UUID
    plan_name: str
    start_date: date
    expiry_date: date
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """
    Public serialization of user profile.
    Never exposes password hashes.
    """
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    roles: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserMeResponse(UserResponse):
    """
    Extended user profile for /me endpoint including linked member profile.
    """
    member_profile: Optional[MemberSummary] = None


class TokenResponse(BaseModel):
    """
    JWT Access Token response contract.
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutes in seconds
    user: UserResponse


class StaffInviteRequest(BaseModel):
    """
    Payload for Owner to invite staff or business clients.
    Owner role is strictly prohibited in invitations.
    """
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    role: str = Field(..., description="Target role: receptionist, shop_staff, hr_staff, or business_client")

    @field_validator("role")
    @classmethod
    def validate_role_allowlist(cls, v: str) -> str:
        allowed = {"receptionist", "shop_staff", "hr_staff", "business_client"}
        normalized = v.strip().lower()
        if normalized not in allowed:
            raise ValueError(
                f"Role '{v}' is not permitted for staff invitation. Allowed roles: {', '.join(sorted(allowed))}"
            )
        return normalized


class StaffInviteResponse(BaseModel):
    """
    Returned to Owner upon issuing an invitation.
    Contains single-use raw token to be shared with the invitee.
    """
    id: uuid.UUID
    email: str
    role: str
    expires_at: datetime
    raw_token: str
    invite_url: str


class StaffAcceptInviteRequest(BaseModel):
    """
    Payload submitted by an invited staff member to set password and create account.
    """
    token: str = Field(..., description="Single-use raw invitation token")
    password: str = Field(..., min_length=8, description="Chosen password (8-72 UTF-8 bytes)")
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password exceeds bcrypt maximum length limit of 72 bytes.")
        return v
