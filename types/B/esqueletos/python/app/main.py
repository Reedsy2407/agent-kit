"""Aplicación mínima: salud y un endpoint trivial. Sin base de datos ni clientes salientes (si algún día hay clientes salientes,
cada uno lleva sus tres tiempos: conexión, lectura y total)."""
import re

from fastapi import FastAPI, Request

from app.config import Config, cargar_config
from app.errores import CABECERAS, problema, registrar

MAX_NOMBRE = 50
CONTROLES = re.compile(r"[\x00-\x1f]")


def crear_app(config: Config | None = None) -> FastAPI:
    config = config or cargar_config()
    app = FastAPI(title="servicio-esqueleto", docs_url=None, redoc_url=None, openapi_url=None)
    registrar(app)

    @app.middleware("http")
    async def cabeceras(request: Request, call_next):
        respuesta = await call_next(request)
        for k, v in CABECERAS.items():
            respuesta.headers.setdefault(k, v)
        return respuesta

    @app.api_route("/salud", methods=["GET", "HEAD"])
    def salud():
        return {"estado": "ok", "entorno": config.entorno}

    @app.api_route("/api/saludo", methods=["GET", "HEAD"])
    def saludo(nombre: str = "mundo"):
        if nombre.strip() == "" or len(nombre) > MAX_NOMBRE or CONTROLES.search(nombre):
            return problema(400, f"nombre debe tener de 1 a {MAX_NOMBRE} caracteres, sin controles.")
        return {"mensaje": f"Hola, {nombre}"}

    return app
