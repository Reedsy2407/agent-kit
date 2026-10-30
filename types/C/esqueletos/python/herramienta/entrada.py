"""Lectura de entrada no confiable con límite de tamaño y plazo."""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol


class ErrDemasiado(Exception):
    """La entrada supera el límite."""

    def __str__(self) -> str:
        return "entrada demasiado grande"


class ErrTiempo(Exception):
    """La entrada no terminó dentro del plazo."""

    def __str__(self) -> str:
        return "entrada sin respuesta"


class Fuente(Protocol):
    def read(self, n: int, /) -> bytes: ...

    def close(self) -> None: ...


@dataclass(frozen=True)
class Resultado:
    bytes: int
    lineas: int


def contar_lineas(datos: bytes) -> int:
    n = datos.count(b"\n")
    if datos and not datos.endswith(b"\n"):
        n += 1
    return n


def leer(abrir: Callable[[], Fuente], maximo: int, timeout_s: float) -> Resultado:
    """Abre la fuente y lee como máximo `maximo` bytes (+1 para detectar el exceso) con plazo `timeout_s`.

    La lectura ocurre en otro hilo; si vence el plazo se devuelve ErrTiempo y el hilo, que es demonio,
    no impide terminar el proceso."""
    salida: dict[str, object] = {}

    def trabajo() -> None:
        try:
            fuente = abrir()
            try:
                salida["datos"] = fuente.read(maximo + 1)
            finally:
                fuente.close()
        except BaseException as e:  # noqa: BLE001 - se devuelve al hilo principal
            salida["error"] = e

    hilo = threading.Thread(target=trabajo, name="lectura-entrada", daemon=True)
    hilo.start()
    hilo.join(timeout_s)
    if hilo.is_alive():
        raise ErrTiempo
    if "error" in salida:
        raise salida["error"]  # type: ignore[misc]
    datos = salida["datos"]
    assert isinstance(datos, bytes)
    if len(datos) > maximo:
        raise ErrDemasiado
    return Resultado(bytes=len(datos), lineas=contar_lineas(datos))


def leer_archivo(ruta: str, maximo: int, timeout_s: float) -> Resultado:
    return leer(lambda: open(ruta, "rb"), maximo, timeout_s)  # noqa: SIM115 - lo cierra `leer`
