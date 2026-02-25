"""
FastAPI сервер для SMOP Expert Platform

Тонкий REST-слой поверх существующих Python-модулей:
- core/src/evaluator/ → оценки SMOP, статистика, отчёты
- core/src/clients/   → генерация через OpenRouter
- core/src/config/    → конфигурация (models, tasks, settings)
- core/src/schemas/   → Pydantic-модели

Запуск:
    python run.py
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select

from backend.config import WEB_ROOT, CORE_ROOT, CORS_ORIGINS
from routers import config, experiments, evaluations, generate, reports
from routers import auth as auth_router

logger = logging.getLogger(__name__)


async def _ensure_admin():
    """Create initial admin user from env vars if not exists."""
    from backend.database.engine import async_session
    from backend.database.models import User
    from backend.auth.security import hash_password

    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin")

    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none() is None:
            admin = User(
                username=username,
                password_hash=hash_password(password),
                role="admin",
                full_name="Администратор",
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Создан начальный администратор: {username}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown"""
    logger.info("🚀 SMOP Expert Platform API запускается...")
    logger.info(f"   Web root: {WEB_ROOT}")
    logger.info(f"   Core root: {CORE_ROOT}")

    # Apply migrations + seed admin
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command

    alembic_cfg = AlembicConfig(str(WEB_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(WEB_ROOT / "backend" / "migrations"))
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://genlab:genlab@localhost:5432/genlab")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    # alembic env.py drives an async engine via asyncio.run(); run it in a worker
    # thread so it gets its own loop instead of clashing with the running one here.
    await asyncio.to_thread(alembic_command.upgrade, alembic_cfg, "head")
    logger.info("   Миграции применены")

    await _ensure_admin()

    yield
    logger.info("SMOP API остановлен.")


app = FastAPI(
    title="SMOP Expert Platform API",
    description="REST API для оценки качества AI-генерированного кода 1С:Предприятие",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Роутеры ──
app.include_router(auth_router.router,   prefix="/api/v1", tags=["Auth"])
app.include_router(config.router,        prefix="/api/v1", tags=["Config"])
app.include_router(experiments.router,   prefix="/api/v1", tags=["Experiments"])
app.include_router(evaluations.router,   prefix="/api/v1", tags=["Evaluations"])
app.include_router(generate.router,      prefix="/api/v1", tags=["Generate"])
app.include_router(reports.router,       prefix="/api/v1", tags=["Reports"])


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# ── Static files (production mode: serve built frontend) ──
_dist_dir = WEB_ROOT / "frontend" / "dist"
if _dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist_dir / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(request: Request, full_path: str):
        """SPA fallback — serve index.html for non-API routes."""
        file_path = _dist_dir / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_dist_dir / "index.html"))
