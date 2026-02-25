#!/usr/bin/env python3
"""
Скрипт запуска SMOP Expert Platform

Запуск:
    python run.py             — только API-сервер (порт 8000)
    python run.py --dev       — API + Vite dev-сервер (порт 3000)
    python run.py --no-reload — без авто-перезагрузки

Фронтенд запускается отдельно:
    cd frontend && npm run dev
"""

import sys
import os
import subprocess
import argparse
import logging
from pathlib import Path

# Корень проекта — там где лежит run.py
ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "backend"
CORE_DIR = ROOT / "core"  # git submodule genlab-1c-core

# Загружаем .env из корня проекта
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")


def main():
    parser = argparse.ArgumentParser(description="SMOP Expert Platform")
    parser.add_argument("--host", default="0.0.0.0", help="Host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--no-reload", action="store_true", help="Отключить auto-reload")
    parser.add_argument("--dev", action="store_true", help="Также запустить Vite dev-сервер")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    )

    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║       🧪 SMOP Expert Platform API v1.0          ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  API:      http://localhost:{args.port}               ║")
    print(f"║  Docs:     http://localhost:{args.port}/docs           ║")
    print(f"║  Health:   http://localhost:{args.port}/api/v1/health  ║")
    if args.dev:
        print("║  Client:   http://localhost:3000               ║")
    print("╚══════════════════════════════════════════════════╝")
    print()

    # Запуск Vite dev-сервера в фоне (если --dev)
    vite_process = None
    if args.dev:
        client_dir = ROOT / "frontend"
        if (client_dir / "node_modules").exists():
            logging.info("Запуск Vite dev-сервера...")
            vite_process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=str(client_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        else:
            logging.warning(
                "node_modules не найден. Запустите 'cd frontend && npm install' первый раз."
            )

    # Добавляем core/ и корень проекта в PYTHONPATH,
    # чтобы `import src.*` и `from backend.*` работали внутри воркеров uvicorn
    env_pythonpath = os.environ.get("PYTHONPATH", "")
    paths_to_add = [str(CORE_DIR), str(ROOT)]
    for p in paths_to_add:
        if p not in env_pythonpath:
            env_pythonpath = p + os.pathsep + env_pythonpath
    os.environ["PYTHONPATH"] = env_pythonpath

    # With --no-reload uvicorn imports the app in THIS process, where the
    # PYTHONPATH env var above has no effect — so put the paths on sys.path too.
    # Order matters: backend/ must come before core/ so `import main` resolves to
    # backend/main.py and not core/main.py (both modules exist).
    for p in [str(CORE_DIR), str(ROOT), str(SERVER_DIR)]:
        if p not in sys.path:
            sys.path.insert(0, p)

    try:
        import uvicorn

        # app_dir=backend/ — uvicorn найдёт main.py → main:app,
        # из main.py сработает `from routers import ...`.
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=not args.no_reload,
            reload_dirs=[
                str(CORE_DIR / "src"),
                str(SERVER_DIR),
            ],
            app_dir=str(SERVER_DIR),
        )
    finally:
        if vite_process:
            vite_process.terminate()


if __name__ == "__main__":
    main()
