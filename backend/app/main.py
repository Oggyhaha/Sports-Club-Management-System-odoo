from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.modules.auth.routes import router as auth_router
from app.modules.members.routes import router as members_router
from app.modules.courts.routes import router as courts_router
from app.modules.bookings.routes import router as bookings_router
from app.modules.shop.routes import router as shop_router
from app.modules.cafeteria.routes import router as cafeteria_router
from app.modules.finance.routes import (
    business_clients_router,
    invoices_router,
    payments_router,
    receipts_router,
    allocations_router,
)

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Champions Club Sports Club Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS (Cross-Origin Resource Sharing)
# Allows our Vite React frontend (running on port 5173) to communicate with FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(members_router, prefix=settings.API_V1_PREFIX)
app.include_router(courts_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(shop_router, prefix=settings.API_V1_PREFIX)
app.include_router(cafeteria_router, prefix=settings.API_V1_PREFIX)
app.include_router(business_clients_router, prefix=settings.API_V1_PREFIX)
app.include_router(invoices_router, prefix=settings.API_V1_PREFIX)
app.include_router(payments_router, prefix=settings.API_V1_PREFIX)
app.include_router(receipts_router, prefix=settings.API_V1_PREFIX)
app.include_router(allocations_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
def read_root():
    """
    Root endpoint: provides a quick welcome message and directs callers to documentation.
    """
    return {
        "message": "Welcome to Champions Club Sports Club Management System API",
        "docs_url": "/docs",
        "health_check": "/api/v1/health",
    }


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    """
    Health check endpoint: used by monitoring tools and developers to verify
    that the FastAPI web server is running and responsive.
    """
    return {
        "status": "healthy",
        "service": "champions-club-api",
        "version": "1.0.0",
    }
