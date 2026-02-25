"""
Experiments Router — работа с результатами экспериментов

GET  /api/v1/experiments              — список экспериментов из raw_results/
GET  /api/v1/experiments/running      — статус текущего эксперимента
GET  /api/v1/experiments/{id}         — полные данные одного эксперимента
POST /api/v1/experiments/run          — запустить эксперимент категории A/B
POST /api/v1/experiments/run-custom   — запустить кастомный эксперимент
"""

import asyncio
import logging
from typing import Optional, List
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.config.settings import get_settings
from backend.config import CORE_ROOT, get_parser, ExperimentStatus
from backend.auth.dependencies import require_admin

logger = logging.getLogger(__name__)
router = APIRouter()


# ==========================================================================
# Pydantic-модели запросов / ответов
# ==========================================================================

class ExperimentRunRequest(BaseModel):
    """Запрос на запуск эксперимента"""
    category: str = Field(..., pattern=r"^[ABab]$", description="Категория задач: A или B")
    model_keys: Optional[List[str]] = Field(
        default=None,
        description="Ключи моделей (claude, gpt, gemini). Если null — все модели."
    )
    task_ids: Optional[List[str]] = Field(
        default=None,
        description="ID задач (A1, A2...). Если null — все задачи категории."
    )


class CustomTaskInput(BaseModel):
    """Одна кастомная задача"""
    name: str = Field(..., min_length=1, description="Название задачи")
    prompt: str = Field(..., min_length=1, description="Промпт задачи")
    difficulty: str = Field(default="medium", pattern=r"^(easy|medium|hard)$")


class CustomExperimentRunRequest(BaseModel):
    """Запрос на запуск кастомного эксперимента"""
    model_keys: Optional[List[str]] = Field(
        default=None,
        description="Ключи моделей. Если null — все модели."
    )
    tasks: List[CustomTaskInput] = Field(
        ..., min_length=1,
        description="Список кастомных задач"
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Системный промпт. Если null — дефолтный для 1С."
    )
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=256, le=32768)
    runs: int = Field(default=3, ge=1, le=10, description="Прогонов на задачу")


class ExperimentRunStatus(BaseModel):
    """Статус выполнения эксперимента"""
    status: str  # idle | running | completed | failed
    experiment_name: Optional[str] = None
    category: Optional[str] = None
    models: List[str] = Field(default_factory=list)
    tasks_total: int = 0
    tasks_completed: int = 0
    current_task: Optional[str] = None
    current_model: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    # Итоги (после завершения)
    total_tokens: int = 0
    total_cost: float = 0.0
    total_time: float = 0.0
    result_path: Optional[str] = None


# Глобальное состояние (один эксперимент одновременно)
_run_status = ExperimentRunStatus(status=ExperimentStatus.IDLE)
_run_lock = asyncio.Lock()


# ==========================================================================
# Чтение экспериментов
# ==========================================================================


@router.get("/experiments")
async def list_experiments():
    """Список всех экспериментов из raw_results/"""
    parser = get_parser()
    return parser.list_experiments()


@router.get("/experiments/running")
async def get_running_status():
    """Статус текущего/последнего эксперимента"""
    return _run_status.model_dump()


@router.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """
    Полные данные эксперимента (все task_results с runs).
    Используется для страницы Оценки и Статистики.
    """
    parser = get_parser()
    result = parser.load_experiment(experiment_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Эксперимент '{experiment_id}' не найден")
    return result.model_dump()


# ==========================================================================
# Запуск нового эксперимента (категория A / B)
# ==========================================================================


@router.post("/experiments/run")
async def run_experiment(req: ExperimentRunRequest, _admin=Depends(require_admin)):
    """
    Запустить эксперимент в фоне.
    Только один эксперимент может выполняться одновременно.
    """
    global _run_status

    if _run_status.status == ExperimentStatus.RUNNING:
        raise HTTPException(
            status_code=409,
            detail="Эксперимент уже выполняется. Дождитесь завершения."
        )

    # Сбрасываем статус
    _run_status = ExperimentRunStatus(
        status=ExperimentStatus.RUNNING,
        category=req.category.upper(),
        started_at=datetime.now().isoformat(),
    )

    # Запускаем в фоне
    asyncio.create_task(_execute_experiment(req))

    return {
        "message": "Эксперимент запущен",
        "category": req.category.upper(),
        "model_keys": req.model_keys,
        "task_ids": req.task_ids,
    }


async def _execute_experiment(req: ExperimentRunRequest) -> None:
    """Фоновое выполнение эксперимента"""
    global _run_status

    try:
        from src.core.benchmark import BenchmarkRunner

        runner = BenchmarkRunner(
            config_dir=str(CORE_ROOT / "configs"),
            results_dir=str(CORE_ROOT / get_settings().paths.raw_results_dir),
        )

        category = req.category.upper()

        # Инициализируем MCP для категории B
        if category == "B":
            connected = await runner.init_mcp(use_mock=True)
            if not connected:
                _run_status.status = ExperimentStatus.FAILED
                _run_status.error = "Не удалось подключиться к MCP серверу"
                return

        _run_status.models = req.model_keys or ["claude", "gpt", "gemini"]
        _run_status.tasks_total = len(req.task_ids) if req.task_ids else 0

        # Запускаем (синхронная часть в thread, async-часть через await)
        result = await runner.run_experiment(
            category=category,
            model_keys=req.model_keys,
            task_ids=req.task_ids,
        )

        # Закрываем MCP
        if category == "B":
            await runner.close_mcp()

        _run_status.status = ExperimentStatus.COMPLETED
        _run_status.completed_at = datetime.now().isoformat()
        _run_status.experiment_name = result.experiment_name
        _run_status.tasks_completed = len(result.task_results)
        _run_status.tasks_total = len(result.task_results)
        _run_status.total_tokens = result.total_tokens
        _run_status.total_cost = result.total_cost
        _run_status.total_time = result.total_time
        _run_status.result_path = result.experiment_name

        logger.info(f"Эксперимент '{result.experiment_name}' завершён успешно")

    except Exception as e:
        logger.error(f"Ошибка эксперимента: {e}", exc_info=True)
        _run_status.status = ExperimentStatus.FAILED
        _run_status.error = str(e)
        _run_status.completed_at = datetime.now().isoformat()


# ==========================================================================
# Запуск кастомного эксперимента
# ==========================================================================


@router.post("/experiments/run-custom")
async def run_custom_experiment(req: CustomExperimentRunRequest):
    """
    Запустить кастомный эксперимент с произвольными задачами.
    Задачи передаются прямо в запросе (не из YAML-конфигов).
    Только один эксперимент может выполняться одновременно.
    """
    global _run_status

    if _run_status.status == ExperimentStatus.RUNNING:
        raise HTTPException(
            status_code=409,
            detail="Эксперимент уже выполняется. Дождитесь завершения."
        )

    # Сбрасываем статус
    _run_status = ExperimentRunStatus(
        status=ExperimentStatus.RUNNING,
        category="C",
        started_at=datetime.now().isoformat(),
        tasks_total=len(req.tasks),
    )

    # Запускаем в фоне
    asyncio.create_task(_execute_custom_experiment(req))

    return {
        "message": "Кастомный эксперимент запущен",
        "category": "C",
        "model_keys": req.model_keys,
        "tasks_count": len(req.tasks),
    }


async def _execute_custom_experiment(req: CustomExperimentRunRequest) -> None:
    """Фоновое выполнение кастомного эксперимента"""
    global _run_status

    try:
        from src.core.benchmark import BenchmarkRunner

        runner = BenchmarkRunner(
            config_dir=str(CORE_ROOT / "configs"),
            results_dir=str(CORE_ROOT / get_settings().paths.raw_results_dir),
        )

        _run_status.models = req.model_keys or ["claude", "gpt", "gemini"]

        # Преобразуем задачи в список словарей
        tasks_data = [
            {
                "name": t.name,
                "prompt": t.prompt,
                "difficulty": t.difficulty,
            }
            for t in req.tasks
        ]

        result = await runner.run_custom_experiment(
            tasks=tasks_data,
            model_keys=req.model_keys,
            system_prompt=req.system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            runs_per_task=req.runs,
        )

        _run_status.status = ExperimentStatus.COMPLETED
        _run_status.completed_at = datetime.now().isoformat()
        _run_status.experiment_name = result.experiment_name
        _run_status.tasks_completed = len(result.task_results)
        _run_status.tasks_total = len(result.task_results)
        _run_status.total_tokens = result.total_tokens
        _run_status.total_cost = result.total_cost
        _run_status.total_time = result.total_time
        _run_status.result_path = result.experiment_name

        logger.info(f"Кастомный эксперимент '{result.experiment_name}' завершён успешно")

    except Exception as e:
        logger.error(f"Ошибка кастомного эксперимента: {e}", exc_info=True)
        _run_status.status = ExperimentStatus.FAILED
        _run_status.error = str(e)
        _run_status.completed_at = datetime.now().isoformat()
