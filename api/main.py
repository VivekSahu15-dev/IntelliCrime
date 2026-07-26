"""
IntelliCrime — Phase 2 | FastAPI Application
Entry point. Run with:
    uvicorn api.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routes import router
from .ml_routes import ml_router
from .upload_routes import upload_router

app = FastAPI(
    title="IntelliCrime API",
    description=(
        "Karnataka State Police Crime Intelligence Platform — "
        "REST API serving real NCRB 2024 data for the IntelliCrime dashboard."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — allow the React frontend (Phase 3) to call this API ────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to frontend URL in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Mount all routes under /api ───────────────────────────────────────────────
app.include_router(router,    prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


# ── Root redirect to docs ─────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    return JSONResponse({
        "project": "IntelliCrime",
        "description": "Karnataka Crime Intelligence & Analytical Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "api_base": "/api",
        "endpoints": [
            "/api/health",
            "/api/karnataka/overview",
            "/api/districts",
            "/api/districts/risk-scores",
            "/api/districts/{district_name}",
            "/api/crimes/ipc/all-states",
            "/api/crimes/ipc/karnataka",
            "/api/crimes/trends",
            "/api/crimes/murder/victims",
            "/api/crimes/murder/victims/gender-split",
            "/api/crimes/rape/victims",
            "/api/crimes/rape/victims/age-breakdown",
            "/api/compare/national",
            "/api/compare/top-states",
            "/api/analytics/division-summary",
            "/api/analytics/socioeconomic-correlation",
        ]
    })