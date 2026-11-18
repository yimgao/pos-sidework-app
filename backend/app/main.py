"""入口：启动时建表 + 种子数据。运行：cd backend && uvicorn app.main:app --reload --port 8000"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import (accounts_router, ai_router, auth_router, dashboard_router,
                      employees_router, report_router, review_router, roles_router,
                      schedule_router, settings_router, sidework_router)
from .seed import seed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(BASE_DIR, "uploads"), exist_ok=True)

app = FastAPI(title="排班 + Sidework")
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_origins += ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=list(dict.fromkeys(_origins)),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=os.path.join(BASE_DIR, "uploads")), name="uploads")


@app.on_event("startup")
def startup():
    seed()


app.include_router(accounts_router.router)
app.include_router(ai_router.router)
app.include_router(dashboard_router.router)
app.include_router(roles_router.router)
app.include_router(settings_router.router)
app.include_router(auth_router.router)
app.include_router(employees_router.router)
app.include_router(schedule_router.router)
app.include_router(sidework_router.router)
app.include_router(review_router.router)
app.include_router(report_router.router)


@app.get("/api/health")
def health():
    return {"ok": True}
