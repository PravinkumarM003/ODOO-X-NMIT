from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.api.routes import (
    auth,
    yarn,
    orders,
    production,
    rolls,
    dispatch,
    finance,
    people,
    buyers_suppliers,
    overview,
    notifications,
    buyer_portal,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Textile Operations Platform API - Production backend serving Everest Textile Mills",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global ValueError handler -> 400 Bad Request
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/health",
    }


# Include all API v1 routes
API_PREFIX = settings.API_V1_STR

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(yarn.router, prefix=API_PREFIX)
app.include_router(orders.router, prefix=API_PREFIX)
app.include_router(production.router, prefix=API_PREFIX)
app.include_router(rolls.router, prefix=API_PREFIX)
app.include_router(dispatch.router, prefix=API_PREFIX)
app.include_router(finance.router, prefix=API_PREFIX)
app.include_router(people.router, prefix=API_PREFIX)
app.include_router(buyers_suppliers.router, prefix=API_PREFIX)
app.include_router(overview.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(buyer_portal.router, prefix=API_PREFIX)
