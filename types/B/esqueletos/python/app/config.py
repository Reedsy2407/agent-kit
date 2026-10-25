"""Configuración desde variables de entorno. Si falta una obligatoria o es inválida, el servicio NO arranca (falla pronto y dice
cuál, sin mostrar valores). Aquí no hay secretos; cuando los haya, no llevan valor por defecto: se exigen aquí."""
import os
from dataclasses import dataclass

ENTORNOS = ("desarrollo", "produccion")


class ConfigInvalida(Exception):
    pass


@dataclass(frozen=True)
class Config:
    entorno: str
    puerto: int
    host: str


def cargar_config(env=None) -> Config:
    env = os.environ if env is None else env
    problemas = []
    entorno = env.get("APP_ENTORNO", "")
    if not entorno:
        problemas.append("falta APP_ENTORNO (obligatoria: desarrollo o produccion)")
    elif entorno not in ENTORNOS:
        problemas.append("APP_ENTORNO debe ser desarrollo o produccion")
    crudo = env.get("PORT", "")
    puerto = 8080
    if crudo != "":
        try:
            puerto = int(crudo)
        except ValueError:
            puerto = 0
        if not 1 <= puerto <= 65535:
            problemas.append("PORT debe ser un entero de 1 a 65535")
    if problemas:
        raise ConfigInvalida("; ".join(problemas))
    return Config(entorno=entorno, puerto=puerto, host=env.get("HOST") or "127.0.0.1")
