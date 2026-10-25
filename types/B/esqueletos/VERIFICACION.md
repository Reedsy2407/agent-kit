# Verificación de los esqueletos

Registro con fecha de lo que se ejecutó de verdad. Las verificaciones usan red (registros públicos de cada stack e imágenes base) y **no forman parte de `npm test`**: las pruebas del kit solo comprueban estructura, YAML, secretos y la instalación (`types/B/test/esqueletos.test.mjs`).

**Fecha de la verificación: 2026-10-23.** Máquina: Windows 10, Java 21.0.9 (Corretto), Maven 3.9.11, .NET SDK 9.0.304, Node 22.23.4, npm 10.9.9, Python 3.11.9, Docker 29.6 (Rancher Desktop). Sin Gradle.

## Cómo repetirla
```
node types/B/esqueletos/verificar.mjs <java-spring|dotnet|node|python> [--sin-contenedor] [--solo-contenedor] [--conservar]
```
El script instala el esqueleto con el instalador en una carpeta temporal fuera del repositorio y comprueba, en orden: el comando del sello (el del preset), que sin `APP_ENTORNO` el servicio no arranca, que arranca y responde a `/salud` (con `scripts/salud.mjs` del kit contra un puerto local no bloqueado por navegadores), el endpoint trivial, el formato uniforme de error, que se detiene por el identificador del proceso lanzado, y —si hay Docker— la construcción de la imagen (que corre las pruebas), el arranque, la salud y la parada con `SIGTERM` (salida 0, o 143 en la JVM; nunca 137). Salida esperada: una línea `OK` por paso y «Todos los pasos ejecutados pasaron»; `OMITIDO` no cuenta como verificado. Sale con 0 si no hay ningún `FALLO`.

Si tu red inspecciona TLS con una autoridad propia, las herramientas pueden rechazar el certificado (pasó aquí con `pip` y con Java). No desactives la verificación: dale a la herramienta el almacén de confianza del sistema, por ejemplo `MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NUL"` para Maven en Windows, o `PIP_CERT=<archivo PEM con las autoridades>` para `pip`.

## Resultado por esqueleto
| Esqueleto | Preset | Local (sin contenedor) | Contenedor | Estado del preset |
|---|---|---|---|---|
| `node` (Node 24 en la imagen; local Node 22) | `node` · `npm test` | OK: sello, sin variable no arranca, arranca y `/salud`, `scripts/salud.mjs`, endpoint, error 400 uniforme, parada por pid | OK: build con pruebas, sin variable sale 1, `/salud`, parada con SIGTERM (salida 0) | **verificado** |
| `java-spring` (Java 21, Spring Boot 4.1.2, Maven) | `java-maven` · `mvn -B verify` | OK: los mismos pasos que `node` | OK: build con pruebas, sin variable sale 1, `/salud`, parada con SIGTERM (salida 143, 0,3 s) | **verificado** |
| `dotnet` (.NET 10 LTS) | `dotnet` · `dotnet test --nologo` | **no verificado**: el SDK local es el 9 y el esqueleto apunta a .NET 10 (no se instalan SDK globales) | OK con el SDK 10 de la imagen: build con pruebas, sin variable sale 1, `/salud`, parada con SIGTERM (salida 0) | **verificado** (en contenedor) |
| `python` (Python 3.14 en la imagen; también 3.13) | `python` · `python -m pytest -q` | **no verificado**: desde esta máquina `pip` no validó el certificado de PyPI (ver arriba) y no se desactivó la verificación | OK (3.14): build con pruebas, sin variable sale 1, `/salud`, parada con SIGTERM (salida 0). La imagen con 3.13 también construye y pasa las pruebas | **verificado** (en contenedor) |
| — | `java-gradle` · `./gradlew --no-daemon check` | no verificado: no hay Gradle en la máquina y no hay esqueleto Gradle | — | **no verificado** (sin esqueleto) |

## Lo que no se ejecutó
- **Flujos de integración continua** (`.github/workflows/ci.yml`): no ejecutado (no hay forma de correrlos aquí). Solo se validó la sintaxis YAML y que usen `actions/checkout@v7`, `setup-node@v7`, `setup-java@v6`, `setup-dotnet@v6` y `setup-python@v7`, las versiones mayores que muestran los README oficiales el 2026-10-23. Comprueba que siguen vigentes al usarlos.
- **Despliegue**: ningún esqueleto se desplegó (no hay cuenta ni credencial). La reversa y la rotación siguen sin probarse contra un proveedor real.
- **Java 25**, **Gradle**, **.NET en local** y **Python en local**: no verificados (motivos arriba).
- Las imágenes base (`node:24-alpine`, `maven:3.9-eclipse-temurin-21`, `eclipse-temurin:21-jre-alpine`, `mcr.microsoft.com/dotnet/sdk:10.0` y `aspnet:10.0-alpine`, `python:3.14-slim`) se descargaron de sus registros públicos sin cuenta; las etiquetas no están fijadas por resumen (`@sha256`): fíjalas al desplegar.

## Fuentes de las versiones (consultadas el 2026-10-23)
- .NET: política de soporte de Microsoft (`dotnet.microsoft.com`): .NET 10 es LTS, soporte hasta el 14 de noviembre de 2028; .NET 8 y 9 terminan el 10 de noviembre de 2026.
- Node.js: calendario oficial de versiones (`github.com/nodejs/Release`, `schedule.json`): v24 LTS desde 2025-10-28, mantenimiento desde 2026-10-20 y fin el 2028-04-30; v22 fin el 2027-04-30.
- Python: guía de desarrollo (`devguide.python.org`): 3.14 en correcciones hasta octubre de 2030; 3.13 en seguridad hasta octubre de 2029. Python no tiene versiones LTS.
- Java: hoja de ruta de soporte de Oracle (`oracle.com`): LTS 8, 11, 17, 21 y 25; la página oficial no se pudo leer directamente (403): este dato **no está verificado en la fuente primaria**, viene de un resultado de búsqueda de ese dominio. Spring Boot 4.1.2 requiere Java 17 como mínimo y admite hasta Java 27 (`docs.spring.io`, requisitos del sistema).
- Paquetes: Maven Central (`repo.maven.apache.org`), NuGet (`api.nuget.org`) y PyPI (vía `pip` en contenedor), versión más reciente estable en la fecha.
