"""
Generate Router — свободная генерация кода (Playground)

POST /api/v1/generate       — генерация кода через OpenRouter API
GET  /api/v1/balance        — баланс OpenRouter
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from src.config.settings import get_settings
from src.clients.openrouter import OpenRouterClient
from src.schemas.messages import ChatMessage
from backend.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    """Запрос на генерацию кода"""
    model_id: str = Field(..., description="ID модели OpenRouter (напр. google/gemini-3-flash-preview)")
    prompt: str = Field(..., min_length=1, description="Текст задания")
    system_prompt: str = Field(
        default=(
            "Ты — эксперт по разработке на платформе 1С:Предприятие 8.3. "
            "Генерируй только код на встроенном языке 1С. "
            "Используй русскоязычный синтаксис. "
            "Код должен быть готов к выполнению без дополнительных модификаций."
        ),
        description="Системный промпт",
    )
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=256, le=32768)
    seed: Optional[int] = None


class GenerateResponse(BaseModel):
    """Ответ генерации"""
    response: str
    response_hash: str
    model_id: str
    tokens_input: int
    tokens_output: int
    cost_total: float
    elapsed_time: float


def _get_client() -> OpenRouterClient:
    settings = get_settings()
    return OpenRouterClient.from_settings(settings)


@router.post("/generate", response_model=GenerateResponse)
async def generate_code(req: GenerateRequest, _user=Depends(get_current_user)):
    """
    Генерация кода 1С через OpenRouter.
    Используется страницей Playground для свободной генерации.
    """
    try:
        client = _get_client()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка инициализации клиента: {e}")

    messages = [
        ChatMessage.system(req.system_prompt),
        ChatMessage.user(req.prompt),
    ]

    try:
        result = client.chat_completion(
            model=req.model_id,
            messages=messages,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            seed=req.seed,
        )
    except Exception as e:
        logger.error(f"Ошибка генерации: {e}")
        raise HTTPException(status_code=502, detail=f"Ошибка запроса к OpenRouter: {e}")

    return GenerateResponse(
        response=result.content,
        response_hash=result.response_hash if hasattr(result, 'response_hash') else "",
        model_id=req.model_id,
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
        cost_total=result.cost_total,
        elapsed_time=result.elapsed_time,
    )


@router.get("/balance")
async def get_balance():
    """Баланс аккаунта OpenRouter"""
    try:
        client = _get_client()
    except ValueError:
        return {"error": "API ключ не настроен", "balance": None}

    try:
        # OpenRouter не имеет стандартного эндпоинта баланса в v1,
        # но можно вызвать /auth/key
        import requests
        resp = requests.get(
            f"{client.base_url}/auth/key",
            headers=client.headers,
            timeout=10,
        )
        if resp.ok:
            data = resp.json().get("data", {})
            return {
                "balance": data.get("limit", 0) - data.get("usage", 0),
                "limit": data.get("limit"),
                "usage": data.get("usage"),
                "label": data.get("label", ""),
            }
        return {"error": f"HTTP {resp.status_code}", "balance": None}
    except Exception as e:
        return {"error": str(e), "balance": None}
