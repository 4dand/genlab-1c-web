"""
Reports Router — отчёты и статистика

GET  /api/v1/reports                     — список отчётов
GET  /api/v1/reports/{experiment_id}     — JSON-отчёт
GET  /api/v1/reports/{experiment_id}/html — HTML-отчёт
GET  /api/v1/statistics/{experiment_id}  — статистика по эксперименту
GET  /api/v1/charts/{experiment_id}/{chart_type} — SVG-график
GET  /api/v1/charts/types                — список доступных типов графиков
POST /api/v1/reports/{experiment_id}/generate — генерация нового отчёта
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse, Response

from src.utils.file_ops import load_json
from src.evaluator.statistics import calculate_experiment_statistics
from src.evaluator.charts import (
    render_chart_svg,
    list_chart_types,
    check_matplotlib_available,
)
from backend.config import get_parser, get_evaluator, get_reports_dir

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/reports")
async def list_reports():
    """Список доступных отчётов"""
    reports_dir = get_reports_dir()
    if not reports_dir.exists():
        return []

    reports = []
    for json_file in sorted(reports_dir.glob("*_report.json")):
        try:
            data = load_json(json_file)
            reports.append({
                "experiment_id": data.get("experiment_id", json_file.stem),
                "generated_at": data.get("generated_at", ""),
                "path": str(json_file),
                "has_html": (reports_dir / json_file.name.replace("_report.json", "_report.html")).exists(),
                "has_latex": (reports_dir / json_file.name.replace("_report.json", "_tables.tex")).exists(),
            })
        except Exception as e:
            logger.warning(f"Ошибка чтения отчёта {json_file}: {e}")

    return reports


@router.get("/reports/{experiment_id}")
async def get_report_json(experiment_id: str):
    """JSON-отчёт с метриками"""
    path = get_reports_dir() / f"{experiment_id}_report.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Отчёт не найден")
    return load_json(path)


@router.get("/reports/{experiment_id}/html")
async def get_report_html(experiment_id: str):
    """HTML-отчёт"""
    path = get_reports_dir() / f"{experiment_id}_report.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="HTML-отчёт не найден")

    html_content = path.read_text(encoding="utf-8")
    return HTMLResponse(content=html_content)


@router.get("/statistics/{experiment_id}")
async def get_statistics(
    experiment_id: str,
    group_by: Optional[str] = Query(None, pattern="^(model|task|expert)$"),
):
    """
    Статистика по эксперименту.
    Вычисляется на лету из evaluations/ + raw_results/
    """
    # Загружаем experiment result
    experiment_result = get_parser().load_experiment(experiment_id)
    if experiment_result is None:
        raise HTTPException(status_code=404, detail="Эксперимент не найден")

    # Загружаем evaluation
    evaluation = get_evaluator().load(experiment_id)

    if evaluation is None:
        return {
            "experiment_id": experiment_id,
            "status": "no_evaluation",
            "message": "Оценки SMOP ещё не выставлены",
        }

    # Считаем статистику
    stats = calculate_experiment_statistics(evaluation, experiment_result)

    return stats


# ==========================================================================
# Charts — SVG-графики из matplotlib
# ==========================================================================


@router.get("/charts/types")
async def get_chart_types():
    """Список доступных типов графиков"""
    return {
        "available": check_matplotlib_available(),
        "types": list_chart_types(),
    }


@router.get("/charts/{experiment_id}/{chart_type}")
async def get_chart_svg(experiment_id: str, chart_type: str):
    """
    Рендер одного графика в SVG (publication-quality, matplotlib).
    
    chart_type: radar | models_comparison | q_by_model | distribution
                | boxplot | heatmap | det_vs_quality | dashboard
    """
    if not check_matplotlib_available():
        raise HTTPException(status_code=503, detail="matplotlib не установлен на сервере")

    # Загружаем данные
    experiment_result = get_parser().load_experiment(experiment_id)
    if experiment_result is None:
        raise HTTPException(status_code=404, detail="Эксперимент не найден")

    evaluation = get_evaluator().load(experiment_id)
    if evaluation is None:
        raise HTTPException(status_code=404, detail="Оценки SMOP не найдены")

    # Рендерим
    svg_bytes = render_chart_svg(evaluation, chart_type, experiment_result)
    if svg_bytes is None:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось сгенерировать график '{chart_type}'. "
                   f"Возможные типы: {', '.join(t['type'] for t in list_chart_types())}"
        )

    return Response(
        content=svg_bytes,
        media_type="image/svg+xml",
        headers={
            "Content-Disposition": f'attachment; filename="{experiment_id}_{chart_type}.svg"',
        },
    )


@router.get("/export/{experiment_id}")
async def export_report(
    experiment_id: str,
    format: str = Query("json", pattern="^(json|html|latex)$"),
):
    """Скачать отчёт в нужном формате"""
    reports_dir = get_reports_dir()

    ext_map = {
        "json": "_report.json",
        "html": "_report.html",
        "latex": "_tables.tex",
    }

    filename = f"{experiment_id}{ext_map.get(format, '_report.json')}"
    path = reports_dir / filename

    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Файл {filename} не найден")

    media_types = {
        "json": "application/json",
        "html": "text/html",
        "latex": "application/x-latex",
    }

    return FileResponse(
        path=path,
        media_type=media_types.get(format, "application/octet-stream"),
        filename=filename,
    )
