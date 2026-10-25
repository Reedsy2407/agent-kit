# Despliegue desde la semana uno

## Problema
Dejar el despliegue para el final reúne todas las sorpresas de operar de verdad: arranques lentos, cabeceras que cambian detrás de un intermediario, carreras al arrancar, límites del plan gratuito, integración continua que no bloquea. Se descubren juntas, tarde y con mucho construido encima.

## Señales de que aplica
- El sistema tendrá una dirección pública o lo usará alguien más que quien lo construye.
- Se depende de un alojamiento con particularidades (se duerme, límites, regiones).
- El equipo ha pospuesto el despliegue «hasta tener algo».

## Señales de que sobra
- Una biblioteca o una herramienta de uso local que no se opera como servicio.
- Un experimento de horas.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: desplegar al final | Ninguno al inicio; sorpresas acumuladas al final | Experimentos |
| **Esqueleto que camina:** un servicio mínimo con base de datos, integración continua, despliegue, chequeo de salud y un pequeño manual, en la primera rebanada | Bajo-medio | Sistemas que se publicarán |
| Plantilla por stack con todo lo anterior ya resuelto | Medio (se paga una vez) | Varios servicios o proyectos similares |
| Despliegue condicionado a que las pruebas pasen | Bajo | Siempre una vez hay pruebas |
| Prueba de humo contra la dirección pública tras cada despliegue | Bajo | Siempre |
| Calentamiento (ping) para alojamientos que duermen | Bajo | Servicios gratuitos que se duermen |

## Cómo se comprueba
- Una prueba de humo contra la dirección pública (salud y una ruta real) que corre tras desplegar y falla si algo no responde.
- Una comprobación de que el despliegue no ocurre si la integración continua está en rojo.
- Un manual de despliegue que una persona distinta de su autor pueda seguir.
- Un registro de cuánto tarda en despertar el servicio y qué ve la persona usuaria mientras tanto.
- Una verificación de que cada servicio nuevo nace clonando el esqueleto.

## Cómo suele resolverse
Un caso público (esg-trazabilidad) midió su propio proceso y concluyó que el despliegue debe ir al inicio: un servicio mínimo con base de datos, integración continua, alojamiento, chequeo de salud y un manual breve, y los demás servicios se añaden clonando ese esqueleto. Las sorpresas típicas de operar de verdad (carreras de migración en el primer arranque, la dirección real del cliente detrás de un intermediario, arranques en frío largos, ramas que se saltan la integración continua) se resuelven así una vez, temprano. Además, una plantilla por stack guarda lo ya resuelto.

## Anti-patrones frecuentes
- Una integración continua que no bloquea el despliegue.
- Desplegar a mano sin registro de qué versión corre.
- Un único chequeo de salud que no distingue «vive» de «puede servir».
- Ignorar el arranque en frío en la experiencia de la persona usuaria.
- Una plantilla que cada proyecto modifica sin volver a sincronizar.
- Variables de ambiente definidas a mano en la consola del alojamiento sin dejar constancia.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Imagen con el artefacto y un `/salud` propio o `Actuator` (`/actuator/health`; `metrics` no se expone por HTTP salvo que se incluya en `management.endpoints.web.exposure.include`); el arranque en frío de la JVM pesa en alojamientos gratuitos. Verificado el 2026-10-23 ([Spring Boot](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)): el punto de salud de Actuator y la exposición de `metrics`. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): imagen multietapa con JRE 21, usuario sin privilegios y parada con SIGTERM en 0,3 s. No verificado: tiempos de arranque en frío en un alojamiento real.
- **.NET:** Imagen publicada con el SDK 10 y ejecutada con el runtime de ASP.NET (Alpine), usuario sin privilegios y chequeo de salud propio (`/salud`). Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): imagen multietapa que corre las pruebas, sale con código 1 sin variable y se detiene con SIGTERM en 0,2 s (.NET 10). No verificado: los chequeos de salud integrados del framework (`AddHealthChecks`) y tiempos de arranque en un alojamiento real.
- **Node:** Imagen mínima (`node:24-alpine`), usuario sin privilegios, chequeo de salud propio; arranque rápido. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): imagen multietapa, `HEALTHCHECK`, salida 1 sin variable y parada con SIGTERM en salida 0. No verificado: tiempos de arranque en un alojamiento real.
- **Python:** Imagen con el servidor de aplicaciones (uvicorn) y el chequeo de salud. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): imagen `python:3.14-slim` (también 3.13) con dependencias fijadas, usuario sin privilegios, salida 1 sin variable y parada con SIGTERM en salida 0. No verificado: tiempos de arranque en un alojamiento real.

## ADR de ejemplo
- Ninguno todavía.
