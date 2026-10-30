"""Lectura y validación del archivo de configuración (contrato en kit/CONTRATO-ESQUELETOS.md)."""

from __future__ import annotations

import os
import re
import stat
import sys
from dataclasses import dataclass

MAX_BYTES_ARCHIVO = 64 * 1024
_NOMBRE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
_NIVELES = ("debug", "info", "warn", "error")


class ErrorConfig(Exception):
    """La configuración es inválida: el mensaje dice qué y dónde, sin valores secretos."""


@dataclass(frozen=True)
class Config:
    nombre: str
    intervalo_ms: int = 1000
    max_entrada_bytes: int = 65536
    timeout_entrada_ms: int = 2000
    entrada: str = ""
    nivel_log: str = "info"
    token: str = ""  # secreto: nunca se imprime ni se registra

    @property
    def token_definido(self) -> bool:
        return self.token != ""


def _entero(valor: str, minimo: int, maximo: int) -> int:
    # Solo dígitos decimales ASCII: int() aceptaría «1_000», «+10», espacios y dígitos de otros alfabetos.
    n = int(valor) if valor.isascii() and valor.isdigit() else minimo - 1
    if not minimo <= n <= maximo:
        raise ValueError(f"debe ser un entero de {minimo} a {maximo}")
    return n


def analizar(texto: str) -> Config:
    valores: dict[str, object] = {}
    vistas: set[str] = set()
    for i, linea in enumerate(texto.split("\n"), start=1):
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        clave, igual, valor = linea.partition("=")
        if not igual:
            raise ErrorConfig(f"línea {i}: se esperaba clave=valor")
        clave, valor = clave.strip(), valor.strip()
        if clave in vistas:
            raise ErrorConfig(f"línea {i}: la clave {clave!r} está repetida")
        vistas.add(clave)
        try:
            if clave == "nombre":
                if not _NOMBRE.match(valor):
                    raise ValueError("debe cumplir [a-z0-9][a-z0-9_-]{0,63}")
                valores[clave] = valor
            elif clave == "intervalo_ms":
                valores[clave] = _entero(valor, 10, 3600000)
            elif clave == "max_entrada_bytes":
                valores[clave] = _entero(valor, 1, 1048576)
            elif clave == "timeout_entrada_ms":
                valores[clave] = _entero(valor, 10, 60000)
            elif clave in ("entrada", "token"):
                if not valor:
                    raise ValueError("no puede estar vacío")
                valores[clave] = valor
            elif clave == "nivel_log":
                if valor not in _NIVELES:
                    raise ValueError("debe ser debug, info, warn o error")
                valores[clave] = valor
            else:
                raise ErrorConfig(f"línea {i}: clave desconocida {clave!r}")
        except ValueError as e:
            raise ErrorConfig(f"línea {i}: {clave} {e}") from None
    if "nombre" not in valores:
        raise ErrorConfig("falta la clave obligatoria nombre")
    return Config(**valores)  # type: ignore[arg-type]


def comprobar_permisos(modo: int, hay_token: bool, plataforma: str = sys.platform) -> None:
    """Rechaza un archivo escribible por otros y, si guarda un token, legible por otros.

    En Windows los bits de modo no representan los permisos reales: no se comprueba."""
    if plataforma == "win32":
        return
    modo &= 0o777
    if modo & 0o022:
        raise ErrorConfig(
            f"el archivo de configuración es escribible por grupo u otros (modo {modo:04o}): usa chmod 600"
        )
    if hay_token and modo & 0o044:
        raise ErrorConfig(
            "el archivo de configuración tiene un token y es legible por grupo u otros "
            f"(modo {modo:04o}): usa chmod 600"
        )


def cargar(ruta: str) -> Config:
    try:
        with open(ruta, "rb") as f:
            info = os.fstat(f.fileno())
            if not stat.S_ISREG(info.st_mode):
                raise ErrorConfig("la configuración debe ser un archivo regular")
            datos = f.read(MAX_BYTES_ARCHIVO + 1)
    except OSError as e:
        raise ErrorConfig(f"no se puede leer el archivo de configuración: {e.strerror}") from None
    if len(datos) > MAX_BYTES_ARCHIVO:
        raise ErrorConfig(f"el archivo de configuración supera {MAX_BYTES_ARCHIVO} bytes")
    try:
        texto = datos.decode("utf-8")
    except UnicodeDecodeError:
        raise ErrorConfig("el archivo de configuración no es UTF-8") from None
    config = analizar(texto)
    comprobar_permisos(info.st_mode, config.token_definido)
    return config
