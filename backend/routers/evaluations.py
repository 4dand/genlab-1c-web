"""
Evaluations Router — CRUD для SMOP-оценок экспертов (PostgreSQL)

GET  /api/v1/evaluations                          — список оценок
GET  /api/v1/evaluations/{experiment_id}           — оценки эксперимента
POST /api/v1/evaluations/batch                     — установить все SMOP разом
GET  /api/v1/evaluations/{experiment_id}/progress   — прогресс оценки
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_parser
from backend.database.engine import get_db
from backend.database.models import Evaluation as EvaluationModel, User
from backend.database.schemas import EvaluationProgress
from backend.auth.dependencies import get_current_user

router = APIRouter()


# ── Request / Response schemas ──

class SetAllScoresRequest(BaseModel):
    """Установка всех оценок SMOP для прогона"""
    experiment_id: str
    task_id: str
    model_id: str
    run_index: int = Field(ge=0)
    scores: dict[str, int]  # {"S": 10, "M": 8, "O": 6, "P": 10}
    comment: str = ""


# ── Endpoints ──

@router.get("/evaluations")
async def list_evaluations(
    experiment_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Список оценок (с фильтром по эксперименту)."""
    stmt = select(EvaluationModel)
    if experiment_id:
        stmt = stmt.where(EvaluationModel.experiment_id == experiment_id)
    stmt = stmt.order_by(EvaluationModel.created_at.desc())

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "experiment_id": r.experiment_id,
            "task_id": r.task_id,
            "model_id": r.model_id,
            "run_index": r.run_index,
            "evaluator_id": r.evaluator_id,
            "scores": {"S": r.s_score, "M": r.m_score, "O": r.o_score, "P": r.p_score},
            "q_score": r.q_score,
            "comment": r.comment,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.get("/evaluations/{experiment_id}")
async def get_evaluation(
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Оценки эксперимента для текущего эксперта.
    Возвращает структуру, совместимую с фронтендом (tasks → runs → scores).
    """
    # Загружаем raw experiment для получения полной структуры
    parser = get_parser()
    experiment_result = parser.load_experiment(experiment_id)
    if experiment_result is None:
        raise HTTPException(status_code=404, detail=f"Эксперимент '{experiment_id}' не найден")

    # Загружаем оценки текущего пользователя из БД
    result = await db.execute(
        select(EvaluationModel).where(
            EvaluationModel.experiment_id == experiment_id,
            EvaluationModel.evaluator_id == user.id,
        )
    )
    db_evals = {
        (e.task_id, e.model_id, e.run_index): e
        for e in result.scalars().all()
    }

    # Собираем структуру для фронта
    tasks = []
    for tr in experiment_result.task_results:
        runs = []
        for run in tr.runs:
            db_eval = db_evals.get((tr.task_id, tr.model_id, run.run_index))
            scores = None
            comment = ""
            evaluated_at = None
            if db_eval and db_eval.s_score is not None:
                scores = {
                    "S": db_eval.s_score,
                    "M": db_eval.m_score,
                    "O": db_eval.o_score,
                    "P": db_eval.p_score,
                    "Q": db_eval.q_score or 0,
                }
                comment = db_eval.comment or ""
                evaluated_at = db_eval.updated_at.isoformat() if db_eval.updated_at else None

            runs.append({
                "run_index": run.run_index,
                "response_hash": run.response_hash,
                "scores": scores,
                "comment": comment,
                "evaluated_at": evaluated_at,
            })

        tasks.append({
            "task_id": tr.task_id,
            "model_id": tr.model_id,
            "model_name": getattr(tr, "model_name", tr.model_id),
            "runs": runs,
            "average_scores": None,
        })

    return {
        "experiment_id": experiment_id,
        "evaluator_id": user.id,
        "tasks": tasks,
        "status": "in_progress",
    }


@router.get("/evaluations/{experiment_id}/progress", response_model=EvaluationProgress)
async def get_evaluation_progress(
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Прогресс оценки для текущего эксперта."""
    # Считаем общее количество прогонов из raw_results
    parser = get_parser()
    experiment_result = parser.load_experiment(experiment_id)
    if experiment_result is None:
        return {"total_runs": 0, "evaluated_runs": 0, "progress_percent": 0.0, "status": "not_started"}

    total_runs = sum(len(tr.runs) for tr in experiment_result.task_results)

    # Считаем оценённые
    result = await db.execute(
        select(func.count(EvaluationModel.id)).where(
            EvaluationModel.experiment_id == experiment_id,
            EvaluationModel.evaluator_id == user.id,
            EvaluationModel.s_score.isnot(None),
        )
    )
    evaluated_runs = result.scalar() or 0

    progress = (evaluated_runs / total_runs * 100) if total_runs > 0 else 0
    status = "not_started" if evaluated_runs == 0 else ("completed" if evaluated_runs >= total_runs else "in_progress")

    return {
        "total_runs": total_runs,
        "evaluated_runs": evaluated_runs,
        "progress_percent": round(progress, 1),
        "status": status,
    }


@router.post("/evaluations/batch")
async def set_all_scores(
    req: SetAllScoresRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Установить все SMOP-оценки для прогона за один запрос.
    Upsert: создаёт или обновляет запись.
    """
    s = req.scores.get("S")
    m = req.scores.get("M")
    o = req.scores.get("O")
    p = req.scores.get("P")
    q = (s + m + o + p) / 4 if all(v is not None for v in [s, m, o, p]) else None

    # Ищем существующую запись
    result = await db.execute(
        select(EvaluationModel).where(
            EvaluationModel.experiment_id == req.experiment_id,
            EvaluationModel.task_id == req.task_id,
            EvaluationModel.model_id == req.model_id,
            EvaluationModel.run_index == req.run_index,
            EvaluationModel.evaluator_id == user.id,
        )
    )
    evaluation = result.scalar_one_or_none()

    if evaluation:
        evaluation.s_score = s
        evaluation.m_score = m
        evaluation.o_score = o
        evaluation.p_score = p
        evaluation.q_score = q
        evaluation.comment = req.comment
    else:
        evaluation = EvaluationModel(
            experiment_id=req.experiment_id,
            task_id=req.task_id,
            model_id=req.model_id,
            run_index=req.run_index,
            evaluator_id=user.id,
            s_score=s,
            m_score=m,
            o_score=o,
            p_score=p,
            q_score=q,
            comment=req.comment,
        )
        db.add(evaluation)

    await db.commit()

    # Возвращаем обновлённый прогресс
    progress = await get_evaluation_progress(req.experiment_id, db, user)
    return {"success": True, "progress": progress}
