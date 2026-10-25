"""Formato uniforme de error: problema HTTP (RFC 9457), siempre con el mismo contenido y sin detalles internos."""
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as ErrorHttp

TITULOS = {400: "Petición inválida", 404: "No encontrado", 405: "Método no permitido", 500: "Error interno"}
CABECERAS = {"x-content-type-options": "nosniff", "cache-control": "no-store"}


def problema(status: int, detalle: str, cabeceras: dict | None = None) -> JSONResponse:
    cuerpo = {"type": "about:blank", "title": TITULOS.get(status, "Error"), "status": status, "detail": detalle}
    return JSONResponse(cuerpo, status_code=status, media_type="application/problem+json", headers={**CABECERAS, **(cabeceras or {})})


def registrar(app) -> None:
    @app.exception_handler(ErrorHttp)
    async def _http(_: Request, e: ErrorHttp):
        detalle = {404: "No existe esa ruta.", 405: "Método no permitido."}.get(e.status_code, "Petición no válida.")
        return problema(e.status_code, detalle, {"allow": e.headers["allow"]} if e.headers and "allow" in e.headers else None)

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, __: RequestValidationError):
        return problema(400, "La petición no es válida.")

    @app.exception_handler(Exception)
    async def _inesperado(_: Request, __: Exception):
        return problema(500, "Ocurrió un error inesperado.")
