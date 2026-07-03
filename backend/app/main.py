from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import engine, Base

# Import models to ensure they are registered for auto-creation
from backend.app.models import hierarchy  # noqa

# Import routers from our business domain modules
from backend.app.modules.hierarchy.router import router as hierarchy_router
from backend.app.modules.alerts.router import router as alerts_router
from backend.app.modules.dashboard.router import router as dashboard_router
from backend.app.modules.rootcause.router import router as rootcause_router
from backend.app.modules.advisories.router import router as advisories_router
from backend.app.modules.reports.router import router as reports_router
from backend.app.modules.admin.router import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up CORS middleware to support local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup (useful if migration has not run yet)
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database tables could not be initialized on startup: {e}")

# Register modular routes under settings.API_V1_STR
api_router_prefix = settings.API_V1_STR

app.include_router(hierarchy_router, prefix=api_router_prefix)
app.include_router(alerts_router, prefix=api_router_prefix)
app.include_router(dashboard_router, prefix=api_router_prefix)
app.include_router(rootcause_router, prefix=api_router_prefix)
app.include_router(advisories_router, prefix=api_router_prefix)
app.include_router(reports_router, prefix=api_router_prefix)
app.include_router(admin_router, prefix=api_router_prefix)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Manufacturing Intelligence Platform API",
        "docs": "/docs",
        "status": "healthy"
    }
