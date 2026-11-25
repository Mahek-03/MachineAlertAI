"""
MachineAlert AI - FastAPI Application Entrypoint.
Production-ready REST API with Swagger documentation, CORS support,
and automated database table provisioning.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .db import Base, SessionLocal, engine
from .models import Machine
from .ml_service import ml_service
from .routers import alerts, dashboard, maintenance, machines, predict, simulate


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: provision database schema, auto-seed if empty, and ensure ML artifacts are warm."""
    # Ensure all ORM tables are created
    Base.metadata.create_all(bind=engine)
    print(f"[{settings.PROJECT_NAME}] Database schema verified.")

    # Auto-seed if database is empty (Render free tier SQLite resets on cold restarts)
    db = SessionLocal()
    try:
        machine_count = db.query(Machine).count()
        if machine_count == 0:
            print(f"[{settings.PROJECT_NAME}] Database is empty. Running demo seed (10 machines with history)...")
            from .seed import seed_database
            seed_database()
            print(f"[{settings.PROJECT_NAME}] Database auto-seeded successfully.")
        else:
            print(f"[{settings.PROJECT_NAME}] Database already populated ({machine_count} machines). Skipping auto-seed.")
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] Note during auto-seed check: {e}")
    finally:
        db.close()

    yield
    print(f"[{settings.PROJECT_NAME}] Gracefully shutting down.")


app = FastAPI(
    title="MachineAlert AI – Predictive Maintenance System",
    description=(
        "Industrial Predictive Maintenance REST API powered by Machine Learning. "
        "Predicts machine failure probabilities from real-time multi-sensor telemetry, "
        "calculates Remaining Useful Life (RUL), diagnoses specific failure patterns (TWF, HDF, PWF, OSF), "
        "and coordinates technician maintenance alerts and Kanban workflows."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API Routers under /api/v1
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(predict.router, prefix=settings.API_V1_PREFIX)
app.include_router(machines.router, prefix=settings.API_V1_PREFIX)
app.include_router(alerts.router, prefix=settings.API_V1_PREFIX)
app.include_router(maintenance.router, prefix=settings.API_V1_PREFIX)
app.include_router(simulate.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
def root():
    """Welcome endpoint pointing to interactive Swagger documentation."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "Operational",
        "documentation": "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["Root"])
def root_health():
    """Root health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": ml_service.is_loaded,
    }
