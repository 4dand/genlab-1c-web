"""
Centralized configuration for the web platform.

Single source of truth for paths, auth settings, and shared factories.
All routers and modules import from here instead of computing their own values.
"""

import os
from enum import Enum
from pathlib import Path

from src.evaluator.parser import ExperimentParser
from src.evaluator.smop import SMOPEvaluator
from src.config.settings import get_settings

# ── Paths ──

WEB_ROOT = Path(__file__).resolve().parent.parent
CORE_ROOT = WEB_ROOT / "core"

# ── Auth settings ──

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "change-me-to-random-string":
    raise RuntimeError(
        "SECRET_KEY environment variable is required. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# ── CORS ──

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

# ── Experiment status enum ──


class ExperimentStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Shared factories ──


def get_parser() -> ExperimentParser:
    """Create an ExperimentParser pointing to core's raw_results."""
    settings = get_settings()
    return ExperimentParser(str(CORE_ROOT / settings.paths.raw_results_dir))


def get_evaluator() -> SMOPEvaluator:
    """Create an SMOPEvaluator pointing to core's evaluations + criteria."""
    settings = get_settings()
    return SMOPEvaluator(
        evaluations_dir=str(CORE_ROOT / settings.paths.evaluations_dir),
        criteria_path=str(CORE_ROOT / settings.paths.get_smop_criteria_path()),
    )


def get_reports_dir() -> Path:
    """Path to core's reports directory."""
    return CORE_ROOT / get_settings().paths.reports_dir
