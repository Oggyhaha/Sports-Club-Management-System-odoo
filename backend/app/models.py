"""
Aggregates all database models for clean central importing by Alembic and tests.
"""
from app.core.database import Base
from app.modules.auth.models import Role, UserRole, User, RoleEnum, Invitation
from app.modules.members.models import MembershipPlan, Member, MemberSubscription
from app.modules.courts.models import Court
from app.modules.bookings.models import Booking, SocialPlaySession, SocialPlayParticipant
from app.modules.shop.models import (
    ProductCategory,
    Product,
    Order,
    OrderItem,
    InventoryMovement,
    OrderStatusHistory,
)

__all__ = [
    "Base",
    "Role",
    "RoleEnum",
    "UserRole",
    "User",
    "Invitation",
    "MembershipPlan",
    "Member",
    "MemberSubscription",
    "Court",
    "Booking",
    "SocialPlaySession",
    "SocialPlayParticipant",
    "ProductCategory",
    "Product",
    "Order",
    "OrderItem",
    "InventoryMovement",
    "OrderStatusHistory",
]
