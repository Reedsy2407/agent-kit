# Servicio de ejemplo (Node)

Esqueleto que camina: un servicio mínimo que arranca, responde a `/salud`, tiene un endpoint trivial (`/api/saludo?nombre=`), una prueba y un contenedor. Sin base de datos ni mensajería: se añaden cuando una decisión (ADR) lo justifique (ver `kit/catalogo/`, fichas de consistencia, migraciones y concurrencia).

- **Versiones:** Node 24 LTS en el contenedor; local, Node 22 o superior. Verificado el 2026-10-23 (registro en el kit).
- **Sin dependencias:** solo la biblioteca estándar de Node (`node:http`, `node:test`).

## Uso
```
APP_ENTORNO=desarrollo npm start        # escucha en 127.0.0.1:8080 (PORT y HOST opcionales)
npm test                                # pruebas
docker build -t servicio .              # corre las pruebas y construye la imagen
docker run --rm -e APP_ENTORNO=produccion -p 127.0.0.1:8080:8080 servicio
```
`APP_ENTORNO` es obligatoria: sin ella el servicio no arranca y lo dice. Los nombres de variables están en `.env.ejemplo` (sin valores; los secretos, cuando existan, no llevan valor por defecto).

## Errores
Todos los errores (400, 404, 405, 500) usan el mismo formato de problema HTTP (`application/problem+json`: `type`, `title`, `status`, `detail`) y nunca incluyen detalles internos.

## Operación
Comprobación de salud: `node scripts/salud.mjs http://127.0.0.1:8080 --config ops/salud.config.esqueleto.json` (la ficha debe permitirlo: `ops.salud.permitida`). Pasos de arranque, parada, reversa y rotación de secretos: `ops/RUNBOOK.md`, `ops/PLAN-REVERSA.md`, `ops/ROTACION-SECRETOS.md`.

## Sello del kit
`kit.preset` = `node` (comando `npm test`). La integración continua (`.github/workflows/ci.yml`) corre las pruebas y construye la imagen; no publica nada.

Si añades clientes salientes, cada uno lleva tres tiempos (conexión, lectura y total) y un reintento acotado.
