"""Subcomandos y códigos de salida (contrato en kit/CONTRATO-ESQUELETOS.md)."""

from __future__ import annotations

import json
import signal
import sys
import threading
from typing import TextIO

from . import __version__
from .config import Config, ErrorConfig, cargar
from .demonio import ejecutar
from .entrada import ErrDemasiado, ErrTiempo, Resultado, leer_archivo
from .registro import Registro

SALIDA_OK = 0
SALIDA_ERROR = 1
SALIDA_USO = 2
SALIDA_CONFIG = 3
SALIDA_ENTRADA = 4
NOMBRE = "herramienta"

AYUDA = """uso:
  herramienta version [--json]
  herramienta check-config --config RUTA [--json]
  herramienta run --config RUTA [--once] [--json]
"""


class ErrorUso(Exception):
    pass


def _opciones(args: list[str], con_valor: set[str], booleanas: set[str]) -> dict[str, object]:
    """Analizador mínimo: --config VALOR, --once, --json. Cualquier otra cosa es un error de uso."""
    r: dict[str, object] = {}
    i = 0
    while i < len(args):
        a = args[i]
        if a in booleanas:
            r[a] = True
        elif a in con_valor:
            i += 1
            if i >= len(args):
                raise ErrorUso(f"{a} necesita un valor")
            r[a] = args[i]
        else:
            raise ErrorUso(f"argumento no reconocido: {a}")
        i += 1
    return r


def _json(flujo: TextIO, valor: object) -> None:
    flujo.write(json.dumps(valor, ensure_ascii=False, separators=(",", ":")) + "\n")


def _version(args: list[str], stdout: TextIO) -> int:
    o = _opciones(args, set(), {"--json"})
    if o.get("--json"):
        _json(stdout, {"nombre": NOMBRE, "version": __version__})
    else:
        stdout.write(f"{NOMBRE} {__version__}\n")
    return SALIDA_OK


def _cargar(o: dict[str, object], stderr: TextIO) -> tuple[Config | None, int]:
    ruta = o.get("--config")
    if not isinstance(ruta, str) or not ruta:
        stderr.write("falta --config RUTA\n")
        return None, SALIDA_USO
    try:
        return cargar(ruta), SALIDA_OK
    except ErrorConfig as e:
        stderr.write(f"error de configuración: {e}\n")
        return None, SALIDA_CONFIG


def _check_config(args: list[str], stdout: TextIO, stderr: TextIO) -> int:
    o = _opciones(args, {"--config"}, {"--json"})
    c, codigo = _cargar(o, stderr)
    if c is None:
        return codigo
    token = "definido" if c.token_definido else "ausente"
    if o.get("--json"):
        datos: dict[str, object] = {
            "nombre": c.nombre,
            "intervalo_ms": c.intervalo_ms,
            "max_entrada_bytes": c.max_entrada_bytes,
            "timeout_entrada_ms": c.timeout_entrada_ms,
            "nivel_log": c.nivel_log,
            "token": token,
        }
        if c.entrada:
            datos["entrada"] = c.entrada
        _json(stdout, {"valida": True, "config": datos})
        return SALIDA_OK
    stdout.write(
        "configuracion valida\n"
        f"nombre={c.nombre}\nintervalo_ms={c.intervalo_ms}\nmax_entrada_bytes={c.max_entrada_bytes}\n"
        f"timeout_entrada_ms={c.timeout_entrada_ms}\nnivel_log={c.nivel_log}\n"
    )
    if c.entrada:
        stdout.write(f"entrada={c.entrada}\n")
    if c.token_definido:
        stdout.write("token=<definido>\n")
    return SALIDA_OK


def _run(args: list[str], stdout: TextIO, stderr: TextIO, parar: threading.Event) -> int:
    o = _opciones(args, {"--config"}, {"--once", "--json"})
    c, codigo = _cargar(o, stderr)
    if c is None:
        return codigo
    una = bool(o.get("--once"))
    log = Registro(stderr, c.nivel_log)
    log.info("inicio", nombre=c.nombre, intervalo_ms=c.intervalo_ms, token_definido=c.token_definido)

    total = {"bytes": 0, "lineas": 0}
    ultimo_error: list[Exception] = []

    def trabajo(n: int) -> None:
        log.debug("tick", n=n)
        if not c.entrada:
            return
        try:
            r: Resultado = leer_archivo(c.entrada, c.max_entrada_bytes, c.timeout_entrada_ms / 1000)
        except (ErrDemasiado, ErrTiempo, OSError) as e:
            ultimo_error[:] = [e]  # solo el último: en modo daemon la lista no debe crecer
            raise
        total["bytes"] += r.bytes
        total["lineas"] += r.lineas

    r = ejecutar(parar, c.intervalo_ms / 1000, una, trabajo, log)
    if parar.is_set():
        log.info("apagado", motivo="señal")
    log.info("fin", ticks=r.ticks, errores=r.errores)
    if una and ultimo_error:
        if isinstance(ultimo_error[-1], (ErrDemasiado, ErrTiempo)):
            stderr.write(f"entrada rechazada: {ultimo_error[-1]}\n")
            return SALIDA_ENTRADA
        stderr.write(f"error de entrada: {ultimo_error[-1]}\n")
        return SALIDA_ERROR
    resumen = {"ticks": r.ticks, "errores": r.errores, "bytes": total["bytes"], "lineas": total["lineas"]}
    if o.get("--json"):
        _json(stdout, resumen)
    else:
        stdout.write(f"ticks={r.ticks} errores={r.errores} bytes={total['bytes']} lineas={total['lineas']}\n")
    return SALIDA_OK


def ejecutar_cli(
    argv: list[str],
    stdout: TextIO,
    stderr: TextIO,
    parar: threading.Event,
) -> int:
    """Corre la línea de órdenes y devuelve el código de salida. `parar` se activa con la señal de apagado."""
    if not argv:
        stderr.write("falta el subcomando\n" + AYUDA)
        return SALIDA_USO
    orden, resto = argv[0], argv[1:]
    try:
        if orden in ("-h", "--help", "help"):
            stdout.write(AYUDA)
            return SALIDA_OK
        if orden == "version":
            return _version(resto, stdout)
        if orden == "check-config":
            return _check_config(resto, stdout, stderr)
        if orden == "run":
            return _run(resto, stdout, stderr, parar)
        stderr.write(f"subcomando desconocido: {orden}\n{AYUDA}")
        return SALIDA_USO
    except ErrorUso as e:
        stderr.write(f"{e}\n")
        return SALIDA_USO


def principal(argv: list[str] | None = None) -> int:
    """Punto de entrada del comando instalado: conecta las señales del sistema con el evento de apagado."""
    parar = threading.Event()

    def pedir_parada(_numero: int, _marco: object) -> None:
        parar.set()

    for nombre in ("SIGINT", "SIGTERM", "SIGBREAK"):  # SIGBREAK solo existe en Windows
        numero = getattr(signal, nombre, None)
        if numero is not None:
            signal.signal(numero, pedir_parada)
    try:
        return ejecutar_cli(sys.argv[1:] if argv is None else argv, sys.stdout, sys.stderr, parar)
    except Exception as e:  # noqa: BLE001 - último recurso: salida 1 sin traza ni valores
        sys.stderr.write(f"error inesperado: {type(e).__name__}\n")
        return SALIDA_ERROR
