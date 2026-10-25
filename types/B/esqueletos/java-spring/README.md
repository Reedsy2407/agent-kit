# Servicio de ejemplo (Java con Spring Boot)

Esqueleto que camina: un servicio mínimo que arranca, responde a `/salud`, tiene un endpoint trivial (`/api/saludo?nombre=`), una prueba y un contenedor. Sin base de datos ni mensajería: se añaden cuando una decisión (ADR) lo justifique (ver `kit/catalogo/`, fichas de consistencia, migraciones y concurrencia).

- **Versiones:** Java 21 (LTS) y Spring Boot 4.1.2 con Maven 3.9. Java 25 también es LTS y Spring Boot 4.1 lo admite: cambia `java.version` y las imágenes del `Dockerfile` (no verificado aquí). Verificado el 2026-10-23.
- **Salud:** un `/salud` propio y mínimo; Actuator no se incluye para no abrir más superficie de la necesaria (añádelo si lo decides en un ADR).

## Uso
```
APP_ENTORNO=desarrollo mvn spring-boot:run     # escucha en 127.0.0.1:8080 (PORT y HOST opcionales)
mvn -B verify                                  # compila, prueba y empaqueta target/servicio-esqueleto.jar
docker build -t servicio .                     # compila, prueba y construye la imagen
docker run --rm -e APP_ENTORNO=produccion -p 127.0.0.1:8080:8080 servicio
```
`APP_ENTORNO` es obligatoria: sin ella el servicio no arranca y lo dice. Los nombres de variables están en `.env.ejemplo` (sin valores; los secretos, cuando existan, no llevan valor por defecto en `application.yml`).

## Errores
Todos los errores (400, 404, 405, 500) usan el mismo formato de problema HTTP (`application/problem+json`: `type`, `title`, `status`, `detail`) y el 500 nunca incluye detalles internos.

## Operación
Comprobación de salud: `node scripts/salud.mjs http://127.0.0.1:8080 --config ops/salud.config.esqueleto.json` (la ficha debe permitirlo: `ops.salud.permitida`). Pasos de arranque, parada, reversa y rotación de secretos: `ops/RUNBOOK.md`, `ops/PLAN-REVERSA.md`, `ops/ROTACION-SECRETOS.md`.

## Sello del kit
`kit.preset` = `java-maven` (comando `mvn -B verify`). La integración continua (`.github/workflows/ci.yml`) corre las pruebas y construye la imagen; no publica nada.

Si añades clientes salientes, cada uno lleva tres tiempos (conexión, lectura y total) y un reintento acotado.
