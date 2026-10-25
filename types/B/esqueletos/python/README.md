# Servicio de ejemplo (Python)

Esqueleto que camina: un servicio mínimo (FastAPI) que arranca, responde a `/salud`, tiene un endpoint trivial (`/api/saludo?nombre=`), una prueba y un contenedor. Sin base de datos ni mensajería: se añaden cuando una decisión (ADR) lo justifique (ver `kit/catalogo/`, fichas de consistencia, migraciones y concurrencia).

- **Versiones:** Python 3.14 en el contenedor (`requires-python >= 3.13`); dependencias fijadas en `requirements.txt`. Python no tiene versiones LTS: se usa una con soporte vigente. Verificado el 2026-10-23.

## Uso
```
python -m venv .venv                         # y actívalo
pip install -r requirements-dev.txt
APP_ENTORNO=desarrollo python -m app         # escucha en 127.0.0.1:8080 (PORT y HOST opcionales)
python -m pytest -q                          # pruebas
docker build -t servicio .                   # corre las pruebas y construye la imagen
docker run --rm -e APP_ENTORNO=produccion -p 127.0.0.1:8080:8080 servicio
```
`APP_ENTORNO` es obligatoria: sin ella el servicio no arranca y lo dice. Los nombres de variables están en `.env.ejemplo` (sin valores; los secretos, cuando existan, no llevan valor por defecto).

## Errores
Todos los errores (400, 404, 405, 500) usan el mismo formato de problema HTTP (`application/problem+json`: `type`, `title`, `status`, `detail`) y nunca incluyen detalles internos. La documentación interactiva de la API está desactivada a propósito.

## Operación
Comprobación de salud: `node scripts/salud.mjs http://127.0.0.1:8080 --config ops/salud.config.esqueleto.json` (la ficha debe permitirlo: `ops.salud.permitida`). Pasos de arranque, parada, reversa y rotación de secretos: `ops/RUNBOOK.md`, `ops/PLAN-REVERSA.md`, `ops/ROTACION-SECRETOS.md`.

## Sello del kit
`kit.preset` = `python` (comando `python -m pytest -q`; actívalo dentro de tu entorno virtual). La integración continua (`.github/workflows/ci.yml`) corre las pruebas y construye la imagen; no publica nada.

Si añades clientes salientes, cada uno lleva tres tiempos (conexión, lectura y total) y un reintento acotado.
