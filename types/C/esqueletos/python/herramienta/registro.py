"""Registro estructurado con `logging`: una línea JSON por evento con ts, nivel y msg."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import TextIO

_NIVELES = {"debug": logging.DEBUG, "info": logging.INFO, "warn": logging.WARNING, "error": logging.ERROR}
_NOMBRES = {logging.DEBUG: "debug", logging.INFO: "info", logging.WARNING: "warn", logging.ERROR: "error"}


class FormatoJson(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created, UTC)
        linea: dict[str, object] = {
            "ts": f"{ts:%Y-%m-%dT%H:%M:%S}.{int(record.msecs):03d}Z",
            "nivel": _NOMBRES.get(record.levelno, record.levelname.lower()),
            "msg": record.getMessage(),
        }
        linea.update(getattr(record, "campos", {}))
        return json.dumps(linea, ensure_ascii=False, separators=(",", ":"))


class Registro:
    """Envuelve un logger propio (no el global) para poder crear uno por ejecución o por prueba."""

    def __init__(self, flujo: TextIO, nivel: str = "info") -> None:
        self._log = logging.Logger("herramienta", _NIVELES.get(nivel, logging.INFO))
        manejador = logging.StreamHandler(flujo)
        manejador.setFormatter(FormatoJson())
        self._log.addHandler(manejador)

    def _emitir(self, nivel: int, msg: str, campos: dict[str, object]) -> None:
        self._log.log(nivel, msg, extra={"campos": campos})

    def debug(self, msg: str, **campos: object) -> None:
        self._emitir(logging.DEBUG, msg, campos)

    def info(self, msg: str, **campos: object) -> None:
        self._emitir(logging.INFO, msg, campos)

    def warn(self, msg: str, **campos: object) -> None:
        self._emitir(logging.WARNING, msg, campos)
