"""Punto de entrada: valida la configuración, escucha y se detiene limpio con SIGTERM o SIGINT (lo gestiona uvicorn)."""
import sys

import uvicorn

from app.config import ConfigInvalida, cargar_config
from app.main import crear_app

try:
    config = cargar_config()
except ConfigInvalida as e:
    print(f"Configuración inválida: {e}", file=sys.stderr)
    sys.exit(1)

uvicorn.run(crear_app(config), host=config.host, port=config.puerto, log_level="info", timeout_graceful_shutdown=10)
