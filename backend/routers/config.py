"""
Config Router — модели, задачи, настройки, SMOP-критерии

GET /api/v1/models          — список моделей из models.yaml
GET /api/v1/tasks           — задачи (с фильтром ?category=A|B)
GET /api/v1/settings        — текущие настройки
GET /api/v1/smop-criteria   — критерии оценки SMOP
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from src.utils.file_ops import load_yaml
from src.config.settings import get_settings
from backend.config import CORE_ROOT

router = APIRouter()


@router.get("/models")
async def get_models():
    """Список моделей из configs/models.yaml"""
    settings = get_settings()
    data = load_yaml(CORE_ROOT / settings.paths.get_models_path())
    models_raw = data.get("models", {})

    result = []
    for key, model in models_raw.items():
        result.append({
            "key": key,
            "id": model["id"],
            "name": model["name"],
            "meta": model.get("meta", {}),
            "generation": model.get("generation", {}),
        })
    return result


@router.get("/tasks")
async def get_tasks(category: Optional[str] = Query(None, pattern="^[ABab]$")):
    """Список задач. ?category=A или B"""
    settings = get_settings()
    categories = []

    if category:
        categories = [category.upper()]
    else:
        categories = ["A", "B"]

    tasks = []
    for cat in categories:
        path = CORE_ROOT / settings.paths.get_tasks_path(cat)
        if not path.exists():
            continue
        data = load_yaml(path)
        # tasks_category_A.yaml имеет структуру: { category: ..., tasks: [...] }
        cat_info = data.get("category", {})
        for t in data.get("tasks", []):
            tasks.append({
                "id": t["id"],
                "name": t["name"],
                "difficulty": t.get("difficulty", "medium"),
                "prompt": t["prompt"],
                "category": cat,
                "category_name": cat_info.get("name", f"Категория {cat}"),
                "expected_objects": t.get("expected_objects", []),
            })

    return tasks


@router.get("/settings")
async def get_current_settings():
    """Текущие настройки (без API-ключа!)"""
    settings = get_settings()
    data = settings.model_dump()
    # Убираем секреты
    if "openrouter" in data:
        data["openrouter"]["api_key"] = "***" if settings.openrouter.api_key else None
    return data


@router.get("/smop-criteria")
async def get_smop_criteria():
    """Критерии оценки SMOP из smop_criteria.yaml"""
    settings = get_settings()
    path = CORE_ROOT / settings.paths.get_smop_criteria_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="smop_criteria.yaml not found")
    return load_yaml(path)
