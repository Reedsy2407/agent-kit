"""Bucle de trabajo con apagado ordenado."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

from .registro import Registro


@dataclass
class Resumen:
    ticks: int = 0
    errores: int = 0


def ejecutar(
    parar: threading.Event,
    intervalo_s: float,
    una: bool,
    trabajo: Callable[[int], None],
    log: Registro,
) -> Resumen:
    """Repite `trabajo(n)` cada `intervalo_s` hasta que `parar` se active o, con `una`, tras una vuelta.

    Al activarse `parar` no empieza otra vuelta y la espera se interrumpe de inmediato; la vuelta en curso
    termina (se drena): `parar` no se pasa al trabajo."""
    r = Resumen()
    while True:
        if not una and parar.is_set():
            return r
        r.ticks += 1
        try:
            trabajo(r.ticks)
        except Exception as e:  # noqa: BLE001 - un fallo del trabajo no mata el daemon
            r.errores += 1
            log.warn("trabajo_fallido", n=r.ticks, error=str(e))
        if una:
            return r
        _esperar(parar, intervalo_s)


def _esperar(parar: threading.Event, segundos: float) -> None:
    """Espera en tramos cortos: en Windows un manejador de señal no interrumpe una espera larga."""
    fin = time.monotonic() + segundos
    while not parar.is_set():
        resto = fin - time.monotonic()
        if resto <= 0:
            return
        parar.wait(min(resto, 0.2))
