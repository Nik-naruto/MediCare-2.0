"""MediCare 2.0 Backend - FastAPI Main Application Entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

is_production = settings.ENVIRONMENT.strip().lower() == "production"

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)


# CORS Middleware (Environment-driven configuration)
cors_origins = [str(origin).strip() for origin in settings.BACKEND_CORS_ORIGINS if origin and str(origin).strip()]
if "*" in cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Ensure uploads directory structure exists
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
doctors_upload_path = upload_path / "doctors"
doctors_upload_path.mkdir(parents=True, exist_ok=True)

# Mount static file directory for upload assets
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

from app.db.seed_demo_data import seed_demo_dataset


@app.on_event("startup")
def on_startup():
    """Ensure demo dataset is populated into database on application startup."""
    try:
        seed_demo_dataset()
    except Exception as e:
        print(f"Startup seeding notice: {e}")


# Include API v1 Master Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint returning basic application status information."""
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint for service monitoring."""
    return {
        "status": "healthy",
    }


@app.get("/seed-demo-data", tags=["Seeding"])
@app.post("/seed-demo-data", tags=["Seeding"])
def seed_endpoint():
    """Trigger demo dataset seeding into active database."""
    try:
        seed_demo_dataset()
        return {
            "status": "success",
            "message": "Demo dataset seeded successfully.",
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e),
        }

