"""
IntelliCrime — FastAPI Application
Serves both the API and the built React frontend from one process.

Local dev:
    uvicorn api.main:app --reload --port 8000
    (run frontend separately with: cd frontend && npm run dev)

Production (Catalyst AppSail):
    1. Build frontend first: cd frontend && npm run build
    2. uvicorn api.main:app --host 0.0.0.0 --port 8000
    The built React app is served from frontend/dist/
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from .routes import router
from .ml_routes import ml_router
from .upload_routes import upload_router

app = FastAPI(
    title="IntelliCrime API",
    description="Karnataka State Police Crime Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── API Routes ────────────────────────────────────────────────────────────────
app.include_router(router,        prefix="/api")
app.include_router(ml_router,     prefix="/api")
app.include_router(upload_router, prefix="/api")

# ── Serve built React frontend (production) ───────────────────────────────────
# In local dev this folder won't exist — that's fine, Vite dev server handles it.
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    # Catch-all: serve index.html for any non-API route
    # This makes React Router work on page refresh
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react(full_path: str):
        # Don't intercept /api routes (already handled above)
        index = DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse({"error": "Frontend not built"}, status_code=404)
else:
    @app.get("/", include_in_schema=False)
    def root():
        return JSONResponse({
            "project":  "IntelliCrime",
            "status":   "API running — frontend served separately in dev mode",
            "docs":     "/docs",
            "api_base": "/api",
        })